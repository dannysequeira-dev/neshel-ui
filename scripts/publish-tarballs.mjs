// node scripts/publish-tarballs.mjs <dir> --version X.Y.Z [--dry-run] [--verify-only]
// Used ONLY by .github/workflows/release.yml after owner approval (feature 006, ADR 0017).
// Publishes the five validated tarballs in dependency order with npm (trusted publishing via OIDC
// when configured; provenance requested explicitly so the token-based 0.1.0 bootstrap also gets
// it). A version that already exists on the registry is skipped, so a failed run can be repeated.
// --verify-only checks `npm view` for every package and installs all five in a clean directory.
import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const ORDER = ["config", "layout", "typography", "components", "cli"];

function npm(args, cwd) {
  const result = spawnSync("npm", args, { cwd, encoding: "utf8" });
  return { ok: result.status === 0, out: `${result.stdout ?? ""}${result.stderr ?? ""}`.trim() };
}

function main() {
  const dir = resolve(process.argv[2]);
  const version = process.argv[process.argv.indexOf("--version") + 1];
  const dryRun = process.argv.includes("--dry-run");
  const verifyOnly = process.argv.includes("--verify-only");
  if (!/^\d+\.\d+\.\d+/.test(version ?? "")) throw new Error("--version X.Y.Z is required");
  const files = readdirSync(dir);
  const failures = [];
  for (const name of ORDER) {
    const pkg = `@neshel-ui/${name}`;
    const tarball = files.find((f) => f === `neshel-ui-${name}-${version}.tgz`);
    if (!tarball) {
      failures.push(`${pkg}: tarball neshel-ui-${name}-${version}.tgz not found`);
      continue;
    }
    const exists = npm(["view", `${pkg}@${version}`, "version"]).out === version;
    if (verifyOnly) {
      if (!exists) failures.push(`${pkg}@${version} is not on the registry`);
      else console.info(`✓ ${pkg}@${version} is on the registry`);
      continue;
    }
    if (exists) {
      console.info(`= ${pkg}@${version} already published — skipped`);
      continue;
    }
    const args = ["publish", join(dir, tarball), "--access", "public", "--provenance"];
    if (dryRun) args.push("--dry-run");
    const result = npm(args);
    if (!result.ok) failures.push(`${pkg}: npm publish failed\n${result.out}`);
    else console.info(`✓ ${pkg}@${version} ${dryRun ? "(dry run)" : "published"}`);
  }
  if (verifyOnly && failures.length === 0) {
    const app = mkdtempSync(join(tmpdir(), "neshel-verify-"));
    writeFileSync(
      join(app, "package.json"),
      JSON.stringify({ name: "verify", private: true, type: "module" }),
    );
    const specs = ORDER.map((name) => `@neshel-ui/${name}@${version}`);
    const install = npm(["install", ...specs, "react@19", "react-dom@19"], app);
    if (!install.ok) failures.push(`clean install failed\n${install.out}`);
    else console.info(`✓ clean install of ${specs.join(", ")}`);
  }
  if (failures.length) {
    for (const failure of failures) console.error(`✗ ${failure}`);
    process.exitCode = 1;
  }
}

main();
