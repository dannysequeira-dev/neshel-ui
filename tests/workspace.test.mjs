import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { listWorkspacePackages, repoRoot } from "../scripts/lib/workspace.mjs";

// The six-package layout is a spec contract (FR-002); everything else derives from the workspace.
const EXPECTED = ["cli", "components", "config", "core", "layout", "typography"];
const EXPECTED_PUBLIC = ["cli", "components", "config", "layout", "typography"];
const packages = listWorkspacePackages();

test("workspace discovery finds exactly the six specified packages", () => {
  assert.deepEqual(
    packages.map((pkg) => pkg.dirName),
    EXPECTED,
  );
});

test("intended public packages are marked with publishConfig; core stays internal", () => {
  assert.deepEqual(
    packages.filter((pkg) => pkg.intendedPublic).map((pkg) => pkg.dirName),
    EXPECTED_PUBLIC,
  );
});

test("all packages keep the publish guard and declare ESM and types exports", () => {
  for (const { dirName, manifest } of packages) {
    assert.equal(manifest.name, `@neshel-ui/${dirName}`);
    assert.ok(manifest.exports["."].import);
    assert.ok(manifest.exports["."].types);
    assert.equal(manifest.private, true);
  }
});

test("each package has its source entrypoint", () => {
  for (const { dir } of packages) {
    assert.ok(existsSync(join(dir, "src", "index.ts")));
  }
});

test("the design constitution is present", () => {
  const constitution = readFileSync(
    join(repoRoot, ".specify", "memory", "constitution.md"),
    "utf8",
  );
  assert.match(constitution, /accessibility/i);
  assert.match(constitution, /CSS-first/i);
});
