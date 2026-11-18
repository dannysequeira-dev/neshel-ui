# Evidence — stabilization of issues #9 and #11

Local machine: Windows 11, Node 26.13.0, Chrome (CDP, headless). CI results are recorded in the PR.
First-attempt and rerun results are listed separately; nothing below was rerun until green.

## #11 — before the fix (`main` at `97a2b22`)

| Run                                                         | Result | Signature                                                    |
| ----------------------------------------------------------- | ------ | ------------------------------------------------------------ |
| Scroll suite alone, fresh page, throttle 0/6/20 (2+4+5 runs) | 11/11 pass | (the failure needs the earlier CDP cases)                  |
| Full CDP check, throttle 4, runs 1–3                         | 3/3 **fail** | `lift added to parallax`/`parallax kept after hover`, `[12.876, 1.801]` |
| Full CDP check, throttle 4, instrumented (diagnostics)       | fail   | at `base`: `f 12.876`, model `5.801`; `scrollY`, layout, viewport, measurement counter unchanged |
| Full CDP check, throttle 4, style-write log                  | fail   | element visible (no hold), entrance starts ~25 ms after "revealed"; `base` sampled mid-entrance |
| Hardened case against the pre-fix package, throttle 0, 0, 4  | 3/3 **fail** | `held below the trigger area` (no held pose after the live reduced-motion round trip) |

Unit tests written before the fixes (failing on the pre-fix `dist`):

- `test/host-lifecycle.test.mjs`: 3 of 4 failed — second host after idle (`3 + 5` composed as `3`;
  parallax 24 → 10 under the lift composed as `30` instead of `6`).
- `test/scroll-effects.test.mjs` "ST01 live reduced motion round trip": failed at
  `reduced off: held again while still below the area`.

## #11 — after the fix

| Run                                       | Result                           |
| ----------------------------------------- | -------------------------------- |
| Full CDP check, throttle 4, runs 1–5      | **5/5 pass**, 105/105 cases each, first attempt |
| `host-lifecycle` + reduced round-trip unit tests | pass                      |

## #9 — before the fix

| Run                                                         | Result |
| ----------------------------------------------------------- | ------ |
| Trace of P10 (10 clicks, throttle 0)                         | swapped state from 206–241 ms until the demo reset at ~1.5 s |
| Main-thread stall after the click: 0, 800, 1200, 1400 ms (3 each) | 12/12 pass |
| Stall 1600 ms, 2500 ms (3 each)                              | 6/6 **fail** with the CI state `{"idle":"block","confirm":"0"}` |

## #9 — after the fix

| Run                                                         | Result |
| ----------------------------------------------------------- | ------ |
| Same stalls with the confirmation held (0–2500 ms, 3 each)   | **18/18 pass** |
| New in-page cases (reverse swap, rapid toggles, reduced mid-swap) in the 5 throttled CDP runs | 5/5 pass |
| `press.test.mjs` (StrictMode + rapid toggles unit test)      | 19/19 pass |

## Gates

See the PR description for `pnpm check`, browser lab, engines, packed consumer, bundles, Storybook,
Playground and the three-OS CI results (first attempt and reruns listed separately).
