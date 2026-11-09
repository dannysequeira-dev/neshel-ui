# ADR 0013 — Components styling: shared pipeline, manifest schema 2, status colour roles

- Status: **Accepted** (2026-11-08, within the owner's Phase 005 brief); implemented and
  CI-verified in feature 005 (run 42543517738, 5/5 jobs; details in the feature evidence)
- Date: 2026-11-08
- Feature: [005](../../specs/005-components-navigation-shell/spec.md); normative detail in
  [contracts/components-css.md](../../specs/005-components-navigation-shell/contracts/components-css.md)
- Amends: [ADR 0010](0010-custom-breakpoints.md) §3 (manifest schema), feature 002 token contract
  (21 → 25 colour roles); resolves the open decision "whether components reuse the same pipeline"
  (`docs/architecture.md`)

## Context

`@neshel-ui/components` must ship precompiled CSS that works without Tailwind, follows custom
breakpoints, animates overlays, respects reduced motion and expresses status colours (Badge
`success`/`warning`) with semantic tokens.

## Decision

1. Reuse ADR 0008/0010: TypeScript style tables → style manifest → the CLI's shared renderer →
   committed `styles.css`; `neshel generate` renders components for configured breakpoints.
2. Manifest **schema 2** adds optional `keyframes` and `rules[].media`; the CLI accepts 1 and 2;
   Layout and Typography stay on schema 1; the renderer remains pure and deterministic.
3. `tailwind-variants/lite` composes the static classes (no `tailwind-merge`).
4. Colour roles `success`, `successForeground`, `warning`, `warningForeground` join the token
   contract with contrast pairs (4.5:1) and defaults for light and dark; Tailwind `@theme` gains
   the matching colours. Theme inputs are partial, so existing configurations remain valid.
5. Hover/active shades use `color-mix()` of two roles, never literals; component dimensions use
   `--neshel-spacing` and radii tokens; overridable component custom properties have fallbacks.

## Consequences

- One stylesheet per package, layer `components.neshel`, overridable by Tailwind utilities and
  unlayered application CSS.
- Old CLIs reject schema-2 manifests with exit 5 instead of producing partial CSS; CLI and
  components must be upgraded together (already true for layout/typography).
- `color-mix()` requires 2023-era browsers (Chrome 111, Firefox 113, Safari 16.2).
- Token contract version changes: generated CSS, goldens and docs list 25 roles.

## Alternatives considered

- Hand-written CSS file: no single source of truth with runtime classes and no custom
  breakpoints.
- A separate static stylesheet for at-rules: consumers would need two imports with an order rule.
- Tailwind utilities with `@source`: rejected since ADR 0008.
- Opacity-based shades (`rgb(from …)`): relative colour syntax is newer than `color-mix()`.
