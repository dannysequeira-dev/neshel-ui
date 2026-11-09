// Local pre-release distribution (feature 006, documented in Getting started → Installation).
//
//   node scripts/pack-local.mjs --out <dir>      pack the five public packages (run in the repo,
//                                                 after `pnpm build:packages`)
//   node scripts/pack-local.mjs --use <dir>      in an application directory: rewrite its
//                                                 @neshel-ui/* dependencies to file: tarball paths
//
// Node standard library only; works on Windows, Linux and macOS and with paths containing spaces.
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { packPackage } from "./lib/pnpm.mjs";
import { createTempDir } from "./lib/temp.mjs";
import { repoRoot } from "./lib/workspace.mjs";

export const PUBLIC_PACKAGES = ["config", "layout", "typography", "components", "cli"];

/** Pack every public package into `out` and return { name → absolute tarball path }. */
export function packPublicPackages(out) {
  mkdirSync(out, { recursive: true });
  const result = {};
  for (const dir of PUBLIC_PACKAGES) {
    const packageDir = join(repoRoot, "packages", dir);
    if (!existsSync(join(packageDir, "dist"))) {
      throw new Error(`packages/${dir}/dist is missing — run pnpm build:packages first`);
    }
    const manifest = JSON.parse(readFileSync(join(packageDir, "package.json"), "utf8"));
    const staging = createTempDir(`neshel-pack-${dir}-`);
    try {
      const tarball = packPackage(packageDir, staging.dir);
      const target = join(out, tarball.split(sep).pop());
      rmSync(target, { force: true });
      renameSync(tarball, target);
      result[manifest.name] = target;
    } finally {
      staging.dispose();
    }
  }
  return result;
}

/** Map @neshel-ui/<name> → tarball file in `dir` (by the pnpm pack naming convention). */
export function tarballsIn(dir) {
  const map = {};
  for (const file of readdirSync(dir)) {
    const match = file.match(/^neshel-ui-(config|layout|typography|components|cli)-.+\.tgz$/);
    if (match) map[`@neshel-ui/${match[1]}`] = join(dir, file);
  }
  return map;
}

/** Rewrite @neshel-ui/* dependency specs in an application's package.json to file: paths. */
export function useTarballs(appDir, tarballDir) {
  const manifestPath = join(appDir, "package.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const tarballs = tarballsIn(tarballDir);
  const changed = [];
  for (const field of ["dependencies", "devDependencies"]) {
    for (const name of Object.keys(manifest[field] ?? {})) {
      if (!name.startsWith("@neshel-ui/")) continue;
      const tarball = tarballs[name];
      if (!tarball) throw new Error(`no tarball for ${name} in ${tarballDir}`);
      const spec = `file:${relative(appDir, tarball).split(sep).join("/")}`;
      manifest[field][name] = spec;
      changed.push(`${name} → ${spec}`);
    }
  }
  // Peer dependencies (@neshel-ui/config) are direct dependencies of every starter, so they
  // resolve to the same tarball without overrides.
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  return changed;
}

function main() {
  const args = process.argv.slice(2);
  const value = (flag) => {
    const index = args.indexOf(flag);
    return index === -1 ? undefined : args[index + 1];
  };
  const out = value("--out");
  const use = value("--use");
  if (out) {
    const tarballs = packPublicPackages(resolve(out));
    for (const [name, file] of Object.entries(tarballs)) console.info(`${name}: ${file}`);
  } else if (use) {
    for (const line of useTarballs(process.cwd(), resolve(use))) console.info(line);
    console.info("Now run your package manager's install command.");
  } else {
    console.error("Usage: node scripts/pack-local.mjs --out <dir> | --use <dir>");
    process.exitCode = 2;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(repoRoot, "scripts", "pack-local.mjs"))
  main();
