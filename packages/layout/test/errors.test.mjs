// Runtime validation (FR-012, FR-023, FR-031; contracts/layout-api.md §Errors), server/client
// parity and hydration consistency.
import assert from "node:assert/strict";
import test from "node:test";
import { h, layout, renderError, renderToString, setupDom } from "./helpers.mjs";

const { Box, Center, Container, Flex, Grid, Inline, Stack } = layout;

const cases = [
  [Stack, { space: "4", spaceX: "2" }, /<Stack>: "space" cannot be combined with "spaceX"\./],
  [Inline, { space: "4", spaceY: "2" }, /<Inline>: "space" cannot be combined with "spaceY"\./],
  [
    Grid,
    { space: "4", spaceX: "2", spaceY: "3" },
    /"space" cannot be combined with "spaceX" or "spaceY"/,
  ],
  [Flex, { space: { md: "4" }, spaceX: { lg: "2" } }, /<Flex>: "space" cannot be combined/],
  [Center, { space: "1", spaceY: "1" }, /<Center>: "space" cannot be combined/],
  [Stack, { space: "7" }, /invalid value "7" for "space"; expected one of: "0", "0.5"/],
  [Stack, { space: 4 }, /invalid value 4 for "space"/],
  [Grid, { columns: 13 }, /invalid value 13 for "columns"/],
  [Grid, { columns: "2" }, /invalid value "2" for "columns"/],
  [Grid, { columns: { md: 0 } }, /invalid value 0 for "columns" at breakpoint "md"/],
  [
    Stack,
    { space: { tablet: "4" } },
    /unknown breakpoint "tablet" in "space"; expected one of: base, sm, md, lg, xl, 2xl/,
  ],
  [Stack, { alignY: "stretch" }, /invalid value "stretch" for "alignY"/],
  [Stack, { alignX: "baseline" }, /invalid value "baseline" for "alignX"/],
  [Inline, { alignX: "between" }, /invalid value "between" for "alignX"/],
  [Inline, { justify: "space-between" }, /invalid value "space-between" for "justify"/],
  [Center, { justify: "between", alignX: "stretch" }, /invalid value "stretch" for "alignX"/],
  [Box, { display: "flex" }, /invalid value "flex" for "display"/],
  [Container, { size: "3xl" }, /invalid value "3xl" for "size"/],
  [Flex, { direction: "vertical" }, /invalid value "vertical" for "direction"/],
  [Flex, { wrap: "yes" }, /invalid value "yes" for "wrap"/],
  [
    Flex,
    { alignX: "stretch" },
    /"alignX" value "stretch" maps to justify-content \(main axis\) at breakpoint "base" where direction is "row"/,
  ],
  [
    Flex,
    { direction: { base: "row", md: "column" }, alignY: "baseline" },
    /"alignY" value "baseline" maps to justify-content \(main axis\) at breakpoint "md" where direction is "column"/,
  ],
];

test("every invalid combination throws NeshelLayoutError naming the props (SC-003)", () => {
  for (const [Component, props, message] of cases) {
    const error = renderError(h(Component, props, "x"));
    assert.ok(error, `${Component.name} ${JSON.stringify(props)} did not throw`);
    assert.equal(error.name, "NeshelLayoutError");
    assert.ok(error instanceof Error);
    assert.match(error.message, /^\[@neshel-ui\/layout\] <\w+>: /);
    assert.match(error.message, message);
  }
});

test("null means absent for layout props", () => {
  for (const props of [
    { space: null, spaceX: "2" },
    { space: "2", spaceX: null, spaceY: undefined },
    { alignX: null, justify: null },
  ]) {
    assert.equal(renderError(h(Stack, props, "x")), undefined, JSON.stringify(props));
  }
  assert.equal(
    renderError(h(Flex, { justify: "between", alignX: "stretch" })),
    undefined,
    "justify takes precedence over the main-axis alignX value",
  );
});

async function clientError(element) {
  await setupDom();
  const { act } = await import("react");
  const { createRoot } = await import("react-dom/client");
  const container = document.createElement("div");
  let caught;
  const root = createRoot(container, { onUncaughtError: (error) => (caught = error) });
  try {
    await act(async () => root.render(element));
  } catch (error) {
    caught ??= error; // act() rethrows render errors
  }
  await act(async () => root.unmount());
  return caught;
}

test("the client throws the same errors as the server (FR-012)", async () => {
  for (const [Component, props] of cases.slice(0, 6)) {
    const server = renderError(h(Component, props, "x"));
    const client = await clientError(h(Component, props, "x"));
    assert.equal(client?.name, "NeshelLayoutError");
    assert.equal(client.message, server.message);
  }
});

function App() {
  return h(
    Container,
    { as: "main", size: { base: "full", lg: "lg" }, gutter: { base: "4", md: "8" } },
    h(
      Stack,
      { space: { base: "4", md: "8" }, separator: true },
      h(
        Inline,
        {
          as: "nav",
          "aria-label": "Main",
          justify: "between",
          align: "center",
          separator: h("span", { "aria-hidden": "true" }, "·"),
        },
        h("a", { href: "#a" }, "A"),
        false,
        h("a", { href: "#b" }, "B"),
      ),
      h(
        Grid,
        { columns: { base: 1, md: 3 }, spaceX: "4", spaceY: "2" },
        h(Box, null, "1"),
        h(Box, { display: { base: "none", md: "block" } }, "2"),
        h(Box, null, "3"),
      ),
      h(
        Flex,
        { direction: { base: "column", md: "row" }, alignX: "center", wrap: { md: true } },
        h(Center, { asChild: true }, h("section", { "aria-label": "c" }, "c")),
      ),
      h(
        Stack,
        { asChild: true, separator: true },
        h("ul", null, h("li", null, "x"), h("li", null, "y")),
      ),
    ),
  );
}

test("server markup hydrates without mismatch or React warnings", async () => {
  await setupDom();
  const { act } = await import("react");
  const { hydrateRoot } = await import("react-dom/client");
  const html = renderToString(h(App));
  const container = document.createElement("div");
  container.innerHTML = html;
  document.body.appendChild(container);
  const recoverable = [];
  const consoleErrors = [];
  const original = console.error;
  console.error = (...args) => consoleErrors.push(args.join(" "));
  try {
    await act(async () => {
      hydrateRoot(container, h(App), { onRecoverableError: (error) => recoverable.push(error) });
    });
  } finally {
    console.error = original;
  }
  assert.deepEqual(recoverable, []);
  assert.deepEqual(consoleErrors, []);
  assert.equal(container.innerHTML, html);
  container.remove();
});
