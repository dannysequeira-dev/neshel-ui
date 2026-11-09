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
pnpm check            # doctor, lint, typecheck, tests, build, package tests, exports, packed artifacts
pnpm check:consumer   # external Vite consumers (Tailwind, plain CSS) from packed tarballs (network)
pnpm dev:storybook
```

These commands work in PowerShell, Bash and Zsh. Run `pnpm format` before committing. We
require green native CI on Windows, Linux and macOS for changes to tooling or public packages.

Feature work is scoped to a Spec Kit feature slice (`specs/`) and includes tests, documentation
(English and Spanish) and stories.

## Design tokens

`packages/config/src/tokens.css` and `tailwind.css` are generated from the contract data in
`packages/config/src/contract.ts`; do not edit them by hand. After changing the contract:

```bash
pnpm build:packages
pnpm generate:tokens   # rewrites the two stylesheets with the CLI's generator
pnpm build:packages
pnpm test:packages     # drift, contrast and golden-file tests
```

## Documentation

The documentation website lives in `apps/docs` and is verified like code. A change to a public API
must update, in the same pull request:

- the package JSDoc (props and defaults are generated from declarations: `pnpm docs:api`);
- the English **and** Spanish pages (`apps/docs/content/docs/{en,es}`), demos and API description
  translations (`apps/docs/i18n/api.es.json`);
- a changeset (`pnpm changeset`).

`pnpm check:docs` (coverage, translations, links, type-checked snippets) and `pnpm docs:build` must
pass. The full process and the new-component checklist are on the site page "Contributing to the
documentation" (`apps/docs/content/docs/en/project/contributing-docs.mdx`).

## Pull requests

Use focused changes and Conventional Commit subjects, e.g. `feat(layout): add Stack`.
Include test results, compatibility impact, screenshots for visual changes,
and a changeset for every user-facing change to a public package.

## Conduct

Follow `CODE_OF_CONDUCT.md`. Make feedback clear, respectful and specific.
