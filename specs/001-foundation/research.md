# Research — Feature 001 (Phase 0)

Findings verified locally on 2026-11-07 (Windows 11, Node 26.13.0, Biome 2.6.6) unless noted.

## R1 — Biome configuration migration

- **Decision**: Set `$schema` to 2.6.6 and replace `linter.rules.recommended: true` with
  `linter.rules.preset: "recommended"` manually.
- **Rationale**: The lockfile resolves Biome 2.6.6 (catalog `^2.6.5`), producing two
  "info" diagnostics (schema mismatch, deprecated `recommended`). `biome migrate` in 2.6.6
  proposes `preset: "none"`, which disables all lint rules: with it, the two real
  `useIterableCallbackReturn` errors disappear. With `"recommended"` they remain (verified).
  `PresetConfig` accepts `recommended | all | none`.
- **Alternatives**: `biome migrate --write` (rejected: silently disables linting);
  keep the deprecated field (rejected: removed in the next major, keeps info noise).

## R2 — Excluding Spec Kit–managed files

- **Decision**: Add to `files.includes`: `!.claude/skills/speckit-*`, `!.specify/templates`,
  `!.specify/scripts`, `!.specify/workflows`, `!.specify/integrations`,
  `!.specify/init-options.json`, `!.specify/integration.json`.
- **Rationale**: Skills, templates and scripts are SHA-256-tracked in
  `.specify/integrations/*.manifest.json`; reformatting would break CLI refresh and
  provenance. The JSON metadata and workflow registry are written by the CLI and rewritten
  on refresh. Verified: with these patterns no managed file is reported, while
  `.specify/README.md`, `.specify/memory/constitution.md` and `neshel-*` skills are still
  checked.
- **Alternatives**: Ignore all of `.specify/` and `.claude/` (rejected: hides first-party
  files); reformat managed files (rejected by maintainer).

## R3 — pnpm caching in GitHub Actions

- **Decision**: Run `pnpm/action-setup@v4` (reads `packageManager`) **before**
  `actions/setup-node@v4` with `cache: pnpm` and `cache-dependency-path: pnpm-lock.yaml`.
- **Rationale**: `setup-node`'s pnpm cache locates the store via the `pnpm` binary, so pnpm
  must already be on `PATH`. Official actions only; no custom cache keys or shell steps.
- **Alternatives**: `actions/cache` with manual `pnpm store path` (more YAML, shell-specific
  output handling).

## R4 — Storybook telemetry

- **Decision**: `core: { disableTelemetry: true }` in `.storybook/main.ts`.
- **Rationale**: Storybook 10.6 types expose `CoreConfig.disableTelemetry`; it applies to
  both `dev` and `build`, locally and in CI, with one portable setting. An environment
  variable would need per-shell syntax locally.
- **Alternatives**: `STORYBOOK_DISABLE_TELEMETRY=1` in CI only (does not cover local dev).

## R5 — Biome formatting of Markdown, YAML and CSS

- **Decision**: Accept Biome's formatter for first-party Markdown/YAML/CSS/JSON and review
  the diff for meaning-changing edits (tables, hard line breaks, lists).
- **Rationale**: Biome 2.6 formats these languages and reports them as errors; fixing them is
  required by FR-022 and keeps one formatter for the repo.
- **Alternatives**: Exclude docs from formatting (rejected: would be suppression).

## R6 — Node matrix timing

- **Decision**: 001.1 keeps the current CI matrix; D1 matrix and `.nvmrc` change in 001.4.
- **Rationale**: Keeps 001.1 a pure hygiene change and isolates possible Node 26 or Vite
  interactions in the milestone that owns them. Local verification already runs on Node 26.

## Known risks (carried to later milestones)

- `actions/checkout@v4` / `setup-node@v4` / `pnpm/action-setup@v4` may emit runtime
  deprecation warnings on current runners; evaluate upgrades in 001.4.
- Biome patch upgrades within `^2.6.5` may change formatter output; the lockfile pins the
  version used in CI.

## R7 — How pnpm 12 rewrites manifests when packing (observed, 2026-11-07)

Packed with `pnpm pack` (pnpm 12.16.1) before any 001.2 change:

- `workspace:*` → exact version (`"@neshel-ui/config": "0.0.0"` in `cli`).
- `catalog:` → the catalog range (`"typescript": "^5.9.3"`).
- `private: true` is preserved, and pnpm packs private packages without complaint, so
  packing works as a validation tool while the publish guard stays on.
- `layout` packed with `"@neshel-ui/core": "0.0.0"`: a dependency on an unpublished package,
  confirming the ADR 0002 trap.
- `pnpm pack --json` reports `filename` with mixed separators on Windows; `check:pack`
  locates the tarball by listing its own empty destination directory instead.
- **Decision**: validate the packed manifest, never the source manifest.

## R8 — Marking intended public packages

- **Decision**: An intended public package declares `"publishConfig": { "access": "public" }`;
  `core` does not. `private: true` stays on all six as the publish guard.
- **Rationale**: Discovery needs a signal that does not depend on `private` (which is the
  guard). `publishConfig.access` is standard npm metadata, is ignored while `private: true`
  is set, and Changesets already assumes public access.
- **Alternatives**: hardcoded list (rejected by FR-025); custom `neshel` field (non-standard).

## R9 — Unused workspace dependencies

- **Decision**: Remove every workspace runtime dependency that no source file imports:
  `core` from layout/typography/components (ADR 0002) and `config` from components and cli.
  A dependency is added back in the slice that first imports it.
- **Rationale**: Unused edges are untestable, inflate install graphs and hide boundary
  violations. The CSS relationship between components and config is a consumer-level
  stylesheet import, not a JS dependency, today.

## R10 — Library compilation

- **Decision**: A root `tsconfig.library.json` (extends `tsconfig.base.json`) sets
  `module`/`moduleResolution` `NodeNext`; every `packages/*/tsconfig.json` extends it.
  Apps keep `Bundler` via the base. Exports keep the `types` + `import` conditions
  (ESM-only; no `require` condition).
- **Rationale**: One place for library resolution, no option repeated in six files; NodeNext
  makes the compiler require explicit `.js` extensions on relative imports.

## R11 — `check:pack` design

- Discovery via the workspace helper and `publishConfig.access` (R8).
- Build with `pnpm build:packages` unless `--no-build` (used by `pnpm check` and CI right
  after their own build step).
- Spawn pnpm through `process.execPath` + `npm_execpath` when available (no shell, no
  `.cmd` resolution issues on Windows), else `pnpm` with `shell` on Windows.
- Extract `.tgz` with Node `zlib` + a small ustar/pax reader (no `tar` binary assumption).
- Validate in memory: packed manifest dependency specs (`workspace:`, `file:`, `link:`,
  `portal:`, private workspace packages), export/`types`/`bin` targets, declaration file per
  JS export, `sourceMappingURL` comments, every map `sources` entry, CSS exports declared as
  side effects.
- Runtime check from a temporary consumer outside the repository (path with spaces and
  Unicode): extract tarballs into `node_modules`, link declared peers from the workspace,
  `import()` every JS export, and type-check every typed export with `tsc` under both
  `NodeNext` and `Bundler`.
- `publint` (API, `pack: { tarball }`) and `attw <tgz> --profile esm-only
  --no-definitely-typed --format json` on the same tarball.
- Temporary directories are removed in `finally`.

## R12 — publint / attw configuration

- **Decision**: `attw --profile esm-only` (ignores node10 and node16-CJS resolution, which an
  ESM-only package intentionally does not support) and `--no-definitely-typed` (no network,
  deterministic). publint runs with default level; any `error` fails the gate, `warning`
  and `suggestion` are printed and recorded for review.

## R13 — External consumer fixture (001.3)

- **Decision**: `pnpm check:consumer [--no-build]` (`scripts/check-consumer.mjs`) generates a
  fresh React 19 + TypeScript + Vite + Tailwind v4 (`@tailwindcss/vite`) app in a temporary
  directory outside the repository (path with spaces and Unicode), copies the packed
  `@neshel-ui/config` tarball into it and depends on it as `file:./vendor/<tarball>.tgz`.
- **Rationale**: Generating the fixture keeps one source of truth for versions and avoids a
  second committed app with its own lockfile drifting from the workspace. A relative `file:`
  path avoids drive-letter and space quoting issues.
- **Versions**: tool versions are pinned to the exact versions the workspace resolved
  (read from `apps/playground-vite/node_modules/*/package.json`), e.g. Vite 7.3.7,
  Tailwind 4.3.5, React 19.3.1, TypeScript 5.9.3, so the consumer tests the same stack.
- **Network**: development tools come from the npm registry; only Neshel-UI comes from the
  local tarball. `allowBuilds: { esbuild: true }` is written to the consumer's
  `pnpm-workspace.yaml`, mirroring the repository.
- **Alternatives**: committed fixture app (drift, duplicate lockfile); `pnpm link` or
  `workspace:` (does not test the artifact).

## R14 — What the consumer test asserts

Observed Tailwind 4.3.5 output for the current `@neshel-ui/config/styles.css`:
`.bg-neshel-primary{background-color:var(--neshel-primary)}`, `--neshel-primary:#6d28d9`,
`[data-neshel-theme=dark]`, no `@theme` left after compilation. The test asserts:

1. The installed package is a real copy under the consumer (`realpath` outside the repo).
2. Light and dark `--neshel-*` declarations and both theme selectors are in the built CSS.
3. Neshel utilities generated through `@theme inline` reference the variables, e.g.
   `.bg-neshel-primary{background-color:var(--neshel-primary)}`.
4. Core Tailwind utilities used by the app are generated (e.g. `.p-10`, `.rounded-2xl`),
   proving Tailwind ran; no raw `@theme`/`@import "@neshel-ui` remains.
5. `tsc --noEmit` passes for an app that imports `@neshel-ui/config` (types resolve).
6. Encapsulation: importing an unexported deep path (`@neshel-ui/config/dist/index.js`)
   fails with `ERR_PACKAGE_PATH_NOT_EXPORTED`, while `@neshel-ui/config` resolves.

## R15 — Shared pnpm invocation

- **Decision**: Move the shell-free pnpm launcher and the "pack one package" logic from
  `check-pack.mjs` to `scripts/lib/pnpm.mjs`, reused by both gates.
- **Rationale**: Two real consumers now; the Windows fallback (DEP0190, `%~dp0`) must not be
  duplicated.

## R16 — Gate placement

- **Decision**: `check:consumer` runs as its own CI step on every job, but is **not** part of
  `pnpm check`, which stays offline-capable. Cleanup uses `rmSync` with retries for
  transient Windows file locks.

## R17 — Node.js matrix and runtime floors (001.4, D1)

- **Decision**: `.nvmrc`/`.node-version` → `26`. CI matrix (5 jobs, not a Cartesian product):
  ubuntu × {22, 24, 26}, windows × 26, macos × 26. Root `engines.node` stays `>=22.13.0`
  (contributors); browser packages declare no `engines`; `cli` keeps `>=22.13.0`.
- **Rationale**: Node 26 is the primary development line; 22/24 on one OS catch runtime API
  regressions cheaply; OS-specific behaviour is covered on the primary version.
- **Consumer floor**: library output is ES2022 ESM with no Node API usage, so developing on
  Node 26 does not raise the consumer requirement. `check-platform` keeps the 22.13 floor and
  only reports when the local Node is not the recommended major.

## R18 — GitHub Actions versions (observed 2026-11-08)

- Run 42435072683 annotated: "Node.js 20 is deprecated … actions/checkout@v4,
  actions/setup-node@v4, pnpm/action-setup@v4 are being forced to run on Node.js 24".
- `action.yml` `runs.using`: checkout v5+, setup-node v5+, pnpm/action-setup v5+ use `node24`.
- **Decision**: `actions/checkout@v7` (credentials persisted to a separate file since v6),
  `actions/setup-node@v7` (cache hardening/logging; explicit `cache: pnpm` kept),
  `pnpm/action-setup` pinned to the v6.1.1 commit `73e46992e05b19abd31f2f3c20e0e7370d762115`
  (third-party action; v6 documents pnpm 12 support and reads `packageManager`). First-party
  actions stay on major tags.
- `concurrency.cancel-in-progress` only for pull requests, so every push to `main` keeps a
  complete result instead of a cancelled run.

## R19 — Cross-platform audit findings

- Packing is deterministic: two clean builds produced byte-identical tarballs (SHA-256) for
  `config` and `cli`. **Decision**: `check:pack` re-packs each package and fails if the
  tarball hash differs.
- Line endings: index is 100% LF. Five Spec Kit metadata JSON files had CRLF only in the
  maintainer's working copy (written before `eol=lf`); restored from the index. **Decision**:
  a `node:test` regression test asserts every tracked text file is LF in the index and that
  `.gitattributes` keeps `* text=auto eol=lf` (skipped outside a git checkout).
- Temporary directories: `check:pack`/`check:consumer` clean up in `finally`, but an
  interrupt (Ctrl+C) bypassed it. **Decision**: a small `scripts/lib/temp.mjs` creates the
  directory and removes it on exit, `SIGINT` and `SIGTERM` (exit codes 130/143).
- Already sound: Node path APIs everywhere, spaces/Unicode in temp paths, junction symlinks,
  quoted-args Windows fallback, realpath comparisons (macOS `/private/var`, Windows short
  names), exit codes via `process.exitCode`.

## R20 — Vite 8 compatibility spike (D4)

- Peer ranges accept Vite 8: `@tailwindcss/vite` 4.3.5 (`^5.2.0 || ^6 || ^7 || ^8`),
  `@storybook/react-vite` and `builder-vite` 10.6.6 (`… || ^8.0.0`), `@vitejs/plugin-react`
  5.2.0 (`… || ^8.0.0`). Vite 8 replaces esbuild/Rollup with Rolldown; `engines.node`
  `^20.19.0 || >=22.12.0` fits the `>=22.13` floor. `@vitejs/plugin-react` 6 requires Vite 8
  and new peers; the spike keeps 5.2.0 to stay narrow.
- Method: isolated local branch; change only the `vite` catalog entry; run every gate.
  Outcome recorded in R21 after the run.

## R22 — Reproducibility

- **Decision**: validate the contributor workflow from a fresh `git clone` of the committed
  history into a temp path with spaces and Unicode: `pnpm install --frozen-lockfile`,
  `pnpm check`, `pnpm check:consumer --no-build`, Spec Kit feature selection as documented.
