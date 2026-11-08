// `neshel generate` with breakpoints: component CSS from manifests, declarations, --types,
// multi-output --check, stale declaration removal, manifest errors (FR-010, FR-020–FR-023).
import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync, utimesSync, writeFileSync } from "node:fs";
import test from "node:test";
import { config, neshel, project } from "./helpers.mjs";

const manifest = (name, overrides = {}) => ({
  schema: 1,
  package: name,
  version: "9.9.9",
  layer: "components.neshel",
  rules: [{ selector: ".neshel-demo", declarations: [["display", "flex"]] }],
  responsive: [{ class: "gap-4", declarations: [["gap", "1rem"]] }],
  ...overrides,
});

/** Files of a fake installed component package exporting its manifest. */
function fakePackage(name, { manifest: content = manifest(name), exportManifest = true } = {}) {
  const base = `node_modules/${name}`;
  return {
    [`${base}/package.json`]: JSON.stringify({
      name,
      version: "9.9.9",
      type: "module",
      exports: exportManifest
        ? { "./style-manifest.json": "./style-manifest.json" }
        : { ".": "./index.js" },
    }),
    [`${base}/style-manifest.json`]: JSON.stringify(content),
    [`${base}/index.js`]: "export {};\n",
  };
}

const REPLACE = { breakpoints: { mode: "replace", values: { tablet: "48rem", phone: "30rem" } } };

test("writes component CSS for installed packages and the declarations", (t) => {
  const p = project({
    "neshel.config.mjs": config(REPLACE),
    ...fakePackage("@neshel-ui/layout"),
    ...fakePackage("@neshel-ui/typography"),
  });
  t.after(p.cleanup);
  const result = neshel(["generate"], p.dir);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(
    result.stdout,
    "neshel: wrote neshel.generated.css (2 themes, 2 breakpoints, layout + typography, 1 warning).\nneshel: wrote neshel.generated.d.ts.\n",
  );
  const css = readFileSync(p.path("neshel.generated.css"), "utf8");
  const layout = css.indexOf(
    "/* @neshel-ui/layout 9.9.9 component styles (breakpoints: phone tablet) */",
  );
  const typography = css.indexOf("/* @neshel-ui/typography 9.9.9 component styles");
  assert.ok(layout > 0 && typography > layout, "layout before typography");
  assert.match(css, /@media \(min-width: 30rem\) \{\n {4}\.neshel-phone-gap-4 \{ gap: 1rem; \}/);
  const types = readFileSync(p.path("neshel.generated.d.ts"), "utf8");
  assert.match(types, /readonly names: "phone" \| "tablet";/);

  // Idempotent: nothing rewritten.
  const past = new Date("2020-01-01T00:00:00Z");
  utimesSync(p.path("neshel.generated.css"), past, past);
  utimesSync(p.path("neshel.generated.d.ts"), past, past);
  const again = neshel(["generate"], p.dir);
  assert.match(
    again.stdout,
    /unchanged neshel\.generated\.css.*\nneshel: unchanged neshel\.generated\.d\.ts\.\n$/,
  );
  assert.equal(statSync(p.path("neshel.generated.d.ts")).mtimeMs, past.getTime());
  assert.equal(neshel(["generate", "--check"], p.dir).status, 0);
});

test("--check reports every stale or missing output and writes nothing", (t) => {
  const p = project({ "neshel.config.mjs": config(REPLACE), ...fakePackage("@neshel-ui/layout") });
  t.after(p.cleanup);
  const missing = neshel(["generate", "--check"], p.dir);
  assert.equal(missing.status, 4);
  assert.match(missing.stdout, /neshel\.generated\.css is missing/);
  assert.match(missing.stdout, /neshel\.generated\.d\.ts is missing/);
  assert.equal(existsSync(p.path("neshel.generated.css")), false);

  assert.equal(neshel(["generate"], p.dir).status, 0);
  writeFileSync(
    p.path("neshel.config.mjs"),
    config({ breakpoints: { mode: "replace", values: { tablet: "50rem", phone: "30rem" } } }),
  );
  const stale = neshel(["generate", "--check"], p.dir);
  assert.equal(stale.status, 4);
  assert.match(stale.stdout, /neshel\.generated\.css is out of date/);
  assert.doesNotMatch(stale.stdout, /d\.ts/, "declarations unchanged (same names)");

  writeFileSync(
    p.path("neshel.config.mjs"),
    config({ breakpoints: { mode: "replace", values: { tablet: "50rem", wide: "90rem" } } }),
  );
  const both = neshel(["generate", "--check"], p.dir);
  assert.match(both.stdout, /neshel\.generated\.d\.ts is out of date/);
});

test("removing breakpoints removes the generated declarations, never a foreign file", (t) => {
  const p = project({ "neshel.config.mjs": config(REPLACE), ...fakePackage("@neshel-ui/layout") });
  t.after(p.cleanup);
  assert.equal(neshel(["generate"], p.dir).status, 0);
  writeFileSync(p.path("neshel.config.mjs"), config({}));
  const check = neshel(["generate", "--check"], p.dir);
  assert.equal(check.status, 4);
  assert.match(check.stdout, /neshel\.generated\.d\.ts is out of date/);
  const result = neshel(["generate"], p.dir);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /removed neshel\.generated\.d\.ts \(no breakpoints configured\)/);
  assert.equal(existsSync(p.path("neshel.generated.d.ts")), false);
  assert.ok(!readFileSync(p.path("neshel.generated.css"), "utf8").includes("components.neshel"));

  writeFileSync(p.path("neshel.generated.d.ts"), "// hand-written\nexport {};\n");
  assert.equal(neshel(["generate"], p.dir).status, 0);
  assert.equal(neshel(["generate", "--check"], p.dir).status, 0);
  assert.equal(
    readFileSync(p.path("neshel.generated.d.ts"), "utf8"),
    "// hand-written\nexport {};\n",
  );
});

test("--types and config types choose the declarations path", (t) => {
  const p = project({
    "neshel.config.mjs": config({ ...REPLACE, types: "./types/neshel.d.ts" }),
    ...fakePackage("@neshel-ui/layout"),
  });
  t.after(p.cleanup);
  assert.equal(neshel(["generate"], p.dir).status, 0);
  assert.ok(existsSync(p.path("types/neshel.d.ts")));
  const flag = neshel(["generate", "--types", "src/env ñ/neshel.d.ts"], p.dir);
  assert.equal(flag.status, 0, flag.stderr);
  assert.ok(existsSync(p.path("src/env ñ/neshel.d.ts")));
  const bad = neshel(["generate", "--types", "neshel.ts"], p.dir);
  assert.equal(bad.status, 2);
  assert.match(bad.stderr, /must end in \.d\.ts/);
  assert.equal(neshel(["validate", "--types", "x.d.ts"], p.dir).status, 2);
  const invalid = project({ "neshel.config.mjs": config({ ...REPLACE, types: "types.ts" }) });
  t.after(invalid.cleanup);
  const result = neshel(["validate"], invalid.dir);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /invalid-types-output/);
});

test("no component package: warning, declarations and Tailwind theme still generated", (t) => {
  const p = project({
    "neshel.config.mjs": config({
      breakpoints: { values: { phone: "30rem" }, tailwind: true },
    }),
  });
  t.after(p.cleanup);
  const result = neshel(["generate"], p.dir);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stderr, /no-component-packages/);
  const css = readFileSync(p.path("neshel.generated.css"), "utf8");
  assert.ok(css.endsWith("@theme {\n  --breakpoint-phone: 30rem;\n}\n"));
  assert.ok(existsSync(p.path("neshel.generated.d.ts")));
});

test("installed packages without or with an incompatible manifest fail with exit 5", (t) => {
  const old = project({
    "neshel.config.mjs": config(REPLACE),
    ...fakePackage("@neshel-ui/layout", { exportManifest: false }),
  });
  t.after(old.cleanup);
  const result = neshel(["generate"], old.dir);
  assert.equal(result.status, 5);
  assert.match(result.stderr, /exports no style manifest/);
  assert.equal(existsSync(old.path("neshel.generated.css")), false, "nothing written");

  const future = project({
    "neshel.config.mjs": config(REPLACE),
    ...fakePackage("@neshel-ui/typography", {
      manifest: manifest("@neshel-ui/typography", { schema: 2 }),
    }),
  });
  t.after(future.cleanup);
  const incompatible = neshel(["generate"], future.dir);
  assert.equal(incompatible.status, 5);
  assert.match(incompatible.stderr, /incompatible-manifest: @neshel-ui\/typography/);
});

test("invalid breakpoints exit 1 with diagnostics and write nothing", (t) => {
  const p = project({
    "neshel.config.mjs": config({
      breakpoints: { values: { md: "30rem", "phone-xl": "40rem", tablet: "768px" } },
    }),
  });
  t.after(p.cleanup);
  const result = neshel(["generate"], p.dir);
  assert.equal(result.status, 1);
  for (const code of [
    "breakpoint-redefined",
    "invalid-breakpoint-name",
    "invalid-breakpoint-width",
  ]) {
    assert.match(result.stderr, new RegExp(code));
  }
  assert.equal(existsSync(p.path("neshel.generated.css")), false);
  assert.equal(existsSync(p.path("neshel.generated.d.ts")), false);
});
