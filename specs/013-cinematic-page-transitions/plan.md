# Plan — Phase 013

## Technical context

React 19.3 (peer `^19.0.0`), TypeScript strict, ESM, `tsc` builds per package, `node:test` against `dist`
with jsdom and a manual `requestAnimationFrame`, a `document.startViewTransition` stub for unit tests,
Biome, Storybook (React/Vite), Playground lab (Vite, multi-page for MPA), CDP Chrome check, Playwright
engines check, packed-tarball consumer and bundle checks, router consumers (Next 16.4.5, React Router 8.x)
built from the tarball. No new runtime dependency; `next` and `react-router` become optional peers.

## Module structure

```
packages/animations/src/
  core/effect.ts               + drivable (optional metadata, type-level)
  core/host.ts                 view-transition-name/-class excluded from will-change
  entrance/factory.ts          + progress option (external driver) + drivable span
  cinematic/engine/timeline.ts C01 engine
  cinematic/engine/positions.ts, tracks.ts, debug.ts
  cinematic/scene.ts           C02 createSceneChapters
  cinematic/camera.ts          C03
  cinematic/cover.ts           C04/C05
  cinematic/title.ts           C06
  cinematic/spotlight.ts       C07
  cinematic/depth.ts           C08
  cinematic/storyboard.ts      C09
  cinematic/letterbox.ts       C10
  cinematic/react.tsx          components and hooks
  cinematic/cinematic.css
  page-transitions/engine/     support.ts, controller.ts, names.ts, direction.ts, progress.ts, mpa.ts
  page-transitions/react.tsx   PageTransition, SharedElement, PersistentElement, RouteProgress, hooks
  page-transitions/next.tsx    Next adapter (subpath ./page-transitions/next)
  page-transitions/react-router.tsx  React Router adapter
  page-transitions/page-transitions.css, page-transitions-mpa.css
```

## Slices

| Slice | Content                                                                                                   | Gate                                  |
| ----- | --------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| 013.0 | brief, spec, research (VT/MPA/Navigation probes), contracts, ADR 0028, plan, tasks, analysis              | documents consistent (analysis.md)    |
| 013.1 | core/entrance additive changes, timeline engine, `useTimeline`, tests                                     | unit tests; earlier suites unchanged  |
| 013.2 | C02–C10 engines + React + CSS + tests                                                                     | unit tests; typecheck; lint           |
| 013.3 | page-transition engine, CSS, React bindings, tests                                                        | unit tests with VT stub               |
| 013.4 | `useRouteTransition`, Next/React Router adapters, router consumers                                        | real consumers pass                   |
| 013.5 | Playground gallery + MPA pages + suites, Storybook, composition tests, packed consumer, budgets, docs, CI | `pnpm check`; browser checks; 3-OS CI |

## Test strategy

- **Unit (jsdom):** manual frames; timeline edge cases (research R5 table); host style snapshots before/
  after; listener/observer/task counters; Profiler commits; StrictMode; SSR markup; a View Transition stub
  that records types/names at capture time and lets tests resolve `ready`/`finished`, abort, or reject.
- **Browser:** gallery in-page suites (`runCinematicSuite()`, `runPageTransitionSuite()`) shared by CDP and
  Playwright, decided by observation with ceilings (no sleeps); MPA navigation cases on real documents;
  emulated touch device for the storyboard and camera.
- **Performance:** scheduler size at rest; per-frame host writes; layout-read instrumentation during
  multi-track timelines (stress: 4 timelines × 24 tracks, overlapping); frame times via `requestAnimationFrame`
  deltas in the lab (reported, no compositor claim).

## Risks

| Risk                                           | Mitigation                                                                 |
| ---------------------------------------------- | -------------------------------------------------------------------------- |
| View Transitions untestable in jsdom           | stub for unit logic; real behaviour in three engines                       |
| React Router 8 API differs from earlier majors | read installed types first; adapter scope follows what exists              |
| Router consumers need network installs         | same policy as `check:consumer` (network allowed; SKIPPED offline locally) |
| Budget pressure on Entrance (new option)       | measure; propose explicitly; never silently raise                          |
| Issue #9 intermittency                         | observed separately; no Press changes in this branch                       |
