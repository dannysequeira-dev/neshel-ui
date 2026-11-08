import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";

/** Absolute path of the repository root (this file lives in scripts/lib/). */
export const repoRoot = fileURLToPath(new URL("../../", import.meta.url));

/**
 * Directories matching the `packages/*` workspace glob, sorted for deterministic output.
 * Does not require a package.json, so cleanup still works on partial checkouts.
 */
export function packageDirectories(root = repoRoot) {
  const base = join(root, "packages");
  if (!existsSync(base)) return [];
  return readdirSync(base, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(base, entry.name))
    .sort();
}

/**
 * Workspace packages under `packages/*` with their parsed manifests.
 * `intendedPublic` is the distribution signal (research R8): `publishConfig.access === "public"`.
 * It is independent of `private: true`, which remains the publish guard.
 */
export function listWorkspacePackages(root = repoRoot) {
  return packageDirectories(root)
    .filter((dir) => existsSync(join(dir, "package.json")))
    .map((dir) => {
      const manifest = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
      return {
        dir,
        dirName: basename(dir),
        name: manifest.name,
        manifest,
        intendedPublic: manifest.publishConfig?.access === "public",
      };
    });
}
