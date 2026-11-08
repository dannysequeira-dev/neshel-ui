# Contract — typography CSS, font metrics and layout CSS changes

Feature 004; research S1, R3, R10–R13; ADRs 0010 and 0011.

## 1. Font metric tokens (`@neshel-ui/config`)

For each role `r` in `body`, `display`, `mono`, in `@layer neshel.defaults` (`tokens.css`,
`tailwind.css`) and `@layer neshel.config` (generated):

| Property                        | Value                                               |
| ------------------------------- | --------------------------------------------------- |
| `--neshel-font-r-scale`         | `0.7275390625 / capHeightRatio` (1 without metrics) |
| `--neshel-font-r-cap-trim`      | `(ascentRatio - descentRatio) / 2 - capHeightRatio` |
| `--neshel-font-r-baseline-trim` | `(descentRatio - ascentRatio) / 2`                  |
| `--neshel-font-r-trim`          | `1` with metrics, `0` without                       |

Ratios are metric ÷ `unitsPerEm`; `descentRatio` uses `|descent|`. Numbers are rounded to 6
decimals with trailing zeros removed. Without metrics the trims are `0`. Defaults: `body` and
`display` use Inter (capHeight 1490, ascent 1984, descent −494, lineGap 0, unitsPerEm 2048);
`mono` has no metrics.

## 2. Typography stylesheet (`@neshel-ui/typography/styles.css`)

Layer `components.neshel`; class selectors only (plus `::before`/`::after` of the trim class); no
Tailwind directives; no colour literals. Rendered by the shared renderer
([generation.md](generation.md)).

### Base and static classes

```css
.neshel-typography {
  margin: 0;
  --neshel-type-leading: initial;
  --neshel-type-size-leading: initial;
  line-height: var(--neshel-type-leading, var(--neshel-type-size-leading));
}
.neshel-text-family-<r> {
  font-family: var(--neshel-font-<r>);
  --neshel-type-scale: var(--neshel-font-<r>-scale, 1);
  --neshel-type-cap-trim: var(--neshel-font-<r>-cap-trim, 0);
  --neshel-type-baseline-trim: var(--neshel-font-<r>-baseline-trim, 0);
  --neshel-type-trim: var(--neshel-font-<r>-trim, 0);
}
.neshel-text-trim::before {
  content: ""; display: table;
  margin-block-end: calc((var(--neshel-type-cap-trim) + var(--neshel-type-leading, var(--neshel-type-size-leading)) / 2) * -1em * var(--neshel-type-trim));
}
.neshel-text-trim::after {
  content: ""; display: table;
  margin-block-start: calc((var(--neshel-type-baseline-trim) + var(--neshel-type-leading, var(--neshel-type-size-leading)) / 2) * -1em * var(--neshel-type-trim));
}
```

When neither leading variable is set (a `Text` without `size`/`leading`) `line-height` is invalid
at computed-value time and therefore inherited. The metric variables are deliberately inherited,
so a `Text` without `family` uses its parent's font role.

| Class                          | Declarations                                                                     |
| ------------------------------ | -------------------------------------------------------------------------------- |
| `neshel-text-tone-default`     | `color: var(--neshel-foreground)`                                                |
| `neshel-text-tone-muted`       | `color: var(--neshel-muted-foreground)`                                          |
| `neshel-text-tone-primary`     | `color: var(--neshel-primary)`                                                   |
| `neshel-text-tone-destructive` | `color: var(--neshel-destructive)`                                               |
| `neshel-text-tracking-*`       | `letter-spacing`: tight `-0.025em`, normal `0`, wide `0.025em`                   |
| `neshel-text-measure-*`        | `max-inline-size`: narrow `45ch`, comfortable `65ch`, wide `80ch`, none `none`   |
| `neshel-text-wrap-*`           | wrap `text-wrap: wrap`, nowrap `white-space: nowrap`, balance/pretty `text-wrap` |
| `neshel-text-truncate`         | `overflow: hidden; text-overflow: ellipsis; white-space: nowrap`                 |

### Responsive classes (`neshel-[<bp>-]<key>-<token>`)

| Key            | Tokens → declarations                                                                       |
| -------------- | ------------------------------------------------------------------------------------------- |
| `text-size`    | `font-size: calc(<rem> * var(--neshel-type-scale, 1)); --neshel-type-size-leading: <L>`     |
| `text-weight`  | `font-weight`: light 300, regular 400, medium 500, semibold 600, bold 700                   |
| `text-align`   | `text-align`: start, center, end, justify                                                   |
| `text-leading` | `--neshel-type-leading`: none 1, tight 1.25, snug 1.375, normal 1.5, relaxed 1.625, loose 2 |

Size scale (rem / default leading): xs 0.75/1.5, sm 0.875/1.5, base 1/1.5, lg 1.125/1.5,
xl 1.25/1.4, 2xl 1.5/1.3, 3xl 1.875/1.25, 4xl 2.25/1.2, 5xl 3/1.1, 6xl 3.75/1.1.

### Guarantees

- Trims equal Capsize `createStyleObject({ fontSize, leading: fontSize × L, fontMetrics })`
  (`::before` margin-bottom, `::after` margin-top) to 1e-4 em for every size and leading.
- No `overflow` clipping is introduced by trimming; glyphs outside the trimmed box (accents,
  descenders) paint into the surrounding space. `truncate` (which clips) never combines with the
  trim class.
- `rem` sizes respect the user's default font size; no `px` font sizes.
- A line-height set by other CSS (for example a Tailwind `leading-*` utility) is not seen by the
  trim calculation; use `leading`.

## 3. Layout stylesheet changes (`@neshel-ui/layout/styles.css`)

Alignment props store values in component-scoped custom properties; base rules combine them
(precedence `justify` > `alignX`/`alignY` > `align` via `var()` fallbacks). Every alignment-aware
base resets the four properties so they never leak into nested primitives.

| Responsive key | Sets                      | Tokens                                             |
| -------------- | ------------------------- | -------------------------------------------------- |
| `align`        | `--neshel-layout-align`   | start center end stretch                           |
| `align-x`      | `--neshel-layout-align-x` | start center end stretch baseline                  |
| `align-y`      | `--neshel-layout-align-y` | start center end stretch baseline                  |
| `justify`      | `--neshel-layout-justify` | start center end between around evenly (→ space-*) |

| Base / class                                                           | Mapping                                                |
| ---------------------------------------------------------------------- | ------------------------------------------------------ |
| `neshel-stack`                                                         | `align-items: X`, `justify-content: J(Y)`              |
| `neshel-inline`, `neshel-flex`, `neshel-[bp-]dir-row`, `…-row-reverse` | `justify-content: J(X)`, `align-items: Y`              |
| `neshel-[bp-]dir-column`, `…-column-reverse`                           | `justify-content: J(Y)`, `align-items: X`              |
| `neshel-center`                                                        | `justify-content: X(center)`, `align-items: Y(center)` |
| `neshel-grid`                                                          | `justify-items: X`, `align-items: Y`                   |

with `X = var(--neshel-layout-align-x, var(--neshel-layout-align, normal))`,
`Y = var(--neshel-layout-align-y, var(--neshel-layout-align, normal))`,
`J(v) = var(--neshel-layout-justify, v)`.

Removed property keys: `ai`, `jc`, `ji` (and their `normal` resets). Unchanged keys: `gap`,
`gap-x`, `gap-y`, `pi`, `d`, `dir`, `fw`, `cols`, `mw`.

Flex main-axis validation (`stretch`/`baseline` on the axis mapped to `justify-content`) is exact
when `direction` is static; with a responsive `direction` it is checked at the keys where
`direction` is written. Any remaining case renders `justify-content: stretch` (behaves as
`flex-start`) or an invalid value (falls back to `normal`) — never an error-prone layout.
