# Contributing to Neshel-UI

Thank you for helping build thoughtful, accessible and reliable UI primitives.

## Before contributing

- Read `CLAUDE.md` (agent conventions also apply to human contributors),
  `docs/architecture.md` and the related feature specification.
- Discuss new public APIs and significant changes in an issue/ADR first.
- Keep package boundaries strict and use pnpm workspaces.

## Local development

```bash
pnpm install
pnpm check:workspace
pnpm build:packages
pnpm test
pnpm typecheck
pnpm lint
pnpm dev:storybook
```

The codebase is currently a bootstrap: component PRs should be scoped to a
Spec Kit feature slice and include tests, docs and stories once implemented.

## Pull requests

Use focused changes and Conventional Commit subjects, e.g. `feat(layout): add Stack`.
Include test results, compatibility impact, screenshots for visual changes,
and a Changeset once public packages are released.

## Conduct

Follow `CODE_OF_CONDUCT.md`. Make feedback clear, respectful and specific.
