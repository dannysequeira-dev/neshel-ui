# Release readiness — pre-publication requirements

Recorded from the owner's Phase 005 review (2026-11-09). These requirements must be satisfied before any npm
publication. They are worked on in feature 006 ([spec](../specs/006-docs-dx-release/spec.md), owner brief
2026-11-08); each status below is backed by evidence or stays open. Accepted Phase 005 risks remain risks until these items are verified.

No package may be published and no `private: true` flag removed until the owner explicitly
authorises it (constitution VIII).

| #   | Requirement                                                                                                                                                          | Origin                                  | Status            |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | ----------------- |
| R1  | Robust overlay-backdrop fallback for browsers without `light-dark()`; verify actual computed styles.                                                                 | Phase 005 accepted risk (backdrop)      | In progress (006) |
| R2  | Real browser integration tests for Combobox inside Popover: focus, Escape, selection, dismissal and nested overlay behaviour.                                        | Phase 005 accepted risk (layering)      | In progress (006) |
| R3  | Firefox and WebKit smoke coverage for interactive components; evaluate at least one manual screen-reader workflow.                                                   | Phase 005 accepted risk (Chrome only)   | In progress (006) |
| R4  | Explicitly document Sidebar child remounting (inline ↔ mobile drawer) and its impact on component-local state.                                                       | Phase 005 accepted risk                 | In progress (006) |
| R5  | Preserve and document the portal `container` requirement for inline custom CSS variable overrides.                                                                   | Phase 005 accepted risk                 | In progress (006) |
| R6  | Measure realistic per-component bundles and establish release budgets; preserve the verified tree-shaking behaviour (Button-only bundle without Radix/Base UI code). | Phase 005 SC-007                        | In progress (006) |
| R7  | Review and update the root README and all public installation documentation to reflect the implemented packages.                                                     | Owner review                            | In progress (006) |
| R8  | Verify React Server Components and Next.js App Router integration using actual packed packages.                                                                      | Roadmap 006; Phase 005 research R3, R20 | In progress (006) |
| R9  | Carry forward all unresolved Phase 004 limitations and the npm scope (`@neshel-ui`) availability check.                                                              | Phase 004 evidence; CLAUDE.md           | In progress (006) |

## Carried-forward limitations (R9)

From Phase 004 (still unresolved): unknown well-formed breakpoints warn instead of throwing;
incomplete Flex runtime validation for some custom responsive directions; approximate Capsize
trimming when configured metrics differ from the loaded font; custom-breakpoint consumers must
import the generated CSS correctly; browser verification mainly on Chrome; Layout CSS close to its
size budget. The `@neshel-ui` npm scope has **not** been verified.

Details of the Phase 005 risks: [feature 005 evidence](../specs/005-components-navigation-shell/evidence.md#accepted-limitations-and-risks-feature-005).
