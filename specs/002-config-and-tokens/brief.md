# Feature brief 002 — typed configuration and semantic tokens

**Specified (draft, 2026-11-07); not implemented.** The specification is
[spec.md](spec.md); decisions and the audit of this brief are in [research.md](research.md).
This brief is kept as historical input.

Purpose: typed `defineConfig`, light/dark semantic tokens, CSS-first baseline,
custom config discovery, safe validation, deterministic generated CSS, Capsize
metrics hooks, and an explicitly invoked build-time `neshel generate` command.

Test categories: CSS-only integration, invalid values, deterministic output,
concurrent applications with different themes, missing metrics, color contrast,
zero runtime Node dependencies in public React/browser packages, tree shaking,
Node CLI exit codes and clean standalone consumer from tarball.

Carried-over decision (Phase 001, 2026-11-07): separate the standard CSS token
stylesheet (plain custom properties, usable without Tailwind) from the Tailwind-specific
`@theme inline` integration, as distinct package exports. Names are decided in this slice.

Non-goal: implementing Layout, Typography or interactive Components in this slice.

## Readiness review (Phase 001 closure, 2026-11-08)

Phase 001 delivers what this slice needs: packed-artifact validation (`check:pack`), an
external Vite + Tailwind consumer (`check:consumer`) that derives its expectations from the
shipped stylesheet, NodeNext/ESM packaging, a Node-only `cli` package and browser-safe
packages without runtime dependencies.

Consistency notes on this brief:

- "Capsize metrics hooks" overlaps feature 004 (typography). Decide whether 002 only
  reserves the configuration shape for font metrics or computes Capsize output.
- "Custom config discovery" for `neshel.config.ts` must respect the contributor/CLI floor
  (Node `>=22.13`): native TypeScript type stripping is not available unflagged on every
  supported Node line, so loading a TS config needs an explicit strategy.

Prerequisite decisions for `/speckit-specify` / `/speckit-clarify`:

1. **Token vocabulary**: semantic names, foreground/background pairs, interaction states,
   radius/spacing/typography scope, and whether the Phase 001 baseline names are kept.
2. **Contrast policy**: WCAG AA targets per pair and how they are verified (test, tooling).
3. **CSS export names** for the carried-over split (plain tokens vs Tailwind `@theme`
   integration) and the fate of the current `./styles.css` (alias, rename, or removal while
   pre-1.0).
4. **Cascade and theme selection**: `:root` defaults, `[data-neshel-theme]` overrides,
   `prefers-color-scheme` behaviour (none today), use of `@layer`, precedence of generated CSS.
5. **Tailwind namespace**: keep `*-neshel-*` utilities (current) or unprefixed tokens;
   collision policy with consumer themes.
6. **Config loading in the CLI**: TS config loader (dependency vs higher CLI floor),
   evaluation safety, discovery rules, and output path.
7. **Validation approach**: hand-written validators vs a schema dependency (constitution:
   minimal dependencies); error message format and CLI exit codes.
8. **Testing for TypeScript source**: keep `node:test` against built output or adopt a test
   runner for package unit tests; decide before code lands.
9. **Gate extensions**: new CSS subpaths in `check:pack` expectations and in
   `check:consumer` (including a Tailwind-free consumer for the plain token stylesheet).
