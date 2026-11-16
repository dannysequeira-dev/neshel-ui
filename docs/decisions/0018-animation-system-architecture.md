# ADR 0018 — Animation system architecture

- Status: **Proposed** (2026-11-15, Phase 008.0); implemented for the 008.0 spike, pending owner
  review before Phase 009 builds on it
- Date: 2026-11-15
- Feature: [008](../../specs/008-animations/spec.md); research R0–R14; contracts in
  [specs/008-animations/contracts/](../../specs/008-animations/contracts/)

## Context

The owner opened a motion layer for Neshel-UI: 15 families and eventually 150+ effects (entrance,
pointer, press, physics, scroll, parallax, cinematic scenes, page and layout transitions, text, SVG,
media, ambient, loading, 3D and distortion). The vision kept an "animation framework" out of the MVP;
0.1.0 is published without it. Constraints: `@neshel-ui/core` is private (ADR 0002); ESM/NodeNext and
packed-artifact validation (ADR 0004); precompiled, layered CSS without resets (ADR 0008); `asChild`
via Radix Slot (ADR 0009); no provider for basic theming (ADR 0006); fixed release group of five
packages (ADR 0017); three-OS CI (ADR 0003).

## Decision

1. **A new package, `@neshel-ui/animations`, private until the owner approves its first
   publication.** It is outside the Changesets fixed group and the release scripts; its tarball is
   still validated (`check:pack --with animations`).
2. **Layers** (top to bottom): React API (components, hooks — thin wrappers) → effect controllers and
   presets (registry with channel metadata, 009) → core engine (`./core`: frame scheduler with
   read/update/write phases, springs, transform composer, reduced-motion policy; later interpolation,
   timelines, observers) → drivers → composition (ADR 0019). Accessibility and performance rules
   (contracts/accessibility.md) apply to every layer.
3. **Driver ladder**: CSS → Web Animations API → JavaScript (core scheduler) → GPU (optional entry).
   Each effect uses the cheapest driver that renders it correctly; native scroll-driven animations and
   View Transitions are used where supported, always with a fallback, and claimed per engine only after
   a browser check.
4. **The engine lives in the package** as the framework-free `./core` subpath (no React, no DOM access
   at import time), not in the private `@neshel-ui/core`.
5. **Entry points**: only implemented capabilities are exported — `.`, `./core`, `./styles.css` in
   008.0. Family subpaths are not created; new subpaths need a measured reason (runtime boundary or
   optional heavy capability, e.g. `./gpu`, possibly `./boot`), decision D3.
6. **Three API levels per effect**: component (declarative, `asChild`), hook on a consumer ref, and an
   imperative controller; components never hold per-frame React state.
7. **SSR/RSC**: React modules are `"use client"`; server markup never depends on motion state; content
   that animates in stays visible without JavaScript.
8. **Dependencies**: React (peer) and `@radix-ui/react-slot` only in 008.0; third-party engines per
   ADR 0020.

## Consequences

- Effects from different families share one frame loop, one reduced-motion policy and one composition
  model; bundle cost follows use (Tilt3D 5.95 KiB gzip incl. Slot; `composeTransform` 0.46 KiB).
- The package is a seventh workspace package: `tests/workspace.test.mjs` and the contract checks know
  it; release tooling deliberately does not.
- A version-line decision (fixed group vs independent, D2) is required before the first release PR.
- `@neshel-ui/core` remains empty; if other packages ever need the engine, `./core` is the shared
  source (a public dependency on `animations`) or a new public package — never the private core.

## Alternatives

- Put the engine in `@neshel-ui/core`: impossible while core is private (ADR 0002).
- Wrap Motion or GSAP as the engine: see ADR 0020 (ownership of `transform`, bundle, licence).
- Family subpaths (`/hover`, `/scroll`, `/cinematic`): more contract surface without a measured
  benefit while tree-shaking works (feature 005 research R2).
- Make the package intended-public now: would weaken the publishing guard before the API is approved.

## Verification

Implemented and verified locally in 008.0 ([evidence](../../specs/008-animations/evidence.md)):
`pnpm check` (contract, core and Tilt3D tests; tarball), `check:browser:animations` 14/14 in Chrome
157, Storybook and playground builds, unchanged release guards and Changesets status. Three-OS CI and
Firefox/WebKit runs are pending.
