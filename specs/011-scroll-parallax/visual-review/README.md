# Visual review — Phase 011 scroll gallery

Captured from the built Playground lab (`pnpm build:playground`, `animations.html`, sections C and F) in
Playwright Chromium, 1280 × 860, light scheme, `prefers-reduced-motion: no-preference` unless noted. The
page is scrolled natively (programmatic `scrollTo`, no hijacking); every effect comes from the package as
shipped (`styles.css` included). These images support a human review; correctness is decided by the
automated checks ([evidence.md](../evidence.md)).

| Area                    | Captures                                                                                                                                                       |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SP05/SP01 scene C       | `scene-1-start.png`, `scene-2-middle.png`, `scene-3-end.png` (sticky stage, depth layers, caption segment, scene progress bar)                                 |
| SP05/SP10 second scene  | `scene-4-second-smooth.png` (simultaneous scene, spring-smoothed)                                                                                              |
| Scroll Triggers         | `triggers-1-revealed.png` (ST01/ST03/ST04/ST05/ST09/ST10 tiles), `triggers-2-stagger.png` (ST02), `triggers-3-stuck.png` (ST07 toolbar pinned with its shadow) |
| Parallax                | `parallax-1-depth.png` (SP01 depths), `parallax-2-image.png` (SP06), `parallax-3-colour.png` (SP08), `parallax-4-stack.png` (SP09)                             |
| SP04 horizontal section | `horizontal-1-start.png`, `horizontal-2-middle.png` (pinned track at 10 % and 60 %)                                                                            |
| Composition             | `composition-1-hover.png` (Entrance + Hover lift + Press + SP01 parallax on one button, hovered)                                                               |
| Reduced motion          | `reduced-1-horizontal-stacked.png` (SP04 laid out vertically after a live preference switch)                                                                   |

`phase-011-gallery.webm` records the whole sequence (≈ 3.9 MB). It may be removed before the merge if the
owner prefers not to keep binary review artefacts in the repository. The ST06 header is hidden in most
captures because they were taken while scrolling forward (expected behaviour).
