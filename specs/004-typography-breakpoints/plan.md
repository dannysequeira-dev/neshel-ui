# Implementation Plan: Typography system and custom responsive breakpoints

**Spec**: [spec.md](spec.md) · **Research**: [research.md](research.md) · **Tasks**: [tasks.md](tasks.md)

## Summary

Make responsive output independent of breakpoint order (one class per written key; cascade and
precedence resolved by CSS source order and custom properties), move the responsive class tables
of each React package into a versioned style manifest rendered by one CLI function, let the CLI
generate complete component stylesheets and a type registry augmentation from
`neshel.config.ts`, and build `@neshel-ui/typography` on the same pipeline with Capsize trimming
expressed through per-font custom properties.

## Technical context

- TypeScript strict, ESM/NodeNext libraries, React 19 peers, `tailwind-variants/lite`,
  `@radix-ui/react-slot`; Node ≥ 22.13 for the CLI; tests on `node:test` + jsdom; browser checks
  through the existing CDP harness; consumers through `check:consumer`.
- New dependencies: `@capsizecss/core` ^4.1.3 (CLI runtime, 48 KB); `@capsizecss/metrics` ^4.4.0
  (CLI dev dependency for tests and the default Inter data check). Typography runtime: the same
  two dependencies as Layout.
- Peer additions: `@neshel-ui/config` (`workspace:^`) for Layout and Typography (types only).

## Constitution check

| Principle                | Plan                                                                                      |
| ------------------------ | ----------------------------------------------------------------------------------------- |
| II Modular packages      | typography/layout do not import each other or components; shared contract in config       |
| III CSS-first            | precompiled CSS, no Tailwind requirement, no interpolated utilities, config at build time |
| IV Accessibility         | semantic elements, no heading changes, rem sizes, contrast-pair tones only                |
| V Precise typography     | Capsize metrics, deterministic CSS, consumer loads fonts                                  |
| VI Evidence              | unit/type/browser/consumer tests, negative controls, CI on three OSes                     |
| VII Spec-driven, minimal | four components only; ADRs 0010/0011; Phase 003 change recorded                           |
| VIII Safe releases       | packages stay private; no publish/tag/release                                             |
| IX Cross-platform        | Node-only scripts, byte-identical output, paths with spaces/Unicode                       |

Deviation recorded: the canonical import order gains "generated stylesheet after package
stylesheets" when breakpoints are configured (contracts/breakpoints.md §5).

## Architecture

```text
neshel.config.ts ──(jiti, CLI)──► validate ─► resolve ─┬─► neshel.generated.css
                                                       │     tokens + metrics (neshel.config)
         @neshel-ui/layout/style-manifest.json ───────┤     fallback @font-face (Capsize)
     @neshel-ui/typography/style-manifest.json ───────┤     component CSS per breakpoint
                                                       │     @theme breakpoints (optional)
                                                       └─► neshel.generated.d.ts (registry)

style-tables.ts (package) ─► runtime classes (tailwind-variants)
                          └► scripts/generate-css.mjs ─► style-manifest.json + styles.css
                                                          (CLI renderer, default breakpoints)
```

### Packages

- **config**: `breakpoints`/`types` schema and `defineConfig` checks; `BreakpointRegistry`,
  `BreakpointName`, `DefaultBreakpointName`; `defaults.breakpoints`, `defaults.typography.metrics`;
  extended `FontMetrics`; `typography.fallbacks`; regenerated `tokens.css`/`tailwind.css` with metric
  properties.
- **cli**: validation (breakpoints, metrics, fallbacks, types path); resolution (effective
  breakpoints, font metric constants, Capsize font stacks); renderer `renderComponentCss`;
  manifest loader; declarations writer; `--types`; multi-output `--check`; stale declaration
  removal.
- **layout**: alignment tables → custom-property classes; base mappings; order-free resolver;
  breakpoint grammar + browser warning; manifest generation; `@neshel-ui/config` peer.
- **typography**: tables, resolver, render (shared ADR 0009 pattern), four components, errors,
  manifest + stylesheet, tests, type fixtures.
- **scripts**: `check-pack` contracts for layout/typography; `check-consumer` variants
  (typography in zero-config apps, `configured-extend`, `configured-replace`); type contract in
  NodeNext and Bundler; `check-browser` boundary sweeps for custom breakpoints and typography;
  negative controls.
- **apps**: Storybook typography and breakpoint stories (custom `neshel.config.ts` in extend mode);
  playground uses typography.

## Milestones

| Milestone | Content                                                                   | Gate                                    |
| --------- | ------------------------------------------------------------------------- | --------------------------------------- |
| 004.0     | spec, research, contracts, plan, tasks, analysis, ADRs 0010/0011          | analysis without critical/high findings |
| 004.1     | config schema, CLI breakpoints + renderer + declarations, layout refactor | layout unit + browser (Phase 003) pass  |
| 004.2     | metrics, Capsize constants, fallbacks, tokens regeneration                | CLI Capsize equivalence tests           |
| 004.3     | typography package                                                        | unit, SSR, type fixtures, pack          |
| 004.4     | consumers, browser sweeps, Storybook                                      | check:consumer, check:browser           |
| 004.5     | docs, changeset, evidence, traceability, CI                               | CI 5/5                                  |

## Risks

| Risk                                                 | Mitigation                                                                                      |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Alignment refactor changes Phase 003 computed styles | Phase 003 browser cases unchanged must pass (SC-001)                                            |
| Module augmentation of a re-exported interface       | Declare `BreakpointRegistry` in the config entry; consumer type tests                           |
| Font fallback mismatch in CI (Inter not installed)   | Browser metric tests use a locally available font with its metrics measured in-page; documented |
| Generated CSS imported in the wrong order            | Documented; browser fixture for the supported order                                             |
| Stylesheet size with many breakpoints                | ≤ 12 breakpoints; measured in evidence                                                          |
