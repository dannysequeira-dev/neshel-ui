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

- [x] T010 Core internals: progress driver, loop, channel writer (D-2)
- [x] T011 Segmentation + fallback (FR-001)
- [x] T012 `splitText` (FR-002): accessible copy, content policy, runs, shaping rule, lines, revert, counters
- [x] T013 `useSplitText` (FR-003); Unicode corpus, restoration, SSR and StrictMode tests

## 014.2 — Typography effects

- [x] T020 T01 reveal + T11 line reveal
- [x] T021 T02 typewriter, T03 scramble
- [x] T022 T04 sweep, T08 highlighter, T09 mask
- [x] T023 T05 number roll (FR-011)
- [x] T024 T06 rotating words, T07 wave
- [x] T025 T10 font axes (FR-012)
- [x] T026 React components, `text.css`, unit tests incl. restoration, reduced motion and StrictMode

## 014.3 — SVG geometry foundation

- [x] T030 Path data parser/serializer (FR-020)
- [x] T031 Geometry + `measurePath` (FR-021)
- [x] T032 Morph compatibility/interpolation (FR-022); attribute ledger; corpus tests

## 014.4 — SVG effects

- [x] T040 S01 draw, S06 chart, S10 checkmark
- [x] T041 S02 morph, S04 icon morph
- [x] T042 S03 motion path (native + fallback)
- [x] T043 S05 stops, S07 turbulence, S08 logo, S09 dash flow
- [x] T044 React hooks/components, `svg.css`, unit tests

## 014.5 — Integration & quality gates

- [x] T050 Playground text/SVG gallery + in-page suite (21 entries); real variable font
- [x] T051 CDP and Playwright cases; ≥ 125 earlier CDP cases kept
- [x] T052 Storybook stories (21 entries)
- [x] T053 Composition tests (18 rows); performance measurements
- [x] T054 Packed consumer (SSR + hydration); bundle budgets proposed
- [x] T055 Package contract/pack checks, catalogue, README, docs; `pnpm check`; builds
- [x] T056 Push, PR, three-OS CI on the head commit; evidence

## 014.6 — Owner review of PR #15 (issuecomment-7056966484)

- [x] T060 Regression tests first (`test/review-014.test.mjs`): R1 RotatingWords listeners/StrictMode, R2 concurrent
  attribute writers, R3 loop track subscriptions; failing evidence recorded before the fixes
- [x] T061 Minimal fixes: focusout handler identity; shared per-element attribute ledger (ADR 0022 policy);
  track unsubscription on destroy; compacted within the approved budgets
- [x] T062 K-5 benchmark (`pnpm bench:animations:text`): idle/static/animated, 20–2000 pieces, three engines, 4× CPU
- [x] T063 K-5 default: TextReveal/TextWave `maxPieces` 200 with dev warning; explicit opt-in kept
- [x] T064 ADR 0029 Accepted; contracts, evidence §8/§9/§12, roadmap, CLAUDE.md; all local gates; three-OS CI
