# Tasks: Animation Effects & Presets (Phase 010)

Dependency-ordered. `[P]` = parallel with the previous task. `[x]` done, `[ ]` open.
Authorised by the owner brief of 2026-11-16 (slices 010.0–010.4).

## 010.0 — Specification & preset architecture

- [x] T001 Branch `feature/010-entrance-hover-press` from `origin/main` (`44dc1c9`); clean tree verified
- [x] T002 Brief, spec (FR-001–FR-075), research R1–R11
- [x] T003 Contracts: presets, drivers-and-css, effects-010, composition-matrix, accessibility-010, entry-points-010
- [x] T004 ADR 0025 (proposed); plan, tasks, analysis

## 010.1 — Entrance & Reveal

- [x] T010 Core: `definePreset`/`attachPreset`; internal tokens, validator, spring rig, `afterDelay` (FR-001, FR-004, FR-011)
- [x] T011 Entrance factory on 009 controllers: transform layer + opacity + exclusive paint channels (FR-020)
- [x] T012 E01–E09, E11 definitions and named presets (FR-020)
- [x] T013 E10 `stagger` (bounded total, order) (FR-020)
- [x] T014 `<Reveal>` / `<Stagger>` with `appear` + `replayKey`; `useMotionPresets` (layout effect) (FR-060)
- [x] T015 Tests: every entrance, reduced motion (fade/instant, live), hidden page, replay, SSR, hydration skip (FR-070)

## 010.2 — Hover & Pointer

- [x] T020 Core internals: `trackPointer` (box hit area), `watchHover` (pointer + focus-visible) (FR-060)
- [x] T021 Hover driver; H01, H02, H04–H10 definitions; `<Hover>` with preset lists (FR-021)
- [x] T022 hover.css: decor `::before` composition, `::after` ring + `@property` (FR-012, FR-040)
- [x] T023 Tests: each effect, focus-visible, touch opt-in, reduced, tokens, ring arbitration; Tilt3D suite unchanged (FR-070)

## 010.3 — Press & Microinteractions

- [x] T030 `watchPress`; P01, P03, P07, P08 on transform layers; P02, P06 WAAPI owned layers (FR-022, FR-013)
- [x] T031 P04, P05, P09, P10 definitions + components (owned DOM) (FR-022)
- [x] T032 press.css (FR-040)
- [x] T033 Tests: each effect, keyboard press, disabled, triggers, void elements, shake warning, SSR markup, a11y copies (FR-070)

## 010.4 — Integration & quality gates

- [x] T040 Composition and conflict tests on one element (FR-030–FR-032)
- [x] T041 Type tests (positive and negative) for presets and primitives (FR-070)
- [x] T042 Package contract test + `checkAnimationsContract` + `check:pack --with animations` (FR-050)
- [x] T043 Playground gallery (30 effects, options, reduced, compositions) + in-page suite + spike cases (FR-071)
- [x] T044 Real-input cases in `check:browser:animations` (CDP) and `check:animations:engines` (Playwright) (FR-071)
- [x] T045 Storybook stories per family (FR-074)
- [x] T046 Packed consumer extended (Vite, SSR, hydration, interaction) (FR-072)
- [x] T047 Bundle entries + markers; budgets proposed from measurements (FR-073)
- [x] T048 Docs: catalogue statuses, roadmap, README, CLAUDE.md, ADR index; evidence.md
- [ ] T049 Push, PR, CI on Linux/Windows/macOS (FR-075); owner review — **no automatic merge**
