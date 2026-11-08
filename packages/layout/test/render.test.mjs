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
    Center: ["neshel-center"],
    Container: ["neshel-container"],
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
    "neshel-align-center",
  ]);
  sameClasses(classesOf(Flex, { space: null, spaceX: "2" }), ["neshel-flex", "neshel-gap-x-2"]);
});

test("responsive values: one class per written key, order-free (ADR 0010, FR-030)", () => {
  assert.deepEqual(classesOf(Stack, { space: { base: "2", md: "4", lg: "4", xl: "6" } }), [
    "neshel-stack",
    "neshel-gap-2",
    "neshel-md-gap-4",
    "neshel-lg-gap-4",
    "neshel-xl-gap-6",
  ]);
  // `base` first, then the consumer's key order; the stylesheet orders the media blocks.
  assert.deepEqual(classesOf(Grid, { columns: { lg: 4, base: 1, md: 2 } }), [
    "neshel-grid",
    "neshel-cols-1",
    "neshel-lg-cols-4",
    "neshel-md-cols-2",
  ]);
  sameClasses(classesOf(Stack, { space: { "2xl": "24" } }), ["neshel-stack", "neshel-2xl-gap-24"]);
  sameClasses(classesOf(Stack, { space: {} }), ["neshel-stack"]);
  sameClasses(classesOf(Stack, { space: { base: null, sm: "1" } }), [
    "neshel-stack",
    "neshel-sm-gap-1",
  ]);
  // Custom breakpoint names (configured through neshel generate) need no runtime registry.
  sameClasses(classesOf(Grid, { columns: { base: 1, tablet: 2, phoneXL: 3 } }), [
    "neshel-grid",
    "neshel-cols-1",
    "neshel-tablet-cols-2",
    "neshel-phoneXL-cols-3",
  ]);
});

test("resolution is deterministic (same props, same classes)", () => {
  const props = { space: { base: "2", lg: "8" }, alignX: { md: "center" }, justify: "between" };
  const first = markup(h(Stack, props));
  for (let i = 0; i < 5; i++) assert.equal(markup(h(Stack, { ...props })), first);
});

test("alignment props emit custom-property classes; CSS maps the axes (FR-020)", () => {
  for (const Component of [Stack, Inline, Grid, Center, Flex]) {
    const base = classesOf(Component)[0];
    sameClasses(
      classesOf(Component, { alignX: "center", alignY: "end" }),
      [base, "neshel-align-x-center", "neshel-align-y-end"],
      Component.name,
    );
  }
  sameClasses(classesOf(Flex, { direction: "column", alignX: "center", alignY: "end" }), [
    "neshel-flex",
    "neshel-dir-column",
    "neshel-align-x-center",
    "neshel-align-y-end",
  ]);
  sameClasses(classesOf(Flex, { direction: "row-reverse", alignX: "start" }), [
    "neshel-flex",
    "neshel-dir-row-reverse",
    "neshel-align-x-start",
  ]);
});

test("precedence props are emitted independently (CSS resolves justify > axis > align)", () => {
  sameClasses(classesOf(Inline, { align: "center", justify: "between" }), [
    "neshel-inline",
    "neshel-align-center",
    "neshel-justify-between",
  ]);
  sameClasses(classesOf(Stack, { alignX: "start", align: { md: "center" } }), [
    "neshel-stack",
    "neshel-align-x-start",
    "neshel-md-align-center",
  ]);
  sameClasses(classesOf(Inline, { alignX: "center", justify: { md: "evenly" } }), [
    "neshel-inline",
    "neshel-align-x-center",
    "neshel-md-justify-evenly",
  ]);
});

test("Flex direction classes carry the axis mapping (FR-020)", () => {
  sameClasses(classesOf(Flex, { direction: { base: "column", md: "row" }, alignX: "center" }), [
    "neshel-flex",
    "neshel-dir-column",
    "neshel-md-dir-row",
    "neshel-align-x-center",
  ]);
});

test("cross-axis stretch/baseline are accepted where meaningful (FR-023)", () => {
  sameClasses(classesOf(Inline, { alignY: "baseline" }), [
    "neshel-inline",
    "neshel-align-y-baseline",
  ]);
  sameClasses(classesOf(Stack, { alignX: "stretch" }), ["neshel-stack", "neshel-align-x-stretch"]);
  sameClasses(classesOf(Grid, { align: "stretch" }), ["neshel-grid", "neshel-align-stretch"]);
  sameClasses(classesOf(Flex, { direction: "column", alignX: "baseline" }), [
    "neshel-flex",
    "neshel-dir-column",
    "neshel-align-x-baseline",
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
    "neshel-md-mw-xl",
    "neshel-lg-mw-full",
  ]);
  sameClasses(classesOf(Container, { size: "xl" }), ["neshel-container", "neshel-mw-xl"]);
  sameClasses(classesOf(Grid, { columns: 12 }), ["neshel-grid", "neshel-cols-12"]);
});

test("Center centres through its base rule; axis props override (FR-024)", () => {
  sameClasses(classesOf(Center, { alignY: { md: "start" } }), [
    "neshel-center",
    "neshel-md-align-y-start",
  ]);
  sameClasses(classesOf(Center, { align: "end" }), ["neshel-center", "neshel-align-end"]);
});
