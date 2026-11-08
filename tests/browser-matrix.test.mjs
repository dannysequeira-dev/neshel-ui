import assert from "node:assert/strict";
import { join } from "node:path";
import test from "node:test";
import {
  compareResults,
  expectationsFrom,
  fixturePage,
  hexToRgb,
  MATRIX,
  probeExpression,
  roleVariable,
  rowsFor,
} from "../scripts/lib/browser-matrix.mjs";
import { browserCandidates, parseDevToolsEndpoint } from "../scripts/lib/cdp.mjs";

test("the matrix covers every row of contracts/css.md, both OS preferences and nesting", () => {
  assert.deepEqual(
    MATRIX.map((row) => row.id),
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, "11a", "11b", 12],
  );
  assert.deepEqual([...new Set(MATRIX.map((row) => row.os))].sort(), ["dark", "light"]);
  for (const value of [null, "light", "dark", "system", "sepia"]) {
    assert.ok(
      MATRIX.some((row) => row.root === value || row.nested === value),
      String(value),
    );
  }
  assert.equal(MATRIX.find((row) => row.id === 2).expectRoot, "light", "D1: no attribute is light");
});

test("rowsFor drops named-theme rows when the fixture has no such theme", () => {
  assert.equal(rowsFor(["light", "dark"]).length, 10);
  assert.equal(rowsFor(["light", "dark", "sepia"]).length, 13);
});

test("hexToRgb matches getComputedStyle serialisation", () => {
  assert.equal(hexToRgb("#fbf9f6"), "rgb(251, 249, 246)");
  assert.equal(hexToRgb("#FFF"), "rgb(255, 255, 255)");
  assert.throws(() => hexToRgb("oklch(0.5 0.1 80)"));
  assert.equal(roleVariable("surfaceForeground"), "--neshel-surface-foreground");
});

test("expectations cover every role and theme", () => {
  const roles = ["background", "primaryForeground"];
  const expected = expectationsFrom(
    [
      {
        name: "light",
        colorScheme: "light",
        colors: { background: "#ffffff", primaryForeground: "#000000" },
      },
    ],
    roles,
  );
  assert.deepEqual(expected, {
    light: {
      scheme: "light",
      colors: {
        "--neshel-background": "rgb(255, 255, 255)",
        "--neshel-primary-foreground": "rgb(0, 0, 0)",
      },
    },
  });
});

test("fixture pages keep stylesheet order and escape closing tags", () => {
  const html = fixturePage("t", ["a{}", "b{}</style>"]);
  assert.ok(html.indexOf("a{}") < html.indexOf("b{}"));
  assert.ok(!html.includes("b{}</style>"));
  assert.match(probeExpression([{ id: 1 }], ["--neshel-primary"]), /getComputedStyle/);
});

test("compareResults reports root, nested, descendant and color-scheme mismatches", () => {
  const expected = {
    light: { scheme: "light", colors: { "--neshel-primary": "rgb(1, 1, 1)" } },
    dark: { scheme: "dark", colors: { "--neshel-primary": "rgb(2, 2, 2)" } },
  };
  const row = MATRIX.find((r) => r.id === 7);
  const ok = (theme) => ({
    scheme: theme,
    colors: { "--neshel-primary": expected[theme].colors["--neshel-primary"] },
  });
  assert.deepEqual(
    compareResults(
      "f",
      [row],
      [{ id: 7, root: ok("dark"), rootScheme: "dark", nested: ok("light"), child: ok("light") }],
      expected,
    ),
    [],
  );
  const failures = compareResults(
    "f",
    [row],
    [{ id: 7, root: ok("dark"), rootScheme: "light", nested: ok("dark"), child: ok("dark") }],
    expected,
  );
  assert.equal(failures.length, 4);
});

test("browser discovery honours NESHEL_CHROME and covers each OS", () => {
  assert.deepEqual(browserCandidates("linux", { NESHEL_CHROME: "/x/chrome" }), ["/x/chrome"]);
  const windows = browserCandidates("win32", { PROGRAMFILES: "C:\\Program Files" });
  assert.ok(windows.some((path) => path.endsWith("chrome.exe")));
  assert.ok(windows.some((path) => path.endsWith("msedge.exe")));
  assert.ok(browserCandidates("darwin", {})[0].includes("Google Chrome.app"));
  assert.ok(
    browserCandidates("linux", { PATH: "/usr/bin" }).includes(join("/usr/bin", "google-chrome")),
  );
});

test("parses the DevTools endpoint from browser output", () => {
  assert.equal(
    parseDevToolsEndpoint(
      "noise\nDevTools listening on ws://127.0.0.1:1234/devtools/browser/abc\n",
    ),
    "ws://127.0.0.1:1234/devtools/browser/abc",
  );
  assert.equal(parseDevToolsEndpoint("nothing"), undefined);
});
