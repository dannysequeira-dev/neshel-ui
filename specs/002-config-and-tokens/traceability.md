# Traceability — Feature 002

Each requirement maps to the code and the gate that verifies it. "CI" means the five-job GitHub
Actions matrix (Ubuntu Node 22/24/26, Windows Node 26, macOS Node 26); run IDs are in
[evidence.md](evidence.md). Status vocabulary as in the evidence log.

## Functional requirements

| ID     | Requirement (short)                                     | Implementation                                           | Verification                                                    | Status |
| ------ | ------------------------------------------------------- | -------------------------------------------------------- | --------------------------------------------------------------- | ------ |
| FR-001 | 21-role vocabulary; Phase 001 names kept                | `config/src/contract.ts`, generated `tokens.css`         | `contract.test.mjs`, `generate.test.mjs` (complete blocks)      | PASS   |
| FR-002 | Navy/ivory/gold palette; no brand colours in components | `defaults`; `tests/no-hardcoded-colors.test.mjs`         | contract + guard tests; visual capture                          | PASS   |
| FR-003 | Built-ins meet contrast pairs, same implementation      | `cli/src/validate/contrast.ts`                           | `builtin-contrast.test.mjs` (ratios pinned to tokens.md)        | PASS   |
| FR-004 | Disabled pair and border documented as exempt           | `contrastPairs`, `contracts/tokens.md`, theme guide      | contract test (exempt set), docs review                         | PASS   |
| FR-005 | `tokens.css` standard CSS only                          | generator without `tailwind`                             | `default-css.test.mjs`, plain consumer, browser check           | PASS   |
| FR-006 | `tailwind.css` = tokens + namespaced `@theme inline`    | generator with `tailwind`                                | `default-css.test.mjs`, Tailwind consumer utilities             | PASS   |
| FR-007 | `styles.css` byte-identical alias                       | config build copies `tailwind.css`                       | `default-css.test.mjs`, `check:pack`, consumer encapsulation    | PASS   |
| FR-008 | Layer statement first in every stylesheet               | `generate/css.ts`                                        | generator/golden tests; semantic layer order in consumer builds | PASS   |
| FR-009 | Complete theme blocks + `color-scheme`                  | `generate/css.ts`                                        | `generate.test.mjs`; browser C4 and negative control            | PASS   |
| FR-010 | Theme selection D1/D5 on any element                    | selectors in `generate/css.ts`                           | browser matrix rows 1–12                                        | PASS   |
| FR-011 | Canonical order; claims only for verified orders        | theme guide, `contracts/css.md`, architecture            | browser C1–C3 (static) + configured consumer                    | PASS   |
| FR-012 | Selector/at-rule allowlist; no resets/fonts/urls        | generator                                                | `generate.test.mjs`                                             | PASS   |
| FR-013 | Shipped CSS from the CLI generator; drift test          | `scripts/generate-default-css.mjs`                       | `default-css.test.mjs` (drift)                                  | PASS   |
| FR-014 | Browser-safe `.` exports only                           | `config/src/index.ts`                                    | `check:pack` (exports, deps, imports), contract test, SC-006    | PASS   |
| FR-015 | Supported configuration fields                          | `types.ts`, `structure.ts`, `resolve.ts`                 | type fixtures, `structure.test.mjs`, golden outputs             | PASS   |
| FR-016 | Deterministic resolution against defaults               | `resolve.ts`                                             | `generate.test.mjs` (resolution), goldens                       | PASS   |
| FR-017 | Structural diagnostics with path/value/expectation      | `validate/structure.ts`, `diagnostics.ts`                | `structure.test.mjs`, `cmd-validate.test.mjs`                   | PASS   |
| FR-018 | Colour allowlist + Color.js (sRGB/HSL/OKLCH)            | `validate/colour.ts`                                     | `colour.test.mjs`, `validate.test.mjs`                          | PASS   |
| FR-019 | WCAG 2.1 on gamut-mapped sRGB; no conformance claims    | `colour.ts`, `contrast.ts`, `validate/index.ts`          | `colour.test.mjs`, `validate.test.mjs` (message format)         | PASS   |
| FR-020 | Policy `--strict` › `contrast` › warn                   | `effectivePolicy`                                        | `validate.test.mjs` (5 combinations), `cmd-validate.test.mjs`   | PASS   |
| FR-021 | `validate`/`generate` per contract                      | `cli.ts`, `bin.ts`                                       | `cmd-*.test.mjs`, `load.test.mjs`                               | PASS   |
| FR-022 | jiti, 4 extensions, Node ≥22.13, no cache files         | `load/load-config.ts`, `discover.ts`                     | `load.test.mjs` on CI (Node 22/24/26, 3 OSes)                   | PASS   |
| FR-023 | Explicit generation; no install lifecycle scripts       | manifests                                                | `check:pack` lifecycle rule                                     | PASS   |
| FR-024 | Byte-identical output across OS/Node                    | generator                                                | golden tests on every CI job                                    | PASS   |
| FR-025 | Output resolution/rejection; atomic, idempotent writes  | `output.ts`                                              | `cmd-generate.test.mjs`, `io.test.mjs`                          | PASS   |
| FR-026 | `--check` exit 4 when stale/missing                     | `cli.ts`                                                 | `cmd-generate.test.mjs`                                         | PASS   |
| FR-027 | Trusted-code documentation                              | `--help`, CLI README, theme guide, contracts             | `cmd-validate.test.mjs` (help text), docs review                | PASS   |
| FR-028 | `check:pack` contract rules                             | `scripts/lib/pack-checks.mjs`                            | `pack-checks.test.mjs`, `check:pack` on CI                      | PASS   |
| FR-029 | Three TypeScript consumers in spaces/Unicode paths      | `scripts/check-consumer.mjs`, `consumer-configured.mjs`  | `check:consumer` on CI                                          | PASS   |
| FR-030 | Browser check on three OSes                             | `scripts/check-browser.mjs`, `scripts/lib/cdp.mjs`       | CI "Browser cascade check" step on all jobs                     | PASS   |
| FR-031 | Apps migrated; theme demos; token stories               | playground, Storybook `Tokens.stories.tsx`               | app builds on CI; visual capture                                | PASS   |
| FR-032 | Docs and changeset                                      | READMEs, `docs/*`, `.changeset/design-tokens-and-cli.md` | review                                                          | PASS   |

## Success criteria

| ID     | Criterion                                           | Evidence                                                                             | Status                                                |
| ------ | --------------------------------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------- |
| SC-001 | Tailwind and plain consumers from tarballs, 3 OSes  | `check:consumer` (tailwind, plain) on CI                                             | PASS                                                  |
| SC-002 | 100 % built-in pairs pass; ratios published         | `builtin-contrast.test.mjs`; `contracts/tokens.md`                                   | PASS                                                  |
| SC-003 | Byte-identical goldens on 5 CI jobs                 | `generate.test.mjs` + `cmd-generate.test.mjs` goldens on CI                          | PASS                                                  |
| SC-004 | Negative test per exit code and rule family         | exit 1/2/3/4/5 and each diagnostic code covered (`cmd-*`, `load`, `io`, `structure`) | PASS                                                  |
| SC-005 | Precedence matrix in a real browser, 3 OSes         | `check:browser` on CI (static fixtures + three consumers)                            | PASS                                                  |
| SC-006 | `defineConfig`-only bundle < 1 kB; config zero deps | 272 bytes (plain consumer); `check:pack`                                             | PASS                                                  |
| SC-007 | No config → custom theme using documented commands  | configured consumer reproduces quickstart §4 from tarballs (evidence)                | PASS — qualified: automated, not a manual walkthrough |

## User stories

| ID  | Story                          | Evidence                                              | Status |
| --- | ------------------------------ | ----------------------------------------------------- | ------ |
| US1 | Zero-config with Tailwind      | Tailwind consumer; browser matrix on consumer build   | PASS   |
| US2 | Plain CSS without Tailwind     | plain consumer; browser matrix                        | PASS   |
| US3 | Theme switching and precedence | browser matrix rows 1–12, C1–C9; playground/Storybook | PASS   |
| US4 | Typed configuration            | type fixtures; SC-006                                 | PASS   |
| US5 | Validate and generate          | CLI tests; configured consumer                        | PASS   |
