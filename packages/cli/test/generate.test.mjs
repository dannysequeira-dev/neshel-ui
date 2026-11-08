import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { colorRoles } from "@neshel-ui/config";
import { cssVariable, generateCss, LAYER_STATEMENT } from "../dist/generate/css.js";
import { compareCodePoints, resolveConfig, serialiseFontStack } from "../dist/resolve.js";

const header = "test header";
const fixture = (name) => readFileSync(new URL(`fixtures/${name}`, import.meta.url), "utf8");

/** Split a generated stylesheet into { selectors, declarations } blocks (flat parser). */
function blocks(css) {
  const result = [];
  for (const match of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    result.push({
      selectors: match[1].trim().split(/,\s*/),
      declarations: match[2]
        .split(";")
        .map((d) => d.trim())
        .filter(Boolean),
    });
  }
  return result;
}

test("default tokens.css matches the golden file", () => {
  const css = generateCss(resolveConfig({}), { layer: "defaults", header });
  assert.equal(css, fixture("golden-defaults.css"));
});

test("default tailwind variant matches the golden file", () => {
  const css = generateCss(resolveConfig({}), { layer: "defaults", tailwind: true, header });
  assert.equal(css, fixture("golden-defaults-tailwind.css"));
});

test("every theme block declares color-scheme and all 21 roles", () => {
  const config = resolveConfig({
    themes: { sepia: { extends: "light", colors: { background: "#F4ECD8" } } },
  });
  const css = generateCss(config, { layer: "config", header });
  const themeBlocks = blocks(css).filter((b) => b.declarations[0]?.startsWith("color-scheme"));
  assert.equal(themeBlocks.length, 4); // light, system-dark, dark, sepia
  for (const { declarations } of themeBlocks) {
    assert.deepEqual(
      declarations.slice(1).map((d) => d.split(":")[0]),
      colorRoles.map(cssVariable),
    );
  }
  assert.match(
    css,
    /\[data-neshel-theme="sepia"\] \{\n {4}color-scheme: light;\n {4}--neshel-background: #f4ecd8;/,
  );
});

test("only allowed selectors and at-rules appear", () => {
  const config = resolveConfig({ themes: { "a-b": { extends: "dark" } } });
  const css = generateCss(config, { layer: "config", tailwind: true, header });
  for (const { selectors } of blocks(css)) {
    for (const selector of selectors) {
      assert.match(selector, /^(?::root|\[data-neshel-theme="[a-z][a-z0-9-]*"\]|@theme inline)$/);
    }
  }
  const atRules = [...css.matchAll(/@[a-z-]+/g)].map((m) => m[0]);
  assert.deepEqual([...new Set(atRules)].sort(), ["@layer", "@media", "@theme"]);
  assert.doesNotMatch(css, /url\(|@font-face|@import|(?:^|\s)(?:\*|html|body)\s*[{,]/m);
});

test("output is deterministic, LF-only and newline-terminated", () => {
  const input = { themes: { zeta: { extends: "dark" }, alpha: { extends: "light" } } };
  const a = generateCss(resolveConfig(input), { layer: "config", header });
  const b = generateCss(resolveConfig(structuredClone(input)), { layer: "config", header });
  assert.equal(a, b);
  assert.ok(!a.includes("\r"));
  assert.ok(a.endsWith("}\n") && !a.endsWith("\n\n"));
  assert.ok(a.indexOf('"alpha"') < a.indexOf('"zeta"'));
  assert.equal(a.split("\n")[2], LAYER_STATEMENT);
  assert.match(a, /@layer neshel\.config \{/);
});

test("resolution: overrides, named themes from resolved bases, radius and fonts", () => {
  const resolved = resolveConfig({
    themes: {
      light: { colors: { primary: "#1D3F73" } },
      sepia: { extends: "light", colors: { background: "#f4ecd8" } },
      night: { extends: "dark" },
    },
    radius: { base: "0.5rem", lg: "1rem" },
    spacing: { unit: "4px" },
    typography: {
      families: { body: ["Source Sans 3", "sans-serif"], mono: "Fira Code, monospace" },
    },
    focus: { width: "3px" },
  });
  assert.deepEqual(
    resolved.themes.map((t) => t.name),
    ["light", "dark", "night", "sepia"],
  );
  const sepia = resolved.themes.find((t) => t.name === "sepia");
  assert.equal(sepia.colors.primary, "#1d3f73"); // inherited from the resolved light base
  assert.equal(sepia.colors.background, "#f4ecd8");
  assert.equal(sepia.colorScheme, "light");
  assert.equal(resolved.themes.find((t) => t.name === "night").colorScheme, "dark");
  assert.equal(resolved.radius.base, "0.5rem");
  assert.equal(resolved.radius.lg, "1rem");
  assert.equal(resolved.radius.sm, "calc(var(--neshel-radius-base) * 0.5)");
  assert.equal(resolved.fonts.body, '"Source Sans 3", sans-serif');
  assert.equal(resolved.fonts.mono, "Fira Code, monospace");
  assert.equal(resolved.focus.width, "3px");
  assert.equal(resolved.focus.offset, "2px");
  assert.equal(resolved.spacing.unit, "4px");
});

test("helpers: font quoting and code-point ordering", () => {
  assert.equal(serialiseFontStack(["Inter", "ui-sans-serif"]), "Inter, ui-sans-serif");
  assert.equal(serialiseFontStack(['A "B"']), '"A \\"B\\""');
  assert.equal(serialiseFontStack(["3D Font"]), '"3D Font"');
  assert.deepEqual(["b", "a-b", "a", "ab"].sort(compareCodePoints), ["a", "a-b", "ab", "b"]);
});

test("headers containing a comment terminator are rejected", () => {
  assert.throws(() => generateCss(resolveConfig({}), { layer: "config", header: "x */ y" }));
});
