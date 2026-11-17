# Contract — accessibility, SSR and behaviour of the Phase 010 effects

**Status: implemented; verified by unit tests, axe in the lab (three engines) and the packed consumer**
([evidence](../evidence.md)). Extends 008 [accessibility.md](../../008-animations/contracts/accessibility.md).

## §1 Entrance

- Server markup is the element and its class only: no inline style, no hidden state. Content is visible
  without JavaScript.
- The start pose is written by the engine after attachment (layout effect → first write phase, before the
  paint of a client-rendered element). `<Reveal appear="client">` (default) does not replay when hydrating
  server markup; `"always"` opts in; `"never"` plays only on `replayKey`.
- Every run ends in the final state with all contributions cleared: completion, `finish`, reduced motion
  switched on, page hidden (at start or during the run), or destroy. A suspended entrance writes nothing.
- Delays are bounded (`delay ≤ 5000 ms`; stagger total ≤ `maxStagger`, default 900 ms).
- Reduced motion: `fade` (opacity only, no transform/filter/clip/mask) or `instant` (no animation).

## §2 Hover

- Activation by mouse/pen (touch opt-in) inside the element's box, or by keyboard `:focus-visible`
  inside (lift, glow, spotlight, border sweep, underline, media zoom, shine). Magnetic and parallax are
  decorative and pointer-only.
- Effects never move, trap or hide focus and never remove focus indicators (glow is additive).
- Decor and ring layers are pseudo-elements with `pointer-events: none`: they never intercept input.
- Listeners are passive observers (no `preventDefault`, no propagation changes).

## §3 Press and microinteractions

- Native elements and semantics are preserved: effects attach to the consumer's element (`asChild`).
- Press activates on primary pointer down or Space/Enter on the focused element; disabled elements never
  react. Tap bounce reacts to `click` (pointer and keyboard activation).
- Ripple and burst layers are `aria-hidden`, `inert`, `pointer-events: none`, created inside the host and
  removed when idle; void elements (`<input>`, `<img>`…) are rejected with a development warning.
- `ToggleMorph` and `CheckboxDraw` are aria-hidden visuals placed inside the native, labelled control
  (`<button role="switch" aria-checked>`, `<label><input type="checkbox">…</label>`); the control keeps
  state, focus and announcements. Static state comes from `data-state` in server markup.
- `shake` is never the only error signal: development warning when the element has no `aria-invalid`,
  `aria-errormessage` or `role="alert"`.
- `NumberTick`: the counting copy is aria-hidden and written outside React (write phase); assistive
  technologies read a visually hidden copy with the final value; `live="polite"` announces once per value
  change, never per frame. Locale defaults to `en-US` so server and client format identically.
- `ContentSwap`: the inactive content is `hidden` (absent from the accessibility tree, correct without
  CSS or JavaScript); `live="polite"` announces the new content once per change.
- `nudge` plays at most 4 times per trigger (≤ 3 repeats, ≥ 1 s apart) and stops when the page is hidden
  or reduced motion turns on (WCAG 2.2.2).

## §4 Common rules

- Reduced motion is resolved per attachment (`reducedMotion` option + live media query) and applied live.
- No work on hidden pages: rAF-driven motion stops with the page; entrances finish; nudge repeats stop;
  burst does not start; CSS rotation of the ring is paused unless active.
- Cleanup: every listener, frame task, timer, token, owned layer and channel contribution is released on
  destroy/unmount; the ledger restores the original inline styles exactly.
- No React render per frame (motion values, scheduler writes); no layout read per pointer move (box
  measured on enter, invalidated on scroll/resize); press measures once per press.
