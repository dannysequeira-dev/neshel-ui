# Changesets

Changesets will record user-facing changes once the packages become publishable.

The five public packages form a fixed group (one version). The 0.1.0 release PR consumed
the pre-release changesets into each package's `CHANGELOG.md`. `@neshel-ui/core` stays
`private: true` and ignored. Never publish a package without explicit owner approval.

The Changesets CLI will be installed by `pnpm install`. Use `pnpm changeset` only
when a slice changes the public API, behavior, or packaging contract.
