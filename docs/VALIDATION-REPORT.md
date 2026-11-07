# Scaffold validation record — 2026-11-07

## Validated in the creation environment

- Root and package JSON files parse successfully.
- Workspace and GitHub Actions YAML parse successfully.
- `node scripts/check-workspace.mjs` passes for six guarded packages.
- Three Node native workspace tests pass.
- All six packages generate `.js`/`.d.ts` exports with the available global
  TypeScript compiler (v5.8.3) and Node v22.16.0.
- CSS exports were copied to build outputs and `scripts/check-exports.mjs` passed.
- 35 initial Markdown files passed local-link and code-fence static checks.
- Generated `dist` directories were deleted after verification.
- Package LICENSE files included.

## NOT validated in the creation environment

- `pnpm install` (no registry network / pnpm binary available).
- Resolution of all current npm peer dependencies.
- Actual Storybook or Vite browser build/render.
- Biome formatting/lint; full workspace typecheck using installed dependencies.
- Running the official Spec Kit CLI and Claude Code skills on Windows.
- External packed-artifact Vite/Next consumption, SSR or npm availability.

## First action on maintainer's Windows machine

Run the commands in `docs/SETUP-WINDOWS.es.md` and hand any real failures to
Claude using the prompt in `docs/CLAUDE-FIRST-PROMPT.md`. Commit the real
`pnpm-lock.yaml` after the first successful install.

This report separates implemented scaffolding from unverified application setup;
it is **not** evidence that the full design system has been implemented.
