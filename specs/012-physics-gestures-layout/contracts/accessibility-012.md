# Contract — accessibility of Phase 012 effects

**Status: implemented and verified locally** ([evidence](../evidence.md)). Extends
[008 accessibility](../../008-animations/contracts/accessibility.md) and
[accessibility-010](../../010-animation-effects/contracts/accessibility-010.md).

## 1 · WCAG 2.2 mapping

| Criterion                         | How Phase 012 meets it                                                                                   |
| --------------------------------- | -------------------------------------------------------------------------------------------------------- |
| 2.1.1 Keyboard                    | every functional gesture has a keyboard path (§2); decorative effects (G06, G11, H11) have no function   |
| 2.5.1 Pointer Gestures            | pinch (G08) and rotate (G09) — multipoint — have single-pointer controls (buttons) and keys              |
| 2.5.7 Dragging Movements          | drag, snap, fling, swipe, reorder, pull have single-pointer, non-drag alternatives (buttons/commands)    |
| 2.5.8 Target Size (Minimum)       | package-rendered controls (dismiss, refresh, zoom, reorder handle) are at least 24 × 24 CSS px           |
| 2.3.3 Animation from Interactions | `prefers-reduced-motion` followed live; `always`/`never` policies; reduced behaviour per effect          |
| 1.3.1 / 4.1.2                     | package controls are `<button type="button">` with accessible names; state via ARIA, not motion only     |
| 2.4.7 / 2.4.11 Focus visible      | package controls keep the UA/consumer focus ring; reorder keeps focus on the moved item's handle         |
| 4.1.3 Status messages             | reorder and refresh results announced by one polite live region per component, once per committed change |

## 2 · Keyboard and alternatives

| Effect               | Keys (element focused)                                                                           | Pointer alternative                                                          |
| -------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| G01 drag / G07 fling | arrows move by `keyboardStep` (Shift ×5), Home returns to rest                                   | `controls.moveBy/moveTo/reset`                                               |
| G02 snap             | arrows go to the next snap point in that direction                                               | `controls.snapTo(index)`                                                     |
| G03 swipe            | Delete / Backspace dismiss (`keyboard: true`, default)                                           | built-in “Dismiss” button                                                    |
| G04 pull to refresh  | —                                                                                                | built-in “Refresh” button                                                    |
| G08 pinch zoom       | `+`/`=` zoom in, `-` zoom out, `0` reset, arrows pan while zoomed                                | zoom in / out / reset buttons                                                |
| G09 rotate           | `[` / `]` rotate by `keyStep` (15°), `0` reset                                                   | `controls.rotateBy`                                                          |
| G10 reorder          | on the handle: Space/Enter grab, ↑/↓ (← → for `axis: "x"`) move, Space/Enter drop, Escape cancel | `useReorderItem().moveUp/moveDown`                                           |
| P11 long press       | hold Space/Enter for the duration (or single press with `keyboard: "press"`)                     | consumer provides a confirm path when the action is destructive (documented) |

Keyboard handling is only installed when the element is focusable (native control or `tabIndex`); the
React components render focusable elements where the keyboard path needs one.

## 3 · Announcements and focus

- G10: while grabbed, `aria-pressed="true"` on the handle (`aria-roledescription="sortable item handle"`),
  instructions via `aria-describedby`; one polite announcement per committed move (“Moved Apple to position
  2 of 5”), per drop and per cancel — never per frame. Focus stays on the handle (items are keyed; React
  moves the node, it is not remounted).
- G04: `aria-busy` on the container while refreshing; “Refreshing…”/“Refreshed” announced once each.
- L08: exiting items get `inert` and `aria-hidden="true"` immediately; focus inside an exiting item moves
  to the nearest present sibling item or `focusFallback`.
- L06: the panel keeps its content in the DOM; consumers wire `aria-expanded`/`aria-controls` (the story
  and the lab show the pattern); `hidden="until-found"` lets find-in-page open it.

## 4 · Reduced motion

| Behaviour | Effects                                  | Meaning in 012                                                      |
| --------- | ---------------------------------------- | ------------------------------------------------------------------- |
| instant   | G01–G03, G05, G07–G10, L01, L02, L04–L10 | the interaction still works; releases/changes jump to the end state |
| reduced   | G04, P11                                 | the indicator/progress conveys state: linear fill, no spring/bounce |
| fade      | L03                                      | items fade, no movement                                             |
| off       | G06, G11, H11                            | decorative motion removed                                           |

Direct manipulation (the element following the finger during a drag/pinch/rotate) is user-controlled
motion and is kept; only automatic motion (inertia, springs, FLIP, flights) is removed. Live switches
finish running motion at its end state immediately.
