# ADR 0006 — Token stylesheets, cascade layers and theme selection

- Status: **Accepted** (2026-11-07, owner approval of milestone 002.0 with amendment A);
  implemented and CI-verified in feature 002 (see Verification)
- Date: 2026-11-07
- Feature: [002](../../specs/002-config-and-tokens/spec.md); normative detail in
  [contracts/css.md](../../specs/002-config-and-tokens/contracts/css.md)
- Amends: [ADR 0004](0004-package-distribution.md) and `docs/architecture.md` ("exports plus
  `./styles.css`") for `@neshel-ui/config`

## Context

Phase 001 ships one `styles.css` mixing custom properties with a Tailwind `@theme inline` block,
light on `:root`, dark on `[data-neshel-theme="dark"]`, no OS-preference support and no rule for
how configured tokens beat defaults. Phase 001 decided to split plain tokens from the Tailwind
integration in feature 002. The owner approved the direction and required (amendment A) that
cascade claims account for layer-order declaration, Tailwind's layers, unlayered consumer CSS,
import order, explicit versus system selectors, nesting and inheritance, and be backed by
computed-style browser tests.

## Decision

1. **Exports** (D2): `./tokens.css` (standard CSS only), `./tailwind.css` (tokens +
   `@theme inline` mapping to `--color-neshel-*`, `--radius-neshel-*`, `--font-neshel-*`) and
   `./styles.css`, a byte-identical compatibility alias of `tailwind.css` during 0.x. Consumers
   import either `tokens.css` or `tailwind.css`.
2. **Layers**: every Neshel stylesheet begins with `@layer neshel.defaults, neshel.config;`.
   Shipped tokens are in `neshel.defaults`, CLI output in `neshel.config`, both under one parent
   `neshel` layer that consumers may position among their own layers.
3. **Complete blocks**: every theme block — shipped or generated, built-in or named — declares all
   colour roles and `color-scheme`. This prevents leakage caused by layer precedence beating
   specificity (`:root` also matches a dark root) and by inheritance into nested scopes.
4. **Theme selection** (D1, D5): `data-neshel-theme` on any element; absent ⇒ light; `light`/`dark`
   force; `system` follows `prefers-color-scheme`; named themes from configuration. No provider.
5. **Canonical import order**: Tailwind → Neshel stylesheet → generated file → application CSS.
   Other orders are claimed only after the browser check verifies them.
6. **Hygiene**: only `:root` and `[data-neshel-theme=…]` selectors; no resets, `@font-face` or
   `url()`; deterministic output.

## Consequences

- Unlayered consumer CSS beats every Neshel layer, including dark; the documented override
  pattern writes into `@layer neshel.config` per theme selector.
- Under the canonical order Neshel layers follow Tailwind's; the only shared property is
  `color-scheme` (interaction with `scheme-*` utilities documented and tested).
- Generated files are larger (complete blocks) but self-sufficient for plain-CSS consumers.
- New gates: CSS structure tests, Tailwind-free consumer, automated browser check on three OSes.
- Requires browsers with cascade layers (evergreen since 2022).

## Alternatives considered

- Single file with Tailwind directives: unusable without Tailwind.
- Partial override blocks: smaller, but leak across themes under layer precedence.
- Precedence by import order or specificity tricks: fragile in consumer setups.
- React provider / runtime switcher: rejected by the project contract.

## Verification

- Golden, structure and drift tests (`packages/cli/test/generate.test.mjs`,
  `packages/config/test/default-css.test.mjs`); complete blocks in every theme.
- `pnpm check:browser` on Windows, Linux and macOS CI runners: matrix rows 1–12 and cases C1–C9
  for shipped CSS, generated CSS in three import orders and three packed consumers, with a negative
  control proving that a partial `neshel.config` block leaks into dark (why decision 3 exists).
- Finding: Lightning CSS rewrites `@layer a, b; @layer a {…}` as `@layer a {…} @layer b;`; layer
  order is preserved, so consumer assertions check order semantically.
- Import-order independence is claimed for: canonical order, generated before the Neshel
  stylesheet, generated alone. Run IDs: `specs/002-config-and-tokens/evidence.md`.
