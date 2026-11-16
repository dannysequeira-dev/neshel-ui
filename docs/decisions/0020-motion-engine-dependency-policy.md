# ADR 0020 — Motion engine dependency policy

- Status: **Proposed** (2026-11-15, Phase 008.0)
- Date: 2026-11-15
- Feature: [008](../../specs/008-animations/spec.md); research R1, R13

## Context

Mature engines exist: Motion (MIT; hybrid WAAPI/JS, layout projection, gestures, scroll), GSAP
(free since 2025 under its own non-OSI licence with restrictions on competing products; timelines,
ScrollTrigger), anime.js v4 (MIT), Lenis (MIT, smooth scroll), Three.js/OGL (MIT, WebGL). The brief
forbids heavy dependencies without justification and comparative tests and asks to prefer CSS.
Statements about these projects are as reported by their documentation and must be re-checked at
adoption time.

## Decision

1. **008.0 ships no motion engine dependency.** The package owns a small core (scheduler, springs,
   composer, policy) and uses platform features first (CSS, individual transforms, `linear()`, WAAPI,
   scroll-driven animations, View Transitions).
2. **A third-party engine may be adopted per capability** (e.g. layout projection, gestures, WebGL)
   only with: an MIT/Apache-2.0-compatible licence; a comparative benchmark (bundle gzip, main-thread
   time per frame under 4× CPU throttle, long tasks, SSR behaviour, tree-shaking) against the own
   implementation; compatibility with the composition contract (ADR 0019) or an isolated element;
   an ADR; and a `check:pack` contract update.
3. **GSAP is not a dependency** of any Neshel-UI package (licence incompatible with an MIT library's
   dependency tree); applications may still use it alongside Neshel-UI.
4. **Smooth-scroll libraries are not used by default** (scroll hijacking, accessibility); an opt-in
   adapter may be considered later.
5. **WebGL libraries** may only enter through the optional `./gpu` entry (016), as optional peers or
   bundled after the benchmark, never in other entries.

## Consequences

- Smaller, predictable bundles and one composition model; more implementation work for physics,
  layout projection and gestures (re-evaluated in 012, decision D6).
- Users who already use Motion/GSAP can keep them on separate elements; the composer warns when an
  inline `transform` it does not own is present.

## Alternatives

- Adopt Motion as the engine now: fastest route to breadth, but its own `transform` ownership,
  larger baseline and React-centric model conflict with ADR 0019 and the CSS-first rule; kept as a
  benchmark candidate.
- Adopt GSAP: rejected as a dependency (licence).
- Platform only, no JS core: cannot do pointer physics, interruptible springs or scroll-velocity
  effects.

## Verification

Observed sizes of the own implementation (008.0 evidence): Tilt3D 5.95 KiB, controller 3.90 KiB,
core scheduler + spring 1.18 KiB gzip. The comparative benchmark is a Phase 009 task.
