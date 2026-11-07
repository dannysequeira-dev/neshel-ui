import { rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";

// Anchor deletion to this repository, never to the caller's current dir.
// Running `pnpm clean` from another directory cannot delete unrelated dist/.
const folders = [
  ...["core", "config", "layout", "typography", "components", "cli"].map(
    (name) => `packages/${name}/dist/`,
  ),
  "apps/playground-vite/dist/",
  "apps/storybook/storybook-static/",
];
for (const folder of folders) {
  const target = fileURLToPath(new URL(`../${folder}`, import.meta.url));
  await rm(target, { recursive: true, force: true });
}
console.info("Removed generated build outputs from the Neshel-UI repository.");
