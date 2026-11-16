# ADR 0018 — Animation system architecture

- Status: **Accepted** in part (2026-11-15): decisions §1–§8 implemented for the 008.0 spike; the
  owner approved D1 (publication scope), D2 (independent versions), D3 (family subpaths as
  implemented), D5 (motion defaults inside Animations) and D7 (Tilt3D inward by default)
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
   008.0. Family subpaths (e.g. `./hover`, `./scroll`, `./cinematic`, `./gpu`) are added **as each
   family is implemented** (owner decision D3, 2026-11-15); `./core` stays framework-free and no
   subpath is published for an unimplemented capability. Each new subpath updates the package contract
   and `checkAnimationsContract`.
6. **Three API levels per effect**: component (declarative, `asChild`), hook on a consumer ref, and an
   imperative controller; components never hold per-frame React state.
7. **SSR/RSC**: React modules are `"use client"`; server markup never depends on motion state; content
   that animates in stays visible without JavaScript.
8. **Dependencies**: React (peer) and `@radix-ui/react-slot` only in 008.0; third-party engines per
   ADR 0020.
9. **Motion defaults** (durations, easings, distances) live inside Animations first, as
   `--neshel-motion-*` custom properties and typed defaults; a later integration with
   `@neshel-ui/config` must be additive (new optional schema keys and tokens, no change to existing
   ones) so no published contract breaks (D5).

## Consequences

- Effects from different families share one frame loop, one reduced-motion policy and one composition
  model; bundle cost follows use (Tilt3D 5.95 KiB gzip incl. Slot; `composeTransform` 0.46 KiB).
- The package is a seventh workspace package: `tests/workspace.test.mjs` and the contract checks know
  it; release tooling deliberately does not.
- Independent version line (owner decision D2, 2026-11-15): `animations` will not join the fixed group
  of five; the Changesets and release-workflow changes are made only in the owner-approved release PR.
- No publication before the agreed initial scope, including the advanced families and their
  verifications, is complete (owner decision D1).
- `@neshel-ui/core` remains empty; if other packages ever need the engine, `./core` is the shared
  source (a public dependency on `animations`) or a new public package — never the private core.

## Alternatives

- Put the engine in `@neshel-ui/core`: impossible while core is private (ADR 0002).
- Wrap Motion or GSAP as the engine: see ADR 0020 (ownership of `transform`, bundle, licence).
- A single entry for every family: rejected by the owner (D3) in favour of modular family subpaths
  added as families are implemented.
- Make the package intended-public now: would weaken the publishing guard before the API is approved.

## Verification

Implemented and verified locally in 008.0 ([evidence](../../specs/008-animations/evidence.md)):
`pnpm check` (contract, core and Tilt3D tests; tarball), `check:browser:animations` 14/14 in Chrome
157, Storybook and playground builds, unchanged release guards and Changesets status. GitHub Actions on PR #4: run 43800110693 green
(14/14 jobs, lab 14/14 on Linux, Windows and macOS). Firefox/WebKit lab runs are pending (009).
