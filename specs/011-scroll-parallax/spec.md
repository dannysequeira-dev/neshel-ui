# Feature Specification: Scroll Engine, Scroll Triggers & Parallax (Phase 011)

**Feature Branch**: `feature/011-scroll-parallax` (from `origin/main` `70d852b`, after the PR #7 squash merge)

**Created**: 2026-11-16

**Status**: **Implemented; verified locally — see [evidence.md](evidence.md); CI and the owner's review of
the PR pending.**
`@neshel-ui/animations` stays private (0.0.0).

**Input**: Owner direction 2026-11-16, summarised in [brief.md](brief.md).

Companion documents: [research.md](research.md) (R1–R10), [plan.md](plan.md), [tasks.md](tasks.md),
[analysis.md](analysis.md); contracts [scroll-engine.md](contracts/scroll-engine.md),
[api-011.md](contracts/api-011.md), [composition-matrix-011.md](contracts/composition-matrix-011.md),
[accessibility-011.md](contracts/accessibility-011.md), [entry-points-011.md](contracts/entry-points-011.md);
ADR [0026](../../docs/decisions/0026-scroll-engine-and-drivers.md).

## Problem

Scroll-linked motion is where animation libraries most often hurt users (hijacked scrolling, hidden
content, layout thrashing on every scroll event) and where effects most often fight each other (a native
scroll animation on `transform` erases every other transform). The 008.0 prototype proved sticky pinning,
cached geometry and spring smoothing, but it is playground code with a single scene.

## Goals

1. A scroll engine on the 009 scheduler/host: shared sources, one progress model for viewport and inner
   containers, a geometry cache with complete invalidation, IntersectionObserver triggers, a native
   driver for custom properties with a verified JS fallback.
2. The 21 catalogue effects ST01–ST10 and SP01–SP11, functional, composable, accessible, SSR-safe.
3. A declarative ScrollScene API (`<ScrollScene>`, `<ScrollLayer>`, `useScrollProgress`) for Phase 013.
4. Evidence: three engines, packed SSR consumer, performance with many scenes, measured budgets.

## Non-goals

Timelines/sequencer and scene chapters (013); presence/exit and FLIP (012); smooth-scrolling of the page
itself (never: no hijacking); changes to Config, the CLI, the five public packages or the release
workflow; publication, versions, tags, releases; merging the PR.

## Clarifications

### Session 2026-11-16 — owner brief

- Q: Exactly which effects? → A: ST01–ST10 and SP01–SP11 (21); options are not extra entries.
- Q: Engine dependency? → A: none (no GSAP/Motion); own engine on Phase 009.
- Q: Native vs JS? → A: progressive enhancement; native where it meets the contract, verified fallback.
- Q: Where does the API live? → A: `@neshel-ui/animations/scroll` (+ optional `scroll.css`).
- Q: Authority? → A: slices 011.0–011.5, commits, push and PR authorised; stop only for incompatible
  contract changes or significant dependencies; no merge.

### Decisions recorded by this spec (no owner input needed; additive)

- D-1 The engine lives in `./scroll`, not `./core` (core budget and surface unchanged) — ADR 0026.
- D-2 The native driver writes only registered custom properties (research R2) — ADR 0026.
- D-3 Entrance gains `hold` and `playback` (additive) so ST01–ST03 reuse Entrance presets (research R8).
- D-4 `TransformLayer` gains `skewX/skewY` (additive) for SP11 (research R10).
- D-5 ST03 (modes) and ST04 (callbacks) are two facets of one trigger state machine; each has its own API
  surface, tests and gallery demo; neither is counted twice in code.

## Functional requirements

Engine (011.1)

- FR-001 One scroll record per source with a passive listener; scroll causes only scroll-position reads,
  batched in the read phase (scroll-engine.md §1, R6).
- FR-002 `createScrollProgress` implements the range table of scroll-engine.md §2 for block and inline
  axes, viewport and element sources; progress clamped to [0, 1].
- FR-003 Geometry measured in read phases only, on the invalidation signals of §3; observers shared and
  reference-counted; `refresh()`/`refreshScroll()`; `diagnose()` drift.
- FR-004 Velocity (px/s) and direction per source; trailing settle frame.
- FR-005 Lazy timelines: no work without subscribers; idle page = no frame task.
- FR-006 Native driver per §4 with behavioural verification and fallback; string ranges; registered
  properties; claims kept.
- FR-007 Pooled `observeInView`; `createScrollTrigger` state machine with four callbacks and `once`.
- FR-008 SSR-safe: nothing at import; inert on the server.

Effects (011.2–011.3): FR-020 ST01–ST10 and FR-030 SP01–SP11 as in api-011.md §1–§2, each with its reduced
behaviour (accessibility-011.md §4). FR-021 ST01/ST02 accept Entrance definitions/presets (no copies).
FR-031 SP01/SP05/SP10 replace the playground prototype; the 008.0 lab checks keep passing against the
package implementation.

Integration (011.4): FR-040 React API of api-011.md §4; FR-041 `scroll.css` (no transition/animation on
consumer elements, R-1); FR-042 composition matrix; FR-043 Storybook + Playground gallery of all 21 with
the real exports; FR-044 packed SSR consumer; FR-045 budgets.

Quality (011.5): FR-050 the scroll cases of the brief §10 covered by unit tests (jsdom with controlled
geometry) or the browser lab (real layout); FR-051 three engines; FR-052 performance metrics with many
scenes; FR-053 three-OS CI; FR-054 evidence and PR.

## Success criteria

- SC-001 21/21 effects with tests and a gallery demo; inventory in evidence.
- SC-002 Zero layout reads during scroll bursts (counter-instrumented, lab and unit).
- SC-003 Geometry drift < 1 px after resize, insertion above, late content and compensated changes.
- SC-004 Native and JS drivers agree within 0.02 progress in all three engines.
- SC-005 Composition matrix rows pass; destroy restores styles.
- SC-006 No hijacking: no non-passive scroll/wheel/touch listener (instrumented), anchors and keyboard
  scrolling verified in the lab.
- SC-007 Reduced motion live switches verified per effect; reveals never leave content hidden.
- SC-008 `pnpm check`, `check:pack --with animations`, browser lab, three engines, packed SSR consumer,
  Storybook/Playground builds, budgets and three-OS CI pass (or are recorded as unverified).
