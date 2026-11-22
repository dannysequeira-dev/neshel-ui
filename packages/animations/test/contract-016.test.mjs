// Phase 016 package contract (contracts/entry-points-016.md): `./advanced` and `./gpu` are SSR-safe at import, the CSS
// entries never import the GPU layer or carry shader code, and both stylesheets use package-scoped selectors only.
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));

function files(dir, extension) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path, extension);
    return path.endsWith(extension) ? [path] : [];
  });
}

test("./advanced and ./gpu import in plain Node without touching window, document or WebGL", async () => {
  const advanced = await import("../dist/advanced/index.js");
  const gpu = await import("../dist/gpu/index.js");
  assert.equal(typeof globalThis.window, "undefined");
  assert.equal(typeof globalThis.document, "undefined");
  assert.equal(typeof advanced.createCardFlip, "function");
  assert.ok(gpu, "gpu entry loads");
});

test("./advanced never imports the GPU layer and ships no shader code (ADR 0031 §5)", () => {
  const advancedFiles = files(join(root, "dist", "advanced"), ".js");
  assert.ok(advancedFiles.length >= 9);
  for (const file of advancedFiles) {
    const source = readFileSync(file, "utf8");
    const name = relative(root, file);
    assert.doesNotMatch(source, /from\s*["'][^"']*\/gpu\//, `${name} imports the GPU layer`);
    assert.doesNotMatch(source, /webgl|createShader|#version 300 es|gl_Position/i, name);
  }
});

const SCOPED = /^(?::where\()?(?:\.neshel-[a-z0-9-]+|\[data-neshel-[a-z-]+(?:~?="[a-z0-9-]+")?\])/;

for (const name of ["advanced.css", "gpu.css"]) {
  test(`stylesheet ${name}: package-scoped selectors, namespaced keyframes, no resets`, () => {
    const body = readFileSync(join(root, "dist", name), "utf8")
      .replace(/\r\n/g, "\n")
      .replace(/\/\*[\s\S]*?\*\//g, "");
    for (const at of body.match(/@keyframes [^{]+/g) ?? []) {
      assert.match(at, /^@keyframes neshel-[a-z0-9-]+\s*$/, at);
    }
    for (const line of body.match(/^@[^\n]*/gm) ?? []) {
      assert.match(line, /^@(?:media \([a-z-]+: [a-z-]+\)|keyframes neshel-[a-z0-9-]+) \{$/, line);
    }
    const selectors = [...body.matchAll(/([^{};]+)\{/g)]
      .map((match) => match[1].trim())
      .filter((selector) => !selector.startsWith("@") && !/^(?:from|to|\d+%)$/.test(selector));
    for (const selector of selectors) {
      for (const part of selector.split(/,(?![^(]*\))/)) {
        assert.match(part.trim(), SCOPED, `unscoped selector "${part.trim()}" in ${name}`);
      }
    }
  });
}
