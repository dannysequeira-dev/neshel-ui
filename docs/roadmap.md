# Incremental roadmap

Legend: **Scaffold** = files exist, **Planned** = work not done, **Verified** = gates passed.

| Slice | Scope                                                                                       | Status                                                                                       | Mandatory gate                                           |
| ----- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| 001   | Foundation: repo setup, pnpm, TS, Storybook, Vite, CI, Spec Kit, packed-artifact validation | PASS — closed; closure commit `b8c6198` CI 5/5 in run 42441381954 (reported by the owner)    | `specs/001-foundation/spec.md` SC-001–SC-007             |
| 002   | Config & tokens: typed `defineConfig`, themes, generator CLI                                | PASS — implemented and CI-verified (002.0–002.5); `specs/002-config-and-tokens/`             | CSS-only consumer; generated CSS determinism             |
| 003   | Layout primitives: Box / Flex / Stack / Inline / Grid / Center / Container                  | PASS — closed; tag `v0.0.1-phase-3` (owner)                                                  | Responsive variants, semantic DOM, SSR, tests            |
| 004   | Typography: Heading / Text / Paragraph / Caption + Capsize; custom responsive breakpoints   | PASS — closed (`e2c60d1`, run 42489974343)                                                   | Font metrics snapshots, accessibility, SSR               |
| 005   | Components, navigation, overlays, selection and application shell (expanded MVP)            | PASS — closed by the owner (2026-11-09); `f66afe4`, CI runs 42543517738 / 42544327073 5/5    | Interactions, keyboard, focus, contrast                  |
| 006   | Documentation website, DX, release hardening (R1–R9) and release candidate                  | Complete, awaiting owner review (CONDITIONAL PASS recommended); `specs/006-docs-dx-release/` | Docs CI, packed Next/Vite consumers, 3 browsers, dry-run |
| 007   | First publication (owner-authorised execution of the pipeline prepared in 006)              | Planned — requires explicit owner authorisation                                              | Owner approval, scope owned, npm dry-run, provenance     |

Documentation hosting: Vercel (owner decision 2026-11-09), live at https://neshel-ui.vercel.app — [deployment.md](deployment.md).

## Pre-publication requirements

The owner's Phase 005 review recorded nine open requirements (R1–R9) that must be met before any
npm publication: [release-readiness.md](release-readiness.md). They are worked on in feature 006
(owner brief 2026-11-08).

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
