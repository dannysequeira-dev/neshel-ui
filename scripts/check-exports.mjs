import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { listWorkspacePackages } from "./lib/workspace.mjs";

/** Collect every string target of a (possibly nested, conditional) exports value. */
function targets(value) {
  if (typeof value === "string") return [value];
  if (value && typeof value === "object") return Object.values(value).flatMap(targets);
  return [];
}

let failures = 0;
for (const { dir, name, manifest } of listWorkspacePackages()) {
  for (const [subpath, target] of Object.entries(manifest.exports ?? {})) {
    for (const item of targets(target)) {
      if (!existsSync(resolve(dir, item))) {
        console.error(`Missing ${name} ${subpath} -> ${item}. Run pnpm build:packages.`);
        failures++;
      }
    }
  }
}
if (failures) process.exitCode = 1;
else console.info("All build-time package exports resolve to existing files.");
