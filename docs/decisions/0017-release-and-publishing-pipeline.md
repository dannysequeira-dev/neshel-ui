# ADR 0017 — Release versioning and publishing pipeline

- Status: **Accepted** for preparation (2026-11-08, within the owner's Phase 006 brief);
  execution requires explicit owner authorisation
- Date: 2026-11-08
- Feature: [006](../../specs/006-docs-dx-release/spec.md); normative detail in
  [contracts/release.md](../../specs/006-docs-dx-release/contracts/release.md)

## Context

Five packages target `0.1.0`. They are `private: true` and Changesets ignores private packages
(`privatePackages.version: false`). Changesets bumps dependents of a changed peer with a major
release by default. npm recommends Trusted Publishing (OIDC, automatic provenance), which can only
be configured for packages that already exist.

## Decision

1. Changesets with a `fixed` group of the five public packages during 0.x.
2. The guard transition is one owner-approved PR (remove `private`, `changeset version`); before it,
   `pnpm release:simulate` reproduces it in a temporary copy and dry-runs `npm publish`.
3. `release.yml` publishes on a pushed `v*.*.*` tag (owner's tag-driven plan) after a protected
   environment approval, from tarballs packed once and validated, in dependency order, idempotently.
4. 0.1.0 bootstrap: short-lived granular token used once with provenance (recommended) or manual
   publication of the CI tarballs; then trusted publishers per package and token-disallow policy.

## Consequences

One version line during 0.x (a change in any package bumps all five). Publication remains a manual,
reviewed act. The first release needs owner work on npm.

## Alternatives

Independent versions (peer ranges in 0.x break across minors); `changeset publish` (publishes from
the working tree rather than validated tarballs); long-lived `NPM_TOKEN` (rejected by npm guidance).

## Verification

`pnpm release:simulate`; `release.yml` `workflow_dispatch` dry run; actionlint-style review.
