# ADR 0010 — Custom breakpoints: order-free runtime, generated component CSS and type registry

- Status: **Accepted** (2026-11-08, within the owner's Phase 004 brief); implemented and
  CI-verified in feature 004 (run 42488883635, 5/5 jobs)
- Date: 2026-11-08
- Feature: [004](../../specs/004-typography-breakpoints/spec.md); normative detail in
  [contracts/breakpoints.md](../../specs/004-typography-breakpoints/contracts/breakpoints.md) and
  [contracts/generation.md](../../specs/004-typography-breakpoints/contracts/generation.md)
- Amends: [ADR 0008](0008-layout-styling-and-css-distribution.md) (§4 fixed breakpoints, alignment
  classes), [ADR 0009](0009-layout-composition-aschild-separators.md) (§6 unknown breakpoint
  error), feature 003 contracts (layout-css class vocabulary)

## Context

Applications must define their own breakpoint names and thresholds (`extend` or `replace`) for
Layout and Typography, with types that know those names, CSS whose media queries contain the
resolved thresholds, no Provider, no browser evaluation of `neshel.config.ts`, no Tailwind
requirement, and unchanged zero-config behaviour. Feature 003's resolver derived CSS values per
breakpoint in a fixed order, so it cannot handle names whose order is only known to the CLI.

## Decision

1. **Order-free runtime.** Every responsive prop emits one class per written key
   (`neshel-<bp>-<key>-<token>`). The cascade (mobile first) comes from the stylesheet's ascending
   media blocks; competing props (`align` < `alignX`/`alignY` < `justify`, Flex axes per
   `direction`) store values in component-scoped custom properties that base rules combine with
   `var()` fallbacks. Output depends only on props: identical on server and client.
2. **Validation boundary.** The runtime validates key grammar and values (throws). Configured names
   are authoritative in generated artefacts only: TypeScript declarations reject unknown names; in
   the browser, keys missing from `--neshel-breakpoints` produce one `console.warn` each.
3. **Style manifests.** Layout and Typography export `./style-manifest.json` (schema 1) generated
   from their TypeScript tables. One CLI renderer produces both the packages' default
   `styles.css` and, when breakpoints are configured, complete component stylesheets inside the
   generated file.
4. **Type registry.** `@neshel-ui/config` declares `BreakpointRegistry` and a conditional
   `BreakpointName`; the generated declarations augment the registry with `names`, which replaces
   the default union (so `replace` mode removes defaults). Layout and Typography peer-depend on
   `@neshel-ui/config` for this type.
5. **Configuration.** `breakpoints: { mode, values, tailwind }`, `rem` only, strictly increasing
   distinct widths, reserved names, case-insensitive uniqueness, ≤ 12 breakpoints; optional Tailwind
   `@theme` breakpoints; `types` path for declarations.

## Consequences

- Phase 003 alignment classes are renamed (`neshel-md-ai-center` → `neshel-md-align-x-center`);
  computed styles are unchanged (Phase 003 browser cases). Repeated values emit repeated classes.
- An unknown well-formed key no longer throws at runtime in zero-config apps (it warns in the
  browser and fails type checking). Malformed keys still throw.
- Flex main-axis `stretch`/`baseline` validation is exact for static `direction` and for keys where
  `direction` is written; other cases fall back to harmless CSS values.
- With configured breakpoints the generated stylesheet must be imported after (or instead of) the
  package stylesheets; it repeats the default rules so its order wins.
- Layout gains a peer dependency on `@neshel-ui/config` (types only; no runtime import).
- The CLI reads installed packages' manifests (data, not code); a schema mismatch fails with exit 5.

## Alternatives considered

- Runtime breakpoint registry (generated JS module or global): every server and client module graph
  must import it; a missing import silently changes classes and breaks hydration.
- Reading breakpoints from CSS at render time: impossible during SSR.
- Generating only custom breakpoints: a breakpoint narrower than `sm` would follow `sm` in source
  order and win incorrectly.
- Per-package type augmentation: augmenting an uninstalled module is an error; registries could
  drift.
- Requiring `base` in responsive objects: breaks accepted Phase 003 usage; optional `base` is
  deterministic.

## Verification

Evidence (details in `specs/004-typography-breakpoints/evidence.md`, CI run 42488883635): CLI validation
matrix and goldens; renderer drift tests; layout unit tests and unchanged Phase 003 browser cases;
type fixtures for zero-config, `extend` and `replace` in NodeNext and Bundler consumers; boundary
sweeps (1 px below / at each threshold) in packed `extend` and `replace` consumers; Tailwind
utilities switching at the same thresholds; CI on Linux, Windows and macOS.
