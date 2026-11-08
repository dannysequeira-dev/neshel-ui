# Implementation Plan: Reproducible monorepo foundation

**Branch**: `001-foundation` (feature pointer; work happens on local `main`) | **Date**: 2026-11-07 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-foundation/spec.md` (clarifications D1–D7).

## Summary

Turn the existing scaffold into a verified foundation that can later publish independent
packages. The work is split into six reversible milestones (001.0–001.5). 001.0 (Spec Kit
bootstrap) is done (`afe1494`, `beecf5f`). This plan details **001.1 — tooling, lint and
CI hygiene** and outlines 001.2–001.5. Requirements, decisions and success criteria live
in the spec and ADRs 0002–0004; this plan references them instead of restating them.

## Technical Context

**Language/Version**: TypeScript 5.9 (strict), ESM JavaScript for Node scripts; Node 26 primary dev, `>=22.13` floor (D1).

**Primary Dependencies**: pnpm 12.16.1 workspaces + catalog, Biome 2.6.x, Vite 7.3 (Vite 8 spike in 001.4, D4), Tailwind CSS 4.3, Storybook 10.6, React 19 (D2), Changesets.

**Storage**: N/A.

**Testing**: `node:test` for workspace/portability tests; `publint` and `@arethetypeswrong/cli` added in 001.2 (D6). No React test runner in Phase 001.

**Target Platform**: Native Windows, Linux and macOS for contributors and CI; packages target browsers + Node ESM consumers.

**Project Type**: Library monorepo (6 packages, 2 apps).

**Performance Goals**: N/A for runtime. CI wall time should not regress noticeably; pnpm store caching is expected to reduce install time.

**Constraints**: Shell-neutral npm scripts; Node stdlib for file operations; no new dependencies in 001.1; Spec Kit–managed files are not reformatted (hash-tracked).

**Scale/Scope**: ~100 first-party files checked by Biome; 4 CI jobs today (expanded to 5 in 001.4).

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design._

| Principle            | Assessment for 001.1                                                    | Status |
| -------------------- | ----------------------------------------------------------------------- | ------ |
| I. Integrity         | Evidence log records real results; no claim of CI parity before a push. | Pass   |
| II. Modular packages | No package graph change in 001.1 (core removal is 001.2).               | Pass   |
| III. CSS-first       | Only formatting of `config/src/styles.css`; no token change.            | Pass   |
| IV. Accessibility    | Not affected (no UI).                                                   | N/A    |
| V. Typography/layout | Not affected.                                                           | N/A    |
| VI. Tests & evidence | `pnpm check` + CI lint gate; results logged in `evidence.md`.           | Pass   |
| VII. Minimal scope   | No new dependencies or abstractions; excludes only vendored files.      | Pass   |
| VIII. Safe releases  | No publish/push; `private: true` untouched.                             | Pass   |
| IX. Cross-platform   | CI keeps 3 native OSes; caching via official actions; LF enforced.      | Pass   |

Post-design re-check: unchanged — Pass. No complexity violations.

## Milestones

### 001.0 — Spec Kit integration (done)

Evidence: `evidence.md` §001.0.

### 001.1 — Tooling, lint and development hygiene (this plan)

Covers FR-011, FR-022, FR-023 (lint + caching parts), SC-001 (lint/typecheck/test/build/exports).
Design decisions: [research.md](research.md) R1–R6.

1. **Biome configuration** (`biome.json`)
   - Exclude exactly the Spec Kit CLI-owned paths (R2): `.claude/skills/speckit-*`,
     `.specify/{templates,scripts,workflows,integrations}`, `.specify/init-options.json`,
     `.specify/integration.json`. `.specify/README.md` and `.specify/memory/` stay linted.
   - Update `$schema` to the installed 2.6.6 and replace deprecated
     `rules.recommended: true` with `rules.preset: "recommended"` by hand (R1; do **not**
     apply `biome migrate --write`, which proposes `"none"`).
2. **Fix first-party violations** — `biome check --write` for formatting and import order,
   then review the diff (Markdown tables/line breaks); replace the two `forEach` callbacks
   that return values with `for…of` loops. No rule is disabled.
3. **CI workflow** (`.github/workflows/ci.yml`)
   - Remove the no-lockfile bootstrap step; always `pnpm install --frozen-lockfile`.
   - Install pnpm before `actions/setup-node` and enable `cache: pnpm` keyed on
     `pnpm-lock.yaml` (R3).
   - Add a blocking `pnpm lint` step (after install, before tests).
   - Keep the current Node matrix; the D1 matrix change belongs to 001.4.
4. **Storybook telemetry** — `core.disableTelemetry: true` in `apps/storybook/.storybook/main.ts`,
   which covers `storybook dev` and `storybook build` locally and in CI (R4).
5. **Docs** — remove the "lint is a manual gate" notes from `docs/CROSS-PLATFORM.es.md` and
   the workflow; record results in `evidence.md`.

Verification: [quickstart.md](quickstart.md) §001.1; gate contract in
[contracts/quality-gates.md](contracts/quality-gates.md).

### 001.2 — Package distribution correctness (outline)

FR-003, FR-017–FR-020, FR-025; ADR 0002, ADR 0004. Remove unused `core` deps; NodeNext for
library tsconfigs; React `^19` peer; pack `src` for source maps; add `publint`, `attw` and a
portable `scripts/check-pack.mjs` (`pnpm check:pack`) driven by a workspace-derived package
list; wire into `pnpm check` and CI.

### 001.3 — External consumer integration

FR-021, US-06, SC-005; design in [research.md](research.md) R13–R16, tasks T035–T040.

1. Extract `scripts/lib/pnpm.mjs` (shell-free pnpm launcher + pack helper) from
   `check-pack.mjs` (R15).
2. Pure CSS assertions in `scripts/lib/consumer-checks.mjs` with unit tests (R14).
3. `pnpm check:consumer [--no-build]`: pack `@neshel-ui/config`, generate a React 19 +
   TypeScript + Vite + Tailwind v4 app in a temp dir outside the repo (spaces + Unicode),
   install the tarball via `file:./vendor/*.tgz` with workspace-pinned tool versions, run
   `tsc`, build with Vite, assert CSS tokens/utilities, package realpath and export
   encapsulation, clean up with retries (R13, R14).
4. CI step on every job (network required); not part of the offline `pnpm check` (R16).
5. Scope guard: only the existing `./styles.css` and `.` exports are exercised; no Phase 002
   token or Tailwind-split work.

### 001.4 — Cross-platform matrix and documentation (outline)

FR-013, FR-024, D1, D4. `.nvmrc`/`.node-version` → 26; CI Node 26 × 3 OSes + Node 22/24 Linux;
time-boxed Vite 8 spike with adopt-or-document outcome; refresh `CROSS-PLATFORM.es.md`,
`roadmap.md`, retire `VALIDATION-REPORT.md` in favour of `evidence.md`.

### 001.5 — Native CI verification (outline)

SC-006. Push only with maintainer approval; record per-job results in `evidence.md`.

## Project Structure

### Documentation (this feature)

```text
specs/001-foundation/
├── spec.md              # Approved spec (D1–D7)
├── plan.md              # This file
├── research.md          # Phase 0 decisions (R1–R6)
├── data-model.md        # Validation entities used by gates and evidence
├── quickstart.md        # Runnable validation per milestone
├── contracts/
│   └── quality-gates.md # Contract of pnpm gate scripts (names, exit codes, platforms)
├── evidence.md          # Real results log
└── tasks.md             # /speckit-tasks output
```

### Source Code (repository root)

```text
biome.json                       # 001.1
.github/workflows/ci.yml         # 001.1, 001.3, 001.4
apps/storybook/.storybook/main.ts# 001.1
scripts/*.mjs                    # 001.1 lint fixes; 001.2 check-pack; 001.3 consumer smoke
tests/*.test.mjs                 # node:test suites
packages/*/{package.json,tsconfig*.json,src/}  # 001.2
docs/, specs/001-foundation/     # all milestones
```

**Structure Decision**: Existing pnpm monorepo layout (`packages/*`, `apps/*`, `scripts/`,
`tests/`) is kept; no new top-level directories.

## Complexity Tracking

No constitution violations; nothing to justify.
