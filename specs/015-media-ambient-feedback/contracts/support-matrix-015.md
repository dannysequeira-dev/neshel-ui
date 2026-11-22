# Contract — Native support and fallback matrix (Phase 015)

Per-engine observations are recorded in [evidence.md](../evidence.md) (Playwright Chromium, Firefox, WebKit —
WebKit is not Safari; Safari behaviour is unverified until checked on real Safari).

| Capability                                  | Used by       | Fallback (engine without it)                                         |
| ------------------------------------------- | ------------- | -------------------------------------------------------------------- |
| `HTMLImageElement.decode()`                 | M02, M03, M07 | reveal on `load`                                                     |
| `MutationObserver` (attributes)             | load watcher  | n/a (universal)                                                      |
| CSS `clip-path: inset()/circle()`           | M03, M04      | image shown (M03); M04 side-by-side not needed — clip universal      |
| SVG filter on HTML (`filter: url(#)`)       | M05           | CSS `grayscale(1)` via the same channel                              |
| `requestVideoFrameCallback`                 | M06           | `seeked` only                                                        |
| `HTMLMediaElement.fastSeek`                 | M06 (`fast`)  | exact `currentTime` seek                                             |
| `HTMLDialogElement.showModal`               | M07           | thumbnail stays a link/button to the large image (`href` when given) |
| `inert` attribute                           | M08           | `aria-hidden` + `visibility: hidden` after the fade                  |
| Canvas 2D context                           | M09, B04, B05 | M09 fade (reported `mode: "fade"`); B04/B05 nothing drawn            |
| `contextlost`/`contextrestored` (2D canvas) | surface       | redraw on next resize/visibility                                     |
| `ResizeObserver`                            | surface, B10  | one size at creation                                                 |
| `IntersectionObserver`                      | ambient, M01  | treated as visible                                                   |
| `background-clip: text`                     | F10           | plain text                                                           |
| `color-mix()`                               | F10, B09      | fixed band colour / solid glow colour                                |
| `pathLength` attribute                      | F05, F09      | n/a (SVG 1.1+, universal)                                            |
| `@property` registration                    | B09, F09      | unregistered custom properties (no interpolation needed)             |
