# Releasing Neshel-UI

**Nothing is published yet.** The 0.1.0 release PR (`release/0.1.0`, feature 007) lifts `private: true`
from the five public packages and versions them to 0.1.0; `@neshel-ui/core` stays private. Feature 006
prepared and rehearsed the pipeline; executing it is the owner-authorised publication milestone
(roadmap row 007). A green CI
is not an authorisation to publish. Decisions: [ADR 0017](decisions/0017-release-and-publishing-pipeline.md);
normative detail: [contracts/release.md](../specs/006-docs-dx-release/contracts/release.md).

## Versioning policy

- Changesets with a **fixed group** of the five public packages during 0.x: one version number for
  `config`, `layout`, `typography`, `components` and `cli`. `@neshel-ui/core` is never published.
- Before 1.0: breaking change → **minor** (0.1 → 0.2), feature → minor, fix → **patch**. Breaking
  changes are always called out in the changelog. From 1.0: semver majors for breaking changes.
- Every user-facing change carries a changeset (`pnpm changeset`). The version source is the
  `version` field written by `changeset version` — nothing else.
- Peer ranges: packages declare `@neshel-ui/config` as `workspace:^`, packed as `^X.Y.Z`.

## What is verified automatically

| Gate                                        | Command                                   |
| ------------------------------------------- | ----------------------------------------- |
| Packed tarballs, metadata, publint, attw    | `pnpm check:pack`                         |
| External Vite consumers, SSR, tree-shaking  | `pnpm check:consumer`                     |
| Next.js App Router consumer                 | `pnpm check:next`                         |
| Chrome interaction suite, backdrop fallback | `pnpm check:browser:components`           |
| Chromium, Firefox, WebKit                   | `pnpm check:browsers`                     |
| Bundle budgets                              | `pnpm check:bundles`                      |
| Starters from ZIP archives                  | `pnpm check:starters`                     |
| Documentation                               | `pnpm check:docs`, `pnpm check:docs-site` |
| 0.1.0 transition + `npm publish --dry-run`  | `pnpm release:simulate`                   |

## Publication order

`@neshel-ui/config` → `layout` → `typography` → `components` → `cli` (every other package peers on
`config`). `scripts/publish-tarballs.mjs` publishes in this order, skips versions already on the
registry (a failed run can be repeated) and then verifies `npm view` and a clean install.

## Owner actions — first publication (0.1.0)

1. **npm organisation.** ✅ Organisation `neshel-ui` exists and the owner's personal npm account
   has 2FA enabled (owner-confirmed, 2026-11-09). Still to do (not verified): enforce 2FA for all
   organisation members in the organisation settings.
2. **Brand policy.** ✅ Done (2026-11-09): [BRAND-POLICY.md](BRAND-POLICY.md) is owner-approved.
3. **GitHub environment.** Settings → Environments → `npm-release`: required reviewers (you),
   deployment branches/tags limited to `v*.*.*`.
4. **Release PR** 🟡 Prepared (2026-11-09, branch `release/0.1.0`; merging needs owner approval).
   The only change that lifts the guards: remove `"private": true`
   from the five public package manifests, run `pnpm version-packages` (`changeset version`, then a
   build and `generate:component-css`, because the three style manifests embed the package version),
   review the five
   `CHANGELOG.md` files and the `0.1.0` versions, merge after green CI. (`pnpm release:simulate`
   already proves this produces exactly 0.1.0.)
5. **Bootstrap credential** (npm trusted publishing cannot be configured before a package exists).
   Recommended: create a _granular_ access token limited to the five `@neshel-ui/*` packages, with
   publish permission and an expiry of at most 7 days; store it as the environment secret
   `NPM_BOOTSTRAP_TOKEN` in `npm-release`. Alternative: download the `release-tarballs` artefact of a
   verified run and publish them manually with `npm publish <tgz> --access public` (2FA; no
   provenance for 0.1.0).
6. **Tag.** `git tag -a v0.1.0 -m "Neshel-UI 0.1.0"` on the merged release commit and push it. The
   `Release` workflow runs the gates, the guards (tag = all versions, guards lifted, core private),
   packs once, and waits for your approval of `npm-release`. Approve to publish.
7. **After 0.1.0.** For each package on npmjs.com → Settings → Trusted publisher: GitHub Actions,
   repository `dannysequeira-dev/neshel-ui`, workflow `release.yml`, environment `npm-release`. Then
   Publishing access → "Require two-factor authentication and disallow tokens", and delete the
   bootstrap token and secret. Later releases publish with OIDC and automatic provenance.
8. **Documentation site (Vercel).** ✅ Done (2026-11-09): https://neshel-ui.vercel.app — settings in
   [deployment.md](deployment.md). Production deploys from `main`,
   previews for pull requests. Custom domains (DNS) are an owner decision. Only after the npm
   publication is verified, set `release.published = true` in `apps/docs/lib/release.ts` to switch
   the site from tarball to npm instructions and enable starter downloads.
9. **GitHub Release** (optional): create it from the tag with the release notes draft
   ([specs/006-docs-dx-release/release-notes-0.1.0.md](../specs/006-docs-dx-release/release-notes-0.1.0.md)).

## Later releases

Merge changes with changesets → open a version PR (`pnpm version-packages`) → merge → push the tag
`vX.Y.Z` → approve the environment. The guards refuse a tag that does not match all five versions.
