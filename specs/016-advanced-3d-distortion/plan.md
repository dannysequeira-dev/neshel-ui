# Plan — Phase 016

## Technical context

React 19 (peer `^19.0.0`), TypeScript strict, ESM, `tsc` builds per package, `node:test` against `dist` with jsdom,
a manual `requestAnimationFrame` and (new) a fake WebGL2 context; Biome; Storybook (React/Vite); Playground lab
(Vite); CDP Chrome check; Playwright engines check; packed-tarball consumer, routers and bundle checks. No new
runtime dependency. Lab images (front/under pages, displacement maps, depth maps) are generated locally on Canvas 2D
(no third-party content).

## Module structure

```
packages/animations/src/
  core/geometry-3d.ts        ring, cube, fold and curl math (pure; shared by ./advanced and ./gpu)
  core/attributes.ts         attribute ledger (inert, aria-hidden, tabindex, ARIA) with exact restore
  core/visibility-gate.ts    shared IntersectionObserver + visibilitychange gate (advanced D09, gpu surfaces)
  advanced/engine/debug.ts   counters
  advanced/flip.ts (D01) cube.ts (D02) ring.ts (D03) corner.ts (D05) glitch.ts (D07) grid.ts (D09) tilt-shift.ts (D11)
  advanced/clone.ts          inert, ID-free content copies (D05 flap, D07 layers)
  advanced/react.tsx advanced/index.ts advanced/advanced.css
  gpu/engine/manager.ts      context budget, eviction, shared draw task, visibility, config, counters
  gpu/engine/surface.ts      WebGL2 surface: ensure/resize/draw/release, tracked resources, loss/restore
  gpu/engine/programs.ts     compile/link with failure modes; mesh + quad helpers
  gpu/engine/textures.ts     source validation, CORS, downscale, budget, generated maps (noise)
  gpu/engine/image-effect.ts common frame/img/canvas wiring (opacity hand-over, fallback, reduced motion)
  gpu/shaders.ts             the four effects' GLSL ES 3.00 constants
  gpu/page-curl.ts (D04) ripple.ts (D06) displacement.ts (D08) depth-parallax.ts (D10)
  gpu/react.tsx gpu/index.ts gpu/gpu.css
```

## Slices

| Slice | Content                                                                                                             | Gate                                     |
| ----- | ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| 016.0 | brief, research + spike, contracts, ADR 0031 (Proposed), spec, plan, tasks, analysis, manual checks; seek timer fix | documents consistent (analysis.md)       |
| 016.1 | core geometry/attributes/gate; D01, D02, D03, D05, D07, D09, D11 + React + `advanced.css` + tests                   | unit tests; typecheck; lint              |
| 016.2 | GPU Surface Manager, programs, textures, fake WebGL2 test helper, tests                                             | unit tests (loss, compile, CORS, budget) |
| 016.3 | D04, D06, D08, D10 + React + `gpu.css` + tests                                                                      | unit tests                               |
| 016.4 | composition tests; Playground gallery + in-page suite; CDP and Playwright cases                                     | browser checks in 3 engines              |
| 016.5 | Storybook stories; package exports/pack/consumer/bundles; benchmarks; catalogue, README, docs                       | `pnpm check`; all browser checks         |
| 016.6 | release-candidate readiness report; push; PR; three-OS CI; evidence                                                 | 3-OS CI green; owner review              |

## Test strategy

- **Unit (jsdom):** manual frames; host style snapshots; attribute snapshots; geometry assertions (radius, face
  transforms, fold polygons, curl mapping continuity at both seams); fake WebGL2 (call log, live-object counts,
  failure switches, loss/restore); counters back to zero; StrictMode; SSR markup; Node import without DOM.
- **Browser:** in-page suite `runAdvancedSuite()` shared by CDP and Playwright: real pointer/keyboard input, focus
  and `inert` checks, computed transforms and angles, fold polygon continuity, glitch rate sampling, WebGL2 pixel
  probes (`readPixels` after a synchronous debug draw), forced context loss/restore, forced compile failure, a
  WebGL-disabled frame for fallback rows, reduced motion live, axe.
- **Performance:** `scripts/bench-animations-advanced.mjs` (performance-matrix-016.md) and the 016.0 spike.

## Risks

| Risk                                              | Mitigation                                                             |
| ------------------------------------------------- | ---------------------------------------------------------------------- |
| Headless WebGL is software/masked                 | no physical-GPU claims; CPU submission time only; manual checks listed |
| `preserve-3d` flattening differences (WebKit)     | per-face transforms where possible (D02); z-index backup (D03)         |
| Clone fidelity for D05 (styles keyed on ancestry) | documented limits; `flap: "plain"`; MutationObserver sync while folded |
| Context limits (16 per page measured)             | budget 6, LRU eviction of idle surfaces, waiting queue                 |
| Budget pressure                                   | new entries only; measured; proposed for owner approval                |
