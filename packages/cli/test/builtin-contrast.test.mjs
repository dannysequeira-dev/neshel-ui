// FR-003 / SC-002: every contract pair of both built-in themes meets its threshold, using the
// same contrast implementation as the CLI. Ratios are pinned to contracts/tokens.md.
import assert from "node:assert/strict";
import test from "node:test";
import { contrastPairs } from "@neshel-ui/config";
import { resolveConfig } from "../dist/resolve.js";
import { checkThemeContrast, displayRatio } from "../dist/validate/contrast.js";

// Published in specs/002-config-and-tokens/contracts/tokens.md (rounded down to 2 decimals).
// Feature 005 adds success/warning pairs (ADR 0013), listed in docs/theming.md.
const published = {
  light: [
    16.35, 17.18, 6.36, 7.24, 7.61, 11.77, 11.2, 11.77, 9.66, 6.75, 6.57, 6.25, 6.57, 6.51, 9.78,
    12.16, 4.51, 4.74, 3.56, 3.74, 2.66,
  ],
  dark: [
    16.82, 13.48, 7.31, 10.17, 8.15, 8.71, 9.69, 7.76, 10.19, 8.98, 7.06, 6.97, 5.59, 9.85, 10.59,
    9.42, 11.01, 8.82, 5.01, 4.01, 3.33,
  ],
};

for (const theme of resolveConfig({}).themes) {
  test(`built-in ${theme.name} theme passes every contrast pair`, () => {
    const results = checkThemeContrast(theme);
    assert.equal(results.length, contrastPairs.length);
    for (const result of results) {
      assert.ok(
        result.passes,
        `${result.foreground} on ${result.background}: ${displayRatio(result.ratio)} < ${result.minimum}`,
      );
    }
    assert.deepEqual(
      results.map((r) => Number(displayRatio(r.ratio))),
      published[theme.name],
    );
  });
}
