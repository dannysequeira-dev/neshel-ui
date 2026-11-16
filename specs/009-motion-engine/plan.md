# Implementation Plan: Motion Engine (Phase 009)

**Branch**: `feature/009-motion-engine` | **Date**: 2026-11-15 | **Spec**: [spec.md](spec.md)
**Status**: proposed; implementation starts only after owner approval.

## Summary

Generalise what Tilt3D does by hand into an engine: effect definitions and explicit registries, a
per-element motion host with channel modes and deterministic arbitration, a conflict policy with
diagnostics, driver-independent motion controllers (JS motion values and WAAPI), easing and motion
defaults, and React bindings. Migrate Tilt3D onto it and into `./hover`. Close the 008.0 engine
validations (three browser engines, packed consumer, bundle budgets).

## Technical Context

**Language/Version**: TypeScript 5.9 strict, ESM, NodeNext
**Primary Dependencies**: React 19 (peer), `@radix-ui/react-slot`; no new runtime dependency (ADR 0020)
**Testing**: `node:test` + jsdom on built output; type fixtures; `check:pack --with animations`; CDP
lab check; Playwright (Chromium, Firefox, WebKit) engine check; packed consumer; bundle budgets
**Target Platform**: evergreen browsers; SSR on Node ≥ 22.13
**Performance Goals**: one write per channel per frame; no React render per frame; budgets in spec SC-003
**Constraints**: private package; no Config/CLI change; no global CSS; no import-time side effects

## Constitution Check

| Principle           | Plan                                                                                          |
| ------------------- | --------------------------------------------------------------------------------------------- |
| II Modular packages | Engine inside the package; family subpath `./hover`; no dependency on private core            |
| III CSS-first       | WAAPI/CSS drivers preferred; defaults as CSS custom properties read with fallbacks            |
| IV Accessibility    | Reduced-motion behaviour enforced by the host for every definition                            |
| VI Evidence         | Three engines, packed consumer, budgets; manual screen-reader pass recorded                   |
| VII Minimal scope   | No new catalogue effects; Tilt3D is the only migrated effect; lab-only fixtures for conflicts |
| VIII Safe releases  | Private; no publish/version/tag; push only when authorised                                    |

No violation.

## Milestones

| Milestone | Scope                                                                                                                                      | Exit gate                                    |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------- |
| 009.0     | Spec, research, contracts, ADRs 0021–0024, plan, tasks, analysis (this proposal)                                                           | **Owner approval**                           |
| 009.1     | Easing (`cubicBezier`, `steps`, presets), `springEasing`, interpolation, `motionDefaults`; budgets baseline                                | unit tests; measurement script               |
| 009.2     | Motion host: ledger, channel handles, opacity multiply, exclusive channels, arbitration, suspension, conflict policy, `getMotionDebugInfo` | unit tests incl. negative/conflict matrix    |
| 009.3     | `defineEffect`, `createEffectRegistry`, `attachEffect` lifecycle; React `useMotionEffect`, motion-value hooks                              | unit + SSR/hydration tests                   |
| 009.4     | Controllers: motion values, `animateValue` (spring/tween), `bindChannel`, `animateElement` (WAAPI); reduced-motion behaviours              | unit tests; jsdom WAAPI shim + browser cases |
| 009.5     | Tilt3D as `tilt3D` definition; `./hover` subpath; contract/pack checks; lab/Storybook moved                                                | all 008 Tilt3D tests + lab 14/14 still green |
| 009.6     | Verification: engine lab page; Playwright three-engine check; packed consumer variant; `check:bundles:animations`; CI steps                | local gates; CI on authorised push           |
| 009.7     | Evidence, docs (roadmap, architecture, package contracts, CLAUDE.md), owner screen-reader pass                                             | owner review                                 |

## Project Structure (planned)

```text
packages/animations/src/core/
  easing.ts, interpolate.ts, defaults.ts            (009.1)
  host.ts, channels.ts, conflicts.ts, debug.ts      (009.2)
  effect.ts, registry.ts                            (009.3)
  motion-value.ts, controls.ts, waapi.ts            (009.4)
packages/animations/src/react/use-motion-effect.ts, use-motion-value.ts   (009.3)
packages/animations/src/hover/index.ts, tilt/*      (009.5, moved)
scripts/check-animations-engines.mjs                (Playwright, 009.6)
scripts/check-bundles-animations.mjs                (009.6)
scripts/lib/consumer-animations.mjs                 (packed consumer variant, 009.6)
apps/playground-vite/src/animations/engine-lab.tsx  (009.6)
```

## Risks

| Risk                                                       | Mitigation                                                                 |
| ---------------------------------------------------------- | -------------------------------------------------------------------------- |
| Engine overhead grows the smallest bundles                 | Budgets (SC-003) measured from 009.1; host code split from definitions     |
| WAAPI differences across engines (commitStyles, composite) | Three-engine check before claims; JS fallback documented                   |
| Over-abstraction before real families                      | Only what Tilt3D + conflict fixtures exercise; families validate it in 010 |
| jsdom lacks WAAPI                                          | Minimal test shim for unit tests; real behaviour asserted in browsers      |
| Playwright browsers on Windows CI                          | Reuse the feature 006 setup (Linux/macOS three engines; Windows Chromium)  |

## Open questions for the owner

1. Approve moving Tilt3D from `.` to `./hover` (no compatibility shim; package is unpublished)?
2. Approve the conflict defaults: `warn` in development, `silent` in production, `error` opt-in?
3. Approve the initial bundle budgets of SC-003?
4. Schedule of the manual screen-reader pass (008 lab + 009 engine lab)?

## Complexity Tracking

| Item                     | Why needed                                         | Simpler alternative rejected because          |
| ------------------------ | -------------------------------------------------- | --------------------------------------------- |
| Motion host per element  | Single place to arbitrate, compose and restore     | Per-effect writes reintroduce last-write-wins |
| Two drivers (JS + WAAPI) | Pointer/physics need JS; keyframes belong in WAAPI | JS-only loses compositor-driven animations    |
| Playwright engine check  | Firefox/WebKit verification pending since 008      | Chrome-only claims violate constitution VI    |
