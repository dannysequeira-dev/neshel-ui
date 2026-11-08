// Completeness of the layout browser cases (feature 003 SC-001; brief §11 browser list).
import assert from "node:assert/strict";
import test from "node:test";
import {
  checksByWidth,
  LAYOUT_CASES,
  layoutBody,
  ORDER_CASES,
  orderChecks,
  snapshotExpression,
  WIDTHS,
} from "../scripts/lib/layout-browser.mjs";

test("case ids are unique and every case has checks at known widths", () => {
  const ids = LAYOUT_CASES.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length);
  const widths = new Set(Object.values(WIDTHS));
  for (const testCase of LAYOUT_CASES) {
    assert.ok(testCase.checks.length > 0, testCase.id);
    for (const check of testCase.checks)
      assert.ok(widths.has(check.width), `${testCase.id} ${check.width}`);
  }
});

test("cases cover the brief's browser list", () => {
  const ids = LAYOUT_CASES.map((c) => c.id).join(" ");
  for (const topic of [
    "stack",
    "inline-wrap",
    "flex-direction",
    "grid",
    "center",
    "container",
    "separator",
    "rtl",
    "row-reverse",
    "dark",
    "custom-spacing",
  ]) {
    assert.match(ids, new RegExp(topic), topic);
  }
  const used = new Set(LAYOUT_CASES.flatMap((c) => c.checks.map((check) => check.width)));
  for (const bp of ["base", "sm", "md", "lg", "xl"])
    assert.ok(used.has(WIDTHS[bp]), `breakpoint ${bp} exercised`);
});

test("checksByWidth groups checks in ascending width order", () => {
  const groups = checksByWidth(LAYOUT_CASES);
  const widths = groups.map(([width]) => width);
  assert.deepEqual(
    widths,
    [...widths].sort((a, b) => a - b),
  );
  const total = groups.reduce((sum, [, entries]) => sum + entries.length, 0);
  assert.equal(
    total,
    LAYOUT_CASES.reduce((sum, c) => sum + c.checks.length, 0),
  );
});

test("layoutBody wraps each case with data-case, theme and wrapper style", () => {
  const html = layoutBody(
    [
      {
        id: "x",
        wrapper: { width: "10px", "--neshel-spacing": "1rem" },
        theme: "dark",
        build: () => "el",
        checks: [],
      },
    ],
    { h: null, L: null, render: (element) => `<i>${element}</i>` },
  );
  assert.equal(
    html,
    '<div data-case="x" data-neshel-theme="dark" style="width: 10px; --neshel-spacing: 1rem"><i>el</i></div>',
  );
  assert.match(snapshotExpression("x"), /\[data-case="x"\]/);
});

test("import-order checks differ only in the container expectation", () => {
  const canonical = orderChecks(true);
  const reversed = orderChecks(false);
  assert.deepEqual(
    canonical.map((c) => c.id),
    ORDER_CASES.map((c) => c.id),
  );
  const snapshot = {
    viewport: 1300,
    root: { rect: { left: 266 }, styles: { flexDirection: "row" } },
  };
  assert.deepEqual(canonical[0].checks[0].expect(snapshot).filter(Boolean), []);
  assert.equal(reversed[0].checks[0].expect(snapshot).filter(Boolean).length, 1);
});
