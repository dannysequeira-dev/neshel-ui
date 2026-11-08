# Feature 001 — evidence log

Records **actual** results only. Legend: **Implemented** (code/config exists),
**Local** (passed on the named machine), **CI** (passed on native GitHub runners).

## Baseline audit — 2026-11-07, Windows 11 (win32 x64), Node v26.13.0, pnpm 12.16.1

| Gate                                             | Result                                                                                                                                                                                                                                |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm run doctor`                                | Local pass                                                                                                                                                                                                                            |
| `pnpm test`                                      | Local pass (6/6)                                                                                                                                                                                                                      |
| `pnpm typecheck`                                 | Local pass (9 projects)                                                                                                                                                                                                               |
| `pnpm build:packages` / `pnpm check:exports`     | Local pass                                                                                                                                                                                                                            |
| `pnpm --filter @neshel-ui/playground-vite build` | Local pass (Vite 7.3.7, Tailwind 4.3.5)                                                                                                                                                                                               |
| `pnpm --filter @neshel-ui/storybook build`       | Local pass (Storybook 10.6.6; chunk-size warning)                                                                                                                                                                                     |
| `pnpm lint`                                      | **Fail**: 41 errors (33 format, 5 organizeImports, 2 `useIterableCallbackReturn`)                                                                                                                                                     |
| `pnpm pack --dry-run` (config)                   | Maps reference `../src/index.ts`, which is not packed                                                                                                                                                                                 |
| Native CI, commit `afdbcb3` (run 42426509069)    | **CI pass**: Node 22 × {ubuntu, windows, macos}, Node 24 × ubuntu. Covers doctor, test, typecheck, build:packages, check:exports, Vite and Storybook builds. Lint, packed artifacts and Node 26 are **not** covered by that workflow. |

## Milestone 001.0 — Spec Kit integration (2026-11-07, same machine)

- Implemented: `specify init --here --force --non-interactive --integration claude
  --script py --ignore-agent-tools` (Specify CLI 1.2.6) via `pnpm run spec-kit:init`.
- The wrapper protects project context, custom skills and repo configuration, and
  reports any protected file Spec Kit changed. Result: no protected file changed.
- Local: `pnpm run doctor` and `pnpm test` (6/6) still pass after initialization.
- Local: `check_prerequisites.py --paths-only` resolves `specs/001-foundation`.
- Lint: 59 errors after initialization; the 18 new ones are formatting in
  Spec Kit-managed files (hash-tracked by `.specify/integrations/*.manifest.json`).
  Handling is decided in milestone 001.1 (FR-022).
- Closure checks: 28/28 manifest-listed files match their SHA-256 hashes in the git index;
  custom skills, `CLAUDE.md`, `AGENTS.md`, `.claude/settings.json` and the constitution
  unchanged; `git diff --cached --check` clean; no `feature.json`, `__pycache__` or
  scratchpad files committed. PowerShell scripts are listed with matching hashes in
  `speckit.manifest.json` (official artifacts; the skills invoke only the Python scripts).
- Fix: `core.autocrlf=true` would have checked out `*.py` with CRLF on Windows and broken
  manifest hashes; `.gitattributes` now sets `* text=auto eol=lf`.
- Feature selection procedure verified in Git Bash and PowerShell 7 (`.specify/README.md`).
- Commit: `afe1494` (local).
- CI: not verified for these changes (not pushed).

## Milestone 001.1 — tooling, lint and CI hygiene (2026-11-07, same machine)

Implemented (uncommitted, pending maintainer review):

- `biome.json`: schema 2.6.6; `rules.preset: "recommended"` (hand-migrated; `biome migrate`
  proposed `"none"`, which disables all rules); `css.parser.tailwindDirectives: true` (the
  `@theme inline` block in `packages/config/src/styles.css` was a real parse error, not a
  style issue); exact exclusions for Spec Kit CLI-owned paths (research R2).
- Two `forEach` callbacks replaced with `for…of` (`scripts/check-portability.mjs`,
  `scripts/check-workspace.mjs`); Biome formatting applied to first-party files.
- CI: single `pnpm install --frozen-lockfile`; pnpm installed before `setup-node` with
  `cache: pnpm` keyed on `pnpm-lock.yaml`; blocking `Lint` step; Node matrix unchanged.
- Storybook: `core.disableTelemetry: true`.

Local results (Windows 11, Node v26.13.0, pnpm 12.16.1, Biome 2.6.6):

| Gate                                                                      | Result                                                                                                            |
| ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `pnpm run doctor`                                                         | Local pass (10 manifests, 38 scripts)                                                                             |
| `pnpm lint`                                                               | Local pass (108 files, 0 errors, 0 infos; was 61 errors + 2 infos)                                                |
| `pnpm typecheck`                                                          | Local pass                                                                                                        |
| `pnpm test`                                                               | Local pass (6/6)                                                                                                  |
| `pnpm build:packages` (after `pnpm clean`)                                | Local pass                                                                                                        |
| `pnpm check:exports`                                                      | Local pass                                                                                                        |
| `pnpm check`                                                              | Local pass (exit 0)                                                                                               |
| `pnpm build:playground`                                                   | Local pass                                                                                                        |
| `pnpm build:storybook`                                                    | Local pass; telemetry notice no longer printed                                                                    |
| `pnpm install --frozen-lockfile` after reformatting `pnpm-workspace.yaml` | Local pass (lockfile up to date)                                                                                  |
| Spec Kit manifest hashes                                                  | 28/28 match; no managed file modified                                                                             |
| Workflow structure                                                        | Parsed locally with the transitive `yaml@2.9.1` (informal check); all 8 `run:` steps are plain `pnpm` invocations |

CI: **pending push.** Not yet verified: workflow acceptance by GitHub, pnpm cache
save/restore, the `Lint` step on Windows/Linux/macOS runners.

### 001.1 — native CI result (run 42431792113, commit `97e45cb`, 2026-11-08)

- **CI partial pass** on Node 22 × {ubuntu, windows, macos} and Node 24 × ubuntu: GitHub
  accepted the workflow; pnpm setup, `setup-node` with `cache: pnpm`, `pnpm install
  --frozen-lockfile` and `pnpm run doctor` passed on all four jobs.
- **CI fail**: `Lint` failed on all four jobs because `README.md` and `docs/BRANDING.md`
  (added in `97e45cb`) had unformatted Markdown tables. The lint gate worked as intended.
  Later steps were skipped, and the pnpm cache save (post step) did not run.
- Fix: `a55a706 style(docs): format brand documentation tables` (whitespace only; local
  `pnpm lint` passes). CI for the fix: pending push.

## Milestone 001.2 — package distribution and integrity (2026-11-08, same machine)

Implemented (local commits `de4e94f`..`8e4aa72`):

- Intended public packages marked with `publishConfig.access: "public"`; `core` internal.
- Unused workspace dependencies removed (`core` from layout/typography/components,
  `config` from components/cli); React peer `^19.0.0`; `src/**/*.ts(x)` packed for maps.
- Libraries compile with `tsconfig.library.json` (NodeNext); apps keep Bundler.
- cli: importable entry has no side effects; `dist/bin.js` placeholder exits 1;
  `engines.node >=22.13.0`.
- `scripts/lib/workspace.mjs` replaces four hardcoded package lists (FR-025).
- `pnpm build:packages` deletes `packages/*/dist` first (stale outputs were packed before).
- `pnpm check:pack [--no-build]`, wired into `pnpm check` and every CI job.

Observed pnpm 12.16.1 manifest rewriting: research R7.

Local results (Windows 11, Node v26.13.0, pnpm 12.16.1), after `pnpm clean`:

| Gate                                             | Result                                |
| ------------------------------------------------ | ------------------------------------- |
| `pnpm run doctor`                                | Local pass (10 manifests, 39 scripts) |
| `pnpm lint`                                      | Local pass (117 files)                |
| `pnpm typecheck`                                 | Local pass                            |
| `pnpm test`                                      | Local pass (20/20)                    |
| `pnpm build:packages` / `pnpm check:exports`     | Local pass                            |
| `pnpm check:pack`                                | Local pass — 5/5 packages             |
| `pnpm check`                                     | Local pass                            |
| `pnpm build:playground` / `pnpm build:storybook` | Local pass                            |
| `pnpm install --frozen-lockfile`                 | Local pass                            |

`check:pack` per package (packed manifests: no runtime dependencies; devDependencies
rewritten from `catalog:` to ranges; `private: true` preserved):

| Package                 | Files | Peer deps     | publint    | attw (esm-only)               |
| ----------------------- | ----- | ------------- | ---------- | ----------------------------- |
| `@neshel-ui/config`     | 9     | —             | 0 messages | 0 problems (2 CJS-only notes) |
| `@neshel-ui/layout`     | 9     | react ^19.0.0 | 0 messages | 0 problems (2 CJS-only notes) |
| `@neshel-ui/typography` | 9     | react ^19.0.0 | 0 messages | 0 problems (2 CJS-only notes) |
| `@neshel-ui/components` | 9     | react ^19.0.0 | 0 messages | 0 problems (2 CJS-only notes) |
| `@neshel-ui/cli`        | 13    | —             | 0 messages | 0 problems (2 CJS-only notes) |

External consumer (temp dir outside the repo, path with spaces and `ñ`): 5 runtime
`import()` calls and 5 typed entrypoints under NodeNext and Bundler, all passing.

Mutation tests (each reverted afterwards), all detected:

1. `layout` depends on `core` → `dependencies.@neshel-ui/core ... internal and unpublished`.
2. `config` without `src` in `files` → both maps report `src/index.ts ... not packaged`.
3. Wrong export target → check:pack, publint and the runtime import all fail.
4. Extensionless relative import → `tsc` TS2835 under NodeNext.
5. Unplanned: a stale `dist/a.js` from mutation 4 was packed and caught by the map check,
   which led to cleaning `dist` before builds.

Launch paths verified: `pnpm check:pack` (Git Bash), PowerShell 7, and direct
`node scripts/check-pack.mjs` (no `npm_execpath`). No temporary directory left behind.

CI: **pending push.** Not yet verified: `check:pack` on Linux/macOS runners, Node 22/24,
and the pnpm cache save.

### 001.1 + 001.2 — native CI result (run 42434061443, commit `fb4010c`, 2026-11-08)

**CI pass** — all 4 configured jobs `success`; every step `success` (none skipped or cancelled):

| Job                      | Lint | Tests | Typecheck | Build packages | check:exports | check:pack | Vite build | Storybook build |
| ------------------------ | ---- | ----- | --------- | -------------- | ------------- | ---------- | ---------- | --------------- |
| ubuntu-latest / Node 22  | pass | pass  | pass      | pass           | pass          | pass       | pass       | pass            |
| windows-latest / Node 22 | pass | pass  | pass      | pass           | pass          | pass       | pass       | pass            |
| macos-latest / Node 22   | pass | pass  | pass      | pass           | pass          | pass       | pass       | pass            |
| ubuntu-latest / Node 24  | pass | pass  | pass      | pass           | pass          | pass       | pass       | pass            |

- Install with `--frozen-lockfile` and `pnpm run doctor` passed on all jobs; the
  `setup-node` post step (pnpm cache save) completed.
- **Not covered**: Node 26 on any runner (the D1 matrix lands in 001.4); Node 22/24 are
  CI-verified on Linux, Node 22 on Windows and macOS.

## Milestone 001.3 — external consumer integration (2026-11-08, same machine)

Implemented (local commits after `e361192`): `scripts/lib/pnpm.mjs` (shared launcher, isolated
env for external projects), `scripts/lib/consumer-checks.mjs` (+6 unit tests),
`pnpm check:consumer [--no-build] [--keep]`, and a `Verify external consumer` CI step.

Consumer fixture: generated in `%TEMP%\neshel consumer ñ-*\consumer app ñ` (outside the repo).
Tools pinned to the workspace versions: React 19.3.1, react-dom 19.3.1, Vite 7.3.7,
`@vitejs/plugin-react` 5.2.0, Tailwind CSS 4.3.5, `@tailwindcss/vite` 4.3.5, TypeScript 5.9.3,
`@types/react`/`@types/react-dom` 19.3.0. `@neshel-ui/config` comes only from
`file:./vendor/neshel-ui-config-0.0.0.tgz`; the consumer lockfile records
`resolution: {integrity: sha512-…, tarball: file:vendor/neshel-ui-config-0.0.0.tgz}`.

Observed in the consumer's built CSS (Tailwind 4.3.5, minified):

- `--neshel-primary:#6d28d9` (light) and `--neshel-primary:#c4a6ff` (dark); all 9
  `--neshel-*` declarations from the tarball's `styles.css`; `[data-neshel-theme=light]`
  and `[data-neshel-theme=dark]`.
- Utilities from `@theme inline`: `.bg-neshel-primary{background-color:var(--neshel-primary)}`,
  `.text-neshel-primary-foreground{color:var(--neshel-primary-foreground)}`,
  `.border-neshel-border{border-color:var(--neshel-border)}`,
  `.rounded-neshel-base{border-radius:var(--neshel-radius-base)}`,
  `.font-neshel-body{font-family:var(--neshel-font-body)}` (8 checked).
- Core utilities: `.p-10{padding:calc(var(--spacing) * 10)}`, `.rounded-2xl`, `.min-h-screen`,
  `.font-semibold`; no `@theme` or `@import "@neshel-ui` left.
- `tsc --noEmit` (Bundler) passes; Node resolves `@neshel-ui/config` and
  `@neshel-ui/config/styles.css` inside the installed copy; `@neshel-ui/config/dist/index.js`
  fails with `ERR_PACKAGE_PATH_NOT_EXPORTED`.

Mutation tests (each isolated and reverted), all detected:

1. Consumer without `@import "@neshel-ui/config/styles.css"` → 9 missing tokens, 2 missing
   theme selectors, missing Neshel utilities.
2. Vite config without the Tailwind plugin → all 8 Neshel utilities missing.
3. `@neshel-ui/config` `./styles.css` export pointing at a missing file → Vite build and Node
   resolution fail.

Local results (Windows 11, Node v26.13.0, pnpm 12.16.1), after `pnpm clean`:

| Gate                                             | Result                                               |
| ------------------------------------------------ | ---------------------------------------------------- |
| `pnpm run doctor`                                | Local pass (10 manifests, 40 scripts)                |
| `pnpm lint`                                      | Local pass (121 files)                               |
| `pnpm typecheck`                                 | Local pass                                           |
| `pnpm test`                                      | Local pass (26/26)                                   |
| `pnpm build:packages` / `pnpm check:exports`     | Local pass                                           |
| `pnpm check:pack`                                | Local pass (5/5)                                     |
| `pnpm check:consumer`                            | Local pass (also via PowerShell 7 and direct `node`) |
| `pnpm check`                                     | Local pass                                           |
| `pnpm build:playground` / `pnpm build:storybook` | Local pass                                           |

No temporary directory left behind. CI: **pending push** (consumer step not yet run on
Linux/macOS or Node 22/24).

### 001.3 — native CI result (run 42435072683, commit `64e4cfb`, 2026-11-08)

**CI pass** — all 4 configured jobs `success`; every step `success` (none skipped or cancelled).
Gates per job: frozen install, doctor, lint, tests, typecheck, build packages, check:exports,
check:pack, **check:consumer**, Vite build, Storybook build.

| Job                      | Duration | External consumer (`check:consumer`) |
| ------------------------ | -------- | ------------------------------------ |
| ubuntu-latest / Node 22  | 52 s     | pass                                 |
| windows-latest / Node 22 | 63 s     | pass                                 |
| macos-latest / Node 22   | 54 s     | pass                                 |
| ubuntu-latest / Node 24  | 45 s     | pass                                 |

The external consumer (React 19.3.1, Vite 7.3.7, Tailwind 4.3.5, TypeScript 5.9.3, tarball
install) is therefore CI-verified on Linux, Windows and macOS. Node 26 is still not in CI.

## Milestone 001.4 — matrix, runtime alignment and documentation (2026-11-08, same machine)

Implemented (local commits after `1f39917`, not pushed):

- Node 26 primary: `.nvmrc`/`.node-version` = 26; `check-platform` reads the recommended
  major from `.nvmrc`, keeps the 22.13 floor. Package/consumer floors unchanged.
- CI matrix (5 jobs): ubuntu × {26, 22, 24}, windows × 26, macos × 26.
- Actions: `actions/checkout@v7`, `actions/setup-node@v7`, `pnpm/action-setup` pinned to
  `73e46992e05b19abd31f2f3c20e0e7370d762115` (v6.1.1); cancel-in-progress only for PRs.
  Motivation: run 42435072683 warned that the v4 actions target the deprecated Node 20.
- Cross-platform: re-pack determinism check in `check:pack`; signal-safe temp dirs
  (`scripts/lib/temp.mjs`); LF regression test; five CRLF working-copy files restored.
- Vite 8.3.6 adopted after an isolated spike (ADR 0005); `@vitejs/plugin-react` stays 5.2.0.
- Documentation aligned (README, Windows/cross-platform guides, CLAUDE.md facts,
  CONTRIBUTING, architecture, ADR 0003, package contracts, roadmap, Spec Kit onboarding);
  `docs/VALIDATION-REPORT.md` retired; `docs/CLAUDE-FIRST-PROMPT.md` marked historical.

Local results (Windows 11, Node v26.13.0, pnpm 12.16.1, Vite 8.3.6), after `pnpm clean`:

| Gate                                             | Result                                                      |
| ------------------------------------------------ | ----------------------------------------------------------- |
| `pnpm run doctor`                                | Local pass (10 manifests, 40 scripts)                       |
| `pnpm lint`                                      | Local pass (124 files)                                      |
| `pnpm typecheck`                                 | Local pass                                                  |
| `pnpm test`                                      | Local pass (32 pass, 1 skipped: SIGTERM test is POSIX-only) |
| `pnpm build:packages` / `pnpm check:exports`     | Local pass                                                  |
| `pnpm check:pack`                                | Local pass (5/5, including re-pack determinism)             |
| `pnpm check:consumer`                            | Local pass (Vite 8.3.6)                                     |
| `pnpm check`                                     | Local pass                                                  |
| `pnpm build:playground` / `pnpm build:storybook` | Local pass                                                  |

Reproducibility (research R22): fresh `git clone` of `b3e3211` into
`%TEMP%\neshel clone ñ-*\neshel ui` with `core.autocrlf=true`: 0 CRLF files checked out;
`pnpm install --frozen-lockfile`, `pnpm check`, `pnpm check:consumer --no-build`,
`pnpm build:playground`, `pnpm build:storybook` all exit 0; Spec Kit feature selection
(documented PowerShell/Bash command) writes `.specify/feature.json` and
`check_prerequisites.py --require-tasks` resolves `specs/001-foundation`; `git status` clean.

Vite 7 → 8 comparison: see ADR 0005 (same 78 CSS rules; Lightning CSS minifier differences;
`DEP0205` from Storybook on Node 26 with both versions).

CI: **pending push.** The Node 26 jobs, the new actions, the POSIX SIGTERM test and the
Vite 8 builds have not run on GitHub Actions yet.

## Phase 001 verification matrix (as of 2026-11-08, before the 001.4 push)

| Capability                                                    | Implemented          | Verified locally (Windows, Node 26)                    | Verified in GitHub Actions                                       | Planned                      |
| ------------------------------------------------------------- | -------------------- | ------------------------------------------------------ | ---------------------------------------------------------------- | ---------------------------- |
| Frozen install, doctor, lint, typecheck, tests                | yes                  | yes                                                    | yes — Node 22 (Linux/Windows/macOS), 24 (Linux), run 42435072683 | Node 26 jobs (001.4 push)    |
| Package build, check:exports                                  | yes                  | yes                                                    | yes — run 42435072683                                            | —                            |
| check:pack (5 packages, publint, attw, external import/types) | yes                  | yes                                                    | yes — run 42435072683                                            | —                            |
| check:pack re-pack determinism                                | yes                  | yes                                                    | no                                                               | 001.4 push                   |
| check:consumer (config tarball, React 19, Vite, Tailwind v4)  | yes                  | yes (Vite 8.3.6)                                       | yes with Vite 7.3.7 — run 42435072683                            | Vite 8 in CI (001.4 push)    |
| Signal-safe temp dirs (SIGTERM)                               | yes                  | partial (exit/error paths; SIGTERM skipped on Windows) | no                                                               | Linux/macOS run (001.4 push) |
| LF line endings guard                                         | yes                  | yes                                                    | no                                                               | 001.4 push                   |
| Node 26 on Linux, Windows, macOS                              | yes (matrix)         | yes (Windows)                                          | **no**                                                           | 001.4 push                   |
| Vite 8 playground and Storybook builds                        | yes                  | yes                                                    | no                                                               | 001.4 push                   |
| Fresh-clone reproducibility                                   | yes                  | yes                                                    | implicitly by every CI checkout                                  | —                            |
| Spec Kit integration (Claude, Python scripts)                 | yes                  | yes                                                    | n/a                                                              | —                            |
| Independent npm publication                                   | no (`private: true`) | —                                                      | —                                                                | release slice (007)          |
| Next.js consumer, real components                             | no                   | —                                                      | —                                                                | features 003–006             |

### 001.4 — native CI result (run 42436591929, commit `9af7a8f`, 2026-11-08)

**CI pass** — all **5** required jobs `success`; each job has 19 steps, all `success` (none
skipped, cancelled or re-run; `run_attempt` 1).

| Job                      | Duration | Install (frozen) | Doctor | Lint | Tests | Typecheck | Build | Exports | check:pack | check:consumer | Vite build | Storybook |
| ------------------------ | -------- | ---------------- | ------ | ---- | ----- | --------- | ----- | ------- | ---------- | -------------- | ---------- | --------- |
| ubuntu-latest / Node 22  | 29 s     | pass             | pass   | pass | pass  | pass      | pass  | pass    | pass       | pass           | pass       | pass      |
| ubuntu-latest / Node 24  | 34 s     | pass             | pass   | pass | pass  | pass      | pass  | pass    | pass       | pass           | pass       | pass      |
| ubuntu-latest / Node 26  | 29 s     | pass             | pass   | pass | pass  | pass      | pass  | pass    | pass       | pass           | pass       | pass      |
| windows-latest / Node 26 | 87 s     | pass             | pass   | pass | pass  | pass      | pass  | pass    | pass       | pass           | pass       | pass      |
| macos-latest / Node 26   | 67 s     | pass             | pass   | pass | pass  | pass      | pass  | pass    | pass       | pass           | pass       | pass      |

Observed:

- The "Node.js 20 is deprecated" warning of earlier runs is gone: `actions/checkout@v7`,
  `actions/setup-node@v7` and the pinned `pnpm/action-setup` v6.1.1 run without runtime
  warnings. Remaining annotations are informational (ubuntu-latest → Ubuntu 26 migration
  notice; macOS arm64 queue notice).
- `pnpm/action-setup` v6 + `packageManager: pnpm@12.16.1`: the frozen install succeeded on
  all five jobs.
- Vite 8.3.6 builds (playground, Storybook, external consumer) pass on Linux, Windows, macOS.

Inferred from step status and code, not from logs (job logs require authentication, and no
GitHub CLI/token is available on the maintainer machine):

- The SIGTERM temp-dir test runs on Linux and macOS (skipped only on `win32`) and passed as
  part of `Tests`.
- The re-pack determinism check is part of `check:pack` and passed on all five jobs.

## Milestone 001.5 — final verification and Phase 001 closure (2026-11-08)

Traceability: [traceability.md](traceability.md) (25 FR, 7 SC, 6 US, release gate).

### Toolchain used for the final local verification

Windows NT 10.0.26300 x64 · Node v26.13.0 · pnpm 12.16.1 · Git 2.43.0.windows.1 ·
Python 3.12.10 · Specify CLI 1.2.6 · TypeScript 5.9.3 · Biome 2.6.6 · publint 0.3.25 ·
@arethetypeswrong/cli 0.18.5 · Vite 8.3.6 · @vitejs/plugin-react 5.2.0 · Tailwind CSS 4.3.5 ·
@tailwindcss/vite 4.3.5 · React/react-dom 19.3.1 · Storybook 10.6.6. Commit `3931b2c`.

### Final local gates (after `pnpm clean`)

| Gate                                             | Result                                                        |
| ------------------------------------------------ | ------------------------------------------------------------- |
| `pnpm install --frozen-lockfile`                 | pass                                                          |
| `pnpm run doctor`                                | pass (10 manifests, 40 scripts)                               |
| `pnpm lint`                                      | pass (124 files)                                              |
| `pnpm typecheck`                                 | pass                                                          |
| `pnpm test`                                      | pass — 33 tests: 32 pass, 1 skipped (POSIX-only SIGTERM test) |
| `pnpm build:packages` / `pnpm check:exports`     | pass                                                          |
| `pnpm check:pack`                                | pass — 5/5, re-pack determinism included                      |
| `pnpm check:consumer`                            | pass (Vite 8.3.6)                                             |
| `pnpm check`                                     | pass                                                          |
| `pnpm build:playground` / `pnpm build:storybook` | pass                                                          |

No temporary directories left behind.

### Distribution audit

| Package                      | Tarball           | Runtime deps | Peers         | publint    | attw (`node16-esm`, `bundler`) | `private`                | npm registry         |
| ---------------------------- | ----------------- | ------------ | ------------- | ---------- | ------------------------------ | ------------------------ | -------------------- |
| `@neshel-ui/config`          | 9 files, 2.1 KiB  | none         | —             | 0 messages | 0 problems                     | true                     | E404 (not published) |
| `@neshel-ui/layout`          | 9 files, 1.7 KiB  | none         | react ^19.0.0 | 0 messages | 0 problems                     | true                     | E404                 |
| `@neshel-ui/typography`      | 9 files, 1.8 KiB  | none         | react ^19.0.0 | 0 messages | 0 problems                     | true                     | E404                 |
| `@neshel-ui/components`      | 9 files, 1.7 KiB  | none         | react ^19.0.0 | 0 messages | 0 problems                     | true                     | E404                 |
| `@neshel-ui/cli`             | 13 files, 2.1 KiB | none         | —             | 0 messages | 0 problems                     | true                     | E404                 |
| `@neshel-ui/core` (internal) | not packed        | none         | —             | —          | —                              | true, no `publishConfig` | E404                 |

- No packed manifest contains `workspace:`, `catalog:`, `file:` or `@neshel-ui/core`.
- attw reports 2 CommonJS-only findings per package (`node10`, `node16-cjs`), intentionally
  ignored by the `esm-only` profile (ADR 0004).
- No publish workflow, no npm token or `secrets.*` reference in `.github/`. E404 shows nothing
  is published; it does **not** prove the `@neshel-ui` scope is available.
- Fixed in the audit: package READMEs (shipped in tarballs) used a repository-relative link
  that breaks on npm; now absolute.

### Architecture audit

| Area                          | Finding                                                                                                  |
| ----------------------------- | -------------------------------------------------------------------------------------------------------- |
| Workspace boundaries          | No package depends on another (0 workspace edges); no cycles; layout/typography do not import components |
| Public vs private             | 5 intended public (`publishConfig.access: public`, still `private: true`); `core` internal (ADR 0002)    |
| ESM / NodeNext                | Libraries extend `tsconfig.library.json`; exports `types` first then `import`; apps use Bundler          |
| React peers                   | `^19.0.0` on layout/typography/components only                                                           |
| Exports / declarations / maps | Verified per tarball; `src` packed for maps; tests/stories excluded                                      |
| CSS and side effects          | CSS-exporting packages declare `["**/*.css"]`; `cli`/`core` declare `false`                              |
| CLI import safety             | Importable entry is side-effect free; executable in `dist/bin.js`, exit 1 placeholder                    |
| Determinism                   | Clean builds and re-packs produce identical tarballs (`check:pack`)                                      |
| Cross-platform scripts        | Node stdlib only; shell-free pnpm launcher; signal-safe temp dirs; LF guard                              |
| Consumer isolation            | Consumers live outside the repo; tarball install verified by realpath and lockfile integrity             |
| ADRs vs implementation        | 0001–0005 consistent; ADR 0003 original matrix point now marked superseded                               |

Documented exceptions (accepted): static package names in `.changeset/config.json`
(FR-025 exception); `cli` ships an unused `dist/bin.d.ts`; Biome `tailwindDirectives`
enabled for the `@theme` block; `@types/node` kept at the 22 line; Changesets
`privatePackages.version: false` (release-slice decision, noted in `docs/releasing.md`).

### Documentation audit

63 relative links (with anchors) across 48 first-party Markdown files resolve. Setup for
Windows/Linux/macOS, Node/pnpm requirements, Spec Kit onboarding, package contracts, ADR
references, roadmap and publication safeguards match the repository. No ZIP-era instructions
remain outside the historical `docs/CLAUDE-FIRST-PROMPT.md`. Brand identity (navy rose, gold
accents, "Rooted in faith. Built with hope.") unchanged. No Phase 002+ functionality is
claimed as implemented.

### Known limitations and accepted risks

1. **US-03 / release gate item 2**: playground and Storybook previews were built but not
   visually inspected in a browser, and the light/dark toggle was not exercised.
2. CI log contents (SIGTERM test execution, determinism output, cache save details) are
   inferred from step status; job logs require authentication not available here.
3. The Spec Kit bootstrap script ran on Windows only.
4. `check:consumer` depends on the npm registry for tools.
5. Only `@neshel-ui/config` is exercised by an external consumer; the React packages are
   empty, so JSX/peer resolution at runtime is untested until components exist.
6. attw analyses with its bundled TypeScript (5.6.1-rc), not the repository's 5.9.3.
7. Vite 7 consumer compatibility is no longer re-tested continuously (ADR 0005).
8. Storybook prints `DEP0205` on Node 26 (upstream); `ubuntu-latest` is migrating to Ubuntu 26.
9. `@neshel-ui` scope ownership is unverified.

### Remaining work owned by later phases

Token vocabulary, theming model and CSS split (002); TypeScript config loading and CLI
commands (002); layout (003), typography and Capsize (004), components (005); Next.js
consumer and docs site (006); scope verification, Changesets versioning, provenance and the
publish workflow (007). Phase 002 prerequisites:
[`specs/002-config-and-tokens/brief.md`](../002-config-and-tokens/brief.md#readiness-review-phase-001-closure-2026-11-08).

### Recommendation: **CONDITIONAL PASS**

All 25 functional requirements and 7 success criteria have evidence; 5 of 6 user stories
pass. Conditions before declaring Phase 001 fully closed:

1. CI on the final 001.5 commits (documentation-only changes after `9af7a8f`).
2. Maintainer visual inspection of `pnpm dev:playground` (including the theme toggle) and
   `pnpm dev:storybook`, or an explicit waiver of release-gate item 2.

## Phase 001 final closure gates (2026-11-08)

### 001.5 — native CI result (run 42438846553, commit `16a183c`)

**CI pass** — all 5 jobs `success`, 19 steps each, none skipped/cancelled, attempt 1:
ubuntu/Node 22 (35 s), ubuntu/Node 24 (29 s), ubuntu/Node 26 (39 s), windows/Node 26
(79 s), macos/Node 26 (36 s). Annotations: informational only (Ubuntu 26 migration,
macOS queue). Log contents not accessed (authentication required).

### US-03 — browser verification

Headless Chrome 156.0.8078.81 via the Chrome DevTools Protocol against `pnpm dev:playground`
(Vite 8.3.6) and `pnpm dev:storybook` (Storybook 10.6.6) on `16a183c`; real mouse clicks on
the theme toggle. Evidence and manual reproduction steps:
[visual-verification/](visual-verification/README.md).

- Playground loads; light tokens applied (`--neshel-primary #6d28d9`, white background).
- Toggle → dark: `data-neshel-theme="dark"`, `color-scheme: dark`, 6 colour tokens and the
  computed colours of page, card and button change; second toggle restores light.
- Storybook renders "Foundations / Welcome – Default" with Neshel tokens in the preview.
- Console: no application errors or exceptions; only `favicon.ico` 404s, Vite/React
  informational logs and a Storybook UI deprecation warning.
- "Neshel-UI" wordmark text present in both apps; brand assets and README unchanged.

### Final status

25/25 FR (3 qualified: FR-009, FR-023, FR-025), 7/7 SC, 6/6 US and all four release-gate
items are met — see [traceability.md](traceability.md#reconciliation-final).

Remaining accepted risks: Spec Kit bootstrap executed on Windows only; CI log-level details
inferred; `check:consumer` needs the npm registry; only `config` exercised by an external
consumer; attw bundles TypeScript 5.6.1-rc; Vite 7 no longer re-tested; Storybook `DEP0205`
and Storybook 11 `ariaLabel` deprecation; concurrent dev servers trigger a duplicate package
rebuild; baseline primary colour (violet) differs from the brand palette (navy/gold) until
feature 002; `@neshel-ui` scope ownership unverified.

### Recommendation: **PASS**

Phase 001 is closed once the documentation-only closure commit that records this section
receives the same five-job CI result. No package is published; all publication guards remain.

**Closure confirmed (2026-11-07):** commit `b8c6198` passed all five jobs (Ubuntu Node 22/24/26,
Windows Node 26, macOS Node 26) in GitHub Actions run 42441381954, as reported by the owner.
