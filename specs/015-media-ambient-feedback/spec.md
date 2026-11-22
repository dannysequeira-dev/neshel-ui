# Feature Specification: Images & Media, Background & Ambient, Loading & Feedback (Phase 015)

**Feature Branch**: `feature/015-media-ambient-feedback` (from `origin/main` `3706a36`, after the PR #15 squash
merge)

**Created**: 2026-11-21

**Status**: **Implemented; verified locally — see [evidence.md](evidence.md) (30/30 entries; M06 unverified in
WebKit); three-OS CI recorded in the PR; screen-reader and device passes pending (manual-checks.md).**
`@neshel-ui/animations` stays private (0.0.0).

**Input**: Owner direction 2026-11-21, summarised in [brief.md](brief.md).

Companion documents: [research.md](research.md) (R1–R17), [plan.md](plan.md), [tasks.md](tasks.md),
[analysis.md](analysis.md), [manual-checks.md](manual-checks.md); contracts [media-api.md](contracts/media-api.md),
[ambient-api.md](contracts/ambient-api.md), [feedback-api.md](contracts/feedback-api.md),
[accessibility-015.md](contracts/accessibility-015.md), [support-matrix-015.md](contracts/support-matrix-015.md),
[composition-matrix-015.md](contracts/composition-matrix-015.md),
[performance-matrix-015.md](contracts/performance-matrix-015.md),
[entry-points-015.md](contracts/entry-points-015.md); ADR
[0030](../../docs/decisions/0030-media-ambient-feedback-and-canvas-surfaces.md).

## Problem

Media effects are where libraries hide images until a `load` event that already happened, replace `<img>`
with a proprietary loader, break `srcset`, trap focus in home-made lightboxes and hammer the video decoder with
a seek per scroll event. Ambient effects are where pages burn CPU off-screen, intercept clicks and loop forever
with no way to stop. Loading indicators are where motion is mistaken for state: invented percentages, skeletons
read as content, toasts announced every frame, double submits. Phase 015 adds the three families as thin layers
on the 009–014 engine with native semantics first.

## Goals

1. Media foundations (load watcher, seek coalescer) and M01–M10 keeping native media semantics.
2. Ambient foundations (shared visibility registry, page-level pause, internal canvas surface) and B01–B10.
3. Feedback F01–F10 where the accessible state is primary and the motion follows it.
4. A measured Canvas/GPU decision (ADR 0030) without a public `./gpu` subpath or a graphics dependency.
5. Evidence: unit, composition, three engines, packed SSR consumer, budgets, benchmarks, three-OS CI.

## Non-goals

An image CDN/loader or `next/image` replacement; a carousel, lightbox or toast _product_ beyond the motion and
accessibility contract here; video playback controls or audio; WebGL/WebGPU renderers and the GPU Surface
Manager (016); per-pixel noise dissolve (016); changes to `@neshel-ui/components`, Config, the CLI, the five
public packages or the release workflow; publication, versions, tags, releases; merging the PR.

## Inventory (the 30 catalogue entries)

| Id  | Effect                     | Catalogue driver → Phase 015 driver                                       | Structure | Reduced  | Engine / React                              |
| --- | -------------------------- | ------------------------------------------------------------------------- | --------- | -------- | ------------------------------------------- |
| M01 | Ken Burns                  | CSS → host `translate`/`scale` channels from the progress driver          | W         | static   | `createKenBurns` / `KenBurns`               |
| M02 | Blur-up progressive load   | CSS → load watcher + host opacity (image) + package placeholder layer     | L         | instant  | `createBlurUp` / `BlurUpImage`              |
| M03 | Reveal mask on load        | CSS → load watcher + host `clip-path` channel                             | —         | instant  | `createLoadReveal` / `LoadReveal`           |
| M04 | Before/after slider        | JS → native range input + frame pointer + one host custom property        | L         | n/a      | `createCompareSlider` / `CompareSlider`     |
| M05 | Duotone transition         | CSS → package SVG filter (`k2/k3` per frame) + host `filter` channel      | —         | instant  | `createDuotone` / `Duotone`                 |
| M06 | Video scroll scrub         | JS → seek coalescer (one seek in flight; rVFC when present)               | W         | static   | `createVideoScrub` / `useVideoScrub`        |
| M07 | Lightbox zoom (FLIP)       | WAAPI → native `<dialog>` + core FLIP animator (host transform layer)     | L         | fade     | `createLightboxZoom` / `Lightbox`           |
| M08 | Gallery cross-fade         | CSS → per-slide host opacity (tween from current value), inert inactive   | L         | fade     | `createCrossfade` / `Crossfade`             |
| M09 | Pixel/dissolve transition  | GPU → **Canvas 2D** block dissolve (seeded order); fade fallback          | C         | fade     | `createPixelDissolve` / `PixelDissolve`     |
| M10 | Hover pan inside frame     | JS → core pointer tracker + spring → host `translate`/`scale`             | W         | static   | `createHoverPan` / `HoverPan`               |
| B01 | Gradient shift             | CSS → package layer `transform` keyframes, engine-gated play state        | W         | static   | `createGradientShift` / `GradientShift`     |
| B02 | Aurora blobs               | CSS → package radial-gradient blobs (no `filter: blur`, R10)              | W         | static   | `createAurora` / `Aurora`                   |
| B03 | Grain/noise overlay        | CSS → shared static SVG-turbulence texture; optional stepped jitter       | W         | static   | `createGrain` / `Grain`                     |
| B04 | Particles                  | GPU → **Canvas 2D** surface, seeded, bounded density                      | C         | static   | `createParticles` / `Particles`             |
| B05 | Starfield                  | GPU → **Canvas 2D** surface, seeded, bounded density                      | C         | static   | `createStarfield` / `Starfield`             |
| B06 | Animated grid/dots         | CSS → package pattern layer, seamless `transform` loop                    | W         | static   | `createGridPattern` / `GridPattern`         |
| B07 | Mesh gradient              | CSS/GPU → **CSS** radial-gradient points on package layers                | W         | static   | `createMeshGradient` / `MeshGradient`       |
| B08 | Floating shapes            | CSS → one loop task → host transform layer per child                      | G         | static   | `createFloatingShapes` / `FloatingShapes`   |
| B09 | Pointer-reactive glow      | JS → core pointer tracker → one host custom property pair per frame       | W         | static   | `createPointerGlow` / `PointerGlow`         |
| B10 | Waves (SVG)                | CSS → package SVG wave paths, seamless `transform` loop                   | W         | static   | `createWaves` / `Waves`                     |
| F01 | Spinner                    | CSS (package element)                                                     | —         | reduced⁸ | — / `Spinner`                               |
| F02 | Skeleton shimmer           | CSS → `::after` layer keyed on the `shimmer` token                        | —         | static   | — / `Shimmer`, `SkeletonShimmer`            |
| F03 | Indeterminate progress bar | CSS (package `progressbar`)                                               | —         | reduced⁸ | — / `ProgressBar`                           |
| F04 | Dots pulse                 | CSS (package dots)                                                        | G         | reduced⁸ | — / `DotsPulse`                             |
| F05 | Success check              | CSS (package SVG, `pathLength`; shape shared with S10 via core)           | —         | instant  | — / `SuccessMark`                           |
| F06 | Toast enter/exit           | CSS → core Presence states on package toasts; framework-free toaster      | —         | fade     | `createToaster` / `Toaster`                 |
| F07 | Button loading morph       | CSS → `loading` token (`::after` spinner) + host width lock               | —         | instant  | `createLoadingButton` / `LoadingButton`     |
| F08 | Optimistic pulse           | CSS → `optimistic` token (`::before` layer) with pending/confirmed/failed | —         | static   | `createOptimisticPulse` / `OptimisticPulse` |
| F09 | Progress ring              | CSS (package SVG, `pathLength`) + optional progress source                | —         | instant  | — / `ProgressRing`                          |
| F10 | Pending shimmer on text    | CSS (package span, `background-clip: text`)                               | —         | static   | — / `PendingText`                           |

Driver changes follow rule R-1 (ADR 0025): the consumer's element is animated only by the engine; CSS renders
package-owned DOM or `::before`/`::after` layers keyed on engine tokens. ⁸ Loading indicators keep a slow,
non-vestibular signal under reduced motion (opacity pulse instead of rotation/sweep).

## Clarifications

### Session 2026-11-21 — owner brief

- Q: Which effects? → A: M01–M10, B01–B10, F01–F10 (30); variants are options.
- Q: GPU? → A: decide with measurements in 015.0; no public `./gpu` without review; no graphics dependency.
- Q: Subpaths? → A: evaluate per family; propose names and budgets through the contracts (D-1).
- Q: Authority? → A: slices 015.0–015.6, commits, push and PR authorised; no merge, no publication.

### Decisions recorded by this spec (additive; no owner input needed)

- D-1 Subpaths `./media`, `./ambient`, `./feedback` with opt-in `media.css`, `ambient.css`, `feedback.css`
  (ADR 0030 §1).
- D-2 Canvas 2D (not WebGL) for M09/B04/B05; CSS for B01/B02/B07; internal canvas surface in `src/core`
  (`surface.ts`), not exported; no `./gpu` subpath (ADR 0030 §2–§3; research R8, R10–R12).
- D-3 Shared internals moved to `src/core` so families never import each other: `presence.ts` (from
  `layout/engine`, re-exported unchanged), `marks.ts` (checkmark shape, from `svg`), `media-load.ts`.
- D-4 Ambient effects are finite by default (5 s of motion), `Infinity` explicit; a page-level
  `ambientMotion` switch and `<AmbientMotionToggle>` provide the user pause mechanism (WCAG 2.2.2).
- D-5 One shared `IntersectionObserver` and one `visibilitychange` listener for all ambient effects.
- D-6 Indeterminate indicators are ARIA `progressbar` without a value; no live regions in indicators; toasts
  use one polite region and one alert region created before content.
- D-7 Feedback integrates with `@neshel-ui/components` through DOM contracts (tokens, `data-loading`,
  `aria-busy`), never a package dependency in either direction.
- D-8 `src/core/host.ts` does not change; new channels are internal exclusive channels (the 012–014 pattern).

## Functional requirements

Media foundations (015.1)

- FR-001 Load watcher per R1 (loaded/error/loading, `decode()`, attribute changes, generation guard, timeout
  reveal); never writes native attributes.
- FR-002 Seek coalescer per R5 (one seek in flight, latest target wins, seekable clamp, metadata wait, rVFC when
  present, `fastSeek` opt-in, no `play()`).
- FR-003 Media React integration SSR-safe (markup independent of load state; images visible without JS).

Images & Media (015.2)

- FR-010 M01–M10 per media-api.md, each with engine + React, cleanup, reduced behaviour; continuous/progress
  entries expose `track()`/`drive()`.
- FR-011 M04 keyboard/touch/pointer per R3; M07 dialog/focus/scroll-lock per R6; M10 keyboard option per R9.
- FR-012 M09 real block dissolve with measured cost; fallback reported as fallback.

Ambient foundations (015.3)

- FR-020 Ambient registry (shared observer/listener), `ambientMotion` switch, finite defaults (R14).
- FR-021 Internal canvas surface (lazy, DPR cap, resize in write phase, context loss/restore, release, counters).

Background & Ambient (015.4)

- FR-030 B01–B10 per ambient-api.md: decorative (`aria-hidden`, `pointer-events: none`), paused off-screen /
  hidden / reduced / toggle, bounded options, exact cleanup.

Loading & Feedback (015.5)

- FR-040 F01–F10 per feedback-api.md with the semantics of R15/R16 and slow reduced indicators.
- FR-041 Toaster per R15 (regions, timers, keyboard, Presence, fade under reduced motion).

Pending Phase 014 correction

- FR-050 `loopEffectControl.drive()` inert after destroy (regression test first). **Done** in `4374914`.

Quality (015.6)

- FR-060 Unit tests per FR (jsdom, manual frames; fake images/videos/canvas), cleanup counters, StrictMode.
- FR-061 Composition matrix (composition-matrix-015.md, ≥ 18 rows) in unit tests; browser rows in the lab.
- FR-062 Playground gallery + in-page suite for all 30 entries, run by the CDP check (≥ 147 earlier cases kept)
  and Playwright engines (≥ 161 earlier cases each).
- FR-063 Storybook stories for all 30 entries.
- FR-064 Packed consumer SSR + hydration of the new subpaths; router consumers unchanged and passing.
- FR-065 Measured gzip budgets proposed for the new entries; earlier budgets unchanged.
- FR-066 Benchmarks per performance-matrix-015.md (initialisation vs sustained), local observations.
- FR-067 `pnpm check`, Storybook/Playground builds, three-OS CI on the PR's head commit.

## Success criteria

- SC-001 30 entries implemented, each with an API, a unit test, a story and a gallery demo — or reported pending.
- SC-002 Images keep their native attributes and are never left hidden (load/error/timeout/destroy tests).
- SC-003 Zero React commits during playback; zero scheduler tasks at rest, off-screen, on hidden pages and when
  paused; zero canvases after destroy (counters).
- SC-004 axe clean on the gallery; reduced motion live in three engines; keyboard/touch rows pass.
- SC-005 Three engines pass the Phase 015 suite; native/fallback statuses recorded per engine.
- SC-006 Packed SSR consumer hydrates without mismatch; budgets met; CI green on three OSes.
