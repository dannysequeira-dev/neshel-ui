# Tasks: Scroll Engine, Scroll Triggers & Parallax (Phase 011)

Dependency-ordered. `[x]` done, `[ ]` open. Authorised by the owner brief of 2026-11-16 (slices 011.0–011.5).

## 011.0 — Specification & research

- [x] T001 Branch `feature/011-scroll-parallax` from `origin/main` (`70d852b`); roadmap and CLAUDE.md updated; attribution settings
- [x] T002 Brief, spec (FR-001–FR-054), research R1–R10 (native SDA probes in three engines)
- [x] T003 Contracts: scroll-engine, api-011, composition-matrix-011, accessibility-011, entry-points-011
- [x] T004 ADR 0026 (proposed); plan, tasks, analysis

## 011.1 — Scroll engine foundation

- [ ] T010 Sources (passive listener, read-phase position, velocity, direction, trailing frame) (FR-001, FR-004)
- [ ] T011 Geometry: offset chain, range table, shared observers, invalidation, refresh, diagnose (FR-002, FR-003)
- [ ] T012 `createScrollProgress` (lazy, smooth/SP10, reduced) (FR-005)
- [ ] T013 Native driver + behavioural check + fallback (FR-006)
- [ ] T014 In-view pool, presets (ST10), trigger state machine (ST03/ST04), section spy (ST08) (FR-007)
- [ ] T015 Unit tests: ranges, directions, fast reversal, start/end, containers, resize, insertion above, compensated changes, several timelines, cleanup, no layout reads on scroll

## 011.2 — Scroll Triggers

- [ ] T020 Entrance `hold`/`direction` (additive) + stagger forwarding; 010 suites unchanged
- [ ] T021 ST01 `revealOnEnter`, ST02 `staggerOnEnter`, ST03 modes, ST04 callbacks
- [ ] T022 ST05 `inViewProgress`, ST06 `directionHeader`, ST07 `stuckState`, ST09 `lazyEffect`
- [ ] T023 Tests (reduced live, hydration hold rules, print, composition with Hover)

## 011.3 — Scroll & Parallax

- [ ] T030 `composeTransform` skew (additive)
- [ ] T031 SP01, SP02, SP03, SP05, SP06, SP07, SP08, SP09, SP11 definitions; SP10 smoothing
- [ ] T032 Tests (composition matrix, reduced, cleanup)

## 011.4 — ScrollScene & integration

- [ ] T040 React primitives and hooks; SP04 `HorizontalScroll` with focus management
- [ ] T041 `scroll.css`; exports `./scroll`, `./scroll.css`; styles.css concat; contract test (R-1, family isolation)
- [ ] T042 Playground gallery (21 effects; prototype migrated) and lab checks (Chrome + three engines)
- [ ] T043 Storybook stories; packed SSR consumer page; bundle budgets

## 011.5 — Quality gates & PR

- [ ] T050 `pnpm check`, browser lab, engines, consumer, bundles, Storybook/Playground builds
- [ ] T051 Visual review captures; evidence.md; catalogue and roadmap updated
- [ ] T052 Push, three-OS CI, PR for owner review (no merge)
