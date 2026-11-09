# Contract — release candidate and publishing pipeline

Normative for feature 006. Decisions: research R15–R18; [ADR 0017](../../../docs/decisions/0017-release-and-publishing-pipeline.md).

## Public packages and order

| Order | Package                 | Depends on (peer)        |
| ----- | ----------------------- | ------------------------ |
| 1     | `@neshel-ui/config`     | —                        |
| 2     | `@neshel-ui/layout`     | config, react            |
| 3     | `@neshel-ui/typography` | config, react            |
| 4     | `@neshel-ui/components` | config, react, react-dom |
| 5     | `@neshel-ui/cli`        | config                   |

`@neshel-ui/core` is never published and never a dependency of a published package.

## Manifest requirements (enforced by `check:pack`)

`name`, `version`, `description`, `keywords`, `license: MIT`, `author`, `repository`
(`type: git`, `url: git+https://github.com/dannysequeira-dev/neshel-ui.git`, `directory`),
`homepage`, `bugs`, `type: module`, `exports` (types first), `sideEffects`, `files`,
`publishConfig.access: public`, `README.md`, `LICENSE`. Peer/runtime dependency rules unchanged.

## Versioning

- Changesets, `fixed` group of the five packages during 0.x; `privatePackages` unchanged until the
  owner-approved release PR.
- Breaking change → minor in 0.x (major from 1.0); feature → minor; fix → patch. Every user-facing
  change carries a changeset.
- `pnpm release:simulate` (no side effects on the repository) must produce five `0.1.0` tarballs
  with peers `^0.1.0` that pass `npm publish --dry-run`.

## Workflow `release.yml`

- Triggers: `push` of tags `v*.*.*`; `workflow_dispatch` with `dry_run` (default `true`).
- Job `verify` (no secrets, `contents: read`): install, gates, build, `check:pack`, guard checks
  (tag = version of all five packages, none `private`, `core` private), pack once, upload tarballs.
- Job `publish` (needs `verify`, environment `npm-release` with required reviewers,
  `id-token: write`): Node 26 (npm ≥ 11.5.1), downloads the tarballs, publishes each in order with
  `npm publish <tgz> --access public` (provenance automatic with OIDC; `--provenance` explicit for
  the bootstrap token path), skips versions already on the registry, then verifies
  `npm view` and a clean install of all five.
- Never triggered by branch pushes or pull requests. No GitHub Release is created.

## Owner actions (gate)

1. Create/confirm the `neshel-ui` npm organisation (scope ownership), 2FA enforced.
2. Approve the release PR removing `private: true` and versioning to 0.1.0.
3. Create GitHub environment `npm-release` with required reviewers and tag protection.
4. Choose the 0.1.0 bootstrap (short-lived granular token secret `NPM_BOOTSTRAP_TOKEN`, or manual
   publish of the CI tarballs).
5. Push tag `v0.1.0`, approve the environment.
6. After 0.1.0: configure a trusted publisher per package (`release.yml`, environment
   `npm-release`), set "Require 2FA and disallow tokens", revoke the bootstrap token.
7. Import the repository in Vercel (Root Directory `apps/docs`) and deploy — docs/deployment.md; optionally a custom domain.
