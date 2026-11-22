# Plan — Phase 015

## Technical context

React 19.3 (peer `^19.0.0`), TypeScript strict, ESM, `tsc` builds per package, `node:test` against `dist` with
jsdom and a manual `requestAnimationFrame`, Biome, Storybook (React/Vite), Playground lab (Vite), CDP Chrome
check, Playwright engines check, packed-tarball consumer and bundle checks. No new runtime dependency. Lab media
are generated locally (canvas-drawn images as data URLs; a 2 s ffmpeg `testsrc2` clip — no third-party content —
encoded with 4-frame GOPs as WebM VP9 and MP4 H.264, 40 KB each, in `apps/playground-vite/src/animations/media/`; M06 browser rows that need a
decodable video report `skipped` with the reason).

## Module structure

```
packages/animations/src/
  core/presence.ts          Presence state machine (moved from layout/engine; layout re-exports)
  core/marks.ts             checkmark shape (shared by svg S10 and feedback F05)
  core/media-load.ts        image load watcher (R1)
  core/surface.ts           Canvas 2D surface (R12)
  media/engine/seek.ts      seek coalescer (R5)
  media/engine/debug.ts     counters, support
  media/ken-burns.ts (M01) reveal.ts (M02, M03) compare.ts (M04) duotone.ts (M05) video.ts (M06)
  media/lightbox.ts (M07) crossfade.ts (M08) dissolve.ts (M09) hover-pan.ts (M10)
  media/react.tsx media/index.ts media/media.css
  ambient/engine/registry.ts  shared visibility observer + listener, ambientMotion switch
  ambient/engine/ambient.ts   ambient lifecycle (CSS play state or loop task)
  ambient/engine/debug.ts
  ambient/layers.ts (B01, B02, B03, B06, B07, B10) canvas.ts (B04, B05) floating.ts (B08) glow.ts (B09)
  ambient/react.tsx ambient/index.ts ambient/ambient.css
  feedback/toaster.ts (F06 store) loading-button.ts (F07) optimistic.ts (F08) debug.ts
  feedback/react.tsx (F01–F10 components) feedback/index.ts feedback/feedback.css
```

## Slices

| Slice | Content                                                                                                 | Gate                                  |
| ----- | ------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| 015.0 | brief, spec, research (+ measured spike), contracts, ADR 0030, plan, tasks, analysis, manual checks     | documents consistent (analysis.md)    |
| 015.1 | core moves (presence, marks), load watcher, seek coalescer, tests                                       | unit tests; earlier suites unchanged  |
| 015.2 | M01–M10 engines + React + `media.css` + tests                                                           | unit tests; typecheck; lint           |
| 015.3 | canvas surface, ambient registry/lifecycle, `ambientMotion`, tests                                      | unit tests                            |
| 015.4 | B01–B10 engines + React + `ambient.css` + tests                                                         | unit tests                            |
| 015.5 | F01–F10 + toaster + `feedback.css` + tests                                                              | unit tests                            |
| 015.6 | gallery + suite, CDP/Playwright cases, Storybook, composition, benchmarks, packed consumer, budgets, CI | `pnpm check`; browser checks; 3-OS CI |

## Test strategy

- **Unit (jsdom):** manual frames; fake image elements (controllable `complete`/`naturalWidth`/`decode`), fake
  video (`currentTime`, `seeking`, `seekable`, events), canvas context stub with call counters; host style
  snapshots; attribute snapshots; listener/observer/canvas counters; StrictMode; SSR markup; fake timers for
  toasts.
- **Browser:** in-page suite `runMediaAmbientFeedbackSuite()` shared by CDP and Playwright: real image loading
  (blob URLs, a broken URL), real `<dialog>`, real range input keys, pointer input, canvas pixel probes (M09
  cells, B04 non-empty), CSS play state, AX tree (Chrome), forced colours (Chromium emulation), reduced motion
  live, visibility gating, axe.
- **Performance:** `scripts/bench-animations-media-ambient.mjs` (performance-matrix-015.md) plus the 015.0
  spike (`scripts/bench-animations-ambient.mjs`).

## Risks

| Risk                                                        | Mitigation                                                                 |
| ----------------------------------------------------------- | -------------------------------------------------------------------------- |
| jsdom lacks media/canvas/dialog                             | small explicit fakes in tests; browser suite covers the real behaviour     |
| Headless engines misrepresent GPU                           | no GPU claims; CPU submission time only; SwiftShader noted                 |
| Video decoding differs per engine; no test clip in the repo | generated clip where `MediaRecorder` exists; otherwise rows marked skipped |
| Budget pressure                                             | new entries only; measured; proposed for owner review                      |
| Ambient defaults stopping after 5 s surprise consumers      | documented; `Infinity` + toggle path in examples and stories               |
