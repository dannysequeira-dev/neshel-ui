import { rm } from "node:fs/promises";
import { join } from "node:path";
import { packageDirectories, repoRoot } from "./lib/workspace.mjs";

// Anchor deletion to this repository, never to the caller's current dir.
// Running `pnpm clean` from another directory cannot delete unrelated dist/.
const targets = [
  ...packageDirectories().map((dir) => join(dir, "dist")),
  join(repoRoot, "apps", "playground-vite", "dist"),
  join(repoRoot, "apps", "storybook", "storybook-static"),
];
for (const target of targets) {
  await rm(target, { recursive: true, force: true });
}
console.info("Removed generated build outputs from the Neshel-UI repository.");
