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
