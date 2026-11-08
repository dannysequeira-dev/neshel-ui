import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const skipped = new Set([
  ".git",
  "node_modules",
  "dist",
  "coverage",
  "storybook-static",
  ".next",
  ".pnpm-store",
  ".turbo",
  ".vite",
]);
const manifests = ["package.json"];
const issues = [];
let inspected = 0;

// Case-fold collision detection: paths that coexist on Linux can clash on
// typical Windows/macOS filesystems. Skips generated dependencies/builds.
function visit(directory) {
  const entries = readdirSync(directory, { withFileTypes: true });
  const seen = new Map();
  for (const entry of entries) {
    if (skipped.has(entry.name)) continue;
    const key = entry.name.normalize("NFC").toLowerCase();
    const previous = seen.get(key);
    if (previous && previous !== entry.name) {
      issues.push(
        `Case collision in ${relative(root, directory) || "."}: ${previous} / ${entry.name}`,
      );
    }
    seen.set(key, entry.name);
  }
  for (const entry of entries) {
    if (skipped.has(entry.name) || entry.isSymbolicLink()) continue;
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) visit(absolute);
    if (entry.isFile() && entry.name === "package.json") {
      manifests.push(relative(root, absolute).replaceAll("\\", "/"));
    }
  }
}

visit(root);

// These patterns should not be introduced into npm scripts: Windows runs
// scripts through cmd.exe by default and POSIX shells differ.
const unsupported = [
  [/\brm\s+-[rf]+\b/, "POSIX rm flags"],
  [/\bmkdir\s+-p\b/, "POSIX mkdir -p"],
  [/\bcp\s+(?:-[a-zA-Z]+\s+)?/, "POSIX cp"],
  [/\bexport\s+[A-Za-z_][A-Za-z_0-9]*=/, "POSIX environment export"],
  [/(?:^|[;&|]\s*)[A-Za-z_][A-Za-z_0-9]*=[^\s]+\s+\S/, "POSIX inline environment variable"],
  [/\bsource\s+\S+/, "POSIX source"],
  [/\b(?:sudo|apt-get|brew)\s+/, "OS-specific package manager"],
  [/\b(?:pwsh|powershell)(?:\.exe)?\s+/, "PowerShell-only execution"],
  [/\b(?:bash|sh)\s+\S+\.(?:sh|bash)\b/, "Bash-only execution"],
];

for (const filename of new Set(manifests)) {
  const pkg = JSON.parse(readFileSync(resolve(root, filename), "utf8"));
  for (const [scriptName, command] of Object.entries(pkg.scripts ?? {})) {
    inspected++;
    for (const [pattern, message] of unsupported) {
      if (pattern.test(command)) {
        issues.push(`${filename} scripts.${scriptName}: ${message}: ${command}`);
      }
    }
  }
}

if (issues.length) {
  for (const issue of issues) console.error(`ERROR ${issue}`);
  process.exitCode = 1;
} else {
  console.info(
    `Portability static audit OK (${manifests.length} manifests; ${inspected} scripts).`,
  );
  console.info("Actual OS parity requires green CI on Windows, Linux and macOS.");
}
