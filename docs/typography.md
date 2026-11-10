# Typography guide (`@neshel-ui/typography`)

Status: **implemented in feature 004**, published on npm as 0.1.0. Normative
contracts: [typography-api.md](../specs/004-typography-breakpoints/contracts/typography-api.md),
[typography-css.md](../specs/004-typography-breakpoints/contracts/typography-css.md); decision:
[ADR 0011](decisions/0011-typography-capsize.md).

## Setup

Install `@neshel-ui/config` and `@neshel-ui/typography` (React 19 and `@neshel-ui/config` are peer
dependencies) and import the stylesheets in this order:

```css
@import "tailwindcss"; /* optional */
@import "@neshel-ui/config/tailwind.css"; /* without Tailwind: @neshel-ui/config/tokens.css */
@import "@neshel-ui/layout/styles.css"; /* if you use layout */
@import "@neshel-ui/typography/styles.css";
@import "./neshel.generated.css"; /* optional: neshel generate output (see Custom breakpoints) */
/* your application CSS */
```

No Tailwind build, `@source` entry or PostCSS plugin is needed: the package ships precompiled CSS
in `@layer components.neshel`, so Tailwind utilities and unlayered application CSS override it.
The application loads its own fonts; the library ships and fetches no font files.

## Components

| Component   | Default element | `as`                                                  | Defaults                                              |
| ----------- | --------------- | ----------------------------------------------------- | ----------------------------------------------------- |
| `Heading`   | `h2`            | `h1`–`h6`                                             | size by level, `semibold`, `display` font, trimmed    |
| `Paragraph` | `p`             | `p`, `div`                                            | size `base`, `body` font, trimmed                     |
| `Caption`   | `p`             | `p`, `span`, `div`, `small`, `figcaption`             | size `sm`, tone `muted`, `body` font, trimmed         |
| `Text`      | `span`          | phrasing elements (`strong`, `em`, `code`, `time`, …) | inherits size, font, weight and colour; never trimmed |

```tsx
import { Caption, Heading, Paragraph, Text } from "@neshel-ui/typography";

<Heading as="h1" size="2xl" weight="bold" tone="primary">Welcome to Neshel-UI</Heading>
<Paragraph size="base" measure="comfortable" tone="muted">
  Beautiful typography begins with precision.
</Paragraph>
<Text asChild size="sm" weight="medium"><a href="/docs">Documentation</a></Text>
<Caption asChild><figcaption>Figure 1</figcaption></Caption>
```

### Semantics

`as` sets the HTML element; `size` sets the visual scale. `<Heading as="h2" size="5xl">` is an
`h2`. Heading levels are never changed automatically; the default _size_ of a `Heading` follows its
level (h1 `4xl`, h2 `3xl`, h3 `2xl`, h4 `xl`, h5 `lg`, h6 `base`). `Title`, `Subtitle`, `Label` and
`Code` are intentionally not components (research R9): use `Heading`/`Paragraph` sizes, a future
form component, and `<Text as="code" family="mono">`.

### Props

| Prop       | Values                                                        | Responsive |
| ---------- | ------------------------------------------------------------- | ---------- |
| `size`     | `xs sm base lg xl 2xl 3xl 4xl 5xl 6xl`                        | yes        |
| `weight`   | `light regular medium semibold bold`                          | yes        |
| `align`    | `start center end justify`                                    | yes        |
| `leading`  | `none tight snug normal relaxed loose` (unitless)             | yes        |
| `tone`     | `default muted primary destructive` (contrast-paired)         | no         |
| `family`   | `body display mono`                                           | no         |
| `tracking` | `tight normal wide`                                           | no         |
| `measure`  | `narrow` 45ch, `comfortable` 65ch, `wide` 80ch, `none`        | no         |
| `wrap`     | `wrap nowrap balance pretty`                                  | no         |
| `truncate` | `boolean` (one line, ellipsis)                                | no         |
| `trim`     | `boolean`, default `true` (`Heading`, `Paragraph`, `Caption`) | no         |

Plus native attributes, `className`, `style`, `ref` (React 19 ref-as-prop) and `asChild` (Radix
Slot: one element child, merged className/style/handlers/refs; `as` + `asChild` throws).

Size scale (rem, default leading): xs 0.75/1.5 · sm 0.875/1.5 · base 1/1.5 · lg 1.125/1.5 ·
xl 1.25/1.4 · 2xl 1.5/1.3 · 3xl 1.875/1.25 · 4xl 2.25/1.2 · 5xl 3/1.1 · 6xl 3.75/1.1. Sizes are in
`rem`, so they follow the user's browser font-size setting.

### Responsive values

```tsx
<Heading
  as="h1"
  size={{ base: "xl", md: "3xl", lg: "5xl" }}
  weight={{ base: "medium", md: "bold" }}
  align={{ base: "center", lg: "start" }}
>
  Welcome to Neshel-UI
</Heading>;
```

Values cascade upwards (mobile first). `base` is optional: below the first written breakpoint the
component default applies. Breakpoint names are the defaults (`sm md lg xl 2xl`) or the names your
`neshel.config.ts` defines — see [Custom breakpoints](layout.md#custom-breakpoints).

### Errors

Invalid usage throws `NeshelTypographyError` (`[@neshel-ui/typography] <Component>: …`) on the
server and the client: invalid values, malformed breakpoint keys, `as` + `asChild`, invalid `as`,
invalid `asChild` children, `trim` on `Text`. `null` means absent.

## Capsize: precise trimming

Text boxes normally include the font's ascent, descent and half-leading, so a 16px gap between a
heading and a paragraph looks larger than 16px. Trimmed components remove that space with
[Capsize](https://seek-oss.github.io/capsize/)'s technique: the box starts at the first line's cap
height and ends at the last line's baseline, so layout gaps are the real visual gaps.

How it works (S1, ADR 0011): with a unitless line height `L`, Capsize's trims are font-size
independent in `em`. `neshel generate` writes per-font constants next to each font family
(`--neshel-font-<role>-cap-trim`, `-baseline-trim`, `-scale`, `-trim`), and the trim pseudo-elements
combine them with the active `leading`, so every size and breakpoint is exact without extra CSS.
The CLI's tests compare the result with `@capsizecss/core` for several fonts, sizes and leadings.

Cap-height sizing: `font-size = token × --neshel-font-<role>-scale`, where the scale makes every
font render the same cap height as Inter (the default) at that token. Default fonts have scale 1.

### Configure your fonts

```ts
// neshel.config.ts
import { defineConfig } from "@neshel-ui/config";
import inter from "@capsizecss/metrics/inter"; // npm i -D @capsizecss/metrics
import arial from "@capsizecss/metrics/arial";

export default defineConfig({
  typography: {
    families: { body: ["Inter", "system-ui", "sans-serif"] },
    metrics: { body: inter }, // Capsize-format metrics of the font you load
    fallbacks: { body: [arial] }, // local fallbacks adjusted to Inter's metrics
  },
});
```

- `metrics[role]` accepts any Capsize-format object (`capHeight`, `ascent`, `descent`, `lineGap`,
  `unitsPerEm`, optional `xWidthAvg`, `familyName`, …), from `@capsizecss/metrics` or measured from
  your own font file.
- `fallbacks[role]` generates Capsize `@font-face` fallbacks (`size-adjust`, `ascent-override`, …)
  inserted after the primary family, so text keeps the primary font's line metrics while the web
  font loads or if it fails. Fallback cap heights can still differ slightly (Capsize fallbacks
  match widths and line boxes).
- A customised family without metrics prints `missing-metrics` and that role is rendered without
  trimming at scale 1 (a safe fallback).
- Defaults: `body` and `display` use Inter's metrics (Inter is first in the default stack); `mono`
  has none (untrimmed).

### Limitations

- Trimming is accurate only when the configured metrics describe the font actually rendered. With
  the default (Inter) metrics and no Inter installed, the browser renders the next family and trims
  are off by the cap-height difference. Configure the fonts you load (and fallbacks).
- Trimmed elements use `::before`/`::after`; pass `trim={false}` to use your own pseudo-elements.
- Trimming needs a block box: it is removed automatically for inline host elements (`a`, `span`,
  `small`, …, including `asChild` DOM children) and with `truncate` (which clips overflow). A
  component child passed with `asChild` keeps trimming; render a block element or pass
  `trim={false}`.
- A `line-height` set by other CSS (for example a Tailwind `leading-*` utility) is not seen by the
  trim calculation; use the `leading` prop.
- Trimming uses negative margins, never clipping: accents and descenders paint outside the
  trimmed box. Leave a gap (layout `space`) between trimmed blocks.
- `text-box-trim` (which reads the rendered font's metrics) is not used yet (no Firefox support).

### Diagnosing metric mismatches

The Storybook story _Typography/Capsize_ outlines trimmed boxes. If the outline does not touch the
top of capital letters and the baseline, the rendered font does not match the configured metrics:
check `document.fonts.check("16px Inter")`, the font loading, and `typography.metrics`.
`pnpm check:browser` measures the rendered font in Chrome and asserts the geometry within 1 px.

## Layout composition

Typography components set `margin: 0` and nothing else, so spacing comes from layout gaps:

```tsx
<Stack space="4">
  <Heading size="2xl">Account</Heading>
  <Paragraph tone="muted">Manage your profile settings.</Paragraph>
</Stack>

<Inline space="3" alignY="baseline">
  <Heading as="h2" size="lg">Overview</Heading>
  <Caption as="span">Updated recently</Caption>
</Inline>
```

## Non-goals

Runtime font fetching, shipping font files, per-render measurement, trimming inputs/icons/inline
text, a configurable type scale (future).
