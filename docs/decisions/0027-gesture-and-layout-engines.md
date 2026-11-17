# ADR 0027 — Gesture and layout engines (pointer session, physics, FLIP, presence)

- Status: **Proposed** (Phase 012; implemented and verified locally — owner review of the Phase 012 PR
  pending)
- Date: 2026-11-17
- Feature: [012](../../specs/012-physics-gestures-layout/spec.md); research R1–R12; contracts
  [gesture-engine.md](../../specs/012-physics-gestures-layout/contracts/gesture-engine.md),
  [layout-engine.md](../../specs/012-physics-gestures-layout/contracts/layout-engine.md),
  [api-012.md](../../specs/012-physics-gestures-layout/contracts/api-012.md)

## Context

Phase 012 adds direct manipulation (drag, pinch, rotate, swipe, reorder), physics (inertia, rubber band,
snap) and layout animation (FLIP, reflow, height, presence). The engine already has one scheduler, one
spring integrator and one transform composer (the motion host, ADR 0019/0022); rule R-1 (ADR 0025)
forbids package CSS that animates the consumer's element; ADR 0020 forbids engine dependencies without a
benchmark and an ADR.

## Decision

1. **No new engine, no dependency.** Gestures and layout run as tasks of the 009 scheduler, use the 009
   spring integrator through the 010 spring rig, and write only through motion hosts. Decay is a pure step
   function (exact exponential) that hands its velocity to the spring integrator at bounds.
2. **Two new families, shared internals in core.** `./gestures` (family `physics`) and `./layout`
   (family `layout`), each with an opt-in stylesheet for package-rendered parts. Code needed by more than
   one family lives in internal `src/core` modules that `./core` does not export (no core budget change):
   the **pointer session** (gestures + P11), **offset-chain boxes** (moved from the 011 scroll geometry;
   scroll re-imports them) and the **FLIP animator** (layout + G10).
3. **Pointer session per element.** One set of listeners per element; pointer capture; multi-pointer map;
   scroll compensation; page-wide pointer claims for competing gestures (innermost wins; compatible
   transform gestures share); `touch-action` composed as the intersection of attached gestures and written
   as an exclusive host channel on the interaction area only (never `html`/`body`), excluded from
   `will-change`, restored exactly.
4. **FLIP.** Boxes from the offset chain (transforms ignored); `first` read once at the snapshot point
   (framework-free `snapshot()`, React `getSnapshotBeforeUpdate`), `last` in the scheduler's read phase
   before paint, inversion written as a transform layer that springs home; reflow without renders is
   measured inside the shared `ResizeObserver` callback (after layout, before paint) — the single documented
   read point outside the read phase; never per frame.
5. **Height.** CSS `interpolate-size` on package-rendered panels where a behavioural support check passes;
   measured, transient WAAPI on package-rendered wrappers otherwise and for content-driven auto-height.
6. **Presence.** A framework-free state machine (enter, exit, re-entry, watchdog, hidden page, reduced
   motion) behind `<Presence>`; Entrance presets run enter/exit as values (additive `continuous` option).
7. **Additive core change.** `TransformLayer.scaleX/scaleY` (multiply with `scale`; composed as
   `scale(x, y)` only when non-uniform), required by FLIP size inversion and G11.

## Consequences

- All Phase 012 effects compose with Tilt3D, Hover, Press, Entrance and Scroll on the same element.
- Direct manipulation runs on the main thread (one host write per frame), like every JS effect.
- `touch-action` becomes a managed property of gesture areas; consumers keep their own value as the
  restored baseline.
- Masonry uses row spans; a future native masonry/`grid-lanes` path can replace them behind the same API.
- Budgets for the new entries are proposed in the Phase 012 evidence; earlier budgets change only with
  owner approval.

## Alternatives rejected

- Motion (`layout`, `drag`, `AnimatePresence`), `@use-gesture/react`, `dnd-kit`, GSAP Draggable/Flip: a
  second scheduler/transform writer, dependency policy (research R11).
- One pointer listener set per effect: duplicated work and conflicting captures.
- Measuring with `getBoundingClientRect`: includes transforms (feedback from the effect's own layer).
- JavaScript masonry moving items between columns: remounts keyed React children (state loss).
- `touch-action: none` on gesture containers or the document: blocks scrolling and zoom.
