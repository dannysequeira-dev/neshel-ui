// Foundation components: semantics, variants, responsive classes, asChild, errors, forms, SSR
// (FR-005, FR-006, FR-010–FR-040, FR-120).
import assert from "node:assert/strict";
import test from "node:test";
import { Fragment } from "react";
import { firstElement, h, markup, mount, renderError, ui } from "./helpers.mjs";

const {
  Badge,
  Button,
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
  Label,
  NeshelComponentsError,
  Separator,
  Skeleton,
  VisuallyHidden,
} = ui;

const classes = (html) => (firstElement(html).attrs.class ?? "").split(/\s+/).filter(Boolean);

test("Button: native button, type=button by default, variant and size classes", () => {
  const html = markup(h(Button, null, "Continue"));
  const { tag, attrs } = firstElement(html);
  assert.equal(tag, "button");
  assert.equal(attrs.type, "button");
  assert.deepEqual(classes(html), [
    "neshel-button",
    "neshel-button-variant-primary",
    "neshel-button-size-md",
  ]);
  assert.equal(firstElement(markup(h(Button, { type: "submit" }, "Go"))).attrs.type, "submit");
  for (const variant of ["primary", "secondary", "outline", "ghost", "destructive", "link"]) {
    assert.ok(
      classes(markup(h(Button, { variant }, "x"))).includes(`neshel-button-variant-${variant}`),
    );
  }
});

test("Button: responsive size emits one class per key, base filled by the default", () => {
  assert.deepEqual(
    classes(markup(h(Button, { size: { base: "sm", tablet: "md" } }, "Save"))).slice(2),
    ["neshel-button-size-sm", "neshel-tablet-button-size-md"],
  );
  assert.deepEqual(classes(markup(h(Button, { size: { lg: "lg" } }, "Save"))).slice(2), [
    "neshel-button-size-md",
    "neshel-lg-button-size-lg",
  ]);
  assert.match(
    String(renderError(h(Button, { size: "xl" }, "x"))),
    /invalid value "xl" for "size"/,
  );
  assert.match(
    String(renderError(h(Button, { size: { "Bad-Key": "sm" } }, "x"))),
    /invalid breakpoint key "Bad-Key"/,
  );
});

test("Button: native disabled, iconOnly, fullWidth", () => {
  const html = markup(
    h(Button, { disabled: true, iconOnly: true, fullWidth: true, "aria-label": "Close" }, "×"),
  );
  assert.match(html, / disabled=""/);
  assert.ok(classes(html).includes("neshel-button-icon-only"));
  assert.ok(classes(html).includes("neshel-button-full-width"));
});

test("Button loading: aria-disabled, spinner hidden, label kept, activation and submit suppressed", async () => {
  const html = markup(h(Button, { loading: true }, "Save"));
  assert.match(html, /aria-disabled="true"/);
  assert.match(html, /data-loading=""/);
  assert.doesNotMatch(html, / disabled=""/);
  assert.match(html, /<span class="neshel-button-spinner" aria-hidden="true"><\/span>/);
  assert.match(html, /<span class="neshel-button-content">Save<\/span>/);

  let clicks = 0;
  let submits = 0;
  const view = await mount(
    h(
      "form",
      {
        onSubmit: (event) => {
          event.preventDefault();
          submits++;
        },
      },
      h(Button, { type: "submit", loading: true, onClick: () => clicks++ }, "Save"),
    ),
  );
  view.container.querySelector("button").click();
  assert.equal(clicks, 0);
  assert.equal(submits, 0);
  await view.rerender(
    h(
      "form",
      {
        onSubmit: (event) => {
          event.preventDefault();
          submits++;
        },
      },
      h(Button, { type: "submit", onClick: () => clicks++ }, "Save"),
    ),
  );
  view.container.querySelector("button").click();
  assert.equal(clicks, 1);
  assert.equal(submits, 1);
  await view.unmount();
});

test("Button asChild: renders the link without type; disabled/loading/invalid children throw", () => {
  const html = markup(
    h(Button, { asChild: true, variant: "ghost" }, h("a", { href: "/docs" }, "Docs")),
  );
  const { tag, attrs } = firstElement(html);
  assert.equal(tag, "a");
  assert.equal(attrs.href, "/docs");
  assert.equal(attrs.type, undefined);
  assert.ok(attrs.class.includes("neshel-button-variant-ghost"));
  for (const [props, children, pattern] of [
    [
      { disabled: true },
      h("a", { href: "/" }, "x"),
      /"disabled" cannot be combined with "asChild"/,
    ],
    [{ loading: true }, h("a", { href: "/" }, "x"), /"loading" cannot be combined with "asChild"/],
    [{}, "text", /exactly one React element child \(received text\)/],
    [{}, h(Fragment, null, h("a")), /not a Fragment/],
  ]) {
    const error = renderError(h(Button, { asChild: true, ...props }, children));
    assert.ok(error instanceof NeshelComponentsError, String(error));
    assert.match(error.message, pattern);
  }
});

test("Button refs reach the DOM element; handlers compose with asChild (child first)", async () => {
  const ref = { current: null };
  const order = [];
  const view = await mount(
    h(
      Fragment,
      null,
      h(Button, { ref, id: "b" }, "x"),
      h(
        Button,
        { asChild: true, onClick: () => order.push("button") },
        h(
          "a",
          {
            href: "#",
            id: "a",
            onClick: (event) => {
              event.preventDefault();
              order.push("child");
            },
          },
          "x",
        ),
      ),
    ),
  );
  assert.equal(ref.current, view.container.querySelector("#b"));
  view.container.querySelector("#a").click();
  assert.deepEqual(order, ["child", "button"]);
  await view.unmount();
});

test("Card family: independent parts, heading flexibility, as/asChild rules", () => {
  const html = markup(
    h(
      Card,
      { as: "section", "aria-labelledby": "t" },
      h(
        CardHeader,
        null,
        h(CardTitle, { id: "t" }, "Account"),
        h(CardDescription, null, "Latest"),
        h(CardAction, null, "A"),
      ),
      h(CardContent, null, "Body"),
      h(CardFooter, null, "Foot"),
    ),
  );
  assert.match(
    html,
    /^<section aria-labelledby="t" class="neshel-card neshel-card-variant-default neshel-card-padding-md">/,
  );
  assert.match(html, /<h3 id="t" class="neshel-card-title">Account<\/h3>/);
  assert.match(html, /<p class="neshel-card-description">Latest<\/p>/);
  assert.match(markup(h(CardTitle, { as: "h2" }, "x")), /^<h2 class="neshel-card-title">/);
  assert.match(
    markup(h(Card, { asChild: true, variant: "muted" }, h("article"))),
    /^<article class="neshel-card neshel-card-variant-muted/,
  );
  assert.match(
    String(renderError(h(Card, { as: "article", asChild: true }, h("div")))),
    /cannot be combined/,
  );
  assert.match(String(renderError(h(Card, { as: "button" }))), /invalid value "button" for "as"/);
  assert.match(String(renderError(h(CardTitle, { as: "span" }))), /invalid value "span"/);
});

test("Badge: span without role, variants and sizes", () => {
  const html = markup(h(Badge, { variant: "success" }, "Completed"));
  assert.equal(
    html,
    '<span class="neshel-badge neshel-badge-variant-success neshel-badge-size-md">Completed</span>',
  );
  for (const variant of [
    "default",
    "secondary",
    "outline",
    "success",
    "warning",
    "destructive",
    "accent",
  ]) {
    assert.ok(
      markup(h(Badge, { variant, size: "sm" })).includes(`neshel-badge-variant-${variant}`),
    );
  }
  assert.match(String(renderError(h(Badge, { variant: "info" }))), /invalid value "info"/);
});

test("Input: native attributes, numeric size kept, uiSize, invalid → aria-invalid", () => {
  const html = markup(
    h(Input, {
      type: "email",
      name: "email",
      size: 30,
      uiSize: "lg",
      invalid: true,
      required: true,
      autoComplete: "email",
      "aria-describedby": "err",
    }),
  );
  const { tag, attrs } = firstElement(html);
  assert.equal(tag, "input");
  assert.equal(attrs.type, "email");
  assert.equal(attrs.size, "30");
  assert.equal(attrs["aria-invalid"], "true");
  assert.equal(attrs.autoComplete, "email");
  assert.equal(attrs["aria-describedby"], "err");
  assert.ok(attrs.class.includes("neshel-field-size-lg"));
  assert.equal(
    firstElement(markup(h(Input, { invalid: true, "aria-invalid": "false" }))).attrs[
      "aria-invalid"
    ],
    "false",
  );
  assert.equal(firstElement(markup(h(Input))).attrs["aria-invalid"], undefined);
});

test("Input works uncontrolled and controlled inside FormData", async () => {
  const ref = { current: null };
  const view = await mount(
    h(
      "form",
      { id: "f" },
      h(Input, { name: "first", defaultValue: "Ana", ref }),
      h(Input, { name: "second", value: "Ruth", onChange() {} }),
    ),
  );
  const data = new FormData(view.container.querySelector("form"));
  assert.equal(data.get("first"), "Ana");
  assert.equal(data.get("second"), "Ruth");
  assert.equal(ref.current.tagName, "INPUT");
  await view.unmount();
});

test("Label, VisuallyHidden", () => {
  assert.equal(
    markup(h(Label, { htmlFor: "x", required: true }, "Email")),
    '<label for="x" class="neshel-label">Email<span class="neshel-label-required" aria-hidden="true">*</span></label>',
  );
  assert.equal(
    markup(h(VisuallyHidden, null, "Hidden")),
    '<span class="neshel-visually-hidden">Hidden</span>',
  );
});

test("Separator: semantic by default, decorative role none, vertical orientation", () => {
  assert.equal(
    markup(h(Separator)),
    '<div role="separator" data-orientation="horizontal" class="neshel-rule neshel-rule-horizontal"></div>',
  );
  assert.equal(
    markup(h(Separator, { orientation: "vertical" })),
    '<div role="separator" aria-orientation="vertical" data-orientation="vertical" class="neshel-rule neshel-rule-vertical"></div>',
  );
  assert.match(
    markup(h(Separator, { orientation: "vertical", decorative: true })),
    /^<div role="none"/,
  );
  assert.match(
    String(renderError(h(Separator, { orientation: "diagonal" }))),
    /invalid value "diagonal"/,
  );
});

test("Skeleton: aria-hidden, shapes and dimensions", () => {
  assert.equal(markup(h(Skeleton)), '<span aria-hidden="true" class="neshel-skeleton"></span>');
  assert.equal(
    markup(h(Skeleton, { shape: "circle", width: 40 })),
    '<span aria-hidden="true" style="inline-size:40px" class="neshel-skeleton neshel-skeleton-shape-circle"></span>',
  );
  assert.match(
    markup(h(Skeleton, { shape: "text", width: "60%", height: "1rem" })),
    /inline-size:60%;block-size:1rem/,
  );
  assert.match(String(renderError(h(Skeleton, { width: -1 }))), /non-negative number/);
});
