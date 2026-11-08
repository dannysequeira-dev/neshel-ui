// Rendering contract (contracts/typography-api.md; FR-030–FR-036, FR-045).
import assert from "node:assert/strict";
import test from "node:test";
import { classesOf, firstElement, h, markup, renderError, typography } from "./helpers.mjs";

const { Caption, Heading, Paragraph, Text, NeshelTypographyError } = typography;
const Link = ({ ref, className, children }) => h("a", { ref, className }, children);

test("public runtime exports are the four components and the error (FR-030)", () => {
  assert.deepEqual(Object.keys(typography).sort(), [
    "Caption",
    "Heading",
    "NeshelTypographyError",
    "Paragraph",
    "Text",
  ]);
});

test("default elements and classes", () => {
  assert.equal(firstElement(markup(h(Heading, null, "x"))).tag, "h2");
  assert.equal(firstElement(markup(h(Paragraph, null, "x"))).tag, "p");
  assert.equal(firstElement(markup(h(Caption, null, "x"))).tag, "p");
  assert.equal(firstElement(markup(h(Text, null, "x"))).tag, "span");
  assert.deepEqual(classesOf(Heading), [
    "neshel-typography",
    "neshel-text-family-display",
    "neshel-text-size-3xl",
    "neshel-text-weight-semibold",
    "neshel-text-trim",
  ]);
  assert.deepEqual(classesOf(Paragraph), [
    "neshel-typography",
    "neshel-text-family-body",
    "neshel-text-size-base",
    "neshel-text-trim",
  ]);
  assert.deepEqual(classesOf(Caption), [
    "neshel-typography",
    "neshel-text-family-body",
    "neshel-text-tone-muted",
    "neshel-text-size-sm",
    "neshel-text-trim",
  ]);
  // Text inherits size, family, weight and colour; it is never trimmed.
  assert.deepEqual(classesOf(Text), ["neshel-typography"]);
});

test("heading level is semantic; the default size follows the level, never the reverse (FR-031)", () => {
  const sizes = { h1: "4xl", h2: "3xl", h3: "2xl", h4: "xl", h5: "lg", h6: "base" };
  for (const [as, size] of Object.entries(sizes)) {
    const html = markup(h(Heading, { as }, "Title"));
    assert.equal(firstElement(html).tag, as);
    assert.ok(classesOf(Heading, { as }).includes(`neshel-text-size-${size}`), as);
  }
  const big = markup(h(Heading, { as: "h2", size: "5xl" }, "Section heading"));
  assert.match(big, /^<h2 class="[^"]*neshel-text-size-5xl[^"]*">Section heading<\/h2>$/);
  assert.equal(firstElement(markup(h(Heading, { as: "h6", size: "6xl" }))).tag, "h6");
});

test("static props map to classes (FR-032)", () => {
  assert.deepEqual(
    classesOf(Heading, {
      as: "h1",
      size: "2xl",
      weight: "bold",
      tone: "primary",
      tracking: "tight",
      wrap: "balance",
    }),
    [
      "neshel-typography",
      "neshel-text-family-display",
      "neshel-text-tone-primary",
      "neshel-text-tracking-tight",
      "neshel-text-wrap-balance",
      "neshel-text-size-2xl",
      "neshel-text-weight-bold",
      "neshel-text-trim",
    ],
  );
  assert.deepEqual(
    classesOf(Paragraph, { measure: "comfortable", tone: "muted", leading: "relaxed" }),
    [
      "neshel-typography",
      "neshel-text-family-body",
      "neshel-text-tone-muted",
      "neshel-text-measure-comfortable",
      "neshel-text-size-base",
      "neshel-text-leading-relaxed",
      "neshel-text-trim",
    ],
  );
  assert.deepEqual(classesOf(Text, { family: "mono", as: "code", align: "end" }), [
    "neshel-typography",
    "neshel-text-family-mono",
    "neshel-text-align-end",
  ]);
});

test("responsive props: one class per written key; defaults fill a missing base (FR-004, R7)", () => {
  assert.deepEqual(
    classesOf(Heading, {
      as: "h1",
      size: { base: "xl", md: "3xl", lg: "5xl" },
      weight: { base: "medium", md: "bold" },
      align: { base: "center", lg: "start" },
    }).filter((name) => /size|weight|align/.test(name)),
    [
      "neshel-text-size-xl",
      "neshel-md-text-size-3xl",
      "neshel-lg-text-size-5xl",
      "neshel-text-weight-medium",
      "neshel-md-text-weight-bold",
      "neshel-text-align-center",
      "neshel-lg-text-align-start",
    ],
  );
  // No base: the component default applies below the first written breakpoint.
  assert.deepEqual(
    classesOf(Heading, { as: "h3", size: { md: "4xl" } }).filter((name) => name.includes("size")),
    ["neshel-text-size-2xl", "neshel-md-text-size-4xl"],
  );
  // Text has no default size: nothing below the first written breakpoint (inherits).
  assert.deepEqual(classesOf(Text, { size: { lg: "lg" } }), [
    "neshel-typography",
    "neshel-lg-text-size-lg",
  ]);
  // Custom names need no runtime registry.
  assert.ok(
    classesOf(Paragraph, { size: { base: "sm", tablet: "lg", phoneXL: "base" } }).includes(
      "neshel-phoneXL-text-size-base",
    ),
  );
  // null means absent.
  assert.deepEqual(classesOf(Text, { size: null, weight: { base: null, md: "bold" } }), [
    "neshel-typography",
    "neshel-md-text-weight-bold",
  ]);
});

test("trimming: on by default for block components, removable, never with truncate or inline hosts (FR-045)", () => {
  const trimmed = (Component, props, child) =>
    classesOf(Component, props, child).includes("neshel-text-trim");
  assert.ok(trimmed(Heading, {}));
  assert.ok(!trimmed(Heading, { trim: false }));
  assert.ok(!trimmed(Paragraph, { truncate: true }));
  assert.ok(classesOf(Paragraph, { truncate: true }).includes("neshel-text-truncate"));
  assert.ok(!trimmed(Caption, { as: "span" }));
  assert.ok(!trimmed(Caption, { as: "small" }));
  assert.ok(trimmed(Caption, { as: "figcaption" }));
  const child = (tag) => markup(h(Heading, { asChild: true }, h(tag, { href: "#" }, "x")));
  assert.doesNotMatch(child("a"), /neshel-text-trim/);
  assert.match(child("div"), /neshel-text-trim/);
  // Component children keep trimming (their host element is unknown; documented).
  assert.match(markup(h(Heading, { asChild: true }, h(Link, null, "x"))), /neshel-text-trim/);
});

test("native attributes, className and style pass through; typography props never reach the DOM", () => {
  const html = markup(
    h(
      Paragraph,
      {
        id: "p",
        "aria-describedby": "d",
        "data-test": "x",
        lang: "es",
        className: "mine",
        style: { color: "red" },
        size: "lg",
        tone: "muted",
        measure: "narrow",
        trim: false,
      },
      "Hola",
    ),
  );
  const { attrs } = firstElement(html);
  assert.equal(attrs.id, "p");
  assert.equal(attrs.lang, "es");
  assert.equal(attrs["aria-describedby"], "d");
  assert.match(attrs.class, / mine$/);
  assert.equal(attrs.style, "color:red");
  for (const name of ["size", "tone", "measure", "trim"])
    assert.equal(attrs[name], undefined, name);
});

test("Unicode, accents and long content render unchanged", () => {
  const text = "Ñandú Ångström — 東京 · กรุงเทพ · مرحبا · Ä̈ Ế";
  assert.equal(markup(h(Text, null, text)), `<span class="neshel-typography">${text}</span>`);
});

test("errors: NeshelTypographyError with component names (FR-036)", () => {
  const cases = [
    [h(Heading, { as: "p" }), /<Heading>: invalid value "p" for "as"; expected one of: h1, h2/],
    [h(Heading, { as: "h1", asChild: true }, h("span")), /"as" and "asChild" cannot be combined/],
    [
      h(Text, { asChild: true }),
      /asChild expects exactly one React element child \(received no children\)/,
    ],
    [h(Text, { asChild: true }, "a", "b"), /received 2 children/],
    [h(Text, { asChild: true }, "text"), /received text/],
    [
      h(Caption, { asChild: true }, h(Symbol.for("react.fragment"), null, h("span"))),
      /not a Fragment/,
    ],
    [
      h(Paragraph, { size: "7xl" }),
      /<Paragraph>: invalid value "7xl" for "size"; expected one of: "xs"/,
    ],
    [h(Paragraph, { size: { md: "7xl" } }), /invalid value "7xl" for "size" at breakpoint "md"/],
    [h(Heading, { weight: "black" }), /invalid value "black" for "weight"/],
    [h(Text, { tone: "accent" }), /invalid value "accent" for "tone"/],
    [h(Text, { family: "serif" }), /invalid value "serif" for "family"/],
    [
      h(Text, { truncate: "yes" }),
      /invalid value "yes" for "truncate"; expected one of: true, false/,
    ],
    [h(Paragraph, { trim: 0 }), /invalid value 0 for "trim"/],
    [h(Text, { trim: true }), /<Text>: "trim" is not supported/],
    [h(Heading, { size: { "Tablet-X": "xl" } }), /invalid breakpoint key "Tablet-X" in "size"/],
    [h(Heading, { align: "left" }), /invalid value "left" for "align"; expected one of: "start"/],
  ];
  for (const [element, message] of cases) {
    const error = renderError(element);
    assert.ok(error instanceof NeshelTypographyError, String(message));
    assert.equal(error.name, "NeshelTypographyError");
    assert.match(error.message, /^\[@neshel-ui\/typography\] </);
    assert.match(error.message, message);
  }
});
