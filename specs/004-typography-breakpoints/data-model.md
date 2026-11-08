# Data model — feature 004

## BreakpointsInput (config)

| Field      | Type                     | Rules               |
| ---------- | ------------------------ | ------------------- |
| `mode`     | `"extend" \| "replace"`  | default `extend`    |
| `values`   | `Record<string, string>` | names/widths per R2 |
| `tailwind` | `boolean`                | default `false`     |

## ResolvedBreakpoint (CLI)

`{ name: string; width: string; rem: number; source: "default" | "config" }`, sorted by `rem`.
`ResolvedConfig.breakpoints?: { mode; list: ResolvedBreakpoint[]; tailwind: boolean }` — absent
when the config has no `breakpoints`.

## FontMetrics (config)

Capsize-compatible: required `capHeight`, `ascent`, `descent`, `lineGap`, `unitsPerEm`; optional
`xHeight`, `xWidthAvg`, `familyName`, `fullName`, `postscriptName`, `category`, `subsets`.
`typography.fallbacks[role]`: array of FontMetrics with `familyName` and `xWidthAvg` (required by
`createFontStack`); the primary role metrics then also need `familyName` (or the first family of
the role's stack is used) and `xWidthAvg`.

## ResolvedFont (CLI)

`{ role; stack: string; constants: { scale; capTrim; baselineTrim; trim: 0 | 1 }; fontFaces: string[] }`.

## StyleManifest (packages → CLI)

`{ schema: 1; package; version; layer: "components.neshel"; rules: Rule[]; responsive: ResponsiveRule[] }`
with `Rule = { selector; declarations: [property, value][] }` and
`ResponsiveRule = { class; declarations }`.

## Runtime selection (layout, typography)

`resolveClasses(spec, props) → string[]`: for each responsive prop in spec order, for each written
key in object order (`base` first), the table class. Static props add their class. Output is a
function of props only.

## Typography tables

Sizes (`rem`, default leading), weights, aligns, leadings, tones, families, tracking, measures,
wraps — values in [contracts/typography-css.md](contracts/typography-css.md) §2.
