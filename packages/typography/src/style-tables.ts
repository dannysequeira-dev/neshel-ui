/**
 * Single source of truth for the typography class vocabulary (ADR 0011,
 * specs/004-typography-breakpoints/contracts/typography-css.md §2). The runtime and the style
 * manifest (→ styles.css, and generated stylesheets for custom breakpoints) read these tables.
 * No React, no tailwind-variants: importable from plain Node.
 */

export type Declaration = readonly [property: string, value: string];

/** Size tokens: nominal rem size (for the reference cap height) and default unitless leading. */
export const sizeScale = {
  xs: { rem: "0.75rem", leading: "1.5" },
  sm: { rem: "0.875rem", leading: "1.5" },
  base: { rem: "1rem", leading: "1.5" },
  lg: { rem: "1.125rem", leading: "1.5" },
  xl: { rem: "1.25rem", leading: "1.4" },
  "2xl": { rem: "1.5rem", leading: "1.3" },
  "3xl": { rem: "1.875rem", leading: "1.25" },
  "4xl": { rem: "2.25rem", leading: "1.2" },
  "5xl": { rem: "3rem", leading: "1.1" },
  "6xl": { rem: "3.75rem", leading: "1.1" },
} as const;

export const weightScale = {
  light: "300",
  regular: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
} as const;

export const alignValues = { start: "start", center: "center", end: "end", justify: "justify" };

export const leadingScale = {
  none: "1",
  tight: "1.25",
  snug: "1.375",
  normal: "1.5",
  relaxed: "1.625",
  loose: "2",
} as const;

export const toneValues = {
  default: "var(--neshel-foreground)",
  muted: "var(--neshel-muted-foreground)",
  primary: "var(--neshel-primary)",
  destructive: "var(--neshel-destructive)",
} as const;

export const fontRoles = ["body", "display", "mono"] as const;
export const trackingValues = { tight: "-0.025em", normal: "0", wide: "0.025em" } as const;
export const measureValues = {
  narrow: "45ch",
  comfortable: "65ch",
  wide: "80ch",
  none: "none",
} as const;
export const wrapValues = {
  wrap: [["text-wrap", "wrap"]],
  nowrap: [["white-space", "nowrap"]],
  balance: [["text-wrap", "balance"]],
  pretty: [["text-wrap", "pretty"]],
} as const satisfies Record<string, readonly Declaration[]>;

// Element-level custom properties.
const LEADING = "--neshel-type-leading";
const SIZE_LEADING = "--neshel-type-size-leading";
const SCALE = "--neshel-type-scale";
const CAP_TRIM = "--neshel-type-cap-trim";
const BASELINE_TRIM = "--neshel-type-baseline-trim";
const TRIM = "--neshel-type-trim";
/** Active unitless line height: the `leading` prop, else the size's default leading. */
const L = `var(${LEADING}, var(${SIZE_LEADING}))`;

const mapValues = <T extends Record<string, string>>(values: T, property: string) =>
  Object.fromEntries(
    Object.entries(values).map(([token, value]) => [token, [[property, value]] as Declaration[]]),
  );

/** Responsive class tables: `neshel-[<bp>-]<key>-<token>`. */
export const responsiveTables = {
  "text-size": Object.fromEntries(
    Object.entries(sizeScale).map(([token, { rem, leading }]) => [
      token,
      [
        ["font-size", `calc(${rem} * var(${SCALE}, 1))`],
        [SIZE_LEADING, leading],
      ] as Declaration[],
    ]),
  ),
  "text-weight": mapValues(weightScale, "font-weight"),
  "text-align": mapValues(alignValues, "text-align"),
  "text-leading": mapValues(leadingScale, LEADING),
} as const satisfies Record<string, Record<string, readonly Declaration[]>>;

export type TableKey = keyof typeof responsiveTables;
export const tableKeys = Object.keys(responsiveTables) as TableKey[];

const familyRule = (role: (typeof fontRoles)[number]) => ({
  selector: `.neshel-text-family-${role}`,
  declarations: [
    ["font-family", `var(--neshel-font-${role})`],
    [SCALE, `var(--neshel-font-${role}-scale, 1)`],
    [CAP_TRIM, `var(--neshel-font-${role}-cap-trim, 0)`],
    [BASELINE_TRIM, `var(--neshel-font-${role}-baseline-trim, 0)`],
    [TRIM, `var(--neshel-font-${role}-trim, 0)`],
  ] as Declaration[],
});

const staticRules = <T extends Record<string, string>>(
  prefix: string,
  property: string,
  values: T,
) =>
  Object.entries(values).map(([token, value]) => ({
    selector: `.neshel-text-${prefix}-${token}`,
    declarations: [[property, value]] as Declaration[],
  }));

/** Non-responsive rules, in cascade order (later rules win at equal specificity). */
export const baseRules: ReadonlyArray<{
  readonly selector: string;
  readonly declarations: readonly Declaration[];
}> = [
  {
    selector: ".neshel-typography",
    declarations: [
      ["margin", "0"],
      [LEADING, "initial"],
      [SIZE_LEADING, "initial"],
      ["line-height", L],
    ],
  },
  ...fontRoles.map(familyRule),
  ...staticRules("tone", "color", toneValues),
  ...staticRules("tracking", "letter-spacing", trackingValues),
  ...staticRules("measure", "max-inline-size", measureValues),
  ...Object.entries(wrapValues).map(([token, declarations]) => ({
    selector: `.neshel-text-wrap-${token}`,
    declarations,
  })),
  {
    selector: ".neshel-text-truncate",
    declarations: [
      ["overflow", "hidden"],
      ["text-overflow", "ellipsis"],
      ["white-space", "nowrap"],
    ],
  },
  // Capsize trimming (research S1): (font constant + L / 2) × −1em, off when the role has no metrics.
  {
    selector: ".neshel-text-trim::before",
    declarations: [
      ["content", '""'],
      ["display", "table"],
      ["margin-block-end", `calc((var(${CAP_TRIM}) + ${L} / 2) * -1em * var(${TRIM}))`],
    ],
  },
  {
    selector: ".neshel-text-trim::after",
    declarations: [
      ["content", '""'],
      ["display", "table"],
      ["margin-block-start", `calc((var(${BASELINE_TRIM}) + ${L} / 2) * -1em * var(${TRIM}))`],
    ],
  },
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
