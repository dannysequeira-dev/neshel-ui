# Contract — Semantic tokens (proposed)

Status: **proposed**, not implemented. Palette pending owner approval (⚑ Q3).

## Colour roles

Config keys are camelCase; CSS variables are `--neshel-` + kebab-case. Tailwind exposes each
role as `--color-neshel-<role>` (utilities `bg-`, `text-`, `border-`, `ring-`, `outline-`,
`fill-`, `stroke-neshel-<role>`).

| Config key              | CSS variable                      | Purpose                                                                     | Phase 001 |
| ----------------------- | --------------------------------- | --------------------------------------------------------------------------- | --------- |
| `background`            | `--neshel-background`             | Page / app background                                                       | kept      |
| `foreground`            | `--neshel-foreground`             | Default text on `background`                                                | kept      |
| `surface`               | `--neshel-surface`                | Raised containers (cards, popovers)                                         | kept      |
| `surfaceForeground`     | `--neshel-surface-foreground`     | Text on `surface`                                                           | new       |
| `muted`                 | `--neshel-muted`                  | Subtle backgrounds (wells, stripes)                                         | new       |
| `mutedForeground`       | `--neshel-muted-foreground`       | Secondary text; valid on muted/background/surface                           | new       |
| `primary`               | `--neshel-primary`                | Main action fill; link/text colour on background                            | kept      |
| `primaryForeground`     | `--neshel-primary-foreground`     | Text/icons on `primary`                                                     | kept      |
| `secondary`             | `--neshel-secondary`              | Secondary action fill                                                       | new       |
| `secondaryForeground`   | `--neshel-secondary-foreground`   | Text on `secondary`                                                         | new       |
| `accent`                | `--neshel-accent`                 | Gold highlight fill (badges, emphasis). **Not** a text colour on background | new       |
| `accentForeground`      | `--neshel-accent-foreground`      | Text on `accent`                                                            | new       |
| `destructive`           | `--neshel-destructive`            | Dangerous action fill; error text on background                             | new       |
| `destructiveForeground` | `--neshel-destructive-foreground` | Text on `destructive`                                                       | new       |
| `selected`              | `--neshel-selected`               | Selected/current item background                                            | new       |
| `selectedForeground`    | `--neshel-selected-foreground`    | Text on `selected`                                                          | new       |
| `disabled`              | `--neshel-disabled`               | Disabled control fill                                                       | new       |
| `disabledForeground`    | `--neshel-disabled-foreground`    | Disabled control text (contrast-exempt)                                     | new       |
| `border`                | `--neshel-border`                 | Decorative separators (contrast-exempt; alpha allowed)                      | kept      |
| `input`                 | `--neshel-input`                  | Boundary of form controls (3:1)                                             | new       |
| `focus`                 | `--neshel-focus`                  | Focus indicator colour (3:1)                                                | new       |

Hover/active states are **not** separate tokens in 0.x: components derive them (feature 005
decides how, e.g. `color-mix()` on the role). Adding state tokens later is additive.

## Non-colour tokens (theme-independent, declared on `:root`)

| Config path                   | CSS variable            | Default                                                    | Tailwind                                      |
| ----------------------------- | ----------------------- | ---------------------------------------------------------- | --------------------------------------------- |
| `radius.base`                 | `--neshel-radius-base`  | `0.75rem` (kept)                                           | `rounded-neshel-base`                         |
| `radius.sm`                   | `--neshel-radius-sm`    | `calc(var(--neshel-radius-base) * 0.5)`                    | `rounded-neshel-sm`                           |
| `radius.md`                   | `--neshel-radius-md`    | `var(--neshel-radius-base)`                                | `rounded-neshel-md`                           |
| `radius.lg`                   | `--neshel-radius-lg`    | `calc(var(--neshel-radius-base) * 1.5)`                    | `rounded-neshel-lg`                           |
| `radius.xl`                   | `--neshel-radius-xl`    | `calc(var(--neshel-radius-base) * 2)`                      | `rounded-neshel-xl`                           |
| —                             | `--neshel-radius-full`  | `9999px` (not configurable)                                | `rounded-neshel-full`                         |
| `spacing.unit`                | `--neshel-spacing`      | `0.25rem`                                                  | not mapped (layout, feature 003, consumes it) |
| `typography.families.body`    | `--neshel-font-body`    | `Inter, ui-sans-serif, system-ui, sans-serif` (kept)       | `font-neshel-body`                            |
| `typography.families.display` | `--neshel-font-display` | same as body (kept)                                        | `font-neshel-display`                         |
| `typography.families.mono`    | `--neshel-font-mono`    | `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace` | `font-neshel-mono`                            |
| `focus.width`                 | `--neshel-focus-width`  | `2px`                                                      | not mapped                                    |
| `focus.offset`                | `--neshel-focus-offset` | `2px`                                                      | not mapped                                    |

Fonts are names only; the library never loads font files. `Inter` is kept from Phase 001 and
falls back to system fonts when the consumer does not load it.

## Default palette (⚑ Q3)

Derived from the approved logo (`assets/brand/neshel-ui-logo.png`, sampled 2026-11-07:
ivory `#f5f1ee`, navy `#071936` / `#0d2347` / `#193767` / `#244679`, gold `#c49a59` / `#a98458`
/ `#f7d999`). The artwork is not modified.

| Role                    | Light     | Dark      |
| ----------------------- | --------- | --------- |
| `background`            | `#fbf9f6` | `#06132a` |
| `foreground`            | `#0d1b33` | `#f3eee6` |
| `surface`               | `#ffffff` | `#0d2347` |
| `surfaceForeground`     | `#0d1b33` | `#f3eee6` |
| `muted`                 | `#efeae4` | `#122b55` |
| `mutedForeground`       | `#4a5468` | `#b4bccb` |
| `primary`               | `#193767` | `#9fb8e6` |
| `primaryForeground`     | `#ffffff` | `#071936` |
| `secondary`             | `#e4e9f2` | `#193767` |
| `secondaryForeground`   | `#193767` | `#f3eee6` |
| `accent`                | `#c49a59` | `#d9b56f` |
| `accentForeground`      | `#071936` | `#071936` |
| `destructive`           | `#b42318` | `#f97066` |
| `destructiveForeground` | `#ffffff` | `#1a0503` |
| `selected`              | `#dbe4f3` | `#244679` |
| `selectedForeground`    | `#0d2347` | `#ffffff` |
| `disabled`              | `#ece8e3` | `#13274a` |
| `disabledForeground`    | `#8a8f99` | `#6b7891` |
| `border`                | `#e2dcd3` | `#1f3966` |
| `input`                 | `#7d8494` | `#6f82a6` |
| `focus`                 | `#8f6d3f` | `#e0bf7a` |

Notes: the brand gold `#c49a59` reaches only ~2.4:1 on the light background, so the light
focus ring uses a deeper bronze `#8f6d3f`; gold remains the `accent` fill with navy text.

## Contrast pairs

WCAG 2.x relative-luminance ratio. Built-in themes MUST pass (test failure otherwise);
custom themes get diagnostics (warning by default, error under strict mode).

| Foreground              | Background    | Min | Light (computed) | Dark (computed) | Basis                |
| ----------------------- | ------------- | --- | ---------------- | --------------- | -------------------- |
| `foreground`            | `background`  | 4.5 | 16.36            | 16.03           | 1.4.3 text           |
| `surfaceForeground`     | `surface`     | 4.5 | 17.19            | 13.48           | 1.4.3                |
| `mutedForeground`       | `muted`       | 4.5 | 6.36             | 7.32            | 1.4.3                |
| `mutedForeground`       | `background`  | 4.5 | 7.24             | 9.69            | 1.4.3                |
| `mutedForeground`       | `surface`     | 4.5 | 7.61             | 8.15            | 1.4.3                |
| `primaryForeground`     | `primary`     | 4.5 | 11.77            | 8.72            | 1.4.3                |
| `primary`               | `background`  | 4.5 | 11.20            | 9.23            | 1.4.3 (links)        |
| `primary`               | `surface`     | 4.5 | 11.77            | 7.77            | 1.4.3                |
| `secondaryForeground`   | `secondary`   | 4.5 | 9.66             | 10.19           | 1.4.3                |
| `accentForeground`      | `accent`      | 4.5 | 6.75             | 8.98            | 1.4.3                |
| `destructiveForeground` | `destructive` | 4.5 | 6.57             | 7.06            | 1.4.3                |
| `destructive`           | `background`  | 4.5 | 6.26             | 6.64            | 1.4.3 (errors)       |
| `destructive`           | `surface`     | 4.5 | 6.57             | 5.59            | 1.4.3                |
| `selectedForeground`    | `selected`    | 4.5 | 12.16            | 9.43            | 1.4.3                |
| `focus`                 | `background`  | 3   | 4.51             | 10.49           | 1.4.11 / 2.4.13      |
| `focus`                 | `surface`     | 3   | 4.74             | 8.83            | 1.4.11               |
| `input`                 | `background`  | 3   | 3.57             | 4.78            | 1.4.11               |
| `input`                 | `surface`     | 3   | 3.75             | 4.02            | 1.4.11               |
| `disabledForeground`    | `disabled`    | —   | 2.66             | 3.33            | exempt (inactive UI) |

Ratios computed on 2026-11-07 with a throwaway script; feature 002.1 replaces them with the
engine's own test output. Passing these pairs does **not** make an application WCAG
conformant: usage (e.g. gold text on ivory, small text over images) remains the consumer's
responsibility.

## Accepted colour syntax (config input)

`#rgb`, `#rrggbb`, `rgb()`, `hsl()`, `oklch()` — opaque only on contrast-checked roles;
`#rrggbbaa` / alpha forms allowed on `border` only. Named colours, `var()`, `color-mix()`,
`light-dark()` and relative colour syntax are rejected in 0.x (contrast not computable).
Values are emitted as authored (hex lower-cased), not converted.
