# Contract — Accessibility and reduced motion (Phase 015)

Applies [specs/008 accessibility.md](../../008-animations/contracts/accessibility.md) §1–§6 and WCAG 2.2. Rows
are verified by unit tests (jsdom), the lab suite (three engines, axe) or are listed as manual in
[manual-checks.md](../manual-checks.md).

| Rule                                                                           | Entries                 | Verification                                      |
| ------------------------------------------------------------------------------ | ----------------------- | ------------------------------------------------- |
| Media keep `alt`/`srcset`/`sizes`/`loading`/`decoding`/dimensions untouched    | M01–M10                 | unit (attribute snapshots), lab                   |
| Images visible without JS and never left hidden (error, timeout, destroy)      | M02, M03, M07, M09      | unit, SSR markup test, lab                        |
| Decorative layers/canvases `aria-hidden`, `pointer-events: none`, unfocusable  | M02, M09, B01–B10, F02  | unit, lab (AX tree in Chrome, hit testing)        |
| Comparison slider: native range, name, value text, keyboard, tap to position   | M04                     | unit (keys, pointer), lab (real input, axe)       |
| Lightbox: dialog modal, first focus, Escape, close, focus restore, scroll lock | M07                     | unit (jsdom dialog shim), lab (real dialog)       |
| Hover pan keyboard alternative when informative                                | M10                     | unit, lab                                         |
| No audio; video never played                                                   | M06                     | unit (`play` spy), lab                            |
| Inactive gallery slides `inert` + `aria-hidden`; autoplay explicit + pausable  | M08                     | unit, lab                                         |
| Ambient paused off-screen / hidden / reduced / page toggle; finite default     | B01–B10                 | unit (counters), lab (three engines)              |
| User pause mechanism (`AmbientMotionToggle`, `aria-pressed`)                   | B01–B10 with `Infinity` | unit, lab, axe                                    |
| No flashing (> 3/s): grain jitter ≤ 8 Hz at ≤ 0.3 opacity; twinkle ≤ 1 Hz      | B03, B05                | unit (option bounds), review                      |
| Indicators: progressbar role, name, no invented value, no live region          | F01, F03, F04, F09      | unit, lab AX tree                                 |
| Skeleton hidden from AT; container `aria-busy`                                 | F02                     | unit, lab                                         |
| Success mark decorative unless labelled; never announces                       | F05                     | unit                                              |
| Toasts: regions exist before content, one insertion, keyboard close, pause     | F06                     | unit (timers, keys, focus), lab, axe              |
| Loading button: same element, name, focus kept; no double activation           | F07                     | unit (click/Enter/submit), lab (real keyboard)    |
| Optimistic failure distinct and reversible                                     | F08                     | unit                                              |
| Pending text: one text, forced colours plain, legible band                     | F10                     | unit, lab (forced-colors emulation in Chromium)   |
| Reduced indicators keep a slow non-vestibular signal                           | F01, F03, F04, F09      | lab (computed animation name/duration per engine) |
| Native scroll never blocked (M04 `touch-action`, M06 passive source)           | M04, M06                | unit, lab                                         |
| Forced colours: indicators use system colours; decorations removed             | F01–F10, B01–B10        | lab (Chromium `forced-colors` emulation); manual  |

Manual (pending until run): NVDA + Firefox/Chrome, VoiceOver + Safari (macOS/iOS), real Safari rendering,
physical touch devices (M04 drag, M10 off on touch), Windows High Contrast.
