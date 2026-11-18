# Stabilization — animations issues #9 and #11

**Status:** fixes implemented on `fix/animations-stability-9-11`; awaiting owner review. Not Phase 013:
no new effects, no public API change, `@neshel-ui/animations` stays private at `0.0.0`.

Issues: [#9](https://github.com/dannysequeira-dev/neshel-ui/issues/9) (Press ContentSwap, Windows) and
[#11](https://github.com/dannysequeira-dev/neshel-ui/issues/11) (Scroll/Entrance/Hover/Press composition,
macOS). Evidence and repetition results: [evidence.md](./evidence.md).

## #11 — composition: Entrance + Hover + Press + parallax on one element

### Observed

| CI run (attempt 1) | Runner          | Failure                                     |
| ------------------ | --------------- | ------------------------------------------- |
| 44220599044        | macOS / Node 26 | `parallax kept after hover: [8.359, 5.801]` |
| 44229584824        | macOS / Node 26 | `lift added to parallax: [9.698, 1.801]`    |

Both macOS jobs reported very slow frames in the same run (median 36–49 ms, p95 115–134 ms;
`notes.effects.scrollPerformance`). The final parallax value is the same in both runs (5.801; 1.801 =
5.801 − the 4 px lift), while the captured `base` differs: `base` was wrong, not the later value.

### Reproduction

`node scripts/check-animations-browser.mjs --cpu-throttle 4` (the whole CDP run, not the scroll suite
alone) failed **3 of 3** times locally on Windows/Chrome before the fix with the same signature
(`[12.876, 1.801]`). The scroll suite run alone in a fresh page passed at throttles 0, 6 and 20: the
failure needs the cases that run before it.

### Diagnosis (classes of failure separated)

The case now records, at `base` and at failure: composed `f`, the parallax **model** computed from the
live layout (offset chain, as the engine measures), `scrollY`, layout top/height, viewport, the geometry
measurement counter and the inline transform. Before the fix:

- `f = 12.876` at `base`, model `5.801`; scroll, layout, viewport and the measurement counter **identical**
  at `base` and at failure → not a geometry error, not a legitimate base change, not a scroll change, not
  an invalidation pass;
- a style-write log of `#combo-scroll` (with call stacks) showed the parallax correct (`5.801`, no opacity
  contribution) — the element was **visible, not held** — and the Entrance starting ~25 ms **after** the
  case had already observed `opacity === 1` ("revealed"). `base` was sampled mid-entrance
  (`12.868 = 5.801 + 16 px × (1 − progress)`; opacity 0.46–0.56 at that instant).

### Root cause (engine)

`revealOnEnter` (ST01) releases the held start pose when reduced motion is switched on (correct:
content is never hidden under reduced motion) but never restored it when reduced motion was switched off.
The CDP run switches reduced motion on and off (Phase 010 live cases) before the scroll suite, while the
composition element waits far below the fold. Afterwards the element stayed visible below the trigger
area and, on entering, `play("in")` restarted the entrance from its hidden start pose: **visible content
flashed to opacity 0 and slid in again** — a user-visible defect, not only a test race. The test observed
"revealed" before the IntersectionObserver report arrived; under slow frames the report comes later than
the poll, which is why it failed only on loaded runners.

A second engine defect was found and fixed while auditing composition (proven by deterministic unit
tests; not shown to be the cause of the CI failures): the motion host removed itself from the registry
when its ledger became idle, although attachments keep the host they were created with. The next
`getMotionHost` call created a **second host for the same element**; both ledgers wrote `transform` and
each adopted the other's writes as the external baseline (`3 + 5` composed as `3`; parallax moved
24 → 10 under a 4 px lift composed as `30` instead of `6`).

### Fix

- `scroll/triggers.ts`: a hold released by reduced motion is restored, from the next update phase (the
  entrance attached during setup may not have left its reduced state yet when the trigger is notified),
  only while the element is still reported outside the trigger area (before it; after it in `repeat`
  mode). Content inside the area stays visible and its entrance is never replayed from the hidden start
  pose (accessibility-011 §2 updated).
- `core/host.ts`: an element keeps one host for its lifetime; an idle host stays registered (it holds
  nothing; the WeakMap releases it with the element). `getMotionDebugInfo` reports an idle host as
  absent, preserving the "host released after destroy" observations (style-ownership §1 updated).
- Browser case: asserts the element is held before it enters, "revealed" means the entrance finished
  (no inline opacity contribution), and the composed offset at rest must equal the model of the live
  layout. The original assertions and the 5 s ceilings are unchanged.

## #9 — press: content swap hides the idle slot and shows the confirmation

### Observed

Windows / Node 26, run 44143116260 attempt 1: `swapped: not reached within 5000 ms;
{"idle":"block","confirm":"0"}`; passed on rerun.

### Reproduction and root cause (test timing against the demo)

The lab's P10 demo resets `copied` **1.5 s** after a click. The swapped state (idle `display: none`,
confirmation opacity 1) exists only from ~210–240 ms (end of the 200 ms CSS transition) to 1.5 s, so the
case's real deadline was 1.5 s, not its 5 s ceiling. A main-thread stall injected right after the click
reproduces the CI failure **deterministically, with the exact CI state**: stalls of 0–1400 ms pass 3/3,
1600 ms and 2500 ms fail 3/3 with `{"idle":"block","confirm":"0"}` (the state after the reset). The
component itself behaved correctly in every trace (token, `hidden`, transitions, reduced token).

Whether the Windows runner actually stalled ≥ ~1.3 s in run 44143116260 cannot be proven from that log
(the case recorded no timing). The new diagnostics record every `data-state` change with timestamps.

### Fix

- Lab: test hooks `effects.holdCopied`, `effects.setCopied`, `effects.setReduced`; while held the demo
  does not reset `copied`.
- The case holds the confirmation while it observes it, then releases it and verifies the reverse swap
  (more coverage, no race with the demo timer). New deterministic cases: rapid toggles mid-transition
  always end on exactly one visible slot; reduced motion switched on mid-swap keeps an opacity-only,
  complete swap and the token follows live. New unit test: StrictMode setup and rapid toggles.
- No ContentSwap code change: no component defect was found.
