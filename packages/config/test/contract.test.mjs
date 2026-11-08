// Contract data of @neshel-ui/config, tested against the built package (dist).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { colorRoles, contrastPairs, defaults } from "../dist/index.js";

const expectedRoles = [
  "background",
  "foreground",
  "surface",
  "surfaceForeground",
  "muted",
  "mutedForeground",
  "primary",
  "primaryForeground",
  "secondary",
  "secondaryForeground",
  "accent",
  "accentForeground",
  "destructive",
  "destructiveForeground",
  "success",
  "successForeground",
  "warning",
  "warningForeground",
  "selected",
  "selectedForeground",
  "disabled",
  "disabledForeground",
  "border",
  "input",
  "focus",
];

test("colorRoles lists the 25 roles (contracts/tokens.md + feature 005 status roles) in canonical order", () => {
  assert.deepEqual([...colorRoles], expectedRoles);
  assert.equal(new Set(colorRoles).size, colorRoles.length);
});

test("contrastPairs reference valid, distinct roles with consistent thresholds", () => {
  assert.equal(contrastPairs.length, 21);
  for (const pair of contrastPairs) {
    assert.ok(colorRoles.includes(pair.foreground), pair.foreground);
    assert.ok(colorRoles.includes(pair.background), pair.background);
    assert.notEqual(pair.foreground, pair.background);
    if (pair.minimum === null) assert.equal(pair.criterion, "exempt");
    else assert.equal(pair.criterion, pair.minimum === 4.5 ? "1.4.3" : "1.4.11");
  }
  const checked = new Set(
    contrastPairs.filter((p) => p.minimum !== null).flatMap((p) => [p.foreground, p.background]),
  );
  assert.deepEqual(
    expectedRoles.filter((role) => !checked.has(role)),
    ["disabled", "disabledForeground", "border"],
  );
});

test("defaults define every role for light and dark as opaque lower-case hex", () => {
  for (const theme of ["light", "dark"]) {
    assert.deepEqual(Object.keys(defaults.themes[theme]), expectedRoles);
    for (const value of Object.values(defaults.themes[theme])) {
      assert.match(value, /^#[0-9a-f]{6}$/);
    }
  }
  assert.equal(defaults.radius.base, "0.75rem");
  assert.deepEqual([...defaults.typography.families.body].slice(0, 1), ["Inter"]);
});

test("contract data is deeply frozen", () => {
  assert.ok(Object.isFrozen(colorRoles));
  assert.ok(Object.isFrozen(contrastPairs) && Object.isFrozen(contrastPairs[0]));
  assert.ok(Object.isFrozen(defaults.themes.light));
  assert.ok(Object.isFrozen(defaults.typography.families.mono));
  assert.throws(() => {
    defaults.themes.light.primary = "#000000";
  }, TypeError);
});

test("the browser-safe entry imports only relative modules and no Node built-ins", () => {
  for (const file of ["index.js", "contract.js", "types.js"]) {
    const source = readFileSync(new URL(`../dist/${file}`, import.meta.url), "utf8");
    for (const [, specifier] of source.matchAll(/\bfrom\s+["']([^"']+)["']/g)) {
      assert.match(specifier, /^\.\.?\//, `${file} imports ${specifier}`);
    }
    assert.doesNotMatch(source, /\bnode:|\bprocess\.|\brequire\(/, file);
  }
});

test("defineConfig returns its argument unchanged", async () => {
  const { defineConfig } = await import("../dist/index.js");
  const config = { themes: { sepia: { extends: "light" } } };
  assert.equal(defineConfig(config), config);
  assert.deepEqual(config, { themes: { sepia: { extends: "light" } } });
});
