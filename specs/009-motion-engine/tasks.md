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

- [x] T010 `cubicBezier`, `steps`, named easings, `toCssEasing` + accuracy tests (FR-040)
- [x] T011 [P] `springEasing` → `linear()` + endpoint/duration tests (FR-040)
- [x] T012 [P] `clamp`, `mix`, `progress`, `mapRange` (FR-041)
- [x] T013 `motionDefaults`; stylesheet rules read `--neshel-motion-*` with fallbacks; hygiene test (FR-042)
- [x] T014 Bundle measurement script baseline (FR-063)

## 009.2 — Host, channels, arbitration

- [x] T020 Motion host + ledger + channel handles; one write per channel per frame (FR-010–FR-014)
- [x] T021 Opacity multiply composer; exclusive channels; transform via the 008 composer (FR-012)
- [x] T022 Arbitration: priority, ties, suspension/resume, all-or-none (FR-020, FR-021)
- [x] T023 Conflict policy + messages + once-per-pair; `getMotionDebugInfo` (FR-022, FR-023)
- [x] T024 Conflict matrix tests (positive and negative), restoration tests
- [x] T025 Style ledger: capture/restore value + priority, transform prefix, opacity factor, will-change union,
  external modification adoption, no duplicate writes (FR-014–FR-018)

## 009.3 — Definitions, registries, React

- [x] T030 `defineEffect` validation + freeze; `createEffectRegistry` (FR-001–FR-003)
- [x] T031 `attachEffect` lifecycle and handle states (spec US1)
- [x] T032 `useMotionEffect`, `useMotionValue`, `useMotionValueEvent`; SSR + hydration + zero-render tests (FR-050)
- [x] T033 [P] Type fixtures (definitions, claims, hooks)

## 009.4 — Controllers and drivers

- [x] T040 Motion values; `animateValue` spring/tween; interruption semantics (FR-031)
- [x] T041 `MotionControl` state machine; typed `finished` results, rejection only on real errors (FR-030)
- [x] T042 `bindChannel` (FR-033)
- [x] T043 `animateElement` WAAPI driver; reduced-motion behaviours; commit/release (FR-032)

## 009.5 — Tilt3D migration and `./hover`

- [x] T050 `tilt3D` definition; controller/hook/component over `attachEffect` (FR-052)
- [x] T051 Exports `.`, `./core`, `./hover`, `./styles.css`; contract test, `checkAnimationsContract`,
  pack checks updated (FR-051)
- [x] T052 Lab, Storybook and tests import from `./hover`; 008 Tilt3D tests + lab 14/14 green

## 009.6 — Verification

- [x] T060 Engine lab page: lab-defined conflicting effects, controllers, WAAPI (FR-061)
- [x] T061 `check:browser:animations` extended; Playwright Chromium/Firefox/WebKit engine check (FR-061)
- [x] T062 Packed external consumer variant (Vite + SSR + hydration) (FR-062)
- [x] T063 `check:animations:bundles` (FR-063, SC-003): option B optimisation (arbiter split, dev-only
  diagnostics), definitive budgets (A), wired into CI
- [ ] T064 CI steps written (consumer in the main job, three engines in the browsers job); three-OS run
  pending an authorised push (SC-005)

## 009.7 — Evidence and docs

- [x] T070 evidence.md; roadmap, architecture, package contracts, CLAUDE.md, ADR statuses
- [ ] T071 Owner screen-reader pass (FR-064) — before publication (owner Q4)
- [x] T072 `git diff main` check of untouched packages/Changesets/release.yml (FR-070, SC-006)
