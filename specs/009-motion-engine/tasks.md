# Tasks: Motion Engine (Phase 009)

Dependency-ordered. `[P]` = parallel with the previous task. `[x]` done, `[ ]` open.
Approved 2026-11-16.

## 009.0 — Proposal

- [x] T001 Brief, spec (FR-001–FR-070), research R1–R12
- [x] T002 Contracts: effect-definition, channels-and-arbitration, controllers, motion-defaults, react-bindings
- [x] T003 ADRs 0021–0024 (proposed); plan, tasks, analysis
- [x] T004 Owner review and approval (2026-11-16; Q1–Q4 answered; requirements 3.1 and 3.2 added)
- [x] T005 Replay the branch onto `main` after the PR #4 squash merge; contracts style-ownership and controllers (3.1, 3.2)

## 009.1 — Easing, interpolation, defaults

- [ ] T010 `cubicBezier`, `steps`, named easings, `toCssEasing` + accuracy tests (FR-040)
- [ ] T011 [P] `springEasing` → `linear()` + endpoint/duration tests (FR-040)
- [ ] T012 [P] `clamp`, `mix`, `progress`, `mapRange` (FR-041)
- [ ] T013 `motionDefaults`; stylesheet rules read `--neshel-motion-*` with fallbacks; hygiene test (FR-042)
- [ ] T014 Bundle measurement script baseline (FR-063)

## 009.2 — Host, channels, arbitration

- [ ] T020 Motion host + ledger + channel handles; one write per channel per frame (FR-010–FR-014)
- [ ] T021 Opacity multiply composer; exclusive channels; transform via the 008 composer (FR-012)
- [ ] T022 Arbitration: priority, ties, suspension/resume, all-or-none (FR-020, FR-021)
- [ ] T023 Conflict policy + messages + once-per-pair; `getMotionDebugInfo` (FR-022, FR-023)
- [ ] T024 Conflict matrix tests (positive and negative), restoration tests
- [ ] T025 Style ledger: capture/restore value + priority, transform prefix, opacity factor, will-change union,
  external modification adoption, no duplicate writes (FR-014–FR-018)

## 009.3 — Definitions, registries, React

- [ ] T030 `defineEffect` validation + freeze; `createEffectRegistry` (FR-001–FR-003)
- [ ] T031 `attachEffect` lifecycle and handle states (spec US1)
- [ ] T032 `useMotionEffect`, `useMotionValue`, `useMotionValueEvent`; SSR + hydration + zero-render tests (FR-050)
- [ ] T033 [P] Type fixtures (definitions, claims, hooks)

## 009.4 — Controllers and drivers

- [ ] T040 Motion values; `animateValue` spring/tween; interruption semantics (FR-031)
- [ ] T041 `MotionControl` state machine; typed `finished` results, rejection only on real errors (FR-030)
- [ ] T042 `bindChannel` (FR-033)
- [ ] T043 `animateElement` WAAPI driver; reduced-motion behaviours; commit/release (FR-032)

## 009.5 — Tilt3D migration and `./hover`

- [ ] T050 `tilt3D` definition; controller/hook/component over `attachEffect` (FR-052)
- [ ] T051 Exports `.`, `./core`, `./hover`, `./styles.css`; contract test, `checkAnimationsContract`,
  pack checks updated (FR-051)
- [ ] T052 Lab, Storybook and tests import from `./hover`; 008 Tilt3D tests + lab 14/14 green

## 009.6 — Verification

- [ ] T060 Engine lab page: lab-defined conflicting effects, controllers, WAAPI (FR-061)
- [ ] T061 `check:browser:animations` extended; Playwright Chromium/Firefox/WebKit engine check (FR-061)
- [ ] T062 Packed external consumer variant (Vite + SSR + hydration) (FR-062)
- [ ] T063 `check:bundles:animations` with budgets (FR-063, SC-003)
- [ ] T064 CI steps; three-OS run on an authorised push (SC-005)

## 009.7 — Evidence and docs

- [ ] T070 evidence.md; roadmap, architecture, package contracts, CLAUDE.md, ADR statuses
- [ ] T071 Owner screen-reader pass recorded (FR-064)
- [ ] T072 `git diff main` check of untouched packages/Changesets/release.yml (FR-070, SC-006)
