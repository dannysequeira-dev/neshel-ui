# ADR 0006 — Token stylesheets, cascade layers and theme selection

- Status: **Proposed** (2026-11-07) — pending owner review; not implemented
- Date: 2026-11-07
- Feature: [002](../../specs/002-config-and-tokens/spec.md); detail in
  [contracts/css.md](../../specs/002-config-and-tokens/contracts/css.md)
- Amends: [ADR 0004](0004-package-distribution.md) and `docs/architecture.md` ("exports plus
  `./styles.css`") for `@neshel-ui/config` only

## Context

Phase 001 ships one `styles.css` mixing plain custom properties with a Tailwind `@theme inline`
block, light on `:root`, dark on `[data-neshel-theme="dark"]`, no OS-preference support, and no
rule for how generated consumer tokens beat defaults. Phase 001 decided to split the plain
token stylesheet from the Tailwind integration in feature 002.

## Decision

1. `@neshel-ui/config` exports `./tokens.css` (standard CSS only) and `./tailwind.css`
   (tokens + `@theme inline` mapping to `--color-neshel-*`, `--radius-neshel-*`,
   `--font-neshel-*`). Both are self-contained and generated at build time by the same engine
   that generates consumer CSS.
2. `./styles.css`: deprecated, byte-identical alias of `./tailwind.css` during 0.x
   (owner decision Q2; alternative: removal).
3. Every Neshel stylesheet starts with `@layer neshel.defaults, neshel.config;`. Shipped
   tokens live in `neshel.defaults`; CLI output in `neshel.config`. Import order does not
   affect precedence.
4. Theme selection uses `data-neshel-theme` on any element: `light`, `dark`, `system`
   (follows `prefers-color-scheme`) and configured names. Explicit values override the OS.
   With no attribute, the page is light (owner decision Q1; alternative: follow the OS).
5. Selectors are limited to `:root` and `[data-neshel-theme=…]`; no resets, element selectors,
   `@font-face` or `url()`.

## Consequences

- Tailwind-free consumers get a supported entry; Tailwind consumers keep `*-neshel-*` utilities.
- Unlayered consumer overrides beat every Neshel layer, including dark; the recommended
  override pattern (inside `@layer neshel.config`, per theme) must be documented.
- `check:pack` and `check:consumer` gain new expectations, including a Tailwind-free consumer.
- Requires browsers with cascade layers (evergreen since 2022).

## Alternatives considered

- Single file with Tailwind directives: unusable without Tailwind.
- Precedence by import order or selector specificity: fragile, depends on consumer setup.
- React provider / JS theme switcher: rejected by project contract (CLAUDE.md, constitution III).

## Verification (planned)

CSS structure tests, golden files, three packed consumers, browser precedence matrix with
emulated `prefers-color-scheme` (feature 002 SC-001, SC-003, SC-005).
