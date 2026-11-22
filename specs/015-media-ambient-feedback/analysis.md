# Analysis — Phase 015 (cross-artifact consistency, 015.0)

| Check                                                     | Result                                                                                                                                                          |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Every catalogue entry M01–M10, B01–B10, F01–F10 has an FR | M FR-010–012 (foundation FR-001–003) · B FR-030 (foundation FR-020–021) · F FR-040–041                                                                          |
| Every FR has a task                                       | FR-001–003 → T010–T012 · FR-010–012 → T020–T027 · FR-020–021 → T030–T031 · FR-030 → T040–T043 · FR-040–041 → T050–T055 · FR-050 → T002 · FR-060–067 → T060–T066 |
| Reduced behaviours match the catalogue                    | M01/M06/M10 static, M02/M03/M05 instant, M04 n/a, M07/M08/M09 fade; B01–B10 static; F01/F03/F04 reduced⁸, F02/F08/F10 static, F05/F07/F09 instant, F06 fade     |
| Driver changes recorded                                   | M09/B04/B05 GPU → Canvas 2D, B07 CSS/GPU → CSS (spec inventory, ADR 0030 §2)                                                                                    |
| Families never import each other                          | Presence, checkmark shape, load watcher, surface live in `src/core` (D-3)                                                                                       |
| No second scheduler/engine                                | loops and tweens are the 009/014 ones; canvas draws run as scheduler tasks; CSS layers use keyframes                                                            |
| R-1                                                       | consumer elements: host channels/layers and tokens only; CSS animates package layers, `::before`/`::after` and package-rendered DOM                             |
| Core budget                                               | new internals are not exported from `./core`; `host.ts` unchanged (D-8)                                                                                         |
| GPU decision measured                                     | spike data in `data/ambient-spike-local.json`, research R10–R12; WebGL figures flagged as non-representative (SwiftShader)                                      |
| Accessibility rules                                       | accessibility-015.md rows each map to a verification; manual rows listed                                                                                        |
| Owner constraints (publication, merge, packages)          | spec non-goals; tasks contain no version/tag/publish/merge step; Components untouched (D-7)                                                                     |
| Unverified items flagged                                  | real Safari, iOS video behaviour, physical touch devices, NVDA/VoiceOver, GPU timings on real hardware                                                          |

No inconsistency blocks 015.1.
