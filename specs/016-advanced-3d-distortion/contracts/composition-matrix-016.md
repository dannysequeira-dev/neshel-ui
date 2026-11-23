# Contract — composition matrix (Phase 016)

Each row is a unit test in `test/composition-016.test.mjs` (jsdom, real Motion Host) and, where noted in the
evidence, a browser case.

| #   | Combination                                         | Expectation                                                                |
| --- | --------------------------------------------------- | -------------------------------------------------------------------------- |
| 1   | D05 CornerRecede + Tilt3D on the same root          | tilt transforms the root, the fold clips the surface; both restore exactly |
| 2   | D05 + Hover lift (H01) + Press (P01) on the root    | root transform layers compose; the fold is unaffected                      |
| 3   | D05 + an external inline `clip-path` on the surface | captured as the baseline, restored after destroy                           |
| 4   | D01 CardFlip driven by a C01 timeline track         | exact angles at seek points; no own clock while tracked                    |
| 5   | D01 driven by a ScrollProgress-like source          | the angle follows the source; the visible face is synchronised             |
| 6   | D02 CubeRotate driven by `drive()`                  | progress follows; reverse and seek are exact                               |
| 7   | D03 RingCarousel + rapid `next()` × 5               | shortest-path retarget, one scheduler task                                 |
| 8   | D04 PageCurl + timeline track                       | the progress uniform comes from the timeline, no own clock                 |
| 9   | D06 Ripple `seek()` determinism                     | same seed + progress → same uniforms                                       |
| 10  | D08 + D10 on two frames                             | one manager draw task per frame for both surfaces                          |
| 11  | D07 Glitch + Hover on the same element              | glitch layers are package-owned; host layers unaffected                    |
| 12  | D09 + D11 in one root                               | two package layers; consumer styles untouched                              |
| 13  | Any D effect destroyed mid-animation                | no task, listener, observer, context or timer left                         |
| 14  | StrictMode double mount of every React component    | one live effect each; counters back to zero after unmount                  |
