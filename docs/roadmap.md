# Incremental roadmap

Legend: **Scaffold** = files exist, **Planned** = work not done, **Verified** = gates passed.

| Slice | Scope                                                                                                                                      | Status                                                                                                              | Mandatory gate                                              |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| 001   | Foundation: repo setup, pnpm, TS, Storybook, Vite, CI, Spec Kit, packed-artifact validation                                                | PASS — closed; closure commit `b8c6198` CI 5/5 in run 42441381954 (reported by the owner)                           | `specs/001-foundation/spec.md` SC-001–SC-007                |
| 002   | Config & tokens: typed `defineConfig`, themes, generator CLI                                                                               | PASS — implemented and CI-verified (002.0–002.5); `specs/002-config-and-tokens/`                                    | CSS-only consumer; generated CSS determinism                |
| 003   | Layout primitives: Box / Flex / Stack / Inline / Grid / Center / Container                                                                 | PASS — closed; tag `v0.0.1-phase-3` (owner)                                                                         | Responsive variants, semantic DOM, SSR, tests               |
| 004   | Typography: Heading / Text / Paragraph / Caption + Capsize; custom responsive breakpoints                                                  | PASS — closed (`e2c60d1`, run 42489974343)                                                                          | Font metrics snapshots, accessibility, SSR                  |
| 005   | Components, navigation, overlays, selection and application shell (expanded MVP)                                                           | PASS — closed by the owner (2026-11-09); `f66afe4`, CI runs 42543517738 / 42544327073 5/5                           | Interactions, keyboard, focus, contrast                     |
| 006   | Documentation website, DX, release hardening (R1–R9) and release candidate                                                                 | PASS — closed (2026-11-09); R1–R9 met; CI run 42731164807 14/14; `specs/006-docs-dx-release/`                       | Docs CI, packed Next/Vite consumers, 3 browsers, dry-run    |
| 007   | First publication (owner-authorised execution of the pipeline prepared in 006)                                                             | PASS — closed (2026-11-10); 0.1.0 on npm, tag `v0.1.0`, run 42843343125; `specs/007-first-publication/`             | Owner approval, scope owned, npm dry-run, provenance        |
| 008.0 | Animations: architecture, contracts, 157-entry catalogue, private `@neshel-ui/animations` (core + Tilt3D), CornerRecede/ScrollScene spikes | Merged into `main` (squash `fd3885c`, PR #4) and verified in CI (run 43805520902, 14/14); `specs/008-animations/`   | Owner review; three-OS CI; package stays private            |
| 009   | Animations: Motion Engine — effect registry, channel composition, conflict detection, motion controllers, motion defaults                  | Merged into `main` (squash `44dc1c9`, PR #6) and validated by the owner (2026-11-16); `specs/009-motion-engine/`    | Owner approval of the spec                                  |
| 010   | Animations: presets; Entrance, Hover, Press (30 entries)                                                                                   | Merged into `main` (squash `70d852b`, PR #7) and approved by the owner (2026-11-16); `specs/010-animation-effects/` | Composition matrix; three engines; packed consumer; budgets |
| 011   | Animations: scroll engine, ScrollScene API; Scroll Triggers, Scroll & Parallax (21)                                                        | Merged into `main` (squash `804badb`, PR #8) and approved by the owner (2026-11-17); `specs/011-scroll-parallax/`   | No scroll hijacking; three engines; packed SSR consumer     |
| 012   | Animations: presence, FLIP, gestures; Physics & Gestures, Layout Animations, H11, P11 (23)                                                 | In development on `feature/012-physics-gestures-layout`; `specs/012-physics-gestures-layout/`; PR for owner review  | Benchmark before any engine dependency (ADR 0020)           |
| 013   | Animations: timelines, View Transitions; Cinematic & Scenes, Page Transitions (20)                                                         | Planned                                                                                                             | —                                                           |
| 014   | Animations: text splitter, paths; Typography & Text, SVG & Paths (21)                                                                      | Planned                                                                                                             | —                                                           |
| 015   | Animations: Images & Media, Background & Ambient, Loading & Feedback (30)                                                                  | Planned                                                                                                             | —                                                           |
| 016   | Animations: optional `./gpu` entry; Advanced 3D & Distortion (11); packed consumers; release candidate                                     | Planned — first animations publication only after this scope is complete and verified (D1)                          | Owner approval                                              |

Documentation hosting: Vercel (owner decision 2026-11-09), live at https://neshel-ui.vercel.app — [deployment.md](deployment.md).

Animation phases 009–016 are a proposal from [the 008 plan](../specs/008-animations/plan.md); each
needs its own spec and owner gate. Nothing in them is implemented. Owner decisions 2026-11-15: no
animations publication before the agreed initial scope (including the advanced families) is complete
and verified (D1); independent version line (D2).

## Pre-publication requirements

The owner's Phase 005 review recorded nine requirements (R1–R9) that had to be met before any
npm publication: [release-readiness.md](release-readiness.md). All nine were met in feature 006
(closed 2026-11-09); R3's manual screen-reader part is owner-reported. 0.1.0 was published in feature 007
(2026-11-10): [evidence](../specs/007-first-publication/evidence.md).

## Release definition (`v0.1.0`)

- Public package contracts and docs match source and packed artifacts.
- Token/theme customization works in light/dark and high-contrast checks pass.
- Storybook documents real components, not just foundation welcome story.
- Independent pnpm installs of selected packages work without workspace links.
- Vite/Next consumers build and Next SSR hydrates without mismatch.
- Correct license, package metadata, semver, ESM/d.ts and CSS exports.
- Packages' `private` guard removed only on explicit approval.
- CI and release workflow reviewed and npm publishing authorized manually.

## Status vocabulary

Feature 001 tracks four states in [its evidence log](../specs/001-foundation/evidence.md):
**implemented** (code or configuration exists), **verified locally** (gates passed on a
named machine), **verified in GitHub Actions** (gates passed on native runners for a named
commit) and **planned**. A changed CI matrix counts as verified only after GitHub Actions
runs it.
