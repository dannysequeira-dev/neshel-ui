# Contract — `@neshel-ui/layout/styles.css`

Status: **planned** (003.0). Normative for 003.1–003.4.

## Export and import

- Export `./styles.css` → `dist/styles.css`, a copy of the committed, generated
  `src/styles.css`. `sideEffects: ["**/*.css"]`.
- Canonical import order (extends ADR 0006):

  ```css
  @import "tailwindcss";                    /* optional */
  @import "@neshel-ui/config/tailwind.css"; /* or tokens.css without Tailwind */
  @import "./neshel.generated.css";         /* optional, configured mode */
  @import "@neshel-ui/layout/styles.css";
  /* application CSS */
  ```

- No `@source`, PostCSS plugin or Tailwind build is required.

## Structure

1. Header comment (`@neshel-ui/layout styles. Generated from style tables; do not edit.`).
2. One block `@layer components.neshel { … }` containing all rules (R3).
3. Inside: base classes, then base-breakpoint property classes, then one
   `@media (min-width: <bp>)` block per breakpoint in ascending order.
4. Only class selectors (`.neshel-*`); no element/universal selectors, resets, `@font-face`,
   `url()`, Tailwind directives (`@apply`, `@tailwind`, `@source`, `@theme`, `@utility`,
   `@custom-variant`) or colour literals.
5. Deterministic output; one rule per line; budget ≤ 48 KiB raw, ≤ 8 KiB gzip.

## Base classes

| Class                         | Declarations                                                                                                     |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `neshel-flex`                 | `display: flex`                                                                                                  |
| `neshel-stack`                | `display: flex; flex-direction: column`                                                                          |
| `neshel-inline`               | `display: flex; flex-direction: row`                                                                             |
| `neshel-center`               | `display: flex; align-items: center; justify-content: center`                                                    |
| `neshel-grid`                 | `display: grid`                                                                                                  |
| `neshel-container`            | `box-sizing: border-box; width: 100%; margin-inline: auto`                                                       |
| `neshel-separator`            | `flex: none; align-self: stretch; margin: 0; padding: 0; list-style: none; border: 0 solid var(--neshel-border)` |
| `neshel-separator-horizontal` | `border-block-start-width: 1px`                                                                                  |
| `neshel-separator-vertical`   | `border-inline-start-width: 1px`                                                                                 |

## Property classes

Name: `neshel-<key>-<value>` at `base`; `neshel-<bp>-<key>-<value>` inside the breakpoint's media
block. Dots in values are escaped in selectors (`.neshel-gap-0\.5`).

| Key     | CSS property            | Values → declaration                                                                                                                            |
| ------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `gap`   | `gap`                   | space tokens → `calc(var(--neshel-spacing) * n)`                                                                                                |
| `gap-x` | `column-gap`            | space tokens                                                                                                                                    |
| `gap-y` | `row-gap`               | space tokens                                                                                                                                    |
| `pi`    | `padding-inline`        | space tokens                                                                                                                                    |
| `d`     | `display`               | `none`, `block`, `inline`, `inline-block`                                                                                                       |
| `dir`   | `flex-direction`        | `row`, `column`, `row-reverse`, `column-reverse`                                                                                                |
| `fw`    | `flex-wrap`             | `wrap`, `nowrap`                                                                                                                                |
| `ai`    | `align-items`           | `start`, `center`, `end`, `stretch`, `baseline`; `normal` (breakpoints only, reset)                                                             |
| `jc`    | `justify-content`       | `start`, `center`, `end`, `between` → `space-between`, `around` → `space-around`, `evenly` → `space-evenly`; `normal` (breakpoints only, reset) |
| `ji`    | `justify-items`         | `start`, `center`, `end`, `stretch`                                                                                                             |
| `cols`  | `grid-template-columns` | `1`…`12` → `repeat(n, minmax(0, 1fr))`                                                                                                          |
| `mw`    | `max-width`             | `sm` 40rem, `md` 48rem, `lg` 64rem, `xl` 80rem, `2xl` 96rem, `full` → `none`                                                                    |

Breakpoints: `sm` 40rem, `md` 48rem, `lg` 64rem, `xl` 80rem, `2xl` 96rem (`min-width`).

## Consistency rules (tested)

- C1: every class the resolver can emit (exhaustive sweep) has exactly one rule in the stylesheet
  at the right breakpoint.
- C2: every stylesheet class is reachable from some prop combination.
- C3: committed `src/styles.css` equals the generator output from the built tables (no drift).
- C4: the stylesheet in the packed tarball equals `src/styles.css`.
- C5: a consumer's built CSS (Vite, with or without Tailwind) contains every stylesheet selector.

## Cascade

- Rules live in `@layer components.neshel`: below Tailwind `utilities`, below unlayered app CSS,
  below a consumer's unlayered `components` rules.
- Same specificity (one class) everywhere; later rules in the file win, which orders base
  classes < property classes < larger breakpoints.
- The separator colour inherits theme scoping from `--neshel-border` (`data-neshel-theme`).
