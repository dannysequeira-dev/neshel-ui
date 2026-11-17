# Visual review — Phase 010 gallery (owner request on PR #7)

Captured from the built Playground lab (`pnpm build:playground`, `animations.html`, section E) in
Playwright Chromium, 1280 × 860, light scheme, `prefers-reduced-motion: no-preference`, with real mouse
input. Every effect comes from the package as shipped (`styles.css` included). These images support a
human review; correctness is decided by the automated checks (evidence.md).

| Family      | At rest                  | During the animation                                                                                                            | At the end                                                                                        |
| ----------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Entrance    | `entrance-1-rest.png`    | `entrance-2-during.png` (90 ms into a replay: fade, slide, scale, blur, clip, circle, mask wipe, rotate, flip, spring, stagger) | `entrance-3-end.png`                                                                              |
| Hover       | `hover-1-rest.png`       | `hover-2-lift-during.png`, `hover-6-shine-during.png`                                                                           | `hover-3-lift-end.png` (lift + decor shadow), `hover-4-spotlight.png`, `hover-5-border-sweep.png` |
| Press       | `press-1-rest.png`       | `press-2-during.png` (ripple held, toggle, checkbox, counter, swap), `press-4-burst-during.png`                                 | `press-3-end.png`                                                                                 |
| Composition | `composition-1-rest.png` | `composition-2-during.png` (lift + glow ring + Tilt3D + press scale + ripple on one element)                                    | `composition-3-end.png`                                                                           |

`phase-010-gallery.webm` records the whole sequence (≈ 1.7 MB). It may be removed before the merge if
the owner prefers not to keep binary review artefacts in the repository.
