# Research — Phase 016 (Advanced 3D & Distortion)

Observations are labelled **measured** (with the command and machine) or **inferred**. All measurements are local
(Windows 11 maintainer machine, Playwright 1.x engines, headless). Headless Chromium rasterises WebGL with
SwiftShader (software); Playwright Firefox reported an ANGLE/Direct3D 11 renderer and Playwright WebKit masks the
renderer string ("Apple GPU"). **No physical-GPU, Safari or device figure is claimed.** rAF intervals are not
comparable across engines (headless Firefox and WebKit run rAF faster than 60 Hz).

Raw data: [data/spike-016-local.json](data/spike-016-local.json) (`pnpm bench:animations:spike-016`).

## R1 — Inventory and starting points

| Id  | Catalogue driver | Reused from earlier phases                                                  | Decision (this phase)                                       |
| --- | ---------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------- |
| D01 | CSS              | Motion Host transform layers, spring integrator, progress driver (`drive`)  | CSS 3D (`preserve-3d`, `backface-visibility`) via the host  |
| D02 | CSS              | progress driver (tween, seek, reverse), host layers, ResizeObserver pattern | CSS 3D faces about a cached half-depth                      |
| D03 | CSS/JS           | spring rig, pointer session (012), host layers                              | CSS 3D ring, JS spring on the angle                         |
| D04 | GPU              | 008 R7 technique 4 (mesh), Canvas Surface lifecycle (015)                   | WebGL2 cylinder-curl mesh; explicit CSS rigid-turn fallback |
| D05 | CSS (fold)       | 008 R7 technique 2 prototype (hinged fold), Tilt3D hit-area technique (R6)  | Hinged fold of live content with an inert, ID-free flap     |
| D06 | GPU              | —                                                                           | WebGL2 fragment shader, damped radial waves                 |
| D07 | CSS              | host exclusive channels on package layers                                   | Two decorative inert layers, ≤ 3 Hz slices                  |
| D08 | GPU              | pointer tracker (010), spring rig                                           | WebGL2 fragment shader with an RG displacement map          |
| D09 | CSS              | 015 ambient layer pattern (package layer, engine-gated play state)          | CSS plane rotated about the horizon; transform loop         |
| D10 | GPU              | pointer tracker, spring rig, progress driver                                | WebGL2 fragment shader with an explicit depth map           |
| D11 | CSS              | 015 R10 measurement (`filter: blur()` cost)                                 | `backdrop-filter` bands with gradient masks; tint fallback  |

## R2 — Driver comparison (the GPU decision)

**Measured** with `node scripts/bench-animations-spike-016.mjs` (self-contained pages, no package code; 120 frames,
first 10 discarded; JS = time spent in the frame callback submitting work; interval = rAF interval mean/p95):

| Case (480×360 CSS px)                        | Chromium (SwiftShader) JS · interval | Chromium 4× CPU JS           | Firefox JS · interval | WebKit JS · interval     |
| -------------------------------------------- | ------------------------------------ | ---------------------------- | --------------------- | ------------------------ |
| WebGL2 curl mesh 16×12, DPR 1                | 0.05 · 16.7/16.8 ms                  | 0.40                         | 0.01 · 6.9            | 0.04 · 2.8               |
| WebGL2 curl mesh 64×48, DPR 1                | 0.04 · 16.7/16.7                     | 0.28                         | 0.03 · 6.9            | 0.04 · 2.6               |
| WebGL2 curl mesh 128×96 (12 513 vertices)    | 0.03 · 16.7/16.7                     | 0.29                         | 0.05 · 6.9            | 0.04 · 2.6               |
| WebGL2 curl mesh 64×48, DPR 2                | 0.03 · 16.7/16.7                     | 0.19                         | 0.04 · 6.9            | 0.05 · 6.7/9             |
| WebGL2 ripple (8 impacts), DPR 1 / DPR 2     | 0.03 · 16.7 / 0.02 · **18.7/33.4**   | 0.32 / 0.09                  | 0.10 / 0.02 · 6.9     | 0.04 · 2.5 / 6.1         |
| WebGL2 displacement map, DPR 1 / 2           | 0.06 / 0.03 · 16.7                   | 0.37 / 0.24                  | 0.04 / 0.06 · 6.9     | 0.03 · 2.5 / 6.0         |
| WebGL2 depth parallax (8 steps), DPR 1 / 2   | 0.03 / 0.02 · 16.7                   | 0.32 / 0.11                  | 0.14 / 0.03 · 6.9     | 0.05 · 2.6 / 5.8         |
| Canvas 2D curl (64 strips), DPR 1 / 2        | 0.27 / 0.17 · 16.7                   | 0.81 / 0.72 (27 ms interval) | **3.6 / 5.5** · 6.9   | 0.06 / 0.08 · 5.7 / 13.9 |
| CSS 3D flip ×12 · hinged fold ×6 · glitch ×6 | ≤ 0.005 · 16.7                       | ≤ 0.03                       | ≈ 0 · 6.9             | ≈ 0 · 15.6               |
| CSS perspective floor ×2 (oversized plane)   | 0.005 · 16.7                         | 0.03                         | 0 · **25.1/27.8**     | 0 · 17.6/**30**          |
| Tilt-shift: 4 `backdrop-filter` bands        | 0.02 · 16.7/16.8                     | 0.14                         | 0.06 · 17.0/20.8      | 0.06 · 15.6/16           |
| Tilt-shift: 8 `backdrop-filter` bands        | 0.03 · **20.6/33.4**                 | 0.10 · 20.9/33.4             | 0.06 · **21.8/27.7**  | 0.03 · 16.2/24           |
| Tilt-shift: 4 duplicated layers + `filter`   | 0.03 · 16.7                          | 0.17                         | 0.03 · 15.5/20.8      | 0.02 · **31.4/36**       |

Shader compile + link (first program, cold): Chromium 7.3 ms (warm 0.2–0.7 ms), Firefox 5–24 ms, WebKit 5–17 ms.
Texture upload 512×384: Chromium < 1 ms. Live WebGL contexts (24 created): **Chromium 16 alive (8 `webglcontextlost`
events), WebKit 16 alive (8 lost), Firefox 24 alive**. WebGPU (`navigator.gpu`): **unavailable in all three headless
engines**. `backdrop-filter`, `preserve-3d` and `mask-image` are supported in all three.

**Measured gzip size** (min + gzip level 9; esbuild, tree-shaken minimal imports where the package allows; packages
fetched with `npm pack` into a scratch directory, not installed in the repository):

| Option                                                                                                            | min+gz            |
| ----------------------------------------------------------------------------------------------------------------- | ----------------- |
| OGL 1.0.11 minimal (Renderer, Program, Mesh, Plane, Texture, Triangle)                                            | 14.02 KiB         |
| twgl.js 5.5.4 (`twgl.js` / full module)                                                                           | 21.50 / 22.45 KiB |
| regl 2.1.1 (`regl.min.js`)                                                                                        | 27.94 KiB         |
| three 0.187.0 minimal (WebGLRenderer, Scene, camera, Mesh, PlaneGeometry, ShaderMaterial, Texture)                | 129.63 KiB        |
| pixi.js 8.23.0 minimal (Application, Sprite, Texture, Filter, MeshPlane, DisplacementFilter)                      | 233.00 KiB        |
| Own layer (packed tarball, 016.5): configureGpu + getGpuSupport                                                   | 2.40 KiB          |
| Own layer + one complete effect (engine, validation, pointer, Motion Host, shader): createRipple / createPageCurl | 12.41 / 15.94 KiB |
| Whole ./gpu entry (manager, four effects, React components)                                                       | 22.42 KiB         |

| Criterion                | WebGL2 (own minimal layer)                                             | WebGPU                                                           | Canvas 2D                                    | CSS 3D / masks                                 | OGL / twgl / regl                       | Three / Pixi       |
| ------------------------ | ---------------------------------------------------------------------- | ---------------------------------------------------------------- | -------------------------------------------- | ---------------------------------------------- | --------------------------------------- | ------------------ |
| Availability             | All three engines (measured); universal in current browsers (inferred) | none headless (measured); uneven in shipping browsers (inferred) | universal                                    | universal                                      | WebGL2/1 underneath                     | same               |
| Real mesh deformation    | yes (vertex shader)                                                    | yes                                                              | no — strips approximate one axis only        | no — rigid planes only (008 R7)                | yes                                     | yes                |
| Per-pixel displacement   | yes (fragment shader)                                                  | yes                                                              | `getImageData` per frame (CPU, CORS-tainted) | SVG `feDisplacementMap` (CPU raster; no depth) | yes                                     | yes                |
| Cost (JS/frame)          | ≤ 0.15 ms (≤ 0.4 ms at 4× CPU)                                         | n/a                                                              | 3.6–5.5 ms in Firefox                        | ≈ 0 JS; compositor cost varies (floor, blur)   | similar GPU cost + abstraction overhead | similar            |
| Bytes                    | a few KiB (budgeted)                                                   | larger API surface + WGSL                                        | 0 extra                                      | 0 extra                                        | 14–28 KiB                               | 130–233 KiB        |
| Context loss             | own handling, tested                                                   | device loss                                                      | rare (2D)                                    | n/a                                            | partial/varies                          | handled, heavy     |
| Maintenance/contributors | small, standard GLSL ES 3.00                                           | new API, WGSL                                                    | simplest                                     | simplest                                       | external API to learn and track         | large external API |

**Conclusion.** Only a GPU path produces real deformation (D04) and per-pixel displacement (D06, D08, D10); Canvas 2D
cannot deform in two axes and costs 3.6–5.5 ms/frame in Firefox for a one-axis approximation; CSS cannot deform at
all. WebGPU is not available to test and would not be a baseline. The libraries add 14–233 KiB for features the four
effects do not use (scene graphs, cameras, loaders, filters); the effects need one program each, one or two
textures, one quad or one grid mesh and a handful of uniforms. **Recommendation: WebGL2 through a minimal own layer
in an optional `./gpu` entry** (ADR 0031, Proposed). ADR 0030 stays valid: its Canvas 2D effects (M09, B04, B05) are
not moved; the GPU layer only serves the four D effects whose catalogue driver is GPU and which Canvas 2D cannot
render. WebGL1 is not targeted (inferred: every engine that ships WebGL2-capable releases since 2021); without WebGL2
the effects show the original content (static fallback) or the documented CSS fallback (D04).

CSS findings that shape the CSS effects: the oversized perspective plane is expensive in Firefox/WebKit → D09 bounds
the plane to the visible trapezoid (one layer, height ≤ 2× the floor, horizon fade) and is finite by default; 8
`backdrop-filter` bands and duplicated `filter` layers are rejected for D11 → at most 2 bands per side (4 total),
`backdrop-filter` only, a tint fallback without it, static by default.

## R3 — GPU Surface Manager

The Phase 015 surface lifecycle (`ensure → resize → draw → release`) is implemented with WebGL2 contexts in
`src/gpu/engine/` (internal; only `./gpu` imports it):

- **Lazy**: no context at construction; `ensure()` creates it on the first draw request (first visible frame or
  first interaction). Nothing touches `window`, `document` or WebGL at import.
- **One draw task per frame**: surfaces mark themselves dirty; the manager schedules ONE `write`-phase task on the
  shared scheduler that draws every dirty, visible surface — N effects never mean N scheduler tasks. Progress
  values and pointer targets are uniforms updated in the effect's `update` phase; textures are uploaded once (on
  init and on restore), never per frame. No second scheduler.
- **Context budget**: `maxContexts` (default 6, 1–8 — under the 16 live contexts measured in Chromium/WebKit). At the
  limit, the least recently drawn **idle** surface is evicted (its resources and context released; it returns to
  the static fallback, which is pixel-identical at rest for D04/D06/D08/D10); if none is idle the new surface
  waits (static fallback) and is granted when a context frees.
- **DPR and pixels**: `min(devicePixelRatio, maxDpr)` (default 2, 1–3) and at most 4 MP of drawing buffer per
  surface (DPR lowered beyond that).
- **Memory budget**: estimated bytes = textures (w×h×4) + drawing buffers (w×h×4×2 with depth); default 96 MB
  (16–512). Textures are downscaled to `maxTextureSize` (default 4096, capped by `MAX_TEXTURE_SIZE`) and refused
  beyond the budget (static fallback, reason `memory`).
- **Tracked resources**: programs, shaders, buffers, textures, vertex arrays per surface; `release()` deletes all,
  calls `WEBGL_lose_context.loseContext()` to free the context promptly, zeroes the canvas and removes it.
- **Context loss/restore**: `webglcontextlost` → `preventDefault()`, resources forgotten, effect shows the original
  content; `webglcontextrestored` → resources rebuilt (`init` re-run), one redraw, the original hidden again.
- **Failures**: no WebGL2 (`unsupported`), compile/link errors (`shader`), texture upload `SecurityError`
  (`cors`), decode errors (`texture`), budget (`memory`) → the effect reports `mode: "static"` (or `"fallback"`
  for D04 CSS) with `reason`; development warnings name the effect; counters record it.
- **Visibility**: one shared IntersectionObserver and one `visibilitychange` listener for all surfaces; off-screen
  or hidden surfaces are not drawn and their effects pause their clocks.
- **ResizeObserver**: per surface, applied in the write phase (never inside the observer callback), sub-pixel
  differences ignored (the 015 M09 rule).
- **Live counters**: `getGpuDebugInfo()` (contexts, waiting, surfaces, programs, shaders, buffers, textures,
  estimated bytes, draws, compile errors, losses, restores, evictions, fallbacks).
- **No needless rendering**: effects request frames only while something changes (spring moving, wave energy above a
  threshold, progress changing); a settled effect costs nothing.

## R4 — Entry points

Criterion (008 R10): a subpath must buy what tree-shaking cannot — an optional heavy capability or an isolation
boundary. Decision: **`./advanced`** (D01, D02, D03, D05, D07, D09, D11 + React + `advanced.css`) and **`./gpu`**
(GPU Surface Manager helpers + D04, D06, D08, D10 + React + `gpu.css`). `./advanced` never imports `src/gpu`
(checked by the contract test and by bundle inspection: no `webgl2`, `createShader` or GLSL in `./advanced`
bundles). `./gpu` never imports `./advanced` (family rule); geometry shared by both (fold/cylinder math) lives in
`src/core/geometry-3d.ts` (internal). `./core` public exports do not change.

## R5 — D01 card flip

Structure: root (perspective) → inner (`preserve-3d`, rotated) → two faces (`backface-visibility: hidden`; the back
pre-rotated 180°). All structural styles are written through the Motion Host (captured and restored), so the
framework-free engine works on any markup; the React component renders the same structure. One spring drives the
progress (0 front, 1 back); the angle is `progress × 180°` (sign by `direction`). The **visible face** is the one
facing the viewer (`progress < 0.5` → front); the hidden face is `inert` (+ `aria-hidden`) — no duplicated content:
each face is distinct consumer content. If focus is inside the face that becomes hidden, focus moves to the first
focusable element of the visible face (or the face itself with a temporary `tabindex="-1"`, restored). Interruption
retargets the spring from the current angle and velocity. `seek(p)` renders an exact angle; `drive(source)` follows
an external 0–1 source. Reduced motion: `fade` (cross-fade of the faces, no rotation) or `instant`. Fallback without
`preserve-3d` support: fade.

## R6 — D02 cube rotation

Panels are the root's element children stacked in one grid cell (`.neshel-cube > *`). A transition involves two
panels: the outgoing face `translateZ(−d) rotateY(θ) translateZ(d)` and the incoming face
`translateZ(−d) rotateY(θ ∓ 90°) translateZ(d)`, `θ = progress × 90° × direction`, `d` = half of the root's width
(axis `y`) or height (axis `x`) from a cached ResizeObserver box — **no layout read per frame**. Both faces have
`backface-visibility: hidden`; `perspective` on the root. Non-participating panels are `visibility: hidden` (host
channel) + `inert` + `aria-hidden`; only the target panel is interactive (it becomes the logical active panel when
the transition starts, so a screen reader never lands in the outgoing panel). Focus inside the outgoing panel moves
to the incoming panel. The progress driver gives seek, reverse, finish and cancel; a new `go()` mid-transition
completes the logical state and starts from the current visual angle. Reduced motion and no-3D fallback: fade.

## R7 — D03 3D ring carousel

N items at `α = 360°/N`; radius `r = (w/2 + gap/2) / tan(π/N)` from the cached item width (or explicit). Each item:
`translateZ(−r) rotateY(iα − θ) translateZ(r)` so the front item stays at z = 0 (no scaling); `preserve-3d` +
`perspective` on the root give depth sorting; a z-index from `cos(iα − θ)` is written too for engines that flatten.
A spring advances θ toward `index × α` with the **shortest path** (targets accumulate, so rapid navigation retargets
without spinning back). Only the front item is interactive; every other item is `inert` + `aria-hidden` — items
behind the perspective can never take focus. DOM order stays the reading order; the root is a labelled group with
`aria-roledescription="carousel"`, items `aria-roledescription="slide"` with "n of N" labels; a polite live region
announces the active slide. Keyboard: ←/→ (and ↑/↓ for axis `x`), Home/End on the focusable root; drag uses the
core pointer session (012) with `touch-action: pan-y` (vertical page scroll kept) and a velocity snap. `refresh()`
re-reads the items (dynamic count). Reduced motion: static arrangement, navigation jumps.

## R8 — D04 page curl (cylinder model)

For a vertex `p`, the curl direction `d` (unit vector from the start corner toward the page) and the fold line at
distance `s` from the corner: `u = (p − corner)·d`, `t = s − u`. `t ≤ 0` → flat. `0 < t < πr` → wrapped on a cylinder
of radius `r`: `u' = s − r·sin(t/r)`, `z = r(1 − cos(t/r))`, normal `z`-component `cos(t/r)`. `t ≥ πr` → flipped flat
on top: `u' = s + (t − πr)`, `z = 2r`. This gives **continuous curvature** (C¹ at both seams), a straight crease
position (`s`), back faces (`gl_FrontFacing`) with their own texture or colour, and Lambert-style shading from the
normal plus a soft highlight near the crest. Progress maps `s` from 0 to `diagonal + πr` (page fully peeled, the
`under` image revealed). Four start corners; bidirectional progress; interruption and return are progress changes.
Mesh sizes: small 16×12, medium 32×24 (default), large 64×48, capped at 128×96 (12 513 vertices, Uint16 indices);
measured cost is flat across sizes in the spike. HTML content is never turned into a texture: the GPU curl applies to
raster sources (`<img>`, `<canvas>`, `ImageBitmap`); live HTML pages use the **CSS driver** (`driver: "css"`), a
rigid page turn about the opposite edge — documented as a rigid turn, never as deformation — so links and focus stay
live. Without WebGL2 the same CSS driver is the explicit fallback (`mode: "fallback"`).

## R9 — D05 CornerRecede (from the 008 R7 hinged fold)

Kept from the prototype: base clipped without the corner triangle; flap = inert copy rotated about the straight
crease `rotate3d(±1, ±1, 0, angle)`; fold collapsed to 0 at rest (no hairline seam); spring amount 0–1. Added for
production: the **corner under the pointer** (quadrant) recedes by default, `reverse` lifts it toward the viewer;
amount from the pointer's proximity to that corner (`threshold` keeps the centre neutral); a corner change first
returns to 0, then folds the new corner (no geometry jump); the Tilt3D box hit area (R6: window pointermove while
inside the untransformed box); focus-visible inside the surface shows a gentle fixed fold (35 %, `focusCorner`);
reduced motion jumps (instant). The flap is created lazily on the first fold and removed when at rest; it is
`aria-hidden` + `inert`, every `id`, `name`, `for`, `form` and `aria-*` id reference is stripped from the copy, form
control values are copied, and a MutationObserver (coalesced into the write phase) keeps it in sync while folded.
`flap: "plain"` renders a surface-coloured flap without copying content — for content that cannot be duplicated
safely (video, canvas, iframes, custom elements with shadow state, very large DOM). The crease is continuous: the
flap's clip overlaps the base by 0.5 px. Writes: the surface's `clip-path` (exclusive host channel); flap styles are
package-owned. Composition: Tilt3D/Hover/Press transform the root; CornerRecede clips the surface and moves its own
flap — different elements and channels.

## R10 — D06 liquid / ripple

Fragment shader: for up to 8 impacts `(x, y, t0, strength)`, a ring travelling at `speed`, envelope
`exp(−k|r − front|) · exp(−damping·age)`, radial UV offset `sin(frequency·(r − front)) · amplitude`, bounded to
≤ 0.03 UV at amplitude 1 and clamped to the texture. The loop runs only while the total envelope exceeds 1/1000;
then the effect stops requesting frames (the last frame equals the undistorted image). Deterministic: `seed` drives
the positions of `seek()`/`drive()` impacts; pointer impacts use the pointer position (no randomness). Reduced
motion: off (no canvas, the image is shown). Pointer listeners are passive; no capture, no `preventDefault`.

## R11 — D07 RGB split / glitch and flash safety

WCAG 2.3.1 (three flashes) and 2.3.3: a flash is a pair of opposing luminance changes ≥ 10 % over a large area,
more than 3 per second. Design limits: slice changes ≤ **3 per second (hard cap, not configurable above)**, burst
duration 100–2000 ms (default 600), offset ≤ 6 px (default 2.4 px at intensity 0.4), layers at ≤ 0.8 opacity, each
slice ≤ 30 % of the element's height, intensity eased in/out (no abrupt luminance step). No option enables a faster
or full-screen glitch. The text exists once in the DOM; the two layers are created only while the glitch runs,
`aria-hidden` + `inert` + `user-select: none` + `pointer-events: none`, ids stripped. Reduced motion: off.

## R12 — D08 displacement-map hover

Map channels R and G encode the x/y offset (0.5 neutral); `channels: "r" | "g"` use one channel for both axes.
Strength 0–1 maps to ≤ 0.08 UV; `scale` tiles the map (0.25–4); edges `clamp` (default), `mirror` or `fade` (the
offset falls to 0 at the borders). Maps: a consumer URL/`<img>`/`<canvas>` (CORS: `crossOrigin="anonymous"` by
default; a tainted source fails with `cors` and the static image stays) or the built-in deterministic `"noise"` map
generated on a small Canvas 2D (value noise, seeded; no external dependency). Animation: a spring on the amount
(hover/focus), frames only while it moves. Reduced motion: static.

## R13 — D09 perspective grid floor

A package layer clips a plane rotated about its top edge (`rotateX(angle)`) with `perspective` and
`perspective-origin` at the vanishing point; the plane's top is the horizon. Lines are two linear gradients; a mask
fades toward the horizon. Motion: the plane's child translates by exactly one cell per loop (seamless), keyframes on
package elements, paused unless the engine marks the layer running (visible, page shown, not reduced, within the
finite duration — default 5 s like ADR 0030 ambient; `Infinity` explicit with a consumer pause control). Bounded
plane (R2 measurement). `pointer-events: none`; no overflow outside the layer.

## R14 — D10 depth-map parallax

Inputs: the colour image (the original `<img>` keeps its attributes and semantics) and an explicit depth map
(grayscale, **white = near** by default, `invert` option). Shader: iterative offset `uv + pointer · (depth − focus) ·
intensity` (1–16 steps, default 8) with a zoom margin equal to the maximum offset so edges are never uncovered;
sampling clamped. Validation: aspect ratio within 2 % of the image, size ≤ the texture limit, depth range sampled on a
64×64 Canvas 2D copy (a flat map < 2/255 range warns in development). Pointer (spring) or external progress between
two poses (`from`/`to`). No depth is ever estimated from the colour image (out of scope; would need a model and owner
authorisation). Reduced motion: static.

## R15 — D11 tilt-shift blur

Package overlay with at most 2 bands per side (horizontal/vertical) or 2 rings (radial), each `backdrop-filter:
blur()` with a gradient mask; blur 0–12 px (default 6), focal band 10–90 % (default 35 %). Static by default; the
focus may follow a progress source or the pointer through a spring (writes one custom property per frame on the
package overlay). Without `backdrop-filter`: a tint gradient (`fallback: "tint"`) or nothing. Content stays in the
DOM, selectable and readable by assistive technology; the overlay never intercepts events.

## R16 — Composition

Timeline: D01, D02, D04 (and D10/D06 via `seek`) expose `track()`/`drive()` (structural progress, no import of
`./cinematic`). Scroll: `drive(scrollProgress)` (011 `ScrollProgress` fits `ProgressSource`). Gestures: D03 uses the
012 pointer session; D05 composes with Tilt3D/Hover/Press on the root; D01/D02 faces may host any effect. Motion Host:
every consumer write is a layer or an exclusive channel; conflicts follow ADR 0022.

## R17 — Testing GPU

Unit (jsdom): a fake WebGL2 context records calls, counts live objects, simulates compile/link failure, texture
`SecurityError`, `webglcontextlost`/`restored`, `WEBGL_lose_context`. Browser: real WebGL2 in Chromium (SwiftShader),
Firefox and WebKit; pixel probes with `readPixels` immediately after a synchronous debug draw; forced context loss
with `WEBGL_lose_context`; forced compile failure via a debug hook that injects an invalid program (package-only
switch, never consumer GLSL); a WebGL-disabled page (`getContext` returning null) for the fallback rows. A fallback
row never counts as a pass of the main effect.

## R18 — Budgets

New bundle entries for `./advanced` and `./gpu` effects are measured from the packed tarball after implementation
(`pnpm check:animations:bundles`) and proposed with ~10 % headroom; no existing budget changes.

## R19 — Measured after implementation (016.5)

- **Bundles** (packed tarball, min + gzip; `data/bundles-016.json`): `./advanced` entire entry 22.26 KiB, one CSS engine
  4.81–9.61 KiB; `./gpu` entire entry 22.42 KiB, one GPU engine 12.41–15.94 KiB (complete effects; library figures in R2
  exclude effect logic and the engine). Tree-shaking markers prove that no `./advanced` bundle contains WebGL or GPU
  code and no `./gpu` bundle contains the CSS family.
- **Frames** (`data/bench-advanced-local.json`, `data/bench-advanced-chromium-4x-local.json`; observations): GPU
  entries keep the baseline interval in Chromium (also at 4× CPU), Firefox and WebKit, including six surfaces at once;
  the visible costs are CSS — moving the D11 focus with four bands (20.4/27.8 ms Firefox, 23.0/31 ms WebKit, 21.6/33.4 ms
  Chromium 4×) and two D09 floors in Firefox (11.8/13.9 ms vs a 7 ms baseline). Static tilt-shift and one floor stay
  near the baseline (WebKit's own baseline is noisy: 20.5/31 ms). Context restore: 14–29 ms to the first restored
  frame. Mount/unmount × 20: live resources return to the gallery's own; WebKit dropped one context during the churn
  (now replaced on the next request).
