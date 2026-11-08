// Layout computed-style cases for check:browser (feature 003 SC-001; contracts/layout-css.md).
// Each case builds an element with the packed/built layout components (`build(h, L)`), is rendered
// to static HTML in Node and probed in headless Chrome at the listed viewport widths.
// Pure data and helpers, plus `probeLayout` which drives a CDP page.

/** Viewport widths covering every breakpoint (rem = 16px): base, sm, md, lg, xl, 2xl. */
export const WIDTHS = { base: 360, sm: 700, md: 800, lg: 1100, xl: 1300, "2xl": 1600 };

const px = (n) => `${n}px`;
const box = (h, i, size = [40, 20]) =>
  h("div", { "data-item": i, key: i, style: { width: px(size[0]), height: px(size[1]) } });
const boxes = (h, n, size) => Array.from({ length: n }, (_, i) => box(h, i, size));

const near = (a, b, tolerance = 0.6) => Math.abs(a - b) <= tolerance;

/** Assertion helpers return an error string or null. */
function eq(label, actual, expected) {
  return actual === expected ? null : `${label}: got ${actual}, expected ${expected}`;
}
function close(label, actual, expected) {
  return near(actual, expected) ? null : `${label}: got ${actual}, expected ≈${expected}`;
}
const tracks = (value) => (value === "none" ? 0 : value.trim().split(/\s+/).length);

/**
 * Cases: `wrapper` styles the parent of the primitive; `checks` run at a viewport width and get
 * the probe snapshot `s` = { viewport, root, items[], seps[], order[] } plus `ctx` (expected colours).
 */
export const LAYOUT_CASES = [
  {
    id: "stack-basic",
    wrapper: { width: "200px" },
    build: (h, L) => h(L.Stack, { space: "4" }, boxes(h, 3)),
    checks: [
      {
        width: WIDTHS.base,
        expect: (s) => [
          eq("display", s.root.styles.display, "flex"),
          eq("flex-direction", s.root.styles.flexDirection, "column"),
          eq("row-gap", s.root.styles.rowGap, "16px"),
          eq("column-gap", s.root.styles.columnGap, "16px"),
          close("item spacing", s.items[1].rect.top - s.items[0].rect.bottom, 16),
        ],
      },
    ],
  },
  {
    id: "inline-wrap",
    wrapper: { width: "120px" },
    build: (h, L) => h(L.Inline, { spaceX: "4", spaceY: "2", wrap: true }, boxes(h, 3)),
    checks: [
      {
        width: WIDTHS.base,
        expect: (s) => [
          eq("display", s.root.styles.display, "flex"),
          eq("flex-direction", s.root.styles.flexDirection, "row"),
          eq("flex-wrap", s.root.styles.flexWrap, "wrap"),
          eq("column-gap", s.root.styles.columnGap, "16px"),
          eq("row-gap", s.root.styles.rowGap, "8px"),
          close("x gap", s.items[1].rect.left - s.items[0].rect.right, 16),
          close("wrapped line", s.items[2].rect.top - s.items[0].rect.bottom, 8),
        ],
      },
    ],
  },
  {
    id: "flex-direction",
    wrapper: { width: "300px" },
    build: (h, L) =>
      h(L.Flex, { direction: { base: "column", md: "row" }, alignX: "center" }, boxes(h, 2)),
    checks: [
      {
        width: WIDTHS.base,
        expect: (s) => [
          eq("flex-direction", s.root.styles.flexDirection, "column"),
          eq("align-items", s.root.styles.alignItems, "center"),
          eq("justify-content", s.root.styles.justifyContent, "normal"),
          close("x centred", s.items[0].rect.left + 20, s.root.rect.left + 150),
        ],
      },
      {
        width: WIDTHS.md,
        expect: (s) => [
          eq("flex-direction", s.root.styles.flexDirection, "row"),
          eq("justify-content", s.root.styles.justifyContent, "center"),
          eq("align-items", s.root.styles.alignItems, "normal"),
          close("x centred", s.items[0].rect.left, s.root.rect.left + 110),
        ],
      },
    ],
  },
  {
    id: "flex-row-reverse",
    wrapper: { width: "300px" },
    build: (h, L) => h(L.Flex, { direction: "row-reverse", alignX: "start" }, boxes(h, 2)),
    checks: [
      {
        width: WIDTHS.base,
        // Logical `start` packs items at the inline-start edge even when the row is reversed.
        expect: (s) => [
          eq("justify-content", s.root.styles.justifyContent, "start"),
          close("packed left", Math.min(...s.items.map((i) => i.rect.left)), s.root.rect.left),
          eq("reversed order", s.items[0].rect.left > s.items[1].rect.left, true),
        ],
      },
    ],
  },
  {
    id: "inline-rtl",
    wrapper: { width: "300px", direction: "rtl" },
    build: (h, L) => h(L.Inline, { alignX: "start", space: "2" }, boxes(h, 2)),
    checks: [
      {
        width: WIDTHS.base,
        expect: (s) => [
          close("starts at the right edge", s.items[0].rect.right, s.root.rect.right),
        ],
      },
    ],
  },
  {
    id: "inline-justify",
    wrapper: { width: "300px", height: "60px", display: "flex" },
    build: (h, L) =>
      h(L.Inline, { justify: "between", align: "center", style: { flex: "1" } }, boxes(h, 3)),
    checks: [
      {
        width: WIDTHS.base,
        expect: (s) => [
          eq("justify-content", s.root.styles.justifyContent, "space-between"),
          eq("align-items", s.root.styles.alignItems, "center"),
          close("first at start", s.items[0].rect.left, s.root.rect.left),
          close("last at end", s.items[2].rect.right, s.root.rect.right),
          close("y centred", s.items[0].rect.top, s.root.rect.top + 20),
        ],
      },
    ],
  },
  {
    id: "stack-align",
    wrapper: { width: "200px" },
    build: (h, L) => h(L.Stack, { alignX: { base: "end", lg: "center" } }, boxes(h, 1)),
    checks: [
      {
        width: WIDTHS.base,
        expect: (s) => [
          eq("align-items", s.root.styles.alignItems, "end"),
          close("right aligned", s.items[0].rect.right, s.root.rect.right),
        ],
      },
      {
        width: WIDTHS.lg,
        expect: (s) => [
          eq("align-items", s.root.styles.alignItems, "center"),
          close("centred", s.items[0].rect.left, s.root.rect.left + 80),
        ],
      },
    ],
  },
  {
    id: "grid-responsive",
    wrapper: { width: "320px" },
    build: (h, L) =>
      h(L.Grid, { columns: { base: 1, md: 2, lg: 4 }, space: { base: "2", md: "4" } }, boxes(h, 4)),
    checks: [
      {
        width: WIDTHS.base,
        expect: (s) => [
          eq("display", s.root.styles.display, "grid"),
          eq("tracks", tracks(s.root.styles.gridTemplateColumns), 1),
          eq("gap", s.root.styles.rowGap, "8px"),
        ],
      },
      {
        width: WIDTHS.sm,
        expect: (s) => [
          eq("tracks", tracks(s.root.styles.gridTemplateColumns), 1),
          eq("gap", s.root.styles.rowGap, "8px"),
        ],
      },
      {
        width: WIDTHS.md,
        expect: (s) => [
          eq("tracks", tracks(s.root.styles.gridTemplateColumns), 2),
          eq("gap", s.root.styles.columnGap, "16px"),
          close("second column", s.items[1].rect.left, s.root.rect.left + 152 + 16),
        ],
      },
      {
        width: WIDTHS.lg,
        expect: (s) => [eq("tracks", tracks(s.root.styles.gridTemplateColumns), 4)],
      },
    ],
  },
  {
    id: "grid-align",
    wrapper: { width: "200px" },
    build: (h, L) =>
      h(L.Grid, { columns: 2, alignX: "center", alignY: "end", spaceX: "4", spaceY: "1" }, [
        box(h, 0, [20, 10]),
        box(h, 1, [20, 40]),
      ]),
    checks: [
      {
        width: WIDTHS.base,
        expect: (s) => [
          eq("justify-items", s.root.styles.justifyItems, "center"),
          eq("align-items", s.root.styles.alignItems, "end"),
          eq("column-gap", s.root.styles.columnGap, "16px"),
          eq("row-gap", s.root.styles.rowGap, "4px"),
          close("bottom aligned", s.items[0].rect.bottom, s.items[1].rect.bottom),
          close("centred in track", s.items[0].rect.left, s.root.rect.left + 36),
        ],
      },
    ],
  },
  {
    id: "center",
    wrapper: { width: "200px", height: "100px", display: "flex" },
    build: (h, L) => h(L.Center, { style: { flex: "1" } }, boxes(h, 1, [20, 20])),
    checks: [
      {
        width: WIDTHS.base,
        expect: (s) => [
          eq("align-items", s.root.styles.alignItems, "center"),
          eq("justify-content", s.root.styles.justifyContent, "center"),
          close("x", s.items[0].rect.left, s.root.rect.left + 90),
          close("y", s.items[0].rect.top, s.root.rect.top + 40),
        ],
      },
    ],
  },
  {
    id: "container",
    wrapper: {},
    build: (h, L) => h(L.Container, { size: "lg", gutter: "4" }, boxes(h, 1)),
    checks: [
      {
        width: WIDTHS.base,
        expect: (s) => [
          eq("max-width", s.root.styles.maxWidth, "1024px"),
          eq("padding-inline", s.root.styles.paddingLeft, "16px"),
          close("full width", s.root.rect.width, s.viewport),
        ],
      },
      {
        width: WIDTHS.xl,
        expect: (s) => [
          close("width", s.root.rect.width, 1024),
          close("centred", s.root.rect.left, (s.viewport - 1024) / 2),
          eq("margins equal", s.root.styles.marginLeft, s.root.styles.marginRight),
        ],
      },
    ],
  },
  {
    id: "container-responsive",
    wrapper: {},
    build: (h, L) => h(L.Container, { size: { base: "full", xl: "md" } }, boxes(h, 1)),
    checks: [
      { width: WIDTHS.lg, expect: (s) => [eq("max-width", s.root.styles.maxWidth, "none")] },
      { width: WIDTHS.xl, expect: (s) => [eq("max-width", s.root.styles.maxWidth, "768px")] },
    ],
  },
  {
    id: "box-display",
    wrapper: {},
    build: (h, L) => h(L.Box, { as: "span", display: { base: "none", md: "block" } }, "x"),
    checks: [
      { width: WIDTHS.base, expect: (s) => [eq("display", s.root.styles.display, "none")] },
      { width: WIDTHS.sm, expect: (s) => [eq("display", s.root.styles.display, "none")] },
      { width: WIDTHS.md, expect: (s) => [eq("display", s.root.styles.display, "block")] },
    ],
  },
  {
    id: "separator-stack",
    wrapper: { width: "200px" },
    build: (h, L) => h(L.Stack, { separator: true, space: "4" }, boxes(h, 3)),
    checks: [
      {
        width: WIDTHS.base,
        expect: (s, ctx) => [
          eq("separators", s.seps.length, 2),
          eq("order", s.order.join(","), "item,sep,item,sep,item"),
          eq("border-top-width", s.seps[0].styles.borderTopWidth, "1px"),
          eq("border-left-width", s.seps[0].styles.borderLeftWidth, "0px"),
          eq("colour (light)", s.seps[0].styles.borderTopColor, ctx.border.light),
          close("full width", s.seps[0].rect.width, 200),
          close("gap before", s.seps[0].rect.top - s.items[0].rect.bottom, 16),
          close("gap after", s.items[1].rect.top - s.seps[0].rect.bottom, 16),
        ],
      },
    ],
  },
  {
    id: "separator-inline-dark",
    wrapper: { width: "300px" },
    theme: "dark",
    build: (h, L) => h(L.Inline, { separator: true, space: "2" }, boxes(h, 3)),
    checks: [
      {
        width: WIDTHS.base,
        expect: (s, ctx) => [
          eq("separators", s.seps.length, 2),
          eq("border-left-width", s.seps[0].styles.borderLeftWidth, "1px"),
          eq("border-top-width", s.seps[0].styles.borderTopWidth, "0px"),
          eq("colour (dark, inherited theme)", s.seps[0].styles.borderLeftColor, ctx.border.dark),
          close("full height", s.seps[0].rect.height, 20),
          close("gap before", s.seps[0].rect.left - s.items[0].rect.right, 8),
        ],
      },
    ],
  },
  {
    id: "separator-custom",
    wrapper: { width: "300px" },
    build: (h, L) =>
      h(
        L.Inline,
        { separator: h("span", { "data-sep": "", "aria-hidden": "true" }, "|"), space: "3" },
        boxes(h, 3),
      ),
    checks: [
      {
        width: WIDTHS.base,
        expect: (s) => [
          eq("separators", s.seps.length, 2),
          eq("order", s.order.join(","), "item,sep,item,sep,item"),
        ],
      },
    ],
  },
  {
    id: "separator-aschild-list",
    wrapper: { width: "200px" },
    build: (h, L) =>
      h(
        L.Stack,
        { asChild: true, separator: true, space: "2" },
        h("ul", null, [
          h("li", { "data-item": 0, key: "a" }, "a"),
          h("li", { "data-item": 1, key: "b" }, "b"),
        ]),
      ),
    checks: [
      {
        width: WIDTHS.base,
        expect: (s) => [
          eq("root tag", s.root.tag, "UL"),
          eq("flex-direction", s.root.styles.flexDirection, "column"),
          eq("separator tag", s.seps[0]?.tag, "LI"),
          eq("list-style", s.seps[0]?.styles.listStyleType, "none"),
          eq("order", s.order.join(","), "item,sep,item"),
        ],
      },
    ],
  },
  {
    id: "custom-spacing-token",
    wrapper: { width: "200px", "--neshel-spacing": "0.5rem" },
    build: (h, L) => h(L.Stack, { space: "4" }, boxes(h, 2)),
    checks: [
      // A scoped token change (e.g. from a custom theme) rescales every layout gap.
      { width: WIDTHS.base, expect: (s) => [eq("row-gap", s.root.styles.rowGap, "32px")] },
    ],
  },
];

const STYLE_PROPS = [
  "display",
  "flexDirection",
  "flexWrap",
  "rowGap",
  "columnGap",
  "alignItems",
  "justifyContent",
  "justifyItems",
  "gridTemplateColumns",
  "maxWidth",
  "marginLeft",
  "marginRight",
  "paddingLeft",
  "borderTopWidth",
  "borderTopColor",
  "borderLeftWidth",
  "borderLeftColor",
  "listStyleType",
];

const styleAttr = (style) =>
  Object.entries(style)
    .map(([key, value]) => `${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}: ${value}`)
    .join("; ");

/** Body markup: one wrapper per case with `data-case`. `render` = react-dom/server's renderer. */
export function layoutBody(cases, { h, L, render }) {
  return cases
    .map((testCase) => {
      const theme = testCase.theme ? ` data-neshel-theme="${testCase.theme}"` : "";
      const inner = render(testCase.build(h, L));
      return `<div data-case="${testCase.id}"${theme} style="${styleAttr(testCase.wrapper)}">${inner}</div>`;
    })
    .join("\n");
}

/** Browser-side snapshot of one case (serialisable). */
export function snapshotExpression(caseId) {
  return `(() => {
  const props = ${JSON.stringify(STYLE_PROPS)};
  const wrapper = document.querySelector('[data-case="${caseId}"]');
  if (!wrapper) return null;
  const root = wrapper.firstElementChild;
  const rect = (el) => { const r = el.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height }; };
  const styles = (el) => { const cs = getComputedStyle(el); return Object.fromEntries(props.map((p) => [p, cs[p]])); };
  const isSep = (el) => el.classList.contains("neshel-separator") || el.hasAttribute("data-sep");
  const children = [...root.children];
  return {
    viewport: document.documentElement.clientWidth,
    root: { tag: root.tagName, styles: styles(root), rect: rect(root) },
    items: children.filter((el) => el.hasAttribute("data-item")).map((el) => ({ rect: rect(el) })),
    seps: children.filter(isSep).map((el) => ({ tag: el.tagName, styles: styles(el), rect: rect(el) })),
    order: children.map((el) => (isSep(el) ? "sep" : el.hasAttribute("data-item") ? "item" : el.tagName)),
  };
})()`;
}

/** Group checks by viewport width so each width is set once per page. */
export function checksByWidth(cases) {
  const byWidth = new Map();
  for (const testCase of cases) {
    for (const check of testCase.checks) {
      if (!byWidth.has(check.width)) byWidth.set(check.width, []);
      byWidth.get(check.width).push({ testCase, check });
    }
  }
  return [...byWidth.entries()].sort(([a], [b]) => a - b);
}

/** Run the cases on a loaded page; returns { failures, assertions }. */
export async function probeLayout(page, cases, ctx, label) {
  const failures = [];
  let assertions = 0;
  for (const [width, entries] of checksByWidth(cases)) {
    await page.setViewport(width);
    for (const { testCase, check } of entries) {
      const snapshot = await page.evaluate(snapshotExpression(testCase.id));
      if (!snapshot) {
        failures.push(`${label} ${testCase.id}: case not found in the page`);
        continue;
      }
      let results;
      try {
        results = check.expect(snapshot, ctx);
      } catch (error) {
        results = [`snapshot incomplete (${error.message})`];
      }
      assertions += results.length;
      for (const result of results.filter(Boolean)) {
        failures.push(`${label} ${testCase.id} @${width}px: ${result}`);
      }
    }
  }
  return { failures, assertions };
}

/** Minimal stand-in for Tailwind's layer order, preflight margin reset and one utility. */
export const TAILWIND_STAND_IN = `@layer theme, base, components, utilities;
@layer base { *, ::before, ::after { margin: 0; padding: 0; box-sizing: border-box; } }
@layer utilities { .flex-row { flex-direction: row; } }`;

/** Cases for the import-order fixtures (ADR 0008 §5, research R3). */
export const ORDER_CASES = [
  {
    id: "order-container",
    wrapper: {},
    build: (h, L) => h(L.Container, { size: "md" }, boxes(h, 1)),
  },
  {
    id: "order-utility",
    wrapper: { width: "300px" },
    build: (h, L) => h(L.Stack, { className: "flex-row", space: "2" }, boxes(h, 2)),
  },
];

/** Expectations for ORDER_CASES: canonical order works; layout-before-Tailwind loses margins. */
export function orderChecks(canonical) {
  return [
    {
      ...ORDER_CASES[0],
      checks: [
        {
          width: WIDTHS.xl,
          expect: (s) =>
            canonical
              ? [close("centred (margin-inline: auto)", s.root.rect.left, (s.viewport - 768) / 2)]
              : [close("preflight margin wins (documented limitation)", s.root.rect.left, 0)],
        },
      ],
    },
    {
      ...ORDER_CASES[1],
      checks: [
        {
          width: WIDTHS.base,
          // Tailwind utilities override layout classes in both orders (utilities is last).
          expect: (s) => [eq("utility overrides layout", s.root.styles.flexDirection, "row")],
        },
      ],
    },
  ];
}

/** Tailwind consumer only: a utility class overrides the layout class (R3 layer contract). */
export const TAILWIND_OVERRIDE_CASE = {
  id: "tailwind-override",
  wrapper: { width: "300px" },
  build: (h, L) => h(L.Stack, { className: "flex-row", space: "2" }, boxes(h, 2)),
  checks: [
    {
      width: WIDTHS.base,
      expect: (s) => [
        eq("utility overrides layout", s.root.styles.flexDirection, "row"),
        eq("layout gap kept", s.root.styles.columnGap, "8px"),
      ],
    },
  ],
};
