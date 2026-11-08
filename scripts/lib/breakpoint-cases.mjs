// Responsive boundary cases shared by the external consumers (check:consumer) and the browser check
// (check:browser): each case is rendered by a packed consumer app and probed in headless Chrome
// just below and exactly at its thresholds (feature 004 FR-052, SC-002). Pure data and helpers,
// plus `probeBreakpointCases`, which drives a CDP page.

const px = (rem) => rem * 16;
/** Thresholds of the configured consumers (rem → px at the default 16px root size). */
export const REPLACE_BREAKPOINTS = {
  phone: "30rem",
  phoneXL: "40rem",
  tablet: "48rem",
  laptop: "64rem",
  desktop: "80rem",
  wide: "96rem",
};
export const EXTEND_BREAKPOINTS = { phone: "30rem", wide3: "112rem" };

const W = Object.fromEntries(
  Object.entries({ ...REPLACE_BREAKPOINTS, ...EXTEND_BREAKPOINTS, sm: "40rem", md: "48rem" }).map(
    ([name, width]) => [name, px(Number.parseFloat(width))],
  ),
);

/** `below(n)` / `at(n)` widths around a threshold in px. */
const around = (name, below, at) => [
  { width: W[name] - 1, expect: below },
  { width: W[name], expect: at },
];

const items = (n) =>
  Array.from(
    { length: n },
    (_, i) => `<div key={${i}} style={{ width: "40px", height: "20px" }} />`,
  ).join("");

/**
 * Cases per consumer. `expect` maps a probe target (`root`, `first`) to computed properties; the
 * special property `tracks` counts grid tracks.
 */
export const BREAKPOINT_CASES = {
  zero: [
    {
      id: "type-heading-default",
      jsx: `<Heading as="h2" size={{ base: "xl", md: "3xl" }} weight={{ base: "medium", md: "bold" }}>Responsive heading</Heading>`,
      checks: around(
        "md",
        { root: { "font-size": "20px", "line-height": "28px", "font-weight": "500" } },
        { root: { "font-size": "30px", "line-height": "37.5px", "font-weight": "700" } },
      ),
    },
    {
      id: "type-in-stack",
      jsx: `<Stack space="4"><Heading as="h3" size="2xl">Account</Heading><Paragraph tone="muted" measure="narrow">Manage your profile settings.</Paragraph></Stack>`,
      checks: [
        {
          width: 1280,
          expect: {
            root: { "row-gap": "16px" },
            first: { margin: "0px", "font-family": "*Inter*", "font-weight": "600" },
          },
        },
      ],
    },
  ],
  extend: [
    {
      id: "extend-stack-order",
      // phone (30rem) is narrower than sm: the generated stylesheet must order it first.
      jsx: `<Stack space={{ base: "1", phone: "4", sm: "5", md: "6" }}>${items(2)}</Stack>`,
      checks: [
        ...around("phone", { root: { "row-gap": "4px" } }, { root: { "row-gap": "16px" } }),
        ...around("sm", { root: { "row-gap": "16px" } }, { root: { "row-gap": "20px" } }),
        ...around("md", { root: { "row-gap": "20px" } }, { root: { "row-gap": "24px" } }),
      ],
    },
    {
      id: "extend-tailwind-same-threshold",
      jsx: `<div><Box display={{ base: "none", phone: "block" }} /><div className="hidden phone:block" /><Box display={{ base: "none", wide3: "block" }} /><div className="hidden wide3:block" /></div>`,
      checks: [
        ...around(
          "phone",
          { child0: { display: "none" }, child1: { display: "none" } },
          { child0: { display: "block" }, child1: { display: "block" } },
        ),
        ...around(
          "wide3",
          { child2: { display: "none" }, child3: { display: "none" } },
          { child2: { display: "block" }, child3: { display: "block" } },
        ),
      ],
    },
    {
      id: "extend-heading",
      jsx: `<Heading size={{ base: "base", phone: "2xl" }}>Hello</Heading>`,
      checks: around(
        "phone",
        { root: { "font-size": "16px", "line-height": "24px" } },
        { root: { "font-size": "24px", "line-height": "31.2px" } },
      ),
    },
  ],
  replace: [
    {
      id: "replace-grid",
      jsx: `<Grid columns={{ base: 1, tablet: 2, desktop: 4 }} space={{ base: "2", tablet: "4", desktop: "6" }}>${items(4)}</Grid>`,
      checks: [
        ...around(
          "tablet",
          { root: { tracks: 1, "column-gap": "8px" } },
          { root: { tracks: 2, "column-gap": "16px" } },
        ),
        ...around(
          "desktop",
          { root: { tracks: 2, "column-gap": "16px" } },
          { root: { tracks: 4, "column-gap": "24px" } },
        ),
      ],
    },
    {
      id: "replace-heading",
      jsx: `<Heading as="h1" size={{ base: "lg", phone: "xl", tablet: "3xl", laptop: "4xl", wide: "5xl" }}>Welcome to Neshel-UI</Heading>`,
      checks: [
        ...around(
          "phone",
          { root: { "font-size": "18px", "line-height": "27px" } },
          { root: { "font-size": "20px", "line-height": "28px" } },
        ),
        ...around("tablet", { root: { "font-size": "20px" } }, { root: { "font-size": "30px" } }),
        ...around("laptop", { root: { "font-size": "30px" } }, { root: { "font-size": "36px" } }),
        ...around(
          "wide",
          { root: { "font-size": "36px", "line-height": "43.2px" } },
          { root: { "font-size": "48px", "line-height": "52.8px" } },
        ),
      ],
    },
    {
      id: "replace-precedence",
      // alignX (any breakpoint) beats align (any breakpoint): CSS resolves it without order.
      jsx: `<Stack alignX={{ base: "end", laptop: "center" }} align={{ phoneXL: "start" }}>${items(1)}</Stack>`,
      checks: [
        ...around(
          "phoneXL",
          { root: { "align-items": "end", "justify-content": "normal" } },
          { root: { "align-items": "end", "justify-content": "start" } },
        ),
        ...around(
          "laptop",
          { root: { "align-items": "end" } },
          { root: { "align-items": "center" } },
        ),
      ],
    },
    {
      id: "replace-flex-direction",
      jsx: `<Flex direction={{ base: "column", tablet: "row" }} alignX="center">${items(2)}</Flex>`,
      checks: around(
        "tablet",
        {
          root: {
            "flex-direction": "column",
            "align-items": "center",
            "justify-content": "normal",
          },
        },
        { root: { "flex-direction": "row", "justify-content": "center", "align-items": "normal" } },
      ),
    },
    {
      id: "replace-paragraph",
      jsx: `<Paragraph weight={{ base: "regular", phoneXL: "bold" }} align={{ base: "center", laptop: "start" }}>Beautiful typography begins with precision.</Paragraph>`,
      checks: [
        ...around(
          "phoneXL",
          { root: { "font-weight": "400" } },
          { root: { "font-weight": "700" } },
        ),
        ...around(
          "laptop",
          { root: { "text-align": "center" } },
          { root: { "text-align": "start" } },
        ),
      ],
    },
    {
      id: "replace-inheritance",
      jsx: `<Inline space={{ base: "1", phone: "3" }}>${items(2)}</Inline>`,
      checks: [
        { width: 360, expect: { root: { "column-gap": "4px" } } },
        { width: 1800, expect: { root: { "column-gap": "12px" } } },
      ],
    },
  ],
};

/** `src/breakpoint-cases.tsx` for a consumer. */
export function breakpointCasesTsx(cases, { layout, typography }) {
  const body = cases
    .map(
      (testCase) =>
        `      <div data-bp-case="${testCase.id}" style={{ width: "320px" }}>\n        ${testCase.jsx}\n      </div>`,
    )
    .join("\n");
  return `import { Box, Flex, Grid, Inline, Stack } from "${layout}";
import { Heading, Paragraph } from "${typography}";

void Box; void Flex; void Grid; void Inline; void Stack; void Heading; void Paragraph;

export function BreakpointCases() {
  return (
    <section aria-label="Breakpoint cases">
${body}
    </section>
  );
}
`;
}

/** Widths to visit, ascending, with the checks due at each. */
function byWidth(cases) {
  const map = new Map();
  for (const testCase of cases) {
    for (const check of testCase.checks) {
      if (!map.has(check.width)) map.set(check.width, []);
      map.get(check.width).push({ id: testCase.id, expect: check.expect });
    }
  }
  return [...map.entries()].sort(([a], [b]) => a - b);
}

const snapshot = (id, targets) => `(() => {
  const host = document.querySelector('[data-bp-case="${id}"]');
  if (!host) return null;
  const root = host.firstElementChild;
  const pick = (name) => name === "root" ? root : name === "first" ? root?.firstElementChild : root?.children[Number(name.slice(5))];
  const out = {};
  for (const [target, props] of Object.entries(${JSON.stringify(Object.fromEntries(Object.entries(targets).map(([k, v]) => [k, Object.keys(v)])))})) {
    const el = pick(target);
    if (!el) { out[target] = null; continue; }
    const style = getComputedStyle(el);
    out[target] = {};
    for (const prop of props) {
      out[target][prop] = prop === "tracks"
        ? (style.gridTemplateColumns === "none" ? 0 : style.gridTemplateColumns.trim().split(/\\s+/).length)
        : style.getPropertyValue(prop);
    }
  }
  return out;
})()`;

function matches(actual, expected) {
  if (typeof expected === "string" && expected.startsWith("*") && expected.endsWith("*")) {
    return String(actual).includes(expected.slice(1, -1));
  }
  return actual === expected;
}

/** Probe every case at its widths; returns { failures, assertions }. */
export async function probeBreakpointCases(page, cases, label) {
  const failures = [];
  let assertions = 0;
  for (const [width, due] of byWidth(cases)) {
    await page.setViewport(width, 900);
    for (const { id, expect } of due) {
      const result = await page.evaluate(snapshot(id, expect));
      if (!result) {
        failures.push(`${label} ${id}: case not rendered`);
        continue;
      }
      for (const [target, props] of Object.entries(expect)) {
        for (const [prop, value] of Object.entries(props)) {
          assertions++;
          const actual = result[target]?.[prop];
          if (!matches(actual, value)) {
            failures.push(
              `${label} ${id} @${width}px ${target} ${prop}: got ${actual}, expected ${value}`,
            );
          }
        }
      }
    }
  }
  await page.setViewport(1280, 900);
  return { failures, assertions };
}
