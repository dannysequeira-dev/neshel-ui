// pnpm check:pack [--no-build]
// Validates every intended public package from its real `pnpm pack` tarball (ADR 0004 §5,
// research R11/R12). Cross-platform: Node standard library only, no shell built-ins.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { basename, dirname, join } from "node:path";
import { publint } from "publint";
import { formatMessage } from "publint/utils";
import {
  checkDeclarations,
  checkDependencySpecs,
  checkLifecycleScripts,
  checkPackageContract,
  checkPublicPeers,
  checkSideEffects,
  checkSourceMaps,
  checkTargets,
  checkUnexpectedFiles,
  exportEntries,
} from "./lib/pack-checks.mjs";
import { packPackage, pnpm } from "./lib/pnpm.mjs";
import { readTarGz } from "./lib/tar.mjs";
import { createTempDir } from "./lib/temp.mjs";
import { listWorkspacePackages, repoRoot } from "./lib/workspace.mjs";

const requireFromRoot = createRequire(join(repoRoot, "package.json"));
const tscBin = requireFromRoot.resolve("typescript/bin/tsc");
const attwPackage = requireFromRoot.resolve("@arethetypeswrong/cli/package.json");
const attwBin = join(dirname(attwPackage), JSON.parse(readFileSync(attwPackage, "utf8")).bin.attw);
// attw's esm-only profile: CommonJS resolution modes are intentionally unsupported.
const IGNORED_RESOLUTIONS = new Set(["node10", "node16-cjs"]);

const readOptional = (path) => (existsSync(path) ? readFileSync(path, "utf8") : undefined);

function node(args, cwd) {
  return spawnSync(process.execPath, args, { cwd, encoding: "utf8" });
}

/** Extract the package-relative file map ("package/" prefix removed) to a directory. */
function writeFiles(files, target) {
  for (const [path, contents] of files) {
    const destination = join(target, ...path.split("/"));
    mkdirSync(dirname(destination), { recursive: true });
    writeFileSync(destination, contents);
  }
}

/** Link a dependency that the workspace already installed (peers such as react, @types/*). */
function linkFromWorkspace(name, fromDir, nodeModules) {
  const destination = join(nodeModules, ...name.split("/"));
  if (existsSync(destination)) return true;
  for (const base of [join(fromDir, "node_modules"), join(repoRoot, "node_modules")]) {
    const source = join(base, ...name.split("/"));
    if (existsSync(source)) {
      mkdirSync(dirname(destination), { recursive: true });
      // "junction" works without elevated rights on Windows and is ignored elsewhere.
      symlinkSync(realpathSync(source), destination, "junction");
      return true;
    }
  }
  return false;
}

async function runPublint(tarball, manifest) {
  const arrayBuffer = tarball.buffer.slice(
    tarball.byteOffset,
    tarball.byteOffset + tarball.byteLength,
  );
  const { messages } = await publint({ pack: { tarball: arrayBuffer }, strict: false });
  const errors = [];
  const notes = [];
  for (const message of messages) {
    const text = `publint ${message.type}: ${formatMessage(message, manifest, { color: false }) ?? message.code}`;
    (message.type === "error" ? errors : notes).push(text);
  }
  return { errors, notes };
}

function runAttw(tarballPath, manifest) {
  const cssEntrypoints = [
    ...new Set(
      exportEntries(manifest.exports)
        .filter(({ target }) => target.endsWith(".css"))
        .map(({ subpath }) => subpath),
    ),
  ];
  const args = [
    attwBin,
    tarballPath,
    "--profile",
    "esm-only",
    "--no-definitely-typed",
    "--format",
    "json",
  ];
  if (cssEntrypoints.length > 0) args.push("--exclude-entrypoints", ...cssEntrypoints);
  const result = node(args, repoRoot);
  let report;
  try {
    report = JSON.parse(result.stdout);
  } catch {
    return { errors: [`attw did not return JSON: ${result.stderr || result.stdout}`], notes: [] };
  }
  const problems = report.analysis?.problems ?? [];
  const relevant = problems.filter((problem) => !IGNORED_RESOLUTIONS.has(problem.resolutionKind));
  const ignored = problems.length - relevant.length;
  return {
    errors: relevant.map(
      (problem) =>
        `attw ${problem.kind} at ${problem.entrypoint ?? "(package)"} [${problem.resolutionKind ?? "all"}]`,
    ),
    notes: ignored
      ? [`attw: ${ignored} CommonJS-only resolution finding(s) ignored by the esm-only profile`]
      : [],
  };
}

/** Import every JS export at runtime and type-check every typed export (NodeNext and Bundler). */
function checkConsumer(consumerDir, artifacts) {
  const errors = new Map(artifacts.map(({ pkg }) => [pkg.name, []]));
  const specifiers = [];
  const typed = [];
  for (const { pkg, manifest } of artifacts) {
    const bySubpath = new Map();
    for (const entry of exportEntries(manifest.exports)) {
      bySubpath.set(entry.subpath, [...(bySubpath.get(entry.subpath) ?? []), entry]);
    }
    for (const [subpath, entries] of bySubpath) {
      const specifier = subpath === "." ? manifest.name : `${manifest.name}${subpath.slice(1)}`;
      if (entries.some(({ target }) => /\.m?js$/.test(target))) {
        specifiers.push({ pkg: pkg.name, specifier });
      }
      if (entries.some(({ conditions }) => conditions.includes("types"))) {
        typed.push({ pkg: pkg.name, specifier });
      }
    }
  }

  writeFileSync(
    join(consumerDir, "imports.mjs"),
    `const specifiers = ${JSON.stringify(specifiers.map((s) => s.specifier))};
const failures = [];
for (const specifier of specifiers) {
  try { await import(specifier); } catch (error) { failures.push({ specifier, message: String(error?.message ?? error) }); }
}
console.log(JSON.stringify(failures));
`,
  );
  const imported = node(["imports.mjs"], consumerDir);
  let failures = [];
  try {
    failures = JSON.parse(imported.stdout);
  } catch {
    failures = specifiers.map(({ specifier }) => ({ specifier, message: imported.stderr }));
  }
  for (const { specifier, message } of failures) {
    const owner = specifiers.find((s) => s.specifier === specifier)?.pkg;
    errors.get(owner)?.push(`runtime import("${specifier}") failed: ${message}`);
  }

  writeFileSync(
    join(consumerDir, "types.ts"),
    `${typed.map(({ specifier }, index) => `import * as m${index} from "${specifier}";`).join("\n")}
export const modules = [${typed.map((_, index) => `m${index}`).join(", ")}];
`,
  );
  const modes = {
    NodeNext: { module: "NodeNext", moduleResolution: "NodeNext" },
    Bundler: { module: "ESNext", moduleResolution: "Bundler" },
  };
  for (const [mode, options] of Object.entries(modes)) {
    const config = join(consumerDir, `tsconfig.${mode}.json`);
    writeFileSync(
      config,
      JSON.stringify({
        compilerOptions: {
          ...options,
          target: "ES2022",
          strict: true,
          noEmit: true,
          skipLibCheck: false,
          types: [],
        },
        files: ["types.ts"],
      }),
    );
    const result = node([tscBin, "-p", config], consumerDir);
    if (result.status !== 0) {
      const output = `${result.stdout}${result.stderr}`;
      for (const { pkg, specifier } of typed) {
        if (output.includes(specifier) || output.includes(pkg)) {
          errors.get(pkg).push(`TypeScript (${mode}) cannot resolve ${specifier}:\n${output}`);
        }
      }
      if (!typed.some(({ pkg, specifier }) => output.includes(specifier) || output.includes(pkg))) {
        for (const { pkg } of artifacts)
          errors.get(pkg.name).push(`TypeScript (${mode}): ${output}`);
      }
    }
  }
  return { errors, imports: specifiers.length, typed: typed.length };
}

async function main() {
  const packages = listWorkspacePackages();
  const publicPackages = packages.filter((pkg) => pkg.intendedPublic);
  const internalNames = packages.filter((pkg) => !pkg.intendedPublic).map((pkg) => pkg.name);
  const publicNames = publicPackages.map((pkg) => pkg.name);
  if (publicPackages.length === 0) throw new Error("No intended public packages found.");

  if (!process.argv.includes("--no-build")) {
    console.info("Building packages (pnpm build:packages)...");
    pnpm(["build:packages"], repoRoot);
  }

  // Spaces and Unicode in the path exercise path handling on every OS.
  const { dir: workDir, dispose } = createTempDir("neshel check-pack ñ-");
  const consumerDir = join(workDir, "consumer app");
  const nodeModules = join(consumerDir, "node_modules");
  let failed = false;
  try {
    mkdirSync(nodeModules, { recursive: true });
    writeFileSync(
      join(consumerDir, "package.json"),
      JSON.stringify({ name: "neshel-pack-consumer", private: true, type: "module" }),
    );

    const artifacts = [];
    for (const pkg of publicPackages) {
      const tarballPath = packPackage(pkg.dir, join(workDir, "tarballs", pkg.dirName));
      const tarball = readFileSync(tarballPath);
      // Research R19: packing the same build twice must produce byte-identical tarballs.
      const repacked = readFileSync(packPackage(pkg.dir, join(workDir, "repack", pkg.dirName)));
      const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
      const determinismErrors =
        sha256(tarball) === sha256(repacked)
          ? []
          : ["packing twice produced different tarballs (non-deterministic contents or metadata)"];
      const files = new Map();
      for (const [path, contents] of readTarGz(tarball)) {
        files.set(path.replace(/^package\//, ""), contents);
      }
      const manifest = JSON.parse(files.get("package.json")?.toString("utf8") ?? "{}");
      const errors = [
        ...checkDependencySpecs(manifest, internalNames),
        ...checkTargets(manifest, files),
        ...checkDeclarations(manifest),
        ...checkSourceMaps(files),
        ...checkSideEffects(manifest),
        ...checkUnexpectedFiles(files),
        ...checkLifecycleScripts(manifest),
        ...checkPublicPeers(manifest, publicNames),
        ...checkPackageContract(manifest, files, {
          sourceCss: readOptional(join(pkg.dir, "src", "styles.css")),
          sourceManifest: readOptional(join(pkg.dir, "src", "style-manifest.json")),
        }),
        ...determinismErrors,
      ];
      const lint = await runPublint(tarball, manifest);
      const types = runAttw(tarballPath, manifest);
      errors.push(...lint.errors, ...types.errors);

      writeFiles(files, join(nodeModules, ...manifest.name.split("/")));
      artifacts.push({
        pkg,
        manifest,
        tarball: basename(tarballPath),
        size: tarball.byteLength,
        fileCount: files.size,
        errors,
        notes: [...lint.notes, ...types.notes],
      });
    }

    // Link third-party dependencies after all packed packages are extracted, so a public
    // workspace dependency (e.g. cli -> config) resolves to its packed copy, never to the repo.
    for (const { pkg, manifest, errors } of artifacts) {
      for (const dependency of Object.keys({
        ...manifest.dependencies,
        ...manifest.peerDependencies,
      })) {
        if (publicNames.includes(dependency)) continue;
        if (!linkFromWorkspace(dependency, pkg.dir, nodeModules)) {
          errors.push(`dependency ${dependency} is not installed in the workspace; cannot verify`);
        }
        linkFromWorkspace(
          `@types/${dependency.replace(/^@/, "").replace("/", "__")}`,
          pkg.dir,
          nodeModules,
        );
      }
    }

    const consumer = checkConsumer(consumerDir, artifacts);
    for (const artifact of artifacts) {
      artifact.errors.push(...consumer.errors.get(artifact.pkg.name));
      const status = artifact.errors.length ? "FAIL" : "ok";
      console.info(
        `${status.padEnd(4)} ${artifact.manifest.name}@${artifact.manifest.version} — ${artifact.fileCount} files, ${(artifact.size / 1024).toFixed(1)} KiB (${artifact.tarball})`,
      );
      for (const error of artifact.errors) console.error(`     ERROR ${error}`);
      for (const note of artifact.notes) console.info(`     note  ${note}`);
      if (artifact.errors.length) failed = true;
    }
    console.info(
      `Consumer checks: ${consumer.imports} runtime import(s), ${consumer.typed} typed entrypoint(s) under NodeNext and Bundler.`,
    );
  } finally {
    dispose();
  }

  if (failed) {
    console.error("check:pack failed. Fix the errors above; see ADR 0004 for the rules.");
    process.exitCode = 1;
  } else {
    console.info(`check:pack passed for ${publicPackages.length} intended public packages.`);
  }
}

main().catch((error) => {
  console.error(`check:pack could not complete: ${error.message}`);
  process.exitCode = 1;
});
