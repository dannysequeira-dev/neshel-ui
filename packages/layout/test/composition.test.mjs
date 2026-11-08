// as / asChild / refs (FR-002, FR-007, FR-050–FR-053; ADR 0009). Client behaviour under jsdom.
import assert from "node:assert/strict";
import test from "node:test";
import { Fragment } from "react";
import { firstElement, h, layout, markup, mount, renderError } from "./helpers.mjs";

const { Box, Center, Container, Flex, Grid, Inline, Stack } = layout;
const ALL = { Box, Flex, Stack, Inline, Grid, Center, Container };

function Card({ ref, className, children, ...rest }) {
  return h(
    "article",
    { ref, className: ["card", className].filter(Boolean).join(" "), ...rest },
    children,
  );
}

function Opaque() {
  return h("div", null, "content");
}

test("refs resolve to the rendered DOM element for every primitive (FR-007)", async () => {
  for (const [name, Component] of Object.entries(ALL)) {
    const ref = { current: null };
    const callback = [];
    const view = await mount(
      h(
        Fragment,
        null,
        h(Component, { ref, id: `${name}-a` }),
        h(Component, {
          ref: (node) => callback.push(node),
          as: "section",
          id: `${name}-b`,
        }),
      ),
    );
    assert.equal(ref.current, view.container.querySelector(`#${name}-a`), name);
    assert.equal(ref.current.tagName, "DIV");
    assert.equal(callback[0]?.tagName, "SECTION", `${name} callback ref`);
    await view.unmount();
  }
});

test("asChild renders the child element itself, with layout classes and its own attributes", () => {
  const html = markup(
    h(
      Stack,
      { asChild: true, space: "4", className: "from-stack", "data-stack": "yes" },
      h("section", { "aria-label": "Settings", className: "from-child" }, h("p", null, "Profile")),
    ),
  );
  assert.equal(
    html,
    '<section aria-label="Settings" class="neshel-stack neshel-gap-4 from-stack from-child" data-stack="yes"><p>Profile</p></section>',
  );
  for (const [name, Component] of Object.entries(ALL)) {
    const { tag } = firstElement(markup(h(Component, { asChild: true }, h("article"))));
    assert.equal(tag, "article", name);
  }
});

test("asChild composes refs and handlers, merges style with child precedence (FR-050)", async () => {
  const outer = { current: null };
  const inner = { current: null };
  const calls = [];
  const view = await mount(
    h(
      Inline,
      {
        asChild: true,
        ref: outer,
        style: { color: "red", padding: "1px" },
        onClick: () => calls.push("layout"),
      },
      h(
        "nav",
        {
          ref: inner,
          style: { color: "blue" },
          onClick: () => calls.push("child"),
          "aria-label": "Main",
        },
        "x",
      ),
    ),
  );
  const nav = view.container.querySelector("nav");
  assert.equal(outer.current, nav);
  assert.equal(inner.current, nav);
  nav.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  assert.deepEqual(calls, ["child", "layout"]);
  assert.equal(nav.style.color, "blue");
  assert.equal(nav.style.padding, "1px");
  assert.equal(nav.getAttribute("aria-label"), "Main");
  assert.equal(view.container.children.length, 1, "no wrapper element");
  await view.unmount();
});

test("asChild works with a custom component that forwards props and ref (React 19)", async () => {
  const ref = { current: null };
  const view = await mount(
    h(Grid, { asChild: true, columns: 2, ref, id: "grid" }, h(Card, { title: "Card" }, "a", "b")),
  );
  const article = view.container.querySelector("article");
  assert.equal(ref.current, article);
  assert.equal(article.id, "grid");
  assert.equal(article.title, "Card");
  assert.deepEqual([...article.classList].sort(), ["card", "neshel-cols-2", "neshel-grid"]);
  await view.unmount();
});

test("limitation: a child that does not forward className loses the layout styles (FR-053)", () => {
  assert.equal(markup(h(Stack, { asChild: true, space: "4" }, h(Opaque))), "<div>content</div>");
});

test("asChild rejects zero, several, text, Fragment and non-element children (FR-051)", () => {
  const cases = [
    [undefined, /exactly one React element child \(received no children\)/],
    [
      [h("a", { key: 1 }), h("b", { key: 2 })],
      /exactly one React element child \(received 2 children\)/,
    ],
    ["text", /received text/],
    [h(Fragment, null, h("a"), h("b")), /not a Fragment/],
    [[h("a", { key: 1 })], /exactly one React element child/],
  ];
  for (const [children, message] of cases) {
    const error = renderError(h(Stack, { asChild: true }, children));
    assert.equal(error?.name, "NeshelLayoutError", String(message));
    assert.match(error.message, /^\[@neshel-ui\/layout\] <Stack>: /);
    assert.match(error.message, message);
  }
});

test("as and asChild together throw, for every primitive (FR-052)", () => {
  for (const [name, Component] of Object.entries(ALL)) {
    const error = renderError(h(Component, { as: "nav", asChild: true }, h("div")));
    assert.equal(error?.name, "NeshelLayoutError", name);
    assert.match(error.message, new RegExp(`<${name}>: "as" and "asChild" cannot be combined`));
  }
  // `as={null}` with asChild is not a conflict (null means absent).
  assert.equal(markup(h(Box, { as: null, asChild: true }, h("p"))), "<p></p>");
});

test("as rejects elements outside the LayoutElement union", () => {
  const error = renderError(h(Flex, { as: "button" }));
  assert.equal(error?.name, "NeshelLayoutError");
  assert.match(error.message, /invalid value "button" for "as"/);
});

test("event handlers and ARIA attributes work without asChild", async () => {
  const calls = [];
  const view = await mount(
    h(
      Center,
      { as: "section", "aria-labelledby": "t", onClick: () => calls.push(1) },
      h("h2", { id: "t" }, "T"),
    ),
  );
  const section = view.container.querySelector("section");
  section.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  assert.deepEqual(calls, [1]);
  assert.equal(section.getAttribute("aria-labelledby"), "t");
  await view.unmount();
});
