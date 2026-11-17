# Tasks: Physics, Gestures & Layout Animations (Phase 012)

Dependency-ordered. `[x]` done, `[ ]` open. Authorised by the owner brief of 2026-11-17 (slices 012.0–012.5).

## 012.0 — Specification & research

- [x] T001 Branch `feature/012-physics-gestures-layout` from `origin/main` (`804badb`); roadmap and CLAUDE.md updated
- [x] T002 Brief, spec (FR-001–FR-055), research R1–R12 (height interpolation probes in three engines)
- [x] T003 Contracts: gesture-engine, layout-engine, api-012, accessibility-012, composition-matrix-012, entry-points-012
- [x] T004 ADR 0027 (proposed); plan, tasks, analysis

## 012.1 — Physics & gesture foundation

- [x] T010 `TransformLayer.scaleX/scaleY`; `touch-action` excluded from `will-change` (FR-010, FR-006)
- [x] T011 `core/layout-box.ts` (offset chain moved from scroll; scroll suites unchanged)
- [x] T012 `core/pointer-session.ts`: listeners, capture, claims, scroll compensation, touch-action (FR-001, FR-002, FR-004–FR-006)
- [x] T013 Recogniser `createGesture` (1/2 pointers, re-basing, axis lock, threshold) (FR-003)
- [x] T014 Physics: velocity tracker, decay, rubber band, snap (FR-007)
- [x] T015 Drag motion + controls (FR-008, FR-009)
- [x] T016 `core/flip.ts` FLIP animator (FR-010)
- [x] T017 Unit tests for T010–T016 incl. cleanup and no reads per move

## 012.2 — Gesture effects

- [x] T020 G01 `drag`, G02 `dragSnap`, G07 `fling`, G03 `swipeDismiss`
- [x] T021 G05 `springFollow`, G11 `squashStretch`
- [x] T022 G08 `pinchZoom`, G09 `rotateGesture`
- [x] T023 G04 `pullToRefresh`, G06 `elasticEdge`
- [x] T024 G10 `reorder` (+ keyboard, announcements)
- [x] T025 H11 `cursorFollower`; P11 `longPress`
- [x] T026 Unit tests: keyboard paths, touch/multi-pointer, reduced motion live, cleanup

## 012.3 — Layout engine & presence

- [x] T030 Layout group (snapshot/play, shared ids) — L01, L04
- [x] T031 Reflow groups — L05, L10 (masonry spans)
- [x] T032 Height drivers — L02, L06
- [x] T033 L07 tab indicator
- [x] T034 Presence state machine + Entrance `continuous` — L08
- [x] T035 L03 list item, L09 cross-fade
- [x] T036 Unit tests incl. StrictMode, rapid changes, re-entry, watchdog, cleanup

## 012.4 — React integration & demonstrations

- [x] T040 React components and hooks (entry-points-012.md); SSR tests
- [x] T041 Storybook: Gestures, Layout, Presence stories (+ H11/P11 in Hover/Press)
- [x] T042 Playground gallery with all 23 effects; in-page suites

## 012.5 — Quality gates

- [x] T050 Composition tests (unit + browser)
- [x] T051 CDP Chrome check (real mouse, real multi-touch, keyboard, axe) and Playwright engines (+ emulated touch)
- [ ] T052 Packed consumer (SSR + hydration) done; bundle budgets proposed — owner approval pending
- [x] T053 Docs: READMEs, catalogue, architecture, roadmap; evidence.md; ADR status
- [ ] T054 `pnpm check`, Storybook/Playground builds (done locally); push; PR; three-OS CI
