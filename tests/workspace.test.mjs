import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = fileURLToPath(new URL("../", import.meta.url));
const names = ["core", "config", "components", "layout", "typography", "cli"];

test("all six packages declare public ESM and types exports", () => {
  for (const name of names) {
    const pkg = JSON.parse(readFileSync(join(root, "packages", name, "package.json")));
    assert.equal(pkg.name, `@neshel-ui/${name}`);
    assert.ok(pkg.exports["."].import);
    assert.ok(pkg.exports["."].types);
    assert.equal(pkg.private, true);
  }
});

test("each package has its source entrypoint", () => {
  for (const name of names) {
    assert.ok(existsSync(join(root, "packages", name, "src", "index.ts")));
  }
});

test("the design constitution is present", () => {
  const constitution = readFileSync(join(root, ".specify", "memory", "constitution.md"), "utf8");
  assert.match(constitution, /accessibility/i);
  assert.match(constitution, /CSS-first/i);
});
