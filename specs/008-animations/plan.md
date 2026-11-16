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

## Phase roadmap (proposal, each phase its own spec and owner gate)

| Phase | Scope                                                                                                                        | Families         | Entries |
| ----- | ---------------------------------------------------------------------------------------------------------------------------- | ---------------- | ------- |
| 008.0 | Architecture, contracts, catalogue, core spike, Tilt3D, CornerRecede/ScrollScene prototypes                                  | (H03)            | 1       |
| 009   | Motion foundation: registry + channels, interpolation, `springEasing`, presets CSS, motion tokens; Entrance, Hover, Press    | E, H, P          | 30      |
| 010   | Scroll engine (visibility, cached progress, SDA-first with JS fallback), ScrollScene API; Scroll Triggers, Scroll & Parallax | ST, SP           | 21      |
| 011   | Presence, FLIP, gestures; Physics & Gestures, Layout Animations                                                              | G, L (+H11, P11) | 23      |
| 012   | Timeline/sequencer, View Transitions + router adapters; Cinematic & Scenes, Page Transitions                                 | C, PT            | 20      |
| 013   | Accessible text splitter, path utilities; Typography & Text, SVG & Paths                                                     | T, S             | 21      |
| 014   | Images & Media, Background & Ambient, Loading & Feedback                                                                     | M, B, F          | 30      |
| 015   | Optional `./gpu` entry; Advanced 3D & Distortion (incl. CornerRecede API)                                                    | D                | 11      |
| 016   | Catalogue completion, docs-site section, budgets, packed consumers (Vite + Next SSR), release candidate                      | all              | —       |

## Pending decisions

| ID  | Decision                                  | Alternatives and trade-offs                                                                                                                                                                                                               | Recommendation                                             |
| --- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| D1  | Scope of the first publication            | (a) after 009 — early feedback, but no scroll, the most requested capability; (b) after 010 — interaction + scroll, core proven by ~50 effects; (c) after 016 — complete but very late, API frozen without user feedback                  | **(b)** as `0.x`, documented as experimental               |
| D2  | Version line                              | (a) join the fixed group (one version for all; forces bumps of unrelated packages and couples cadences); (b) independent line starting at its own `0.1.0` (needs a Changesets config change and release-workflow support, owner-approved) | **(b)**, decided before the first release PR               |
| D3  | Entry points                              | (a) `.`, `./core`, `./styles.css` + `./gpu` (015) [+ `./boot` if D4=a]; (b) the brief's family subpaths (`/hover`, `/scroll`, `/cinematic`) — clearer imports, more contract surface, no measured benefit                                 | **(a)**; revisit with bundle data                          |
| D4  | Entrance hidden state without JS          | (a) `./boot` inline flag + timeout; (b) CSS `@media (scripting: enabled)` only — hides content if the bundle fails; (c) never hide before hydration — first paint shows final state, entrance only on later reveals                       | **(a)** with (c) as the default for above-the-fold content |
| D5  | Motion tokens                             | (a) add durations/easings/distances to `@neshel-ui/config` (published contract change, minor bump, themeable); (b) keep `--neshel-motion-*` inside the animations stylesheet                                                              | **(a)** in 009, owner-approved config change               |
| D6  | Third-party engine for layout/gestures    | (a) own primitives (FLIP, gestures) — full control, more work; (b) Motion for projection/gestures — mature, larger bundle, its own `transform` ownership                                                                                  | Decide in 011 with the R13 benchmark                       |
| D7  | Tilt3D naming and default direction       | `Tilt3D` vs `Tilt`; default "press away" vs "toward the pointer"                                                                                                                                                                          | Keep `Tilt3D`, "press away" (decide before publication)    |
| D8  | Support policy for SDA / View Transitions | (a) use natively with mandatory fallback; (b) JS everywhere for uniform behaviour                                                                                                                                                         | **(a)**, claims per engine only after a browser run        |
| D9  | Docs for experimental packages            | (a) Storybook only until publication; (b) docs-site section marked experimental                                                                                                                                                           | **(a)** until D1 is reached                                |

## Recommendation for Phase 009

1. Owner review of 008.0; authorise pushing `feature/008-animations` so the three-OS CI (including the
   new `--with animations` and lab steps) runs — CI is the only pending gate of 008.0.
2. Decide D3, D5 and D7 (they shape 009's API); D1/D2 can wait until 010.
3. Start 009 with the foundation before effects: effect registry with channel metadata and dev
   conflict warnings; interpolation/easing helpers and `springEasing()`; motion tokens; the presets
   stylesheet; then families E, H and P (30 entries) as CSS-first presets with React wrappers.
4. Add Firefox/WebKit runs of the lab (ADR 0016 harness), `check:bundles` entries with budgets, and
   a packed external consumer (Vite + SSR) for `animations`.

## Complexity Tracking

| Item                                       | Why needed                                                           | Simpler alternative rejected because                        |
| ------------------------------------------ | -------------------------------------------------------------------- | ----------------------------------------------------------- |
| Window-level pointer tracking during hover | Hit area must be the untransformed box (oscillation found in Chrome) | A wrapper element breaks the single-element `asChild` model |
| `check:pack --with` option                 | Validate a private package's real tarball before it is public        | Making the package intended-public would weaken its guard   |
| WebGL technique in the lab                 | Only way to show real deformation honestly (brief §7B)               | Omitting it would leave "real geometry" unevaluated         |
