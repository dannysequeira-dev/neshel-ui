# Changesets

Changesets will record user-facing changes once the packages become publishable.

Packages are deliberately marked `private: true` during foundation work. Never remove
that guard or publish a package without explicit owner approval. The initial public
release is planned as `0.1.0`, after the public API and external package tests pass.

The Changesets CLI will be installed by `pnpm install`. Use `pnpm changeset` only
when a slice changes the public API, behavior, or packaging contract.
