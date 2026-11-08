import { rm } from "node:fs/promises";
import { join } from "node:path";
import { packageDirectories, repoRoot } from "./lib/workspace.mjs";

// Usage: node scripts/clean.mjs [--packages]
//   --packages  only remove packages/*/dist. Runs before every package build so deleted or
//               renamed sources never leave stale, publishable files behind.
// Anchor deletion to this repository, never to the caller's current dir.
// Running `pnpm clean` from another directory cannot delete unrelated dist/.
const packagesOnly = process.argv.includes("--packages");
const targets = packageDirectories().map((dir) => join(dir, "dist"));
if (!packagesOnly) {
  targets.push(
    join(repoRoot, "apps", "playground-vite", "dist"),
    join(repoRoot, "apps", "storybook", "storybook-static"),
  );
}
for (const target of targets) {
  await rm(target, { recursive: true, force: true });
}
console.info(
  packagesOnly
    ? "Removed package build outputs."
    : "Removed generated build outputs from the Neshel-UI repository.",
);
