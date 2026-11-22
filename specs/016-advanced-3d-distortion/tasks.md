# Tasks: Advanced 3D & Distortion (Phase 016)

Dependency-ordered. `[x]` done, `[ ]` open. Authorised by the owner brief of 2026-11-22 (slices 016.0–016.6).

## 016.0 — Research, contracts & GPU decision

- [x] T001 State recovery: CLAUDE.md, constitution, vision, architecture, roadmap, ADRs 0018–0030, 008 R7, catalogue,
  015 evidence; main CI 45079243865 verified (attempt 1 failed only on the known Components nested-overlay timing in
  `browsers / macos-latest`; attempt 2 success 14/14); branch from `origin/main` `da79b4a`
- [x] T002 Inherited §17: seek fallback timer — regression tests first (2 of 3 failing), per-cycle timer cleared on
  frame/next seeked/destroy (`961ad72`)
- [x] T003 Spike `scripts/bench-animations-spike-016.mjs` (WebGL2/WebGPU availability, context ceiling, meshes,
  shaders, Canvas 2D, CSS) + measured library sizes; research R1–R18
- [x] T004 Contracts: advanced-api, gpu-api, accessibility-016, support-matrix-016, composition-matrix-016,
  performance-matrix-016, entry-points-016
- [x] T005 ADR 0031 (Proposed); spec, plan, tasks, analysis, manual checks; CLAUDE.md and roadmap (015 merged, 016
  current)

## 016.1 — CSS 3D foundations

- [ ] T010 `core/geometry-3d.ts`, `core/attributes.ts`, `core/visibility-gate.ts` + tests
- [ ] T011 D01 card flip
- [ ] T012 D02 cube rotation
- [ ] T013 D03 ring carousel
- [ ] T014 D05 CornerRecede (from the 008 R7 prototype) + clone helper
- [ ] T015 D07 RGB split / glitch
- [ ] T016 D09 perspective grid floor
- [ ] T017 D11 tilt-shift blur
- [ ] T018 React components, `advanced.css`, `./advanced` subpath, unit tests (StrictMode, SSR)

## 016.2 — Optional graphics foundation

- [ ] T020 GPU Surface Manager (manager, surface, programs, textures) + fake WebGL2 helper + tests (loss/restore,
  compile failure, CORS, budget, eviction, one draw task, counters)

## 016.3 — GPU effects

- [ ] T030 D04 page curl (mesh + CSS driver)
- [ ] T031 D06 ripple
- [ ] T032 D08 displacement-map hover
- [ ] T033 D10 depth-map parallax
- [ ] T034 React components, `gpu.css`, `./gpu` subpath, unit tests

## 016.4 — Composition & accessibility

- [ ] T040 Composition tests (14 rows)
- [ ] T041 Playground gallery + in-page suite (11 entries + CornerRecede vs Tilt3D)
- [ ] T042 CDP and Playwright cases; earlier cases kept

## 016.5 — Catalogue completion & quality gates

- [ ] T050 Storybook stories (11 entries)
- [ ] T051 Package contract/pack checks, packed consumer (SSR + hydration), routers, bundle budgets (proposed)
- [ ] T052 Benchmarks (performance matrix)
- [ ] T053 Catalogue, README, docs, CLAUDE.md commands; `pnpm check`; builds

## 016.6 — Private release-candidate readiness

- [ ] T060 `release-candidate.md` (verified, accepted limitations, pending manual checks, owner decisions)
- [ ] T061 Push, PR, three-OS CI on the final head; evidence
