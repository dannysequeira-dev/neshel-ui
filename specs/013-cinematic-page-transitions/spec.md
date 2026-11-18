# Feature Specification: Cinematic, Scenes & Page Transitions (Phase 013)

**Feature Branch**: `feature/013-cinematic-page-transitions` (from `origin/main` `b7bfe14`, after the PR
#12 squash merge)

**Created**: 2026-11-18

**Status**: **Implemented; verified locally — see [evidence.md](evidence.md); three-OS CI and the owner's review of the PR pending.**
`@neshel-ui/animations` stays private (0.0.0).

**Input**: Owner direction 2026-11-18, summarised in [brief.md](brief.md).

Companion documents: [research.md](research.md) (R1–R10), [plan.md](plan.md), [tasks.md](tasks.md),
[analysis.md](analysis.md); contracts [timeline-engine.md](contracts/timeline-engine.md),
[cinematic-api.md](contracts/cinematic-api.md), [page-transitions.md](contracts/page-transitions.md),
[router-adapters.md](contracts/router-adapters.md), [accessibility-013.md](contracts/accessibility-013.md),
[support-matrix-013.md](contracts/support-matrix-013.md),
[composition-matrix-013.md](contracts/composition-matrix-013.md),
[entry-points-013.md](contracts/entry-points-013.md); ADR
[0028](../../docs/decisions/0028-timelines-scenes-and-page-transitions.md).

## Problem

Sequenced, cinematic motion and navigation transitions are where libraries bring a second clock (timeline
engines), freeze or hijack navigation (page transition layers) and hide content behind JavaScript. Phase
013 must add timelines, scenes, cinematic layers and native View Transitions as thin layers on the 009–012
engine, with navigation that always works.

## Goals

1. A framework-free timeline engine (C01) on the 009 scheduler, run model and Motion Host.
2. Cinematic effects C02–C10 built from the timeline, Entrance definitions (as values), scroll progress
   sources (as values), the Motion Host and package-rendered layers.
3. Page transitions PT01–PT09 on native View Transitions with verified fallbacks; PT10 adapters for
   Next.js App Router and React Router plus a router-free path.
4. Evidence: unit, composition, three engines, mobile emulation, packed SSR consumer, real router
   consumers, MPA where supported, budgets, three-OS CI.

## Non-goals

Text splitting and SVG paths (014); media/ambient/feedback (015); GPU/WebGL (016); changes to Config, the
CLI, the five public packages or the release workflow; publication, versions, tags, releases; merging the
PR; Press changes unrelated to Phase 013; closing issue #9.

## Clarifications

### Session 2026-11-18 — owner brief

- Q: Which effects? → A: C01–C10, PT01–PT10 (20); parameter variants are options, not entries.
- Q: Engine dependency? → A: none; reuse Phase 009 (ADR 0020); no second scheduler or engine.
- Q: Subpaths? → A: evaluate `./cinematic` and `./page-transitions`; justify (ADR 0028).
- Q: Authority? → A: slices 013.0–013.5, commits, push and PR authorised; no merge, no publication.

### Decisions recorded by this spec (additive; no owner input needed)

- D-1 Subpaths `./cinematic` (family `cinematic`) and `./page-transitions` (family `page`) with opt-in
  `cinematic.css`, `page-transitions.css`, `page-transitions-mpa.css`; adapters in
  `./page-transitions/next` and `./page-transitions/react-router` with optional peers (ADR 0028 §1).
- D-2 The timeline lives in `./cinematic` (not `./core`, whose approved budget stays unchanged).
- D-3 Timelines trigger Entrance definitions through their existing contract (`hold`, `playback`,
  `continuous`, `replay`); Entrance and its budgets are unchanged (research R6; the scrubbable alternative is
  proposed in evidence.md §8).
- D-4 `view-transition-name`/`-class` become internal host channels excluded from `will-change` (one-line
  host change, same pattern as Phase 012's `touch-action`).
- D-5 React adapters use React's `<ViewTransition>` (19.3+) instead of calling `startViewTransition`
  around router calls (R4).
- D-6 Direction from Navigation API history indexes; `unknown` otherwise (R3).

## Functional requirements

Timeline (013.1)

- FR-001 `createTimeline` with positions, labels, pose/value/effect/timeline/call tracks
  (timeline-engine.md §2).
- FR-002 Controls and settlement exactly as §4; one promise per run; rejects only on real errors.
- FR-003 Determinism and safety rules §5.1–§5.9, each with a unit test (simultaneous starts, cancel while
  another advances, reverse mid-way, seek while active, detached target, mutating callback, failing
  awaited action, hidden page, reduced motion during playback).
- FR-004 Zero scheduler tasks when idle/paused/settled/destroyed; no layout reads by the engine.
- FR-005 Effect tracks trigger Entrance definitions through their contract — timeline-engine.md §3.
- FR-006 `useTimeline` with a stable handle; StrictMode safe; inert on the server.

Cinematic (013.2)

- FR-010 C02–C10 per cinematic-api.md, each with engine + React, `track()` builders, reduced behaviour,
  exact restoration, no-JS content.
- FR-011 C02 scrubbed by any progress source (011 `ScrollProgress`) and playable without one; CSS sticky
  pinning through `<ScrollScene>`; no hijacking.
- FR-012 C09 autoplay policy and controls of research R9.

Page transitions (013.3)

- FR-020 `getViewTransitionSupport` behavioural detection; SSR-safe.
- FR-021 `startPageTransition` lifecycle, interruption, `maxWait`, failure handling, reduced motion,
  hidden page (page-transitions.md §2).
- FR-022 Shared/persistent names: uniqueness, missing source/target, cleanup, FLIP fallback (§3).
- FR-023 Direction tracker on the Navigation API (§4).
- FR-024 Route progress (§5): indeterminate, done, fail, cancel, watchdog; accessible.
- FR-025 MPA stylesheet and helper (§6); Firefox fallback verified as plain navigation.
- FR-026 React bindings (§7).

Router integration (013.4)

- FR-030 `useRouteTransition` contract; Next and React Router adapters verified against installed
  versions (router-adapters.md).

Quality (013.5)

- FR-040 Unit tests for every FR (jsdom, manual frames, View Transition stub), cleanup counters, StrictMode.
- FR-041 Composition matrix (15 rows) in unit tests; browser rows in the lab.
- FR-042 Playground gallery + in-page suite for all 20 entries, run by the CDP check (≥ 105 earlier cases
  kept) and Playwright engines (+ emulated touch device); MPA pages in the Playground build.
- FR-043 Storybook stories for all 20 entries.
- FR-044 Packed consumer SSR + hydration of the new subpaths; router consumers.
- FR-045 Measured gzip budgets proposed for the new entries; earlier budgets unchanged.
- FR-046 `pnpm check`, Storybook/Playground builds, three-OS CI on the PR's head commit.

## Success criteria

- SC-001 20 entries implemented, each with an API, a unit test, a story and a gallery demo.
- SC-002 Zero React commits during timelines/cinematic playback (Profiler); zero scheduler tasks at rest;
  engine layout reads only at documented points (counted).
- SC-003 Navigation always completes when an effect is unavailable, skipped, interrupted or failing.
- SC-004 axe clean on the galleries; reduced motion live in three engines; C09 meets 2.2.2.
- SC-005 Three engines pass the Phase 013 suite; native/fallback statuses recorded per engine.
- SC-006 Packed SSR consumer hydrates without mismatch; router consumers pass; budgets met; CI green.
