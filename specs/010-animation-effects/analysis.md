# Specification analysis — Phase 010 (010.0)

Cross-artifact pass over brief, spec, research, contracts, ADR 0025, plan and tasks, following the
`/speckit-analyze` checklist. Run 2026-11-16 before the implementation slices were committed.

| ID  | Category       | Severity | Location                                   | Finding                                                                                                   | Resolution                                                                                         |
| --- | -------------- | -------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| A1  | Constitution   | HIGH     | Catalogue "CSS" drivers vs 009 ownership   | CSS keyframes/transitions on the consumer's element bypass the host and collide with consumer styles.     | Rule R-1 + CSS-token driver (R2, R3, ADR 0025, FR-010/011); deviations recorded per entry.           |
| A2  | Underspecified | HIGH     | Brief §4 "no silent overwrite"             | Compose channels never conflict: two identical compose effects add up.                                    | Documented (composition-matrix §3); exclusive effects conflict visibly; compose additions are exact. |
| A3  | Coverage       | HIGH     | Brief §6 "visible without JS / hydration"  | A mount entrance after SSR would hide visible content.                                                    | `appear="client"` (R6, D010-3), consumer check asserts SSR markup and hydration.                    |
| A4  | Inconsistency  | MEDIUM   | Catalogue E09 structure `W`                | The composed transform carries `perspective()`, no wrapper needed.                                       | Structure `—` documented (effects-010 §1).                                                          |
| A5  | Inconsistency  | MEDIUM   | Catalogue H10 structure `L²`               | Pseudo-element suffices (shared decor layer).                                                            | Documented; no injected layer.                                                                      |
| A6  | Ambiguity      | MEDIUM   | Two pseudo-elements, six layer visuals     | Which effects can share a layer?                                                                          | Composable lists in `::before`; ring exclusive on `::after` (R4, D010-2).                            |
| A7  | Coverage       | MEDIUM   | jsdom lacks CSS/WAAPI/layout               | Decor rendering, ring rotation, swap transitions untestable in units.                                   | Lab in three engines asserts computed styles (FR-071); WAAPI stub in units.                          |
| A8  | Scope          | MEDIUM   | 009 contract changes                       | Any incompatible change requires owner approval.                                                         | None needed: additive core exports, one internal helper export (`optionsKey`); exact-export tests updated. |
| A9  | Constitution   | LOW      | `@property` in a library stylesheet        | Global registration (ADR 0008 forbids global rules).                                                     | One namespaced, non-inherited registration in the opt-in stylesheet; contract test allows only `@property --neshel-*`. |
| A10 | Coverage       | LOW      | Screen-reader pass                         | Manual SR review cannot run in CI.                                                                       | Automated axe + semantics tests; manual pass remains an owner validation before publication.         |

No CRITICAL findings. FR coverage: FR-001–004 → T010–T013; FR-010–013 → T022, T030, T032, T042;
FR-020–022 → T011–T013, T021, T030–T031; FR-030–032 → T040; FR-040–042 → T022, T032, T046;
FR-050–051 → T042; FR-060 → T014, T020, T030–T033; FR-070–075 → T015, T023, T033, T040–T049.
