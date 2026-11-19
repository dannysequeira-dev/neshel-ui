# Contract — Native support and fallback matrix (Phase 014)

**Planned; observed values are filled from the lab (evidence.md).** WebKit = Playwright's WebKit build, not
Safari; Safari behaviour is unverified until checked on real Safari.

| Capability / entry                          | Used by             | Fallback (any engine without it)                                  |
| ------------------------------------------- | ------------------- | ----------------------------------------------------------------- |
| `Intl.Segmenter` grapheme / word            | splitter            | regex clusters; whitespace words; spaceless scripts per grapheme  |
| CSS `clamp()` / `calc()` with custom props  | T01–T03, T05, T09, T11 | text visible, no piece animation                               |
| CSS `sin()`                                 | T07                 | no wave (static text)                                             |
| `background-clip: text`                     | T04                 | plain text in the consumer's colour                               |
| `box-decoration-break` (slice default)      | T08                 | band drawn per bounding box                                       |
| `mask-image` (unprefixed)                   | T09 wipe, S08       | nothing hidden; text/logo visible                                 |
| `overflow: clip`                            | T09 rise            | `overflow: hidden`                                                |
| `font-variation-settings`                   | T10                 | static                                                            |
| `getTotalLength()` (in document)            | S01, S06, S09, S10  | JS geometry of `d`                                                |
| `offset-path: path()`                       | S03                 | JS geometry + host transform layer                                |
| `color-mix()` in `stop-color`               | S05                 | colour switches at the midpoint                                   |
| `feTurbulence` + `feDisplacementMap`        | S07                 | n/a (SVG 1.1 filters; universally supported)                      |
| `IntersectionObserver`                      | loops, triggers     | treated as visible                                                |
