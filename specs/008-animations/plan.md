# Implementation Plan: Animation system foundation

**Branch**: `feature/008-animations` | **Date**: 2026-11-15 | **Spec**: [spec.md](spec.md)

## Summary

Milestone 008.0 specifies the whole animation system (15 families, 157 catalogue entries, shared
primitives, composition contract, entry points) and builds the minimum that the three spikes need:
a private `@neshel-ui/animations` with a framework-free core (frame scheduler, springs, transform
composer, reduced-motion policy) and Tilt3D at three API levels, plus CornerRecede and ScrollScene
prototypes in the playground. Phases 009–016 implement the catalogue in vertical slices.

## Technical Context

**Language/Version**: TypeScript 5.9 strict, ESM, NodeNext (library) / Bundler (apps)
**Primary Dependencies**: React 19 (peer), `@radix-ui/react-slot` (only runtime dependency)
**Storage**: N/A
**Testing**: `node:test` on built output (jsdom 29 for DOM, `react-dom/server` for SSR), type
fixtures, `check:pack --with animations`, CDP browser check (`check:browser:animations`), axe-core
**Target Platform**: evergreen browsers (Chrome verified; Firefox/WebKit pending), SSR on Node ≥ 22.13
**Project Type**: library package in a pnpm monorepo + playground/Storybook apps
**Performance Goals**: no React render per frame; one rAF loop; zero frames when idle; no layout
read per pointer/scroll event; Tilt3D ≤ 6 KiB gzip (observed 5.95 KiB)
**Constraints**: ADR 0002/0004/0008/0009/0017; private until owner approval; no heavy dependency
without benchmark (ADR 0020)
**Scale/Scope**: 008.0 = 1 package effect + 2 prototypes; whole feature = 157 entries over 8 phases

## Constitution Check

| Principle                      | 008.0 status                                                                                 |
| ------------------------------ | -------------------------------------------------------------------------------------------- |
| I Integrity                    | Evidence lists what ran; rigid techniques never called deformation; unverified claims marked |
| II Modular packages            | New package solves one problem; core stays private; no `components` import; one runtime dep  |
| III CSS-first, tokens          | CSS driver first; precompiled `.neshel-*` CSS; no generated utilities; motion tokens planned |
| IV Accessibility               | Reduced motion (live), focus pose, inert duplicates, axe clean, no focus manipulation        |
| V Typography/layout            | Split-text rules preserve semantics and Capsize trimming (013)                               |
| VI Tests and evidence          | Unit, type, contract, packed tarball, browser; skipped/pending checks recorded               |
| VII Minimal scope, spec-driven | Spec → research → contracts → plan → tasks → analysis → implement; ADRs 0018–0020            |
| VIII Safe releases             | `private: true`; no version/tag/publish/push; release scripts unchanged                      |
| IX Cross-platform              | Node-only scripts; paths via `node:path`; three-OS CI pending a push                         |

No violation requires justification.

## Project Structure

```text
specs/008-animations/        brief, spec, research, plan, tasks, analysis, evidence, contracts/, visual-verification/
packages/animations/
  src/core/                  scheduler.ts, spring.ts, compose.ts, reduced-motion.ts, index.ts   (./core)
  src/tilt/                  options.ts, controller.ts, use-tilt-3d.ts, tilt-3d.tsx
  src/index.ts, errors.ts, styles.css
  test/                      core, tilt, contract (+ helpers)
  type-tests/                valid.tsx, invalid.tsx
apps/playground-vite/        animations.html, src/animations/ (Tilt lab, CornerRecede, ScrollScene)
apps/storybook/src/animations/Tilt3D.stories.tsx
scripts/check-animations-browser.mjs, scripts/check-pack.mjs (--with), scripts/lib/pack-checks.mjs
docs/decisions/0018–0020
```

## Phase roadmap (re-planned 2026-11-15 after the owner review; each phase its own spec and owner gate)

The owner set Phase 009 as the **Motion Engine** (registry, composition, conflict detection, motion
controllers) before any mass implementation of effects; the effect families move one phase later.

| Phase | Scope                                                                                                                                     | Families            | Entries |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | ------- |
| 008.0 | Architecture, contracts, catalogue, core spike, Tilt3D, CornerRecede/ScrollScene prototypes                                               | (H03)               | 1       |
| 009   | Motion Engine: effect registry, channel composition, conflict detection, motion controllers, motion defaults, easing/`springEasing`       | — (Tilt3D migrated) | 0       |
| 010   | Presets stylesheet; Entrance, Hover, Press (first family subpaths)                                                                        | E, H, P             | 30      |
| 011   | Scroll engine (visibility, cached progress, SDA-first with JS fallback), ScrollScene API; Scroll Triggers, Scroll & Parallax              | ST, SP              | 21      |
| 012   | Presence, FLIP, gestures; Physics & Gestures, Layout Animations                                                                           | G, L (+H11, P11)    | 23      |
| 013   | Timeline/sequencer, View Transitions + router adapters; Cinematic & Scenes, Page Transitions                                              | C, PT               | 20      |
| 014   | Accessible text splitter, path utilities; Typography & Text, SVG & Paths                                                                  | T, S                | 21      |
| 015   | Images & Media, Background & Ambient, Loading & Feedback                                                                                  | M, B, F             | 30      |
| 016   | Optional `./gpu` entry; Advanced 3D & Distortion (incl. CornerRecede API); catalogue completion, packed consumers, release candidate (D1) | D                   | 11      |

## Decisions

Approved by the owner on 2026-11-15 (D1, D2, D3, D5, D7); the others remain pending.

| ID  | Decision                                  | Alternatives and trade-offs / approved outcome                                                                                                                                                                                                                                            | Recommendation                                             |
| --- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| D1  | Scope of the first publication            | **Approved:** no publication until the agreed initial scope is complete, including the advanced families and their verifications (Firefox, WebKit, packed external consumer, screen reader).                                                                                              | Approved 2026-11-15                                        |
| D2  | Version line                              | **Approved:** independent version line for `@neshel-ui/animations`, outside the fixed group of the five published packages. The Changesets/release-workflow change is made only in the owner-approved release PR.                                                                         | Approved 2026-11-15                                        |
| D3  | Entry points                              | **Approved:** family subpaths are allowed **as each family is implemented** (e.g. `./hover`, `./scroll`), keeping imports modular; `.` re-exports nothing heavy; `./core` stays framework-free; no subpath for unimplemented capabilities.                                                | Approved 2026-11-15                                        |
| D4  | Entrance hidden state without JS          | (a) `./boot` inline flag + timeout; (b) CSS `@media (scripting: enabled)` only — hides content if the bundle fails; (c) never hide before hydration — first paint shows final state, entrance only on later reveals                                                                       | **(a)** with (c) as the default for above-the-fold content |
| D5  | Motion defaults                           | **Approved:** motion defaults (durations, easings, distances) live inside Animations first (`--neshel-motion-*` custom properties in its stylesheet + typed defaults); a future, additive integration with `@neshel-ui/config` is designed so no existing contract breaks (009 research). | Approved 2026-11-15                                        |
| D6  | Third-party engine for layout/gestures    | (a) own primitives (FLIP, gestures) — full control, more work; (b) Motion for projection/gestures — mature, larger bundle, its own `transform` ownership                                                                                                                                  | Decide in 012 with the R13 benchmark                       |
| D7  | Tilt3D default direction                  | **Approved:** inward by default (the region under the pointer recedes); the explicit `reverse` option inverts the direction. Name stays `Tilt3D`.                                                                                                                                         | Approved 2026-11-15                                        |
| D8  | Support policy for SDA / View Transitions | (a) use natively with mandatory fallback; (b) JS everywhere for uniform behaviour                                                                                                                                                                                                         | **(a)**, claims per engine only after a browser run        |
| D9  | Docs for experimental packages            | (a) Storybook only until publication; (b) docs-site section marked experimental                                                                                                                                                                                                           | **(a)** until D1 is reached                                |

## Recommendation for Phase 009 (updated after the owner review)

1. Push `feature/008-animations` and open the PR (authorised 2026-11-15); CI on three OSes is the last
   gate of 008.0; no merge without the owner.
2. Phase 009 — Motion Engine is specified in `specs/009-motion-engine/` (registry, composition,
   conflict detection, controllers); implementation starts only after the owner approves it.
3. Firefox/WebKit lab runs, a packed external consumer and the screen-reader pass remain pending
   validations of 008.0, scheduled with 009 (engine) and required before any publication (D1).

## Complexity Tracking

| Item                                       | Why needed                                                           | Simpler alternative rejected because                        |
| ------------------------------------------ | -------------------------------------------------------------------- | ----------------------------------------------------------- |
| Window-level pointer tracking during hover | Hit area must be the untransformed box (oscillation found in Chrome) | A wrapper element breaks the single-element `asChild` model |
| `check:pack --with` option                 | Validate a private package's real tarball before it is public        | Making the package intended-public would weaken its guard   |
| WebGL technique in the lab                 | Only way to show real deformation honestly (brief §7B)               | Omitting it would leave "real geometry" unevaluated         |
