# Analysis — Phase 013 (cross-artifact consistency, 013.0)

| Check                                              | Result                                                                                                                                                            |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Every catalogue entry C01–C10, PT01–PT10 has an FR | C01 FR-001–006 · C02–C10 FR-010–012 · PT01–PT09 FR-020–026 · PT10 FR-030                                                                                          |
| Every FR has a task                                | FR-001–006 → T010–T014 · FR-010–012 → T020–T027 · FR-020–026 → T030–T033 · FR-030 → T040–T041 · FR-040–046 → T050–T056                                            |
| Reduced behaviours match the catalogue             | C01 instant, C02 static, C03 static, C04/C05 instant, C06 fade, C07/C08 static, C09 off, C10 instant; PT per catalogue (cinematic-api.md, page-transitions.md §2) |
| Families never import each other                   | Entrance definitions and scroll progress reach `./cinematic` as values (R6, R7); adapters import routers only                                                     |
| No second scheduler/engine                         | timeline = one scheduler task; renders via host (ADR 0028 §2)                                                                                                     |
| Core budget                                        | timeline outside `./core` (D-2); core change is type-only + one host condition                                                                                    |
| Owner constraints (publication, #9, Press)         | spec non-goals; tasks contain no version/tag/publish step                                                                                                         |
| Unverified items flagged                           | real Safari, devices, screen readers, React Router 8 surface (to be read before T040)                                                                             |

No inconsistency blocks 013.1. Open item carried into 013.4: the React Router adapter surface depends on
the installed 8.x type declarations (router-adapters.md §3).
