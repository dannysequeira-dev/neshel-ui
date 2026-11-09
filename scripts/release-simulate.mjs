// pnpm release:simulate [--out <dir>]
// Feature 006 (research R15, contracts/release.md): rehearses the owner-approved 0.1.0 transition
// WITHOUT touching the repository's publishing guards. In a temporary copy of the repository it
//   1. removes `private: true` from the five public packages (copy only),
//   2. runs `changeset version` (fixed group) and checks every public package becomes exactly
//      0.1.0 while @neshel-ui/core stays private and unversioned,
//   3. packs each package and checks the packed manifest (version, ^0.1.0 peer ranges, no
//      workspace:/catalog: specs, not private),
//   4. runs `npm publish <tarball> --dry-run` for each, in dependency order.
// --out keeps the generated changelogs and tarball inventory (release notes draft input).
// Requires `pnpm build:packages` (dist is copied with the sources).
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { packPackage } from "./lib/pnpm.mjs";
import { readTarGz } from "./lib/tar.mjs";
import { createTempDir } from "./lib/temp.mjs";
import { repoRoot } from "./lib/workspace.mjs";

export const PUBLISH_ORDER = ["config", "layout", "typography", "components", "cli"];
const TARGET = "0.1.0";
const SKIP =
  /[\\/](node_modules|\.git|\.next|out|storybook-static|dist-starters|\.snippets|\.source)([\\/]|$)/;

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8" });
  return { ok: result.status === 0, output: `${result.stdout ?? ""}${result.stderr ?? ""}` };
}

/** npm's CLI entry next to the running Node (Windows and POSIX layouts), run without a shell. */
export function npmCli() {
  const dir = dirname(process.execPath);
  const candidates = [
    join(dir, "node_modules", "npm", "bin", "npm-cli.js"),
    join(dir, "..", "lib", "node_modules", "npm", "bin", "npm-cli.js"),
  ];
  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) throw new Error(`npm-cli.js not found next to ${process.execPath}`);
  return found;
}

function main() {
  const outIndex = process.argv.indexOf("--out");
  const out = outIndex === -1 ? undefined : resolve(process.argv[outIndex + 1]);
  for (const dir of PUBLISH_ORDER) {
    if (!existsSync(join(repoRoot, "packages", dir, "dist")))
      throw new Error(`packages/${dir}/dist missing — run pnpm build:packages`);
  }
  const problems = [];
  const inventory = [];
  const temp = createTempDir("neshel release ñ-");
  try {
    const copy = join(temp.dir, "repo");
    cpSync(repoRoot, copy, {
      recursive: true,
      filter: (src) => !SKIP.test(src.slice(repoRoot.length - 1)),
    });

    // 1. Lift the guards in the copy only.
    for (const dir of PUBLISH_ORDER) {
      const file = join(copy, "packages", dir, "package.json");
      const manifest = JSON.parse(readFileSync(file, "utf8"));
      delete manifest.private;
      writeFileSync(file, `${JSON.stringify(manifest, null, 2)}\n`);
    }

    // 2. Version with the repository's own Changesets CLI and configuration.
    const changeset = join(repoRoot, "node_modules", "@changesets", "cli", "bin.js");
    const version = run(process.execPath, [changeset, "version"], copy);
    if (!version.ok) throw new Error(`changeset version failed:\n${version.output}`);
    for (const dir of PUBLISH_ORDER) {
      const manifest = JSON.parse(
        readFileSync(join(copy, "packages", dir, "package.json"), "utf8"),
      );
      if (manifest.version !== TARGET)
        problems.push(`${manifest.name} versioned to ${manifest.version}, expected ${TARGET}`);
      if (!existsSync(join(copy, "packages", dir, "CHANGELOG.md")))
        problems.push(`${manifest.name}: no CHANGELOG.md generated`);
    }
    const core = JSON.parse(readFileSync(join(copy, "packages", "core", "package.json"), "utf8"));
    if (core.private !== true || core.version !== "0.0.0")
      problems.push("@neshel-ui/core must stay private at 0.0.0");
    const leftover = run(process.execPath, [changeset, "status"], copy);
    if (
      !/No changesets present|Packages to be bumped:\s*$/m.test(leftover.output) &&
      /minor|patch|major/.test(leftover.output)
    ) {
      problems.push(`changesets remain after versioning:\n${leftover.output}`);
    }

    // 3–4. Pack and dry-run publish in dependency order.
    for (const dir of PUBLISH_ORDER) {
      const tarball = packPackage(join(copy, "packages", dir), join(temp.dir, "tarballs", dir));
      const bytes = readFileSync(tarball);
      const files = new Map();
      for (const [path, contents] of readTarGz(bytes))
        files.set(path.replace(/^package\//, ""), contents);
      const manifest = JSON.parse(files.get("package.json").toString("utf8"));
      const where = `${manifest.name}@${manifest.version}`;
      if (manifest.private) problems.push(`${where}: packed manifest is private`);
      if (manifest.version !== TARGET) problems.push(`${where}: packed version is not ${TARGET}`);
      const specs = JSON.stringify({ ...manifest.dependencies, ...manifest.peerDependencies });
      if (/workspace:|catalog:/.test(specs))
        problems.push(`${where}: unresolved workspace/catalog specs ${specs}`);
      const peer = manifest.peerDependencies?.["@neshel-ui/config"];
      if (dir !== "config" && peer !== `^${TARGET}`)
        problems.push(`${where}: peer @neshel-ui/config is ${peer}, expected ^${TARGET}`);
      if (!files.has("CHANGELOG.md") && !files.has("README.md"))
        problems.push(`${where}: README missing`);
      const dry = run(
        process.execPath,
        [npmCli(), "publish", tarball, "--dry-run", "--access", "public", "--provenance=false"],
        temp.dir,
      );
      if (!dry.ok)
        problems.push(
          `${where}: npm publish --dry-run failed:\n${dry.output.split("\n").slice(-12).join("\n")}`,
        );
      inventory.push({
        package: manifest.name,
        version: manifest.version,
        tarball: tarball.split(/[\\/]/).pop(),
        files: files.size,
        bytes: bytes.length,
        sha256: createHash("sha256").update(bytes).digest("hex"),
        integrity: `sha512-${createHash("sha512").update(bytes).digest("base64")}`,
        peerDependencies: manifest.peerDependencies ?? {},
        dependencies: manifest.dependencies ?? {},
      });
      console.info(
        `  ${dry.ok ? "✓" : "✗"} ${where} — ${files.size} files, ${(bytes.length / 1024).toFixed(1)} KiB, npm publish --dry-run ${dry.ok ? "ok" : "failed"}`,
      );
    }

    if (out) {
      mkdirSync(out, { recursive: true });
      for (const dir of PUBLISH_ORDER) {
        cpSync(join(copy, "packages", dir, "CHANGELOG.md"), join(out, `CHANGELOG.${dir}.md`));
      }
      writeFileSync(join(out, "inventory.json"), `${JSON.stringify(inventory, null, 2)}\n`);
      console.info(`\nChangelogs and inventory written to ${out}`);
    }
  } finally {
    temp.dispose();
  }
  if (problems.length) {
    for (const problem of problems) {
      console.error(`✗ ${problem}`);
      if (process.env.GITHUB_ACTIONS === "true")
        console.log(`::error title=release:simulate::${problem.split("\n")[0]}`);
    }
    process.exitCode = 1;
  } else {
    console.info(
      `release:simulate: five packages version to ${TARGET} and pass npm publish --dry-run; repository guards untouched.`,
    );
  }
}

main();
