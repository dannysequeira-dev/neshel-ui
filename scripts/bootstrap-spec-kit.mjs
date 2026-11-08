import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Spec Kit is optional: do not vendor its official templates or pretend they
// are installed. It supports a Python script flavor on all three host OSes.
const root = fileURLToPath(new URL("../", import.meta.url));
const protectedFiles = [
  "CLAUDE.md",
  "AGENTS.md",
  "README.md",
  "package.json",
  ".gitignore",
  ".gitattributes",
  ".claude/settings.json",
  ".claude/skills/neshel-audit/SKILL.md",
  ".claude/skills/neshel-slice/SKILL.md",
  ".vscode/settings.json",
  ".vscode/extensions.json",
  ".specify/README.md",
  ".specify/memory/constitution.md",
];
const backups = new Map();
for (const rel of protectedFiles) {
  const path = resolve(root, rel);
  if (existsSync(path)) backups.set(rel, readFileSync(path));
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
  // Restore protected files. When Spec Kit changed one, keep its proposed
  // version outside the repository so a maintainer can review and merge it.
  let proposedDir;
  for (const [rel, bytes] of backups) {
    const path = resolve(root, rel);
    const current = existsSync(path) ? readFileSync(path) : undefined;
    if (current && !current.equals(bytes)) {
      proposedDir ??= mkdtempSync(join(tmpdir(), "neshel-spec-kit-proposed-"));
      const proposed = join(proposedDir, rel);
      mkdirSync(dirname(proposed), { recursive: true });
      writeFileSync(proposed, current);
      console.warn(`Restored ${rel}; Spec Kit's proposed version: ${proposed}`);
    }
    writeFileSync(path, bytes);
  }
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
