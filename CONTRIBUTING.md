# Contributing to Neshel-UI

Thank you for helping build thoughtful, accessible and reliable UI primitives.

## Before contributing

- Read `CLAUDE.md` (agent conventions also apply to human contributors),
  `docs/architecture.md` and the related feature specification.
- Discuss new public APIs and significant changes in an issue/ADR first.
- Keep package boundaries strict and use pnpm workspaces.
- Support Windows, Linux and macOS. See `docs/CROSS-PLATFORM.es.md`. Avoid platform-specific npm scripts.

## Local development

Use Node 26 (`.nvmrc`; 22.13+ supported) and the pnpm version pinned in `packageManager`.

```bash
pnpm install --frozen-lockfile
pnpm check            # doctor, lint, typecheck, tests, build, exports, packed artifacts
pnpm check:consumer   # external Vite + Tailwind consumer from the packed tarball (network)
pnpm dev:storybook
```

These commands work in PowerShell, Bash and Zsh. Run `pnpm format` before committing. We
require green native CI on Windows, Linux and macOS for changes to tooling or public packages.

Packages are still placeholders: feature work must be scoped to a Spec Kit feature slice
(`specs/`) and include tests, documentation and stories once components exist.

## Pull requests

Use focused changes and Conventional Commit subjects, e.g. `feat(layout): add Stack`.
Include test results, compatibility impact, screenshots for visual changes,
and a Changeset once public packages are released.

## Conduct

Follow `CODE_OF_CONDUCT.md`. Make feedback clear, respectful and specific.
