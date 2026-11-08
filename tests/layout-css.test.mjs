// Pure helpers for layout stylesheet checks, including negative cases (SC-005).
import assert from "node:assert/strict";
import test from "node:test";
import {
  checkLayoutStylesheet,
  missingFromStylesheet,
  neshelClasses,
  stylesheetClasses,
  unreachableClasses,
} from "../scripts/lib/layout-css.mjs";

const css = String.raw`/* .neshel-comment { } */
@layer components.neshel {
  .neshel-stack { display: flex; }
  .neshel-gap-0\.5 { gap: 1px; }
  @media (min-width: 48rem) {
    .neshel-md-gap-4 { gap: 2px; }
  }
}
`;

test("stylesheetClasses unescapes selectors and ignores comments", () => {
  assert.deepEqual(stylesheetClasses(css), ["neshel-stack", "neshel-gap-0.5", "neshel-md-gap-4"]);
  // Minified bundler output keeps the selectors.
  assert.deepEqual(stylesheetClasses("@layer components.neshel{.neshel-a{x:y}.neshel-b{x:y}}"), [
    "neshel-a",
    "neshel-b",
  ]);
});

test("neshelClasses filters class attributes", () => {
  assert.deepEqual(neshelClasses(["neshel-a custom", "neshel-a neshel-b", undefined]), [
    "neshel-a",
    "neshel-b",
  ]);
});

test("missing and unreachable classes are reported", () => {
  assert.deepEqual(missingFromStylesheet(["neshel-stack", "neshel-gap-9"], css), ["neshel-gap-9"]);
  assert.deepEqual(unreachableClasses(["neshel-stack"], css), [
    "neshel-gap-0.5",
    "neshel-md-gap-4",
  ]);
});

test("hygiene accepts the shipped shape and rejects violations", () => {
  assert.deepEqual(checkLayoutStylesheet(css), []);
  assert.match(checkLayoutStylesheet(".neshel-a { x: y }").join(), /not wrapped/);
  assert.match(checkLayoutStylesheet(`${css}\n@apply flex;`).join(), /@apply/);
  assert.match(
    checkLayoutStylesheet(css.replace(".neshel-stack", "body")).join(),
    /selector "body"/,
  );
  assert.match(
    checkLayoutStylesheet(css.replace("gap: 1px", "color: #fff")).join(),
    /colour literal/,
  );
  assert.match(
    checkLayoutStylesheet(css.replace("gap: 1px", "background: url(x.png)")).join(),
    /url/,
  );
});
