# Brief — Phase 012: Physics, Gestures & Layout Animations

Owner direction of 2026-11-17, summarised. The original is in Spanish; this summary is authoritative for
the repository.

## Starting point

Phase 011 (Scroll Engine, Scroll Triggers, Scroll & Parallax; ADR 0026) is reviewed, approved and merged
into `main` as the squash commit `804badb` (PR #8). `@neshel-ui/animations` stays **private** at `0.0.0`.

## Goal

Reusable physics, gesture-recognition, FLIP and presence primitives on the existing motion engine, and the
**23 catalogue effects** (`specs/008-animations/contracts/catalog.md`):

- Physics & Gestures G01–G11: drag with inertia; drag constraints + snap points; swipe to dismiss;
  pull-to-refresh indicator; spring follow; elastic edge; throw / fling with decay; pinch-zoom media;
  rotate gesture; drag-to-reorder with a keyboard alternative; velocity squash & stretch.
- Layout Animations L01–L10: FLIP move / reorder; auto-height; list enter / exit; shared layout; grid
  reflow; accordion height; tab indicator slide; presence (exit before unmount); content cross-fade swap;
  masonry reflow.
- H11 cursor follower (decorative, extends `./hover`); P11 long-press progress (extends `./press`).

Parameter variants are not extra implementations. A placeholder, an unintegrated function or a simulated
demo does not count as an effect.

## Requirements carried by the brief

0. **Authorship.** Neshel-UI belongs to Daniel Sequeira Campos (Danny Sequeira, `dannysequeira-dev`). No
   tool attribution anywhere; the Git identity is unchanged.
1. Branch `feature/012-physics-gestures-layout` from the updated `origin/main` (`804badb`); roadmap and
   `CLAUDE.md` updated; no history rewrite, no direct change to `main`.
2. **Reuse, not duplicate:** the 009 scheduler (read/update/write), motion values, spring integrator and
   controllers, easing/interpolation, the motion host (arbitration, composition), the 010 pointer tracking
   and the 011 geometry (offset chain). **No second scheduler, physics engine or transform composer.**
   Families stay modular (evaluate `./gestures` and `./layout`); H11 extends `./hover`, P11 `./press`;
   `./core` stays React-free and the root entry light.
3. **Gestures:** one contract for Pointer Events and capture, one or several pointers, velocity and
   acceleration, inertia/decay, spring settling, constraints and snap points, local and global
   coordinates, cancellation and interruption, live option changes, simultaneous or competing gestures,
   start/progress/end/cancel; shared tracking instead of listeners per effect. Drag keeps the previous
   position, composes with other effects, survives scroll/resize/earlier transforms without jumps and
   restores on destroy. Pinch/rotate handle several pointer ids, one finger lifting and 1↔2 pointer
   transitions; no indiscriminate blocking of native zoom; a documented `touch-action` policy. Reorder
   changes a consumer-controlled logical order (no arbitrary DOM reordering, no lost React state) and has
   keyboard and accessible controls. Pull-to-refresh is an optional visual that never blocks the
   browser's behaviour; the refresh action comes from the consumer. H11 is decorative, never captures
   events, and turns off for reduced motion or unsuitable input. P11 handles activation, cancel on
   excessive movement, `pointercancel`, lost capture, early release and a keyboard alternative, and never
   fires twice.
4. **FLIP:** capture → change → measure → invert → play, with reads in the scheduler's read phase, no
   layout thrashing, no per-frame layout reads; React integration with an engine as independent as
   possible. Cases: list reorder, grid and masonry reflow, size change, accordion, tab indicator,
   enter/exit, changes during a running transition, consumer transforms, variable sizes. Use
   `interpolate-size`/`calc-size()` where support is proven, with a measured, verified fallback.
5. **Presence (L08):** exit before unmount; enter, exit, re-entry during exit, cancellation, several
   removals, stable keys, container unmount, StrictMode, fast changes, live reduced motion, zero duration,
   a failing animation never traps content; no invisible element kept mounted indefinitely; integrates
   with Entrance and prepares Phase 013 page transitions — **no navigation or View Transitions system**.
6. **Composition:** every effect respects the motion host and arbitration; tested combinations (drag +
   Tilt3D, drag + hover + press, drag + parallax, drag + inertia + snap, pinch + rotate, FLIP + hover,
   FLIP + press, FLIP + scroll transforms, presence + Entrance, reorder + FLIP, layout transition +
   consumer inline styles); exact restoration; no orphan transforms, observers, listeners or frame tasks.
7. **Accessibility:** WCAG 2.2 — 2.1.1, 2.5.1, 2.5.7, 2.5.8 where applicable, 2.3.3; non-gesture
   alternatives (move up/down, dismiss button, zoom controls, explicit refresh, keyboard long press);
   visible focus, no focus loss on reorder/unmount; reorder results announced without per-frame live
   regions; `prefers-reduced-motion` live with `user`/`always`/`never`; motion never the only signal.
8. **SSR/React/performance:** React 19, strict TypeScript, ESM, SSR-safe, no hydration mismatch, optional
   Tailwind, precompiled CSS, `asChild` where coherent, tree-shaking; zero React renders per frame, zero
   geometry reads per `pointermove`, zero scheduler work at rest; Pointer Events with documented
   fallbacks; initial HTML never depends on effects or measurements; no external gesture/physics engine.
9. **Slices** 012.0 spec & research → 012.1 physics & gesture foundation → 012.2 gesture effects (+H11,
   P11) → 012.3 layout engine & presence → 012.4 React integration & demonstrations → 012.5 quality gates.
   Small, verifiable commits. An incompatible API change or a significant new dependency needs
   alternatives and owner approval first.
10. **Verification:** pointer down/move/up, cancel and lost capture, mouse and touch, multi-pointer, drag
    during scroll, inertia interruption, dynamic constraints, snap, reorder by mouse and keyboard, FLIP
    under rapid size changes, presence re-entry/unmount, StrictMode, alternatives' accessibility, live
    reduced motion, cleanup, simultaneous effects, SSR/hydration, packed consumers; `pnpm check`, unit and
    type tests, the Chrome/CDP lab, Chromium/Firefox/WebKit, emulated touch devices, composition, SSR +
    hydration + packed consumer, Storybook and Playground builds, gzip budgets from the real tarball,
    Linux/Windows/macOS CI. No widened tolerances or timeouts to get green. **Issue #9** (ContentSwap
    flakiness, Phase 010) stays independent work: if it shows up, diagnose with evidence, never retry
    blindly, never mix its fix into this phase.
11. **Budgets:** propose measured budgets for the gesture engine without React, physics primitives, drag,
    pinch/rotate, reorder, layout/FLIP, presence, H11, P11, whole family entries and extra CSS. Previously
    approved Core, Entrance, Hover, Press and Scroll budgets are not raised without justification and
    authorisation. Root entry stays light.
12. **Publication and Git:** the package stays private `0.0.0`, unpublished, untagged, outside Changesets;
    the five public packages and the release workflow are untouched. Commits, push and the Phase 012 PR
    are authorised once its checks are verified. **No automatic merge.**
13. **Final delivery:** inventory of the 23 effects; gesture-engine architecture; FLIP and presence
    architecture; public APIs and entry points; composition matrix; accessibility and reduced-motion
    results; performance and cleanup evidence; browser and emulated-touch results; proposed gzip budgets;
    Storybook and Playground visual evidence; final CI and PR link; known limitations and pending
    validation.
