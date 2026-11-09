// Helpers of the R1 backdrop browser check (feature 006).
import assert from "node:assert/strict";
import test from "node:test";
import { parseColor, removeSupportsBlocks } from "../scripts/lib/backdrop-browser.mjs";

test("parseColor reads rgb, rgba and color(srgb) computed values", () => {
  assert.deepEqual(parseColor("rgb(13, 27, 51)"), { rgb: [13, 27, 51], alpha: 1 });
  assert.deepEqual(parseColor("rgba(0, 0, 0, 0)"), { rgb: [0, 0, 0], alpha: 0 });
  assert.deepEqual(parseColor("color(srgb 0.0509804 0.105882 0.2 / 0.45)"), {
    rgb: [13, 27, 51],
    alpha: 0.45,
  });
});

test("removeSupportsBlocks removes nested @supports blocks that mention the needle only", () => {
  const css =
    "a{x:1}@supports not (color: nolight-dark(a, b)){.o{y:2}@media (x){.p{z:3}}}@supports (display:grid){.g{d:1}}";
  assert.equal(
    removeSupportsBlocks(css, "nolight-dark"),
    "a{x:1}@supports (display:grid){.g{d:1}}",
  );
});
