import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { listWorkspacePackages, repoRoot } from "./lib/workspace.mjs";

const required = [
  "CLAUDE.md",
  "pnpm-workspace.yaml",
  "docs/architecture.md",
  ".specify/memory/constitution.md",
  "specs/001-foundation/spec.md",
];
const problems = [];
for (const relative of required) {
  if (!existsSync(resolve(repoRoot, relative))) problems.push(`Missing ${relative}`);
}

const packages = listWorkspacePackages();
if (packages.length === 0) problems.push("No workspace packages found under packages/");
for (const { dirName, name, manifest, intendedPublic } of packages) {
  if (name !== `@neshel-ui/${dirName}`) {
    problems.push(`packages/${dirName}: name must be @neshel-ui/${dirName}, found ${name}`);
  }
  if (manifest.private !== true) problems.push(`Publishing guard missing: ${name}`);
  if (!manifest.exports?.["."]?.types || !manifest.exports?.["."]?.import) {
    problems.push(`Missing type or ESM exports in ${name}`);
  }
  // ADR 0002: core is internal and must never be marked for publication.
  if (dirName === "core" && intendedPublic) {
    problems.push(`${name} is internal and must not declare publishConfig.access "public"`);
  }
}

if (problems.length > 0) {
  for (const problem of problems) console.error(`ERROR ${problem}`);
  process.exitCode = 1;
} else {
  const publicCount = packages.filter((pkg) => pkg.intendedPublic).length;
  console.info(
    `Workspace scaffold verified (${packages.length} guarded packages, ${publicCount} intended public).`,
  );
}
