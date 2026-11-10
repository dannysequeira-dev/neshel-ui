# Evidence — feature 007 (first npm publication, 0.1.0)

States: **verified independently** (queried or executed by the maintainer's agent against the public
npm registry on 2026-11-10, Windows 11, Node 26.13.0; npm 10.5.1 and npm 11.20.0 where stated),
**verified in CI** (GitHub Actions, named run), **owner action** (performed by the owner; not
re-verified here).

## Official release record

| Item                 | Value                                                                                                                            |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Tag                  | `v0.1.0` → commit `9a3d4deff1ac42d9b9fd1433af6aeba0126cfe99` (merge of release PR #1). Immutable.                                |
| Release workflow run | [42843343125](https://github.com/dannysequeira-dev/neshel-ui/actions/runs/42843343125), `release.yml`, environment `npm-release` |
| Publishing attempt   | Attempt 2 (packages published 2026-11-10 15:34–15:35 UTC)                                                                        |
| Credential           | Bootstrap granular token `NPM_BOOTSTRAP_TOKEN` (owner action); removed from `release.yml` in the finalization PR                 |
| Published packages   | `@neshel-ui/config`, `layout`, `typography`, `components`, `cli` — all `0.1.0`, `latest`                                         |
| Not published        | `@neshel-ui/core` (registry: E404)                                                                                               |
| Verification fix     | PR #2 (merged by the owner; merge commit `2e33787`), CI run 42860415878 14/14                                                    |

### Release run attempts

| Attempt | Publish step                                                                                                                             | Verify step                                                                                                    |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 1       | Failed: `EOTP` — the token required a one-time password; nothing published                                                               | Skipped                                                                                                        |
| 2       | **Succeeded**: five packages published with provenance                                                                                   | Failed: false negative (npm 11 warnings on stderr were concatenated with stdout and compared with the version) |
| 3       | Failed: `You cannot publish over the previously published versions: 0.1.0` — the same false negative made existing versions look missing | Skipped                                                                                                        |

The run is marked failed although the publication succeeded. It is never rerun; the tag keeps the
original script. Root cause reproduced with npm 11.20.0 from the repository root: four
`npm warn Unknown project config …` lines (pnpm settings in `.npmrc`) on stderr; the old check
reported all five as missing, the fixed check reports them present.

## Registry and integrity (verified independently)

The SHA-512 integrity served by the registry equals the hash of each tarball in the run's
`release-tarballs` artefact, byte for byte.

| Package                 | Published (UTC)          | SHA-512 integrity                                                                                 |
| ----------------------- | ------------------------ | ------------------------------------------------------------------------------------------------- |
| `@neshel-ui/config`     | 2026-11-10T15:34:45.568Z | `sha512-1zOxUJowCzMX11iCFEcml2mxSTQljzNUI6usBpoQXMOcoDgpJw9AdlH27+EEui84scrJODkd2U99SUiyI+Uvug==` |
| `@neshel-ui/layout`     | 2026-11-10T15:34:01.456Z | `sha512-x43qk2kU2lwuuEh07KMex1SXyBn4Wck/l7fprcDqdvCYx/X4h67Wh5GH8ItVjBA6mfQiQgwITF2T1hkLFXa80A==` |
| `@neshel-ui/typography` | 2026-11-10T15:34:59.777Z | `sha512-M+fDnnrRsPdHr4axdvSQGBGiLQAG1g/WB/xqBbIuiJF4JcC+VlcArd7tPJ2Qabg+qCaKMq78uVDMdopTsABxIw==` |
| `@neshel-ui/components` | 2026-11-10T15:34:34.459Z | `sha512-umW8ZBddZzmXTO6QuuDAb+z6vZw1xoMcVaT2vnH0lwDmDcKkvhclmLGC2QhfVHppBkgc5wE9aLqAldHK+MzM2w==` |
| `@neshel-ui/cli`        | 2026-11-10T15:35:46.048Z | `sha512-iq7wzL0YBD7qNg90r/xL+S/UcCs80YXxQscYVYuN5zMjkuaOpuvoO8/m/6E+fPIYzfNQ9TN2gti4PAdqQgEN9g==` |

Registry timestamps are the registry's own; the publish order in the run log is config → layout →
typography → components → cli.

## Provenance (verified independently)

`npm audit signatures` (npm 11.20.0) in a clean project with the five packages, React and React DOM
19: **64 packages have verified registry signatures, 52 have verified attestations, 0 invalid,
0 missing.** (The older npm 10.5.1 printed "tampered" warnings for the same install, including for
React itself, so they are not specific to Neshel-UI; the likely cause is outdated registry key
handling in that npm version, not verified. Use npm 11.) Decoded SLSA v1 provenance statements:

| Package                 | Repository / workflow / ref                                                          | Commit         | Invocation                 | Rekor log index |
| ----------------------- | ------------------------------------------------------------------------------------ | -------------- | -------------------------- | --------------- |
| `@neshel-ui/config`     | `dannysequeira-dev/neshel-ui` · `.github/workflows/release.yml` · `refs/tags/v0.1.0` | `9a3d4deff1ac` | run 42843343125, attempt 2 | 3788713097      |
| `@neshel-ui/layout`     | same                                                                                 | `9a3d4deff1ac` | run 42843343125, attempt 2 | 3788714920      |
| `@neshel-ui/typography` | same                                                                                 | `9a3d4deff1ac` | run 42843343125, attempt 2 | 3788716914      |
| `@neshel-ui/components` | same                                                                                 | `9a3d4deff1ac` | run 42843343125, attempt 2 | 3788719085      |
| `@neshel-ui/cli`        | same                                                                                 | `9a3d4deff1ac` | run 42843343125, attempt 2 | 3788720700      |

Attestations: `https://registry.npmjs.org/-/npm/v1/attestations/@neshel-ui%2f<name>@0.1.0`.

## Clean external installation (verified independently)

Directory outside the repository with spaces and Unicode in its path, empty npm cache, empty user
configuration, `--registry https://registry.npmjs.org/`:

- `npm install` of the five packages at `0.1.0` plus `react@19` and `react-dom@19`: success; every
  installed manifest is `0.1.0`.
- Every package imports in Node (ESM). The CLI's programmatic entry exports nothing by design (it
  is a placeholder; the executable is `neshel`).
- All exported stylesheets resolve: `@neshel-ui/config/{styles,tokens,tailwind}.css`,
  `@neshel-ui/{layout,typography,components}/styles.css`.
- Server rendering of `Stack` › `Text` + `Button` with `react-dom/server` succeeds.
- `neshel --help` prints the usage.
- The fixed `publish-tarballs.mjs --verify-only` against the run's artefact: five present, clean
  install succeeded (npm 10.5.1 and npm 11.20.0).

## Starters from npm (verified independently)

`pnpm check:starters --from-registry`: each starter's deterministic ZIP extracted outside the
repository, installed with `@neshel-ui/*@^0.1.0` resolved from npm (no tarballs), built:
`next-app` (`.next/BUILD_ID`), `vite-css` and `vite-tailwind` (`dist/index.html`); every
`@neshel-ui/*` dependency resolved to `0.1.0` from the registry.

## Finalization PR — validation

Local (Windows 11, Node 26.13.0, pnpm 12.16.1), 2026-11-10:

| Check                                                                              | Result                                                                                                                                             |
| ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm check` (doctor, lint, typecheck, tests, build, package tests, exports, pack) | pass — tests 105 (104 pass, 1 skipped, pre-existing), package tests 204/204, `check:pack` 5/5; lint: no errors (3 warnings + 1 info, pre-existing) |
| `pnpm docs:build` (writes the starter ZIPs to `public/downloads/`)                 | pass                                                                                                                                               |
| `pnpm check:docs`                                                                  | pass (148 pages, 138 snippets)                                                                                                                     |
| `pnpm check:docs-site`                                                             | 14/14, including the new check that both starter pages link three ZIPs and each is served as a ZIP                                                 |
| `pnpm release:simulate`                                                            | pass — five packages `ok (0.1.0 already on the registry)`                                                                                          |
| `pnpm check:starters --from-registry`                                              | pass (three starters from npm)                                                                                                                     |

CI for the finalization PR: see below.
