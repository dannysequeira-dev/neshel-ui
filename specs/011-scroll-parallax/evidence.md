# Evidence — Phase 011 (Scroll Engine, Scroll Triggers & Parallax)

Branch `feature/011-scroll-parallax` from `origin/main` `70d852b`. Local runs on Windows 11 (Node 26,
pnpm 12), 2026-11-16/17. `@neshel-ui/animations` stays private `0.0.0`; no version, tag, publication or
release; the five public packages and the release workflow are unchanged. CI: see §10.

## 1 · Inventory (21/21)

| Id   | Implementation                                                                  | Unit tests | Browser lab (Chrome + 3 engines)          |
| ---- | ------------------------------------------------------------------------------- | ---------- | ----------------------------------------- |
| ST01 | `revealOnEnter`, `<RevealOnScroll>` (Entrance presets as values)                | ✓          | ✓ once/repeat reveal, packed consumer     |
| ST02 | `staggerOnEnter`, `<StaggerOnScroll>` (E10 `stagger`)                           | ✓          | gallery + capture                         |
| ST03 | `mode` once/repeat/reverse (trigger state machine + Entrance `playback: "out"`) | ✓          | ✓ repeat re-arm, reverse play-out         |
| ST04 | `createScrollTrigger` callbacks, `useScrollTrigger`, `useInView`                | ✓          | ✓ state/callback log                      |
| ST05 | `inViewProgress` (`--neshel-view-progress`, native or JS)                       | ✓          | ✓ driver parity ±0.02                     |
| ST06 | `directionHeader`                                                               | ✓          | ✓ hide forward / show backward            |
| ST07 | `stuckState`                                                                    | ✓          | ✓ stuck / released / before               |
| ST08 | `createSectionSpy`, `useSectionSpy`                                             | ✓          | ✓ `aria-current` on the active link       |
| ST09 | `lazyEffect`                                                                    | ✓          | ✓ Tilt3D attached near the viewport       |
| ST10 | `inViewPresets`, `resolveInView`                                                | ✓          | ✓ `center` band                           |
| SP01 | `depthParallax`, `<ScrollLayer>`                                                | ✓          | ✓ depth ratio, scene C depth ordering     |
| SP02 | `scrubTransform`                                                                | ✓          | ✓                                         |
| SP03 | `scrollProgress`, `<ScrollProgressBar>` (native ScrollTimeline or JS)           | ✓          | ✓ equals page progress ±0.01              |
| SP04 | `<HorizontalScroll>` (pinned / stacked / native scroller)                       | ✓          | ✓ track at half way, focus, reduced stack |
| SP05 | `pinnedScene`, `<ScrollScene>` (CSS sticky)                                     | ✓          | ✓ scene C checks migrated from 008.0      |
| SP06 | `imageParallax`, `<ParallaxImage>`                                              | ✓          | ✓ media keeps covering its frame          |
| SP07 | `zoomOnScroll`                                                                  | ✓          | ✓                                         |
| SP08 | `scrollColorShift` (+ themes)                                                   | ✓          | ✓                                         |
| SP09 | `stickyStack`, `<StickyStack>`                                                  | ✓          | ✓ increasing sticky offsets               |
| SP10 | `smooth` (engine spring smoothing; `<ScrollScene smooth>`)                      | ✓          | ✓ lag then convergence; dynamic geometry  |
| SP11 | `velocitySkew` (+ additive `skewX/skewY` in `TransformLayer`)                   | ✓          | ✓ skew while fast, settles to none        |

## 2 · Engine and contracts

Architecture and contracts: [scroll-engine.md](contracts/scroll-engine.md), ADR 0026 (proposed). One
source record per scroller (passive listener, read-phase position, velocity, direction, trailing frame);
one progress model (CSS named ranges, transforms ignored) shared by both drivers; one shared
ResizeObserver and MutationObserver with reference-counted targets; invalidation passes in the read phase;
`refreshScroll()` / `refresh()` for documented undetectable cases; `diagnose()`.

## 3 · Public ScrollScene API

`<ScrollScene length smooth driver range>` (section + CSS-sticky stage, context timeline), `<ScrollLayer>`,
`<ScrollEffect>` (any scroll-family preset, scene-aware), `useScrollScene()`, `useScrollProgress()`;
imperative `createScrollProgress()` + `attachEffect()`. Contract: [api-011.md](contracts/api-011.md) §4.

## 4 · Native driver vs JS fallback

| Engine (Playwright)      | Behavioural probes (R1)    | Native animations in the gallery                  | Fallbacks |
| ------------------------ | -------------------------- | ------------------------------------------------- | --------- |
| Chromium 158             | all pass                   | SP03 (ScrollTimeline), ST05 + SP05 (ViewTimeline) | 0         |
| Firefox 159              | all pass; no `CSS.percent` | same three                                        | 0         |
| WebKit 27.2 (not Safari) | all pass                   | same three                                        | 0         |

Findings fixed during the phase: (1) the page-progress range `[0, "100%"]` was parsed as px 0 and never
went native — `expressible()` now accepts it (unit test added); (2) in WebKit the behavioural check caught
a stale JS max scroll (document growth that no observer reported because the lab's root box does not
resize): whole-range root timelines now also observe `<body>` and its children, and the check re-measures
once before falling back (`getScrollDebugInfo().lastFallback` records native vs expected). Anything that
moves the consumer's element stays on the JS driver by design (research R2).

## 5 · Performance and geometry

- Scroll bursts (60 frames, both directions, 15 active timelines): **0 layout reads** (instrumented
  `getBoundingClientRect`, `offsetTop/Height`, `clientHeight`, `scrollHeight`) and **0 geometry
  measurements**; one scroll-position read per frame (Chrome, Chromium, Firefox, WebKit).
- Idle: the shared scheduler has no pending task once scrolling stops (all engines).
- Frame intervals during a 60-frame programmatic scroll with 15 timelines + 2 scenes (observation,
  headless): Chrome 157 median 16.6 ms / p95 18.5 ms; Chromium 158 16.7 / 17.9; Firefox 159 7 / 8;
  WebKit 27.2 26 / 33 (Playwright WebKit on Windows renders headless frames slowly also without the
  engine; not a budget).
- Geometry: the 008.0 regression cases (content above grows, compensated shift, insertion/removal above,
  viewport resize) pass against the package; scene-2 stays consistent (±0.01) after inserting/removing
  500 px above it; unit tests cover resize, insertion, late content, compensated changes, refresh and
  drift = 0.

## 6 · Composition matrix

[composition-matrix-011.md](contracts/composition-matrix-011.md): SP01 + Tilt-like + Press + consumer
inline transform (restored exactly), SP07 + SP01 + SP11 in one transform, SP02 opacity × consumer opacity,
ST01 + Hover layer kept after the reveal, ST05 second writer suspended/resumed (unit); Entrance + Hover +
Press + SP01 on one element under hover in three engines (lab).

## 7 · Accessibility and reduced motion

- No non-passive listener; no wheel/touch/key interception (unit, instrumented); anchors: hash navigation
  scrolls natively and the engine follows (lab).
- Reveals: never held under reduced motion, without IntersectionObserver, after `beforeprint`, or for
  hydrated content in view; held content below the fold is revealed on enter (unit + packed consumer).
- Live reduced motion: SP01/SP02/SP06/SP07/SP09 clear, SP11 off, SP10 raw progress, SP08 stepped, ST05 = 1,
  SP03 kept, SP05 token; SP04 re-laid out vertically — in the three engines with emulated preference.
- SP04 focus: tabbing to an off-screen card resets the clipped stage and scrolls to show it (three engines).
- axe: no violations on the lab page (Chrome).
- Pending (owner): manual screen-reader pass; real Safari (Playwright WebKit is not Safari).

## 8 · Bundle budgets (packed tarball, gzip; proposed for owner approval)

| Entry                                         | Measured  | Proposed budget                       |
| --------------------------------------------- | --------- | ------------------------------------- |
| scroll: createScrollProgress (engine)         | 6.68 KiB  | 7.00 KiB                              |
| scroll: depthParallax definition              | 8.25 KiB  | 8.75 KiB                              |
| scroll: revealOnEnter definition              | 8.21 KiB  | 8.75 KiB                              |
| scroll: ScrollScene + ScrollLayer             | 15.08 KiB | 15.75 KiB                             |
| scroll: RevealOnScroll                        | 10.54 KiB | 11.00 KiB                             |
| scroll: HorizontalScroll                      | 11.15 KiB | 11.75 KiB                             |
| scroll: entire entry                          | 24.00 KiB | 25.00 KiB                             |
| css: scroll.css                               | 1.13 KiB  | 1.25 KiB                              |
| css: styles.css (aggregate, now + scroll.css) | 3.73 KiB  | 4.00 KiB (was 3.10 for hover + press) |

Core, root, Entrance, Hover and Press budgets are unchanged and still met. Tree-shaking markers prove the
scroll entries contain no Entrance, Hover or Press code. Report: `bundles-report.json`.

## 9 · Gates (local)

| Gate                                                                                                                                     | Result                                |
| ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| `pnpm check` (doctor, lint, typecheck, test 107, build, test:packages 426 incl. animations 222, exports, `check:pack --with animations`) | pass                                  |
| `pnpm check:browser:animations` (Chrome 157)                                                                                             | 70/70                                 |
| `pnpm check:animations:engines`                                                                                                          | Chromium, Firefox, WebKit: 62/62 each |
| `pnpm check:animations:consumer` (packed, Vite, SSR, hydration, scroll)                                                                  | pass                                  |
| `pnpm check:animations:bundles`                                                                                                          | pass                                  |
| `pnpm build:storybook`, `pnpm build:playground`                                                                                          | pass                                  |

## 10 · CI and PR

PR [#8](https://github.com/dannysequeira-dev/neshel-ui/pull/8). First CI run 44092856532 failed in the
test matrix: the apps' typecheck runs before the package build and `@neshel-ui/animations/scroll` had no
source path mapping in the Playground/Storybook `tsconfig` (fixed in `fe8be9e`, verified locally with no
`dist`). CI run **44110787974: 14/14 jobs passed** — Linux (Node 22/24/26), Windows and macOS (Node 26),
browsers (Linux, macOS), docs (three OS), Next + starters (three OS), Vercel build.

## 11 · Known limits and pending verifications

- Geometry the observers cannot see (margin changes on preceding elements, compensated ancestor padding,
  `position`/`top` toggles, scrollers between subject and source, sticky subjects): call `refresh()`.
- Inline-axis progress assumes left-to-right containers.
- SP09 covered-card scale uses an equal-slot model (exact for equal-height cards).
- SP04 follows the root scroller only; focus management writes the document scroll position.
- ST07 assumes a block-start (`top`) sticky offset.
- Hydration below the fold may move content above the viewport if a pinned section grows; browsers with
  scroll anchoring compensate (Safari pending).
- Real Safari, screen readers and touch devices: pending manual verification.
