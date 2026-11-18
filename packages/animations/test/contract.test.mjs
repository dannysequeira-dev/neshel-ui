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
  assert.deepEqual(Object.keys(manifest.exports), [
    ".",
    "./core",
    "./entrance",
    "./hover",
    "./press",
    "./scroll",
    "./gestures",
    "./layout",
    "./cinematic",
    "./styles.css",
    "./hover.css",
    "./press.css",
    "./scroll.css",
    "./gestures.css",
    "./layout.css",
  ]);
  for (const subpath of [
    ".",
    "./core",
    "./entrance",
    "./hover",
    "./press",
    "./scroll",
    "./gestures",
    "./layout",
    "./cinematic",
  ]) {
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
  await import("../dist/entrance/index.js");
  await import("../dist/hover/index.js");
  await import("../dist/press/index.js");
  await import("../dist/scroll/index.js");
  assert.equal(typeof globalThis.window, "undefined");
});

/** Selectors allowed in package stylesheets: package classes and engine tokens only (010 FR-040). */
const SCOPED =
  /^(?::where\()?(?:\.neshel-[a-z0-9-]+|\[data-neshel-fx(?:-active|-reduced)?~="[a-z0-9-]+"\])/;

for (const name of ["styles.css", "hover.css", "press.css", "scroll.css"]) {
  test(`stylesheet ${name}: one layer, scoped selectors, no resets or global rules (FR-008, 010 FR-040)`, () => {
    const css = readFileSync(join(root, "dist", name), "utf8").replace(/\r\n/g, "\n");
    const body = css.replace(/\/\*[\s\S]*?\*\//g, "");
    // Top-level at-rules: the shared layer, and namespaced @property registrations only.
    for (const line of body.match(/^@[^\n]*/gm) ?? []) {
      assert.match(
        line,
        /^(?:@layer components\.neshel \{|@property --neshel-[a-z0-9-]+ \{)$/,
        line,
      );
    }
    const selectors = [...body.matchAll(/([^{};]+)\{/g)]
      .map((match) => match[1].trim())
      .filter((selector) => !selector.startsWith("@") && !/^(?:from|to|\d+%)$/.test(selector));
    assert.ok(selectors.length > 0);
    for (const selector of selectors) {
      for (const part of selector.split(/,(?![^(]*\))/)) {
        assert.match(part.trim(), SCOPED, `unscoped selector "${part.trim()}" in ${name}`);
      }
    }
    for (const at of body.match(/@keyframes [^{]+/g) ?? []) {
      assert.match(at, /^@keyframes neshel-[a-z0-9-]+\s*$/, at);
    }
  });
}

test("styles.css is the header plus hover.css, press.css and scroll.css, in order (010 FR-041, 011 FR-041)", () => {
  const read = (...path) =>
    readFileSync(join(root, ...path), "utf8")
      .replace(/\r\n/g, "\n")
      .trimEnd();
  const parts = [
    read("src", "styles.css"),
    read("src", "hover", "hover.css"),
    read("src", "press", "press.css"),
    read("src", "scroll", "scroll.css"),
  ];
  assert.equal(read("dist", "styles.css"), parts.join("\n\n"));
  assert.equal(read("dist", "hover.css"), parts[1]);
  assert.equal(read("dist", "press.css"), parts[2]);
  assert.equal(read("dist", "scroll.css"), parts[3]);
});

test("no CSS transition or animation targets a consumer element (010 FR-042, ADR 0025)", () => {
  // Declarations of transition/animation may only appear in rules whose subject is package-owned:
  // a pseudo-element layer, a package class, or a child of a package component.
  // Phase 012: the opt-in gestures.css and layout.css follow the same rule; a package class may carry
  // attribute qualifiers (`.neshel-tab-indicator[data-ready]`).
  const css = ["styles.css", "gestures.css", "layout.css"]
    .map((file) => readFileSync(join(root, "dist", file), "utf8"))
    .join(String.fromCharCode(10))
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/@keyframes[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, "");
  for (const [, selector, declarations] of css.matchAll(/([^{};]+)\{([^{}]*)\}/g)) {
    if (!/(?:^|;|\s)(?:transition|animation)(?:-[a-z-]+)?\s*:/.test(declarations)) continue;
    for (const part of selector.trim().split(/,(?![^(]*\))/)) {
      const subject = part.trim();
      assert.ok(
        /::(?:before|after)$/.test(subject) ||
          /^\.neshel-[a-z-]+(?:\[[^\]]+\])*(?::has\(.*\))?$/.test(subject) ||
          />\s*(?:\[data-slot\]|\.neshel-[a-z-]+)$/.test(subject),
        `transition/animation on a possibly consumer-owned subject: "${subject}"`,
      );
    }
  }
});

test("module boundaries: core imports only core; root/react/families never import other families (009 FR-051, 010 FR-050)", () => {
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
      for (const family of ["entrance", "hover", "press", "scroll", "gestures", "layout"]) {
        if (!where.startsWith(`${family}/`))
          assert.ok(!target.startsWith(`${family}/`), `${where} -> ${target}`);
      }
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

test("no package stylesheet declares a scroll timeline; pinning is CSS sticky (011 FR-041, ADR 0026)", () => {
  const css = readFileSync(join(root, "dist", "styles.css"), "utf8").replace(
    /\/\*[\s\S]*?\*\//g,
    "",
  );
  assert.doesNotMatch(css, /(?:scroll|view)-timeline|timeline-scope|animation-range/);
  const scroll = readFileSync(join(root, "dist", "scroll.css"), "utf8");
  assert.match(scroll, /\.neshel-scene-stage \{[^}]*position: sticky/);
  assert.match(scroll, /\.neshel-stack-item \{[^}]*position: sticky/);
});
