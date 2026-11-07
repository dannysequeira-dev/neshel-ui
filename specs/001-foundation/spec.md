# Feature 001 — Reproducible monorepo foundation

**Status:** proposed specification; scaffold files created, acceptance gates not yet
run against a real installed workspace.  
**Priority:** P0  
**Owner:** project maintainer  
**Date:** 2026-11-07

## Problem

We need a trustworthy, Windows-friendly baseline before asking Claude to build
React packages. The system must be explicitly modular, scoped for npm, compatible
with Tailwind CSS v4 and usable through official Spec Kit workflows.

## User stories / acceptance scenarios

**US-01 (P0) — I can bootstrap the repository on Windows**

Given a clean Node 22.13+ and pnpm 12 environment, when I unzip the archive into
an empty repository root and run `pnpm install`, I get a lockfile and a resolved
workspace with no missing package references or scripts.

**US-02 (P0) — All package entrypoints build independently**

Given installed dependencies, when I run `pnpm build:packages` and
`pnpm check:exports`, the six packages produce valid entrypoints, declarations
and CSS exports wherever declared.

**US-03 (P0) — Storybook and Vite demonstrate base tokens**

Given completed package builds, when I run `pnpm dev:storybook` and
`pnpm dev:playground`, both load the default stylesheet and render a foundation
preview in the browser. The Vite preview toggles light/dark via a data attribute.

**US-04 (P0) — Claude follows constraints**

Given a fresh Claude Code session, when the agent begins, `CLAUDE.md`, project
skills and the constitution guide the architecture and require an explicit
approval before publication. Official Spec Kit integration is bootstrapped
through the CLI and preserved alongside project context.

**US-05 (P1) — CI validates the repository without publishing**

Given a push to GitHub, the CI workflow installs dependencies, runs workspace
checks/tests/typechecks, builds packages and smoke-builds the Storybook/Vite apps,
without any npm token or publish action.

## Functional requirements

- FR-001: Use pnpm workspaces in `packages/*` and `apps/*` with a common catalog.
- FR-002: Provide six package manifests with stable scoped names and explicit ESM/types exports.
- FR-003: Treat `@neshel-ui/core` as private internal code; do not silently publish an unusable dependency graph.
- FR-004: Use TypeScript strict compiler options and a cross-platform build script.
- FR-005: Export baseline light/dark CSS tokens and Tailwind `@theme inline` names.
- FR-006: Provide Storybook and Vite scaffold apps that consume built CSS from the workspace.
- FR-007: Keep every package private until authorized; no automatic npm publishing.
- FR-008: Provide project constitution, agent context, feature spec, ADR, README, release guide.
- FR-009: Include Windows-friendly bootstrap script for official Spec Kit integration.
- FR-010: Verify package export targets after build; do not claim only workspace linking proves publishability.
- FR-011: Produce initial lockfile during real install and commit it.
- FR-012: Keep config schema/CLI, React components and Capsize functionality out of this bootstrap.

## Nonfunctional requirements

- Node 22.13+, pnpm 12.x, Windows 11/PowerShell 7 support.
- Public-facing docs in English; local maintainer setup available in Spanish.
- ESM output, type declarations, zero React copies bundled in libraries.
- Repo should be free from secret files, personal backstory and publication credentials.
- Project should allow independent installs and tarball tests in later slices.

## Release gate / evidence required

1. `pnpm install` succeeds on a maintainer-supported Windows environment.
2. `pnpm check:workspace`, `pnpm build:packages`, `pnpm check:exports`, `pnpm test`,
   `pnpm typecheck`, `pnpm lint` all pass after formatting/fixes.
3. `pnpm build:playground` and `pnpm build:storybook` pass, previews are inspected.
4. `pnpm-lock.yaml` committed. CI green.
5. Official Spec Kit Claude integration installed; project constitution preserved.
6. No `private: true` flags removed, no npm packages published.

## Explicit assumptions / open questions

- `@neshel-ui` scope is tentative until verified; rename carefully if unavailable.
- Package-level full CSS compilation policy to be chosen in feature 002.
- `@neshel-ui/core` release dependency solution deferred to ADR 0002.
- Exact versions may need adjustment during fresh install; never guess test results.
- The next feature is token config + CLI, not a complete UI component collection.
