# Feature Specification: Motion Engine (`@neshel-ui/animations`, Phase 009)

**Feature Branch**: `feature/009-motion-engine` (replayed onto `main` after the PR #4 squash merge `fd3885c`)

**Created**: 2026-11-15

**Status**: **Approved (2026-11-16); implemented and verified locally (009.1–009.6); CI pending a push; bundle budgets pending an owner decision.** See [evidence.md](evidence.md) for what is
implemented and verified. `@neshel-ui/animations` stays private (0.0.0).

**Input**: Owner direction 2026-11-15, summarised in [brief.md](brief.md).

Companion documents: [research.md](research.md) (R1–R12), [plan.md](plan.md), [tasks.md](tasks.md),
[analysis.md](analysis.md); contracts [effect-definition.md](contracts/effect-definition.md),
[channels-and-arbitration.md](contracts/channels-and-arbitration.md),
[controllers.md](contracts/controllers.md), [motion-defaults.md](contracts/motion-defaults.md),
[react-bindings.md](contracts/react-bindings.md), [style-ownership.md](contracts/style-ownership.md); ADRs
[0021](../../docs/decisions/0021-effect-definitions-and-explicit-registries.md),
[0022](../../docs/decisions/0022-channel-arbitration-and-conflict-detection.md),
[0023](../../docs/decisions/0023-motion-controllers-and-drivers.md),
[0024](../../docs/decisions/0024-motion-defaults-and-config-integration.md).

## Problem

Phase 008.0 proved one effect (Tilt3D) on a minimal core. Scaling to 157 catalogue entries without a
uniform definition, channel ownership beyond `transform`, deterministic conflict handling and a
driver-independent controller would make every effect re-implement lifecycle, reduced motion and
composition — and would bring back silent last-write-wins conflicts.

## Goals

1. Effect definitions (`defineEffect`) and explicit registries (`createEffectRegistry`), no global
   side effects.
2. A per-element motion host with channels (`compose`, `multiply`, `exclusive`), one write per channel
   per frame, restoration on release.
3. Deterministic arbitration of exclusive channels with suspension/resumption and a conflict policy
   (`warn` / `error` / `silent`) plus diagnostics.
4. Motion controllers with one interface over the JS (motion values, springs, tweens) and WAAPI
   drivers; easing, `springEasing`, interpolation.
5. Motion defaults inside Animations (D5) with a designed, additive Config integration.
6. React bindings (`useMotionEffect`, motion-value hooks); Tilt3D migrated onto the engine and moved
   to the first family subpath `./hover` (D3).
7. Close the 008.0 pending validations at engine level: Chromium/Firefox/WebKit lab runs, a packed
   external consumer, bundle budgets; screen-reader pass by the owner.

## Non-goals

New catalogue effects (families start in 010); the CSS-class/presets driver (010); timelines (013);
scroll engine (011); colour interpolation (015); GPU entry (016); changes to `@neshel-ui/config` or
`@neshel-ui/cli` (the integration is designed only); publication, versions, tags, releases, merges or
pushes without authorisation; lifting the `private` guard.

## Clarifications

### Session 2026-11-16 — owner approval

- Approved: start Phase 009; D1, D2, D3, D5, D7 confirmed; D4 (content visible by default in SSR; any
  pre-hydration hiding optional, limited, with a safe fallback when JavaScript fails); D6 (own engine
  first, benchmarks before external engines, especially layout and gestures); D8 (progressive native
  scroll-driven animations and View Transitions with per-browser verified fallbacks); D9 (experimental
  docs in Storybook and Playground; full public docs before publication).
- Q1 Tilt3D to `./hover` without a compatibility layer: approved. Q2 conflict policy (dev warnings,
  production silent, configurable strict mode) with deterministic resolution, priorities and correct
  resumption: approved. Q3 budgets (core ≤ 8 KiB, Tilt3D ≤ 7 KiB, registry + host ≤ 3 KiB gzip) measured
  on real packed bundles: approved. Q4 automated accessibility during development; manual screen-reader
  review before publication.
- New mandatory requirement 3.1: explicit style ownership with capture/restoration of original inline
  values and priorities, cleanup on cancel/interrupt/unmount, composition, external modifications,
  exclusive properties, no duplicate writes per frame; limits documented
  ([style-ownership.md](contracts/style-ownership.md)).
- New mandatory requirement 3.2: `MotionControl.finished` distinguishes `completed`, `cancelled`,
  `interrupted`; normal outcomes resolve, real errors reject; documented semantics of `play`, `pause`,
  `reverse`, `seek`, `cancel`, `finish` ([controllers.md](contracts/controllers.md)).

### Session 2026-11-15 — owner direction and agent proposals

- Q: Registry shape? → A (proposed): definitions are values; registries explicit (R2, ADR 0021).
- Q: Conflict behaviour? → A (proposed): deterministic priority arbitration, suspension, policy-based
  reporting; production silent, development warns, tests may error (R5, ADR 0022).
- Q: Where does Tilt3D live after D3? → A (proposed): `./hover`; the root becomes React engine
  bindings (R11). Package is private and unpublished, so no compatibility shim.
- Q: Motion defaults on `:root`? → A (proposed): never declared globally by the package; read with
  fallbacks (R9, ADR 0024).

## User Scenarios & Testing

### US1 — Define a custom effect (P1)

A developer writes `defineEffect({ id: "hover/glow-pulse", channels: [{ channel: "filter", mode:
"exclusive" }], … })` and attaches it with `useMotionEffect`. It behaves like a built-in effect:
reduced motion honoured, lifecycle cleaned up, composition rules enforced.

Acceptance: invalid definitions throw at `defineEffect`; attaching/detaching leaves no listeners,
frames or inline styles; the effect appears in `getMotionDebugInfo`.

### US2 — Two effects compete for one property (P1)

Two effects claim `filter` on the same element. Acceptance: the higher priority (or earlier, on ties)
applies; the other is `suspended` and applies nothing; a development warning names both ids, the
channel and the element; destroying the owner resumes the suspended effect; `conflicts: "error"`
throws at attach; production is silent but arbitrates identically.

### US3 — Effects that combine (P1)

A `transform` effect and an `opacity` effect plus a second opacity contribution share an element.
Acceptance: transform layers compose (008 rules); opacities multiply; releasing one restores the
others; at most one write per channel per frame.

### US4 — Control motion programmatically (P2)

`animateValue(value, 1, { type: "spring" })` and `animateElement(el, "opacity", …)` return controls
that pause, reverse, finish, cancel and resolve `finished` without rejecting; interrupting keeps
velocity (springs) or the current value (tweens); reduced motion follows the declared behaviour.

### US5 — Tilt3D on the engine (P2)

Tilt3D is a definition attached through the engine and imported from `@neshel-ui/animations/hover`;
all 008 Tilt3D unit and browser tests still pass.

### Edge Cases

Attach to a detached element; destroy during setup; option update while suspended; a definition
claiming the same channel twice (rejected); a host whose last instance is destroyed (all inline
styles removed, host released); conflict policy changed between attachments (per attach call);
two registries with overlapping ids (independent; duplicate ids within one registry throw); WAAPI
unavailable (JS fallback for opacity/transform, documented); `finished` awaited after cancel.

## Requirements

### Definitions and registries

- **FR-001**: `defineEffect` validates id format `family/name`, family/id consistency, known channels,
  no duplicate channel, finite priority; returns a frozen object; has no side effects.
- **FR-002**: `createEffectRegistry` provides `get`, `has`, `list(family?)`; duplicate ids throw.
- **FR-003**: No module registers anything at import time (`sideEffects` stays CSS-only).

### Host, channels and composition

- **FR-010**: One motion host per element, created on first attach, released after the last detach.
- **FR-011**: Channel handles are the only write path for claimed channels.
- **FR-012**: `transform` composes (008 rules), `opacity` multiplies, others are exclusive.
- **FR-013**: At most one style write per channel per element per frame (write phase).
- **FR-014**: Releasing the last contribution/owner restores the captured inline value and priority, or
  removes the property when none was captured.
- **FR-015**: Original inline values and priorities are captured on first claim; `transform` keeps the
  captured value before the composed layers, `opacity` multiplies it, `will-change` unions tokens
  (style-ownership.md §3).
- **FR-016**: Cleanup restores styles after completion, cancellation, interruption, effect destroy and
  React unmount.
- **FR-017**: External inline modifications during animation become the new baseline (never lost) with
  a development warning (style-ownership.md §5).
- **FR-018**: A property is written at most once per frame and only when its value changes.

### Arbitration and conflicts

- **FR-020**: Exclusive claims are arbitrated by priority, ties keep the existing owner.
- **FR-021**: Losers are `suspended` and resume automatically when granted; multi-channel claims are
  all-or-none.
- **FR-022**: Conflict policy `warn` (development default), `error`, `silent` (production default);
  messages name both effect ids, the channel and the element; one warning per (element, channel, pair).
- **FR-023**: `getMotionDebugInfo(element)` reports channels, owners, waiting claims, contributions and
  instance states.

### Controllers and drivers

- **FR-030**: `MotionControl` states and methods per controllers.md §1; `finished` resolves with
  `completed`, `cancelled` or `interrupted` and rejects only on real errors (state `failed`).
- **FR-031**: Motion values (`get/set/getVelocity/subscribe`), `animateValue` with spring and tween
  transitions; interruption keeps velocity/current value.
- **FR-032**: `animateElement` (WAAPI, exclusive channels only) claims channels through the host, converts springs with
  `springEasing`, commits the final value, releases on cancel, honours reduced-motion behaviour.
- **FR-033**: `bindChannel` writes a motion value into an `opacity` or `--neshel-*` channel.

### Easing, interpolation, defaults

- **FR-040**: `cubicBezier` (≤ 1e-4 error vs reference), `steps`, named easings, `springEasing`
  (`linear()` string starting at 0 and ending at 1, duration to rest), `toCssEasing`.
- **FR-041**: `clamp`, `mix`, `progress`, `mapRange`.
- **FR-042**: `motionDefaults` typed and frozen; package CSS reads `--neshel-motion-*` with fallbacks
  and declares none globally.
- **FR-043**: The Config integration is documented as additive (motion-defaults.md §5); no change to
  `config` or `cli` in this phase.

### React and entry points

- **FR-050**: `useMotionEffect`, `useMotionValue`, `useMotionValueEvent` per react-bindings.md; zero
  renders per frame; validation during render identical on server and client.
- **FR-051**: Exports exactly `.`, `./core`, `./hover`, `./styles.css`; `./core` React-free; family
  subpaths never import each other; contract checks updated.
- **FR-052**: Tilt3D implemented as `tilt3D` definition; `./hover` exports `Tilt3D`, `useTilt3D`,
  `createTilt3D`, `tilt3D`; all 008 Tilt3D behaviours preserved (FR-050–FR-065 of 008).

### Verification

- **FR-060**: Unit and type tests for every requirement above; 008 tests kept green.
- **FR-061**: Lab engine page (lab-defined effects in conflict, controllers, WAAPI) checked in Chromium,
  Firefox and WebKit via Playwright; existing CDP lab check kept.
- **FR-062**: Packed external consumer for `animations` (Vite build + SSR render + hydration) as an
  opt-in `check:consumer` variant.
- **FR-063**: `check:bundles:animations` (offline) with budgets per entry.
- **FR-064**: Screen-reader pass of the lab recorded by the owner (manual).
- **FR-070**: `animations` stays private; published packages, Changesets and `release.yml` unchanged.

## Success Criteria

- **SC-001**: `pnpm check` passes with the engine and the migrated Tilt3D.
- **SC-002**: Conflict scenarios (US2) pass in unit tests and in three browser engines.
- **SC-003**: Bundle budgets (proposed): `./core` full ≤ 8 KiB gzip; `./hover` Tilt3D ≤ 7 KiB gzip
  incl. Slot; `defineEffect` + `attachEffect` alone ≤ 3 KiB gzip; `composeTransform` stays ≤ 0.6 KiB.
- **SC-004**: Packed consumer builds, server-renders and hydrates without errors.
- **SC-005**: Three-OS CI green on the 009 PR (when authorised).
- **SC-006**: `git diff main -- packages/{config,layout,typography,components,cli,core} .changeset
  .github/workflows/release.yml` empty.

## Assumptions

React 19 only; Playwright engines installable in CI (as feature 006); budgets in SC-003 are initial
proposals to be confirmed by measurement in 009.1.
