# ADR 0008 — Layout styling: tailwind-variants lite, namespaced precompiled CSS, cascade layer

- Status: **Accepted** (2026-11-08, within the owner's Phase 003 brief); implemented and
  CI-verified in feature 003 (see Verification)
- Date: 2026-11-08
- Feature: [003](../../specs/003-layout-system/spec.md); normative detail in
  [contracts/layout-css.md](../../specs/003-layout-system/contracts/layout-css.md)
- Resolves: "Component-level CSS distribution strategy and choice of class variance tooling"
  (open decision in `docs/architecture.md`)

## Context

`@neshel-ui/layout` must work in applications with and without Tailwind, must not require
consumers to compile Neshel sources or add `@source` into `node_modules`, must support typed
responsive props, and the owner requires `tailwind-variants` as the principal composition tool.
Tailwind utilities shipped by a library would depend on the consumer's Tailwind configuration and
be missing entirely without Tailwind.

## Decision

1. **Own class vocabulary**: the runtime emits only `neshel-*` classes; no Tailwind utility
   names (research R1).
2. **Single source of truth**: a TypeScript table module defines CSS properties, value tokens,
   class names and declarations. It feeds `tailwind-variants` variant maps at runtime and a
   generator that writes the committed `src/styles.css` (copied to `dist/styles.css` by `build`).
   A drift test and an exhaustive class/stylesheet consistency test guard both directions.
3. **`tailwind-variants/lite`** (^3.3.1): `tv()` with `base`, `variants`, `defaultVariants` and
   `extend`; no `tailwind-merge`, because no emitted class is a Tailwind utility and each CSS
   property receives at most one class per breakpoint.
4. **Responsive values** are resolved per breakpoint into static, prefixed classes
   (`neshel-md-gap-4`); `min-width` media queries at 40/48/64/80/96rem, identical to Tailwind v4
   defaults. Class names come from table lookups, never from user input.
5. **Cascade layer** `components.neshel`: Tailwind utilities and unlayered application CSS
   override layout classes; canonical import order: Tailwind → config stylesheet → generated
   config CSS → layout stylesheet → application CSS.
6. **Hygiene**: class selectors only, no resets, no Tailwind directives, no colour literals; the
   separator colour is `var(--neshel-border)`; size budget ≤ 48 KiB raw / 8 KiB gzip.

## Consequences

- Tailwind-free consumers get identical layout behaviour; Tailwind consumers can override any
  layout declaration with a utility.
- Breakpoints are fixed for 003; custom breakpoints would require a generated layout stylesheet
  (future CLI work).
- The stylesheet contains every responsive combination (~650 single-class rules) whether used or
  not; acceptable within the budget, measured in evidence.
- Importing the layout stylesheet before Tailwind is unsupported (preflight in `base` would beat
  `margin-inline: auto`).

## Alternatives considered

- Tailwind utilities + documented `@source`: rejected by the brief; breaks Tailwind-free apps.
- Compiling Tailwind utilities into our stylesheet: name clashes with the consumer's utilities.
- Inline styles / CSS variables per element for every value: overrides need `!important` or
  extra variables; noisier DOM; static classes are simpler to verify.
- Full `tailwind-variants` entry: adds `tailwind-merge` without benefit.
- Top-level `neshel.layout` layer: ordered after Tailwind's layers, so it would beat utilities.

## Verification

- Drift and exhaustive consistency tests (`packages/layout/test/styles.test.mjs`): 661 classes,
  every emitted class defined and every rule reachable; negative controls detected.
- `check:pack` layout contract (exports, exact dependencies, allowed imports, stylesheet hygiene,
  tarball stylesheet equals the committed source); manual mutations fail as expected.
- `check:consumer` Tailwind and plain variants from tarballs (no `@source`), `check:browser`
  computed styles at 360–1600 px, the Tailwind-utility override and both import orders.
- Size: 42 283 bytes raw, 3 584 bytes gzip.
- CI: runs 42480913188 (`73ac0c9`), 42481749103 (`3656920`) and 42482142182 (`f31878a`), 5/5 jobs each. Details: `specs/003-layout-system/evidence.md`.
