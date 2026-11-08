import assert from "node:assert/strict";
import test from "node:test";
import {
  checkConsumerCss,
  checkLayerStatement,
  checkPlainCss,
  declaredTokens,
  layerOrder,
  themeSelectors,
} from "../scripts/lib/consumer-checks.mjs";

const packageCss = `
:root, [data-neshel-theme="light"] { --neshel-primary: #6d28d9; --neshel-background: #ffffff; }
[data-neshel-theme="dark"] { --neshel-primary: #c4a6ff; }
@theme inline { --color-neshel-primary: var(--neshel-primary); }
`;
const expected = {
  neshelUtilities: [{ className: "bg-neshel-primary", variable: "--neshel-primary" }],
  coreUtilities: ["p-10"],
};
const goodOutput =
  ":root,[data-neshel-theme=light]{--neshel-primary:#6d28d9;--neshel-background:#fff}" +
  "[data-neshel-theme=dark]{--neshel-primary:#c4a6ff}" +
  ".bg-neshel-primary{background-color:var(--neshel-primary)}.p-10{padding:calc(var(--spacing) * 10)}";

test("derives declared tokens and theme selectors from the package stylesheet", () => {
  assert.deepEqual(declaredTokens(packageCss), ["--neshel-background", "--neshel-primary"]);
  assert.deepEqual(themeSelectors(packageCss), ["dark", "light"]);
});

test("accepts minified output that consumed the package and ran Tailwind", () => {
  assert.deepEqual(checkConsumerCss(goodOutput, packageCss, expected), []);
});

test("fails when the package stylesheet was not consumed", () => {
  const errors = checkConsumerCss(
    ".bg-neshel-primary{background-color:var(--neshel-primary)}.p-10{padding:0}",
    packageCss,
    expected,
  );
  assert.match(errors.join("\n"), /missing the --neshel-primary declaration/);
  assert.match(errors.join("\n"), /\[data-neshel-theme=dark\]/);
});

test("fails when Tailwind did not generate the expected utilities", () => {
  const errors = checkConsumerCss(
    goodOutput.replace(/\.bg-neshel-primary\{[^}]*\}/, "").replace(/\.p-10\{[^}]*\}/, ""),
    packageCss,
    expected,
  );
  assert.equal(errors.length, 2);
});

test("fails on unprocessed @theme or unresolved @import", () => {
  const errors = checkConsumerCss(
    `${goodOutput}@theme inline{--x:1}@import "@neshel-ui/config/styles.css";`,
    packageCss,
    expected,
  );
  assert.equal(errors.length, 2);
});

test("fails when the package stylesheet declares no tokens", () => {
  assert.match(checkConsumerCss(goodOutput, ":root{}", expected)[0], /declares no --neshel-\*/);
});

test("layerOrder follows first appearance across statements and blocks", () => {
  assert.deepEqual(
    layerOrder("@layer theme,base;@layer neshel.defaults{a{}}@layer neshel.config;@layer base{}"),
    ["theme", "base", "neshel.defaults", "neshel.config"],
  );
});

test("checkLayerStatement accepts equivalent rewrites and rejects reordering or loss", () => {
  assert.deepEqual(
    checkLayerStatement("@layer neshel.defaults,neshel.config;@layer neshel.defaults{}"),
    [],
  );
  assert.deepEqual(checkLayerStatement("@layer neshel.defaults{:root{}}@layer neshel.config;"), []);
  assert.match(checkLayerStatement("@layer neshel.config{}@layer neshel.defaults{}")[0], /before/);
  assert.match(checkLayerStatement("@layer neshel.defaults{}")[0], /both/);
});

test("checkPlainCss requires tokens, selectors, system media and no Tailwind directives", () => {
  const tokens =
    "@layer neshel.defaults, neshel.config;@layer neshel.defaults{:root{--neshel-primary:#193767}" +
    '@media (prefers-color-scheme: dark){[data-neshel-theme="system"]{--neshel-primary:#9fb8e6}}' +
    '[data-neshel-theme="dark"]{--neshel-primary:#9fb8e6}}';
  const built =
    "@layer neshel.defaults{:root{--neshel-primary:#193767}@media (prefers-color-scheme:dark)" +
    "{[data-neshel-theme=system]{--neshel-primary:#9fb8e6}}[data-neshel-theme=dark]{--neshel-primary:#9fb8e6}}" +
    "@layer neshel.config;";
  assert.deepEqual(checkPlainCss(built, tokens), []);
  const errors = checkPlainCss("@theme inline{}", tokens).join("\n");
  assert.match(errors, /missing the --neshel-primary/);
  assert.match(errors, /Tailwind directive/);
  assert.match(errors, /prefers-color-scheme/);
});
