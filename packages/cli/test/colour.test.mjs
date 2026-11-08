import assert from "node:assert/strict";
import test from "node:test";
import {
  contrastRatio,
  isAllowedSyntax,
  normaliseColour,
  parseColour,
} from "../dist/validate/colour.js";

const ok = (value) => {
  const result = parseColour(value);
  assert.equal(result.ok, true, `${value} should parse`);
  return result.colour;
};

test("accepts every documented syntax", () => {
  for (const value of [
    "#fff",
    "#ffff",
    "#193767",
    "#19376780",
    "rgb(25 55 103)",
    "rgb(25, 55, 103)",
    "rgba(25, 55, 103, 0.5)",
    "hsl(217 61% 25%)",
    "hsla(217, 61%, 25%, 1)",
    "oklch(0.74 0.11 80)",
    "  #ABCDEF  ",
  ]) {
    ok(value);
  }
});

test("rejects unsupported syntaxes before parsing", () => {
  for (const value of [
    "navy",
    "transparent",
    "currentColor",
    "var(--x)",
    "color-mix(in srgb, red, blue)",
    "light-dark(#fff, #000)",
    "lab(50% 20 30)",
    "lch(50% 20 30)",
    "oklab(0.5 0.1 0.1)",
    "color(display-p3 1 0 0)",
    "hwb(0 0% 0%)",
    "rgb(from red r g b)",
    "rgb(calc(10) 0 0)",
    "#12",
    "#1234567",
    "",
  ]) {
    assert.equal(isAllowedSyntax(value), false, value);
    assert.deepEqual(parseColour(value), { ok: false, problem: "unsupported-color-syntax" });
  }
});

test("reports malformed allowed syntaxes as invalid-color", () => {
  for (const value of ["rgb(a b c)", "oklch()", "hsl(nope)"]) {
    const result = parseColour(value);
    assert.equal(result.ok, false, value);
    assert.equal(result.problem, "invalid-color", value);
  }
});

test("detects translucency, including alpha none", () => {
  assert.equal(ok("#193767").opaque, true);
  assert.equal(ok("#19376780").opaque, false);
  assert.equal(ok("rgb(0 0 0 / 50%)").opaque, false);
  assert.equal(ok("rgb(0 0 0 / none)").opaque, false);
  assert.equal(ok("rgba(0, 0, 0, 1)").opaque, true);
});

test("flags colours outside the sRGB gamut and maps them for contrast", () => {
  const wide = ok("oklch(0.9 0.4 150)");
  assert.equal(wide.inSrgbGamut, false);
  for (const coord of wide.srgb.coords) assert.ok(coord >= 0 && coord <= 1 + 1e-9);
  assert.equal(ok("oklch(0.5 0.05 250)").inSrgbGamut, true);
});

test("computes WCAG 2.1 ratios", () => {
  const ratio = (a, b) => contrastRatio(ok(a), ok(b));
  assert.equal(ratio("#ffffff", "#000000"), 21);
  assert.equal(ratio("#777777", "#777777"), 1);
  assert.equal(ratio("#000000", "#ffffff"), 21);
  assert.equal(ratio("#0d1b33", "#fbf9f6").toFixed(2), "16.36");
  assert.equal(ratio("rgb(25 55 103)", "#193767"), 1);
});

test("normalises hex to lower case and trims", () => {
  assert.equal(normaliseColour("  #ABCDEF "), "#abcdef");
  assert.equal(normaliseColour(" oklch(0.7 0.1 80) "), "oklch(0.7 0.1 80)");
});
