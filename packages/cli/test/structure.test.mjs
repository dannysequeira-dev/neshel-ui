import assert from "node:assert/strict";
import test from "node:test";
import {
  describeValue,
  editDistance,
  formatDiagnostics,
  sortDiagnostics,
  suggest,
} from "../dist/diagnostics.js";
import { outputProblem, validateStructure } from "../dist/validate/structure.js";

const codes = (input) => validateStructure(input).map((d) => `${d.code}@${d.path}`);

test("a complete valid configuration produces no structural diagnostics", () => {
  assert.deepEqual(
    validateStructure({
      version: 1,
      themes: {
        light: { colors: { primary: "#1d3f73" } },
        dark: {},
        "sepia-2": { extends: "light", colors: { background: "#f4ecd8" } },
      },
      radius: { base: "0.5rem", sm: "0", lg: ".75em", xl: "16px" },
      spacing: { unit: "4px" },
      typography: { families: { body: ["Source Sans 3", "sans-serif"], mono: "Fira Code" } },
      focus: { width: "3px", offset: "0" },
      contrast: "error",
      output: "src/neshel.generated.css",
      breakpoints: {
        mode: "replace",
        values: { phone: "30rem", phoneXL: "40rem" },
        tailwind: true,
      },
      types: "src/neshel.generated.d.ts",
    }).filter((d) => d.severity === "error"),
    [],
  );
});

test("one diagnostic per rule family", () => {
  const cases = [
    [null, "invalid-type@"],
    [[], "invalid-type@"],
    [{ colours: {} }, "unknown-key@colours"],
    [{ version: 2 }, "invalid-version@version"],
    [{ themes: [] }, "invalid-type@themes"],
    [{ themes: { system: {} } }, "reserved-theme@themes.system"],
    [{ themes: { Sepia: { extends: "light" } } }, "invalid-theme-name@themes.Sepia"],
    [
      { themes: { ["a".repeat(33)]: { extends: "light" } } },
      `invalid-theme-name@themes.${"a".repeat(33)}`,
    ],
    [{ themes: { sepia: {} } }, "missing-base@themes.sepia"],
    [{ themes: { sepia: { extends: "ocean" } } }, "invalid-base@themes.sepia.extends"],
    [{ themes: { light: { extends: "dark" } } }, "unexpected-base@themes.light.extends"],
    [{ themes: { light: { colours: {} } } }, "unknown-key@themes.light.colours"],
    [
      { themes: { light: { colors: { primay: "#fff" } } } },
      "unknown-key@themes.light.colors.primay",
    ],
    [{ themes: { light: { colors: { primary: 1 } } } }, "invalid-type@themes.light.colors.primary"],
    [{ radius: { base: 12 } }, "invalid-length@radius.base"],
    [{ radius: { base: "-1rem" } }, "invalid-length@radius.base"],
    [{ radius: { base: "1vw" } }, "invalid-length@radius.base"],
    [{ spacing: { unit: "" } }, "invalid-length@spacing.unit"],
    [{ focus: { width: "thick" } }, "invalid-length@focus.width"],
    [{ typography: { families: { body: [] } } }, "invalid-font-stack@typography.families.body"],
    [{ typography: { families: { body: "a;b" } } }, "invalid-font-stack@typography.families.body"],
    [{ typography: { families: { heading: "x" } } }, "unknown-key@typography.families.heading"],
    [
      { typography: { metrics: { body: { capHeight: "7" } } } },
      "invalid-metrics@typography.metrics.body.capHeight",
    ],
    [{ contrast: "strict" }, "invalid-type@contrast"],
    [{ output: "out.txt" }, "invalid-output@output"],
    [{ output: "node_modules/x.css" }, "invalid-output@output"],
  ];
  for (const [input, expected] of cases) {
    assert.ok(codes(input).includes(expected), `${JSON.stringify(input)} → ${codes(input)}`);
  }
});

test("did-you-mean suggestions and messages include the received value", () => {
  const [diagnostic] = validateStructure({ themes: { light: { colors: { primay: "#fff" } } } });
  assert.equal(diagnostic.message, 'Unknown key "primay". Did you mean "primary"?');
  const [length] = validateStructure({ radius: { base: 12 } });
  assert.match(length.message, /received 12\./);
  const [noHint] = validateStructure({ zzzzzz: 1 });
  assert.match(noHint.message, /Allowed: version, themes/);
});

test("reports every problem in one pass", () => {
  const diagnostics = validateStructure({
    version: 3,
    themes: { system: {}, sepia: {} },
    radius: { base: "x" },
    contrast: 1,
  });
  assert.equal(diagnostics.length, 5);
});

test("metrics are shape-checked (no reserved info since feature 004)", () => {
  const diagnostics = validateStructure({
    typography: {
      metrics: { body: { capHeight: 700, ascent: 1000, descent: -250, lineGap: 0, unitsPerEm: 0 } },
    },
  });
  assert.deepEqual(
    diagnostics.map((d) => `${d.severity}:${d.code}`),
    ["error:invalid-metrics"],
  );
});

test("output rules shared with the CLI", () => {
  assert.equal(outputProblem("a/b.CSS"), undefined);
  assert.match(outputProblem("a.txt"), /\.css/);
  assert.match(outputProblem("x\\node_modules\\a.css"), /node_modules/);
  assert.match(outputProblem(""), /path/);
});

test("diagnostic helpers are deterministic", () => {
  assert.equal(editDistance("primay", "primary"), 1);
  assert.equal(suggest("primay", ["primary", "primaryForeground"]), "primary");
  assert.equal(suggest("zzz", ["primary"]), undefined);
  assert.ok(describeValue("x".repeat(100)).length <= 62);
  assert.ok(describeValue("x".repeat(100)).endsWith('…"'));
  assert.equal(describeValue([1]), "an array");
  const sorted = sortDiagnostics([
    { severity: "error", code: "b", path: "themes.light", message: "" },
    { severity: "error", code: "a", path: "themes.light", message: "" },
    { severity: "error", code: "a", path: "radius", message: "" },
  ]);
  assert.deepEqual(
    sorted.map((d) => `${d.path}:${d.code}`),
    ["radius:a", "themes.light:a", "themes.light:b"],
  );
  const lines = formatDiagnostics(sorted);
  assert.equal(lines[0], "error   radius        a  ");
  assert.ok(!formatDiagnostics(sorted)[0].includes("\u001b"));
  assert.ok(formatDiagnostics(sorted, { color: true })[0].includes("\u001b[31m"));
});
