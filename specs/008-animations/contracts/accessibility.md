# Contract — accessibility and performance rules for every effect

**Status:** §1–§3 implemented for Tilt3D and the prototypes (008.0); §4–§6 are rules for phases
009–016 and are enforced by each phase's spec and tests.

## §1 Reduced motion

- Every effect accepts `reducedMotion: "user" | "always" | "never"`; default `"user"` follows
  `prefers-reduced-motion` **live** (change events, no reload).
- `"never"` is reserved for motion essential to meaning (WCAG 2.3.3) and is never a default.
- Each catalogue entry declares its reduced behaviour (`off`, `fade`, `instant`, `static`,
  `reduced`); CSS-driven effects also carry an `@media (prefers-reduced-motion: reduce)` rule so they
  are correct without JavaScript.
- Reduced motion never removes information: state changes remain visible (instant or fade).

## §2 Keyboard and focus

- Effects never trap, move or hide focus and never remove focus indicators.
- Pointer-only affordances get an equivalent on `:focus-visible` where meaningful (Tilt3D pose) or
  are decorative.
- Gestures always have keyboard and single-pointer alternatives (WCAG 2.1.1, 2.5.1, 2.5.7).

## §3 Duplicates, splits and surfaces

- Duplicated layers are `aria-hidden="true"` and `inert`.
- Split text keeps one accessible copy; the split pieces are hidden from assistive technology.
- Canvas/WebGL surfaces are decorative (`aria-hidden`) or carry an accessible name; real content
  stays in the DOM.

## §4 Motion limits

- Autoplaying or looping motion longer than 5 s offers pause/stop (WCAG 2.2.2).
- No flashing more than three times per second (WCAG 2.3.1); glitch/strobe presets are capped.
- Parallax and scroll-linked zoom default to moderate amplitudes; large vestibular motion is opt-in.
- Scroll is never hijacked by default (no smooth-scroll replacement of native scrolling).

## §5 Performance

- Animate compositor-friendly properties (`transform`, `opacity`, individual transforms, `filter`
  sparingly); avoid layout properties per frame.
- One shared frame loop; phase-separated reads and writes; no layout read per scroll or pointer
  event (cached geometry, re-measured on resize/scroll invalidation).
- `will-change` only while animating; removed at rest.
- Off-screen or hidden-page ambient effects pause (IntersectionObserver, `visibilitychange`) [011].
- GPU contexts are created lazily, limited in number and released on unmount [016].
- Bundle budgets per effect family enforced by `check:bundles` once published APIs exist [010].

## §6 SSR and hydration

- Server markup never depends on motion state, viewport, pointer or media queries.
- No browser global at import time; effects start in effects/after mount.
- Content that animates in must be visible without JavaScript (entrance hidden-state gating, D4).
