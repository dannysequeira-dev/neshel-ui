// Capsize equivalence (FR-040, SC-004), metric constants, fallbacks and validation (FR-041–FR-044).
import assert from "node:assert/strict";
import test from "node:test";
import { createStyleObject } from "@capsizecss/core";
import arial from "@capsizecss/metrics/arial";
import georgia from "@capsizecss/metrics/georgia";
import inter from "@capsizecss/metrics/inter";
import robotoMono from "@capsizecss/metrics/robotoMono";
import timesNewRoman from "@capsizecss/metrics/timesNewRoman";
import { defaults } from "../../config/dist/index.js";
import {
  fontConstants,
  formatNumber,
  REFERENCE_CAP_HEIGHT,
  resolveFont,
  validateFallbacks,
  validateMetrics,
} from "../dist/fonts.js";
import { generateCss } from "../dist/generate/css.js";
import { resolveConfig } from "../dist/resolve.js";
import { validateStructure } from "../dist/validate/structure.js";

// Mirrors contracts/typography-css.md §2: size tokens and leadings.
const SIZES = [0.75, 0.875, 1, 1.125, 1.25, 1.5, 1.875, 2.25, 3, 3.75];
const LEADINGS = [1, 1.1, 1.2, 1.25, 1.3, 1.375, 1.4, 1.5, 1.625, 2];
const em = (value) => Number.parseFloat(value);

test("CSS-variable trims equal @capsizecss/core for several fonts, sizes and leadings", () => {
  let compared = 0;
  for (const metrics of [inter, arial, georgia, robotoMono, timesNewRoman]) {
    const c = fontConstants(metrics);
    for (const rem of SIZES) {
      const fontSize = rem * 16 * c.scale;
      for (const leading of LEADINGS) {
        const capsize = createStyleObject({
          fontSize,
          leading: fontSize * leading,
          fontMetrics: metrics,
        });
        // What the stylesheet computes: (constant + L / 2) * -1em
        const before = -(c.capTrim + leading / 2);
        const after = -(c.baselineTrim + leading / 2);
        assert.ok(
          Math.abs(before - em(capsize["::before"].marginBottom)) <= 1e-4,
          `${metrics.familyName} ${rem}rem L${leading} before ${before} vs ${capsize["::before"].marginBottom}`,
        );
        assert.ok(
          Math.abs(after - em(capsize["::after"].marginTop)) <= 1e-4,
          `${metrics.familyName} ${rem}rem L${leading} after ${after} vs ${capsize["::after"].marginTop}`,
        );
        assert.ok(Math.abs(Number.parseFloat(capsize.lineHeight) - fontSize * leading) <= 1e-3);
        compared += 2;
      }
    }
  }
  assert.equal(compared, 5 * SIZES.length * LEADINGS.length * 2);
});

test("cap-height normalisation renders every font at the reference cap height", () => {
  for (const metrics of [inter, arial, georgia, robotoMono]) {
    const { scale } = fontConstants(metrics);
    const capHeight = (metrics.capHeight / metrics.unitsPerEm) * scale;
    assert.ok(Math.abs(capHeight - REFERENCE_CAP_HEIGHT) < 1e-5, metrics.familyName);
  }
  assert.equal(fontConstants(inter).scale, 1);
  assert.deepEqual(fontConstants(undefined), { scale: 1, capTrim: 0, baselineTrim: 0, trim: 0 });
});

test("default body/display metrics equal @capsizecss/metrics Inter (R13)", () => {
  for (const role of ["body", "display"]) {
    const value = defaults.typography.metrics[role];
    for (const key of [
      "capHeight",
      "ascent",
      "descent",
      "lineGap",
      "unitsPerEm",
      "xHeight",
      "xWidthAvg",
      "familyName",
    ]) {
      assert.equal(value[key], inter[key], `${role}.${key}`);
    }
  }
  assert.equal(defaults.typography.metrics.mono, undefined);
});

test("metric tokens in the generated stylesheet", () => {
  const css = generateCss(
    resolveConfig({
      typography: { families: { display: ["Georgia", "serif"] }, metrics: { display: georgia } },
    }),
    { layer: "config", header: "t" },
  );
  const c = fontConstants(georgia);
  assert.match(
    css,
    new RegExp(`--neshel-font-display-scale: ${formatNumber(c.scale).replace(".", "\\.")};`),
  );
  assert.match(css, /--neshel-font-display-trim: 1;/);
  assert.match(css, /--neshel-font-body-cap-trim: -0\.36377;/);
  assert.match(css, /--neshel-font-mono-trim: 0;/);
});

test("a custom family without metrics is untrimmed and warns", () => {
  const resolved = resolveConfig({ typography: { families: { body: ["Lobster", "cursive"] } } });
  assert.equal(resolved.typography.body.constants.trim, 0);
  const warnings = validateStructure({ typography: { families: { body: "Lobster" } } });
  assert.deepEqual(
    warnings.map((d) => `${d.severity}:${d.code}@${d.path}`),
    ["warning:missing-metrics@typography.metrics.body"],
  );
});

test("fallbacks produce Capsize @font-face rules and an adjusted stack", () => {
  const font = resolveFont("body", '"Inter", system-ui, sans-serif', inter, [arial]);
  assert.equal(font.stack, '"Inter", "Inter Fallback", system-ui, sans-serif');
  assert.match(
    font.fontFaces,
    /^@font-face \{\n {2}font-family: "Inter Fallback";\n {2}src: local\('Arial'\), local\('ArialMT'\);/,
  );
  assert.match(font.fontFaces, /size-adjust: [\d.]+%;/);
  assert.match(font.fontFaces, /ascent-override: [\d.]+%;/);
  const two = resolveFont("body", "Inter, sans-serif", inter, [arial, timesNewRoman]);
  assert.equal(
    two.stack,
    'Inter, "Inter Fallback: Arial", "Inter Fallback: Times New Roman", sans-serif',
  );
  const css = generateCss(
    resolveConfig({ typography: { metrics: { body: inter }, fallbacks: { body: [arial] } } }),
    { layer: "config", header: "t" },
  );
  assert.match(
    css,
    /--neshel-font-body: Inter, "Inter Fallback", ui-sans-serif, system-ui, sans-serif;/,
  );
  assert.match(css, /\}\n\n@font-face \{\n {2}font-family: "Inter Fallback";/);
});

test("metric and fallback validation", () => {
  const codes = (list) => list.map((d) => `${d.code}@${d.path}`);
  assert.deepEqual(validateMetrics(inter, "m"), []);
  assert.deepEqual(codes(validateMetrics({ ...inter, capHeight: 0 }, "m")), [
    "invalid-metrics@m.capHeight",
  ]);
  assert.deepEqual(codes(validateMetrics({ ...inter, unitsPerEm: -1 }, "m")), [
    "invalid-metrics@m.unitsPerEm",
  ]);
  assert.deepEqual(codes(validateMetrics({ ...inter, familyName: 'A"B' }, "m")), [
    "invalid-metrics@m.familyName",
  ]);
  assert.deepEqual(codes(validateMetrics({ ...inter, weight: 400 }, "m")), [
    "unknown-key@m.weight",
  ]);
  assert.deepEqual(codes(validateMetrics(5, "m")), ["invalid-type@m"]);
  assert.deepEqual(validateFallbacks([arial], "f", inter), []);
  assert.deepEqual(codes(validateFallbacks(arial, "f", inter)), ["invalid-fallbacks@f"]);
  const { xWidthAvg: _a, ...noWidth } = arial;
  assert.deepEqual(codes(validateFallbacks([noWidth], "f", inter)), ["invalid-fallbacks@f.0"]);
  const { xWidthAvg: _b, ...primaryNoWidth } = inter;
  assert.deepEqual(codes(validateFallbacks([arial], "f", primaryNoWidth)), ["invalid-fallbacks@f"]);
  assert.deepEqual(codes(validateFallbacks([arial], "f", undefined)), ["invalid-fallbacks@f"]);
});
