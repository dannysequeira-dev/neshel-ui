import assert from "node:assert/strict";
import test from "node:test";
import { effectivePolicy, validateConfig } from "../dist/validate/index.js";

const summary = (result) => result.diagnostics.map((d) => `${d.severity}:${d.code}@${d.path}`);
// accentForeground on a mid-gold accent: about 3.1:1, below the 4.5:1 text minimum.
const lowContrast = { themes: { light: { colors: { accentForeground: "#6b5a3c" } } } };

test("valid configuration resolves", () => {
  const result = validateConfig({ themes: { sepia: { extends: "light" } } });
  assert.equal(result.ok, true);
  assert.deepEqual(result.diagnostics, []);
  assert.deepEqual(
    result.config.themes.map((t) => t.name),
    ["light", "dark", "sepia"],
  );
});

test("colour syntax, parsing, alpha and gamut diagnostics", () => {
  const result = validateConfig({
    themes: {
      light: {
        colors: {
          primary: "navy",
          accent: "rgb(a b c)",
          surface: "#ffffff80",
          border: "#00000020",
        },
      },
      dark: { colors: { accent: "oklch(0.9 0.4 150)" } },
    },
  });
  assert.equal(result.ok, false);
  assert.deepEqual(summary(result), [
    "warning:out-of-gamut@themes.dark.colors.accent",
    "error:invalid-color@themes.light.colors.accent",
    "error:unsupported-color-syntax@themes.light.colors.primary",
    "error:alpha-not-allowed@themes.light.colors.surface",
  ]);
  assert.equal(result.config, undefined);
});

test("translucent border is accepted", () => {
  assert.equal(
    validateConfig({ themes: { dark: { colors: { border: "rgb(255 255 255 / 0.1)" } } } }).ok,
    true,
  );
});

test("structural errors skip colour parsing of the same path", () => {
  const result = validateConfig({ themes: { light: { colors: { primary: 3 } } } });
  assert.deepEqual(summary(result), ["error:invalid-type@themes.light.colors.primary"]);
});

test("contrast policy precedence: --strict › config › warn", () => {
  const combos = [
    [lowContrast, false, true, "warning"],
    [{ ...lowContrast, contrast: "warn" }, false, true, "warning"],
    [{ ...lowContrast, contrast: "error" }, false, false, "error"],
    [lowContrast, true, false, "error"],
    [{ ...lowContrast, contrast: "warn" }, true, false, "error"],
  ];
  for (const [config, strict, ok, severity] of combos) {
    const result = validateConfig(config, { strict });
    assert.equal(result.ok, ok, JSON.stringify({ config, strict }));
    const contrast = result.diagnostics.filter((d) => d.code === "contrast");
    assert.equal(contrast.length, 1);
    assert.equal(contrast[0].severity, severity);
    assert.equal(contrast[0].path, "themes.light");
    assert.match(
      contrast[0].message,
      /^accentForeground on accent is \d+\.\d{2}:1; minimum 4\.5:1 \(WCAG 1\.4\.3\)\.$/,
    );
    assert.doesNotMatch(contrast[0].message, /conform/i);
  }
  assert.equal(effectivePolicy({ contrast: "error" }), "error");
  assert.equal(effectivePolicy({ contrast: "warn" }, true), "error");
  assert.equal(effectivePolicy(null), "warn");
});

test("named themes are contrast-checked; unchanged built-ins are not re-reported", () => {
  const result = validateConfig({
    themes: { faded: { extends: "light", colors: { foreground: "#bbbbbb" } } },
  });
  const paths = new Set(result.diagnostics.map((d) => d.path));
  assert.deepEqual([...paths], ["themes.faded"]);
  assert.ok(result.diagnostics.some((d) => d.message.startsWith("foreground on background")));
});

test("exempt pairs never produce contrast diagnostics", () => {
  const result = validateConfig({
    themes: { light: { colors: { disabledForeground: "#ece8e3" } } },
  });
  assert.deepEqual(result.diagnostics, []);
});

test("non-object input fails structurally", () => {
  for (const input of [undefined, null, 1, "x", []]) {
    const result = validateConfig(input);
    assert.equal(result.ok, false);
    assert.equal(result.diagnostics[0].code, "invalid-type");
  }
});
