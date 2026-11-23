# Incremental roadmap

Legend: **Scaffold** = files exist, **Planned** = work not done, **Verified** = gates passed.

| Slice | Scope                                                                                                                                                  | Status                                                                                                                                                             | Mandatory gate                                                                                          |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| 001   | Foundation: repo setup, pnpm, TS, Storybook, Vite, CI, Spec Kit, packed-artifact validation                                                            | PASS — closed; closure commit `b8c6198` CI 5/5 in run 42441381954 (reported by the owner)                                                                          | `specs/001-foundation/spec.md` SC-001–SC-007                                                            |
| 002   | Config & tokens: typed `defineConfig`, themes, generator CLI                                                                                           | PASS — implemented and CI-verified (002.0–002.5); `specs/002-config-and-tokens/`                                                                                   | CSS-only consumer; generated CSS determinism                                                            |
| 003   | Layout primitives: Box / Flex / Stack / Inline / Grid / Center / Container                                                                             | PASS — closed; tag `v0.0.1-phase-3` (owner)                                                                                                                        | Responsive variants, semantic DOM, SSR, tests                                                           |
| 004   | Typography: Heading / Text / Paragraph / Caption + Capsize; custom responsive breakpoints                                                              | PASS — closed (`e2c60d1`, run 42489974343)                                                                                                                         | Font metrics snapshots, accessibility, SSR                                                              |
| 005   | Components, navigation, overlays, selection and application shell (expanded MVP)                                                                       | PASS — closed by the owner (2026-11-09); `f66afe4`, CI runs 42543517738 / 42544327073 5/5                                                                          | Interactions, keyboard, focus, contrast                                                                 |
| 006   | Documentation website, DX, release hardening (R1–R9) and release candidate                                                                             | PASS — closed (2026-11-09); R1–R9 met; CI run 42731164807 14/14; `specs/006-docs-dx-release/`                                                                      | Docs CI, packed Next/Vite consumers, 3 browsers, dry-run                                                |
| 007   | First publication (owner-authorised execution of the pipeline prepared in 006)                                                                         | PASS — closed (2026-11-10); 0.1.0 on npm, tag `v0.1.0`, run 42843343125; `specs/007-first-publication/`                                                            | Owner approval, scope owned, npm dry-run, provenance                                                    |
| 008.0 | Animations: architecture, contracts, 157-entry catalogue, private `@neshel-ui/animations` (core + Tilt3D), CornerRecede/ScrollScene spikes             | Merged into `main` (squash `fd3885c`, PR #4) and verified in CI (run 43805520902, 14/14); `specs/008-animations/`                                                  | Owner review; three-OS CI; package stays private                                                        |
| 009   | Animations: Motion Engine — effect registry, channel composition, conflict detection, motion controllers, motion defaults                              | Merged into `main` (squash `44dc1c9`, PR #6) and validated by the owner (2026-11-16); `specs/009-motion-engine/`                                                   | Owner approval of the spec                                                                              |
| 010   | Animations: presets; Entrance, Hover, Press (30 entries)                                                                                               | Merged into `main` (squash `70d852b`, PR #7) and approved by the owner (2026-11-16); `specs/010-animation-effects/`                                                | Composition matrix; three engines; packed consumer; budgets                                             |
| 011   | Animations: scroll engine, ScrollScene API; Scroll Triggers, Scroll & Parallax (21)                                                                    | Merged into `main` (squash `804badb`, PR #8) and approved by the owner (2026-11-17); `specs/011-scroll-parallax/`                                                  | No scroll hijacking; three engines; packed SSR consumer                                                 |
| 012   | Animations: presence, FLIP, gestures; Physics & Gestures, Layout Animations, H11, P11 (23)                                                             | Merged into `main` (squash `97a2b22`, PR #10) and approved by the owner (2026-11-18); stabilization #9/#11 merged (`b7bfe14`, PR #12)                              | Benchmark before any engine dependency (ADR 0020)                                                       |
| 013   | Animations: timelines, View Transitions; Cinematic & Scenes, Page Transitions (20)                                                                     | Merged into `main` (squash `7207638`, PR #13) and approved by the owner (2026-11-19); `specs/013-cinematic-page-transitions/`                                      | No hijacking; native VT with verified fallbacks; real router consumers                                  |
| 014   | Animations: text splitter, paths; Typography & Text, SVG & Paths (21)                                                                                  | Merged into `main` (squash `3706a36`, PR #15) and approved by the owner (2026-11-21); main CI 44923680210 14/14; issue #9 closed (3/3 clean main runs), #11 closed | One accessible text; exact geometry; no dependency; three engines                                       |
| 015   | Animations: Images & Media, Background & Ambient, Loading & Feedback (30)                                                                              | Merged into `main` (squash `da79b4a`, PR #16) and approved by the owner (2026-11-22); main CI 45079243865 14/14 (attempt 2); `specs/015-media-ambient-feedback/`   | Media semantics kept; ambient paused off-screen/hidden; no false progress; measured Canvas/GPU decision |
| 016   | Animations: optional `./gpu` entry; Advanced 3D & Distortion (11); packed consumers; release candidate                                                 | Merged into `main` (squash `365a24d`, PR #17); ADR 0031 accepted; main CI 45117009871 13/14 (K-15 on macOS, fixed in 017); `specs/016-advanced-3d-distortion/`     | Owner approval                                                                                          |
| 017   | Components completion: K-15 fix + CI audit; Toast/Toaster moved to Components (F06 stays as generic enter/exit motion); Accordion, Collapsible, Switch | **Current** — in development on `feature/017-components-completion`; `specs/017-components-completion/`; no publication                                            | 14/14 first-attempt CI on the final PR SHA; owner approval                                              |

Documentation hosting: Vercel (owner decision 2026-11-09), live at https://neshel-ui.vercel.app — [deployment.md](deployment.md).

Animation phases 009–016 are a proposal from [the 008 plan](../specs/008-animations/plan.md); each
needs its own spec and owner gate. Phases 009–016 are implemented and merged (157/157 entries); Phase 017 completes Components. Owner decisions 2026-11-15: no
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
