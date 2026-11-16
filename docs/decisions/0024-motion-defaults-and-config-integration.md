# ADR 0024 — Motion defaults and future Config integration

- Status: **Accepted** (owner approval 2026-11-16); implementation in Phase 009
- Date: 2026-11-15
- Feature: [009](../../specs/009-motion-engine/spec.md); research R9;
  [contracts/motion-defaults.md](../../specs/009-motion-engine/contracts/motion-defaults.md)

## Context

Owner decision D5 (2026-11-15): keep motion defaults inside Animations at first and design their future
integration with `@neshel-ui/config` without breaking existing contracts. Library stylesheets must not
add global rules beyond documented opt-in styles (ADR 0008); Config's published contract (ADR 0006/0007)
must not change in this phase.

## Decision

1. Typed, frozen `motionDefaults` (durations, easings, distances, spring presets) in
   `@neshel-ui/animations/core`.
2. CSS custom properties `--neshel-motion-*` are **read with fallbacks** by package rules and **never
   declared globally** by the package; applications override them on `:root` or any subtree.
3. Future integration (designed, not implemented): an optional `motion` key in `defineConfig`, emitted
   by `neshel generate` as the same custom properties in `@layer neshel.config`. Purely additive: no
   existing key, token, export or stylesheet changes; Animations never imports Config at runtime.
   Requires an owner-approved minor release of Config and CLI.

## Consequences

- Zero-config usage keeps working; theming of motion is possible today via CSS.
- The coupling between packages is only the documented custom-property names.

## Alternatives

Add motion tokens to Config now (owner chose otherwise, D5); declare defaults on `:root` from the
package stylesheet (global rule, rejected by ADR 0008); JavaScript-only defaults (not overridable
from CSS).

## Verification (planned)

Stylesheet hygiene test (no `:root`/global declarations), fallback tests in the lab, documentation of
the integration contract.
