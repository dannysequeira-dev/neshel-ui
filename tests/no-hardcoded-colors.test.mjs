// FR-002: component-facing packages must use semantic tokens, never literal colours.
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { repoRoot } from "../scripts/lib/workspace.mjs";

const COLOUR_LITERAL = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab|lab|lch|hwb)\(/i;

function sourceFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(?:tsx?|css)$/.test(entry.name) ? [path] : [];
  });
}

for (const pkg of ["layout", "typography", "components"]) {
  test(`${pkg} sources contain no colour literals`, () => {
    const offenders = sourceFiles(join(repoRoot, "packages", pkg, "src")).filter((file) =>
      COLOUR_LITERAL.test(readFileSync(file, "utf8")),
    );
    assert.deepEqual(offenders, []);
  });
}

test("the colour-literal detector recognises common forms", () => {
  for (const sample of ["color: #fff;", "bg-[#193767]", "rgb(0 0 0)", "oklch(0.7 0.1 80)"]) {
    assert.match(sample, COLOUR_LITERAL);
  }
  assert.doesNotMatch("var(--neshel-primary)", COLOUR_LITERAL);
});
