# Releasing Neshel-UI

**0.1.0 is published** (2026-11-10): `@neshel-ui/config`, `layout`, `typography`, `components` and
`cli`, from tag `v0.1.0` by release run 42843343125, with SLSA provenance. `@neshel-ui/core` stays
private. Evidence: [specs/007-first-publication/evidence.md](../specs/007-first-publication/evidence.md).
A green CI is never an authorisation to publish: every version, tag, environment approval and
GitHub Release needs explicit owner approval. Decisions:
[ADR 0017](decisions/0017-release-and-publishing-pipeline.md); normative detail:
[contracts/release.md](../specs/006-docs-dx-release/contracts/release.md).

## Versioning policy

- Changesets with a **fixed group** of the five public packages during 0.x: one version number for
  `config`, `layout`, `typography`, `components` and `cli`. `@neshel-ui/core` is never published.
- Before 1.0: breaking change → **minor** (0.1 → 0.2), feature → minor, fix → **patch**. Breaking
  changes are always called out in the changelog. From 1.0: semver majors for breaking changes.
- Every user-facing change carries a changeset (`pnpm changeset`). The version source is the
  `version` field written by `changeset version` — nothing else.
- Peer ranges: packages declare `@neshel-ui/config` as `workspace:^`, packed as `^X.Y.Z`.
- Published versions are immutable. A tag that has published (`v0.1.0`) is never moved, deleted or
  recreated, and its release workflow is never rerun; fixes ship as a new version.

## What is verified automatically

| Gate                                         | Command                                   |
| -------------------------------------------- | ----------------------------------------- |
| Packed tarballs, metadata, publint, attw     | `pnpm check:pack`                         |
| External Vite consumers, SSR, tree-shaking   | `pnpm check:consumer`                     |
| Next.js App Router consumer                  | `pnpm check:next`                         |
| Chrome interaction suite, backdrop fallback  | `pnpm check:browser:components`           |
| Chromium, Firefox, WebKit                    | `pnpm check:browsers`                     |
| Bundle budgets                               | `pnpm check:bundles`                      |
| Starters from ZIP archives                   | `pnpm check:starters`                     |
| Documentation                                | `pnpm check:docs`, `pnpm check:docs-site` |
| Version transition + `npm publish --dry-run` | `pnpm release:simulate`                   |

After a publication (manual, network):

| Check                                                | Command                                                                 |
| ---------------------------------------------------- | ----------------------------------------------------------------------- |
| Registry versions + clean install (release workflow) | `node scripts/publish-tarballs.mjs <dir> --version X.Y.Z --verify-only` |
| Starter ZIPs installed from npm and built            | `pnpm check:starters --from-registry`                                   |
| Registry signatures and provenance (npm ≥ 11)        | `npm audit signatures` in a clean install                               |

`release:simulate` reports `ok (X.Y.Z already on the registry)` when the version it rehearses is
already published: npm 11 rejects the dry run at the registry check, after the tarball is packed
and validated.

## Publication order

`@neshel-ui/config` → `layout` → `typography` → `components` → `cli` (every other package peers on
`config`). `scripts/publish-tarballs.mjs` publishes in this order, skips versions already on the
registry (a failed run can be repeated) and then verifies `npm view` and a clean install.
It decides from npm's exit status and stdout only (npm warnings on stderr are ignored), publishes
only on a confirmed miss (E404 or an empty answer), stops on network, authentication or registry
errors instead of publishing, and treats a publish conflict on a version that now exists as
already published. `--verify-only` retries registry checks and the clean install with bounded
backoff (5 attempts after the first, about 95 s in total) before failing.

## How 0.1.0 was published (history)

Release run 42843343125 on tag `v0.1.0` (commit `9a3d4de`), bootstrap token
`NPM_BOOTSTRAP_TOKEN` in the `npm-release` environment:

| Attempt | Publish step                                              | Registry verification step                                         |
| ------- | --------------------------------------------------------- | ------------------------------------------------------------------ |
| 1       | Failed: `EOTP` (the token required a one-time password)   | Skipped                                                            |
| 2       | **Published all five packages** with provenance           | Failed: false negative (npm warnings mixed into the version check) |
| 3       | Failed: "cannot publish over 0.1.0" (same false negative) | Skipped                                                            |

The tag keeps the original script. PR #2 fixed the check on `main` (and `release:simulate` after
publication); independent verification is recorded in the evidence file. The bootstrap
`NODE_AUTH_TOKEN` was removed from `release.yml` in feature 007's finalization.

## Trusted publishing (OIDC) for future releases

`release.yml` publishes with npm trusted publishing: the `publish` job runs in the protected
`npm-release` environment with `id-token: write`, npm ≥ 11.5.1, and **no npm token**. Intended
configuration, per package on npmjs.com → package → Settings → Trusted publisher:

| Field             | Value               |
| ----------------- | ------------------- |
| Provider          | GitHub Actions      |
| Organisation/user | `dannysequeira-dev` |
| Repository        | `neshel-ui`         |
| Workflow filename | `release.yml`       |
| Environment       | `npm-release`       |

Status: **documented, not configured or verified.** No artificial version is published to activate
it. Configure the five trusted publishers shortly before the next real release tag: the owner's
brief records that a newly created trusted-publisher configuration must complete its first
successful publish within 48 hours (confirm against npm's documentation at that time). Once that
release has published through OIDC and its provenance is verified, set each package's Publishing
access to "Require two-factor authentication and disallow tokens".

Until trusted publishers are configured, a tagged release would fail at the publish step
(authentication) without publishing anything; the workflow has no other npm credential.

## Owner actions — remaining after 0.1.0

1. **Revoke the bootstrap credential.** Delete the granular npm token used for 0.1.0 on npmjs.com
   and the `NPM_BOOTSTRAP_TOKEN` secret from the `npm-release` environment (the workflow no longer
   reads it).
2. **GitHub Release** for the existing tag `v0.1.0` (do not move or recreate the tag), with the
   notes in [specs/006-docs-dx-release/release-notes-0.1.0.md](../specs/006-docs-dx-release/release-notes-0.1.0.md).
3. **Trusted publishers**: configure as above, before the next release.
4. **Organisation 2FA** (optional, not verified): enforce 2FA for all `neshel-ui` organisation
   members.

Done for 0.1.0: npm organisation; brand policy ([BRAND-POLICY.md](BRAND-POLICY.md)); `npm-release`
environment with required reviewers and a `v*.*.*` tag rule; release PR #1; tag `v0.1.0`;
environment approval; documentation site at https://neshel-ui.vercel.app
([deployment.md](deployment.md)) switched to npm instructions and starter downloads
(`release.published = true` in `apps/docs/lib/release.ts`).

## Later releases

Merge changes with changesets → open a version PR (`pnpm version-packages`) → merge → configure or
confirm the trusted publishers → push the tag `vX.Y.Z` → approve the environment. The guards refuse
a tag that does not match all five versions. After publication, run the post-publication checks
above and record the evidence.
