# Plan — Phase 012

## Technical context

React 19, TypeScript strict, ESM, `tsc` builds per package, `node:test` against `dist` with jsdom and a
manual `requestAnimationFrame`, Biome, Storybook (React/Vite), Playground lab (Vite), CDP Chrome check,
Playwright engines check, packed-tarball consumer and bundle checks. No new dependency.

## Module structure

```
packages/animations/src/
  core/compose.ts            + scaleX/scaleY (additive)
  core/host.ts               touch-action excluded from will-change
  core/layout-box.ts         offset chain + measureBox (moved from scroll/engine/geometry.ts)
  core/pointer-session.ts    shared pointer tracking (internal)
  core/flip.ts               FLIP animator (internal)
  gestures/engine/           gesture.ts, physics.ts, velocity.ts, drag-motion.ts, controls.ts, debug.ts
  gestures/effects.ts        G01–G03, G07 (drag motion), G05, G11
  gestures/transform.ts      G08, G09
  gestures/scroller.ts       G04, G06
  gestures/reorder.ts        G10
  gestures/react.tsx         components and hooks
  gestures/gestures.css
  layout/engine/             group.ts, reflow.ts, height.ts, presence.ts, debug.ts
  layout/effects.ts          L01, L02, L04–L07, L09 definitions, L10
  layout/react.tsx           LayoutGroup, LayoutItem, AutoHeight, AnimatedList, Reflow, Collapse,
                             TabIndicator, CrossFade, Masonry
  layout/presence.tsx        Presence, usePresence, useIsPresent
  layout/layout.css
  hover/cursor-follower.ts(x) H11
  press/long-press.ts(x)      P11
```

## Slices

| Slice | Content                                                                                    | Gate                                      |
| ----- | ------------------------------------------------------------------------------------------ | ----------------------------------------- |
| 012.0 | spec, research (engine probes), contracts, ADR 0027, plan, tasks, analysis                 | documents consistent (analysis.md)        |
| 012.1 | core additions, pointer session, recogniser, physics, drag motion, controls, FLIP animator | unit tests; earlier suites unchanged      |
| 012.2 | G01–G11, H11, P11 + keyboard/touch/reduced tests                                           | unit tests; typecheck; lint               |
| 012.3 | layout groups, reflow, height drivers, presence; L01–L10                                   | unit tests incl. StrictMode and cleanup   |
| 012.4 | React components, Storybook stories, Playground gallery and in-page suite                  | builds; CDP + Playwright suites           |
| 012.5 | composition tests, packed consumer, bundles, docs, CI                                      | `pnpm check`; all browser checks; 3-OS CI |

## Test strategy

- **Unit (jsdom, manual frames):** synthetic `PointerEvent`s with `pointerId`s (multi-pointer), capture
  stubs, `lostpointercapture`, scroll events; layout boxes stubbed through `offsetTop/Left/Width/Height`;
  `ResizeObserver`/`MutationObserver` fakes; WAAPI stub; listener/observer/task counters; Profiler for
  React commits; StrictMode mounts.
- **Browser (real layout):** in-page suite shared by CDP and Playwright (gallery `runGestureSuite()` /
  `runLayoutSuite()`), with conditions decided by observation and ceilings; CDP real mouse
  (`Input.dispatchMouseEvent`), real multi-touch (`Input.dispatchTouchEvent` with two touch points),
  keyboard and axe; Playwright engines with an emulated touch device context (`hasTouch`, `isMobile`) for
  Chromium and WebKit; Firefox runs the in-page synthetic pointer suite (no `TouchEvent`, research R3).
- **Performance:** layout-read instrumentation during pointer moves and FLIP frames; scheduler size at
  rest; React Profiler commits during gestures.

## Risks

| Risk                                                   | Mitigation                                                          |
| ------------------------------------------------------ | ------------------------------------------------------------------- |
| Budget pressure on `composeTransform`, press, entrance | measure each additive change; propose increases explicitly          |
| Synthetic pointers have no capture in jsdom/browsers   | capture errors swallowed; real capture covered by CDP real input    |
| WebKit/Firefox touch emulation limits                  | document per-engine coverage honestly (evidence §8)                 |
| Issue #9 intermittency resurfacing                     | separate diagnosis; never retried blindly; not fixed in this branch |
