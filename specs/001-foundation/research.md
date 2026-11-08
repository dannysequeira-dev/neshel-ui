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
