// Package contract (contracts/package.md; FR-001–FR-008): manifest, dependency graph, stylesheet.
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

function files(dir, extension) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path, extension);
    return path.endsWith(extension) ? [path] : [];
  });
}

/** Bare (non-relative) import specifiers of an ES module. */
function bareImports(source) {
  const specifiers = new Set();
  for (const [, specifier] of source.matchAll(
    /(?:^|[\s;])(?:import|export)\s[^'"]*?from\s*["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/gm,
  )) {
    if (specifier && !specifier.startsWith(".")) specifiers.add(specifier);
  }
  for (const [, specifier] of source.matchAll(/^\s*import\s*["']([^"']+)["']/gm)) {
    if (!specifier.startsWith(".")) specifiers.add(specifier);
  }
  return [...specifiers];
}

test("publishing guard: private, unversioned, outside the public release set (FR-001)", () => {
  assert.equal(manifest.private, true);
  assert.equal(manifest.version, "0.0.0");
  assert.equal(manifest.publishConfig, undefined, "not an intended public package yet");
  assert.equal(manifest.scripts.prepublishOnly, undefined);
});

test("exports only implemented entry points, types first (FR-002)", () => {
  assert.deepEqual(Object.keys(manifest.exports), [".", "./core", "./hover", "./styles.css"]);
  for (const subpath of [".", "./core", "./hover"]) {
    assert.deepEqual(Object.keys(manifest.exports[subpath]), ["types", "import"]);
  }
  assert.deepEqual(manifest.sideEffects, ["**/*.css"]);
  assert.equal(manifest.type, "module");
});

test("React is a peer; the only runtime dependency is @radix-ui/react-slot; never core (FR-003)", () => {
  assert.deepEqual(manifest.peerDependencies, { react: "^19.0.0" });
  assert.deepEqual(Object.keys(manifest.dependencies), ["@radix-ui/react-slot"]);
  for (const field of ["dependencies", "peerDependencies", "devDependencies"]) {
    assert.equal(manifest[field]?.["@neshel-ui/core"], undefined, field);
    assert.equal(manifest[field]?.["@neshel-ui/components"], undefined, field);
  }
});

test("the core entry is framework-free: its modules import nothing but each other (FR-004)", () => {
  for (const file of files(join(root, "dist", "core"), ".js")) {
    assert.deepEqual(bareImports(readFileSync(file, "utf8")), [], relative(root, file));
  }
});

test("the root entry imports only react and @radix-ui/react-slot (FR-005)", () => {
  const allowed = new Set(["react", "react/jsx-runtime", "@radix-ui/react-slot"]);
  for (const file of files(join(root, "dist"), ".js")) {
    for (const specifier of bareImports(readFileSync(file, "utf8"))) {
      assert.ok(allowed.has(specifier), `${relative(root, file)} imports ${specifier}`);
    }
  }
});

test("React modules carry the 'use client' directive; core modules do not (FR-006)", () => {
  for (const file of files(join(root, "dist"), ".js")) {
    const source = readFileSync(file, "utf8");
    const usesReact = bareImports(source).some((specifier) => specifier.startsWith("react"));
    const directive = /^\s*["']use client["'];/.test(source);
    if (usesReact) assert.ok(directive, `${relative(root, file)} needs "use client"`);
    if (file.includes(join("dist", "core"))) assert.equal(directive, false, relative(root, file));
  }
});

test("no module touches window, document or matchMedia at import time (FR-007)", async () => {
  // Importing in plain Node (no DOM) must not throw; the SSR tests render with these modules.
  await import("../dist/index.js");
  await import("../dist/core/index.js");
  await import("../dist/hover/index.js");
  assert.equal(typeof globalThis.window, "undefined");
});

test("stylesheet: one layer, only .neshel-* selectors, no resets or global rules (FR-008)", () => {
  const css = readFileSync(join(root, "dist", "styles.css"), "utf8");
  assert.equal(css, readFileSync(join(root, "src", "styles.css"), "utf8"), "dist equals source");
  const body = css.replace(/\/\*[\s\S]*?\*\//g, "");
  assert.match(body.trim(), /^@layer components\.neshel \{[\s\S]*\}$/);
  const selectors = [...body.matchAll(/([^{};]+)\{/g)]
    .map((match) => match[1].trim())
    .filter((selector) => !selector.startsWith("@"));
  assert.ok(selectors.length > 0);
  for (const selector of selectors) {
    for (const part of selector.split(",")) {
      assert.match(part.trim(), /^\.neshel-[a-z0-9-]+/, `global selector "${part.trim()}"`);
    }
  }
});

test("module boundaries: core imports only core; root/react never import families (009 FR-051)", () => {
  const relativeTargets = (file) =>
    [...readFileSync(file, "utf8").matchAll(/(?:from|import)\s*["'](\.{1,2}\/[^"']+)["']/g)].map(
      (m) =>
        relative(join(root, "dist"), join(file, "..", m[1]))
          .split("\\")
          .join("/"),
    );
  for (const file of files(join(root, "dist"), ".js")) {
    const where = relative(join(root, "dist"), file).split("\\").join("/");
    for (const target of relativeTargets(file)) {
      if (where.startsWith("core/")) assert.ok(target.startsWith("core/"), `${where} -> ${target}`);
      if (!where.startsWith("hover/"))
        assert.ok(!target.startsWith("hover/"), `${where} -> ${target}`);
    }
  }
});

test("no global motion custom properties are declared by the stylesheet (009 FR-042, ADR 0024)", () => {
  const css = readFileSync(join(root, "dist", "styles.css"), "utf8");
  assert.doesNotMatch(
    css,
    /--neshel-motion-[a-z-]+\s*:/,
    "read with fallbacks only, never declared",
  );
  assert.doesNotMatch(css, /:root|:where\(\s*:root/);
});
