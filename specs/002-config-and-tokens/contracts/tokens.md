# Contract — Semantic tokens

Status: **approved for implementation** (owner, 2026-11-07, D3); not implemented. Machine-readable
source of truth after 002.1: `colorRoles`, `contrastPairs` and `defaults` exported by
`@neshel-ui/config` (see [config-api.md](config-api.md)).

## Colour roles

Config keys are camelCase; CSS variables are `--neshel-` + kebab-case. Tailwind exposes each role
as `--color-neshel-<role>` (utilities `bg-`, `text-`, `border-`, `ring-`, `outline-`, `fill-`,
`stroke-neshel-<role>`). The order below is the canonical emission order.

| #   | Config key              | CSS variable                      | Purpose                                                  | Phase 001 |
| --- | ----------------------- | --------------------------------- | -------------------------------------------------------- | --------- |
| 1   | `background`            | `--neshel-background`             | Page / app background                                    | kept      |
| 2   | `foreground`            | `--neshel-foreground`             | Default text on `background`                             | kept      |
| 3   | `surface`               | `--neshel-surface`                | Raised containers (cards, popovers)                      | kept      |
| 4   | `surfaceForeground`     | `--neshel-surface-foreground`     | Text on `surface`                                        | new       |
| 5   | `muted`                 | `--neshel-muted`                  | Subtle backgrounds                                       | new       |
| 6   | `mutedForeground`       | `--neshel-muted-foreground`       | Secondary text on muted, background and surface          | new       |
| 7   | `primary`               | `--neshel-primary`                | Main action fill; link/text colour on background/surface | kept      |
| 8   | `primaryForeground`     | `--neshel-primary-foreground`     | Text/icons on `primary`                                  | kept      |
| 9   | `secondary`             | `--neshel-secondary`              | Secondary action fill                                    | new       |
| 10  | `secondaryForeground`   | `--neshel-secondary-foreground`   | Text on `secondary`                                      | new       |
| 11  | `accent`                | `--neshel-accent`                 | Gold highlight **fill**; not a text colour on background | new       |
| 12  | `accentForeground`      | `--neshel-accent-foreground`      | Text on `accent`                                         | new       |
| 13  | `destructive`           | `--neshel-destructive`            | Dangerous action fill; error text on background/surface  | new       |
| 14  | `destructiveForeground` | `--neshel-destructive-foreground` | Text on `destructive`                                    | new       |
| 15  | `selected`              | `--neshel-selected`               | Selected/current item background                         | new       |
| 16  | `selectedForeground`    | `--neshel-selected-foreground`    | Text on `selected`                                       | new       |
| 17  | `disabled`              | `--neshel-disabled`               | Disabled control fill                                    | new       |
| 18  | `disabledForeground`    | `--neshel-disabled-foreground`    | Disabled control text (contrast-exempt)                  | new       |
| 19  | `border`                | `--neshel-border`                 | Decorative separators (contrast-exempt; alpha allowed)   | kept      |
| 20  | `input`                 | `--neshel-input`                  | Boundary of form controls (3:1)                          | new       |
| 21  | `focus`                 | `--neshel-focus`                  | Focus indicator colour (3:1)                             | new       |

Hover/active states are not tokens in 0.x; feature 005 derives them. Adding roles is additive
(minor pre-1.0); renaming or removing one is breaking.

## Non-colour tokens (theme-independent, declared on `:root`)

| Config path                   | CSS variable            | Default                                                    | Tailwind                 |
| ----------------------------- | ----------------------- | ---------------------------------------------------------- | ------------------------ |
| `radius.base`                 | `--neshel-radius-base`  | `0.75rem` (kept)                                           | `rounded-neshel-base`    |
| `radius.sm`                   | `--neshel-radius-sm`    | `calc(var(--neshel-radius-base) * 0.5)`                    | `rounded-neshel-sm`      |
| `radius.md`                   | `--neshel-radius-md`    | `var(--neshel-radius-base)`                                | `rounded-neshel-md`      |
| `radius.lg`                   | `--neshel-radius-lg`    | `calc(var(--neshel-radius-base) * 1.5)`                    | `rounded-neshel-lg`      |
| `radius.xl`                   | `--neshel-radius-xl`    | `calc(var(--neshel-radius-base) * 2)`                      | `rounded-neshel-xl`      |
| —                             | `--neshel-radius-full`  | `9999px` (fixed)                                           | `rounded-neshel-full`    |
| `spacing.unit`                | `--neshel-spacing`      | `0.25rem`                                                  | not mapped (feature 003) |
| `typography.families.body`    | `--neshel-font-body`    | `Inter, ui-sans-serif, system-ui, sans-serif` (kept)       | `font-neshel-body`       |
| `typography.families.display` | `--neshel-font-display` | `Inter, ui-sans-serif, system-ui, sans-serif` (kept)       | `font-neshel-display`    |
| `typography.families.mono`    | `--neshel-font-mono`    | `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace` | `font-neshel-mono`       |
| `focus.width`                 | `--neshel-focus-width`  | `2px`                                                      | not mapped               |
| `focus.offset`                | `--neshel-focus-offset` | `2px`                                                      | not mapped               |

Font families are names; the library never loads font files. `typography.metrics` is reserved
(no CSS) until feature 004.

## Brand references (D3)

Design references, not token values: Midnight `#040D1D`, Navy `#071936`, Blue `#244679`,
Gold `#C49A59`, Ivory `#F5F1EE` (consistent with colours sampled from
`assets/brand/neshel-ui-logo.png` on 2026-11-07). The artwork is not modified.

## Default palette

| Role                    | Light     | Dark      | Reference                       |
| ----------------------- | --------- | --------- | ------------------------------- |
| `background`            | `#fbf9f6` | `#040d1d` | Ivory (lightened) / Midnight    |
| `foreground`            | `#0d1b33` | `#f3eee6` | Navy ink / Ivory                |
| `surface`               | `#ffffff` | `#0d2347` |                                 |
| `surfaceForeground`     | `#0d1b33` | `#f3eee6` |                                 |
| `muted`                 | `#efeae4` | `#122b55` |                                 |
| `mutedForeground`       | `#4a5468` | `#b4bccb` |                                 |
| `primary`               | `#193767` | `#9fb8e6` | Navy–Blue / light Blue          |
| `primaryForeground`     | `#ffffff` | `#071936` | — / Navy                        |
| `secondary`             | `#e4e9f2` | `#193767` |                                 |
| `secondaryForeground`   | `#193767` | `#f3eee6` |                                 |
| `accent`                | `#c49a59` | `#d9b56f` | Gold / light Gold               |
| `accentForeground`      | `#071936` | `#071936` | Navy                            |
| `destructive`           | `#b42318` | `#f97066` | non-brand, chosen for contrast  |
| `destructiveForeground` | `#ffffff` | `#1a0503` |                                 |
| `selected`              | `#dbe4f3` | `#244679` | — / Blue                        |
| `selectedForeground`    | `#0d2347` | `#ffffff` |                                 |
| `disabled`              | `#ece8e3` | `#13274a` |                                 |
| `disabledForeground`    | `#8a8f99` | `#6b7891` |                                 |
| `border`                | `#e2dcd3` | `#1f3966` |                                 |
| `input`                 | `#7d8494` | `#6f82a6` |                                 |
| `focus`                 | `#8f6d3f` | `#e0bf7a` | deep Gold (bronze) / light Gold |

Gold `#C49A59` reaches only ~2.4:1 on the light background, so it is used as a fill with navy
text, and the light focus colour is a deeper bronze.

## Contrast pairs

WCAG 2.1 relative-luminance ratio, colours gamut-mapped to sRGB. Built-in themes MUST pass
(test failure). Custom themes receive diagnostics under the effective policy
([cli.md](cli.md#contrast-policy)).

| Foreground              | Background    | Min | Light | Dark  | Basis                |
| ----------------------- | ------------- | --- | ----- | ----- | -------------------- |
| `foreground`            | `background`  | 4.5 | 16.36 | 16.83 | 1.4.3                |
| `surfaceForeground`     | `surface`     | 4.5 | 17.19 | 13.48 | 1.4.3                |
| `mutedForeground`       | `muted`       | 4.5 | 6.36  | 7.32  | 1.4.3                |
| `mutedForeground`       | `background`  | 4.5 | 7.24  | 10.18 | 1.4.3                |
| `mutedForeground`       | `surface`     | 4.5 | 7.61  | 8.15  | 1.4.3                |
| `primaryForeground`     | `primary`     | 4.5 | 11.77 | 8.72  | 1.4.3                |
| `primary`               | `background`  | 4.5 | 11.20 | 9.69  | 1.4.3 (links)        |
| `primary`               | `surface`     | 4.5 | 11.77 | 7.77  | 1.4.3                |
| `secondaryForeground`   | `secondary`   | 4.5 | 9.66  | 10.19 | 1.4.3                |
| `accentForeground`      | `accent`      | 4.5 | 6.75  | 8.98  | 1.4.3                |
| `destructiveForeground` | `destructive` | 4.5 | 6.57  | 7.07  | 1.4.3                |
| `destructive`           | `background`  | 4.5 | 6.26  | 6.98  | 1.4.3 (errors)       |
| `destructive`           | `surface`     | 4.5 | 6.57  | 5.59  | 1.4.3                |
| `selectedForeground`    | `selected`    | 4.5 | 12.16 | 9.43  | 1.4.3                |
| `focus`                 | `background`  | 3   | 4.51  | 11.02 | 1.4.11 / 2.4.13      |
| `focus`                 | `surface`     | 3   | 4.74  | 8.83  | 1.4.11               |
| `input`                 | `background`  | 3   | 3.57  | 5.02  | 1.4.11               |
| `input`                 | `surface`     | 3   | 3.75  | 4.02  | 1.4.11               |
| `disabledForeground`    | `disabled`    | —   | 2.66  | 3.33  | exempt (inactive UI) |

Ratios computed 2026-11-07 with Color.js 0.7.1 `contrastWCAG21` in a throwaway spike outside the
repository (Windows 11, Node 26); 002.1 replaces them with the CLI test output. Passing these
pairs does **not** make an application WCAG conformant: usage (gold text on ivory, small text over
images, non-token colours) remains the consumer's responsibility.

## Accepted colour syntax (configuration input)

`#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`, `rgb()`/`rgba()`, `hsl()`/`hsla()`, `oklch()`.

- Opaque only on contrast-checked roles (all except `border`).
- Rejected in 0.x: named colours, `transparent`, `currentColor`, `var()`, `color-mix()`,
  `light-dark()`, relative colour syntax, `lab()`, `lch()`, `oklab()`, `color()`, `hwb()`.
- Out-of-sRGB-gamut values: warning; contrast computed after CSS gamut mapping.
- Values are emitted as authored after trimming; hex is lower-cased.
