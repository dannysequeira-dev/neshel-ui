import { rm } from "node:fs/promises";
import { resolve } from "node:path";

const dirs = [
  ...["core", "config", "layout", "typography", "components", "cli"].map(
    (name) => `packages/${name}/dist`,
  ),
  "apps/playground-vite/dist",
  "apps/storybook/storybook-static",
];
for (const dir of dirs) {
  await rm(resolve(process.cwd(), dir), { recursive: true, force: true });
}
console.info("Removed generated build output.");
