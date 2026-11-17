# Feature Specification: Physics, Gestures & Layout Animations (Phase 012)

**Feature Branch**: `feature/012-physics-gestures-layout` (from `origin/main` `804badb`, after the PR #8
squash merge)

**Created**: 2026-11-17

**Status**: **Implemented; verified locally — see [evidence.md](evidence.md); budgets, CI and the owner's
review of the PR pending.** `@neshel-ui/animations` stays private (0.0.0).

**Input**: Owner direction 2026-11-17, summarised in [brief.md](brief.md).

Companion documents: [research.md](research.md) (R1–R12), [plan.md](plan.md), [tasks.md](tasks.md),
[analysis.md](analysis.md); contracts [gesture-engine.md](contracts/gesture-engine.md),
[layout-engine.md](contracts/layout-engine.md), [api-012.md](contracts/api-012.md),
[accessibility-012.md](contracts/accessibility-012.md),
[composition-matrix-012.md](contracts/composition-matrix-012.md),
[entry-points-012.md](contracts/entry-points-012.md); ADR
[0027](../../docs/decisions/0027-gesture-and-layout-engines.md).

## Problem

Gestures and layout animations are where motion libraries most often bring a second engine: their own
pointer loop, physics integrator, transform writer and measurement pass. In Neshel-UI that would break
composition (two writers of `transform`), cost (listeners per effect, layout reads per pointer move) and
accessibility (drag-only interactions, removed content that keeps focus). Phase 012 must add physics,
gestures, FLIP and presence as thin layers on the 009–011 engine.

## Goals

1. Shared primitives: a pointer session per element (capture, multi-pointer, scroll compensation,
   competition, `touch-action` composition), a recogniser (drag/transform gestures, velocity), physics
   (decay, rubber band, snap) on the existing spring integrator, a FLIP animator, layout groups, reflow
   groups, height drivers and a presence state machine.
2. The 23 catalogue effects G01–G11, L01–L10, H11, P11 — real, composable, accessible, SSR-safe.
3. React components and hooks for every effect; galleries in Storybook and the Playground lab.
4. Evidence: three engines, emulated touch, composition, packed SSR consumer, measured budgets, 3-OS CI.

## Non-goals

Page transitions, navigation and View Transitions (013); timelines (013); text/SVG (014); changes to
Config, the CLI, the five public packages or the release workflow; publication, versions, tags, releases;
merging the PR; issue #9 (ContentSwap flakiness — independent work).

## Clarifications

### Session 2026-11-17 — owner brief

- Q: Which effects? → A: G01–G11, L01–L10, H11, P11 (23); parameter variants are not extra entries.
- Q: Engine dependency? → A: none; own primitives on Phase 009 (ADR 0020).
- Q: Where do they live? → A: evaluate `./gestures` and `./layout`; H11 in `./hover`, P11 in `./press`.
- Q: Authority? → A: slices 012.0–012.5, commits, push and PR authorised; stop only for incompatible API
  changes or significant dependencies; no merge.

### Decisions recorded by this spec (additive; no owner input needed)

- D-1 New subpaths `./gestures` (family `physics`) and `./layout` (family `layout`) with opt-in
  `gestures.css`/`layout.css`; `./core` gains only the additive `TransformLayer.scaleX/scaleY` — ADR 0027.
- D-2 Shared internals in `src/core` (not exported by `./core`): pointer session (used by gestures and
  P11), offset-chain boxes (moved from the 011 scroll geometry) and the FLIP animator (used by layout and
  G10) — so families never import each other.
- D-3 Entrance gains `continuous` (default `false`) for presence re-entry (research R9).
- D-4 `touch-action` is written by the pointer session as an exclusive host channel on the interaction
  area only, never on the document, and is excluded from `will-change` (research R2).
- D-5 L06 uses CSS `interpolate-size` where the behavioural support check passes (Chromium, WebKit) and a
  measured WAAPI fallback otherwise (Firefox) (research R1).
- D-6 L10 uses grid row spans from observed heights; no element moves between parents (research R10).

## Functional requirements

Foundation (012.1)

- FR-001 One pointer session per element; one set of DOM listeners regardless of the number of gestures;
  removed with the last subscriber (gesture-engine.md §2).
- FR-002 Capture on start; `lostpointercapture`/`pointercancel` cancel; secondary buttons ignored;
  disabled elements never start.
- FR-003 Multi-pointer recogniser with 1 ↔ 2 pointer re-basing (no jump), axis lock, threshold, velocity
  and acceleration; start/move/end/cancel callbacks (§3).
- FR-004 Page-wide pointer claims: exclusive gestures never share a pointer; innermost wins; compatible
  gestures share (§2).
- FR-005 Scroll compensation during a gesture (§2); no geometry read per `pointermove`.
- FR-006 `touch-action` composition and exact restoration (§4).
- FR-007 Physics: velocity tracker, exact decay with projection, rubber band, snap; springs only through
  the 009 integrator (§5); no task at rest.
- FR-008 Drag motion with constraints, inertia, snap, fling, live options, interruption, cleanup (§6).
- FR-009 Gesture controls for non-gesture alternatives (§7).
- FR-010 Shared FLIP animator, offset-chain boxes and `scaleX/scaleY` composition.

Effects (012.2–012.3)

- FR-020 G01–G11 as in api-012.md §1 with the keyboard paths and alternatives of accessibility-012.md §2.
- FR-021 H11 and P11 as in api-012.md §3.
- FR-030 Layout groups: snapshot → read-phase measure → invert → animate; continuity when interrupted;
  shared layout ids (layout-engine.md §4).
- FR-031 Reflow groups for grid and masonry; no per-frame reads (§5).
- FR-032 Height drivers (§6) with behavioural CSS detection and measured fallback.
- FR-033 Presence state machine and React `<Presence>` meeting every row of §7.
- FR-034 L01–L10 as in api-012.md §2.

React and demonstrations (012.4)

- FR-040 Components/hooks of entry-points-012.md; `asChild` on single-element effects; SSR output equals
  the plain children; no hydration mismatch; validation errors identical on server and client.
- FR-041 Storybook stories and Playground gallery with all 23 effects working on real input.

Quality (012.5)

- FR-050 Unit tests (jsdom, manual frames) for every FR above, including cleanup (listeners, observers,
  tasks, styles) and StrictMode.
- FR-051 Browser suite in Chrome (CDP: real mouse, real multi-touch, keyboard, axe), Chromium/Firefox/WebKit
  (Playwright: in-page suite + emulated touch device), with conditions decided by observation, never
  sleeps; issue #9 tracked separately.
- FR-052 Composition matrix (composition-matrix-012.md) in unit and browser suites.
- FR-053 Packed consumer: SSR + hydration of the new components from the tarball.
- FR-054 Measured gzip budgets for the new entries; earlier budgets unchanged unless justified and
  approved; tree-shaking markers.
- FR-055 `pnpm check`, Storybook and Playground builds, three-OS CI.

## Success criteria

- SC-001 23 effects implemented, each with a test, a story and a gallery demo on real input.
- SC-002 Zero React commits during gestures and FLIP animations (Profiler), zero layout reads per
  `pointermove` (instrumented), zero frame tasks at rest.
- SC-003 Every functional gesture operable by keyboard and by a single pointer without dragging.
- SC-004 axe clean on the gallery; reduced motion live in three engines.
- SC-005 Three engines pass the Phase 012 suite; emulated touch (pinch/rotate/drag) passes in Chromium.
- SC-006 Packed SSR consumer hydrates without mismatch; budgets met; CI green on three OSes.
