# Analysis — Phase 016 (cross-artifact consistency, 016.0)

| Check                                            | Result                                                                                                                                                                               |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Every catalogue entry D01–D11 has an FR          | D01–D11 → FR-010–FR-020 (foundations FR-001–FR-005)                                                                                                                                  |
| Every FR has a task                              | FR-001–003 → T010/T018 · FR-004–005 → T020 · FR-010–014, 016, 018, 020 → T011–T018 · FR-013, 015, 017, 019 → T030–T034 · FR-030–032 → T040–T042 · FR-033 → T051–T052 · FR-034 → T002 |
| Reduced behaviours match the catalogue           | D01/D02 fade, D03 static, D04 instant, D05 instant, D06 off, D07 off, D08 static, D09 static, D10 static, D11 static                                                                 |
| Driver changes recorded                          | none: GPU entries stay GPU (WebGL2); D11 duplicated layers → package overlay (structure L, spec note ²)                                                                              |
| GPU decision measured, ADR 0030 not invalidated  | research R2 (spike data + library sizes); ADR 0031 §6 keeps M09/B04/B05/B07 as decided                                                                                               |
| Families never import each other                 | shared math, attribute ledger and visibility gate in `src/core` (internal); `./advanced` never imports `src/gpu`                                                                     |
| No second scheduler/engine                       | springs, tweens and the progress driver are the 009/014 ones; GPU draws are one write-phase task per frame                                                                           |
| R-1                                              | consumer elements: host layers/channels and the attribute ledger only; CSS styles package-rendered DOM and layers                                                                    |
| Core budget                                      | new internals are not exported from `./core`; `host.ts` unchanged                                                                                                                    |
| Accessibility rules                              | accessibility-016.md rows map to unit or browser verifications; manual rows listed                                                                                                   |
| Owner constraints (publication, merge, packages) | spec non-goals; tasks contain no version/tag/publish/merge step; Components untouched                                                                                                |
| Unverified items flagged                         | physical GPUs, Safari, VoiceOver/NVDA, touch devices, real-GPU timings                                                                                                               |

No inconsistency blocks 016.1.
