# Incremental roadmap

Legend: **Scaffold** = files exist, **Planned** = work not done, **Verified** = gates passed.

| Slice | Scope | Status | Mandatory gate |
| --- | --- | --- | --- |
| 001 | Foundation: repo setup, pnpm, TS, Storybook, Vite, CI, Spec Kit, packed-artifact validation | In progress — spec approved; 001.0 (Spec Kit) done locally; 001.1–001.5 planned | `specs/001-foundation/spec.md` SC-001–SC-007 |
| 002 | Config & tokens: typed `defineConfig`, themes, generator CLI | Planned | CSS-only consumer; generated CSS determinism |
| 003 | Layout primitives: Box / Stack / Inline / Grid / Center / Container | Planned | Responsive variants, semantic DOM, SSR, tests |
| 004 | Typography: Heading / Text / Paragraph / Caption + Capsize | Planned | Font metrics snapshots, accessibility, SSR |
| 005 | Core UI: Button / Card / Badge / Input / Separator / Skeleton | Planned | Interactions, keyboard, focus, contrast |
| 006 | Packaging and external consumers, docs and examples | Planned | Packed Vite and Next builds from isolated tarballs |
| 007 | First release and maintainers' publishing pipeline | Planned | Owner approval, available scope, npm dry-run, provenance |

## Release definition (`v0.1.0`)

- Public package contracts and docs match source and packed artifacts.
- Token/theme customization works in light/dark and high-contrast checks pass.
- Storybook documents real components, not just foundation welcome story.
- Independent pnpm installs of selected packages work without workspace links.
- Vite/Next consumers build and Next SSR hydrates without mismatch.
- Correct license, package metadata, semver, ESM/d.ts and CSS exports.
- Packages' `private` guard removed only on explicit approval.
- CI and release workflow reviewed and npm publishing authorized manually.

## Why the setup ZIP stops here

The maintainer requested a **bootstrap first**, before implementing the design
system with Claude. This ZIP delivers structure, project context and a feature
specification to prevent the agent from inventing APIs without review.
