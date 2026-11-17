# Research — Phase 011 (Scroll Engine)

All probes ran on 2026-11-16 with the repository's Playwright 1.65 browsers (Chromium 158.0.8127.18,
Firefox 159.0, WebKit 27.2 — Playwright WebKit, not Safari) on Windows 11. Probe pages are reproduced by
the lab (`scripts/lib/animations-lab.mjs`, scroll section) so the results are re-checked in CI.

## R1 — Native scroll-driven animations: real behaviour, not `CSS.supports()`

Probe 1 (CSS): `animation-timeline: scroll(root)`, `view()` with `animation-range: entry 0% exit 100%`, a
named `scroll-timeline` on an inner container shared through `timeline-scope`, and a JS
`new ScrollTimeline({ source })` driving `element.animate()`. Computed values were read after scrolling.

| Check                                           | Chromium 158 | Firefox 159 | WebKit 27.2 |
| ----------------------------------------------- | ------------ | ----------- | ----------- |
| `CSS.supports` timeline / view / range / scope  | yes          | yes         | yes         |
| `scroll(root)` opacity at 50 % scroll           | 0.5          | 0.5         | 0.5         |
| `view()` + range, subject passed                | 1            | 1           | 1           |
| named timeline via `timeline-scope` (container) | 0.5          | 0.5         | 0.5         |
| `ScrollTimeline` + WAAPI transform              | 50 px        | 50 px       | 50 px       |
| `animation.currentTime` representation          | `50%`        | `50000`     | `50%`       |

Probe 2 (the driver this phase needs): a registered `<number>` custom property animated by WAAPI with a
`ViewTimeline` (`rangeStart: "cover 0%"`, `rangeEnd: "cover 100%"`) and with a `ScrollTimeline` on an
inner container. Subject at document top 1320 px, height 200 px, viewport 600 px — the JS geometry model
(R3) predicts a cover range of 720 → 1520 px.

| Scroll position                               | Expected | Chromium | Firefox                               | WebKit |
| --------------------------------------------- | -------- | -------- | ------------------------------------- | ------ |
| 0                                             | 0        | 0        | 0                                     | 0      |
| 820                                           | 0.125    | 0.125    | 0.125                                 | 0.125  |
| 1120                                          | 0.5      | 0.5      | 0.5                                   | 0.5    |
| inner container 50 %                          | 0.5      | 0.5      | 0.5                                   | 0.5    |
| range as `{rangeName, offset: CSS.percent()}` | —        | ok       | **TypeError** (`CSS.percent` missing) | ok     |

Conclusions: (1) all three engines implement scroll and view timelines effectively; (2) the JS geometry
model matches the native ranges exactly, so both drivers can share one contract; (3) ranges must be passed
as strings (`"cover 0%"`), never Typed OM objects; (4) `currentTime` is not portable — progress must be
read with `effect.getComputedTiming().progress`; (5) `CSS.supports()` alone would have been right here,
but older Firefox builds exposed the properties behind a flag with incomplete behaviour, so the engine
keeps a behavioural check (R4).

## R2 — Why the native driver cannot move the consumer's element

A browser animation (CSS `animation-timeline` or WAAPI with a timeline) on `transform` or `opacity`
overrides the motion host's composed inline value: a parallax written natively would erase a Tilt3D,
Hover or Press layer on the same element (the exact failure ADR 0019/0022 exist to prevent). Individual
`translate`/`scale` properties are exclusive single-owner channels and are used by other effects. A package
stylesheet declaring `animation-timeline` on the consumer's element also violates rule R-1 (ADR 0025).

Decision input: the native driver is used only for **custom properties** (registered `<number>`/`<color>`
values that no other effect composes) and for **package-rendered elements**; every write to the
consumer's `transform`/`opacity` goes through the JS driver and the motion host.

## R3 — Progress model shared by both drivers

Coordinates are layout coordinates in the scroll container's content box, measured with the
`offsetTop/offsetLeft` chain (+ `clientTop/Left` of each offset parent), which ignores transforms — an
element moved by its own parallax layer is measured where layout put it, not where it is painted
(`getBoundingClientRect` would feed the effect its own output). Named ranges follow CSS Scroll-driven
Animations §4 (`cover`, `contain`, `entry`, `exit`, `entry-crossing`, `exit-crossing`) with percentage
offsets; a scroll (non-view) timeline maps the whole scroll range or explicit px offsets. Formulas:
[contracts/scroll-engine.md](contracts/scroll-engine.md) §2. Probe 2 confirms the cover formula against
three engines.

## R4 — Native driver selection and verification

`driver: "auto"` picks native when `ScrollTimeline`, `ViewTimeline`, `CSS.registerProperty` and
`Element.animate` exist **and** a behavioural check passes: in the first read phase after the native
animation starts, the engine compares `getComputedTiming().progress` with the JS model's progress for the
current scroll position; a `null` progress or a difference above 0.02 cancels the native animation and
switches to the JS driver (`getScrollDebugInfo().nativeFallbacks` counts it). Ranges the native API cannot
express (explicit px offsets on scroll timelines, smoothing) use the JS driver. Implementation finding
(WebKit lab run): the JS side can be the stale one, so a first mismatch re-measures the timeline and the
decision is taken on the next comparison; `getScrollDebugInfo().lastFallback` records native vs expected.

## R5 — Geometry invalidation (from the 008.0 prototype, CI run 43936536735)

The prototype learnt that observing only the subject leaves a stale top when content above changes. The
engine keeps its signal set — ResizeObserver on the subject, the document element and every preceding
element sibling along the ancestor chain up to the source; MutationObserver on those ancestors' child
lists; viewport `resize`; `document.fonts` `loadingdone`; `load`; for whole-range root timelines also `<body>` and its children,
because a root box with `height: 100%` does not resize when content grows (found by the WebKit lab run) —
but shares ONE ResizeObserver and ONE
MutationObserver across all timelines (reference-counted targets), and coalesces every signal into ONE
measurement pass in the next read phase for all dirty timelines. Undetectable without polling: margin
changes on preceding elements that resize no observed box, ancestor padding changes compensated
elsewhere, `position`/`top` changes, transforms on ancestors of a source container. These are documented
and `refreshScroll()` / `progress.refresh()` exist for them.

## R6 — Scroll position reads

A passive `scroll` listener per source only marks it dirty and schedules one read task. The read phase
reads `scrollTop/scrollLeft` (or `scrollY/scrollX`) once per source per frame; no `getBoundingClientRect`,
`offset*`, `client*` or `scrollHeight` is read on scroll — those are read only during invalidation passes.
Velocity is `Δposition / Δtime` (px/s) with a 0.6 exponential smoothing; a trailing frame after the last
scroll event drops velocity to 0 so velocity-driven effects settle and the loop stops.

## R7 — Pinning and horizontal sections without JS spacers

`position: sticky` on a stage inside a tall section pins in all three engines (008.0 R8). SP04 sizes its
section from the measured track overflow by writing one custom property on the package-rendered section
(`--neshel-hscroll-distance`), recomputed only on invalidation. Focus entering an off-screen card would make
the browser scroll the clipped stage horizontally; the component resets the stage's `scrollLeft` and
scrolls the document to the vertical position that maps to the focused card (focus management, not
hijacking). Without JS the track is a native horizontal scroller; reduced motion stacks it vertically.

## R8 — Reveal on enter without hiding content

Entrance effects (010) write their start pose only while playing. Reveal-on-enter must hold the start pose
of content below the fold until it enters. Holding is applied only (a) on client-only mounts, before
paint, or (b) after the first IntersectionObserver report says the element is outside the trigger area
(hydrated content that is visible stays as rendered). It is never applied under reduced motion, without
IntersectionObserver, or after `beforeprint`. This needs two additive Entrance options (`hold`,
`playback: "out"`), documented in contracts/api-011.md §3.

## R9 — Stuck detection and section spy

ST07 uses an IntersectionObserver on the sticky element itself with `rootMargin: -(top + 1)px 0 0 0` and
threshold 1 (its computed `top` read on invalidation); an entry whose ratio is below 1 **and** whose top
is within 1 px of the sticky offset is stuck — no sentinel element inserted into the consumer's DOM.
ST08 picks the last section (document order) whose top is above the activation line, with the last
section forced active at the end of the scroll range (short final sections otherwise never activate).

## R10 — Smooth scrub and velocity skew

SP10 reuses the 008 spring integrator through the 010 spring rig: the smoothed progress follows the raw
progress with `{ stiffness: 90, damping: 20 }` (prototype values) and the task stops at rest; reduced
motion bypasses smoothing (off). SP11 needs a skew component in transform layers; `composeTransform`
gains optional `skewX`/`skewY` (additive, summed, emitted after rotations and before scale, matching CSS
order); existing outputs are unchanged when skew is absent.
