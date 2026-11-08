# Specification analysis — feature 004 (004.0)

Cross-artifact consistency pass over spec.md, research.md, contracts, plan.md and tasks.md,
following the `/speckit-analyze` checklist (duplication, ambiguity, underspecification,
constitution alignment, coverage, inconsistency). Run 2026-11-08 before implementation.

## Findings

| ID  | Category       | Severity | Location                    | Finding                                                                                             | Resolution                                                                                                      |
| --- | -------------- | -------- | --------------------------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| A1  | Constitution   | HIGH     | brief §11 vs R7             | Brief asks for required `base`; Phase 003 contract makes it optional.                               | Resolved: R7 keeps optional `base` under the brief's own exception; documented in spec and ADR 0010.            |
| A2  | Inconsistency  | HIGH     | ADR 0009 §6 vs R4           | Phase 003 throws for unknown breakpoints; 004 cannot know configured names at runtime.              | Resolved: ADR 0010 amends ADR 0009; grammar errors still throw; warning + types cover unknown names.            |
| A3  | Inconsistency  | MEDIUM   | 002/003 import order vs 004 | Canonical order put generated CSS before package stylesheets.                                       | Resolved: contracts/breakpoints.md §5 states the new order with configured breakpoints; browser fixture (T053). |
| A4  | Underspecified | MEDIUM   | Flex validation             | Exact Flex main-axis validation needs breakpoint order.                                             | Resolved: contract §3 of typography-css.md defines the exact subset and the CSS fallback.                       |
| A5  | Coverage       | MEDIUM   | FR-046                      | "No font files" had no task.                                                                        | Resolved: T046 includes a check-pack rule rejecting font files in tarballs.                                     |
| A6  | Duplication    | LOW      | layout/typography runtime   | Breakpoint grammar and warning code would exist in two packages (no shared public runtime package). | Accepted: byte-identical module guarded by a drift test (T041); `core` cannot be a dependency.                  |
| A7  | Ambiguity      | LOW      | SC-004 "within 1 px"        | Which box is measured?                                                                              | Resolved: T054 measures element top vs first-line cap top and element bottom vs last baseline.                  |
| A8  | Underspecified | LOW      | fallbacks need `xWidthAvg`  | `createFontStack` needs `xWidthAvg` and `familyName`.                                               | Resolved: data-model.md; CLI reports `invalid-fallbacks` when missing.                                          |

No CRITICAL findings. HIGH findings A1–A2 are resolved by recorded decisions.

## Coverage

| Requirement group | Tasks                       |
| ----------------- | --------------------------- |
| FR-001–FR-013     | T010–T021, T051–T053        |
| FR-020–FR-023     | T014                        |
| FR-030–FR-036     | T040–T046                   |
| FR-040–FR-046     | T030–T034, T042, T046, T054 |
| FR-050–FR-054     | T021, T046, T050–T058       |
| SC-001–SC-007     | T020, T052–T054, T062–T063  |

Every requirement maps to at least one task; no task lacks a requirement.
