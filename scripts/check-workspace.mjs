import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const required = [
  "CLAUDE.md",
  "pnpm-workspace.yaml",
  "docs/architecture.md",
  ".specify/memory/constitution.md",
  "specs/001-foundation/spec.md",
];
const packages = ["core", "config", "layout", "typography", "components", "cli"];
const problems = [];
for (const relative of required) {
  if (!existsSync(resolve(root, relative))) problems.push(`Missing ${relative}`);
}
for (const name of packages) {
  const file = resolve(root, `packages/${name}/package.json`);
  if (!existsSync(file)) {
    problems.push(`Missing packages/${name}/package.json`);
    continue;
  }
  const pkg = JSON.parse(readFileSync(file, "utf8"));
  if (pkg.name !== `@neshel-ui/${name}`) problems.push(`Invalid name in ${file}`);
  if (pkg.private !== true) problems.push(`Publishing guard missing: ${pkg.name}`);
  if (!pkg.exports?.["."]?.types || !pkg.exports?.["."]?.import)
    problems.push(`Missing type or ESM exports in ${pkg.name}`);
}
if (problems.length > 0) {
  for (const problem of problems) console.error(`ERROR ${problem}`);
  process.exitCode = 1;
} else {
  console.info(`Workspace scaffold verified (${packages.length} guarded packages).`);
}
