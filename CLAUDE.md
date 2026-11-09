# Claude Code — Neshel-UI Project Contract

**Current phase:** features 001–005 are closed (PASS; feature 005 approved by the owner on
2026-11-09). Do not start feature 006 until the owner's Phase 006 execution brief. Open
pre-publication requirements R1–R9: `docs/release-readiness.md` (accepted risks are not resolved).
All npm packages are private placeholders with validated distribution tooling.
**Mission:** build a small, modular, accessible React design system that consumers can
install without monorepo internals. **Do not implement the entire library in one pass.**

## Mandatory reading order (before proposing changes)

1. `.specify/memory/constitution.md` — binding engineering principles.
2. `docs/vision.md` and `docs/architecture.md` — intent and package boundaries.
3. `docs/package-contracts.md`, `docs/theming.md`, `docs/typography.md` — public contracts.
4. `docs/roadmap.md` and current `specs/<feature>/spec.md` — scope/gates.
5. `docs/decisions/` — existing choices, propose an ADR for nontrivial deviations.

## User and environment

- Primary maintainer develops on **Windows 11 with PowerShell 7**, but **Windows, Linux, and macOS are equally supported** for contributors and package consumers.
- Do not introduce OS-specific npm scripts or assume shell commands are portable; use Node.js standard library and pnpm scripts. CI must validate all three native OS runners.
- Use pnpm workspaces; npm/yarn must not create separate lockfiles.
- Documentation and public APIs are in **English**. Communicate with the maintainer in Spanish.
- Project tagline: **Rooted in faith. Built with hope.** Do not assume or publish
  private personal stories, identities, or relationships behind the project name.
- The package scope `@neshel-ui` has **not** been verified on npm. Do not claim otherwise.

## Technology / architecture

- Node 26 for development (`.nvmrc`); contributor floor >=22.13; pnpm pinned by `packageManager`.
- React + TypeScript strict, CSS-first Tailwind v4, Storybook React/Vite, Vite sandbox.
- Capsize is for typography with real font metrics and deterministic generated CSS.
- Radix may be used selectively for complex accessibility. Prefer native semantic HTML.
- React and React DOM must remain peer dependencies in published React packages.
- `config` is CSS/token infrastructure; `core` stays private; `layout` and `typography`
  must not depend on `components`; shared behavior flows toward `core`.
- No `@neshel-ui/components` import from `@neshel-ui/layout` or `@neshel-ui/typography`.
- Do not dynamically concatenate Tailwind class names. Prefer static variants,
  CSS variables and distributed, compiled CSS; Tailwind does not scan node_modules by default.
- No global CSS resets from library packages beyond documented, opt-in global styles.
- No runtime reading/evaluation of the consumer's TypeScript config in the browser.
- Avoid React providers for basic theme switching; use CSS custom properties and `data-neshel-theme`.

## Workflow: specification before implementation

1. Identify current feature (`specs/001-foundation/` initially).
2. Verify or bootstrap official Spec Kit integration with `pnpm run spec-kit:init` (see `docs/CROSS-PLATFORM.es.md`).
3. Use its clarify -> plan -> tasks -> analyze workflow before implementation.
4. Small vertical slice; minimal implementation and tests; package build / Storybook proof.
5. Record any unresolved contracts or DGS-like external constraints as blockers, not assumptions.
6. Run quality gates and document actual results. Never report an unrun test as passing.
7. Stop at owner approval before any npm publish, GitHub release, remote push, or
   removal of package `private` guard.

## Current runnable commands

- `pnpm run doctor` — Node version, workspace layout and OS portability audit.
- `pnpm check:portability` — detect problematic scripts and case-colliding paths.
- `pnpm run spec-kit:init` — install official Claude Spec Kit helpers using portable Python mode.
- `pnpm check:workspace` — verify bootstrap structure (works without dependencies).
- `pnpm install --frozen-lockfile` — install from the committed `pnpm-lock.yaml`.
- `pnpm build:packages` — clean `packages/*/dist`, build TS package exports and copy styles.
- `pnpm check:exports` — check exported paths exist (requires build).
- `pnpm check:pack` — validate real `pnpm pack` tarballs (publint, attw, external import/type checks).
- `pnpm check:consumer` — packed packages in generated external Vite apps (Tailwind, plain, configured,
  custom breakpoints, component labs with SSR; network). `--artifacts <dir>` keeps the builds.
- `pnpm check:browser` / `pnpm check:browser:components --consumers <dir>` — computed styles and
  real-input interaction + axe checks in headless Chrome against those builds.
- `pnpm check` — doctor, lint, typecheck, test, build, check:exports, check:pack (offline).
- `pnpm test` — `node:test` suites (scripts, tarball reader, validators, portability).
- `pnpm typecheck` — workspace typecheck.
- `pnpm lint` / `pnpm format` — Biome.
- `pnpm dev:storybook` / `pnpm dev:playground` — startup in local dev.
- `pnpm build:playground` / `pnpm build:storybook` — CI consumer smoke builds.

## Definition of done for every feature

- Specification updated and any decisions documented.
- APIs typed, accessible, independent, and SSR-safe as applicable.
- Unit/integration tests and relevant Storybook stories.
- ESM `exports`, `.d.ts`, CSS exports and `sideEffects` verified.
- Built package can be consumed from packed artifact in a different project
  when its published API, stylesheet or dependency graph changes.
- `pnpm typecheck`, `pnpm test`, `pnpm lint`, relevant build(s) pass.
- Changes pass native Linux, Windows and macOS CI (or are marked unverified).
- Changelog / README / examples updated when user-facing behavior changes.
- No private details or credentials in source control.

## Cross-platform governance

- Read `docs/CROSS-PLATFORM.es.md` and ADR 0003 before changing tooling.
- Prefer `node:fs`, `node:path` and `node:url`; never hardcode Windows drive paths, POSIX shell operations, or platform-specific script extensions in package scripts.
- Respect `pnpm-lock.yaml` once generated and committed.
- Test file handling with paths containing spaces and Unicode.
- A Linux-only run does NOT establish Windows/macOS compatibility.

## Do not

- Publish automatically. Do not invent npm scope availability.
- Redesign scope/palette/API silently without documenting the decision.
- Modify the user's other projects or repositories.
- Add unrelated abstractions or a full product app.
- Create a duplicate set of Spec Kit official commands manually; use `specify init`.
