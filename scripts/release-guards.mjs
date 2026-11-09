// node scripts/release-guards.mjs --tag vX.Y.Z
// Release workflow guard (feature 006, ADR 0017): the tag must equal the version of all five public
// packages (fixed group), none of them may be private, and @neshel-ui/core must stay private.
// Writes `version=X.Y.Z` to $GITHUB_OUTPUT when available.
import { appendFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { repoRoot } from "./lib/workspace.mjs";

export const PUBLIC = ["config", "layout", "typography", "components", "cli"];

export function guardProblems(tag, manifests, core) {
  const problems = [];
  const match = /^v(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)$/.exec(tag ?? "");
  if (!match) return [`tag "${tag}" is not of the form vX.Y.Z`];
  const version = match[1];
  for (const manifest of manifests) {
    if (manifest.version !== version)
      problems.push(`${manifest.name} is ${manifest.version}, tag is ${version}`);
    if (manifest.private)
      problems.push(`${manifest.name} is still private (the release PR must lift the guard)`);
    if (manifest.publishConfig?.access !== "public")
      problems.push(`${manifest.name} lacks publishConfig.access "public"`);
  }
  if (core.private !== true) problems.push("@neshel-ui/core must remain private");
  return problems;
}

function main() {
  const tag = process.argv[process.argv.indexOf("--tag") + 1];
  const read = (dir) =>
    JSON.parse(readFileSync(join(repoRoot, "packages", dir, "package.json"), "utf8"));
  const problems = guardProblems(tag, PUBLIC.map(read), read("core"));
  if (problems.length) {
    for (const problem of problems) console.error(`✗ ${problem}`);
    process.exitCode = 1;
    return;
  }
  const version = tag.slice(1);
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `version=${version}\n`);
  console.info(`release guards passed for ${version}`);
}

if (process.argv[1]?.endsWith("release-guards.mjs")) main();
