# Contract — components stylesheet and style manifest schema 2

## Distribution

- `@neshel-ui/components/styles.css`: precompiled, `@layer components.neshel`, generated from
  `src/style-tables.ts` by `pnpm generate:component-css` through the CLI renderer with the default
  breakpoints; committed as `src/styles.css`, copied to `dist/`.
- `@neshel-ui/components/style-manifest.json`: schema 2 (below), read by `neshel generate`.
- Canonical import order: Tailwind (optional) → `@neshel-ui/config` stylesheet → generated config
  CSS (no breakpoints) → package stylesheets (layout, typography, components, any order) →
  application CSS. With configured breakpoints the generated stylesheet is imported after the
  package stylesheets (ADR 0010); it contains complete components rules.
- No Tailwind directives, resets, element selectors outside component roots, `@import`, fonts or
  colour literals. Colours are `var(--neshel-<role>)` or `color-mix()` of two roles.

## Class vocabulary

`neshel-<component>[-<part>]` for parts, `neshel-<component>-<prop>-<value>` for static variants,
`neshel-[<bp>-]button-size-<size>` / `neshel-[<bp>-]shell-desktop` /
`neshel-[<bp>-]navbar-nav-visible` / `neshel-[<bp>-]menu-desktop` for responsive classes.
State uses attributes: native (`:disabled`, `[aria-invalid="true"]`, `[aria-current="page"]`,
`[aria-expanded="true"]`), Radix (`[data-state]`, `[data-side]`, `[data-highlighted]`,
`[data-disabled]`) and Base UI (`[data-highlighted]`, `[data-selected]`, `[data-disabled]`,
`[data-popup-open]`, `[data-starting-style]`, `[data-ending-style]`) attributes, plus Neshel
attributes (`data-loading`, `data-collapsed`, `data-collapsible`, `data-mode`).

## Tokens consumed

Colour roles (25 since feature 005), radii (`--neshel-radius-*`), spacing (`--neshel-spacing`),
fonts (`--neshel-font-body`, `--neshel-font-mono`), focus (`--neshel-focus`, `--neshel-focus-width`,
`--neshel-focus-offset`). Component-level custom properties with fallbacks (overridable by
applications): `--neshel-sidebar-width` (16rem), `--neshel-sidebar-rail-width` (3.5rem),
`--neshel-navbar-height` (3.5rem), `--neshel-z-overlay` (50), `--neshel-z-popover` (60),
`--neshel-overlay-backdrop` (`color-mix(in srgb, var(--neshel-foreground) 45%, transparent)`).

## Motion

Keyframes `neshel-fade-in/out`, `neshel-zoom-in/out`, `neshel-slide-in/out-{left,right,top,bottom}`,
`neshel-pulse`, `neshel-spin`. Under `@media (prefers-reduced-motion: reduce)` overlay animations
and the skeleton pulse are `animation: none` (Radix Presence unmounts immediately), the loading
spinner slows to 1.5 s, and Base UI transitions are removed.

## Style manifest schema 2

Schema 1 (feature 004) plus two optional fields:

```jsonc
{
  "schema": 2,
  "package": "@neshel-ui/components",
  "version": "0.0.0",
  "layer": "components.neshel",
  "keyframes": [
    {
      "name": "neshel-fade-in",
      "frames": [{ "selector": "from", "declarations": [["opacity", "0"]] }]
    }
  ],
  "rules": [
    {
      "selector": ".neshel-skeleton",
      "declarations": [["animation", "…"]],
      "media": "(prefers-reduced-motion: reduce)"
    }
  ],
  "responsive": [{ "class": "button-size-sm", "declarations": [["min-block-size", "2rem"]] }]
}
```

- `keyframes[].name`: `^neshel-[a-z0-9-]+$`, unique; `frames[].selector`: `from`, `to` or
  percentages; declarations as in schema 1.
- `rules[].media`: optional media condition matching `^\([a-z0-9 :().,-]+\)$` without braces or
  semicolons. Consecutive rules with the same `media` render in one `@media` block, in order.
- Rendering order: registry, keyframes, rules (with media blocks in place), responsive base,
  breakpoint blocks — deterministic and byte-identical across OSes.
- The CLI accepts schemas 1 and 2. A schema-1 manifest with `media` or `keyframes` is invalid.

## Size budget

`styles.css` ≤ 64 KiB raw and ≤ 10 KiB gzip with the default breakpoints (measured in evidence).
