// Distributed stylesheet and manifest: drift, runtime/stylesheet consistency, hygiene, budget,
// shared breakpoint module (FR-011, FR-035, SC-006).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { gzipSync } from "node:zlib";
import { findDrift, renderPackage } from "../../../scripts/generate-component-css.mjs";
import {
  checkLayoutStylesheet,
  missingFromStylesheet,
  neshelClasses,
  stylesheetClasses,
  unreachableClasses,
} from "../../../scripts/lib/layout-css.mjs";
import { h, markup, typography } from "./helpers.mjs";

const css = readFileSync(new URL("../dist/styles.css", import.meta.url), "utf8");
const source = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
const BREAKPOINTS = ["base", "sm", "md", "lg", "xl", "2xl"];
const VALUES = {
  size: ["xs", "sm", "base", "lg", "xl", "2xl", "3xl", "4xl", "5xl", "6xl"],
  weight: ["light", "regular", "medium", "semibold", "bold"],
  align: ["start", "center", "end", "justify"],
  leading: ["none", "tight", "snug", "normal", "relaxed", "loose"],
};
const STATIC = {
  family: ["body", "display", "mono"],
  tone: ["default", "muted", "primary", "destructive"],
  tracking: ["tight", "normal", "wide"],
  measure: ["narrow", "comfortable", "wide", "none"],
  wrap: ["wrap", "nowrap", "balance", "pretty"],
  truncate: [true],
};

function sweep() {
  const used = [];
  const classOf = (element) =>
    [...markup(element).matchAll(/class="([^"]*)"/g)].map((match) => match[1]);
  for (const [prop, values] of Object.entries(VALUES)) {
    for (const value of values) {
      for (const bp of BREAKPOINTS) {
        used.push(...neshelClasses(classOf(h(typography.Text, { [prop]: { [bp]: value } }))));
      }
    }
  }
  for (const [prop, values] of Object.entries(STATIC)) {
    for (const value of values)
      used.push(...neshelClasses(classOf(h(typography.Text, { [prop]: value }))));
  }
  used.push(...neshelClasses(classOf(h(typography.Paragraph))));
  // Pseudo-element rules are reached through their class.
  return [...new Set(used)];
}

test("committed stylesheet and manifest equal the generator output; dist copies them", async () => {
  assert.deepEqual(
    await findDrift(["typography"]),
    [],
    "run pnpm build:packages && pnpm generate:component-css",
  );
  assert.equal(css, source);
  const manifest = JSON.parse(
    readFileSync(new URL("../dist/style-manifest.json", import.meta.url), "utf8"),
  );
  const { manifest: expected } = await renderPackage("typography");
  assert.deepEqual(manifest, JSON.parse(JSON.stringify(expected)));
  assert.equal(manifest.package, "@neshel-ui/typography");
});

test("every runtime class has a rule and every rule is reachable", () => {
  const used = sweep();
  assert.deepEqual(missingFromStylesheet(used, css), []);
  assert.deepEqual(unreachableClasses(used, css), []);
  assert.equal(stylesheetClasses(css).length, used.length);
  assert.equal(used.length, 1 + 3 + 4 + 3 + 4 + 4 + 1 + 1 + 25 * 6);
});

test("negative control: a removed responsive rule is detected", () => {
  const removed = css.replace(/^\s*\.neshel-md-text-size-lg \{[^}]*\}\n/m, "");
  assert.notEqual(removed, css);
  assert.deepEqual(missingFromStylesheet(sweep(), removed), ["neshel-md-text-size-lg"]);
});

test("hygiene: layered, class selectors (plus trim pseudo-elements and :root), no colours or fonts", () => {
  assert.deepEqual(checkLayoutStylesheet(css), []);
  assert.match(css, /^\/\* @neshel-ui\/typography styles\./);
  assert.match(css, /\.neshel-typography \{ margin: 0;/);
  assert.match(
    css,
    /\.neshel-text-trim::before \{ content: ""; display: table; margin-block-end: calc\(/,
  );
  assert.ok(!/@font-face|url\(/.test(css));
  for (const sample of [
    css.replace(".neshel-text-tone-muted {", "p {"),
    css.replace("var(--neshel-primary)", "#193767"),
  ]) {
    assert.ok(checkLayoutStylesheet(sample).length > 0);
  }
});

test("size budget (SC-006)", () => {
  const raw = Buffer.byteLength(css);
  const gzip = gzipSync(css).byteLength;
  assert.ok(raw <= 24 * 1024, `raw ${raw} > 24 KiB`);
  console.info(`typography styles.css: ${raw} bytes raw, ${gzip} bytes gzip`);
});

test("breakpoint-check.ts is identical in layout and typography (analysis A6)", () => {
  const layoutCopy = readFileSync(
    new URL("../../layout/src/breakpoint-check.ts", import.meta.url),
    "utf8",
  );
  const typographyCopy = readFileSync(
    new URL("../src/breakpoint-check.ts", import.meta.url),
    "utf8",
  );
  assert.equal(typographyCopy, layoutCopy);
});
