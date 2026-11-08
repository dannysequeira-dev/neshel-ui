# Specification analysis — feature 005 (005.0)

Cross-artifact consistency pass over spec.md, research.md, contracts, plan.md and tasks.md,
following the `/speckit-analyze` checklist (duplication, ambiguity, underspecification,
constitution alignment, coverage, inconsistency). Run 2026-11-08 before implementation.

## Findings

| ID  | Category       | Severity | Location                          | Finding                                                                                          | Resolution                                                                                                         |
| --- | -------------- | -------- | --------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| B1  | Constitution   | HIGH     | brief §8 vs token contract        | Badge `success`/`warning` need colours absent from the 21-role contract (constitution III).      | Resolved: R6 / ADR 0013 add four roles with contrast pairs; partial themes stay valid (FR-026, T010).              |
| B2  | Inconsistency  | HIGH     | ADR 0010 §3 vs components CSS     | Schema-1 manifests cannot express keyframes or reduced-motion blocks.                             | Resolved: schema 2 (ADR 0013, components-css.md); layout/typography unchanged; old CLI fails loudly (T011).        |
| B3  | Constitution   | HIGH     | brief §16 vs ADR 0010             | Shell needs JavaScript behaviour at a configurable threshold; no runtime registry allowed.        | Resolved: R9 / ADR 0014 read the mode from CSS after hydration; markup independent of mode (FR-100).              |
| B4  | Underspecified | HIGH     | brief §21                         | Portal theme inheritance mechanism unspecified.                                                   | Resolved: R11 + shell-and-overlays.md; browser computed-style test (FR-062, T020, T063).                           |
| B5  | Inconsistency  | MEDIUM   | brief examples `AppShell.Main`    | Dot notation breaks RSC client references.                                                       | Resolved: R3 flat names; brief marks names non-mandatory.                                                          |
| B6  | Ambiguity      | MEDIUM   | brief §23 "optional chips"        | Chips inside a trigger button would nest interactive elements.                                    | Resolved: R15 chips beside the trigger; `chips` prop (default true).                                               |
| B7  | Underspecified | MEDIUM   | brief §5 cross-engine             | Base UI popups inside Radix dialogs (focus trap, Escape).                                         | Resolved: R12 rules; browser test "Select inside Dialog" (FR-063, T063).                                           |
| B8  | Ambiguity      | MEDIUM   | brief §6 loading                  | `disabled` vs `aria-disabled` for loading.                                                        | Resolved: R5 (focus kept, submission prevented).                                                                   |
| B9  | Coverage       | MEDIUM   | brief §33 "negative tests"        | Accessibility negative control had no task.                                                       | Resolved: T072 includes removing a dialog title / `aria-expanded` and asserting the browser suite fails.           |
| B10 | Duplication    | LOW      | breakpoint-check.ts               | Third copy of the grammar module.                                                                 | Accepted: byte-identical copy with the existing drift test extended (T012); `core` cannot be a dependency.         |
| B11 | Ambiguity      | LOW      | Modal / Drawer naming             | Brief lists "Dialog / Modal", "Sheet / Drawer".                                                   | Resolved: R4 canonical names, synonyms in docs.                                                                    |
| B12 | Coverage       | LOW      | Firefox/WebKit (§32)              | Harness is Chrome-only.                                                                           | Accepted: R19; recorded as not tested.                                                                             |

No CRITICAL findings. HIGH findings B1–B4 are resolved by recorded decisions.

## Coverage

| Requirement group | Tasks                    |
| ----------------- | ------------------------ |
| FR-001–FR-009     | T011–T013, T017, T020    |
| FR-010–FR-040     | T010, T014–T016, T024    |
| FR-050–FR-063     | T020–T025, T063          |
| FR-070–FR-080     | T030–T033, T063          |
| FR-090–FR-098     | T040–T044, T063          |
| FR-100–FR-110     | T050–T053, T063          |
| FR-120–FR-131     | T016, T060–T075          |
| SC-001–SC-008     | T063, T064, T070–T075    |

Every requirement maps to at least one task; no task lacks a requirement.
