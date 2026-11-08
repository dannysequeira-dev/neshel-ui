# Feature 001 — evidence log

Records **actual** results only. Legend: **Implemented** (code/config exists),
**Local** (passed on the named machine), **CI** (passed on native GitHub runners).

## Baseline audit — 2026-11-07, Windows 11 (win32 x64), Node v26.13.0, pnpm 12.16.1

| Gate | Result |
| --- | --- |
| `pnpm run doctor` | Local pass |
| `pnpm test` | Local pass (6/6) |
| `pnpm typecheck` | Local pass (9 projects) |
| `pnpm build:packages` / `pnpm check:exports` | Local pass |
| `pnpm --filter @neshel-ui/playground-vite build` | Local pass (Vite 7.3.7, Tailwind 4.3.5) |
| `pnpm --filter @neshel-ui/storybook build` | Local pass (Storybook 10.6.6; chunk-size warning) |
| `pnpm lint` | **Fail**: 41 errors (33 format, 5 organizeImports, 2 `useIterableCallbackReturn`) |
| `pnpm pack --dry-run` (config) | Maps reference `../src/index.ts`, which is not packed |
| Native CI, commit `afdbcb3` (run 42426509069) | **CI pass**: Node 22 × {ubuntu, windows, macos}, Node 24 × ubuntu. Covers doctor, test, typecheck, build:packages, check:exports, Vite and Storybook builds. Lint, packed artifacts and Node 26 are **not** covered by that workflow. |

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
- Commit: `ddc3e69` (local).
- CI: not verified for these changes (not pushed).
