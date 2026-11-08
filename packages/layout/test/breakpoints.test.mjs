// Unknown well-formed breakpoint keys (ADR 0010 §2, contracts/breakpoints.md §3, FR-006/FR-007):
// no error, no SSR side effect, one browser warning per key against --neshel-breakpoints.
import assert from "node:assert/strict";
import test from "node:test";
import { classesOf, h, layout, markup, mount, setupDom } from "./helpers.mjs";

const { Grid, Stack } = layout;
const { isBreakpointKey, resetBreakpointCheck } = await import("../dist/breakpoint-check.js");

function captureWarnings() {
  const warnings = [];
  const original = console.warn;
  console.warn = (...args) => warnings.push(args.join(" "));
  return { warnings, restore: () => (console.warn = original) };
}

test("grammar: base, defaults and lower camelCase names", () => {
  for (const key of ["base", "sm", "2xl", "tablet", "phoneXL", "wide3"])
    assert.ok(isBreakpointKey(key), key);
  for (const key of ["", "Tablet", "phone-xl", "3xl", "phone_xl", "__proto__", " md"]) {
    assert.ok(!isBreakpointKey(key), key);
  }
});

test("server rendering: unknown well-formed keys render their classes and never warn", () => {
  const capture = captureWarnings();
  try {
    assert.deepEqual(classesOf(Stack, { space: { base: "2", tablet: "6" } }), [
      "neshel-stack",
      "neshel-gap-2",
      "neshel-tablet-gap-6",
    ]);
    assert.match(markup(h(Grid, { columns: { phoneXL: 2 } })), /neshel-phoneXL-cols-2/);
  } finally {
    capture.restore();
  }
  assert.deepEqual(capture.warnings, []);
});

test("browser: one warning per key not declared by the loaded stylesheet", async () => {
  const dom = await setupDom();
  globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
  const capture = captureWarnings();
  try {
    resetBreakpointCheck();
    // No Neshel stylesheet declares breakpoints yet: nothing to compare against, no warning.
    const before = await mount(h(Stack, { space: { tablet: "4" } }));
    await before.unmount();
    assert.deepEqual(capture.warnings, []);

    document.documentElement.style.setProperty("--neshel-breakpoints", '"sm md lg xl 2xl"');
    resetBreakpointCheck();
    const first = await mount(
      h(
        "div",
        null,
        h(Stack, { space: { md: "4", tablet: "4" } }),
        h(Grid, { columns: { tablet: 2 } }),
      ),
    );
    await first.unmount();
    assert.equal(capture.warnings.length, 1, capture.warnings.join("\n"));
    assert.match(
      capture.warnings[0],
      /^\[@neshel-ui\/layout\] <Stack>: breakpoint "tablet" is not defined by the loaded Neshel stylesheet \(defined: sm md lg xl 2xl\)\. Configure it in neshel\.config\.ts and run "neshel generate"\.$/,
    );
    const again = await mount(h(Stack, { space: { tablet: "8" } }));
    await again.unmount();
    assert.equal(capture.warnings.length, 1, "warned once per key");

    // A replace-mode stylesheet: the obsolete default `md` now warns, `tablet` does not.
    document.documentElement.style.setProperty("--neshel-breakpoints", '"phone tablet desktop"');
    resetBreakpointCheck();
    const replaced = await mount(h(Stack, { space: { base: "1", tablet: "2", md: "3" } }));
    await replaced.unmount();
    assert.equal(capture.warnings.length, 2);
    assert.match(
      capture.warnings[1],
      /breakpoint "md" is not defined .*\(defined: phone tablet desktop\)/,
    );
  } finally {
    capture.restore();
    document.documentElement.style.removeProperty("--neshel-breakpoints");
  }
});
