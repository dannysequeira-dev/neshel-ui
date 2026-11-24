# CI audit — failed runs 2026-11-16 → 2026-11-23 (Phase 017.0)

Method: every failed `CI` run in the period (and attempt 1 of every rerun) read with
`gh run view <id> --attempt <n> --log-failed`; earlier phase evidence consulted for causes and fixes. Classes:
**code**, **config**, **test** (synchronisation/assertion), **functional** (real behaviour), **infra**
(runner/engine constraint), **quality** (format/lint/docs), **flake** (non-deterministic, recurring).

## Summary

| Class      | Items                                               | Status                                                                                                |
| ---------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| functional | A1 K-15 nested-overlay Escape                       | **Fixed in 017.1** at the cause (components); regression + stress tests; was mislabelled a test flake |
| config     | A2 TS2307 on new subpaths (×5)                      | Fixed per phase; **class closed in 017** by a `pnpm test` guard (`tests/ts-paths.test.mjs`)           |
| infra      | A3 WebGL2 absent (K-16)                             | Authorised narrow exception (Firefox + Linux + real WebGL2 absence, 6 explicit skips); unchanged      |
| quality    | A4 Biome format (×4: also 44240706724, 43811802094) | Fixed in-phase; `pnpm lint` locally catches it; no change needed                                      |
| flake      | A5 issue #9 / #11 (press swap, composition)         | Fixed in `b7bfe14` (PR #12); #9 closed after three clean main runs; **no recurrence** since           |
| test       | A6 G01 one-finger drag order dependence             | Fixed in 012 (`7297b31`, deterministic start); no recurrence                                          |
| functional | A7 React Router pending-state 700 ms                | Test relaxed in 013 (`a666b5a`); **recurred** in 017 and fixed at the cause (B3, `d946298`)           |
| infra/risk | A8 macOS minifies larger than Windows               | Fixed by reducing code (no budget raised) in 012/013; **cause not investigated** — open hypothesis    |

## Items

### A1 — K-15 nested overlays: one Escape closed both dialogs (functional)

| Run         | Attempt | SHA       | Job                       | Engine / variant              |
| ----------- | ------- | --------- | ------------------------- | ----------------------------- |
| 45117009871 | 1       | `365a24d` | `browsers / macos-latest` | Chromium `components-replace` |
| 45112369472 | 1       | `7b73bf1` | `browsers / macos-latest` | Chromium `components-plain`   |
| 45101418861 | 1       | `72797db` | `browsers / macos-latest` | Chromium `components-plain`   |
| 45079243865 | 1       | `da79b4a` | `browsers / macos-latest` | Chromium `components-extend`  |

- Error: `timed out: only the nested dialog closed ({"dialogs":0,"active":"dialog-trigger"})`.
- Cause (confirmed): Radix DismissableLayer 1.2.1 moves Escape ownership to a newly opened layer only after a
  deferred re-render; focus reaches the nested dialog first. See [research R1](research.md) and
  [overlay-escape.md](contracts/overlay-escape.md). The 100 ms delay in the test (feature 006) hid it.
- Reproduction: instrumented Playwright script 11/30 correct before the fix; deterministic jsdom tests
  (`packages/components/test/layers.test.mjs`) 7/9 failing before the fix.
- Fix: Neshel layer registry + event-time Escape routing (`internal/layer.tsx`), roots own open state.
- Regression tests: 9 jsdom tests; `check:browsers` cases `nested-overlays-escape-order` (no delay, with event
  trace) and `nested-overlays-rapid-escape`; `pnpm stress:overlays` (30× per engine, CI on three OSes).
- Later result: see [evidence.md](evidence.md) §K-15.

### A2 — TS2307 "Cannot find module '@neshel-ui/animations/<new subpath>'" (config)

Runs 44092856532 (`5dd66cc`, `./scroll`), 44193970348 (`1345067`, `./gestures` `./layout`), 44401270564
(`1254154`, `./cinematic` `./page-transitions`), 44590484219 (`248ce7f`, `./text` `./svg` `./cinematic` `./core`
in type-tests), 45038066392 (`d68081d`, `./media` `./ambient` `./feedback`). Jobs: Node-matrix typecheck (macOS,
Ubuntu Node 22/24/26, Windows). Cause (confirmed each time): CI typechecks before building and the
hand-maintained tsconfig `paths` lacked the new subpath; locally the built `dist/` hid it. Fixed in each phase by
adding mappings. Structural fix in 017: `tests/ts-paths.test.mjs` fails `pnpm test` when a path-mapped project
imports a workspace entry without a mapping (negative control: removing the `./feedback` mapping fails it).

### A3 — GPU rows without WebGL2 (infra, K-16)

Runs 45094936303 (`df80046`) and 45097063452 (`5b83d1b`), `browsers / ubuntu-latest`, Playwright Firefox: D04,
D06, D08, D10 and GPU context-loss rows. Cause: no WebGL2 in headless Firefox on GPU-less Linux. Resolved in
016 by the authorised K-16 rule (six explicit skips with reason, engine and OS; `tests/gpu-skips.test.mjs`).
Not K-15; unchanged here.

### A4 — Biome formatting (quality)

Runs 45072252850 (`22c8ed0`, a table in `specs/015…/evidence.md`) and 44240688407 (`d88b0b2`, an evidence
file). Five Node-matrix jobs failed `pnpm lint`. Fixed in the next commit each time. Mitigation already exists:
`pnpm lint` (or `pnpm check`) before pushing.

### A5 — Issue #9 / #11 (flake, closed)

Runs 44143116260 attempt 1 (`1cb2466`, Windows: "press: content swap hides the idle slot…"), 44220599044 and
44229584824 attempt 1 (macOS: "composition: Entrance + Hover + Press + parallax on one element"). Investigated
in `specs/stability-9-11/investigation.md`, fixed in `b7bfe14` (PR #12); #9 closed after three distinct
first-attempt clean main runs; #11 closed. No recurrence in any run since 2026-11-18. Not reopened.

### A6 — G01 real touch, one-finger drag (test)

Run 44196197830 (`1c9694e`, Windows CDP): the case depended on where the previous case left the puck. Made
deterministic in 012. No recurrence.

### A7 — React Router pending state within 700 ms (test)

Run 44465339193 (`c06d711`, `browsers / macos-latest`): React Router showed the pending state 465 ms after the
click locally; the case now waits for the functional state before the slow route commits (3 s ceiling). The
latency cause was not investigated (recorded in 013). No recurrence.

### A8 — macOS bundle sizes larger than Windows (infra; open hypothesis)

Runs 44196197830 (`composeTransform` 641 B > 614 B) and 44425908497 (`Storyboard` 14363 B > 14336 B),
`macos-latest / Node 26`. Fixed by reducing code without raising budgets. The platform difference in minified
output was never explained; entries within ~1 % of their budget can fail only on macOS. Phase 017 records the
margin of every measured entry on Windows and checks macOS in CI; no budget is raised without approval.

### A9 — Runs of phases 008/009 (read on 2026-11-24)

The first version of this audit claimed every failed run since 2026-11-16 but had not read these. Errors below are from
their logs; their causes belong to the 008/009 evidence and were **not re-investigated** here.

| Run                      | SHA                         | Job                        | Error                                                |
| ------------------------ | --------------------------- | -------------------------- | ---------------------------------------------------- |
| 43936536735 (attempt 1)  | `79cedf4`                   | `browsers / ubuntu-latest` | scene: progress follows scroll with the stage pinned |
| 43878431209              | `5e59ce9`                   | `browsers / ubuntu-latest` | WAAPI: real browser animation, end state committed   |
| 43813368226, 43810901141 | `89665bf`, `fd3885c` (main) | `macos-latest / Node 26`   | reduced motion (live change): flat cards             |
| 43804188974              | `9402b61`                   | `macos-latest / Node 26`   | corner: spring-animated amount                       |
| 43796180289              | `53272c7`                   | `macos-latest / Node 26`   | six Tilt3D lab cases                                 |
| 44240706724, 43811802094 | `d88b0b2`, `4da0d19`        | Node matrix                | Biome format (class A4)                              |

## Failures found during Phase 017

### B1 — `L08 presence` re-entry on macOS (test synchronisation)

Run 45218099547 (`4a1baf7`, PR #18), `macos-latest / Node 26` (CDP) and `browsers / macos-latest` (Playwright
Chromium): `FAIL L08 presence … same element on re-entry`. Never seen before; not on Windows/Ubuntu.
Cause (reproduced by simulation): the case clicked "re-enter" after a fixed 1 + 3 frames, assuming the 220 ms exit outlasts four
frames. The frame scheduler clamps each delta at 66 ms, so with frames slower than ~55 ms the exit completes first
and the card unmounts. Why it first showed here was not measured (the lab page also loads Components in 017; a
hypothesis, not a confirmed cause). With +60 ms per frame the old wait passed 3/8. Slow frames were simulated, not
observed on the macOS runners. Reproduction: wrapping `requestAnimationFrame` to add 40 ms per frame → 0/8 same element (node
unmounted after 346 ms); 0 ms → 10/10. Fix: wait until the exit is observably running (card connected,
0 < opacity < 1) and re-enter in that same task — 10/10 at +0, +40 and +60 ms per frame. The behaviour asserted
(re-entry during the exit keeps the node) is unchanged.

### B2 — Toast tests on Node 22 (test isolation)

Run 45218099547, `ubuntu-latest / Node 22`: `Toaster · hydration … no warnings` captured Node 22's
`ExperimentalWarning: The MockTimers API is an experimental feature` (printed through `console.error`; MockTimers
is stable on Node 24/26) and, failing before its unmount, left a mounted Toaster that made two later toast tests fail
(cascade). Fix: runtime notices are not counted as React errors, the hydration test unmounts before asserting, and
the two-Toasters test counts only its own regions.

### B3 — React Router pending state on macOS (functional; A7 root cause)

Run 45230008637 (`573bde7`, workflow_dispatch), `browsers / macos-latest`: `FAIL react-router 8.5.0: a slow
route shows the real pending state before it commits` (700 ms ceiling); the same run measured 668 ms for the next
navigation. Locally 498 ms; Next.js 34 ms. This is the latency recorded but never investigated in A7.
Cause (confirmed with a timeline probe: click, `startViewTransition`, update callback, `finished`, `data-state`):
data routers commit `navigation.state` inside `startTransition`; with `<PageTransition>` boundaries React wraps
that commit in a view transition and runs **passive effects only after the transition animation finishes**
(~400 ms). `RouteProgress` started the indicator in a passive effect, so `pending` appeared at
`vt-finished` (+430 ms after the click on Windows, more on macOS) although the DOM was committed at +20 ms.
Fix: the pending/done/fail transition runs in a layout effect (inside the commit). After: pending at the update
callback, +~20 ms (probe); `check:animations:routers` React Router 498 → 60 ms, Next 34 ms. The 700 ms test
ceiling is unchanged (it describes the expected behaviour).

### B4 — `check:browser` hang when Chrome does not start (infrastructure + script defect)

Run 45229978481 (`573bde7`, workflow_dispatch), `ubuntu-latest / Node 26`: `check:browser could not complete:
browser did not start:` (Chrome printed nothing in 30 s), then the job was cancelled by its 25-minute timeout.
Cause (confirmed): `launchBrowser` rejected without killing the child; its stderr pipe kept Node alive. Fix: kill
the child and close the pipe on a failed start. Regression test `tests/cdp-launch.test.mjs` (a silent fake browser):
passes in 0.6 s; with the kill removed the test process never exits (negative control, stopped manually). The slow
Chrome start itself is a runner hiccup (not reproduced); it now fails in ~30 s with a clear message instead of
hanging — no retry was added.

## Runs in this phase

Recorded in [evidence.md](evidence.md) (every run, including failures and their attempts).
