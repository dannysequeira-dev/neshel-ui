# Contract — accessibility and UX of scroll effects (Phase 011)

**Status: implemented and verified locally** ([evidence](../evidence.md)). Extends 008 accessibility.md and
[010 accessibility-010.md](../../010-animation-effects/contracts/accessibility-010.md).

## 1 · No scroll hijacking

- No `wheel`, `touchmove`, `keydown` or `scroll` listener prevents defaults or is non-passive; the engine
  never writes `scroll-behavior` or a scroll position (one exception, §3).
- Pinning is `position: sticky` (scroll.css); no JavaScript pin spacer, no `position: fixed` swapping.
- Keyboard scrolling, `scrollIntoView`, `:target`/anchor navigation and find-in-page work unchanged: they
  move the scroll position and the engine follows it.
- Mount/unmount never changes layout above the element. Height-changing components (SP04) change only
  their own section's height; their SSR markup already has the final non-pinned layout.

## 2 · Content visibility

- Without JavaScript every effect's server markup is fully visible and usable (SP04 is a native
  horizontal scroller, SP05 a normal section with a sticky stage, reveals are visible).
- Reveals (ST01/ST02) hold a hidden start pose only for client-only mounts before paint or for content
  reported outside the trigger area; never under reduced motion, without IntersectionObserver, after
  `beforeprint`, or for hydrated content already in view. A held element is revealed by any intersection
  (scroll, anchor, keyboard focus moving the page). Destroy restores the element exactly.
- ST06 shows the header while focus is inside it, at the top of the page and on backward scroll; a hidden
  header is moved with `transform` only (its links stay in the tab order and become visible on focus).

## 3 · Keyboard and focus

- SP04: tabbing into an off-screen card resets the clipped stage's `scrollLeft` (browsers scroll clipped
  overflow to reveal focus) and scrolls the document to the vertical position that shows the card — the
  only scroll write in the engine, triggered by focus, never by wheel/keys. Cards keep DOM order.
- Decorative package elements (SP03 bar, SP05 layers rendered by the consumer as decor) are `aria-hidden`
  where the package renders them; meaningful content is never duplicated.
- ST08 exposes the active id; the documented pattern sets `aria-current="location"` on the active link.

## 4 · Reduced motion (live)

Per catalogue: `instant` (ST01–ST03, ST06, SP08 stepped), `static` (ST05, SP01, SP02, SP04 stacked, SP05,
SP06, SP07, SP09), `reduced` (SP03 kept, no smoothing), `off` (SP10, SP11). Every effect subscribes to the
attachment's live reduced state: switching on mid-scroll clears decorative layers in the next write
phase, stops springs, cancels native custom-property animations of static effects and re-lays SP04 out as
stacked; switching off restores them from the current scroll position.

SP04 layout policies under reduced motion (owner review of PR #8): `auto` and explicit `pinned` both
become `stacked` (pinned horizontal travel is scroll-linked motion); `stacked` stays vertical; `scroll`
stays a native horizontal scroller (user-driven, no scroll-linked motion). Leaving reduced motion restores
the pinned layout, its timeline and the stage reset; the stacked layout has no timeline, track transform
or stage listener (regression tests in `test/scroll-review.test.mjs`).

## 5 · Hidden pages and idle

No frame task runs while the page does not scroll and no spring is moving; hidden documents receive no
scroll events. Springs finish at rest; velocity effects settle to identity on the trailing frame.
