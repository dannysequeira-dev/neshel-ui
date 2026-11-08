// Discovery and loading (exit code 3) and the trusted-code loader, in spaces/Unicode paths.
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { config, neshel, project } from "./helpers.mjs";

function listAll(dir) {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name))
    .sort();
}

test("no configuration: exit 3 listing the searched names", (t) => {
  const p = project();
  t.after(p.cleanup);
  const result = neshel(["validate"], p.dir);
  assert.equal(result.status, 3);
  assert.match(
    result.stderr,
    /No configuration found.*neshel\.config\.ts, neshel\.config\.mts, neshel\.config\.js, neshel\.config\.mjs/,
  );
});

test("two candidates: exit 3 listing both", (t) => {
  const p = project({ "neshel.config.ts": config({}), "neshel.config.mjs": config({}) });
  t.after(p.cleanup);
  const result = neshel(["validate"], p.dir);
  assert.equal(result.status, 3);
  assert.match(result.stderr, /Ambiguous configuration: neshel\.config\.ts, neshel\.config\.mjs/);
});

test("--config: missing file and unsupported extension exit 3", (t) => {
  const p = project({ "theme.cjs": "module.exports = {};" });
  t.after(p.cleanup);
  assert.equal(neshel(["validate", "--config", "nope.ts"], p.dir).status, 3);
  const cjs = neshel(["validate", "--config", "theme.cjs"], p.dir);
  assert.equal(cjs.status, 3);
  assert.match(cjs.stderr, /unsupported extension/);
});

test("TypeScript syntax errors and throwing configs exit 3 with the file name", (t) => {
  const p = project({
    "neshel.config.ts": "export default { themes: { light: { colors: { primary: '#fff' } } ;\n",
    "throws.ts": "throw new Error('boom from config');\nexport default {};\n",
  });
  t.after(p.cleanup);
  const syntax = neshel(["validate"], p.dir);
  assert.equal(syntax.status, 3);
  assert.match(syntax.stderr, /Failed to load neshel\.config\.ts/);
  const thrown = neshel(["validate", "--config", "throws.ts"], p.dir);
  assert.equal(thrown.status, 3);
  assert.match(thrown.stderr, /boom from config/);
  assert.doesNotMatch(thrown.stderr, /\n\s+at /, "no stack trace without --debug");
  assert.match(neshel(["validate", "--config", "throws.ts", "--debug"], p.dir).stderr, /\n\s+at /);
});

test("default export must exist and be a plain object", (t) => {
  const p = project({
    "none.mjs": "export const config = {};\n",
    "fn.mjs": "export default () => ({});\n",
    "promise.mjs": "export default Promise.resolve({});\n",
    "number.mjs": "export default 42;\n",
    "array.mjs": "export default [];\n",
  });
  t.after(p.cleanup);
  const expectations = {
    "none.mjs": /no default export/,
    "fn.mjs": /a function/,
    "promise.mjs": /a promise/,
    "number.mjs": /a number/,
    "array.mjs": /an array/,
  };
  for (const [file, message] of Object.entries(expectations)) {
    const result = neshel(["validate", "--config", file], p.dir);
    assert.equal(result.status, 3, file);
    assert.match(result.stderr, message, file);
  }
});

test("loads TypeScript with non-erasable syntax and imports defineConfig; writes no cache files", (t) => {
  const p = project(
    {
      "neshel.config.ts": `import { defineConfig } from "@neshel-ui/config";
enum Base { Light = "light" }
const accent: string = "#c49a59";
export default defineConfig({ themes: { sepia: { extends: Base.Light as "light", colors: { accent } } } });
`,
    },
    { linkConfig: true },
  );
  t.after(p.cleanup);
  const before = listAll(p.dir).filter((path) => !path.includes("node_modules"));
  const result = neshel(["validate"], p.dir);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /neshel\.config\.ts is valid/);
  const after = listAll(p.dir).filter((path) => !path.includes("node_modules"));
  assert.deepEqual(after, before, "loading must not write cache or output files");
});

test("each supported extension loads", (t) => {
  for (const name of [
    "neshel.config.ts",
    "neshel.config.mts",
    "neshel.config.js",
    "neshel.config.mjs",
  ]) {
    const p = project({ [name]: config({ contrast: "warn" }) });
    t.after(p.cleanup);
    const result = neshel(["validate"], p.dir);
    assert.equal(result.status, 0, `${name}: ${result.stderr}`);
  }
});
