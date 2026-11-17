# Tasks: Scroll Engine, Scroll Triggers & Parallax (Phase 011)

Dependency-ordered. `[x]` done, `[ ]` open. Authorised by the owner brief of 2026-11-16 (slices 011.0–011.5).

## 011.0 — Specification & research

- [x] T001 Branch `feature/011-scroll-parallax` from `origin/main` (`70d852b`); roadmap and CLAUDE.md updated; attribution settings
- [x] T002 Brief, spec (FR-001–FR-054), research R1–R10 (native SDA probes in three engines)
- [x] T003 Contracts: scroll-engine, api-011, composition-matrix-011, accessibility-011, entry-points-011
- [x] T004 ADR 0026 (proposed); plan, tasks, analysis

## 011.1 — Scroll engine foundation

- [x] T010 Sources (passive listener, read-phase position, velocity, direction, trailing frame) (FR-001, FR-004)
- [x] T011 Geometry: offset chain, range table, shared observers, invalidation, refresh, diagnose (FR-002, FR-003)
- [x] T012 `createScrollProgress` (lazy, smooth/SP10, reduced) (FR-005)
- [x] T013 Native driver + behavioural check + fallback (FR-006)
- [x] T014 In-view pool, presets (ST10), trigger state machine (ST03/ST04), section spy (ST08) (FR-007)
- [x] T015 Unit tests: ranges, directions, fast reversal, start/end, containers, resize, insertion above, compensated changes, several timelines, cleanup, no layout reads on scroll

## 011.2 — Scroll Triggers

- [x] T020 Entrance `hold`/`playback` (additive) + stagger forwarding; 010 suites unchanged
- [x] T021 ST01 `revealOnEnter`, ST02 `staggerOnEnter`, ST03 modes, ST04 callbacks
- [x] T022 ST05 `inViewProgress`, ST06 `directionHeader`, ST07 `stuckState`, ST09 `lazyEffect`
- [x] T023 Tests (reduced live, hydration hold rules, print, composition with Hover)

## 011.3 — Scroll & Parallax

- [x] T030 `composeTransform` skew (additive)
- [x] T031 SP01, SP02, SP03, SP05, SP06, SP07, SP08, SP09, SP11 definitions; SP10 smoothing
- [x] T032 Tests (composition matrix, reduced, cleanup)

## 011.4 — ScrollScene & integration

- [x] T040 React primitives and hooks; SP04 `HorizontalScroll` with focus management
- [x] T041 `scroll.css`; exports `./scroll`, `./scroll.css`; styles.css concat; contract test (R-1, family isolation)
- [x] T042 Playground gallery (21 effects; prototype migrated) and lab checks (Chrome + three engines)
- [x] T043 Storybook stories; packed SSR consumer page; bundle budgets

## 011.5 — Quality gates & PR

- [x] T050 `pnpm check`, browser lab, engines, consumer, bundles, Storybook/Playground builds
- [x] T051 Visual review captures; evidence.md; catalogue and roadmap updated
- [x] T052 Push, three-OS CI (run 44110787974, 14/14), PR #8 for owner review (no merge)

## 011.6 — Owner review of PR #8 (2026-11-17)

- [x] T060 Regression tests first (`packages/animations/test/scroll-review.test.mjs`): 6 tests, all failing
  against `8af81d5` — SP04 explicit `pinned` under live reduced motion, SP04 `--neshel-hscroll-distance`
  restoration and external edits, SP08 `themeTarget` changes and `themes` removal
- [x] T061 Fixes: SP04 `pinned` stacks under reduced motion; SP04 distance written through the motion host;
  SP08 theme writer follows its target; contracts (accessibility-011 §4, api-011 §2) updated
- [x] T062 Lab: explicit `layout="pinned"` SP04 in the gallery, covered by the live reduced-motion case
  (Chrome + three engines)
- [x] T063 ADR 0026 Accepted (owner approval; compositor wording corrected); budgets approved unchanged
- [ ] T064 Gates, push to PR #8, three-OS CI (no merge)
