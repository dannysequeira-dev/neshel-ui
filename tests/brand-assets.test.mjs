// Brand integrity (feature 006, FR-002): the website uses the approved raster assets unchanged.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { repoRoot } from "../scripts/lib/workspace.mjs";

const sha = (path) =>
  createHash("sha256")
    .update(readFileSync(join(repoRoot, path)))
    .digest("hex");

test("site icons are byte-identical copies of the approved mark crops", () => {
  assert.equal(sha("apps/docs/public/icon.png"), sha("assets/brand/neshel-ui-mark-64.png"));
  assert.equal(sha("apps/docs/public/apple-icon.png"), sha("assets/brand/neshel-ui-mark-256.png"));
});

test("the site imports the canonical logo from assets/brand (no redrawn copy)", () => {
  const brand = readFileSync(join(repoRoot, "apps/docs/components/brand.tsx"), "utf8");
  assert.match(brand, /assets\/brand\/neshel-ui-logo\.png/);
  assert.doesNotMatch(brand, /\.svg/);
});
