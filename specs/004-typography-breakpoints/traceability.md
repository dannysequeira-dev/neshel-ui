# Traceability — feature 004

Requirement → implementation → verification. Evidence details: [evidence.md](evidence.md).

| Requirement | Implementation                                                             | Verification                                                                                  |
| ----------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| FR-001      | `packages/config/src/types.ts`, `define-config.ts`, `index.ts`             | `packages/config/type-tests/{valid,invalid,registry}.ts`                                      |
| FR-002      | `packages/cli/src/breakpoints.ts` (`validateBreakpoints`)                  | `packages/cli/test/breakpoints.test.mjs` (names, reserved, case, widths, order, count)        |
| FR-003      | `resolveBreakpoints`                                                       | `breakpoints.test.mjs` resolution test                                                        |
| FR-004      | layout `resolve.ts`, typography `render.tsx`                               | layout/typography `render.test.mjs`; browser sweeps                                           |
| FR-005      | order-free `resolve()` / `responsiveEntries()`                             | `render.test.mjs` (key order, custom names); SSR/hydration tests                              |
| FR-006      | `breakpoint-check.ts` `isBreakpointKey`                                    | `errors.test.mjs`, typography `render.test.mjs` errors                                        |
| FR-007      | `warnUnknownBreakpoint` + `--neshel-breakpoints`                           | `packages/layout/test/breakpoints.test.mjs` (SSR silent, once per key, replace mode)          |
| FR-008      | `BreakpointRegistry`, `BreakpointName`, generated declarations             | `type-tests/replace` (layout, typography); consumer type fixtures + negative control          |
| FR-009      | declarations module augmentation                                           | consumers: Bundler and NodeNext `tsc`                                                         |
| FR-010      | `cli/src/load/manifests.ts`, `generate/components.ts`, `generate/css.ts`   | `cmd-breakpoints.test.mjs`; consumers' built CSS checks                                       |
| FR-011      | `scripts/generate-component-css.mjs` (shared renderer)                     | `styles.test.mjs` drift + manifest tests; `check:pack` source equality                        |
| FR-012      | `generate/css.ts` `@theme`                                                 | `breakpoints.test.mjs`; `configured-extend` Tailwind utilities; browser same-threshold case   |
| FR-013      | layout `style-tables.ts` custom-property mapping                           | unchanged Phase 003 browser cases (SC-001); layout unit tests                                 |
| FR-020      | `cli.ts` multi-output write/check                                          | `cmd-breakpoints.test.mjs` (idempotence, `--check`)                                           |
| FR-021      | `typesProblem`, `resolveTypes`                                             | `cmd-breakpoints.test.mjs` (`--types`, invalid paths)                                         |
| FR-022      | deterministic renderer/serialiser                                          | goldens; renderer tests; CI on three OSes                                                     |
| FR-023      | `isGeneratedDeclarations`, stale removal                                   | `cmd-breakpoints.test.mjs` (removal, foreign file kept)                                       |
| FR-030      | `packages/typography/src/index.ts`, `components.tsx`                       | typography `render.test.mjs` exports                                                          |
| FR-031      | `ComponentConfig.elements` / defaults by level                             | `render.test.mjs` semantics; type fixtures                                                    |
| FR-032      | `RESPONSIVE` / `STATIC` tables in `render.tsx`                             | `render.test.mjs`; `styles.test.mjs` sweep                                                    |
| FR-033      | Radix Slot in `render.tsx`                                                 | `composition.test.mjs` (no wrapper, merging, refs, handlers)                                  |
| FR-034      | `.neshel-typography { margin: 0 }`                                         | `styles.test.mjs`; browser `type-in-stack` case                                               |
| FR-035      | typography `styles.css` / manifest                                         | `styles.test.mjs` hygiene; `check:pack` component contract                                    |
| FR-036      | `NeshelTypographyError`                                                    | `render.test.mjs` errors; client/server parity test                                           |
| FR-040      | trim formula (`style-tables.ts`, `fonts.ts`)                               | `capsize.test.mjs` equivalence (1 000 comparisons); browser geometry                          |
| FR-041      | `--neshel-font-<role>-scale`                                               | `capsize.test.mjs` normalisation                                                              |
| FR-042      | `validateMetrics`                                                          | `capsize.test.mjs` validation                                                                 |
| FR-043      | `missing-metrics`, `effectiveMetrics`                                      | `capsize.test.mjs`                                                                            |
| FR-044      | `resolveFont` + `createFontStack`                                          | `capsize.test.mjs` fallbacks                                                                  |
| FR-045      | trim rules in `render.tsx`                                                 | `render.test.mjs` trimming; browser untrimmed/truncate cases; overflow visible                |
| FR-046      | no font assets; `check:pack` font rule                                     | `pack-checks.test.mjs` negative test                                                          |
| FR-050      | package manifests; `checkComponentContract`                                | `check:pack`; `pack-checks.test.mjs`                                                          |
| FR-051      | `scripts/lib/consumer-breakpoints.mjs`, typography in zero-config variants | `pnpm check:consumer` (5 variants)                                                            |
| FR-052      | `scripts/lib/breakpoint-cases.mjs`                                         | `pnpm check:browser` consumer sweeps                                                          |
| FR-053      | negative controls                                                          | drift/missing-rule tests, manifest/schema tests, no-declarations tsc, metric skew, pack tests |
| FR-054      | `apps/storybook` config and `src/typography/*.stories.tsx`                 | Storybook build; visual verification                                                          |

## Brief section coverage

| Brief   | Where                                                                      |
| ------- | -------------------------------------------------------------------------- |
| §4–§6   | contracts/breakpoints.md, ADR 0010, FR-001–FR-009                          |
| §7      | research R3–R5, contracts/generation.md, FR-010–FR-013                     |
| §8      | research R8, FR-012                                                        |
| §9      | research R14, FR-020–FR-023                                                |
| §10–§13 | research R9, contracts/typography-api.md, FR-030–FR-036                    |
| §14–§16 | research S1, R10–R13, ADR 0011, contracts/typography-css.md, FR-040–FR-046 |
| §17     | FR-034; Storybook _Precise gaps_; browser `type-in-stack`                  |
| §18–§20 | FR-050–FR-054                                                              |
| §21     | spec, plan, tasks, analysis, ADRs, this file                               |

## Accepted risks

| Risk                                                                             | Mitigation / status                                                 |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Unknown well-formed breakpoint keys are not rejected at runtime (JS consumers)   | TS declarations; browser warning; documented (R4)                   |
| Default Inter metrics without Inter installed → approximate trims                | Documented; configure metrics/fallbacks; Storybook diagnosis story  |
| Flex main-axis validation incomplete with responsive `direction` and custom keys | Documented (ADR 0010); CSS degrades to harmless values              |
| Generated stylesheet must follow the package stylesheets                         | Documented; both orders of the supported setups tested in consumers |
| Layout stylesheet close to its 48 KiB budget (48 847 bytes)                      | Measured; budget test fails on growth                               |
| Chrome-only browser verification                                                 | Recorded as not verified for Firefox/Safari                         |
