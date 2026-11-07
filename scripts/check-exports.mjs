import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const names = ["core", "config", "layout", "typography", "components", "cli"];
let failures = 0;
for (const name of names) {
  const dir = resolve(root, "packages", name);
  const pkg = JSON.parse(readFileSync(resolve(dir, "package.json"), "utf8"));
  for (const [subpath, target] of Object.entries(pkg.exports)) {
    const paths = typeof target === "string" ? [target] : Object.values(target);
    for (const item of paths) {
      if (!existsSync(resolve(dir, item))) {
        console.error(`Missing ${pkg.name} ${subpath} -> ${item}. Run pnpm build:packages.`);
        failures++;
      }
    }
  }
}
if (failures) process.exitCode = 1;
else console.info("All build-time package exports resolve to existing files.");
