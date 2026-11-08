# Feature 001 — Reproducible monorepo foundation

- **Status:** approved specification (2026-11-07); scaffold installed and locally verified
  on Windows for the gates listed in the evidence log; 001.1 pushed with a partial CI pass (lint fix pending push); 001.2 locally verified (CI pending); 001.3–001.5 not yet implemented; native CI parity for the new requirements not yet verified.
- **Priority:** P0
- **Owner:** project maintainer
- **Date:** 2026-11-07

## Problem

We need a trustworthy, cross-platform baseline before asking Claude to build
React packages. The system must be explicitly modular, scoped for npm, compatible
with Tailwind CSS v4, usable through official Spec Kit workflows, and able to
publish independent packages without workspace-only assumptions.

## Clarifications

### Session 2026-11-07 — maintainer architecture decisions

- Q: Which Node.js versions are supported? → A (**D1**): Node 26 LTS is the primary
  development version (`.nvmrc`). CI runs Node 26 on native Windows, Linux and macOS,
  plus Node 22 and Node 24 compatibility jobs on Linux. pnpm stays pinned through
  `packageManager`. Library consumers must not be required to run Node 26; the
  contributor floor remains `>=22.13`.
- Q: Which React versions are supported? → A (**D2**): React 19 only for the initial
  release, with a React 19 peer range on packages that need React. No React 18 or 20
  claim until verified; React 18 compatibility is a documented future investigation.
  Non-React packages (`config`, `cli`, `core` unless justified) carry no React dependency.
- Q: What happens to `@neshel-ui/core`? → A (**D3**): Remove the unused `core`
  dependencies; keep `core` private; document rules for future shared internal
  utilities ([ADR 0002](../../docs/decisions/0002-internal-core-package.md)). Never ship
  a public package with an unresolved private runtime dependency. No bundler is
  introduced solely for a problem that does not exist yet.
- Q: Vite 7 or Vite 8? → A (**D4**): Time-boxed Vite 8 compatibility spike within
  Phase 001 (app build, Storybook, dependency/peer compatibility, CI). Adopt Vite 8 if
  gates pass; otherwise keep Vite 7 and record the blocker. The spike must not block
  the rest of the foundation.
- Q: Are source maps published? → A (**D5**): Yes. JS and declaration maps are kept,
  the source files they reference are packed, and every map must resolve to a file in
  the tarball. Package contents stay intentional and minimal.
- Q: How are packages validated? → A (**D6**): Adopt `publint` and
  `@arethetypeswrong/cli`, plus a portable `check:pack` that validates each intended
  public package from its real packed artifact.
- Q: How does CI behave? → A (**D7**): Frozen-lockfile installs, pnpm caching, lint and
  package-integrity checks in CI. GitHub CLI may be used to inspect runs but is never a
  required development dependency. No push or publish without explicit approval.
- Q: Which module resolution do libraries use? → A: Library packages compile with
  NodeNext-compatible resolution and explicit relative ESM extensions; applications may
  keep Bundler resolution. Public packages are ESM-only; no CommonJS build is added for
  hypothetical compatibility ([ADR 0004](../../docs/decisions/0004-package-distribution.md)).
- Q: Where does the Tailwind `@theme` mapping live? → A: Standard CSS tokens and the
  Tailwind-specific integration will be separate exports; the split is implemented in
  feature 002, not here.

## User stories / acceptance scenarios

**US-01 (P0) — I can bootstrap the repository on Windows, Linux and macOS**

Given a clean Node 26 (or 22.13+/24 on Linux) and pinned pnpm environment, when I clone
the repository and run `pnpm install --frozen-lockfile`, I get a resolved workspace with
no missing package references or scripts.

**US-02 (P0) — All package entrypoints build independently**

Given installed dependencies, when I run `pnpm build:packages` and
`pnpm check:exports`, the six packages produce valid entrypoints, declarations,
source maps and CSS exports wherever declared.

**US-03 (P0) — Storybook and Vite demonstrate base tokens**

Given completed package builds, when I run `pnpm dev:storybook` and
`pnpm dev:playground`, both load the default stylesheet and render a foundation
preview in the browser. The Vite preview toggles light/dark via a data attribute.

**US-04 (P0) — Claude follows constraints**

Given a fresh Claude Code session, `CLAUDE.md`, project skills and the constitution
guide the architecture and require explicit approval before publication. Official Spec
Kit integration is bootstrapped through the CLI and preserved alongside project context.

**US-05 (P1) — CI validates the repository without publishing**

Given a push to GitHub, CI installs with a frozen lockfile, runs workspace checks, lint,
tests, typechecks, package builds, package-integrity checks and Storybook/Vite smoke
builds, without any npm token or publish action.

**US-06 (P0) — Packed packages work outside the workspace**

Given built packages, when each intended public package is packed and installed into a
temporary project outside the repository (path containing spaces and Unicode), its
exports, declarations, source maps and CSS resolve without `workspace:` links, source
aliases or private dependencies.

## Functional requirements

- FR-001: Use pnpm workspaces in `packages/*` and `apps/*` with a common catalog.
- FR-002: Provide six package manifests with stable scoped names and explicit ESM/types exports.
- FR-003: Keep `@neshel-ui/core` private and remove dependencies on it that no source uses (D3).
- FR-004: Use TypeScript strict compiler options and a cross-platform build script.
- FR-005: Export baseline light/dark CSS tokens and Tailwind `@theme inline` names (split deferred to 002).
- FR-006: Provide Storybook and Vite scaffold apps that consume built CSS from the workspace.
- FR-007: Keep every package private until authorized; no automatic npm publishing.
- FR-008: Provide project constitution, agent context, feature spec, ADRs, README, release guide.
- FR-009: Provide a platform-neutral Node script using official Spec Kit `--script py` integration.
- FR-010: Verify package export targets after build; workspace linking alone never proves publishability.
- FR-011: Commit `pnpm-lock.yaml`; CI installs only with `--frozen-lockfile`.
- FR-012: Keep config schema/CLI, React components and Capsize functionality out of this feature.
- FR-013: Run Node 26 on native Windows, Linux and macOS runners, plus Node 22 and 24 on Linux (D1).
- FR-014: Detect basic script portability mistakes and case-collision paths.
- FR-015: Include regression tests for paths with whitespace and Unicode.
- FR-016: Do not equate a single-platform local run with cross-platform verification.
- FR-017: React packages declare a React 19 peer range only; non-React packages have no React dependency (D2).
- FR-018: Library packages compile with NodeNext resolution and explicit relative `.js` extensions; ESM only.
- FR-019: Packed tarballs include the sources referenced by JS and declaration maps, and nothing unintended (D5).
- FR-020: `pnpm check:pack` packs every intended public package and rejects missing files,
  unresolved `workspace:` protocols, private/unpublished dependencies, broken source maps,
  missing CSS assets and failing `publint` / `@arethetypeswrong/cli` results (D6).
- FR-021: An external-consumer smoke test installs packed artifacts outside the workspace
  and builds a Vite + Tailwind application importing `@neshel-ui/config/styles.css`.
- FR-022: `pnpm lint` passes by fixing problems, not by suppressing rules; officially
  vendored Spec Kit files may be excluded from formatting because their hashes are tracked
  by Spec Kit manifests.
- FR-023: CI uses pnpm caching and runs lint and package-integrity checks (D7).
- FR-024: Time-boxed Vite 8 spike; adoption or a documented blocker (D4).
- FR-025: Workspace package lists are derived from the workspace where practical instead of
  being duplicated across scripts and tests.

## Nonfunctional requirements

- Node 26 primary for development; contributor floor `>=22.13`; pinned pnpm 12.x.
- First-class Windows, Linux and macOS support.
- Public-facing docs in English; local maintainer setup available in Spanish.
- ESM output, type declarations, zero React copies bundled in libraries.
- Repo free from secret files, personal backstory and publication credentials.
- Documents distinguish **implemented**, **locally verified** and **CI-verified**.

## Measurable success criteria

- SC-001: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build:packages`,
  `pnpm check:exports`, `pnpm check:pack` exit 0 locally and in every CI job.
- SC-002: `pnpm check:pack` reports 0 errors for the 5 intended public packages
  (`config`, `layout`, `typography`, `components`, `cli`), with `publint` and
  `@arethetypeswrong/cli` clean for the ESM entry resolutions we support.
- SC-003: No packed `package.json` contains `workspace:` or `@neshel-ui/core`.
- SC-004: 100% of `sources` entries in packed `.map` files resolve inside the tarball.
- SC-005: External consumer build succeeds and its CSS output contains `--neshel-*` tokens.
- SC-006: CI is green on Node 26 × {Windows, Linux, macOS} and Node 22/24 × Linux.
- SC-007: Vite 8 decision recorded with the evidence that justifies it.

## Release gate / evidence required

1. All SC-001–SC-007 met, with actual output recorded in the evidence log.
2. `pnpm build:playground` and `pnpm build:storybook` pass and previews are inspected.
3. Official Spec Kit Claude integration installed; project constitution and skills preserved.
4. No `private: true` flags removed, no npm packages published.

## Explicit assumptions / open questions

- `@neshel-ui` scope is tentative until verified; rename carefully if unavailable.
- Package-level CSS compilation policy and the standard-vs-Tailwind CSS split belong to feature 002.
- React 18 compatibility is a future investigation, not a commitment.
- Exact versions may need adjustment; never guess test results.
- The next feature is token config + CLI, not a complete UI component collection.
