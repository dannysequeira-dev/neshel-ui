// Rendering contract of the seven primitives (contracts/layout-api.md; FR-001–FR-033).
import assert from "node:assert/strict";
import test from "node:test";
import { classesOf, firstElement, h, layout, markup } from "./helpers.mjs";

const sameClasses = (actual, expected, message) =>
  assert.deepEqual([...actual].sort(), [...expected].sort(), message);

const { Box, Center, Container, Flex, Grid, Inline, Stack } = layout;

test("public runtime exports are exactly the seven primitives (FR-001)", () => {
  assert.deepEqual(Object.keys(layout).sort(), [
    "Box",
    "Center",
    "Container",
    "Flex",
    "Grid",
    "Inline",
    "Stack",
  ]);
});

test("each primitive renders one div with its base class and no props-driven classes by default", () => {
  const expected = {
    Box: [],
    Flex: ["neshel-flex"],
    Stack: ["neshel-stack"],
    Inline: ["neshel-inline"],
    Grid: ["neshel-grid"],
    Center: ["neshel-center", "neshel-ai-center", "neshel-jc-center"],
    Container: ["neshel-container", "neshel-mw-xl"],
  };
  for (const [name, classes] of Object.entries(expected)) {
    const html = markup(h(layout[name], null, "child"));
    assert.equal(firstElement(html).tag, "div", name);
    assert.match(html, /^<div[^>]*>child<\/div>$/, name);
    sameClasses(classesOf(layout[name]), classes, name);
  }
  assert.equal(markup(h(Box)), "<div></div>", "Box adds no class attribute (FR-003)");
});

test("as selects the semantic element (FR-002)", () => {
  for (const tag of ["section", "nav", "ul", "main", "span", "address"]) {
    assert.equal(firstElement(markup(h(Stack, { as: tag }))).tag, tag);
  }
});

test("native attributes pass through, layout props never reach the DOM (FR-005)", () => {
  const html = markup(
    h(Stack, {
      id: "s",
      role: "list",
      "aria-label": "Items",
      "data-test": "x",
      title: "t",
      space: "4",
      align: "center",
      justify: "between",
      separator: false,
    }),
  );
  const { attrs } = firstElement(html);
  assert.equal(attrs.id, "s");
  assert.equal(attrs.role, "list");
  assert.equal(attrs["aria-label"], "Items");
  assert.equal(attrs["data-test"], "x");
  for (const name of ["space", "align", "justify", "separator", "spacex", "spacey", "as"]) {
    assert.equal(attrs[name], undefined, `${name} must not be forwarded`);
  }
  for (const [Component, props] of [
    [Flex, { direction: "column", wrap: true, spaceX: "2", spaceY: "4" }],
    [Grid, { columns: 3, alignX: "center" }],
    [Box, { display: "block" }],
    [Container, { size: "lg", gutter: "4" }],
    [Inline, { wrap: true, alignY: "baseline" }],
  ]) {
    const { attrs: rendered } = firstElement(markup(h(Component, props)));
    assert.deepEqual(Object.keys(rendered), ["class"], Component.name);
  }
});

test("className is appended after layout classes; style is forwarded unchanged (FR-006)", () => {
  assert.deepEqual(classesOf(Stack, { space: "4", className: "custom another" }), [
    "neshel-stack",
    "neshel-gap-4",
    "custom",
    "another",
  ]);
  assert.equal(markup(h(Box, { className: "only" })), '<div class="only"></div>');
  assert.match(
    markup(h(Stack, { style: { color: "red", gap: "3px" } })),
    /style="color:red;gap:3px"/,
  );
});

test("space, spaceX and spaceY map to gap, column-gap and row-gap classes (FR-010)", () => {
  sameClasses(classesOf(Stack, { space: "4" }), ["neshel-stack", "neshel-gap-4"]);
  sameClasses(classesOf(Inline, { spaceX: "4", spaceY: "0.5" }), [
    "neshel-inline",
    "neshel-gap-x-4",
    "neshel-gap-y-0.5",
  ]);
  sameClasses(classesOf(Grid, { spaceY: "2" }), ["neshel-grid", "neshel-gap-y-2"]);
  sameClasses(classesOf(Center, { space: "0", align: "center" }), [
    "neshel-center",
    "neshel-gap-0",
    "neshel-ai-center",
    "neshel-jc-center",
  ]);
  sameClasses(classesOf(Flex, { space: null, spaceX: "2" }), ["neshel-flex", "neshel-gap-x-2"]);
});

test("responsive values cascade mobile first and emit only changes (FR-030, FR-032)", () => {
  sameClasses(classesOf(Stack, { space: { base: "2", md: "4", lg: "4", xl: "6" } }), [
    "neshel-stack",
    "neshel-gap-2",
    "neshel-md-gap-4",
    "neshel-xl-gap-6",
  ]);
  sameClasses(classesOf(Grid, { columns: { base: 1, md: 2, lg: 4 } }), [
    "neshel-grid",
    "neshel-cols-1",
    "neshel-md-cols-2",
    "neshel-lg-cols-4",
  ]);
  sameClasses(classesOf(Stack, { space: { "2xl": "24" } }), ["neshel-stack", "neshel-2xl-gap-24"]);
  sameClasses(classesOf(Stack, { space: {} }), ["neshel-stack"]);
  sameClasses(classesOf(Stack, { space: { base: null, sm: "1" } }), [
    "neshel-stack",
    "neshel-sm-gap-1",
  ]);
});

test("resolution is deterministic (same props, same classes)", () => {
  const props = { space: { base: "2", lg: "8" }, alignX: { md: "center" }, justify: "between" };
  const first = markup(h(Stack, props));
  for (let i = 0; i < 5; i++) assert.equal(markup(h(Stack, { ...props })), first);
});

test("axis mapping per component (FR-020)", () => {
  sameClasses(classesOf(Stack, { alignX: "center", alignY: "end" }), [
    "neshel-stack",
    "neshel-ai-center",
    "neshel-jc-end",
  ]);
  sameClasses(classesOf(Inline, { alignX: "center", alignY: "end" }), [
    "neshel-inline",
    "neshel-jc-center",
    "neshel-ai-end",
  ]);
  sameClasses(classesOf(Grid, { alignX: "center", alignY: "end" }), [
    "neshel-grid",
    "neshel-ai-end",
    "neshel-ji-center",
  ]);
  sameClasses(classesOf(Center, { alignX: "start", alignY: "end" }), [
    "neshel-center",
    "neshel-ai-end",
    "neshel-jc-start",
  ]);
  sameClasses(classesOf(Flex, { alignX: "center", alignY: "end" }), [
    "neshel-flex",
    "neshel-ai-end",
    "neshel-jc-center",
  ]);
  sameClasses(classesOf(Flex, { direction: "column", alignX: "center", alignY: "end" }), [
    "neshel-flex",
    "neshel-dir-column",
    "neshel-ai-center",
    "neshel-jc-end",
  ]);
  sameClasses(classesOf(Flex, { direction: "row-reverse", alignX: "start" }), [
    "neshel-flex",
    "neshel-dir-row-reverse",
    "neshel-jc-start",
  ]);
});

test("precedence: justify > alignX/alignY > align, per breakpoint (FR-021, FR-022)", () => {
  sameClasses(classesOf(Inline, { align: "center", justify: "between" }), [
    "neshel-inline",
    "neshel-jc-between",
    "neshel-ai-center",
  ]);
  sameClasses(classesOf(Stack, { align: "center", alignX: "start" }), [
    "neshel-stack",
    "neshel-ai-start",
    "neshel-jc-center",
  ]);
  sameClasses(classesOf(Stack, { alignY: "end", justify: "around" }), [
    "neshel-stack",
    "neshel-jc-around",
  ]);
  // alignX from base keeps winning over a later, more general `align`.
  sameClasses(classesOf(Stack, { alignX: "start", align: { md: "center" } }), [
    "neshel-stack",
    "neshel-ai-start",
    "neshel-md-jc-center",
  ]);
  // A later axis prop overrides an earlier `align` only on its axis.
  sameClasses(classesOf(Inline, { align: "center", alignX: { lg: "end" } }), [
    "neshel-inline",
    "neshel-jc-center",
    "neshel-ai-center",
    "neshel-lg-jc-end",
  ]);
  sameClasses(classesOf(Inline, { alignX: "center", justify: { md: "evenly" } }), [
    "neshel-inline",
    "neshel-jc-center",
    "neshel-md-jc-evenly",
  ]);
});

test("Flex re-maps alignment when the direction changes and resets the vacated property (FR-020)", () => {
  sameClasses(classesOf(Flex, { direction: { base: "column", md: "row" }, alignX: "center" }), [
    "neshel-flex",
    "neshel-dir-column",
    "neshel-ai-center",
    "neshel-md-dir-row",
    "neshel-md-ai-normal",
    "neshel-md-jc-center",
  ]);
  assert.deepEqual(
    classesOf(Flex, { direction: { base: "row", lg: "column" }, alignX: "end", alignY: "center" }),
    [
      "neshel-flex",
      "neshel-dir-row",
      "neshel-ai-center",
      "neshel-jc-end",
      "neshel-lg-dir-column",
      "neshel-lg-ai-end",
      "neshel-lg-jc-center",
    ],
  );
  sameClasses(classesOf(Flex, { direction: { base: "row", sm: "column" }, alignX: "start" }), [
    "neshel-flex",
    "neshel-dir-row",
    "neshel-jc-start",
    "neshel-sm-dir-column",
    "neshel-sm-ai-start",
    "neshel-sm-jc-normal",
  ]);
  // Same axis family: no reset needed.
  sameClasses(classesOf(Flex, { direction: { base: "row", md: "row-reverse" }, alignX: "end" }), [
    "neshel-flex",
    "neshel-dir-row",
    "neshel-jc-end",
    "neshel-md-dir-row-reverse",
  ]);
});

test("cross-axis stretch/baseline are accepted where meaningful (FR-023)", () => {
  sameClasses(classesOf(Inline, { alignY: "baseline" }), ["neshel-inline", "neshel-ai-baseline"]);
  sameClasses(classesOf(Stack, { alignX: "stretch" }), ["neshel-stack", "neshel-ai-stretch"]);
  sameClasses(classesOf(Grid, { align: "stretch" }), [
    "neshel-grid",
    "neshel-ai-stretch",
    "neshel-ji-stretch",
  ]);
  sameClasses(classesOf(Flex, { direction: "column", alignX: "baseline" }), [
    "neshel-flex",
    "neshel-dir-column",
    "neshel-ai-baseline",
  ]);
});

test("wrap maps to flex-wrap on Flex and Inline (FR-033)", () => {
  sameClasses(classesOf(Inline, { wrap: true }), ["neshel-inline", "neshel-fw-wrap"]);
  sameClasses(classesOf(Flex, { wrap: { base: true, md: false } }), [
    "neshel-flex",
    "neshel-fw-wrap",
    "neshel-md-fw-nowrap",
  ]);
});

test("Box display, Container size/gutter, Grid columns (FR-004, FR-033)", () => {
  sameClasses(classesOf(Box, { display: { base: "none", md: "block" } }), [
    "neshel-d-none",
    "neshel-md-d-block",
  ]);
  sameClasses(classesOf(Container, { size: "lg", gutter: { base: "4", md: "8" } }), [
    "neshel-container",
    "neshel-mw-lg",
    "neshel-pi-4",
    "neshel-md-pi-8",
  ]);
  sameClasses(classesOf(Container, { size: { md: "xl", lg: "full" } }), [
    "neshel-container",
    "neshel-mw-xl",
    "neshel-lg-mw-full",
  ]);
  sameClasses(classesOf(Container, { size: "xl" }), ["neshel-container", "neshel-mw-xl"]);
  sameClasses(classesOf(Grid, { columns: 12 }), ["neshel-grid", "neshel-cols-12"]);
});

test("Center keeps centring unless an axis is overridden (FR-024)", () => {
  sameClasses(classesOf(Center, { alignY: { md: "start" } }), [
    "neshel-center",
    "neshel-ai-center",
    "neshel-jc-center",
    "neshel-md-ai-start",
  ]);
  sameClasses(classesOf(Center, { align: "end" }), [
    "neshel-center",
    "neshel-ai-end",
    "neshel-jc-end",
  ]);
});
