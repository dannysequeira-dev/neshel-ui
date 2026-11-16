# Specification analysis — feature 008 (008.0)

Cross-artifact consistency pass over brief.md, spec.md, research.md, contracts, plan.md and
tasks.md, following the `/speckit-analyze` checklist (duplication, ambiguity, underspecification,
constitution alignment, coverage, inconsistency). Run 2026-11-15, before implementation, and
re-run after the browser finding (A5) and the documentation pass.

## Findings

| ID  | Category       | Severity | Location                                                     | Finding                                                                                                  | Resolution                                                                                                                       |
| --- | -------------- | -------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Constitution   | HIGH     | brief §3 "Core Motion Engine" vs ADR 0002                    | The natural home `@neshel-ui/core` is private; a public package cannot depend on it.                     | Resolved: engine inside the package as `./core` (R0, ADR 0018); contract test forbids `@neshel-ui/core`.                         |
| A2  | Constitution   | HIGH     | brief §6 private package vs `check:pack`                     | `check:pack` validates only intended-public packages; a private package's tarball would go unverified.   | Resolved: opt-in `--with <dir>` (never core, never public packages), part of `pnpm check`; default behaviour unchanged.          |
| A3  | Inconsistency  | HIGH     | brief §4 entry points vs brief §6 "exports only implemented" | Six proposed subpaths, one implemented effect.                                                           | Resolved: only `.`, `./core`, `./styles.css`; subpaths evaluated in entry-points.md, decision D3.                                |
| A4  | Underspecified | HIGH     | brief §3 "combine without conflicts"                         | No ownership model for `transform` across CSS and JS effects.                                            | Resolved: channels + composer (R5, ADR 0019); browser-verified lift + tilt.                                                      |
| A5  | Coverage       | HIGH     | Tilt3D hit testing                                           | Not in any artifact before implementation; the first browser run failed (pointerleave oscillation).      | Resolved: FR-065, R6, regression tests in jsdom and Chrome.                                                                      |
| A6  | Ambiguity      | MEDIUM   | brief §7B "real geometry"                                    | Risk of presenting CSS planes as deformation.                                                            | Resolved: FR-071; R7 table; captions state "rigid"/"piecewise planar"; WebGL mesh as the only real deformation.                  |
| A7  | Ambiguity      | MEDIUM   | brief §7A "keyboard when appropriate"                        | Tilt has no keyboard semantics.                                                                          | Resolved: focus pose on `:focus-visible` (FR-056), no key handling, focus outlines untouched.                                    |
| A8  | Constitution   | MEDIUM   | Changesets fixed group                                       | Adding a package could alter release behaviour.                                                          | Resolved: private package, `privatePackages.version: false`; `changeset status` and release guards unchanged (evidence).         |
| A9  | Underspecified | MEDIUM   | brief §8 "browser compatibility"                             | Only Chrome available locally; harness for other engines exists (ADR 0016) but not wired for animations. | Accepted: recorded as pending (SC-007, T045); support claims limited to Chrome.                                                  |
| A10 | Coverage       | MEDIUM   | brief §8 "no unnecessary deps in simple bundles"             | Needs an executable check, not only a static rule.                                                       | Resolved: static import-graph tests on dist and tarball + measured bundles per entry (evidence); `check:bundles` budgets in 009. |
| A11 | Inconsistency  | LOW      | docs/vision.md "Not MVP: animation framework"                | Could read as contradicting feature 008.                                                                 | Resolved: MVP was 0.1.0; 008 is a new gated package (ADR 0018 context).                                                          |
| A12 | Duplication    | LOW      | Skeleton/Button spinner (components) vs F01/F02              | Loading effects overlap with existing components.                                                        | Accepted: catalogue notes reuse; 014 must not duplicate component styles.                                                        |
| A13 | Coverage       | LOW      | CI steps                                                     | New CI steps cannot be verified without a push.                                                          | Accepted: marked unverified (T042/T044).                                                                                         |

No CRITICAL findings. All HIGH findings are resolved by recorded decisions and tests.

## Coverage summary

Every FR in spec.md maps to at least one task and one test or evidence item: FR-001–FR-010 →
T010–T014 (contract tests, tarball); FR-020–FR-040 → T011/T013; FR-050–FR-065 → T020–T023;
FR-070–FR-084 → T030–T033 + browser cases; FR-090–FR-092 → T040–T041/T024; FR-100–FR-110 →
T003–T005/T043 and the `git diff` check in evidence.
