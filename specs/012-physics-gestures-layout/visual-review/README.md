# Visual review — Phase 012 gallery and stories

Captured on 2026-11-17 from the built Playground lab (`pnpm build:playground`, `animations.html`, section
“Physics, gestures & layout”) and the built Storybook (`pnpm build:storybook`, story iframes) in Playwright
Chromium 158, 1280 × 900, light scheme, `prefers-reduced-motion: no-preference` unless noted. Input is real
(Playwright mouse and keyboard) or the gallery's own buttons. These images support a human review;
correctness is decided by the automated checks ([evidence.md](../evidence.md)). The dark horizontal line in
some captures is the Phase 011 scroll progress bar (fixed at the top of the page).

| Area               | Captures                                                                                                                                                                                                                     |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Physics & gestures | `gestures-1-gallery.png` (G01–G11 with their buttons), `gestures-2-drag-mid.png` (G01 mid-drag, real mouse)                                                                                                                  |
| G08 / G10          | `gestures-3-pinch-zoomed.png` (zoomed with the buttons, level announced), `gestures-4-reorder-keyboard.png` (G10 item grabbed with Space and moved with ↓: dashed outline, focus on the handle)                              |
| Hover & press      | `hover-press-1-h11-p11.png` (H11 area with a clickable button, P11 hold button)                                                                                                                                              |
| Layout             | `layout-1-gallery.png` (L01–L10), `layout-2-flip-mid.png` (L01 after a shuffle), `layout-3-accordion-opening.png` (L06 mid-open), `layout-4-presence-exiting.png` (L08 exiting), `layout-5-masonry.png` (L10 packed columns) |
| Reduced motion     | `reduced-1-flip-instant.png` (L01 shuffle with `prefers-reduced-motion: reduce`: final order, no offset)                                                                                                                     |
| Storybook          | `storybook-1-gestures-drag.png`, `storybook-2-gestures-reorder.png`, `storybook-3-layout-flip.png`, `storybook-4-layout-heights.png`                                                                                         |

No video is kept (binary size); the browser checks cover the motion itself.
