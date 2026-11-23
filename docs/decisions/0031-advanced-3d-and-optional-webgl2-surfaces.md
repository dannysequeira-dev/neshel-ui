# ADR 0031 — Advanced 3D & Distortion; an optional WebGL2 surface layer (`./gpu`) without a graphics dependency

- Status: **Accepted** (owner, 2026-11-23, PR #17 review comment 7091352862; architectural direction approved, accepted
  after review checks R1 (cancellable map loading) and R2 (split fallback rows, explicit skip counts) were closed —
  `specs/016-advanced-3d-distortion/evidence.md` §21)
- Date: 2026-11-22
- Feature: [016](../../specs/016-advanced-3d-distortion/spec.md); research R1–R18; contracts
  [advanced-api.md](../../specs/016-advanced-3d-distortion/contracts/advanced-api.md),
  [gpu-api.md](../../specs/016-advanced-3d-distortion/contracts/gpu-api.md)

## Context

Phase 016 implements the last 11 catalogue entries (D01–D11). Four of them (D04 page curl, D06 ripple, D08
displacement-map hover, D10 depth-map parallax) need real geometric deformation or per-pixel texture displacement.
ADR 0030 deferred the GPU Surface Manager to this phase and chose Canvas 2D/CSS for Phase 015. ADR 0020 forbids a
motion/graphics engine dependency without a benchmark and an ADR. The owner asked for a measured decision that does
not invalidate ADR 0030 for convenience.

## Decision

1. **WebGL2 through a minimal own layer**, shipped only in a new optional entry **`./gpu`**. Measured (research R2):
   WebGL2 is available in Chromium, Firefox and WebKit; its JS submission cost is ≤ 0.15 ms/frame (≤ 0.4 ms at 4×
   CPU) for meshes up to 128×96 and for the three fragment shaders; Canvas 2D cannot deform in two axes and costs
   3.6–5.5 ms/frame in Firefox for a one-axis approximation; CSS cannot deform. WebGPU is unavailable in the three
   headless engines and is not a baseline. No library: OGL (14.0 KiB), twgl (21.5), regl (27.9), Three (129.6) and
   Pixi (233.0 KiB gzip, minimal imports) bring scene graphs, loaders and abstractions the four effects do not use.
2. **GPU Surface Manager** (`src/gpu/engine/`, internal; diagnostics and configuration public from `./gpu`): the
   Phase 015 `ensure → resize → draw → release` lifecycle with WebGL2 contexts — lazy creation, a context budget
   (default 6, max 8; LRU eviction of idle surfaces; waiting surfaces granted later), bounded DPR (default 2) and
   drawing-buffer pixels, a memory budget (default 96 MB), tracked programs/shaders/buffers/textures released
   exactly, context loss/restore, failure modes (`unsupported`, `shader`, `cors`, `texture`, `memory`) with the
   original content kept visible, one shared IntersectionObserver and visibility listener, ResizeObserver applied in
   the write phase, **one scheduler task per frame for all surfaces**, and no frame requested while nothing changes.
3. **Shaders are package constants.** No option accepts GLSL; uniforms are validated numbers; textures come from
   consumer images/canvases under the browser's CORS rules (`crossOrigin="anonymous"` for URL maps) or from
   package-generated maps.
4. **Native content stays primary.** The `<img>` keeps its attributes and stays in the accessibility tree; the
   decorative canvas (`aria-hidden`, `pointer-events: none`) covers it only after a successful first draw, and the
   image becomes visible again on any failure, context loss, reduced motion or destroy. HTML is never turned into a
   texture; D04's CSS driver (a rigid page turn, documented as such) serves live HTML and is the explicit fallback.
5. **`./advanced`** holds the seven CSS entries (D01, D02, D03, D05, D07, D09, D11) and never imports the GPU layer.
   D05 is the 008 R7 hinged fold (approved recommendation) productised; R7 technique 4 (mesh) informs D04.
6. **ADR 0030 unchanged**: M09/B04/B05 stay Canvas 2D and B07 stays CSS; the GPU layer is not used by earlier
   families in this phase (a later move would need its own measurement).
7. Writes to consumer elements go through the Motion Host (layers and exclusive channels); package-rendered layers
   (flaps, glitch layers, floors, overlays, canvases) are styled directly or by `advanced.css`/`gpu.css` keyed on
   package classes (rule R-1).

## Consequences

- Two new subpaths and stylesheets; new bundle budgets proposed from measured tarball bundles; earlier budgets
  unchanged.
- WebGL2-less environments show the original image (D06, D08, D10) or the CSS rigid turn (D04); this is reported as
  `mode` and never counted as the main effect in tests.
- Headless verification uses software or masked renderers; physical-GPU behaviour, Safari and devices remain manual
  checks.
- Contributors need basic GLSL ES 3.00 knowledge for four small shaders (documented in source).

## Alternatives rejected

- A graphics library (OGL, twgl, regl, Three.js, PixiJS) — bytes and API surface without a measured need (R2).
- WebGPU — not available to verify; would still need the WebGL2 path.
- Canvas 2D curl/displacement — cannot deform in two axes; `getImageData` displacement is CPU-bound and fails on
  CORS-tainted images.
- SVG `feDisplacementMap` for D08 — CPU rasterisation, no depth (D10), engine differences.
- Duplicated `filter: blur()` layers and more than four `backdrop-filter` bands for D11 (R2: 31 ms intervals in
  WebKit; 21 ms in Chromium/Firefox at 8 bands).
- Segmented tiles for D05 (008 R7: stepped surface, N² copies).

## Review follow-up (PR #17)

- **R1**: texture-source loads are cancellable (an internal `AbortSignal`): destroy removes every listener on
  caller-owned map images, releases detached URL requests, and a map that already failed rejects at once (static
  native image). Public API unchanged.
- **R2 / K-16**: the only allowed skip is Playwright Firefox on Linux for the six WebGL2-requiring rows when the runner
  has no WebGL2; a skip is never a pass and reports carry passed / skipped / failed separately
  (`scripts/lib/gpu-skips.mjs`, `tests/gpu-skips.test.mjs`). The no-WebGL2 fallback runs and must pass everywhere.
