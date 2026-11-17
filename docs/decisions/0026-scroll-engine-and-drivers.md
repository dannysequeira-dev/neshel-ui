# ADR 0026 — Scroll engine, progress model and native/JS drivers

- Status: **Proposed** (Phase 011; awaiting the owner's review of the Phase 011 PR)
- Date: 2026-11-16
- Feature: [011](../../specs/011-scroll-parallax/spec.md); research R1–R10; contracts
  [scroll-engine.md](../../specs/011-scroll-parallax/contracts/scroll-engine.md),
  [api-011.md](../../specs/011-scroll-parallax/contracts/api-011.md)

## Context

Phase 011 adds scroll-linked effects. ADR 0018 placed scroll-driven animations (SDA) on the driver ladder
with a JS fallback; ADR 0019/0022 made the motion host the only writer of the consumer's element; ADR 0025
(R-1) forbids package CSS that animates the consumer's element. Probes (research R1) show Chromium 158,
Firefox 159 and WebKit 27.2 all run scroll and view timelines correctly, but a native animation on
`transform`/`opacity` would override the host's composed value (R2).

## Decision

1. **Own engine on 009.** Scroll sources, timelines and triggers use the 009 frame scheduler (read →
   update → write), motion values, spring integrator and motion host. No second scheduler, no second
   composition system, no external engine (ADR 0020 unchanged).
2. **Location.** The engine lives in the `./scroll` subpath (`src/scroll/engine/`), framework-free and
   importable without React; `./core` is unchanged except an additive `TransformLayer` skew.
3. **One progress model for both drivers.** Layout coordinates from the offset chain (transforms
   ignored), CSS named ranges with percentage offsets, viewport or element sources, block or inline axis.
   The formulas match native `ViewTimeline` ranges in three engines.
4. **Drivers.** The JS driver writes through the motion host (transform layers, opacity, exclusive
   channels) and is the only driver allowed to move the consumer's element. The native driver animates
   registered custom properties (and package-rendered elements) with WAAPI + `ScrollTimeline`/`ViewTimeline`
   and string ranges; `auto` selects it only after a behavioural check (computed progress vs the JS model,
   ±0.02) and falls back otherwise.
5. **Geometry.** Read only in read phases, on shared, reference-counted ResizeObserver/MutationObserver
   signals (the 008.0 prototype's set), viewport resize, fonts and load; explicit `refresh()` for the
   documented undetectable cases; `diagnose()` for drift.
6. **No hijacking.** Passive listeners only; pinning is CSS sticky; no wheel/touch/key interception; no
   scroll writes except SP04's focus management.
7. **Entrance reuse.** ST01–ST03 drive Entrance definitions/presets passed as values through two additive
   Entrance options (`hold`, `direction`); families still never import each other.

## Consequences

- Scroll effects compose with Tilt3D, Hover, Press and Entrance on the same element.
- Visual effects on the consumer's element run on the main thread (one host write per frame); the
  compositor-only path is available for custom-property outputs consumed by package CSS or the consumer.
- A future phase may add a native path for package-rendered layers (013 scenes) without changing the
  model. Native driver regressions in a browser degrade to the JS driver instead of breaking.

## Alternatives rejected

- CSS `animation-timeline` in package stylesheets on consumer elements: violates R-1, breaks composition.
- WAAPI on individual `translate`/`scale`: single-owner channels already used by other effects.
- GSAP ScrollTrigger / Motion `useScroll`: dependency policy (ADR 0020), pin spacers, global scroll
  listeners per instance.
- Measuring with `getBoundingClientRect` on scroll: layout read per event and self-feedback through the
  effect's own transform.
