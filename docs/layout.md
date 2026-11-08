# Layout guide (`@neshel-ui/layout`)

Status: **implemented in feature 003**, custom breakpoints added in feature 004 (ADR 0010);
verified from packed tarballs; **not published**. The normative contracts are [layout-api.md](../specs/003-layout-system/contracts/layout-api.md) and
[layout-css.md](../specs/003-layout-system/contracts/layout-css.md); decisions in
[ADR 0008](decisions/0008-layout-styling-and-css-distribution.md) and
[ADR 0009](decisions/0009-layout-composition-aschild-separators.md).

## Setup

Install `@neshel-ui/config` and `@neshel-ui/layout` (React 19 is a peer dependency) and import
the stylesheets once, in this order:

```css
@import "tailwindcss"; /* optional */
@import "@neshel-ui/config/tailwind.css"; /* without Tailwind: @neshel-ui/config/tokens.css */
@import "./neshel.generated.css"; /* optional: neshel generate output */
@import "@neshel-ui/layout/styles.css";
/* your application CSS */
```

With custom breakpoints, import the generated stylesheet **after** the package stylesheets (or
instead of them) — see [Custom breakpoints](#custom-breakpoints).

No Tailwind build, `@source` entry or PostCSS plugin is needed for the layout styles: the
package ships precompiled CSS. Import the layout stylesheet **after** Tailwind; imported before
it, Tailwind's preflight (`base` layer) is ordered after the layout layer and removes
Container's automatic margins.

## Primitives

| Primitive   | CSS                                                    | Use it for                                  |
| ----------- | ------------------------------------------------------ | ------------------------------------------- |
| `Box`       | none (element default), optional responsive `display`  | Semantic wrappers, responsive show/hide     |
| `Stack`     | `display: flex; flex-direction: column`                | Vertical groups                             |
| `Inline`    | `display: flex; flex-direction: row`                   | Horizontal groups, toolbars, tags           |
| `Flex`      | `display: flex`, responsive `direction` and `wrap`     | Layouts that change direction               |
| `Grid`      | `display: grid`, 1–12 equal `columns`                  | Two-dimensional layouts                     |
| `Center`    | flex, centred on both axes                             | Centring content                            |
| `Container` | `width: 100%; margin-inline: auto; max-width` (`size`) | Page-width constraints with inline `gutter` |

```tsx
import { Container, Grid, Inline, Stack } from "@neshel-ui/layout";

<Container size="lg" gutter={{ base: "4", md: "8" }}>
  <Stack space="6">
    <Inline as="nav" aria-label="Main" justify="between" align="center" separator>
      <a href="/">Home</a>
      <a href="/docs">Docs</a>
    </Inline>
    <Grid columns={{ base: 1, md: 2, lg: 4 }} space={{ base: "2", md: "4" }}>
      {cards}
    </Grid>
  </Stack>
</Container>;
```

## Spacing

| Prop     | CSS          | Notes                                       |
| -------- | ------------ | ------------------------------------------- |
| `space`  | `gap`        | Cannot be combined with `spaceX` / `spaceY` |
| `spaceX` | `column-gap` | May be combined with `spaceY`               |
| `spaceY` | `row-gap`    | May be combined with `spaceX`               |

Tokens: `"0" "0.5" "1" "1.5" "2" "2.5" "3" "4" "5" "6" "8" "10" "12" "16" "20" "24"`, each
`calc(var(--neshel-spacing) * n)` — `"4"` is 1rem with the default 0.25rem unit. Changing
`--neshel-spacing` (in `neshel.config.ts` or a theme scope) rescales every layout gap.

`<Stack space="4" spaceX="2">` is a TypeScript error and, from JavaScript, throws
`NeshelLayoutError`. These are Neshel props, not Tailwind's margin-based `space-x-*` utilities.

## Alignment

X is the inline axis (horizontal in horizontal writing modes), Y the block axis.

| Primitive | X                                             | Y                                             |
| --------- | --------------------------------------------- | --------------------------------------------- |
| Stack     | `align-items`                                 | `justify-content`                             |
| Inline    | `justify-content`                             | `align-items`                                 |
| Center    | `justify-content` (default `center`)          | `align-items` (default `center`)              |
| Grid      | `justify-items`                               | `align-items`                                 |
| Flex      | row: `justify-content`, column: `align-items` | row: `align-items`, column: `justify-content` |

- `align` sets both axes; `alignX` / `alignY` override one axis.
- `justify` (`start`, `center`, `end`, `between`, `around`, `evenly`) distributes the main axis on
  Flex, Stack and Inline. `alignX="between"` is not valid.
- **Precedence** per breakpoint, after responsive cascading: `justify` > `alignX`/`alignY` >
  `align`. `<Inline align="center" justify="between">` centres vertically and spreads
  horizontally.
- Value sets: an axis that maps to `justify-content` accepts `start | center | end`; axes that
  map to `align-items` add `stretch` (and `baseline` on row layouts); Grid accepts
  `start | center | end | stretch`. Flex validates at runtime because its axes move with
  `direction`; when a direction change vacates a property it resets to `normal`.
- Without alignment props nothing is emitted, so native `stretch`/`normal` behaviour stays.
- **RTL and writing modes**: keywords are logical (`start`/`end`). In RTL, `alignX="start"` is the
  right edge; `row-reverse` does not flip X. Vertical writing modes are not supported.

## Responsive values

Any responsive prop accepts a value or an object keyed by breakpoint; values cascade upwards
(mobile first). `base` is optional (below the first written breakpoint the property is unset).

| Key    | `min-width` (default set) |
| ------ | ------------------------- |
| `base` | 0                         |
| `sm`   | 40rem                     |
| `md`   | 48rem                     |
| `lg`   | 64rem                     |
| `xl`   | 80rem                     |
| `2xl`  | 96rem                     |

The defaults equal Tailwind v4's. Each written key becomes one static, precompiled class
(`neshel-md-gap-4`); the stylesheet's ascending media blocks resolve the cascade, and alignment
precedence (`justify` > `alignX`/`alignY` > `align`) is resolved by CSS custom properties, so
the runtime never needs the breakpoint order. Nothing is interpolated from user input other than a
validated breakpoint name, and no inline styles are written.

## Custom breakpoints

Applications can define their own names and thresholds (feature 004, ADR 0010):

```ts
// neshel.config.ts
import { defineConfig } from "@neshel-ui/config";

export default defineConfig({
  breakpoints: {
    mode: "replace", // or "extend" to keep sm … 2xl and add names
    values: {
      phone: "30rem",
      phoneXL: "40rem",
      tablet: "48rem",
      laptop: "64rem",
      desktop: "80rem",
      wide: "96rem",
    },
    tailwind: true, // optional: also emit Tailwind v4 @theme breakpoints
  },
});
```

1. Run `neshel generate` (add it to your `dev`/`build` scripts; `neshel generate --check` in CI).
   It writes `neshel.generated.css` (tokens plus complete layout and typography stylesheets for
   your breakpoints) and `neshel.generated.d.ts` (the breakpoint names for TypeScript).
2. Add `neshel.generated.d.ts` to your TypeScript project (`include` in `tsconfig.json`). Works
   with `moduleResolution` `NodeNext` and `Bundler`.
3. Import `./neshel.generated.css` after `@neshel-ui/layout/styles.css` and
   `@neshel-ui/typography/styles.css`, or instead of them.
4. Use the names: `<Grid columns={{ base: 1, tablet: 2, desktop: 4 }} space={{ base: "2", tablet: "4" }} />`.

Rules (validated by the CLI): lower camelCase names (`phoneXL`), `rem` widths only, distinct
widths, no reserved names (`base`, Neshel class prefixes, Tailwind variant names such as `dark` or
`print`), names unique ignoring case, at most 12 breakpoints; `extend` cannot redefine a default
name. Output is always sorted by width.

Types: with the generated declarations, only the configured names type-check (`replace` rejects
`md`); without them, the defaults apply. JavaScript: malformed keys throw; an unknown well-formed
key cannot be rejected at runtime (the runtime has no configuration), so the browser logs one
warning per key that the loaded stylesheet does not declare (`--neshel-breakpoints`). Server
rendering never warns and markup never depends on configuration.

Tailwind: with `tailwind: true` the generated file ends with `@theme { --breakpoint-…: … }`
(`replace` first clears Tailwind's defaults), so `tablet:flex` and `<Stack space={{ tablet: "4" }}>`
switch at the same width. Import the generated file from your Tailwind entry CSS.

## Composition: `as` and `asChild`

- `as` picks the element from a fixed list (`div`, `span`, `section`, `article`, `aside`,
  `header`, `footer`, `main`, `nav`, `ul`, `ol`, `li`, `form`, `fieldset`, `figure`, `address`).
- `asChild` applies the layout to its single child element instead of rendering a wrapper
  (Radix Slot): `className` is joined, `style` merged (child wins), event handlers and refs
  composed.

```tsx
<Stack asChild space="4">
  <section aria-label="Settings">
    <Profile />
    <Preferences />
  </section>
</Stack>;
```

Rules and limitations:

- `as` together with `asChild` throws.
- `asChild` needs exactly one React element child; text, several children or a Fragment throw.
- The child must forward `className` and `ref` to a DOM element (React 19 components receive
  `ref` as a prop). A component that drops them silently loses the layout styles — this cannot be
  detected.
- Refs on every primitive resolve to the rendered DOM element.

## Separators (Stack, Inline)

```tsx
<Stack separator space="4">{items}</Stack>
<Inline separator={<span aria-hidden="true">|</span>} space="3">{links}</Inline>
```

- `true` renders a decorative rule (`aria-hidden`, colour `--neshel-border`): horizontal in Stack,
  vertical in Inline; it is an `li` inside `ul`/`ol`, a `span` inside `span`, otherwise a `div`.
- A custom element is inserted unchanged (only a `key` is added) and keeps its own semantics.
- Separators appear only between rendered items; `null`, `undefined`, booleans and `""` are
  skipped; item keys are preserved; items are never wrapped.
- Spacing applies on both sides of each separator (separators are flex items).
- A Fragment counts as one item.
- `separator` with `wrap` throws (a wrapped line could start with a separator).
- `separator` with `asChild` works for a DOM element child (separators go inside it) and throws
  for a component child.

## Overriding styles

Layout rules live in the cascade layer `components.neshel`. Tailwind utilities (layer
`utilities`) and any unlayered application CSS override them:
`<Stack className="md:flex-row">` works. Prefer the primitives' props for responsive changes.

## Errors

Invalid usage throws an `Error` named `NeshelLayoutError`, with messages starting
`[@neshel-ui/layout] <Component>:`, on the server and the client alike: conflicting spacing,
`as` + `asChild`, invalid `asChild` children, malformed breakpoint keys or invalid values, a Flex main-axis
`stretch`/`baseline`, `separator` + `wrap`, `separator` + `asChild` with a component child, and
invalid `separator` values. `null` is treated as an absent prop.

## Not included

Spacer (deferred: use `justify` or nested Inline), item-level props (`grow`, `span`), grid rows
or areas and container queries. Flex main-axis `stretch`/`baseline` validation is exact for a
static `direction` and at keys where `direction` is written (ADR 0010).
