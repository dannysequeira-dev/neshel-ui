# Evidence — Phase 012

Status vocabulary: **implemented**, **verified locally** (named machine), **verified in GitHub Actions**
(named commit and run), **planned**. Nothing here is claimed before it ran.

## 0 · Environment

Windows 11 Home (10.0.26300), Node 26.13.0, pnpm 12.16.1; headless Chrome via CDP and Playwright
Chromium 158.0.8127.18, Firefox 159.0, WebKit 27.2 (Playwright's WebKit build, **not Safari**).

## 1 · Baseline (before any Phase 012 change, `804badb`)

`pnpm build:packages` + `node scripts/check-animations-bundles.mjs`: every animations budget met
(e.g. `composeTransform` 0.54/0.60 KiB, `press.css` 1.48/1.60 KiB, `entrance: fadeIn definition`
6.38/6.50 KiB, `styles.css` 3.73/4.00 KiB, `press: entire entry` 16.18/17.00 KiB).

## 2 · Inventory — the 23 effects (all implemented and verified locally)

| Id  | API                                                                                         | Unit | Browser suite (3 engines)   | Real input (CDP)                            | Story |
| --- | ------------------------------------------------------------------------------------------- | ---- | --------------------------- | ------------------------------------------- | ----- |
| G01 | `drag`, `<Gesture>`                                                                         | ✓    | ✓                           | mouse, 1-finger                             | ✓     |
| G02 | `dragSnap`                                                                                  | ✓    | ✓                           | —                                           | ✓     |
| G03 | `swipeDismiss`, `<SwipeDismiss>`                                                            | ✓    | ✓ (+ real tap, phone)       | —                                           | ✓     |
| G04 | `pullToRefresh`, `<PullToRefresh>`                                                          | ✓    | ✓                           | —                                           | ✓     |
| G05 | `springFollow`, `useSpringFollow`                                                           | ✓    | ✓                           | —                                           | ✓     |
| G06 | `elasticEdge`, `<ElasticScroll>`                                                            | ✓    | ✓                           | —                                           | ✓     |
| G07 | `fling`                                                                                     | ✓    | ✓                           | —                                           | ✓     |
| G08 | `pinchZoom`, `<PinchZoom>`                                                                  | ✓    | ✓ (+ real tap, phone)       | 2-finger pinch; 1-finger scroll not blocked | ✓     |
| G09 | `rotateGesture`                                                                             | ✓    | ✓                           | —                                           | ✓     |
| G10 | `reorder`, `<Reorder>`, `<ReorderItem>`, `<ReorderHandle>`, `useReorderItem`, `reorderMove` | ✓    | ✓                           | keyboard, touch handle                      | ✓     |
| G11 | `squashStretch`                                                                             | ✓    | ✓                           | —                                           | ✓     |
| H11 | `cursorFollower`, `<CursorFollower>`                                                        | ✓    | ✓ (+ real mouse, 3 engines) | —                                           | ✓     |
| P11 | `longPress`, `<LongPress>`                                                                  | ✓    | ✓                           | touch hold                                  | ✓     |
| L01 | `flipMove`, `createLayoutGroup`, `<LayoutGroup>`, `<LayoutItem>`                            | ✓    | ✓                           | —                                           | ✓     |
| L02 | `autoHeight`, `<AutoHeight>`                                                                | ✓    | ✓                           | —                                           | ✓     |
| L03 | `listItem`, `<AnimatedList>`                                                                | ✓    | ✓                           | —                                           | ✓     |
| L04 | `sharedLayout`, `<LayoutItem layoutId>`                                                     | ✓    | ✓                           | —                                           | ✓     |
| L05 | `gridReflow`, `<Reflow>`                                                                    | ✓    | ✓                           | —                                           | ✓     |
| L06 | `collapse`, `<Collapse>`                                                                    | ✓    | ✓ (+ real tap, phone)       | —                                           | ✓     |
| L07 | `tabIndicator`, `<TabIndicator>`                                                            | ✓    | ✓                           | —                                           | ✓     |
| L08 | `createPresence`, `<Presence>`, `usePresence`, `useIsPresent`                               | ✓    | ✓ (+ real tap, phone)       | —                                           | ✓     |
| L09 | `crossFade`, `<CrossFade>`                                                                  | ✓    | ✓                           | —                                           | ✓     |
| L10 | `masonry`, `<Masonry>`                                                                      | ✓    | ✓                           | —                                           | ✓     |

## 3 · Unit, type and repository checks (verified locally)

- `node --test packages/animations/test/*.test.mjs`: **305 pass, 0 fail** (228 earlier tests unchanged plus
  `gestures-engine` 16, `gestures-effects` 26, `layout` 25, `composition-012` 10).
- `pnpm typecheck` with `type-tests/gestures-layout.tsx` (valid usage + `@ts-expect-error` cases).
- `pnpm check` (doctor, lint, typecheck, test, build, test:packages, check:exports,
  `check:pack --with animations`): **passed** — 108 root tests, 509 package tests; the pack contract now
  expects `./gestures`, `./layout`, `./gestures.css`, `./layout.css` and keeps `private: true`.
- Lint: 0 errors; the 4 warnings and 1 info are pre-existing (identical on the baseline).

## 4 · Browser results (verified locally)

- `pnpm check:browser:animations` (CDP Chrome): **103/103** — the Phase 012 suite (25 cases) plus real
  input: G01 mouse drag and one-finger drag; G08 two-finger pinch through the browser's touch-action
  pipeline and a one-finger touch scroll over the media that scrolls the page (not blocked, 30+ px);
  G10 real keyboard (Space/↓/Space, focus kept) and touch reorder on the handle; P11 touch hold (once, no
  click, early release cancels); live reduced-motion switch; axe with no violations on the whole lab.
- `pnpm check:animations:engines`: **passed in Chromium, Firefox and WebKit** — the in-page suite, the live
  reduced-motion case, H11 with the real mouse, and an **emulated touch device** context (390 × 844,
  DPR 2, `hasTouch`, `isMobile` except Firefox) with real taps on the G03 dismiss button, the G08 zoom
  buttons, L08 and L06, then the full suite again in the phone layout.
- L06 driver selected by the behavioural check: **CSS in Chromium and WebKit, measured JS in Firefox**
  (matches research R1).
- No page errors and zero "ResizeObserver loop" notifications in any engine (two defects found by these
  checks and fixed, research R13).

## 5 · Accessibility and reduced motion

Keyboard paths and non-gesture alternatives of accessibility-012 §2 are tested in jsdom and in real
browsers (G01 arrows/Home, G02 arrows, G03 Delete + button, G04 button, G08 keys + buttons + announced
level, G09 keys + buttons, G10 handle keyboard + move up/down + one announcement per move, P11 keyboard
hold/press with Enter short-press activation kept). axe: no violations (scroll regions of
`<PullToRefresh>`/`<ElasticScroll>` are focusable named regions). Reduced motion: unit tests per effect and
the live switch in 4 runners (FLIP applies at once, no inertia task after a release, follower hidden).
Not done: a manual screen-reader pass and real Safari/iOS (owner-reported checks before any publication).

## 6 · Performance and cleanup

- Zero layout reads per `pointermove` (instrumented in jsdom and in real layout; failures now report the
  reading stack). Zero layout reads during FLIP animation frames (instrumented in real layout).
- Zero React commits while gestures/FLIP/presence animate (Profiler tests for `<AnimatedList>` and
  `<Reorder>`).
- Idle: no frame task, no claimed pointer and no gesture session after destroy (unit and browser).
- Cleanup: every composition row restores the element's `style` attribute exactly; listeners, observers
  (`resize.observed === 0`) and tasks released.

## 7 · Composition matrix

All rows of [composition-matrix-012.md](contracts/composition-matrix-012.md) pass in
`composition-012.test.mjs`; drag + Tilt3D and drag + hover + press also pass in the three engines.

## 8 · SSR, hydration, packed consumer

`pnpm check:animations:consumer`: **passed** — the Phase 012 components render plain, accessible server
markup from the real tarball; hydration without recoverable errors; real-mouse drag, collapse open,
presence exit before unmount and keyboard reorder (focus kept) after hydration.

## 9 · Bundle sizes (gzip, from the real packed tarball) and proposed budgets

| Entry                                           | Measured  | Proposed budget |
| ----------------------------------------------- | --------- | --------------- |
| gestures: createGesture (engine, no React)      | 6.07 KiB  | 6.50 KiB        |
| gestures: physics primitives                    | 0.94 KiB  | 1.00 KiB        |
| gestures: drag definition (no React)            | 12.30 KiB | 12.75 KiB       |
| gestures: pinchZoom + rotateGesture (no React)  | 11.15 KiB | 11.75 KiB       |
| gestures: Reorder components                    | 14.17 KiB | 14.75 KiB       |
| gestures: Gesture + drag                        | 15.66 KiB | 16.25 KiB       |
| gestures: entire entry                          | 28.09 KiB | 29.00 KiB       |
| layout: createLayoutGroup + flipMove (no React) | 5.35 KiB  | 5.75 KiB        |
| layout: Presence                                | 11.31 KiB | 11.75 KiB       |
| layout: LayoutGroup + LayoutItem                | 10.87 KiB | 11.25 KiB       |
| layout: entire entry                            | 19.26 KiB | 20.00 KiB       |
| hover: cursorFollower definition (no React)     | 5.29 KiB  | 5.60 KiB        |
| press: longPress definition (no React)          | 8.22 KiB  | 8.60 KiB        |
| css: gestures.css                               | 0.94 KiB  | 1.00 KiB        |
| css: layout.css                                 | 0.85 KiB  | 0.90 KiB        |

Owner decision 2026-11-17 (during Phase 012): the budgets above are approved, and `press: entire entry`
is raised from 17.00 KiB to **19.00 KiB** (measured 18.66 KiB: P11 added to the family by this phase — the
long-press code plus the shared pointer session; without the shared session it would still be about
17.5 KiB). Every other earlier budget is unchanged and met; `press.css` was trimmed back within its
1.60 KiB budget (1611 B). Closest margins: `composeTransform` 0.59/0.60, `hover.css` 1.83/1.85,
`styles.css` 3.95/4.00, `entrance: fadeIn` 6.46/6.50. `pnpm check:animations:bundles` passes.

## 10 · Visual review

[visual-review/](visual-review/README.md): gallery, mid-gesture, mid-FLIP, accordion, presence, masonry,
reduced-motion and Storybook captures (Chromium, real input).

## 11 · CI (GitHub Actions, PR #10)

- Run 44193970348 (`13450677`): typecheck failed on 5 jobs — the apps lacked TypeScript path aliases for
  `./gestures` and `./layout` (local typecheck had the built `dist`). Fixed in `1c9694e`.
- Run 44196197830 (`1c9694e`): 12/14 — macOS bundles (`composeTransform` 641 B > 614 B: the macOS build
  minifies differently; fixed by compacting the function, 0.56 KiB) and Windows CDP (one-finger drag case
  depended on where the previous case left the puck; made deterministic). The follow-up commit `ffcd459`
  accidentally deleted seven CDP cases; restored in `7297b31` (run 44199222122 cancelled).
- **Run 44220599044 (`7297b31`): verified in GitHub Actions — 14/14 on attempt 2** (Linux, Windows, macOS;
  Node 22/24/26). Attempt 1 failed only the unchanged **Phase 011** case "composition: Entrance + Hover +
  Press + parallax on one element" on macOS (`parallax kept after hover: [8.359, 5.801]`): the final
  transform settled 2.56 px from the recorded base, i.e. the parallax contribution changed during the case
  or the base was read before it settled. Re-run once for evidence; not fixed here (independent, like
  issue #9); proposed as a separate issue for the owner.

## 12 · Owner review of PR #10 (2026-11-18) — Presence

Regression tests written first (`packages/animations/test/presence-review.test.mjs`, committed failing in
`a280e38`), run against the unchanged code, then against the fix:

| Case                                                                  | Before                                                                   | After |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------ | ----- |
| Re-entry with only an `exit` preset ends visible (continuity checked) | **fail** — held at the exit pose (`opacity: 0; translate3d(0, 16px, 0)`) | pass  |
| Re-entry with different `enter` and `exit` effects                    | pass (risk refuted; no error, continuous, visible)                       | pass  |
| Re-entry with the same preset (control)                               | pass                                                                     | pass  |
| Consumer `aria-hidden` React prop restored on re-entry                | **fail** — attribute removed                                             | pass  |
| Consumer `inert` / `aria-hidden` set on the DOM restored on re-entry  | **fail** — `inert` false, attribute removed                              | pass  |
| Re-entry without consumer state removes only what Presence added      | pass                                                                     | pass  |
| Discarded render (suspending sibling) that added a key: no ghost exit | pass (risk not reproduced)                                               | pass  |
| Discarded render that removed a key: not lost, same node              | pass (risk not reproduced)                                               | pass  |

Fix (minimal, `presence.tsx`): re-entry reverses the running effect with the options it was attached with
(exit's or enter's); accessibility state saved at exit start and restored on re-entry (latest React props
win). The state machine was not restructured: the interrupted-render risk was not reproducible (bounded
evidence and limitation in layout-engine.md §7). An initial run of the new file showed failures caused by
one failing case leaving its view mounted; the tests now always unmount, and the before/after table above is
from isolated runs. Package suite after the fix: 313/313.

## 13 · Known limitations

- Squash & stretch is axis-aligned (the composer has a fixed order; no arbitrary-direction scale).
- Drag-to-reorder has no auto-scroll near the edges of a scroll container; touch reorder needs the handle.
- Pull-to-refresh on Firefox for Android: touch arrives as pointer events that the browser cancels when it
  pans, so the indicator may not follow (the refresh button is the alternative). WebKit reports no
  `overscroll-behavior`, so native rubber-banding may show with the indicator.
- `<LayoutGroup>` snapshots on updates of the group or its items; memoized items with insertion-only
  changes elsewhere need `useLayoutGroup().snapshot()/play()`.
- `<AutoHeight>` animates DOM-driven changes; size changes from fonts/images/viewport apply without
  animation. FLIP/reflow measure non-HTML (SVG) elements with their transforms included.
- Real Safari/iOS, real Android devices and a manual screen-reader pass were not run.
- Issue #9 (ContentSwap intermittency, Phase 010) did not appear in any run of this phase; it stays open
  and independent.
