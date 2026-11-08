# Implementation Plan: Design tokens, semantic theming and consumer configuration

**Branch**: `002-config-and-tokens` (feature pointer; work happens on local `main`) | **Date**: 2026-11-07 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/002-config-and-tokens/spec.md` (owner decisions
D1–D5, amendments A–F; ADRs 0006/0007 Accepted).

## Summary

Deliver one semantic token contract in two modes. `@neshel-ui/config` ships contract data
(`colorRoles`, `contrastPairs`, `defaults`), `defineConfig()` types and three stylesheets
(`tokens.css`, `tailwind.css`, `styles.css` alias). `@neshel-ui/cli` privately owns structural
validation, Color.js colour processing, resolution and deterministic CSS generation, loads
`neshel.config.ts` with jiti and writes `neshel.generated.css` on explicit command. The shipped
stylesheets are produced by the same generator from `defaults`. Cascade correctness rests on
nested `neshel` layers and complete theme blocks, proven by an automated computed-style browser
check on three OSes. Work is split into milestones 002.1–002.5, each independently verifiable.

## Technical Context

**Language/Version**: TypeScript 5.9 strict, ESM, NodeNext for packages; Node 26 primary dev,
`>=22.13` floor (CLI `engines`).

**Primary Dependencies**: existing toolchain (pnpm 12.16.1, Biome 2.6, Tailwind 4.3, Vite 8.3,
Storybook 10.6, React 19). New, CLI only: `jiti` ^2.7.0, `colorjs.io` ~0.7.1. CLI peer:
`@neshel-ui/config` `workspace:^`.

**Storage**: N/A (files: committed stylesheet sources, consumer-generated CSS).

**Testing**: `node:test` — `tests/**/*.test.mjs` (repository, pre-build) and
`packages/*/test/**/*.test.mjs` (against `dist`, post-build, `pnpm test:packages`); type fixtures
via `tsc --noEmit`; `check:pack`, `check:consumer` (3 consumers), new `check:browser` (CDP).

**Target Platform**: Browsers with cascade layers (CSS); Node `>=22.13` on Windows, Linux, macOS
(CLI); CI: Node 26 on three OSes + Node 22/24 on Linux.

**Project Type**: Library monorepo (6 packages, 2 apps).

**Performance Goals**: `defineConfig`-only import < 1 kB minified (SC-006). CLI runtime not a
goal; generation of a typical config should be well under a second (not gated).

**Constraints**: browser-safe `config` entry (no deps, no `node:`); no exported generator;
deterministic byte-identical output; shell-neutral scripts; no install hooks; nothing published.

**Scale/Scope**: 21 colour roles × ≥2 themes; ~12 non-colour tokens; CLI with 2 commands;
3 external consumers; 12 matrix rows + 9 cascade cases in the browser check.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design._

| Principle            | Assessment                                                                                                  | Status |
| -------------------- | ----------------------------------------------------------------------------------------------------------- | ------ |
| I. Integrity         | Palette from approved assets, logo untouched; contrast never presented as WCAG conformance; evidence logged | Pass   |
| II. Modular packages | `config` owns tokens/data, zero deps; `cli` → `config` (peer) only; no React in either; `core` untouched    | Pass   |
| III. CSS-first       | Custom properties + `@theme inline`; no provider; config evaluated only by the CLI; static utilities        | Pass   |
| IV. Accessibility    | Built-in pairs enforced (4.5/3); visible-focus tokens; diagnostics for custom themes                        | Pass   |
| V. Typography        | Families only; metrics reserved; Capsize deferred to 004                                                    | Pass   |
| VI. Tests & evidence | Unit, type, packed, consumer and browser tests; results in `evidence.md`                                    | Pass   |
| VII. Minimal scope   | Two justified CLI deps (ADR 0007); no engine subpath; no plugin/watch/init                                  | Pass   |
| VIII. Safe releases  | No publish, push or `private` change; changeset only                                                        | Pass   |
| IX. Cross-platform   | Node-only scripts; spaces/Unicode paths; atomic writes with Windows retry; 5-job CI incl. browser check     | Pass   |

Post-design re-check (after data-model, contracts, quickstart): unchanged — **Pass**. See
Complexity Tracking for the two justified additions.

## Project Structure

### Documentation (this feature)

```text
specs/002-config-and-tokens/
├── brief.md             # historical input
├── spec.md              # clarified specification
├── research.md          # Phase 0
├── plan.md              # this file
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/           # Phase 1: tokens.md, css.md, config-api.md, cli.md
├── checklists/requirements.md
├── tasks.md             # /speckit-tasks
├── analysis.md          # /speckit-analyze report
└── evidence.md          # created in 002.1 (gate results)
```

### Source Code (repository root)

```text
packages/config/
├── src/
│   ├── index.ts              # re-exports (no side effects)
│   ├── define-config.ts      # defineConfig + ExactConfig helper type
│   ├── types.ts              # public types
│   ├── contract.ts           # colorRoles, contrastPairs, defaults (deep-frozen data)
│   ├── tokens.css            # GENERATED from defaults (committed, do not edit)
│   └── tailwind.css          # GENERATED from defaults (committed, do not edit)
├── test/                     # node:test against dist
└── type-tests/               # tsc fixtures (positive / @ts-expect-error)
   (build: tsc + copy tokens.css, tailwind.css, and tailwind.css → styles.css)

packages/cli/
├── src/
│   ├── bin.ts                # argument parsing, command dispatch, exit codes
│   ├── index.ts              # stays empty
│   ├── commands/{validate,generate}.ts
│   ├── load/discover.ts      # cwd candidates, ambiguity
│   ├── load/load-config.ts   # jiti wrapper
│   ├── validate/structure.ts # hand-written structural validation + did-you-mean
│   ├── validate/colour.ts    # allowlist + Color.js wrapper (only module importing colorjs.io)
│   ├── validate/contrast.ts  # pairs × themes, policy
│   ├── resolve.ts            # defaults + overrides → ResolvedConfig
│   ├── generate/css.ts       # deterministic serializer (layer, blocks, @theme)
│   ├── output.ts             # path resolution, rejection, byte-compare, atomic write
│   └── diagnostics.ts        # types, sorting, formatting
└── test/
    ├── fixtures/             # configs (valid/invalid), golden CSS
    └── *.test.mjs

scripts/
├── generate-default-css.mjs  # runs built CLI generator on defaults → packages/config/src/*.css
├── check-browser.mjs         # CDP computed-style matrix (new)
├── check-consumer.mjs        # extended: tailwind | plain | configured
├── check-pack.mjs            # extended expectations
└── lib/{cdp.mjs,browser-matrix.mjs,pack-checks.mjs,consumer-checks.mjs}

tests/                        # repository tests (pre-build), incl. new pure-validator tests
apps/playground-vite, apps/storybook   # migrated imports; theme/scope demos; token stories
```

**Structure Decision**: extend the existing `config` and `cli` packages and root `scripts/`; no new
package. The generator lives in `cli/src` (private, not in `exports`). `config` stays copy-only at
build time; its CSS sources are generated by a repository script and guarded by a drift test.

## Key design notes

1. **Dependency direction**: `cli` imports `@neshel-ui/config` at runtime (peer + dev, `workspace:^`).
   `config` never imports `cli`. `scripts/generate-default-css.mjs` imports
   `packages/cli/dist/generate/css.js` and `resolve.js` by relative path (repository-internal).
2. **Build and test order**: `build:packages` (config before cli via pnpm topological order) →
   `test:packages` (includes drift test) → `check:exports` → `check:pack` → `check:consumer` →
   `check:browser`. Root `test` uses the explicit glob `tests/**/*.test.mjs`.
3. **Determinism**: serializer builds strings from ordered arrays only (never object-key order of
   user input); named themes sorted with a code-point comparison (not `localeCompare`).
4. **Peer dependency in `check:pack`**: today internal packages are rejected in all dependency
   fields; extend to allow public workspace packages in `peerDependencies` and require the packed
   value to be a caret range.
5. **Browser check**: fixtures generated into a temp directory with spaces/Unicode; `file://` pages
   for static order fixtures; consumer `dist/` served via `file://` as well (Vite `base: "./"`).
6. **Changesets**: one changeset for `config` (minor: new exports/tokens, palette) and `cli`
   (minor: commands). Whether to add a `fixed` group is a release decision deferred to feature 007
   (recorded risk).

## Milestones and gates

| Milestone | Scope (tasks)                                                                                                                      | Gate (all must pass, CI 5/5 unless noted)                                                                 |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 002.0     | Spec, research, contracts, ADRs, plan, tasks, analysis                                                                             | Owner review; analysis without CRITICAL issues — **this milestone**                                       |
| 002.1     | T001–T024: test layout, contract data, generator core, colour/contrast, shipped CSS, pack checks, app migration, Tailwind consumer | `pnpm check`, `test:packages`, `check:pack`, `check:consumer` (Tailwind), drift + contrast + golden tests |
| 002.2     | T025–T034: plain consumer, `check:browser` + matrix on shipped CSS, Storybook stories, CI step                                     | SC-001; SC-005 rows 1–10 and C5–C9 for shipped CSS; browser present on all 3 OSes                         |
| 002.3     | T035–T044: `defineConfig` types, structural validation, colour validation diagnostics                                              | Type fixtures; validator negative tests; SC-006 bundle check                                              |
| 002.4     | T045–T057: discovery, jiti loader, commands, output/atomic writes, exit codes, determinism goldens                                 | CLI negative matrix in spaces/Unicode paths; SC-003, SC-004                                               |
| 002.5     | T058–T072: configured consumer, browser check with generated CSS, docs, changeset, evidence, traceability                          | SC-001–SC-007 traced; owner approval; no push/publish                                                     |

Each milestone ends with an evidence entry (implemented / locally verified / CI-verified) and a
stop for owner review before the next starts.

## Complexity Tracking

| Addition                                    | Why needed                                                         | Simpler alternative rejected because                                           |
| ------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| `jiti` + `colorjs.io` runtime deps in `cli` | TS config loading on Node 22.13; spec-correct colour parsing/gamut | Native stripping excludes the floor; hand-written parser rejected by owner (B) |
| `check:browser` (CDP script, no dependency) | Cascade claims require computed-style evidence (A, F)              | jsdom lacks faithful layers/media; Playwright adds large downloads             |
| Committed generated CSS in `config/src`     | Single generator, no build cycle `config` ↔ `cli`                  | Generating at `config` build time would make `config` depend on `cli`          |
