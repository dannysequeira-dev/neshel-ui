# Tasks: Animation system foundation

Dependency-ordered. `[P]` = parallel with the previous task. `[x]` done, `[ ]` open.
Requirement links in parentheses.

## 008.0 — Architecture, contracts and technical spikes

### Specification and architecture

- [x] T001 Reconstruct context: CLAUDE.md, AGENTS.md, constitution, ADRs 0001–0017, docs, specs
  001–007, packages, validators, CI, Changesets, release scripts (research R0)
- [x] T002 brief.md, spec.md, research.md (R0–R14)
- [x] T003 Contracts: package, core-engine, composition, tilt-3d, accessibility, entry-points,
  experiments, catalogue (157 entries) (FR-100)
- [x] T004 plan.md (phases 009–016, pending decisions D1–D9), tasks.md
- [x] T005 ADRs 0018 (architecture), 0019 (composition), 0020 (dependency policy) (FR-101)
- [x] T006 Consistency analysis (analysis.md)

### Package infrastructure

- [x] T010 `packages/animations`: private manifest, tsconfigs, build, LICENSE, README (FR-001–FR-003)
- [x] T011 Core: frame scheduler, spring, transform composer, reduced-motion policy (FR-020–FR-040)
- [x] T012 [P] Contract tests: manifest, exports, dependency graph, `"use client"`, import purity,
  stylesheet (FR-001–FR-008)
- [x] T013 Core tests (FR-020–FR-034, FR-040)
- [x] T014 Workspace test updated for the seventh package; `check:pack --with <dir>`;
  `checkAnimationsContract` + positive/negative tests (FR-009, FR-091)

### Experiment A — Tilt3D

- [x] T020 Options + validation, controller, hook, component with `asChild` (FR-050–FR-064)
- [x] T021 Tests: SSR, hydration, signs, options, re-renders, touch, focus, reduced motion,
  disabled, cleanup, hook, composition (FR-050–FR-064)
- [x] T022 Type fixtures (valid / `@ts-expect-error`)
- [x] T023 Browser finding: hit area oscillation → untransformed-box hit area + regression tests (FR-065)
- [x] T024 [P] Storybook story (FR-092)

### Experiments B and C — prototypes

- [x] T030 Playground multi-page build (`animations.html`, relative base)
- [x] T031 CornerRecede: rigid, hinged fold, segmented, WebGL mesh; spring-driven amount (FR-070–FR-072)
- [x] T032 ScrollScene: sticky pin, cached geometry, resize re-measure, progress variable, depth
  layers, timeline segments, smooth scrub, `view()` enhancement (FR-080–FR-084)
- [x] T033 Visual verification screenshots; fold seam fix

### Verification

- [x] T040 `check:browser:animations` (14 cases incl. axe) (FR-090)
- [x] T041 `pnpm check`, Storybook build, playground build, `changeset status`, release guards,
  `docs:api --check`, bundle measurement (SC-001–SC-004, SC-006)
- [x] T042 CI workflow steps for `--with animations` and the lab check (verified in run 43800110693)
- [x] T043 evidence.md, roadmap, architecture, package contracts, CLAUDE.md, ADR index (FR-102)
- [x] T044 Three-OS CI run of the branch — PR #4, run 43800110693 green (14/14 jobs) after fixing the
  lab check's reduced-motion assumption found in run 43796180289 (SC-007)
- [ ] T045 Firefox/WebKit run of the lab — moved to 009 (research R2)
- [ ] T046 Owner review and closure of 008.0

## 009 and later

Planned in [plan.md](plan.md#phase-roadmap-proposal-each-phase-its-own-spec-and-owner-gate); each
phase gets its own tasks after its spec is approved.
