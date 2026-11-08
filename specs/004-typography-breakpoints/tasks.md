# Tasks: Typography system and custom responsive breakpoints

Dependency-ordered. `[P]` = can run in parallel with the previous task. Status: `[x]` done,
`[ ]` open. Requirement links in parentheses.

## 004.0 — Architecture and specification

- [x] T001 Reconstruct context (constitution, ADRs 0001–0009, docs, specs 002/003, packages, scripts)
- [x] T002 Spikes S1 (Capsize formula), S2 (Tailwind camelCase), S3 (package sizes)
- [x] T003 spec.md, brief.md, research.md (R1–R14)
- [x] T004 Contracts: breakpoints, generation, typography-api, typography-css
- [x] T005 plan.md, tasks.md, data-model.md, quickstart.md, checklists/requirements.md
- [x] T006 ADR 0010 (custom breakpoints) and ADR 0011 (typography and Capsize)
- [x] T007 Consistency analysis (analysis.md); resolve critical/high findings

## 004.1 — Custom breakpoint foundation

- [ ] T010 config: `breakpoints`, `types`, `BreakpointRegistry`, `BreakpointName`, `defaults.breakpoints`; `defineConfig` exactness; type fixtures (FR-001, FR-008)
- [ ] T011 cli: breakpoint structural validation and diagnostics (FR-002) with negative matrix tests
- [ ] T012 cli: effective breakpoint resolution, sorted (FR-003)
- [ ] T013 cli: `renderComponentCss` + manifest validation (FR-010, FR-011, FR-022)
- [ ] T014 cli: declarations writer, `--types`, multi-output `--check`, stale removal (FR-020–FR-023)
- [ ] T015 cli: Tailwind `@theme` output (FR-012)
- [ ] T016 layout: alignment custom-property tables and base mappings (contracts/typography-css.md §3)
- [ ] T017 layout: order-free resolver, grammar validation, browser registry warning (FR-005–FR-007)
- [ ] T018 layout: `BreakpointName` from config, peer dependency, type fixtures updated (FR-008)
- [ ] T019 layout: manifest + stylesheet generation through the CLI renderer; drift tests
- [ ] T020 layout: unit tests updated; Phase 003 browser cases pass unchanged (FR-013, SC-001)
- [ ] T021 check-pack: layout contract (exports, peers, manifest equals stylesheet)

## 004.2 — Typography metrics and Capsize

- [ ] T030 config: extended `FontMetrics`, `typography.fallbacks`, `defaults.typography.metrics` (Inter)
- [ ] T031 cli: metrics/fallbacks validation (`invalid-metrics`, `missing-metrics`, `invalid-fallbacks`) (FR-042, FR-043)
- [ ] T032 cli: metric constants, `createFontStack` fallbacks, generated tokens (FR-041, FR-044)
- [ ] T033 cli: Capsize equivalence tests against `@capsizecss/core` (FR-040, SC-004)
- [ ] T034 config: regenerate `tokens.css`/`tailwind.css`; update goldens; Inter data test

## 004.3 — Typography components

- [ ] T040 typography: style tables (sizes, weights, leading, tones, …) and manifest/stylesheet generation
- [ ] T041 typography: resolver, errors, breakpoint grammar + warning module (shared copy, drift test)
- [ ] T042 typography: render with `as`/`asChild`, trim rules (FR-031, FR-033, FR-045)
- [ ] T043 typography: Heading, Text, Paragraph, Caption + exports (FR-030, FR-032, FR-034)
- [ ] T044 typography: unit tests (variants, responsive, errors, refs, asChild, SSR, hydration)
- [ ] T045 typography: type fixtures (valid/invalid)
- [ ] T046 typography: package manifest (deps, peers, exports, files); check-pack contract (FR-035, FR-050)

## 004.4 — Responsive integration and external consumers

- [ ] T050 check-consumer: typography in zero-config Tailwind and plain apps
- [ ] T051 check-consumer: `configured-extend` and `configured-replace` apps (Layout + Typography, generated CSS + declarations, Tailwind in extend) (FR-051)
- [ ] T052 check-consumer: TypeScript declaration fixtures in NodeNext and Bundler; obsolete default rejected (SC-003)
- [ ] T053 check-browser: boundary sweeps (1 px below / at) for custom breakpoints in Layout and Typography (FR-052, SC-002)
- [ ] T054 check-browser: Capsize geometry (cap top / baseline) with in-page metrics; mismatch negative control (SC-004)
- [ ] T055 check-browser: Tailwind and Neshel switch at the same threshold (US5)
- [ ] T056 negative controls: broken manifest/CSS/types/exports detected (FR-053)
- [ ] T057 Storybook: typography and custom breakpoint stories with distributed CSS (FR-054)
- [ ] T058 Playground: typography and configured breakpoints

## 004.5 — Documentation and closure

- [ ] T060 docs: typography.md, layout.md, theming.md, package-contracts.md, architecture.md, roadmap.md, READMEs
- [ ] T061 changeset
- [ ] T062 `pnpm check`, consumers, browser locally; evidence.md
- [ ] T063 push; CI 5/5; traceability.md; closure status
