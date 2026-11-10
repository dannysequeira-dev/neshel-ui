// pnpm check:starters [--starter <name>]... [--zip-out <dir>] [--no-build] [--from-registry]
// Feature 006 (research R9, FR-032): writes deterministic ZIP archives of starters/*, then, for
// each starter, extracts its ZIP into a temporary directory OUTSIDE the workspace (path with spaces
// and Unicode), points its @neshel-ui/* dependencies at freshly packed tarballs, installs from the
// registry, and runs the starter's own build script. Verifies the ZIP round-trip byte for byte and
// that a second archive is identical (determinism). Requires network access for third-party tools.
// --from-registry (after a publication, feature 007): installs each extracted ZIP exactly as a user
// would — @neshel-ui/* from the npm registry instead of tarballs — and checks the resolved versions.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { pnpm } from "./lib/pnpm.mjs";
import { createTempDir } from "./lib/temp.mjs";
import { repoRoot } from "./lib/workspace.mjs";
import { archiveContent, collectFiles, readZip, zipDirectory } from "./lib/zip.mjs";
import { packPublicPackages, useTarballs } from "./pack-local.mjs";

const STARTERS_DIR = join(repoRoot, "starters");
export const EXCLUDE = [
  /(^|\/)node_modules(\/|$)/,
  /(^|\/)dist(\/|$)/,
  /(^|\/)\.next(\/|$)/,
  /(^|\/)next-env\.d\.ts$/,
  /(^|\/)neshel\.generated\.(css|d\.ts)$/,
  /(^|\/)(pnpm-lock\.yaml|package-lock\.json|yarn\.lock)$/,
];

export function starterNames() {
  return readdirSync(STARTERS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

/** Expected built output of each starter. */
const OUTPUT = {
  "vite-tailwind": "dist/index.html",
  "vite-css": "dist/index.html",
  "next-app": ".next/BUILD_ID",
};

function installedVersion(appDir, pkg) {
  try {
    return JSON.parse(readFileSync(join(appDir, "node_modules", pkg, "package.json"), "utf8"))
      .version;
  } catch {
    return "missing";
  }
}

/** `^M.m.p` semantics (0.x keeps the minor fixed); the starters only use caret ranges. */
export function satisfiesCaret(version, range) {
  const want = /^\^(\d+)\.(\d+)\.(\d+)$/.exec(range);
  const have = /^(\d+)\.(\d+)\.(\d+)$/.exec(version ?? "");
  if (!want || !have) return false;
  const [w, h] = [want.slice(1).map(Number), have.slice(1).map(Number)];
  if (h[0] !== w[0]) return false;
  if (w[0] === 0 && h[1] !== w[1]) return false;
  for (let i = 0; i < 3; i += 1) if (h[i] !== w[i]) return h[i] > w[i];
  return true;
}

function arg(name) {
  return process.argv.flatMap((a, i) => (process.argv[i - 1] === name ? [a] : []));
}

function main() {
  const selected = arg("--starter");
  const names = selected.length ? selected : starterNames();
  const zipOut = resolve(arg("--zip-out")[0] ?? join(repoRoot, "dist-starters"));
  const build = !process.argv.includes("--no-build");
  const fromRegistry = process.argv.includes("--from-registry");
  const problems = [];
  mkdirSync(zipOut, { recursive: true });

  const temp = createTempDir("neshel starters ñ-");
  try {
    let tarballDir;
    if (build && !fromRegistry) {
      tarballDir = join(temp.dir, "tarballs");
      console.info("Packing the public packages…");
      packPublicPackages(tarballDir);
    }
    for (const name of names) {
      const source = join(STARTERS_DIR, name);
      console.info(`\n[${name}]`);
      const zip = zipDirectory(source, name, { exclude: EXCLUDE });
      const again = zipDirectory(source, name, { exclude: EXCLUDE });
      if (!zip.equals(again)) problems.push(`${name}: ZIP output is not deterministic`);
      const zipPath = join(zipOut, `neshel-ui-starter-${name}.zip`);
      writeFileSync(zipPath, zip);
      console.info(`  · wrote ${zipPath} (${zip.length} bytes)`);

      // Round trip: every source file is in the archive with identical (normalised) content.
      const entries = readZip(zip);
      const files = collectFiles(source, { exclude: EXCLUDE });
      const names_ = entries.map((e) => e.name.slice(name.length + 1));
      if (JSON.stringify(names_) !== JSON.stringify(files)) {
        problems.push(`${name}: archive entries differ from the starter files`);
      }
      for (const entry of entries) {
        const rel = entry.name.slice(name.length + 1);
        if (!entry.data.equals(archiveContent(source, rel)))
          problems.push(`${name}: ${rel} differs in the archive`);
      }
      for (const forbidden of ["workspace:", "catalog:", "link:"]) {
        const manifest =
          entries.find((e) => e.name === `${name}/package.json`)?.data.toString("utf8") ?? "";
        if (manifest.includes(forbidden))
          problems.push(`${name}: package.json uses "${forbidden}"`);
      }
      if (!build) continue;

      // Build from the extracted archive, outside the workspace.
      const appDir = join(temp.dir, `app ${name}`);
      for (const entry of entries) {
        const target = join(temp.dir, `app ${entry.name}`);
        mkdirSync(dirname(target), { recursive: true });
        writeFileSync(target, entry.data);
      }
      if (!fromRegistry) {
        for (const line of useTarballs(appDir, tarballDir)) console.info(`  · ${line}`);
      }
      try {
        console.info("  · pnpm install");
        pnpm(["install", "--no-frozen-lockfile"], appDir, { isolated: true });
        console.info("  · pnpm run build");
        pnpm(["run", "build"], appDir, { isolated: true });
      } catch (error) {
        problems.push(`${name}: ${error.message.split("\n").slice(0, 25).join("\n")}`);
        continue;
      }
      const output = join(appDir, OUTPUT[name] ?? "dist/index.html");
      if (!existsSync(output))
        problems.push(`${name}: expected build output ${OUTPUT[name]} is missing`);
      else console.info(`  · build output ${OUTPUT[name]} ✓`);
      const manifest = JSON.parse(readFileSync(join(appDir, "package.json"), "utf8"));
      const neshel = Object.entries({
        ...manifest.dependencies,
        ...manifest.devDependencies,
      }).filter(([n]) => n.startsWith("@neshel-ui/"));
      if (fromRegistry) {
        for (const [pkg, spec] of neshel) {
          const installed = installedVersion(appDir, pkg);
          if (!satisfiesCaret(installed, spec))
            problems.push(`${name}: ${pkg} resolved to ${installed}, expected ${spec} from npm`);
          else console.info(`  · ${pkg}@${installed} from the registry ✓`);
        }
      } else if (neshel.some(([, spec]) => !String(spec).startsWith("file:")))
        problems.push(`${name}: not all Neshel packages came from tarballs`);
    }
  } finally {
    temp.dispose();
  }

  if (problems.length) {
    for (const problem of problems) {
      console.error(`✗ ${problem}`);
      if (process.env.GITHUB_ACTIONS === "true")
        console.info(`::error title=check:starters::${problem.split("\n")[0]}`);
    }
    process.exitCode = 1;
  } else
    console.info(
      `\ncheck:starters: ${names.length} starter(s) archived${build ? `, installed${fromRegistry ? " from npm" : ""} and built` : ""} ✓`,
    );
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main();
