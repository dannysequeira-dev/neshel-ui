# Specification analysis — Phase 009 (009.0)

Cross-artifact pass over brief, spec, research, contracts, ADRs 0021–0024, plan and tasks, following
the `/speckit-analyze` checklist. Run 2026-11-15, before any implementation.

| ID  | Category       | Severity | Location                                | Finding                                                                                    | Resolution                                                                     |
| --- | -------------- | -------- | --------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| M1  | Constitution   | HIGH     | Registry vs `sideEffects: ["**/*.css"]` | A global import-time registry would make JS modules side-effectful and break tree-shaking. | Explicit registries, definitions as values (R2, ADR 0021, FR-003).             |
| M2  | Underspecified | HIGH     | Brief "conflict detection"              | Detection alone does not say which effect wins.                                            | Deterministic arbitration + suspension + policy (R5, ADR 0022, FR-020–FR-022). |
| M3  | Constitution   | HIGH     | D5 vs ADR 0008 (no global CSS)          | Defaults as `:root` variables would add global rules from a library stylesheet.            | Read with fallbacks, never declared globally (R9, ADR 0024, FR-042).           |
| M4  | Inconsistency  | MEDIUM   | 008 contract `.` exports Tilt3D vs D3   | Family subpaths as implemented implies Tilt3D belongs in `./hover`.                        | Move in 009.5; open question 1 for the owner; package unpublished, no shim.    |
| M5  | Coverage       | MEDIUM   | 008 pending validations                 | Firefox/WebKit, packed consumer, screen reader not yet scheduled.                          | FR-061–FR-064, tasks T061–T063, T071.                                          |
| M6  | Ambiguity      | MEDIUM   | `error` policy                          | Does `error` still arbitrate?                                                              | It throws at attach instead of suspending (channels contract §4).              |
| M7  | Underspecified | MEDIUM   | WAAPI in jsdom                          | Unit tests cannot exercise real WAAPI.                                                     | Shim for units; behaviour asserted in three engines (plan risks).              |
| M8  | Scope          | LOW      | Presets/CSS-class driver                | Could creep into 009.                                                                      | Explicit non-goal; 010.                                                        |
| M9  | Coverage       | LOW      | Budgets                                 | SC-003 numbers are estimates.                                                              | Baseline measured in 009.1 (T014) before enforcement; owner question 3.        |

No CRITICAL findings. Every FR maps to a task: FR-001–003 → T030; FR-010–014 → T020–T021;
FR-020–023 → T022–T024; FR-030–033 → T040–T043; FR-040–043 → T010–T013; FR-050–052 → T032, T050–T052;
FR-060–064 → T024/T033/T061–T063/T071; FR-070 → T072.
