# Research — Phase 012 (R1–R12)

Probes ran on 2026-11-17 on Windows 11 with the repository's Playwright browsers: **Chromium 158.0.8127.18
(headless), Firefox 159.0, WebKit 27.2**. Scripts were throwaway probes; the decisions they support are
re-verified by the permanent checks listed in [evidence.md](evidence.md).

## R1 — Animating to and from `height: auto`

`CSS.supports` alone is not proof, so a behavioural probe ran a 2000 ms linear `height` transition from `0`
to `auto` (with `interpolate-size: allow-keywords`), to `calc-size(auto, size)`, and a px control, and read
the computed height after ~600 ms:

| Engine       | `interpolate-size` supported | `0 → auto` mid-height | `calc-size()` mid-height | px control |
| ------------ | ---------------------------- | --------------------- | ------------------------ | ---------- |
| Chromium 158 | yes                          | 39 px (animates)      | 39 px                    | 39 px      |
| Firefox 159  | no                           | 120 px (jumps)        | n/a (unsupported, 0)     | 37 px      |
| WebKit 27.2  | yes                          | 39 px (animates)      | 39 px                    | 39 px      |

A first probe that set `interpolate-size` and the transition in the same style change as the target did not
animate in any engine (no start style) — the CSS driver must set the transition on the element before the
state change, which package CSS does by construction.

**Decision.** L06 (accordion/collapse) has an `auto` driver: CSS (`interpolate-size` on a package-rendered
panel, transition declared by package CSS on that package element, rule R-1 respected) when
`CSS.supports("interpolate-size", "allow-keywords")`; otherwise a **measured WAAPI fallback** (two reads per
toggle, transient animation, no fill). Both drivers are forced in the browser lab of every engine
(`driver: "css" | "js"`). L02 (auto-height for arbitrary content changes) uses the measured path always: a
`ResizeObserver` on the inner content provides the new size without a layout read.

## R2 — Pointer Events, capture and `touch-action`

- The browser decides at `pointerdown` from `touch-action` whether it may pan or zoom; once it does, the
  page receives `pointercancel` and no more moves. Preventing default on `pointermove` cannot undo that.
  So `touch-action` is the **only** reliable switch, and it must be set before the gesture starts.
- `setPointerCapture` keeps moves and `pointerup` on the element when the pointer leaves it;
  `lostpointercapture` is delivered when capture ends for any reason (removed element, another capture),
  and must be treated as a cancel when no `pointerup` arrived.
- `touch-action: pan-x pan-y` keeps one-finger scrolling and disables browser pinch-zoom on that element,
  so two-finger moves reach the page — the standard way to implement pinch/rotate without blocking
  scrolling. `pinch-zoom` keeps browser zoom while the page owns pans.

**Policy (contracts/gesture-engine.md §4).** `touch-action` is set **only on the interaction area of an
attached gesture** (never on `html`/`body`), through the element's motion host (captured and restored
exactly), as the intersection of what every attached gesture allows:

| Gesture                               | Allows                                      |
| ------------------------------------- | ------------------------------------------- |
| Drag / fling `axis: "x"` (G01/G02/G07) | `pan-y pinch-zoom`                          |
| Drag / fling `axis: "y"`              | `pan-x pinch-zoom`                          |
| Drag / fling both axes                | `pinch-zoom`                                |
| Swipe to dismiss (G03, x)             | `pan-y pinch-zoom`                          |
| Pinch-zoom (G08) at scale 1           | `pan-x pan-y` (one finger scrolls the page) |
| Pinch-zoom while zoomed in            | `none` (one finger pans the media)          |
| Rotate (G09)                          | `pan-x pan-y`                               |
| Reorder (G10)                         | `none` on the **handle** only               |
| Pull-to-refresh (G04), elastic (G06)  | nothing — observe-only (R3)                 |

## R3 — Observe-only gestures on scroll containers (G04, G06)

A pull-to-refresh or elastic edge must not set `touch-action: none` on a scroller (it would block
scrolling). Touch Events keep firing (`touchmove`, non-cancelable once the browser scrolls) while the
browser pans, and at the top of an inner scroller with `overscroll-behavior: contain` a downward pan moves
nothing, so passive `touchmove` listeners can drive a visual indicator without preventing anything. Mouse
and pen use pointer events. Wheel at an edge is passive too. Firefox desktop has no `TouchEvent` (probe:
`typeof TouchEvent === "undefined"`), where touch input arrives as pointer events; G04/G06 then use pointer
events for touch as well, still without capture or prevention. WebKit 27.2 reports no
`overscroll-behavior` support: G04 documents that native rubber-banding there may show together with the
indicator (visual only).

## R4 — Velocity estimation

Release velocity is estimated from the samples of the last 100 ms (ring buffer, no allocation per move):
the slope between the oldest sample in the window and the newest, with a minimum span of 8 ms. If the last
sample is older than 40 ms at release, the pointer stopped before lifting and the velocity is 0 (no
unwanted fling after a pause). Acceleration (change of velocity) is exposed for diagnostics. Coalesced
events are not needed at this precision.

## R5 — Inertia and decay

Exponential decay (`v(t) = v₀·e^(−t/τ)`, the model of native momentum scrolling) has a closed-form rest
position `x∞ = x₀ + power·v₀·τ`, which lets snap points be chosen from the projected end **before**
animating, and is integrated exactly per frame (`e^(−dt/τ)`), so it is frame-rate independent. Defaults:
`power 0.8`, `timeConstant 325 ms`, rest below 5 px/s. When a decaying value crosses a constraint, the
motion hands its velocity to the existing spring integrator toward the bound (bounce), so there is still
one spring integrator. Decay is a pure step function in `src/gestures/engine/physics.ts`, not a second
scheduler: it runs in update tasks of the 009 scheduler.

## R6 — Rubber banding

Beyond a constraint, displacement `x` over dimension `d` maps to `(1 − 1/(x·c/d + 1))·d` with `c = 0.55`
(the familiar iOS feel): continuous at the bound, monotonic, asymptotic to `d`. Used by drag constraints
(G02), elastic edge (G06) and swipe resistance (G03).

## R7 — FLIP measurement without thrashing

- **Coordinates.** Boxes come from the offset chain (011 geometry, moved to a shared core module): layout
  positions that ignore transforms, so hover/press/scroll layers and the FLIP layer itself never feed back
  into the measurement, and a consumer's inline transform stays as the host's baseline.
- **First.** The only moment the old layout exists is before the change. Framework-free callers call
  `snapshot()` before mutating; the React integration reads in `getSnapshotBeforeUpdate` of a class
  boundary (runs in the commit, before DOM mutation). Reads of every item are batched in one pass with no
  write in between (layout is clean at that point, so there is no forced reflow cascade). An item already
  being animated adds its current animated offset (known state, no read), so interruption is continuous.
- **Last + invert.** Measured in the next **read phase** of the scheduler, which runs in the frame's
  `requestAnimationFrame` — after the DOM change, **before paint** — then the inverse layer is written in
  the same frame's write phase: no flash of the final layout.
- **Reflow without React (L05/L10).** A window resize reflows a grid without any render. A shared
  `ResizeObserver` on the container and items reports after layout and before paint; the reflow group
  measures in that callback (layout is already clean) and flushes the host synchronously, so the inverted
  frame is the one painted. This is the single documented read point outside the scheduler's read phase,
  justified by timing; per-frame reads never happen (animation frames only write).
- **Inversion.** Centre-based: `dx = first.cx − last.cx`, `sx = first.w / last.w` with the default
  `transform-origin` (centre). `layout: "position"` (default) inverts translation only, so text is never
  distorted; `"size"`/`"both"` add a non-uniform scale, which needs the additive
  `TransformLayer.scaleX/scaleY` (also needed by G11).

## R8 — Presence in React 19

Keyed children are diffed during render (derived state, the pattern React documents for adjusting state
on prop changes): removed keys stay rendered in place as `exiting`, re-added keys return to `present`.
Each child is rendered through Radix Slot so the presence item gets its DOM element without a wrapper
element (a `<li>` stays a direct child of its `<ul>`). Exiting nodes get `inert` and `aria-hidden` at once
(no interaction with or announcement of removed content). Completion removes the key; a watchdog
`setTimeout` (exit duration + 1000 ms, capped at 10 s) and a hidden page force completion, so a failed,
paused or throttled animation never traps content. Effects are idempotent under StrictMode's double
mount (every attach has a matching destroy; timeouts are cleared).

## R9 — Reusing Entrance for enter/exit

Entrance already supports `playback: "out"` (end → start, then hold) and `onFinish` (Phase 011), so
presence drives the consumer's Entrance definitions/presets as values (no import of `./entrance` from
`./layout`). Gap: a replay that interrupts a run restarts from the start pose, so re-entry during an exit
would flash. Decision D-3: an additive Entrance option `continuous` (default `false`, behaviour unchanged)
starts an interrupting run from the current progress with the remaining fraction of the duration.

## R10 — Masonry

None of the three engines supports `grid-template-rows: masonry`; WebKit 27.2 supports
`display: grid-lanes`, Chromium and Firefox do not. A JavaScript column layout that moves items between
parents would remount keyed React children (state loss). Decision: L10 uses one CSS grid with
`grid-auto-rows` of a small unit and a per-item row span computed from each item's height (sizes from
`ResizeObserver` entries, no reads), written as the exclusive custom-property channel
`--neshel-masonry-span` through each item's motion host; package CSS on the package-rendered container
applies `grid-row-end: span var(--neshel-masonry-span)`. Reflow FLIP (R7) animates the moves. A native
masonry/grid-lanes path can replace the span computation later without changing the API.

## R11 — External engines

Motion (`motion/react` layout/drag), `@use-gesture/react`, `dnd-kit` and GSAP Draggable/Flip were
considered. All would add a second scheduler or transform writer competing with the motion host, which
breaks composition (ADR 0019/0022), and ADR 0020 forbids an engine dependency without a benchmark and an
ADR. The required primitives (velocity, decay, rubber band, snap, FLIP, presence) are small and build on
the existing integrator and host. **No new dependency.**

## R12 — Long press and double activation

After a long press completes, the browser still fires `click` on release. P11 swallows exactly that one
`click` (capture listener on the element, removed on the next tick if no click arrives), so the
consumer's `onClick` and `onLongPress` never both run for one press. Key repeat is ignored; releasing the
key or pointer early cancels and reverses the progress; moving beyond `moveTolerance` (default 10 px),
`pointercancel`, `lostpointercapture`, blur and the page becoming hidden cancel. The progress is a
package-owned layer animated with WAAPI (reduced motion keeps a linear, non-vestibular fill, because the
progress conveys state).
