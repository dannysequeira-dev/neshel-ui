# Tasks: Cinematic, Scenes & Page Transitions (Phase 013)

Dependency-ordered. `[x]` done, `[ ]` open. Authorised by the owner brief of 2026-11-18 (slices
013.0–013.5).

## 013.0 — Specification & research

- [x] T001 Branch `feature/013-cinematic-page-transitions` from `origin/main` (`b7bfe14`); roadmap and
      CLAUDE.md updated (012 and #9/#11 merged; 013 current)
- [x] T002 Brief, spec (FR-001–FR-046), research R1–R10 (VT, MPA and Navigation API probes in three engines)
- [x] T003 Contracts: timeline-engine, cinematic-api, page-transitions, router-adapters, accessibility-013,
      support-matrix-013, composition-matrix-013, entry-points-013
- [x] T004 ADR 0028 (proposed); plan, tasks, analysis

## 013.1 — Timeline foundation

- [x] T010 `EffectDefinition.drivable`; host excludes `view-transition-*` from `will-change` (D-3, D-4)
- [x] T011 Entrance `progress` option + `drivable` span (FR-005)
- [x] T012 Timeline engine: positions, labels, tracks, controls, callbacks, waits, retarget (FR-001, FR-002)
- [x] T013 Edge-case tests of research R5 (FR-003, FR-004)
- [x] T014 `useTimeline` (FR-006)

## 013.2 — Cinematic effects

- [x] T020 C02 scene chapters (+ progress-source scrub, clock mode)
- [x] T021 C03 camera
- [x] T022 C04/C05 covers
- [x] T023 C06 title sequence
- [x] T024 C07 spotlight, C08 depth of field
- [x] T025 C09 storyboard
- [x] T026 C10 letterbox
- [x] T027 React components, `cinematic.css`, unit tests incl. restoration and StrictMode

## 013.3 — Page transitions foundation

- [x] T030 Support detection, controller, names, FLIP fallback (FR-020–FR-022)
- [x] T031 Direction tracker, route progress (FR-023, FR-024)
- [x] T032 MPA stylesheet + helper (FR-025)
- [x] T033 React bindings (FR-026); unit tests with the VT stub

## 013.4 — Router integration

- [ ] T040 `useRouteTransition`; Next adapter; React Router adapter (after reading installed types)
- [ ] T041 Router consumers check (`check:animations:routers`)

## 013.5 — Galleries & quality gates

- [ ] T050 Playground cinematic + page-transitions galleries, MPA pages, in-page suites
- [ ] T051 CDP and Playwright cases; emulated touch; ≥ 105 earlier cases kept
- [ ] T052 Storybook stories (20 entries)
- [ ] T053 Composition tests (15 rows); stress and performance measurements
- [ ] T054 Packed consumer (SSR + hydration); bundle budgets proposed
- [ ] T055 Package contract/pack checks, catalogue, README, docs; `pnpm check`; builds
- [ ] T056 Push, PR, three-OS CI on the head commit; evidence
