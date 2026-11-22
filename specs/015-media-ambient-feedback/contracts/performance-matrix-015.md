# Contract — Performance matrix (Phase 015)

Local observations (no universal fps claims, no GPU attribution without evidence). Run by
`pnpm bench:animations:media-ambient` (Playwright engines; Chromium also at 4× CPU) against the built lab, plus
unit counters. Each scenario reports **initialisation** (attach → first rendered frame, ms) and **sustained**
cost (mean/p95 frame interval and JS time per frame over a static baseline of the same page).

| #   | Scenario                                    | Measures                                                        |
| --- | ------------------------------------------- | --------------------------------------------------------------- |
| P1  | Baseline static page                        | frame interval mean/p95                                         |
| P2  | 1 vs 24 images with M02/M03 (cached)        | init ms, hidden-image count after load (0), tasks at rest (0)   |
| P3  | `srcset` image resized                      | no re-arm on candidate swap (unit), no hide                     |
| P4  | M06 scrub: fast forward/reverse progress    | seeks requested vs issued, coalesced ratio                      |
| P5  | B04 particles 60 / 120 / 400                | JS ms per frame, interval p95                                   |
| P6  | B05 starfield 360 / 800, 4× CPU             | JS ms per frame, interval p95                                   |
| P7  | B02/B07 aurora/mesh at 400×300 and 1600×900 | interval p95 vs baseline                                        |
| P8  | 5 ambient effects simultaneously            | tasks, observers (1), visibility listeners (1), canvases        |
| P9  | 6 toasts + 6 spinners                       | interval p95, React commits after mount (0 per frame)           |
| P10 | Hidden page and off-screen                  | scheduler tasks (0), CSS play state paused                      |
| P11 | Reduced motion toggled during playback      | tasks after toggle (0 for static entries)                       |
| P12 | Destroy during load/playback                | listeners, observers, canvases, package nodes after destroy (0) |
| P13 | M09 dissolve 1600×900 at 16 px cells        | cells, drawImage per frame (mean/max), JS ms per frame          |
| P14 | gzip per entry point                        | bundle check (`pnpm check:animations:bundles`)                  |
