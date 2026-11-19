# Visual review — Phase 013

Captured with Playwright Chromium 158 from the built Playground (`pnpm build:playground`) and Storybook
static build on 2026-11-18 (headless, 1280×900 unless noted). Mid-transition frames are timed captures:
they show a real intermediate state, not a pixel-exact reference.

| File                                | Shows                                                                                                    |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------- |
| cinematic-1-gallery.png             | the Phase 013 gallery: C04 open, C05 curtain open, C07 lit item, C08 focus 1, C03 focused card, C10 bars |
| cinematic-2-shutter-mid.png         | C05 shutter slats mid-opening                                                                            |
| cinematic-3-title-sequence-mid.png  | C06 lines entering in sequence over the background                                                       |
| cinematic-4-storyboard-controls.png | C09 rotation, previous, next and stop controls                                                           |
| cinematic-5-scene-chapter-2.png     | C02 chapter 2 segment mid-scrub inside the pinned scroll scene                                           |
| pt-1-slide-and-morph-mid.png        | PT03 slide with the PT02 thumbnail → hero morph mid-transition (native View Transition)                  |
| pt-2-detail-after.png               | the detail page after the transition, PT08 persistent player in place                                    |
| pt-3-route-progress-pending.png     | PT07 indeterminate bar while a navigation is pending                                                     |
| pt-4-mpa-crossdocument-mid.png      | PT09 cross-document navigation between the two MPA pages (900×600)                                       |
| reduced-1-depth-no-blur.png         | C08 under reduced motion: focus changed, no blur                                                         |
| storybook-1/2/3-*.png               | Storybook stories: cinematic reveals, camera, SPA page transitions                                       |
