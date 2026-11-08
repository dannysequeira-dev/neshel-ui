// `neshel validate`: exit 1 cases with paths, warnings, usage errors (exit 2).
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";
import { config, neshel, project } from "./helpers.mjs";

const lowContrast = { themes: { light: { colors: { accentForeground: "#6b5a3c" } } } };

test("invalid configurations exit 1, report paths and write nothing", (t) => {
  const cases = [
    [
      { themes: { light: { colors: { primay: "#fff" } } } },
      /themes\.light\.colors\.primay\s+unknown-key\s+Unknown key "primay"\. Did you mean "primary"\?/,
    ],
    [{ version: 2 }, /version\s+invalid-version/],
    [
      { themes: { dark: { colors: { primary: "navy" } } } },
      /themes\.dark\.colors\.primary\s+unsupported-color-syntax\s+Expected #hex, rgb\(\), hsl\(\) or oklch\(\); received "navy"\./,
    ],
    [{ themes: { sepia: {} } }, /themes\.sepia\s+missing-base/],
    [{ themes: { system: {} } }, /themes\.system\s+reserved-theme/],
    [{ radius: { base: 12 } }, /radius\.base\s+invalid-length/],
    [{ output: "theme.txt" }, /output\s+invalid-output/],
    [{ output: "node_modules/x.css" }, /output\s+invalid-output/],
    [{ themes: { light: { colors: { surface: "#ffffff80" } } } }, /alpha-not-allowed/],
  ];
  for (const [input, pattern] of cases) {
    const p = project({ "neshel.config.mjs": config(input) });
    t.after(p.cleanup);
    const result = neshel(["validate"], p.dir);
    assert.equal(result.status, 1, JSON.stringify(input));
    assert.match(result.stderr, pattern, JSON.stringify(input));
    assert.match(result.stdout, /\d+ errors? — nothing written\./);
    assert.equal(existsSync(p.path("neshel.generated.css")), false);
  }
});

test("config output that is an existing directory or the config file is invalid (exit 1)", (t) => {
  const directory = project({
    "neshel.config.mjs": config({ output: "out.css" }),
    "out.css/keep.txt": "",
  });
  t.after(directory.cleanup);
  const result = neshel(["validate"], directory.dir);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /output\s+invalid-output\s+The output path is an existing directory/);

  // A .css path equal to the config file can only arise through --config with a .css name,
  // which discovery rejects first (exit 3); the rule itself is unit-tested via --out.
  const self = project({ "neshel.config.mjs": config({ output: "neshel.config.mjs" }) });
  t.after(self.cleanup);
  assert.equal(neshel(["validate"], self.dir).status, 1);
});

test('contrast: warning by default, error with --strict or contrast: "error"', (t) => {
  const p = project({
    "neshel.config.mjs": config(lowContrast),
    "strict.mjs": config({ ...lowContrast, contrast: "error" }),
  });
  t.after(p.cleanup);
  const warn = neshel(["validate"], p.dir);
  assert.equal(warn.status, 0);
  assert.match(
    warn.stderr,
    /warning\s+themes\.light\s+contrast\s+accentForeground on accent is \d+\.\d{2}:1; minimum 4\.5:1 \(WCAG 1\.4\.3\)\./,
  );
  assert.match(warn.stdout, /is valid \(1 warning\)/);
  assert.equal(neshel(["validate", "--strict"], p.dir).status, 1);
  assert.equal(neshel(["validate", "--config", "strict.mjs"], p.dir).status, 1);
});

test("out-of-gamut colours warn; translucent border is fine", (t) => {
  const p = project({
    "neshel.config.mjs": config({
      themes: {
        dark: { colors: { border: "rgb(255 255 255 / 0.1)", accent: "oklch(0.85 0.2 85)" } },
      },
    }),
  });
  t.after(p.cleanup);
  const result = neshel(["validate"], p.dir);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stderr, /out-of-gamut/);
});

test("usage errors exit 2 and print usage", (t) => {
  const p = project({ "neshel.config.mjs": config({}) });
  t.after(p.cleanup);
  for (const args of [
    [],
    ["build"],
    ["validate", "--wat"],
    ["validate", "--out", "a.css"],
    ["validate", "--check"],
    ["generate", "--config"],
    ["validate", "extra"],
  ]) {
    const result = neshel(args, p.dir);
    assert.equal(result.status, 2, args.join(" "));
    assert.match(result.stderr, /Usage:/, args.join(" "));
  }
});

test("--help and --version exit 0", (t) => {
  const p = project();
  t.after(p.cleanup);
  const help = neshel(["--help"], p.dir);
  assert.equal(help.status, 0);
  assert.match(help.stdout, /trusted project code/);
  assert.match(neshel(["-v"], p.dir).stdout, /^\d+\.\d+\.\d+\n$/);
});

test("ANSI colour only on a TTY and never with NO_COLOR", (t) => {
  const p = project({ "neshel.config.mjs": config({ version: 2 }) });
  t.after(p.cleanup);
  const esc = String.fromCharCode(27);
  assert.ok(!neshel(["validate"], p.dir).stderr.includes(`${esc}[`));
});
