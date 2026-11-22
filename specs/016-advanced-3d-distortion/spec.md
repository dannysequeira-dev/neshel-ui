# Feature Specification: Advanced 3D & Distortion (Phase 016)

**Feature Branch**: `feature/016-advanced-3d-distortion` (from `origin/main` `da79b4a`, after the PR #16 squash
merge; main CI run 45079243865: attempt 1 failed only in `browsers / macos-latest` on the known Components
`nested-overlays-escape-order` timing limitation — Phase 015 did not touch Components; attempt 2 passed 14/14)

**Created**: 2026-11-22

**Status**: **In development — see [evidence.md](evidence.md).** `@neshel-ui/animations` stays private (0.0.0).
ADR [0031](../../docs/decisions/0031-advanced-3d-and-optional-webgl2-surfaces.md) is **Proposed**; the new bundle
budgets are **proposed** until owner review.

**Input**: Owner direction 2026-11-22, summarised in [brief.md](brief.md).

Companion documents: [research.md](research.md) (R1–R18), [plan.md](plan.md), [tasks.md](tasks.md),
[analysis.md](analysis.md), [manual-checks.md](manual-checks.md), [release-candidate.md](release-candidate.md);
contracts [advanced-api.md](contracts/advanced-api.md), [gpu-api.md](contracts/gpu-api.md),
[accessibility-016.md](contracts/accessibility-016.md), [support-matrix-016.md](contracts/support-matrix-016.md),
[composition-matrix-016.md](contracts/composition-matrix-016.md),
[performance-matrix-016.md](contracts/performance-matrix-016.md), [entry-points-016.md](contracts/entry-points-016.md).

## Problem

3D and distortion effects are where libraries rotate a card and leave the hidden face focusable, call a rigid
rotation "deformation", turn interactive HTML into an inaccessible texture, keep a WebGL loop running after the
ripple faded, lose content when WebGL fails, ship 100+ KiB of scene graph for one shader, and flash text faster than
WCAG allows. Phase 016 completes the catalogue with the last 11 entries on the 009–015 engine, with real geometry
where the catalogue promises it and native content kept primary everywhere.

## Goals

1. A measured GPU decision (ADR 0031): WebGL2 through a minimal own layer in an optional `./gpu` entry; no
   graphics dependency; ADR 0030 unchanged.
2. `./advanced`: D01, D02, D03, D05, D07, D09, D11 on CSS 3D, package layers and the Motion Host.
3. `./gpu`: GPU Surface Manager and D04, D06, D08, D10 with explicit fallbacks.
4. Composition with Timeline, Scroll, Gestures, Tilt3D/Hover/Press and the Motion Host; no React render per frame.
5. Evidence: unit, composition, three engines, packed SSR consumer, routers, budgets, benchmarks, three-OS CI, and
   a private release-candidate readiness report.

## Non-goals

Depth estimation from images (needs a model; out of scope without owner authorisation); WebGPU; a 3D scene engine;
turning HTML into textures; moving Phase 015 Canvas 2D effects to WebGL; changes to `@neshel-ui/components`,
Config, the CLI, the five public packages or the release workflow; publication, versions, tags, releases; merging
the PR.

## Inventory (the 11 catalogue entries)

| Id  | Effect                     | Catalogue driver → Phase 016 driver                                       | Structure | Reduced | Engine / React                                  |
| --- | -------------------------- | ------------------------------------------------------------------------- | --------- | ------- | ----------------------------------------------- |
| D01 | Card flip                  | CSS → host layer on the inner (spring), `preserve-3d`, hidden face inert  | W + L¹    | fade    | `createCardFlip` / `CardFlip`                   |
| D02 | Cube rotation              | CSS → per-face host layers about a cached half-depth (progress driver)    | W         | fade    | `createCubeRotate` / `CubeRotate`               |
| D03 | 3D ring carousel           | CSS/JS → per-item host layers, spring on the angle, pointer session       | W         | static  | `createRingCarousel` / `RingCarousel`           |
| D04 | Page curl                  | GPU → **WebGL2 cylinder mesh**; CSS rigid turn (`driver: "css"`/fallback) | C         | instant | `createPageCurl` / `PageCurl`                   |
| D05 | CornerRecede               | CSS⁹ → hinged fold (008 R7 #2): surface `clip-path` + inert ID-free flap  | L         | instant | `createCornerRecede` / `CornerRecede`           |
| D06 | Liquid / ripple distortion | GPU → **WebGL2** damped radial waves; static image fallback               | C         | off     | `createRipple` / `Ripple`                       |
| D07 | RGB split / glitch         | CSS → two inert package layers, ≤ 3 Hz slices                             | L         | off     | `createGlitch` / `Glitch`                       |
| D08 | Displacement-map hover     | GPU → **WebGL2** RG displacement map; static image fallback               | C         | static  | `createDisplacementHover` / `DisplacementHover` |
| D09 | Perspective grid floor     | CSS → package plane layer, engine-gated transform loop                    | W         | static  | `createPerspectiveGrid` / `PerspectiveGrid`     |
| D10 | Depth-map parallax (2.5D)  | GPU → **WebGL2** explicit depth map; static image fallback                | C         | static  | `createDepthParallax` / `DepthParallax`         |
| D11 | Tilt-shift blur            | CSS → ≤ 4 `backdrop-filter` bands with masks; tint fallback               | L²        | static  | `createTiltShift` / `TiltShift`                 |

¹ Faces are two distinct pieces of consumer content, never a duplicate. ² A package overlay instead of duplicated
content (research R2: duplicated `filter` layers rejected).

## Functional requirements

### Foundations

- **FR-001** `./advanced` and `./gpu` subpaths with `advanced.css` and `gpu.css`; `./advanced` never imports the GPU
  layer; no family imports another; SSR-safe imports; `./core` exports unchanged.
- **FR-002** Internal geometry helpers (`src/core/geometry-3d.ts`): ring radius, cube face transforms, fold clip
  polygons and flap rotation axes, cylinder curl mapping — pure, unit-tested.
- **FR-003** Attribute ledger for `inert`, `aria-hidden`, `tabindex` and ARIA attributes on consumer elements
  (capture once, restore exactly).
- **FR-004** GPU Surface Manager per research R3 (lazy contexts, budget with LRU eviction of idle surfaces, DPR and
  pixel caps, memory budget, tracked resources, loss/restore, failure reasons, shared visibility, write-phase
  resize, one draw task per frame, counters, `configureGpu`, `getGpuSupport`, `getGpuDebugInfo`).
- **FR-005** Package shaders only; validated uniforms; texture sources limited to images/canvases/bitmaps; URL maps
  loaded with `crossOrigin` (default `anonymous`); tainted textures fail to the static mode.

### Effects

- **FR-010 D01** Real 3D flip (perspective, `preserve-3d`, `backface-visibility`), imperative (`flip`, `toggle`),
  declarative (React `flipped`), progress (`seek`, `drive`, `track`); keyboard activation via native toggles;
  interruption without jumps; visible side synchronised; hidden face `inert` + `aria-hidden`; focus moved out of a
  face that turns away; exact restore; reduced motion fade or instant; fade fallback without `preserve-3d`.
- **FR-011 D02** Cube geometry with orientation and direction; forward/backward; seek, reverse, interruption; one
  interactive face; focus preserved; no overflow or layout shift (panels stacked in one cell, `perspective` on the
  root); fade fallback; size from a cached ResizeObserver box.
- **FR-012 D03** N items on a circle with radius from the item width (or explicit), camera distance (perspective),
  depth order; dynamic count (`refresh`); keyboard and controls; shortest-path retarget during rapid navigation;
  drag with velocity snap (vertical scroll kept); coherent DOM order, carousel/slide semantics and a polite live
  region; only the front item focusable.
- **FR-013 D04** WebGL2 subdivided mesh with continuous cylinder curvature, crease position, normals and lighting,
  front and back, four start corners, bidirectional progress, interruption and return; mesh sizes capped; HTML
  never textured — the CSS driver (rigid turn, documented) for live HTML and as the explicit fallback.
- **FR-014 D05** Hinged fold from the 008 prototype: the corner under the pointer recedes by default, `reverse`
  lifts it; elastic spring and natural return; continuous crease without flicker or gaps; focus, selection and
  interactive content preserved; flap inert, `aria-hidden`, ID-free; `flap: "plain"` for unsafe content; composes
  with Hover, Press, Tilt3D and the Motion Host; focus-visible fold; instant reduced motion; exact cleanup; cases for
  top-right, bottom-left, centre, fast exit and interruptions; a CornerRecede vs Tilt3D demo.
- **FR-015 D06** Real UV displacement with damped waves, multiple impacts, amplitude/frequency/damping bounds,
  deterministic seed, pointer and external progress; no loop after dissipation; no layout read per event; reduced
  motion off; static image fallback.
- **FR-016 D07** Channel-split layers with bounded slices: ≤ 3 changes per second (hard cap), bounded duration and
  intensity, eased; reduced motion off; text once; layers `aria-hidden`, inert, unselectable; safe defaults
  documented; no aggressive option.
- **FR-017 D08** Real displacement-map distortion (RG/R/G, amplitude, scale, edge modes); consumer maps under CORS;
  built-in deterministic noise map; bounded shader inputs; native image kept; static fallback.
- **FR-018 D09** CSS perspective floor: horizon, vanishing point, angle, cell, line, colour, opacity/fade, speed and
  drift; responsive; no overflow; reduced motion static; finite by default; decorative, no events; bounded plane.
- **FR-019 D10** Explicit depth map (documented contract: grayscale, white near, `invert`), proportional
  displacement, intensity and focus, pointer or external progress, edge handling with a zoom margin, validation
  (aspect, size, range), image semantics kept, load/error/CORS policy, reduced motion static, texture budget.
- **FR-020 D11** Focal region (horizontal/vertical/radial), graded blur with ≤ 2 bands per side, bounded blur and
  minimum focal size, resize-safe, tint fallback without `backdrop-filter`, reduced motion static, legible content
  (content stays in the DOM; overlay never intercepts events).

### Cross-cutting

- **FR-030** Every effect: reduced motion initial and live; exact restore; idempotent destroy; StrictMode-safe React
  components; SSR markup identical on server and client; no React render per frame.
- **FR-031** Controllable effects expose deterministic external progress (`seek`/`drive`/`track` where listed) and
  handle interruptions without jumps.
- **FR-032** GPU: test context loss, compile error, texture failure, resize, unmount mid-animation, StrictMode
  remount; contexts, buffers, textures, programs and timers released after destroy; content never hidden on
  failure.
- **FR-033** Benchmarks per performance-matrix-016; budgets from tarball bundles, proposed.
- **FR-034** Inherited: seek fallback timer test and fix (done, `961ad72`); R1/R2 and earlier regressions kept.

## Success criteria

- **SC-001** 11/11 entries implemented with their main behaviour verified in real engines (fallback rows separate).
- **SC-002** Phase 015 baseline intact: `pnpm check`; ≥ 544 earlier animations tests; ≥ 175 earlier CDP cases;
  ≥ 183 earlier cases per Playwright engine; packed consumer; routers; Storybook and Playground builds.
- **SC-003** New unit, composition, geometry, GPU-fake, browser and fallback tests pass in the three engines.
- **SC-004** No live context, resource, listener, observer or timer after destroy (counters).
- **SC-005** Three-OS CI green on the final head.
- **SC-006** Release-candidate readiness report separates verified facts, accepted limitations, pending manual
  checks and owner decisions.
