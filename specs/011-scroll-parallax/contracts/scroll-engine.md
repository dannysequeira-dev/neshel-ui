# Contract — scroll engine (Phase 011)

**Status: implemented and verified locally** ([evidence](../evidence.md)). Framework-free; lives in the `./scroll` subpath
(`src/scroll/engine/`), never in `./core` (whose budget and React-free surface are unchanged). It uses the
009 frame scheduler, motion values, spring integrator and motion host; it adds no scheduler and no
composition system (ADR 0026).

## 1 · Scroll sources

A source is the root scroller (`source` omitted, `null`, `window`, `document.documentElement` or
`document.scrollingElement`) or a scroll container element. One record per source is shared by every
timeline on it:

- one passive `scroll` listener that only marks the source dirty and schedules one read task;
- in the read phase: `position` (`scrollTop`/`scrollLeft`, or `scrollY`/`scrollX` for the root) — the only
  read caused by scrolling;
- `velocity` in px/s (`Δposition/Δt`, exponential smoothing 0.6) and `direction` (`1` forward, `-1`
  backward, `0` idle); a trailing frame after the last scroll event sets velocity to 0 and direction to 0;
- invalidation reads (§3): `clientHeight/Width` (scrollport) and `scrollHeight/Width` → `max`.

A source with no subscribers removes its listeners. The engine never calls `preventDefault`, never listens
to `wheel`/`touchmove`/`keydown` for scrolling and never writes a scroll position, except SP04's focus
management (contracts/accessibility-011.md §3).

## 2 · Progress model

`createScrollProgress(options)` → `ScrollProgress`.

| Option          | Type                                       | Default                                                          |
| --------------- | ------------------------------------------ | ---------------------------------------------------------------- |
| `source`        | `Element \| Window \| null`                | root                                                             |
| `axis`          | `"block" \| "inline"`                      | `"block"`                                                        |
| `subject`       | `Element`                                  | none (scroll range)                                              |
| `range`         | `[RangeInput, RangeInput]`                 | `["cover 0%", "cover 100%"]` with subject; `[0, "100%"]` without |
| `smooth`        | `boolean \| SpringOptions \| SpringPreset` | `false` (SP10)                                                   |
| `reducedMotion` | `"user" \| "always" \| "never"`            | `"user"`                                                         |

`RangeInput` with a subject is `"<name> <percent>%"` (`name` ∈ `cover`, `contain`, `entry`, `exit`,
`entry-crossing`, `exit-crossing`; percent may be negative or above 100) or a bare name (`"cover"` = 0 % at
the start, 100 % at the end). Without a subject it is a px number or a `"<percent>%"` of `max`.

Geometry (block axis; inline uses left/width): `S` subject start and `H` subject size in the source's
content coordinates (offset chain, transforms ignored — research R3), `V` scrollport size, `M` max scroll.

| Range            | Start               | End                 |
| ---------------- | ------------------- | ------------------- |
| `cover`          | `S − V`             | `S + H`             |
| `contain`        | `min(S, S + H − V)` | `max(S, S + H − V)` |
| `entry`          | `S − V`             | `min(S, S + H − V)` |
| `exit`           | `max(S, S + H − V)` | `S + H`             |
| `entry-crossing` | `S − V`             | `S − V + H`         |
| `exit-crossing`  | `S`                 | `S + H`             |

`offset(name, p) = start + p/100 · (end − start)`; `a = offset(range[0])`, `b = offset(range[1])`;
`progress = clamp((position − a) / (b − a), 0, 1)`; when `b ≤ a` progress is a step at `a`. These formulas
match the native `ViewTimeline` ranges in Chromium, Firefox and WebKit (research R1, probe 2).

`ScrollProgress`:

| Member           | Meaning                                                                      |
| ---------------- | ---------------------------------------------------------------------------- |
| `get()`          | current progress (smoothed when `smooth` and motion is not reduced)          |
| `getRaw()`       | unsmoothed progress                                                          |
| `getVelocity()`  | progress units per second (from the 009 motion value)                        |
| `scrollVelocity` | source velocity, px/s                                                        |
| `direction`      | `1`, `-1` or `0`                                                             |
| `geometry`       | `{ start, end, position, viewport, max, subjectStart, subjectSize }` (px)    |
| `subscribe(fn)`  | listener per change (synchronous, update phase); returns unsubscribe         |
| `refresh()`      | invalidate this timeline's geometry (one measurement in the next read phase) |
| `diagnose()`     | `{ computed, actual, drift }`: cached subject start vs a fresh layout read   |
| `destroy()`      | idempotent; releases listeners, observers and frame tasks                    |

Updates are lazy: a timeline does work on scroll only while it has subscribers. The first subscription
measures once (read phase) and emits the initial value. On the server every method is inert and `get()`
returns 0.

## 3 · Geometry cache and invalidation

Measurements happen only in a read phase, for all dirty timelines at once, and are triggered by:

| Signal                                                                                                                                       | Catches                                                                                                        |
| -------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| shared ResizeObserver: subject, source/document element, every preceding element sibling along the subject's ancestor chain up to the source | own resize, document resize, content above growing/shrinking, compensated changes (above grows, below shrinks) |
| shared MutationObserver (`childList`) on those ancestors                                                                                     | insertion/removal above; re-collects targets                                                                   |
| `resize` on window (passive)                                                                                                                 | viewport changes, mobile URL bar                                                                               |
| `document.fonts` `loadingdone`, window `load`                                                                                                | late fonts and images                                                                                          |
| `refreshScroll()` / `progress.refresh()`                                                                                                     | everything below                                                                                               |

Targets are reference-counted across timelines (one observer of each kind per page). Not detectable
without polling, documented and covered by `refresh()`: margin changes on preceding elements that resize
no observed box; padding/border changes of an ancestor compensated elsewhere; `position`, `top` or
`display` toggles that move the subject without resizing an observed box; scroll containers between the
subject and its source (their scroll offset is ignored); sticky subjects (measure their non-sticky
section instead).

## 4 · Drivers

| Driver   | Writes                                                                                                   | Used for                                                               |
| -------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `js`     | motion host: transform layers, opacity contributions, exclusive channels (incl. `--neshel-*`)            | every effect that touches the consumer's element; smoothing; px ranges |
| `native` | WAAPI animation of a registered custom property with a `ScrollTimeline`/`ViewTimeline` and string ranges | custom-property outputs (ST05, SP03, SP05 scene variable)              |

`driver: "auto"` (default where native is allowed) → native when `ScrollTimeline`, `ViewTimeline`,
`CSS.registerProperty` and `Element.animate` exist, the range is expressible (named ranges with subject, or
the full scroll range), smoothing is off, and the behavioural check passes: in the first read phase after
start, `|getComputedTiming().progress − jsProgress| ≤ 0.02`; otherwise the native animation is cancelled
and the JS driver takes over (`getScrollDebugInfo().nativeFallbacks`). Native custom-property animations
still hold the property's exclusive channel claim, so arbitration and conflicts are unchanged; they are
cancelled on destroy, revoke and reduced motion (`static`/`instant` effects). Properties are registered
on first native use (`<number>`, `inherits: true`, initial `0`); an existing registration (e.g. the
package stylesheet's `@property`) is kept.

## 5 · IntersectionObserver pool and triggers

`observeInView(element, options, callback)` shares one IntersectionObserver per `(root, rootMargin,
threshold)` key. Entries report `{ inView, ratio, position: "before" | "inside" | "after", top }` where
`after` means the element left through the start edge (scrolled past). Without IntersectionObserver the
callback receives one `inView: true` report (content is never left hidden).

`createScrollTrigger(element, options)` (ST03/ST04): states `before → active → after`, callbacks
`onEnter` (before→active), `onLeave` (active→after), `onEnterBack` (after→active), `onLeaveBack`
(active→before), `onChange(state)`; `mode: "once"` disconnects after the first enter.

## 6 · Diagnostics

`getScrollDebugInfo()` → `{ sources, timelines, activeTimelines, measurements, scrollReads,
nativeAnimations, nativeFallbacks, observedTargets }` (counters since page load; tests assert, for example,
that a scroll burst adds `scrollReads` but no `measurements`).
