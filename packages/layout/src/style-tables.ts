/**
 * Single source of truth for the layout class vocabulary (ADR 0008, contracts/layout-css.md).
 * The runtime (`variants.ts`) and the stylesheet generator (`scripts/generate-css.mjs`) both read
 * these tables, so every class the runtime can emit has a rule in `styles.css`.
 * No React, no tailwind-variants: this module must stay importable from plain Node.
 */

/** Breakpoints in cascade order; `base` has no media query. */
export const breakpoints = ["base", "sm", "md", "lg", "xl", "2xl"] as const;
export type BreakpointName = (typeof breakpoints)[number];

/** `min-width` of each breakpoint (identical to Tailwind CSS v4 defaults; research R4). */
export const breakpointMinWidth: Readonly<Record<Exclude<BreakpointName, "base">, string>> = {
  sm: "40rem",
  md: "48rem",
  lg: "64rem",
  xl: "80rem",
  "2xl": "96rem",
};

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

const spaceValues: Record<string, string> = Object.fromEntries(
  spaceScale.map((n) => [n, n === "0" ? "0" : `calc(var(--neshel-spacing) * ${n})`]),
);

export const gridColumnCounts = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

export interface PropertyTable {
  /** CSS property written by the class. */
  readonly property: string;
  /** Token → CSS value; emitted at every breakpoint. */
  readonly values: Readonly<Record<string, string>>;
  /** Token → CSS value; emitted only inside breakpoint blocks (resets after a direction change). */
  readonly resets?: Readonly<Record<string, string>>;
}

/** Property classes, keyed by the class key used in `neshel-[<bp>-]<key>-<token>`. */
export const propertyTables = {
  gap: { property: "gap", values: spaceValues },
  "gap-x": { property: "column-gap", values: spaceValues },
  "gap-y": { property: "row-gap", values: spaceValues },
  pi: { property: "padding-inline", values: spaceValues },
  d: {
    property: "display",
    values: { none: "none", block: "block", inline: "inline", "inline-block": "inline-block" },
  },
  dir: {
    property: "flex-direction",
    values: {
      row: "row",
      column: "column",
      "row-reverse": "row-reverse",
      "column-reverse": "column-reverse",
    },
  },
  fw: { property: "flex-wrap", values: { wrap: "wrap", nowrap: "nowrap" } },
  ai: {
    property: "align-items",
    values: {
      start: "start",
      center: "center",
      end: "end",
      stretch: "stretch",
      baseline: "baseline",
    },
    resets: { normal: "normal" },
  },
  jc: {
    property: "justify-content",
    values: {
      start: "start",
      center: "center",
      end: "end",
      between: "space-between",
      around: "space-around",
      evenly: "space-evenly",
    },
    resets: { normal: "normal" },
  },
  ji: {
    property: "justify-items",
    values: { start: "start", center: "center", end: "end", stretch: "stretch" },
  },
  cols: {
    property: "grid-template-columns",
    values: Object.fromEntries(
      gridColumnCounts.map((n) => [String(n), `repeat(${n}, minmax(0, 1fr))`]),
    ),
  },
  mw: {
    property: "max-width",
    values: {
      sm: "40rem",
      md: "48rem",
      lg: "64rem",
      xl: "80rem",
      "2xl": "96rem",
      full: "none",
    },
  },
} as const satisfies Record<string, PropertyTable>;

export type PropertyKey = keyof typeof propertyTables;
export const propertyKeys = Object.keys(propertyTables) as PropertyKey[];

/** Base classes: one per primitive, plus the default separator. */
export const baseClasses: ReadonlyArray<{
  readonly name: string;
  readonly declarations: ReadonlyArray<readonly [string, string]>;
}> = [
  { name: "neshel-flex", declarations: [["display", "flex"]] },
  {
    name: "neshel-stack",
    declarations: [
      ["display", "flex"],
      ["flex-direction", "column"],
    ],
  },
  {
    name: "neshel-inline",
    declarations: [
      ["display", "flex"],
      ["flex-direction", "row"],
    ],
  },
  { name: "neshel-center", declarations: [["display", "flex"]] },
  { name: "neshel-grid", declarations: [["display", "grid"]] },
  {
    name: "neshel-container",
    declarations: [
      ["box-sizing", "border-box"],
      ["width", "100%"],
      ["margin-inline", "auto"],
    ],
  },
  {
    name: "neshel-separator",
    declarations: [
      ["flex", "none"],
      ["align-self", "stretch"],
      ["margin", "0"],
      ["padding", "0"],
      ["list-style", "none"],
      ["border", "0 solid var(--neshel-border)"],
    ],
  },
  { name: "neshel-separator-horizontal", declarations: [["border-block-start-width", "1px"]] },
  { name: "neshel-separator-vertical", declarations: [["border-inline-start-width", "1px"]] },
];

/** Class name for a property token at a breakpoint (inputs are table keys, never user input). */
export function propertyClassName(bp: BreakpointName, key: PropertyKey, token: string): string {
  return bp === "base" ? `neshel-${key}-${token}` : `neshel-${bp}-${key}-${token}`;
}

/** Tokens available for a key at a breakpoint (resets only outside `base`). */
export function tokensFor(bp: BreakpointName, key: PropertyKey): Record<string, string> {
  const table: PropertyTable = propertyTables[key];
  return bp === "base" ? { ...table.values } : { ...table.values, ...table.resets };
}
