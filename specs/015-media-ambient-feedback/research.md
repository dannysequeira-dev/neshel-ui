# Research — Phase 015

Each finding states what was **observed** (with where) and what is **inferred** (platform documentation or
engineering judgement, not re-verified here). Engine observations come from Playwright 1.65 builds (Chromium,
Firefox, WebKit — WebKit is not Safari) and the lab; they are local observations on one Windows 11 machine,
headless, and are recorded in [evidence.md](evidence.md). Raw spike data:
[data/ambient-spike-local.json](data/ambient-spike-local.json) (`node scripts/bench-animations-ambient.mjs`).

## R1 — Image load state without missing a past `load`

- Inferred (HTML spec): `img.complete` is `true` when the image is fully available **or broken** (or has no
  `src`); a broken image has `naturalWidth === 0`. `load`/`error` fire once per request; an image that finished
  before script attached never fires again. `img.decode()` resolves when the current image can be painted
  without a decode stall and rejects for broken images or when `src` changes meanwhile (`EncodingError`).
- Inferred: changing `src`/`srcset`/`sizes` starts a new request; a responsive `srcset` candidate swap caused by
  a viewport/DPR change keeps showing the old image until the new one is available (no blank frame).
- **Decision (media load watcher, internal):** state = `loaded` when `complete && naturalWidth > 0`, `error`
  when `complete && naturalWidth === 0` with a non-empty `currentSrc`/`src`, otherwise `loading` with
  `load`/`error` listeners. On `load` the watcher awaits `decode()` (rejection → re-check `naturalWidth`, never
  throw) before reporting `loaded`. A `MutationObserver` on `src`/`srcset`/`sizes` re-evaluates the state; a
  stale decode (generation counter) is ignored. Reveal effects (M02/M03) **only hide an image that is still
  loading at attach time** and always reveal on `error`, on destroy and after a bounded timeout
  (`revealTimeout`, default 8 s): an image can never stay invisible. Native attributes are never written.

## R2 — Ken Burns bounds (M01) and hover pan (M10)

- With `scale: s` (≥ 1, about the centre) and `translate: t` in percent of the element's own box, the scaled
  image still covers the frame while `|t| ≤ (s − 1) × 50 %` per axis. **Decision:** positions are given as unit
  fractions `x, y ∈ [−1, 1]` of that allowance, so no option value can show an edge or distort (uniform scale
  only). Writes go through the exclusive `translate` and `scale` host channels (percentages: no layout read,
  correct after resizes); the frame clips (`overflow: clip` with `hidden` fallback) and is the package wrapper
  (`KenBurns`/`HoverPan`) or the consumer's element (engine API, documented requirement).

## R3 — Comparison slider semantics (M04)

| Option                                             | Keyboard / AT                                                   | Pointer                                    |
| -------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------ |
| Custom `role="slider"` div                         | must re-implement arrows/Page/Home/End, `aria-value*`           | custom                                     |
| **Native `<input type="range">` (visually clear)** | native keys, value/min/max, `aria-valuetext`, orientation, form | custom on the frame (tap/drag to position) |

**Decision:** a native range input is the slider (accessible name required; `aria-valuetext` such as
"40% before, 60% after"; `aria-orientation` for vertical, whose arrow semantics are native); pointer input on
the frame positions the divider on press and follows a captured drag (one rect read per press, cached). The
frame uses `touch-action: pan-y` (horizontal) / `pan-x` (vertical) so native page scroll is never blocked.
Comparison without dragging: a single tap/click positions; keyboard; optional "before"/"after" jump buttons
(`jumps`). The after image is clipped by `clip-path: inset()` from one host-written custom property on the
package root.

## R4 — Duotone (M05)

- Inferred: CSS `filter: url(#id)` referencing an SVG filter applies to HTML elements in Chromium, Firefox and
  Safari; `feColorMatrix` (luminance) + `feComponentTransfer` (`table` per channel) maps luminance to two
  colours; `feComposite operator="arithmetic"` mixes the duotone result with `SourceGraphic` (`k2 = p`,
  `k3 = 1 − p`), so the transition is one attribute pair per frame in the scheduler's write phase.
- **Decision:** a package filter host (`aria-hidden` 0×0 svg, as S07) per effect; the element's `filter` is an
  exclusive host channel (captured/restored); attributes `k2/k3` are package-owned. Fallback without SVG
  filters on HTML (behavioural check): CSS `grayscale(1)` tint via the same channel; forced colours: no filter.
  Reduced: instant.

## R5 — Video scroll scrub (M06)

- Inferred (HTML spec, MDN): setting `currentTime` starts a seek (`seeking`), completes with `seeked`; a new
  `currentTime` during a seek aborts it and starts another — issuing one per scroll event queues work in the
  decoder and lags. `readyState ≥ HAVE_METADATA` gives `duration` (may be `NaN`/`Infinity` for streams);
  `seekable` lists seekable ranges (byte-range servers usually expose `[0, duration]`). `fastSeek()` (Firefox,
  Safari) seeks to a nearby keyframe. `requestVideoFrameCallback` (Chromium 83+, Safari 15.4+, Firefox 132+)
  reports the presented frame's `mediaTime`. Seeks never produce audio; nothing plays unless `play()` is called.
  Codecs: seeking to a non-keyframe decodes from the previous keyframe — smooth scrubbing needs short GOPs
  (e.g. keyframe every 5–10 frames, or all-intra for short clips). CORS is not needed for playback/seeking (only
  to read pixels). iOS Safari: `playsinline` and `muted` are needed to render inline; `preload` may be ignored,
  so frames appear only once data is fetched (Low Power Mode may delay further) — inferred, unverified here.
- **Decision (seek coalescer, internal):** at most **one seek in flight**; while seeking only the latest
  target is kept; on `seeked` (and, when available, the next presented frame via `requestVideoFrameCallback`)
  the newest pending target is issued if it differs by more than half a frame (`tolerance`, default 1/60 s).
  Targets are clamped into the nearest `seekable` range; nothing is issued before metadata (target kept and
  applied on `loadedmetadata`). `precision: "fast"` uses `fastSeek` when present. The engine never calls
  `play()`, sets `muted` only if asked (`muted: true` default for scrub videos is documented, not forced), and
  restores `currentTime` on destroy only when `restore: true`. Reduced motion (catalogue `static`): the source is
  not followed and the video shows its `restTime` frame (default: current).

## R6 — Lightbox (M07)

| Option                      | Focus/inert/Escape                                                                                     | Layering              |
| --------------------------- | ------------------------------------------------------------------------------------------------------ | --------------------- |
| Portal div + focus trap     | must implement trap, inert, Escape, restore                                                            | z-index fights        |
| **Native `<dialog>` modal** | `showModal()`: top layer, background inert, focus moves inside, Escape → `cancel`; focus restore by UA | top layer, no z-index |

- Inferred: all three engines ship `showModal()` (Safari 15.4+); focus restoration on close is specified and
  implemented in Chromium/Firefox/Safari recent versions — the engine still restores focus explicitly to the
  opener (never to `body`). `showModal()` does not lock page scroll.
- **Decision:** `Lightbox` renders a native `<dialog>` (no overlay manager; the Components `Dialog` contract is
  unchanged), with a labelled close button focused first, Escape/backdrop click/close button closing, and a
  reference-counted scroll lock (`overflow: hidden` on `<html>` through its Motion Host, `scrollbar-gutter`
  preserved) released on close/unmount. The zoom is a FLIP of the large image from the thumbnail box (core FLIP
  animator, host transform layer) and back on close when the thumbnail is still on screen (else fade). The large
  image shows the thumbnail's `currentSrc` until its own load (R1). Reduced: fade.

## R7 — Gallery cross-fade (M08)

- **Decision:** slides stacked in one grid cell; the engine animates per-slide host opacity with the 009 tween
  controller **from the current value** (interruptions continue, rapid `show()` calls retarget, no queue).
  Inactive slides get `inert` + `aria-hidden` (state preserved: never unmounted; media inside keeps its state);
  the active slide is the only one in the accessibility tree. No autoplay by default (`interval` explicit,
  paused on hover/focus/hidden page — WCAG 2.2.2), no swipe/carousel logic (consumers bring controls).

## R8 — Pixel / dissolve (M09)

| Technique                                   | Real dissolve? | Cross-origin images                       | Cost (observed / inferred)                            |
| ------------------------------------------- | -------------- | ----------------------------------------- | ----------------------------------------------------- |
| Opacity fade                                | no             | n/a                                       | —                                                     |
| CSS mask from a generated threshold image   | per-block      | ok                                        | a new mask image per frame (raster upload) — rejected |
| WebGL2 noise-threshold shader               | per-pixel      | **needs CORS-clean images** (texImage2D)  | GPU; shaders, context loss, ~2–3 KiB                  |
| **Canvas 2D block dissolve (seeded order)** | per-block      | ok (drawImage on a tainted canvas paints) | O(new cells) drawImage/clearRect per frame            |

**Decision:** Canvas 2D block dissolve: a package `aria-hidden` canvas over the outgoing image paints the
incoming image cell by cell in a deterministic (seeded) order (`object-fit: cover` mapping, DPR-aware, cells
4–64 px, ≤ 4096 cells); reverse clears cells. At the end the incoming image is shown and the canvas is released
(`width = height = 0`, removed). Fallback (no 2D context, image not decodable, reduced motion): opacity
cross-fade — reported as the fallback, never as the effect. The per-pixel noise dissolve is deferred to the
016 GPU Surface Manager (it needs CORS-clean textures and the shared context policy).

## R9 — Hover pan (M10)

The Phase 010 pointer tracker (`core/pointer.ts`, box measured once per hover, no read per move) feeds a
spring toward the pointer's unit position; R2 bounds. Mouse/pen only by default (touch pans the page).
Decorative by default; `keyboard: true` makes the frame focusable (name required) with arrow keys to pan and
Escape/Home to reset — for images whose detail conveys information. Reduced: static (no pan, no zoom).

## R10 — Ambient cost: CSS layers, `filter: blur`, radial gradients (B01, B02, B07)

Observed (spike, 4 animated 520 px blobs, transform keyframes; rAF interval mean / p95 in ms):

| Engine   | radial-gradient blobs | `filter: blur(80px)` blobs |
| -------- | --------------------- | -------------------------- |
| Chromium | 16.67 / 16.8          | 16.67 / 16.7               |
| Firefox  | 6.94 / 6.94 (144 Hz)  | **29.2 / 55.5**            |
| WebKit   | 15.8 / 17             | **142.5 / 174**            |

**Decision:** B01/B02/B07 are CSS on package-owned layers animating `transform` (compositor-friendly
keyframes) with **soft radial gradients instead of `filter: blur`** (blur rejected: frame intervals ×4 in
Firefox and ×9 in WebKit headless). Layers are paused by default in CSS (no-JS users see a static gradient)
and run only while the engine sets `data-neshel-ambient="running"`. No GPU acceleration is claimed.

## R11 — Particles/starfield: Canvas 2D vs WebGL2 (B04, B05)

Observed (spike, 800×500 canvas; JS time per frame mean / p95 in ms — draw submission incl. simulation):

| Engine (CPU)       | 2D 100     | 2D 1000    | 2D 5000       | 2D 5000 rects | WebGL2 1000 | WebGL2 5000 |
| ------------------ | ---------- | ---------- | ------------- | ------------- | ----------- | ----------- |
| Chromium           | 0.11 / 0.3 | 0.64 / 1.2 | 1.44 / 2.5    | 1.29 / 2.2    | 0.06 / 0.2  | 0.05 / 0.1  |
| Chromium (4× slow) | 0.60 / 1.7 | 1.66 / 3.5 | 7.18 / 11.9 ¹ | 3.37 / 6.7    | 0.27 / 0.9  | 0.25 / 0.8  |
| Firefox            | 0.57 / 1.0 | 2.81 / 4.0 | 12.6 / 17 ¹   | 4.37 / 7.0    | 0.02 / 0    | 0.02 / 0    |
| WebKit             | 0.04 / 0   | 0.31 / 1   | 1.31 / 2      | 0.58 / 1      | 0.04 / 0    | 0.06 / 1    |

¹ rAF interval degraded (Chromium 4×: 68 ms mean; Firefox: 12.9 ms mean vs 6.9 idle). WebGL renderers:
Chromium headless **SwiftShader (software)**, Firefox ANGLE/D3D11, WebKit Apple GPU — WebGL figures are CPU
submission only and say nothing about real GPU time on consumer hardware.

**Decision:** Canvas 2D for B04/B05 with bounded density: default ≈ 60 particles / 180 stars on a typical
hero, hard caps 400 particles / 800 stars, `maxDpr` 2, frame rate capped by `fps` (default 60, low-power 30).
At the caps the measured 2D cost stays ≤ 1.2 ms (Chromium), ≤ ~4 ms (Firefox). WebGL2 would cut CPU above
~1000 points but adds shaders, context-loss handling, ~2–3 KiB and the context budget that 016 owns. Optional
`links` (lines between near particles) use a spatial grid and are limited to 150 particles.

## R12 — The GPU question (catalogue GPU marks; owner question 3)

1. Need GPU: none of the 015 entries in their declared capability — M09 (blocks), B04, B05 run within budget on
   Canvas 2D at bounded densities (R8, R11); B07 is CSS (R10).
2. CSS/Canvas 2D: B01/B02/B07 CSS; B04/B05/M09 Canvas 2D.
3. Shared GPU renderer required for: per-pixel noise dissolve, displacement/ripple/depth (D04, D06, D08, D10),
   very dense fields (> 1000 points) — 016.
4. A minimal **internal canvas surface** (not WebGL) is introduced in 015 (`src/core/surface.ts`): lazy canvas
   creation, DPR cap, ResizeObserver sizing applied in the write phase, `contextlost`/`contextrestored`
   handling, visibility gating through the loop, exact release, live counters. Its interface (`create → size →
   draw(frame) → release`) is the seam the 016 GPU Surface Manager can implement with WebGL contexts.
5. Optional implementation: WebGL2 renderers stay out of 015 (no `./gpu` subpath, no shader code shipped).
6. Context loss/restore, resize, DPR and cleanup: covered by the surface contract and tested (lost → no draw,
   restored → full redraw; resize → re-size in the write phase; destroy → `width = height = 0`, removed).
7. Cost: Canvas 2D path adds only the surface (~1 KiB gzip, measured in the bundle check); WebGL2 would add
   shader/context code; measured frame figures above.

ADR [0030](../../docs/decisions/0030-media-ambient-feedback-and-canvas-surfaces.md) records the decision.

## R13 — Grain (B03)

- **Decision:** one static SVG `feTurbulence` data-URI texture in `ambient.css` (rasterised and tiled by the
  browser once; no JavaScript, works without JS), on a package layer with `pointer-events: none`. Optional
  `jitter` moves an oversized layer by `steps()` keyframes at ≤ 8 Hz (no new noise per frame; low opacity, no
  flash risk); off by default; static under reduced motion.

## R14 — Shared ambient lifecycle

- One `IntersectionObserver` and one `visibilitychange` listener **shared by every ambient effect** (a small
  registry in `src/ambient/engine/`), not one per instance. A page-level ambient switch
  (`ambientMotion.pause()/resume()`, `<AmbientMotionToggle>` button with `aria-pressed`) pauses every ambient
  effect — the user mechanism required by WCAG 2.2.2 for motion longer than 5 s.
- Finite by default: ambient effects run `duration` (default 5 s of motion) and then rest; `duration: Infinity`
  is explicit and logs a development warning when no `AmbientMotionToggle` is mounted. Paused off-screen, on
  hidden pages, under reduced motion (live) and through the toggle.

## R15 — Feedback semantics (F01–F10)

- Indeterminate progress: ARIA `progressbar` **without** `aria-valuenow` (ARIA 1.2). Native `<progress>` was
  evaluated: indeterminate styling needs engine pseudo-elements and `appearance: none` removes the native
  indeterminate animation in Blink/WebKit, so the package renders a `role="progressbar"` element with a
  package-owned bar (determinate: `aria-valuenow/min/max`, integer percent text only from a real value).
- Spinner/dots: `role="progressbar"` with a name (default "Loading") or `decorative` (`aria-hidden`) when the
  region already has `aria-busy`. No live region (mounting a live region with content does not announce
  reliably; the consumer's status message does).
- Skeleton: `aria-hidden`; the loading container carries `aria-busy="true"` (Components `Skeleton` contract).
  Shimmer is an `::after` layer keyed on the `shimmer` engine token, so it works on the Components `Skeleton`
  with no dependency.
- Toasts: one polite live region (`role="status"`) present before any toast; each toast's text is inserted once;
  urgent toasts (`tone: "error"`) use a separate `role="alert"` region; timers pause on hover/focus/hidden page;
  default duration 6 s + 60 ms per character (WCAG 2.2.1 adjustable via `duration`, `Infinity` for toasts with
  actions); Escape closes the focused toast; F8 (configurable `hotkey`) moves focus to the region.
- Button loading: never set `disabled` (it drops focus and the name in some AT); `aria-disabled="true"`,
  activation prevented in the capture phase (covers click, Enter/Space and implicit form submission), width
  locked from one measurement, content kept in the DOM (name unchanged), spinner on the package `::after` layer.
- Optimistic pulse: three states `pending → confirmed | failed`; `failed` shows a distinct static state and calls
  `onRollback`; never announced as success.
- Shared primitives: F05/F09 use `pathLength`-normalised geometry (no measurement); the checkmark shape constant
  moves to `src/core/marks.ts`, imported by `./svg` (S10) and `./feedback` (F05) — no family imports another.
  Presence's pure state machine moves to `src/core/presence.ts` (re-exported by `./layout`, unchanged API).
- `@neshel-ui/components` is not changed and does not depend on Animations; integration is through DOM contracts
  (`data-loading`, `aria-busy`, engine tokens), documented in the feedback contract.

## R16 — Pending text (F10)

`background-clip: text` sweep on a **package-owned** span around the text (one accessible text; R-1); the base
colour stays the consumer's colour and the moving band only lightens it (contrast floor by `color-mix`);
`@media (forced-colors: active)` removes the gradient and restores `CanvasText`; without `background-clip:
text` support the text stays plain; reduced: static.

## R17 — Dependencies

No dependency added (ADR 0020): no Three.js/PixiJS/regl/ogl, no carousel, lightbox, toast, image-loading or
video-scrub library. Every behaviour above is native platform API plus the existing engine.
