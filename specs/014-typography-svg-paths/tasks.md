# Tasks: Typography & Text, SVG & Paths (Phase 014)

Dependency-ordered. `[x]` done, `[ ]` open. Authorised by the owner brief of 2026-11-19 (slices
014.0–014.5).

## 014.0 — Specification & research

- [x] T001 Branch `feature/014-typography-svg-paths` from `origin/main` (`7207638`); roadmap and CLAUDE.md
  updated (013 merged; 014 current)
- [x] T002 Brief, spec (FR-001–FR-046, inventory), research R1–R15
- [x] T003 Contracts: text-splitter, text-api, svg-geometry, svg-api, accessibility-014, support-matrix-014,
  composition-matrix-014, entry-points-014
- [x] T004 ADR 0029 (proposed); plan, tasks, analysis, manual checks

## 014.1 — Accessible text foundation

- [ ] T010 Core internals: progress driver, loop, channel writer (D-2)
- [ ] T011 Segmentation + fallback (FR-001)
- [ ] T012 `splitText` (FR-002): accessible copy, content policy, runs, shaping rule, lines, revert, counters
- [ ] T013 `useSplitText` (FR-003); Unicode corpus, restoration, SSR and StrictMode tests

## 014.2 — Typography effects

- [ ] T020 T01 reveal + T11 line reveal
- [ ] T021 T02 typewriter, T03 scramble
- [ ] T022 T04 sweep, T08 highlighter, T09 mask
- [ ] T023 T05 number roll (FR-011)
- [ ] T024 T06 rotating words, T07 wave
- [ ] T025 T10 font axes (FR-012)
- [ ] T026 React components, `text.css`, unit tests incl. restoration, reduced motion and StrictMode

## 014.3 — SVG geometry foundation

- [ ] T030 Path data parser/serializer (FR-020)
- [ ] T031 Geometry + `measurePath` (FR-021)
- [ ] T032 Morph compatibility/interpolation (FR-022); attribute ledger; corpus tests

## 014.4 — SVG effects

- [ ] T040 S01 draw, S06 chart, S10 checkmark
- [ ] T041 S02 morph, S04 icon morph
- [ ] T042 S03 motion path (native + fallback)
- [ ] T043 S05 stops, S07 turbulence, S08 logo, S09 dash flow
- [ ] T044 React hooks/components, `svg.css`, unit tests

## 014.5 — Integration & quality gates

- [ ] T050 Playground text/SVG gallery + in-page suite (21 entries); real variable font
- [ ] T051 CDP and Playwright cases; ≥ 125 earlier CDP cases kept
- [ ] T052 Storybook stories (21 entries)
- [ ] T053 Composition tests (18 rows); performance measurements
- [ ] T054 Packed consumer (SSR + hydration); bundle budgets proposed
- [ ] T055 Package contract/pack checks, catalogue, README, docs; `pnpm check`; builds
- [ ] T056 Push, PR, three-OS CI on the head commit; evidence
