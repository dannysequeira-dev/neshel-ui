/**
 * Single source of truth for the layout class vocabulary (ADR 0008, ADR 0010,
 * specs/004-typography-breakpoints/contracts/typography-css.md §3). The runtime (`resolve.ts`)
 * and the style manifest (`scripts/generate-css.mjs` → `style-manifest.json` → `styles.css`) both
 * read these tables, so every class the runtime can emit has a rule for every breakpoint.
 * No React, no tailwind-variants: this module must stay importable from plain Node.
 */

export type Declaration = readonly [property: string, value: string];

/** Spacing tokens, multiplied by the `--neshel-spacing` token of @neshel-ui/config. */
export const spaceScale = [
  "0",
  "0.5",
  "1",
  "1.5",
  "2",
  "2.5",
  "3",
  "4",
  "5",
  "6",
  "8",
  "10",
  "12",
  "16",
  "20",
  "24",
] as const;

export const gridColumnCounts = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

const spaceValue = (n: string) => (n === "0" ? "0" : `calc(var(--neshel-spacing) * ${n})`);
const single = (property: string, values: Record<string, string>) =>
  Object.fromEntries(
    Object.entries(values).map(([token, value]) => [token, [[property, value]] as Declaration[]]),
  );
const spacing = (property: string) =>
  single(property, Object.fromEntries(spaceScale.map((n) => [n, spaceValue(n)])));

// Alignment custom properties (component-scoped; reset by every alignment-aware base rule).
// Flex, Stack and Inline map X/Y onto their main and cross axes through `--neshel-align-main`
// and `--neshel-align-cross`; a `dir-*` class only swaps that mapping.
const A = "--neshel-align";
const AX = "--neshel-align-x";
const AY = "--neshel-align-y";
const J = "--neshel-justify";
const MAIN = "--neshel-align-main";
const CROSS = "--neshel-align-cross";
// No final fallback: when no alignment prop is set the declaration is invalid at computed-value
// time, so the property takes its initial value — exactly as if nothing had been emitted.
const X = `var(${AX}, var(${A}))`;
const Y = `var(${AY}, var(${A}))`;
const alignResets: Declaration[] = [
  [A, "initial"],
  [AX, "initial"],
  [AY, "initial"],
  [J, "initial"],
];
/** Row: X is the main axis (justify-content), Y the cross axis (align-items). */
const rowMapping: Declaration[] = [
  [MAIN, X],
  [CROSS, Y],
];
/** Column: Y is the main axis, X the cross axis. */
const columnMapping: Declaration[] = [
  [MAIN, Y],
  [CROSS, X],
];
/** Flex-based primitives read the mapped axes. */
const flexAxes: Declaration[] = [
  ["justify-content", `var(${J}, var(${MAIN}))`],
  ["align-items", `var(${CROSS})`],
];

const alignTokens = { start: "start", center: "center", end: "end", stretch: "stretch" };
const axisTokens = { ...alignTokens, baseline: "baseline" };

/**
 * Responsive class tables: `neshel-[<bp>-]<key>-<token>` → declarations. Emitted at `base` and in
 * every breakpoint block, in this order.
 */
export const responsiveTables = {
  gap: spacing("gap"),
  "gap-x": spacing("column-gap"),
  "gap-y": spacing("row-gap"),
  pi: spacing("padding-inline"),
  d: single("display", {
    none: "none",
    block: "block",
    inline: "inline",
    "inline-block": "inline-block",
  }),
  dir: {
    row: [["flex-direction", "row"], ...rowMapping],
    column: [["flex-direction", "column"], ...columnMapping],
    "row-reverse": [["flex-direction", "row-reverse"], ...rowMapping],
    "column-reverse": [["flex-direction", "column-reverse"], ...columnMapping],
  },
  fw: single("flex-wrap", { wrap: "wrap", nowrap: "nowrap" }),
  cols: single(
    "grid-template-columns",
    Object.fromEntries(gridColumnCounts.map((n) => [String(n), `repeat(${n}, minmax(0, 1fr))`])),
  ),
  mw: single("max-width", {
    sm: "40rem",
    md: "48rem",
    lg: "64rem",
    xl: "80rem",
    "2xl": "96rem",
    full: "none",
  }),
  align: single(A, alignTokens),
  "align-x": single(AX, axisTokens),
  "align-y": single(AY, axisTokens),
  justify: single(J, {
    start: "start",
    center: "center",
    end: "end",
    between: "space-between",
    around: "space-around",
    evenly: "space-evenly",
  }),
} as const satisfies Record<string, Record<string, readonly Declaration[]>>;

export type TableKey = keyof typeof responsiveTables;
export const tableKeys = Object.keys(responsiveTables) as TableKey[];

/** Non-responsive rules: one base class per primitive, plus the default separator. */
export const baseRules: ReadonlyArray<{
  readonly selector: string;
  readonly declarations: readonly Declaration[];
}> = [
  {
    selector: ".neshel-flex",
    declarations: [["display", "flex"], ...alignResets, ...rowMapping, ...flexAxes],
  },
  {
    selector: ".neshel-stack",
    declarations: [
      ["display", "flex"],
      ["flex-direction", "column"],
      ...alignResets,
      ...columnMapping,
      ...flexAxes,
    ],
  },
  {
    selector: ".neshel-inline",
    declarations: [
      ["display", "flex"],
      ["flex-direction", "row"],
      ...alignResets,
      ...rowMapping,
      ...flexAxes,
    ],
  },
  {
    selector: ".neshel-center",
    declarations: [
      ["display", "flex"],
      ...alignResets,
      ["justify-content", `var(${AX}, var(${A}, center))`],
      ["align-items", `var(${AY}, var(${A}, center))`],
    ],
  },
  {
    selector: ".neshel-grid",
    declarations: [["display", "grid"], ...alignResets, ["justify-items", X], ["align-items", Y]],
  },
  {
    selector: ".neshel-container",
    declarations: [
      ["box-sizing", "border-box"],
      ["width", "100%"],
      ["margin-inline", "auto"],
      ["max-width", "80rem"],
    ],
  },
  {
    selector: ".neshel-separator",
    declarations: [
      ["flex", "none"],
      ["align-self", "stretch"],
      ["margin", "0"],
      ["padding", "0"],
      ["list-style", "none"],
      ["border", "0 solid var(--neshel-border)"],
    ],
  },
  { selector: ".neshel-separator-horizontal", declarations: [["border-block-start-width", "1px"]] },
  { selector: ".neshel-separator-vertical", declarations: [["border-inline-start-width", "1px"]] },
];

/** Class name for a table token at a breakpoint (the key is validated by the runtime grammar). */
export function responsiveClassName(breakpoint: string, key: TableKey, token: string): string {
  return breakpoint === "base" ? `neshel-${key}-${token}` : `neshel-${breakpoint}-${key}-${token}`;
}

/** Style manifest data (contracts/generation.md), without package metadata. */
export function manifestRules() {
  return {
    rules: baseRules.map(({ selector, declarations }) => ({ selector, declarations })),
    responsive: tableKeys.flatMap((key) =>
      Object.entries(responsiveTables[key]).map(([token, declarations]) => ({
        class: `${key}-${token}`,
        declarations,
      })),
    ),
  };
}
