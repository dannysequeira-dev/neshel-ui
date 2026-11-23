# Contract — performance matrix (Phase 016)

`pnpm bench:animations:advanced` (`scripts/bench-animations-advanced.mjs`) against the built lab; local observations,
never gates (K-5). Metrics: rAF interval mean/p95, JS time per frame (engine work measured in-page), initialisation
(engine creation to first frame), shader compile+link, estimated texture/drawing-buffer bytes, live contexts.

| Scenario                                       | Variants                                |
| ---------------------------------------------- | --------------------------------------- |
| D01 ×1 / ×12 flipping                          | —                                       |
| D02 transition; D03 ring with rapid navigation | —                                       |
| D05 ×1 / ×6 with the pointer moving / idle     | —                                       |
| D07 burst ×6                                   | —                                       |
| D09 ×1 / ×2 running                            | —                                       |
| D11 2 / 4 bands, static and moving focus       | —                                       |
| D04 mesh small / medium / large                | DPR 1 / 2                               |
| D06 ripple with 4 impacts                      | DPR 1 / 2                               |
| D08 hover, D10 pointer                         | DPR 1 / 2                               |
| 6 GPU surfaces at once (context budget)        | —                                       |
| GPU unavailable (WebGL2 disabled)              | —                                       |
| Hidden page / off-screen                       | frames drawn = 0                        |
| Context loss → restore                         | time to the first restored frame        |
| Mount/unmount churn ×20                        | live contexts and resources return to 0 |
| 4× CPU (Chromium)                              | D04, D06, D05                           |

Separation: "observed" figures come from the script output; any statement about physical GPUs is inference.
