# Evidence — Phase 015 (Images & Media, Background & Ambient, Loading & Feedback)

Local results on Windows 11, Node 26.13.0, branch `feature/015-media-ambient-feedback`. Browser engines are
Playwright 1.65 builds (Chromium 158, Firefox 159, WebKit 27.2 — **WebKit is not Safari**) plus the CDP check on
Chrome. Performance figures are local headless observations, not guarantees; no GPU acceleration is claimed.
Three-OS CI results are recorded in §13 once the PR runs.

## 1. Inventory status — 30 of 30 implemented (146 of 157 catalogue entries)

| Family         | Entries | Status                                                                                                    |
| -------------- | ------- | --------------------------------------------------------------------------------------------------------- |
| Images & Media | M01–M10 | implemented; M06 verified in Chromium and Firefox, **unverified in WebKit** (no media metadata, §4, K-9)  |
| Ambient        | B01–B10 | implemented; M09/B04/B05 on Canvas 2D and B07 on CSS (ADR 0030 driver change, measured, research R10–R12) |
| Feedback       | F01–F10 | implemented                                                                                               |

No entry is reported as complete through a fallback: M09 paints real cells (`mode: "dissolve"` in all three
engines, §4); its fade path is exercised and reported separately.

## 2. Unit and type tests

| Suite                                   | Result                                                                                                   |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `@neshel-ui/animations` (`node --test`) | **538 / 538** (469 earlier + 69 new)                                                                     |
| New files                               | `loop-destroy-015` 3 · `media` 26 · `ambient` 11 · `feedback` 11 · `composition-015` 18 (20 matrix rows) |
| All packages (`pnpm test:packages`)     | 742 / 742                                                                                                |
| Root (`pnpm test`)                      | 110 tests, 109 pass, 1 skipped (pre-existing skip), 0 fail                                               |
| Type tests                              | `type-tests/media-ambient-feedback.tsx` (valid + `@ts-expect-error`) — `pnpm typecheck` clean            |

Phase 014 pending correction (§6 of the brief): `test/loop-destroy-015.test.mjs` failed 3/3 before the fix
(`drive()` after destroy subscribed — `source.listeners` 1 — and paused/seeked the destroyed loop), 3/3 after;
R1–R3 (`review-014`) stay green (16/16 together). Commit `4374914`.

## 3. Browser checks

| Check                                 | Result                                                                                                                                                |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm check:browser:animations` (CDP) | **173 / 173** (147 earlier + 26 Phase 015)                                                                                                            |
| `pnpm check:animations:engines`       | **182 / 182** in Chromium, Firefox and WebKit (161 earlier + 21 Phase 015 each)                                                                       |
| Phase 015 CDP-only cases              | M04 real arrows (value 52, divider 52 %), M07 real Escape + focus restore, F06 F8 + Escape, Chrome accessibility tree, forced colours, reduced motion |

Before the gallery was mounted the CDP check passed 147/147 (`MediaGallery` commented out); with the gallery's
first version 5 ScrollScene cases failed — the 240 px video and a 320 px image overflowed their grid cells at
the 800 px viewport of the resize case (a horizontal scrollbar shrank the viewport by 15 px). Fixed in the gallery
(fluid media); 173/173 since.

## 4. Native support and fallbacks observed per engine

| Capability / entry                    | Chromium 158                                                                             | Firefox 159         | WebKit 27.2 (Windows, Playwright)                                                |
| ------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------- | -------------------------------------------------------------------------------- |
| `decode()`, `<dialog>` modal, `inert` | yes                                                                                      | yes                 | yes                                                                              |
| `requestVideoFrameCallback`           | yes                                                                                      | yes                 | no (`seeked` path)                                                               |
| `fastSeek`                            | no                                                                                       | yes                 | yes                                                                              |
| M05 duotone                           | SVG filter                                                                               | SVG filter          | SVG filter                                                                       |
| M06 burst (61 requests)               | 2 seeks issued                                                                           | 2 seeks issued      | **skipped**: `readyState` stayed 0 for 8 s (both WebM and MP4 report `probably`) |
| M09 dissolve                          | canvas (`dissolve`)                                                                      | canvas (`dissolve`) | canvas (`dissolve`)                                                              |
| F10 `background-clip: text`           | yes                                                                                      | yes                 | yes                                                                              |
| Forced colours (Chromium emulation)   | ambient layers `display: none`; pending text gradient removed (`background-image: none`) | n/a                 | n/a                                                                              |

## 5. Accessibility and reduced motion (automated)

- Chrome accessibility tree: `progressbar` "Loading results" and "Uploading files" (value 40 → 60 only after a
  real change), native `slider` "Compare before and after", `button` "Pause background motion"; **no canvas node**
  exposed; skeletons and ambient layers absent.
- Reduced motion (live, three engines): ambient CSS parts `animation-name: none` (layer `static`), canvas tasks 0,
  spinner `neshel-fb-slow-pulse` 2 s (slow non-vestibular signal), Ken Burns no camera.
- axe: no violations on the lab page (gallery included).
- Keyboard/touch/focus: unit tests (M04 keys/pointer/touch-action, M07 focus/Escape/scroll lock, M10 keyboard
  option, F06 Escape/hotkey/focus, F07 Enter/Space/implicit submission blocked without losing focus) plus the
  real-input CDP cases above. Manual screen-reader and device checks: [manual-checks.md](manual-checks.md)
  (none run).

## 6. Composition matrix

All 20 rows of [composition-matrix-015.md](contracts/composition-matrix-015.md) pass in
`test/composition-015.test.mjs` (rows 12/15 and 19/20 share a test); rows 19/20 also pass in the lab (page
toggle and off-screen cases, three engines).

## 7. Bundle sizes (packed tarball, Vite/Rolldown minified, gzip) and proposed budgets

| Entry                                  | gzip KiB | proposed budget KiB |
| -------------------------------------- | -------- | ------------------- |
| css: media.css                         | 1.49     | 1.56                |
| css: ambient.css                       | 2.06     | 2.19                |
| css: feedback.css                      | 2.61     | 2.75                |
| media: watchImage (pure, no React)     | 0.73     | 0.81                |
| media: createBlurUp + createLoadReveal | 9.06     | 9.56                |
| media: createVideoScrub                | 3.42     | 3.62                |
| media: createPixelDissolve             | 8.87     | 9.38                |
| media: CompareSlider                   | 6.75     | 7.12                |
| media: Lightbox                        | 7.84     | 8.25                |
| media: entire entry                    | 22.70    | 23.88               |
| ambient: createAurora                  | 4.93     | 5.19                |
| ambient: createParticles               | 6.34     | 6.69                |
| ambient: Aurora + AmbientMotionToggle  | 5.80     | 6.12                |
| ambient: entire entry                  | 12.55    | 13.19               |
| feedback: Spinner + ProgressBar        | 0.70     | 0.75                |
| feedback: createToaster (no React)     | 1.24     | 1.31                |
| feedback: Toaster                      | 3.67     | 3.88                |
| feedback: entire entry                 | 11.46    | 12.06               |

Budgets = measurement + 5 % rounded up to 64 B, **proposed for owner approval**; every earlier budget is unchanged
and still met (the core moves of Presence, the SVG effect base and the checkmark shape did not change any earlier
entry beyond its budget). Tree-shaking markers: no family bundles another; `watchImage`, the reveal engines, the
video scrub, `CompareSlider` and `Lightbox` do not bundle the canvas surface; `Spinner + ProgressBar` bundles
neither the toaster nor the surface; `./core` exports are unchanged.

## 8. Performance (local observations)

### 8.1 015.0 spike (research R10–R11; `pnpm bench:animations:spike-015`)

Canvas 2D at 1000 particles: 0.64 ms/frame JS (Chromium), 2.81 ms (Firefox), 0.31 ms (WebKit); at 5000: 1.44 /
12.6 / 1.31 ms and degraded intervals in Firefox and Chromium at 4× CPU. WebGL2 (GPU simulation) ≈ 0.02–0.27 ms
of CPU at any density, but Chromium headless uses SwiftShader (software) — not representative of real GPUs.
`filter: blur(80px)` on 4 blobs: frame interval mean 29.2 ms (Firefox) and 142.5 ms (WebKit) vs 6.9 / 15.8 ms with
radial gradients. Raw data: [data/ambient-spike-local.json](data/ambient-spike-local.json).

### 8.2 Performance matrix (`pnpm bench:animations:media-ambient`, 120 sampled frames)

Sustained frame interval mean / p95 (ms) against the static baseline of the same page; `init` = create → first
frame. Raw data: [data/bench-media-ambient-local.json](data/bench-media-ambient-local.json),
[data/bench-media-ambient-chromium-4x-local.json](data/bench-media-ambient-chromium-4x-local.json).

| Scenario                              | Chromium          | Chromium 4× CPU                          | Firefox                  | WebKit                                |
| ------------------------------------- | ----------------- | ---------------------------------------- | ------------------------ | ------------------------------------- |
| P1 baseline                           | 16.67 / 16.8      | 16.67 / 16.7                             | 15.64 / 16.3             | 18.11 / 30                            |
| P5 particles 60 / 120 / 400           | 16.67 / 16.7 (×3) | 17.1 / 17.3 / **20.4** (p95 33.4 at 400) | 15.6 / ≤ 16.5 (×3)       | 15.7 / 15.9 / 16.9 (p95 16 / 17 / 30) |
| P6 starfield 360 / 800                | 16.67 / ≤ 16.8    | 17.8 / **20.6** (p95 33.3 / 33.4)        | 15.7 / 15.6 (p95 ≤ 16.5) | 16.7 / 15.6 (p95 25 / 17)             |
| P7 aurora / mesh 400×300              | 16.67 / 16.67     | 16.67 / 16.67                            | 15.6 / 15.7              | 15.7 / 15.6                           |
| P7 aurora / mesh 1600×900             | 16.67 / 16.96     | 17.3 / 16.7                              | 15.7 / 15.6              | **24.4 / 26.1** (p95 31 / 32)         |
| P8 five ambient effects               | 16.67 / 16.7      | 16.67 / 16.8                             | 15.6 / 16.5              | **26.0** / 32                         |
| P10 off-screen particles              | ticking 0         | ticking 0                                | ticking 0                | ticking 0                             |
| P13 dissolve 1600×900 (≈ 4 000 cells) | 16.66 / 16.7      | 17.8 / 33.3                              | 15.5 / 16.1              | **32.0 / 44**                         |
| P13 synchronous start (`show`)        | 6.4 ms            | 11.8 ms                                  | 3 ms                     | 3 ms                                  |
| P9 toaster store, 6 shows             | < 1 ms            | —                                        | < 1 ms                   | < 1 ms                                |

Initialisation: canvas effects 16–21 ms create → first frame (Chromium 4× up to 52 ms; WebKit large CSS layers
30–39 ms); CSS effects ≤ 2 ms to create. Counters during every scenario: one IntersectionObserver and one visibility listener in total; at most one
scheduler task per JS effect; zero tasks off-screen. Chromium headless intervals are vsync-locked (cost hidden
below 16.7 ms); Firefox headless intervals vary between runs (6.9 ms in the spike, 15.6 ms here); the WebKit
headless baseline p95 is already 30 ms.

## 9. Cleanup evidence

Unit counters after every destroy: scheduler size 0, `getMediaDebugInfo().hidden` 0, watchers 0, surfaces 0,
contexts 0, scroll locks 0, ambient effects/ticking/observers/visibility listeners 0, feedback timers 0, toggles 0;
inline styles restored exactly (consumer `filter`, `transform`, `opacity` kept; `cssText` empty where none existed);
native media attributes identical before/after. Destroy during load/playback (composition #18): every engine
cleans up, the loading image is visible, no late writes. Lab: the dissolve canvas is removed after each transition;
the bench's `afterCleanup` shows only the gallery's own live effects (its two canvases), none from the bench.

## 10. Builds, consumers, Storybook

`pnpm check` exit 0 (doctor, lint, typecheck, test, build, test:packages, check:exports, check:pack with the private
animations tarball). `pnpm check:animations:consumer` passes (packed tarball: Phase 015 SSR markup native and
visible — no placeholder layer, ambient layer, canvas or open dialog on the server — and hydration with lightbox,
loading button and toast working). `pnpm check:animations:routers` passes (unchanged). `pnpm build:playground` and
`pnpm build:storybook` succeed (30 new stories in three files).

## 11. Defects found during the phase (all fixed, with tests)

1. `loopEffectControl.drive()` subscribed after destroy (Phase 014 carry-over) — regression test first.
2. Hover pan validated its keyboard name after attaching listeners/tabindex (left them behind on failure).
3. Blur-up rejected data-URI placeholders (`;` in the CSS validator).
4. Context restore drew twice (resize callback + restore callback).
5. Lightbox `finishClose` could re-enter on a synchronous `close` event.
6. Canvas surface treated the ResizeObserver's sub-pixel initial size as a resize, cutting M09 short (fell back to
   a completed state at once in Chrome).
7. `clampSeekable` had an assignment cycle between locals that sent Storybook's react-docgen into infinite
   recursion (build failure); rewritten without the cycle.
8. Lab gallery media overflowed their grid cells at 800 px (horizontal scrollbar broke ScrollScene measurements).

## 12. Known limitations

- **K-2, K-3** (Phase 013) and **K-5** (Phase 014) remain documented and unchanged; no Phase 013/014 behaviour was
  modified beyond the internal moves listed in the entry-points contract.
- **K-6** WebKit headless (Windows): large (1600×900) aurora/mesh layers and five simultaneous ambient effects raise
  the mean frame interval to ≈ 24–26 ms (p95 31–32, baseline mean 18, p95 30). Not reproduced in Chromium/Firefox headless; real
  Safari unverified.
- **K-7** A full-screen dissolve (≈ 4 000 cells) costs ≈ 32 ms mean in WebKit headless and drops frames in Chromium
  at 4× CPU; smaller frames (gallery size) were smooth. `maxCells` / `cell` let consumers trade grain for cost.
- **K-8** At the hard caps (400 particles, 800 stars) Chromium at 4× CPU drops frames (p95 33 ms); defaults (120 /
  360) and the automatic `lowPower` mode (≤ 4 cores or `prefers-reduced-data`: half density, 30 fps) mitigate it —
  the heuristic is best effort.
- **K-9** M06 could not be verified in Playwright WebKit on Windows (no media metadata); iOS/macOS Safari behaviour
  (inline playback, preload) unverified (manual check 7).
- Real-GPU timings, Safari, NVDA/VoiceOver and physical touch devices: pending ([manual-checks.md](manual-checks.md)).
- The page-level ambient switch is per page (module state); it is not persisted (consumers may persist it).

## 13. Three-OS CI

Pending: recorded after the PR's CI run on the head commit.
