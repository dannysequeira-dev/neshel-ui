# CI audit — failed runs 2026-11-16 → 2026-11-23 (Phase 017.0)

Method: every failed `CI` run in the period (and attempt 1 of every rerun) read with
`gh run view <id> --attempt <n> --log-failed`; earlier phase evidence consulted for causes and fixes. Classes:
**code**, **config**, **test** (synchronisation/assertion), **functional** (real behaviour), **infra**
(runner/engine constraint), **quality** (format/lint/docs), **flake** (non-deterministic, recurring).

## Summary

| Class      | Items                                       | Status                                                                                                  |
| ---------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| functional | A1 K-15 nested-overlay Escape               | **Fixed in 017.1** at the cause (components); regression + stress tests; was mislabelled a test flake   |
| config     | A2 TS2307 on new subpaths (×5)              | Fixed per phase; **class closed in 017** by a `pnpm test` guard (`tests/ts-paths.test.mjs`)             |
| infra      | A3 WebGL2 absent (K-16)                     | Authorised narrow exception (Firefox + Linux + real WebGL2 absence, 6 explicit skips); unchanged        |
| quality    | A4 Biome format of evidence files (×2)      | Fixed in-phase; `pnpm lint` locally catches it; no change needed                                        |
| flake      | A5 issue #9 / #11 (press swap, composition) | Fixed in `b7bfe14` (PR #12); #9 closed after three clean main runs; **no recurrence** since             |
| test       | A6 G01 one-finger drag order dependence     | Fixed in 012 (`7297b31`, deterministic start); no recurrence                                            |
| test       | A7 React Router pending-state 700 ms        | Fixed in 013 (`a666b5a`, waits for the functional state); latency cause not investigated; no recurrence |
| infra/risk | A8 macOS minifies larger than Windows       | Fixed by reducing code (no budget raised) in 012/013; **cause not investigated** — open hypothesis      |

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

## Runs in this phase

Recorded in [evidence.md](evidence.md) (every run, including failures and their attempts).
