# Quickstart — validating Feature 001

Prerequisites: Node 26 (or `>=22.13`), pnpm from `packageManager`, Git; Python 3.11+ only for
Spec Kit. Same commands on Windows (PowerShell 7), Linux and macOS.

```text
pnpm install --frozen-lockfile
```

## 001.1 — tooling and lint

```text
pnpm run doctor
pnpm lint
pnpm typecheck
pnpm test
pnpm build:packages
pnpm check:exports
pnpm check
pnpm build:storybook
```

Expected: every command exits 0. `pnpm lint` reports no errors or infos, and its file count
excludes the Spec Kit paths in [research.md](research.md) R2. `pnpm build:storybook`
prints no telemetry notice. In CI, the log shows a pnpm cache restore/save, the
`--frozen-lockfile` install and a `Lint` step on every job.

## 001.2 — package distribution

`pnpm build:packages && pnpm check:pack` → 0 errors for the five intended public packages
(see [data-model.md](data-model.md) PackedArtifact rules).

## 001.3 — external consumer

Consumer smoke command (named in 001.3) → Vite build succeeds outside the repository; CSS
output contains `--neshel-` tokens.

## 001.4 / 001.5 — matrix and CI

CI run on the pushed commit shows Node 26 × {Windows, Linux, macOS} and Node 22/24 × Linux
green. Record the run ID and per-job results in [evidence.md](evidence.md).
