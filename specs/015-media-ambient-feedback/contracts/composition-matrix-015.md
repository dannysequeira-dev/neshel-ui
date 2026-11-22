# Contract — Composition matrix (Phase 015)

Each row is a test in `packages/animations/test/composition-015.test.mjs` (jsdom, manual frames) unless marked
**lab** (browser suite, three engines). "Cleanup" means: no scheduler task, no listener/observer, no package
node, inline styles restored.

| #   | Composition                         | Expectation                                                                                             |
| --- | ----------------------------------- | ------------------------------------------------------------------------------------------------------- |
| 1   | Ken Burns + Timeline                | `track()` in a C01 timeline drives the camera; seeking the timeline renders the exact bounded pose      |
| 2   | Media reveal + ScrollScene          | M03 reveals on load while a 011 scroll progress drives another channel of the same image; no conflict   |
| 3   | Image loading + error/retry         | error reveals; a new `src` (retry) re-arms only if still loading; final state visible                   |
| 4   | Comparison slider + keyboard/touch  | keys and pointer change the same value; `touch-action` set; value text consistent                       |
| 5   | Video scrub + fast progress         | 100 progress changes in one frame → ≤ 2 seeks issued; last target wins; reverse direction works         |
| 6   | Lightbox + FLIP + Presence          | open FLIPs from the thumbnail box; close reverses then closes; re-open during close continues (no jump) |
| 7   | Gallery + Page Transitions          | crossfade inside a `startPageTransition` callback: no channel conflict, final slide correct             |
| 8   | Pixel dissolve + fallback           | without 2D context → `mode: "fade"`, final image shown; with context → canvas released at the end       |
| 9   | Ambient + reduced motion live       | switching reduced mid-run stops tasks/CSS play state at once and back                                   |
| 10  | Particles + context loss            | `contextlost` → no draws; `contextrestored` → one full redraw; destroy releases the canvas              |
| 11  | Pointer glow + Hover                | B09 on a container and a 010 `lift` on a child: independent channels, both clean up                     |
| 12  | Loading effects + Timeline          | `ProgressRing` driven by a timeline value track: visual follows, `aria-valuenow` integer steps only     |
| 13  | Toast + Presence                    | dismiss during enter, re-show during exit, max overflow: states consistent, one announcement per toast  |
| 14  | Button loading + Press              | 010 `pressScale` and F07 on the same button: activation blocked while loading, press visuals allowed    |
| 15  | Progress ring + external progress   | a 0–1 source drives the ring; reduced motion shows the value without transition                         |
| 16  | Multiple ambient + shared scheduler | 5 ambient effects → one IntersectionObserver, one visibility listener, ≤ 1 task per JS effect           |
| 17  | Mixed Text/SVG/Media                | 014 `TextReveal` + `PathDraw` + M01 under one timeline; independent cleanup                             |
| 18  | Destroy during playback or load     | destroying every 015 engine mid-run/mid-load: cleanup, image visible, no late callback writes           |
| 19  | Ambient page switch                 | `ambientMotion.pause()` stops every effect; `resume()` restarts only those still wanted (**lab** too)   |
| 20  | Hidden page / off-screen            | hidden page and off-screen → zero tasks; visible again → resumes (**lab**)                              |
