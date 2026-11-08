// Layout consumer helpers (feature 003 US5), including negative cases (SC-005).
import assert from "node:assert/strict";
import test from "node:test";
import {
  CONSUMER_CASE_IDS,
  checkLayoutConsumerCss,
  layoutCasesTsx,
  leakedPackages,
  typeContractTsx,
} from "../scripts/lib/consumer-layout.mjs";
import { LAYOUT_CASES } from "../scripts/lib/layout-browser.mjs";

const pkg = String.raw`@layer components.neshel {
  .neshel-stack { display: flex; }
  .neshel-gap-0\.5 { gap: 1px; }
}`;

test("consumer case ids exist in the browser cases and are rendered by the app", () => {
  const ids = new Set(LAYOUT_CASES.map((c) => c.id));
  for (const id of CONSUMER_CASE_IDS) assert.ok(ids.has(id), id);
  const tailwind = layoutCasesTsx({ tailwind: true });
  const plain = layoutCasesTsx({ tailwind: false });
  for (const id of CONSUMER_CASE_IDS) {
    assert.ok(plain.includes(`data-case="${id}"`), id);
    assert.ok(tailwind.includes(`data-case="${id}"`), id);
  }
  assert.ok(tailwind.includes('data-case="tailwind-override"'));
  assert.ok(!plain.includes("tailwind-override"));
  assert.match(typeContractTsx, /@ts-expect-error[^\n]*\n.*space="4" spaceX="2"/);
});

test("built consumer CSS must keep every layout selector inside the layer (C5)", () => {
  // Lightning CSS may minify and nest; both forms are accepted.
  assert.deepEqual(
    checkLayoutConsumerCss(
      String.raw`@layer components.neshel{.neshel-stack{display:flex}.neshel-gap-0\.5{gap:1px}}`,
      pkg,
    ),
    [],
  );
  assert.deepEqual(
    checkLayoutConsumerCss(
      String.raw`@layer components{@layer neshel{.neshel-stack{x:y}.neshel-gap-0\.5{x:y}}}`,
      pkg,
    ),
    [],
  );
});

test("negative: missing selectors, lost layer and @source are reported", () => {
  const missing = checkLayoutConsumerCss(
    String.raw`@layer components.neshel{.neshel-stack{display:flex}}`,
    pkg,
  );
  assert.match(missing.join(), /lacks 1 layout selector.*neshel-gap-0\.5/);
  const unlayered = checkLayoutConsumerCss(
    String.raw`.neshel-stack{x:y}.neshel-gap-0\.5{x:y}`,
    pkg,
  );
  assert.match(unlayered.join(), /lost the components\.neshel cascade layer/);
  const source = checkLayoutConsumerCss(`@source "../node_modules";${pkg}`, pkg);
  assert.match(source.join(), /@source/);
});

test("dependency leaks are detected in the pnpm store listing", () => {
  assert.deepEqual(
    leakedPackages([
      "react@19.3.1",
      "tailwind-variants@3.3.1",
      "@radix-ui+react-slot@1.5.0_react@19.3.1",
    ]),
    [],
  );
  assert.deepEqual(
    leakedPackages(["tailwind-merge@3.7.0", "@neshel-ui+core@file+x", "react@19.3.1"]),
    ["tailwind-merge@3.7.0", "@neshel-ui+core@file+x"],
  );
});
