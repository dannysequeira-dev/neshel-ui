// as / asChild / refs, SSR and hydration (FR-031, FR-033; ADR 0009). Client behaviour under jsdom.
import assert from "node:assert/strict";
import test from "node:test";
import { Fragment } from "react";
import {
  firstElement,
  h,
  markup,
  mount,
  renderToString,
  setupDom,
  typography,
} from "./helpers.mjs";

const { Caption, Heading, Paragraph, Text } = typography;
const ALL = { Heading, Paragraph, Caption, Text };

function Link({ ref, className, children, ...rest }) {
  return h(
    "a",
    { ref, className: ["link", className].filter(Boolean).join(" "), ...rest },
    children,
  );
}

test("refs resolve to the rendered DOM element, with and without as", async () => {
  for (const [name, Component] of Object.entries(ALL)) {
    const ref = { current: null };
    const seen = [];
    const as = { Heading: "h4", Paragraph: "div", Caption: "figcaption", Text: "strong" }[name];
    const view = await mount(
      h(
        Fragment,
        null,
        h(Component, { ref, id: `${name}-a` }, "a"),
        h(Component, { ref: (node) => seen.push(node), as, id: `${name}-b` }, "b"),
      ),
    );
    assert.equal(ref.current, view.container.querySelector(`#${name}-a`), name);
    assert.equal(seen[0]?.tagName, as.toUpperCase(), `${name} callback ref`);
    await view.unmount();
  }
});

test("asChild: no wrapper, merged className/style, child attributes and handlers, composed refs", async () => {
  const html = markup(
    h(
      Text,
      {
        asChild: true,
        tone: "primary",
        className: "from-text",
        style: { color: "red", margin: 1 },
      },
      h(
        "a",
        { href: "/docs", className: "from-child", style: { color: "blue" } },
        "Read documentation",
      ),
    ),
  );
  assert.equal(
    html,
    '<a href="/docs" class="neshel-typography neshel-text-tone-primary from-text from-child" style="color:blue;margin:1px">Read documentation</a>',
  );

  const calls = [];
  const slotRef = { current: null };
  const childRef = { current: null };
  const view = await mount(
    h(
      Text,
      {
        asChild: true,
        ref: slotRef,
        onClick: () => calls.push("slot"),
        size: "sm",
        weight: "medium",
      },
      h("a", { href: "/docs", ref: childRef, onClick: () => calls.push("child") }, "Docs"),
    ),
  );
  const anchor = view.container.querySelector("a");
  assert.equal(view.container.children.length, 1);
  assert.equal(slotRef.current, anchor);
  assert.equal(childRef.current, anchor);
  anchor.click();
  assert.deepEqual(calls, ["child", "slot"]);
  assert.equal(anchor.getAttribute("href"), "/docs");
  await view.unmount();
});

test("asChild with a forwarding component and with figcaption", () => {
  const html = markup(h(Text, { asChild: true, weight: "bold" }, h(Link, { href: "/x" }, "x")));
  assert.match(
    html,
    /^<a class="link neshel-typography neshel-text-weight-bold" href="\/x">x<\/a>$/,
  );
  assert.equal(
    firstElement(markup(h(Caption, { asChild: true }, h("figcaption", null, "F")))).tag,
    "figcaption",
  );
});

test("server markup hydrates on the client without mismatch or recoverable errors", async () => {
  await setupDom();
  const { act } = await import("react");
  const { hydrateRoot } = await import("react-dom/client");
  const tree = h(
    "main",
    null,
    h(Heading, { as: "h1", size: { base: "xl", md: "3xl", tablet: "4xl" } }, "Welcome"),
    h(Paragraph, { tone: "muted", measure: "comfortable" }, "Rooted in faith. Built with hope."),
    h(Text, { asChild: true }, h("a", { href: "/docs" }, "Docs")),
    h(Caption, { truncate: true }, "Updated recently"),
  );
  const container = document.createElement("div");
  container.innerHTML = renderToString(tree);
  document.body.appendChild(container);
  const errors = [];
  const consoleErrors = [];
  const original = console.error;
  console.error = (...args) => consoleErrors.push(args.join(" "));
  try {
    await act(async () => {
      hydrateRoot(container, tree, { onRecoverableError: (error) => errors.push(String(error)) });
    });
  } finally {
    console.error = original;
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(consoleErrors, []);
  assert.equal(
    container.querySelector("h1").className.includes("neshel-tablet-text-size-4xl"),
    true,
  );
});

test("the client throws the same errors as the server", async () => {
  const element = h(Heading, { size: "huge" });
  let serverError;
  try {
    markup(element);
  } catch (error) {
    serverError = error;
  }
  await setupDom();
  const { act } = await import("react");
  const { createRoot } = await import("react-dom/client");
  const container = document.createElement("div");
  let clientError;
  const root = createRoot(container, { onUncaughtError: (error) => (clientError = error) });
  try {
    await act(async () => root.render(element));
  } catch (error) {
    clientError ??= error; // act() rethrows render errors
  }
  await act(async () => root.unmount());
  assert.equal(clientError?.name, "NeshelTypographyError");
  assert.equal(clientError?.message, serverError?.message);
});
