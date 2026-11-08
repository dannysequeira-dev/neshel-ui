// Shipped stylesheets: no drift from the generator (FR-013) and the 0.x alias (FR-007).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { findDrift } from "../../../scripts/generate-default-css.mjs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("committed tokens.css and tailwind.css equal the generator output", async () => {
  assert.deepEqual(await findDrift(), [], "run pnpm build:packages && pnpm generate:tokens");
});

test("dist/styles.css is byte-identical to dist/tailwind.css", () => {
  assert.equal(read("../dist/styles.css"), read("../dist/tailwind.css"));
});

test("tokens.css is standard CSS; tailwind.css adds only the @theme inline mapping", () => {
  const tokens = read("../dist/tokens.css");
  const tailwind = read("../dist/tailwind.css");
  assert.doesNotMatch(tokens, /@theme|@apply|@tailwind|@source|@utility|@custom-variant/);
  assert.ok(tailwind.startsWith(tokens.trimEnd()), "tailwind.css must extend tokens.css");
  assert.match(tailwind.slice(tokens.trimEnd().length), /^\n\n@theme inline \{\n/);
});

test("stylesheets start with the layer order statement after the header", () => {
  for (const file of ["tokens.css", "tailwind.css"]) {
    const lines = read(`../dist/${file}`).split("\n");
    assert.match(lines[0], /^\/\* .* \*\/$/);
    assert.equal(lines[2], "@layer neshel.defaults, neshel.config;");
  }
});
