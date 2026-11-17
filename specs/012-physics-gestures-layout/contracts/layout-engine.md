# Contract — FLIP, layout transitions and presence (Phase 012)

**Status: implemented and verified locally** ([evidence](../evidence.md)). ADR
[0027](../../../docs/decisions/0027-gesture-and-layout-engines.md).

## 1 · Layers

```
src/core/layout-box.ts   offset-chain boxes (moved from the 011 scroll geometry; scroll re-imports it)
src/core/flip.ts         FLIP animator: invert a box change into a transform layer and spring it home
src/layout/engine/       layout groups (snapshot/play, RO reflow), presence state machine, height drivers
src/layout/*.ts(x)       effect definitions L01–L10 and React components
```

`src/core/flip.ts` is internal and shared with G10 (reorder drop settle) — no family imports another.

## 2 · Boxes

`measureBox(element) → { x, y, width, height }`: document coordinates from the offset chain plus
`offsetWidth/Height` — layout values that ignore transforms (research R7). Non-HTML elements fall back to
the bounding box plus scroll (documented: their transforms are then included).

## 3 · FLIP animator (`src/core/flip.ts`)

- `from(first, last)`: computes the centre-based inversion (`dx, dy`, and `sx, sy` when `layout` includes
  size) **plus the animator's current offset** (continuity when interrupted), writes it as the effect's
  transform layer and animates it to identity with the 009 spring integrator (spring rig) or a tween
  (`transition: { type: "tween", duration, easing }`), keeping velocity across retargets.
- Reduced motion (`instant`): no layer, the change is applied immediately.
- Movements below 0.5 px and scale changes below 0.5 % are ignored (no task).
- `stop()` clears the layer; `offset` is readable state (no measurement).

## 4 · Layout group (L01, L03, L04)

`createLayoutGroup(options)`: `register(element, { layoutId?, layout?, transition? }) → unregister`,
`snapshot()`, `play()`, `destroy()`.

1. `snapshot()` (framework-free: before the mutation; React: `getSnapshotBeforeUpdate` of
   `<LayoutGroup>`) reads every registered element's box in one batch and stores `first`. Elements with a
   `layoutId` are also stored by id (shared layout).
2. `play()` schedules **one read task**: every element's `last` is measured in the read phase; elements
   whose box changed animate through their FLIP animator (written in the same frame's write phase, before
   paint). A newly registered element whose `layoutId` was in the snapshot animates from that box (L04).
3. No read happens during animation frames. A group with nothing to animate schedules nothing.

## 5 · Reflow groups (L05 grid, L10 masonry)

`gridReflow` / `masonry` attach to a container: one shared `ResizeObserver` watches the container and its
element children; a `MutationObserver` (child list) registers new children and runs a pass after a DOM
reorder. On a notification the group
compares cached boxes with fresh ones **inside the observer callback** (after layout, before paint — the
documented exception of research R7) and flushes the motion hosts synchronously, so the inverted frame is
the one painted. Caches are refreshed only there and after a play. Masonry computes each item's row span
from its observed height (`ceil((h + gap) / unit)`, rows of `unit` px with no row gap) and writes
`--neshel-masonry-span` (exclusive channel) through the item's motion host **in the scheduler's write
phase**, together with the `masonry` token, so the masonry layout and its spans appear in the same frame
(the plain `.neshel-masonry` grid shows until then; that first switch is not animated).

## 6 · Height drivers (L02, L06)

- **L06 `css` driver** (`auto` where `CSS.supports("interpolate-size", "allow-keywords")`: Chromium,
  WebKit): package CSS on the package-rendered `.neshel-collapse` panel declares `interpolate-size` and a
  `block-size` transition; the effect only toggles `data-state` (rule R-1 respected).
- **L06 `js` driver** (Firefox, or forced): reads the current and target height (two reads per toggle) and
  runs a transient WAAPI `height` animation on the panel (no fill: the natural CSS state applies after).
- **L02 `autoHeight`**: DOM-driven content changes are seen by a `MutationObserver` — a microtask after the
  change, **before** the frame's layout — where the new height is read once and the WAAPI animation starts.
  Size changes without a mutation (fonts, images, viewport) are recorded by the shared `ResizeObserver` and
  apply without animation. No layout is ever changed inside a `ResizeObserver` callback (it would be an
  undelivered notification for other observed elements — found and fixed in the browser lab). The wrapper
  must size to its content (not be stretched by a grid/flex parent).
- A change during a running height animation starts from the current computed height (one read). Reduced
  motion: instant. Closed panels: `hidden="until-found"` where `onbeforematch` exists (find-in-page asks the
  consumer to open through `onRequestOpen`), `inert` otherwise; server markup renders the closed panel with a
  plain `hidden` attribute that the effect upgrades after mount. Content is never removed from the DOM.

## 7 · Presence (L08)

State per key: `entering → present → exiting → removed`.

| Event                        | Behaviour                                                                           |
| ---------------------------- | ----------------------------------------------------------------------------------- |
| key added after mount        | enter animation (Entrance definition/preset as a value, or built-in fade)           |
| key added at first render    | no animation unless `initial`; SSR/hydration output is the plain children           |
| key removed                  | kept rendered in place; `inert` + `aria-hidden`; exit animation; then removed       |
| key re-added while exiting   | exit interrupted; enter continues from the current progress (Entrance `continuous`) |
| several keys removed         | independent exits, each removed on its own completion                               |
| exit fails / never completes | watchdog: duration + 1000 ms (max 10 s), then removed                               |
| page hidden                  | running exits complete at once                                                      |
| reduced motion (live)        | exits complete at once; enters show the final state                                 |
| duration 0                   | removed in the same commit cycle                                                    |
| container unmounts           | everything removed; timers and attachments destroyed                                |
| focus inside an exiting item | moved to the nearest present sibling item, else to the presence `focusFallback`     |

Children must accept a ref that reaches their DOM element (host elements do; components forward
`ref`). `onExitComplete(key)` fires once per removal. `usePresence()` gives custom children `[isPresent,
safeToRemove]`; a child that takes over its exit must call `safeToRemove` (the watchdog still applies).
Exits and enters overlap. Inside a `<LayoutGroup>` (L03), the removal that ends an exit is a normal
update of the group, so remaining siblings FLIP into the freed space.

## 8 · Phase 013 preparation

Presence exposes no routing. Page transitions (013) will reuse the presence state machine and the FLIP
animator; View Transitions are not used in 012.
