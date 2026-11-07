import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Spec Kit is optional: do not vendor its official templates or pretend they
// are installed. It supports a Python script flavor on all three host OSes.
const root = fileURLToPath(new URL("../", import.meta.url));
const protectedFiles = [
  "CLAUDE.md",
  "AGENTS.md",
  ".claude/settings.json",
  ".specify/README.md",
  ".specify/memory/constitution.md",
];
const backups = new Map();
for (const rel of protectedFiles) {
  const path = resolve(root, rel);
  if (existsSync(path)) backups.set(path, readFileSync(path));
}

if (process.argv.includes("--help")) {
  console.info("Usage: pnpm spec-kit:init  (requires uv tool install specify-cli)");
  console.info("Initializes official Claude integration with portable Python helper scripts.");
  process.exit(0);
}

const args = [
  "init", "--here", "--force", "--non-interactive", "--integration", "claude",
  "--script", "py", "--ignore-agent-tools",
];
const command = process.platform === "win32" ? "specify.exe" : "specify";
console.info(`Bootstrapping official Spec Kit from ${root}`);
console.info("Existing project context and constitution will be restored afterward.");

let outcome;
try {
  outcome = spawnSync(command, args, { cwd: root, stdio: "inherit" });
} finally {
  for (const [path, bytes] of backups) writeFileSync(path, bytes);
}
if (outcome.error) {
  console.error(`Unable to execute ${command}: ${outcome.error.message}`);
  console.error("Install the official CLI: uv tool install specify-cli; specify version");
  process.exitCode = 1;
} else if (outcome.status !== 0) {
  console.error(`Official Spec Kit setup exited with code ${outcome.status}.`);
  process.exitCode = outcome.status || 1;
} else {
  console.info("Spec Kit initialized. Review git diff and .specify/scripts/python/.");
  console.info("Some optional Spec Kit extensions may still need Bash/PowerShell helpers.");
}
