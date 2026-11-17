# Contract — gesture engine and physics primitives (Phase 012)

**Status: implemented and verified locally** ([evidence](../evidence.md)). ADR
[0027](../../../docs/decisions/0027-gesture-and-layout-engines.md).

## 1 · Layers

```
src/core/pointer-session.ts   one session per element: DOM listeners, capture, pointer map,
                              scroll compensation, touch-action composition, pointer claims (internal)
src/gestures/engine/          recogniser (createGesture), velocity tracker, physics (decay, rubber band,
                              snap), drag motion (shared by G01/G02/G03/G07), controls
src/gestures/*.ts(x)          effect definitions G01–G11 and React components
```

`src/core/pointer-session.ts` is internal (not exported by `./core`): it is shared by `./gestures` and P11
in `./press`, so families never import each other. Everything else lives in `./gestures`.

## 2 · Pointer session (shared tracking)

- **One per element**, created on first subscription and removed with the last; DOM listeners
  (`pointerdown`, `pointermove`, `pointerup`, `pointercancel`, `lostpointercapture`) are registered once per
  element, whatever the number of gestures attached. Window `scroll` (capture, passive) is listened to
  only while a pointer is down.
- **Pointer map** `id → { x, y, startX, startY, type, time }` in client coordinates. Accepted: primary
  mouse button, pen, touch; secondary buttons ignored. Disabled elements (`:disabled`,
  `aria-disabled="true"`) never start.
- **Capture.** On `pointerdown`, a subscriber that wants the pointer calls `capture(id)`; the session calls
  `setPointerCapture` (errors swallowed: synthetic pointers have no capture). `lostpointercapture` without
  a prior `pointerup` is delivered as `cancel`.
- **Scroll compensation.** While a pointer is down, scroll of the window or of a scroller containing the
  element accumulates into `scroll {x, y}`; recognisers add it to pointer deltas, so a dragged element
  stays under the finger when the page scrolls under it (no read of geometry, only scroll positions).
- **Claims (competition).** A recogniser that becomes active claims its pointer ids. Claims are
  page-wide: an exclusive gesture never activates on a pointer already claimed (the innermost element's
  listeners run first while the event bubbles, so a nested draggable wins over its draggable container).
  Compatible gestures on one element (pinch + rotate) share pointers (`exclusive: false`).
- **No reads of layout.** The session never measures. Recognisers measure once at gesture start when they
  need geometry (constraints), never per `pointermove`.

## 3 · Recogniser — `createGesture(element, options)`

Options: `pointers: 1 | 2` (2 = transform gesture, also tracks the 1-pointer phase), `axis`
(`"x" | "y" | "both"`), `threshold` px (default 3; 0 starts on press), `pointerTypes`, `exclusive`,
`touchAction` contribution, callbacks `onStart`, `onMove`, `onEnd`, `onCancel` receiving one reused state:

| Field                  | Meaning                                                                        |
| ---------------------- | ------------------------------------------------------------------------------ |
| `offset {x, y}`        | movement since start incl. scroll compensation (px, client axes)               |
| `delta {x, y}`         | movement since the previous callback                                           |
| `velocity {x, y}`      | px/s (R4)                                                                      |
| `acceleration {x, y}`  | px/s² (diagnostic)                                                             |
| `scale`, `rotation`    | 2-pointer: distance ratio and angle change in degrees since the 2-pointer base |
| `origin {x, y}`        | centroid in client coordinates                                                 |
| `pointers`             | active pointer count                                                           |
| `pointerType`, `event` | last input                                                                     |

States: `idle → pending` (pressed, below threshold) `→ active → idle`. `onEnd` on the last release,
`onCancel` on `pointercancel`/lost capture/`cancel()`/`destroy()`/the page becoming hidden.
**1 ↔ 2 pointers:** adding or lifting a finger re-bases the centroid, distance and angle at the current
values (`scale`/`rotation` accumulate across re-bases), so nothing jumps. Axis lock: with `axis` set, the
dominant axis must exceed the threshold before activation, so a vertical scroll attempt never starts a
horizontal drag.

## 4 · `touch-action` policy

Contributions are composed per element by the session as the **intersection** of what each attached
gesture allows (research R2 table) and written as the `touch-action` exclusive channel of the element's
motion host by the session's own claim (captured and restored exactly; never `will-change`). Removing the
last gesture restores the consumer's value. Never set on `html`/`body`; observe-only gestures (G04, G06)
contribute nothing.

## 5 · Physics primitives

| Primitive                                  | Contract                                                               |
| ------------------------------------------ | ---------------------------------------------------------------------- |
| `createVelocityTracker(windowMs = 100)`    | ring buffer; `add(t, x, y)`, `velocity()`, `reset()`; stale → 0 (R4)   |
| `stepDecay(state, options, dt)`            | exact exponential step; returns `true` at rest (R5)                    |
| `projectDecay(value, velocity, options)`   | rest position `x₀ + power·v₀·τ`                                        |
| `rubberband(overshoot, dimension, c=0.55)` | R6, signed                                                             |
| `nearestSnap(value, points)`               | nearest point (1-D); 2-D snap in drag picks by Euclidean distance      |
| springs                                    | the 009 integrator (`stepSpring`) through the 010 spring rig — no copy |

Decay options: `power` (0–1, default 0.8), `timeConstant` ms (50–2000, default 325), `restSpeed` px/s
(default 5). Every physics motion runs as tasks of the shared scheduler (update phase) and stops at rest.

## 6 · Drag motion (shared by G01, G02, G03, G07)

- Position is the effect's own transform layer `{translateX, translateY}`; a new drag starts from the
  current layer value (also mid-inertia: grabbing stops the motion and keeps its position — interruption
  without jump). Other layers (Tilt3D, hover, press, scroll) compose independently.
- Constraints: `{ left, right, top, bottom }` in px relative to the rest position, or `"parent"`/an
  element: measured once at gesture start from the offset chain (transforms ignored). Beyond a bound the
  value rubber-bands while dragging; on release it springs back with the release velocity.
- Release: inertia (decay, bounded → spring bounce), snap (spring to the snap point nearest the projected
  rest position, keeping velocity), fling with restitution (G07), or spring home.
- Live option changes apply at once; a changed constraint while idle springs the element into the new
  bounds; while dragging it applies from the next move.
- `destroy()` cancels the gesture, stops every task and clears the layer (the host restores the inline
  transform exactly).

## 7 · Controls (non-gesture alternatives)

`createGestureControls()` returns a stable object bound by the attached effect while it lives:
`moveBy(dx, dy)`, `moveTo(x, y)`, `snapTo(index)`, `zoomBy(factor)`, `zoomTo(scale)`, `rotateBy(deg)`,
`reset()`, `dismiss()`, `refresh()` — each effect implements the commands that make sense and ignores the
rest (development warning). React: `useGestureControls()`. Keyboard handling built into the effects is
listed in [accessibility-012.md](accessibility-012.md).
