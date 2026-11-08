// Separators on Stack and Inline (FR-060–FR-066; ADR 0009 §5).
import assert from "node:assert/strict";
import test from "node:test";
import { Fragment } from "react";
import { h, layout, markup, renderError, setupDom } from "./helpers.mjs";

const { Inline, Stack } = layout;
const SEP_H = '<div aria-hidden="true" class="neshel-separator neshel-separator-horizontal"></div>';
const SEP_V = '<div aria-hidden="true" class="neshel-separator neshel-separator-vertical"></div>';

const inner = (html) => html.replace(/^<[^>]+>/, "").replace(/<\/[a-z]+>$/, "");

function List({ children, ...rest }) {
  return h("ul", rest, children);
}

test("separators appear only between items: 0, 1 and n children (FR-061)", () => {
  assert.equal(inner(markup(h(Stack, { separator: true }))), "");
  assert.equal(inner(markup(h(Stack, { separator: true }, h("p", null, "A")))), "<p>A</p>");
  assert.equal(
    inner(
      markup(
        h(Stack, { separator: true }, h("p", null, "A"), h("p", null, "B"), h("p", null, "C")),
      ),
    ),
    `<p>A</p>${SEP_H}<p>B</p>${SEP_H}<p>C</p>`,
  );
});

test("conditional children (null, undefined, booleans, empty strings) are skipped (FR-061)", () => {
  const html = markup(
    h(
      Stack,
      { separator: true },
      h("p", null, "A"),
      false,
      null,
      "",
      undefined,
      h("p", null, "B"),
      true,
      null,
    ),
  );
  assert.equal(inner(html), `<p>A</p>${SEP_H}<p>B</p>`);
  assert.equal(inner(markup(h(Stack, { separator: true }, null, false, ""))), "");
  assert.equal(
    inner(markup(h(Inline, { separator: true }, "text", 0, h("b", null, "x")))),
    `text${SEP_V}0${SEP_V}<b>x</b>`,
  );
});

test("orientation: Stack horizontal, Inline vertical; decorative and hidden from AT (FR-063)", () => {
  assert.ok(markup(h(Stack, { separator: true }, "a", "b")).includes(SEP_H));
  assert.ok(markup(h(Inline, { separator: true }, "a", "b")).includes(SEP_V));
});

test("default separator tag follows the host: li in lists, span in span, else div (FR-063)", () => {
  assert.match(
    markup(h(Stack, { as: "ul", separator: true }, h("li", null, "a"), h("li", null, "b"))),
    /<\/li><li aria-hidden="true" class="neshel-separator neshel-separator-horizontal"><\/li><li>/,
  );
  assert.match(
    markup(h(Inline, { as: "ol", separator: true }, h("li", null, "a"), h("li", null, "b"))),
    /<li aria-hidden="true"/,
  );
  assert.match(
    markup(h(Inline, { as: "span", separator: true }, "a", "b")),
    /<span aria-hidden="true"/,
  );
  assert.match(
    markup(h(Inline, { as: "nav", separator: true }, "a", "b")),
    /<div aria-hidden="true"/,
  );
});

test("custom separators are inserted unchanged (FR-060, FR-063)", () => {
  const html = markup(
    h(
      Inline,
      { separator: h("span", { "aria-hidden": "true", className: "bar" }, "|"), space: "3" },
      "a",
      "b",
      "c",
    ),
  );
  assert.equal(
    inner(html),
    'a<span aria-hidden="true" class="bar">|</span>b<span aria-hidden="true" class="bar">|</span>c',
  );
  // A custom separator keeps its own semantics (here: a real, exposed separator role).
  assert.match(markup(h(Stack, { separator: h("hr") }, "a", "b")), /a<hr\/>b/);
});

test("separator={false} or undefined leaves children untouched (no re-keying)", async () => {
  const keyed = [h("p", { key: "a" }, "A"), h("p", { key: "b" }, "B")];
  assert.equal(inner(markup(h(Stack, { separator: false }, keyed))), "<p>A</p><p>B</p>");
  assert.equal(inner(markup(h(Stack, null, "", "x"))), "x");
});

test("item keys are preserved and separators get stable keys across re-renders (FR-062)", async () => {
  await setupDom();
  const { act } = await import("react");
  const { createRoot } = await import("react-dom/client");
  const items = (ids) => ids.map((id) => h("p", { key: id }, id));
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => root.render(h(Stack, { separator: true }, items(["a", "b", "c"]))));
  const first = Object.fromEntries(
    [...container.querySelectorAll("p")].map((p) => [p.textContent, p]),
  );
  await act(async () => root.render(h(Stack, { separator: true }, items(["c", "a"]))));
  const after = [...container.querySelectorAll("p")];
  assert.deepEqual(
    after.map((p) => p.textContent),
    ["c", "a"],
  );
  assert.equal(after[0], first.c, "item c reused by key");
  assert.equal(after[1], first.a, "item a reused by key");
  assert.equal(container.querySelectorAll("[aria-hidden]").length, 1);
  assert.equal(container.firstChild.children.length, 3);
  await act(async () => root.unmount());
  container.remove();
});

test("separator + asChild inserts separators into a DOM element child (FR-064)", () => {
  const html = markup(
    h(
      Stack,
      { asChild: true, separator: true, space: "2" },
      h("ul", { className: "list" }, h("li", null, "a"), h("li", null, "b")),
    ),
  );
  assert.equal(
    html,
    '<ul class="neshel-stack neshel-gap-2 list"><li>a</li><li aria-hidden="true" class="neshel-separator neshel-separator-horizontal"></li><li>b</li></ul>',
  );
});

test("separator + asChild with a component child throws (FR-064)", () => {
  const error = renderError(h(Stack, { asChild: true, separator: true }, h(List, null, "a", "b")));
  assert.equal(error?.name, "NeshelLayoutError");
  assert.match(error.message, /<Stack>: "separator" with "asChild" requires a DOM element child/);
  // Without a separator the same component child is fine.
  assert.equal(
    markup(h(Stack, { asChild: true }, h(List, null, "a"))),
    '<ul class="neshel-stack">a</ul>',
  );
});

test("separator + wrap throws for any truthy wrap value (FR-064)", () => {
  for (const wrap of [true, { md: true }, { base: false, lg: true }]) {
    const error = renderError(h(Inline, { separator: true, wrap }, "a", "b"));
    assert.equal(error?.name, "NeshelLayoutError");
    assert.match(error.message, /<Inline>: "separator" cannot be combined with "wrap"/);
  }
  assert.doesNotThrow(() => markup(h(Inline, { separator: true, wrap: false }, "a", "b")));
  assert.doesNotThrow(() => markup(h(Inline, { separator: false, wrap: true }, "a", "b")));
});

test("invalid separator values throw (FR-066)", () => {
  for (const separator of ["|", 1, {}]) {
    const error = renderError(h(Stack, { separator }, "a", "b"));
    assert.equal(error?.name, "NeshelLayoutError", String(separator));
    assert.match(error.message, /"separator" must be a boolean or a React element/);
  }
});

test("separators combine with spacing and responsive props without extra wrappers (FR-065)", () => {
  const html = markup(
    h(
      Stack,
      { separator: true, spaceY: { base: "2", md: "4" }, alignX: "center" },
      h("p", null, "a"),
      h("p", null, "b"),
    ),
  );
  assert.match(html, /^<div class="[^"]*neshel-gap-y-2[^"]*neshel-md-gap-y-4/);
  assert.equal((html.match(/<p>/g) ?? []).length, 2);
  assert.equal((html.match(/aria-hidden/g) ?? []).length, 1);
});

test("a Fragment counts as one item (documented limitation)", () => {
  const html = markup(
    h(
      Stack,
      { separator: true },
      h(Fragment, null, h("p", null, "a"), h("p", null, "b")),
      h("p", null, "c"),
    ),
  );
  assert.equal(inner(html), `<p>a</p><p>b</p>${SEP_H}<p>c</p>`);
});
