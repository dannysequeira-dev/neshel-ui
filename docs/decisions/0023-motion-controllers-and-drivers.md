# ADR 0023 — Motion controllers and drivers

- Status: **Accepted** (owner approval 2026-11-16); implementation in Phase 009
- Date: 2026-11-15
- Feature: [009](../../specs/009-motion-engine/spec.md); research R6–R8;
  [contracts/controllers.md](../../specs/009-motion-engine/contracts/controllers.md)

## Context

Effects and applications need to start, pause, reverse, retarget, finish, cancel and await motion.
Without a shared interface each driver (CSS, WAAPI, JS) exposes different semantics — notably WAAPI's
`finished` promise rejects on cancel, a frequent source of unhandled rejections.

## Decision

1. One `MotionControl` interface for every driver: states `idle | running | paused | completed |
   cancelled | interrupted | failed`; `play`, `pause`, `reverse`, `finish`, `cancel`, and `seek` for
   tweens/WAAPI. `finished` (owner requirement 3.2) resolves with a typed result
   `{ status: "completed" | "cancelled" | "interrupted", direction, value }` for normal outcomes and
   **rejects only on real errors** (state `failed`), so errors are never hidden and cancellation never
   produces an unhandled rejection. Each run has its own promise.
2. Drivers in Phase 009: **JS** (motion values driven by springs or tweens on the shared scheduler) and
   **WAAPI** (`animateElement`, exclusive channels only, claiming channels through the motion host,
   committing the final value through the style ledger, springs converted with `springEasing`). The CSS-class driver arrives with presets (010).
3. Interruption: a new animation on the same target cancels the previous one and continues from the
   current value; springs keep velocity.
4. Reduced motion is applied by the controller from the declared behaviour (`off`, `fade`, `instant`,
   `static`, `reduced`).

## Consequences

- One mental model for programmatic motion; effects reuse controllers instead of hand-written loops.
- Small wrapper cost over WAAPI; fill-forever animations are avoided (values committed to channels).

## Alternatives

Expose raw WAAPI `Animation` objects (inconsistent with JS motion, rejecting promises); JS-only
(loses compositor-driven keyframes); adopt a third-party engine's controls (ADR 0020).

## Verification (planned)

State-machine unit tests per driver (jsdom shim for WAAPI), interruption/velocity tests, browser cases
in three engines.
