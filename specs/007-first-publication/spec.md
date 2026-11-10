# Feature Specification: First npm publication (0.1.0)

**Feature Branch**: `release/0.1.0` (release PR #1), `fix/publish-verification` (PR #2),
`release/phase-007-finalization` (finalization PR)

**Created**: 2026-11-09

**Status**: **Closed — PASS** (2026-11-10). `@neshel-ui/config`, `layout`, `typography`, `components`
and `cli` are on npm at `0.1.0` with SLSA provenance; `@neshel-ui/core` stays private. Evidence:
[evidence.md](evidence.md). Owner actions that remain after closure (token revocation, GitHub
Release, trusted publishers before the next release) are listed in
[docs/releasing.md](../../docs/releasing.md); they do not block closure.

**Input**: owner-authorised execution of the release pipeline prepared and rehearsed in feature 006
([contracts/release.md](../006-docs-dx-release/contracts/release.md),
[ADR 0017](../../docs/decisions/0017-release-and-publishing-pipeline.md)), in three owner briefs:
the release PR (2026-11-09), "Fix post-publication verification for v0.1.0" and "Phase 007
Finalization" (2026-11-10).

**Process note.** Feature 007 introduced no new product scope: it executed a pipeline whose design,
contracts, tasks and rehearsal belong to feature 006. It therefore has no separate plan, research or
tasks files; each step was an explicit owner authorisation, and this specification records the
requirements those steps had to meet and the evidence that they did.

## Scope

1. Release PR: version the five public packages to `0.1.0` with Changesets, lift their `private`
   guard, keep `@neshel-ui/core` private (PR #1).
2. Tag `v0.1.0`, protected-environment approval and publication by `release.yml` (owner).
3. Independent post-publication verification, and a fix for the verification false negative that
   failed the release run after the packages were published (PR #2).
4. Finalization: documentation and site switched to the published packages, starter downloads,
   removal of the bootstrap npm credential from the workflow, release evidence, final release notes
   and formal closure (finalization PR).

Out of scope: creating the GitHub Release, configuring npm trusted publishers, revoking the npm
token (owner actions); any new version or tag.

## Requirements

- **FR-001** The five public packages are published at exactly `0.1.0`, in dependency order, from the
  tag-triggered `release.yml` behind the `npm-release` environment approval.
- **FR-002** Each published tarball is byte-identical to the tarball built and validated by the
  release workflow (SHA-512 integrity).
- **FR-003** Each package carries verifiable provenance that names this repository, `release.yml`,
  the tag and its commit.
- **FR-004** `@neshel-ui/core` is not published and no public package depends on it.
- **FR-005** A clean installation outside the repository, from the public registry, imports every
  package, resolves every exported stylesheet, renders on the server and runs the CLI.
- **FR-006** The starters install from the registry and build.
- **FR-007** The tag `v0.1.0` stays immutable; the release workflow run is never rerun.
- **FR-008** Post-publication verification distinguishes a missing version from npm warnings and
  from network, authentication and registry errors, with bounded retries (PR #2).
- **FR-009** After publication the workflow holds no npm credential; later releases use trusted
  publishing (OIDC) through the same protected environment.
- **FR-010** Documentation (English and Spanish), the website, README, CLAUDE.md, roadmap and release
  documents describe the published state; `release.published = true`.
- **FR-011** Final release notes for the GitHub Release reflect the actual publication.

## Success criteria

- **SC-001** Registry: five packages at `0.1.0`, `latest` = `0.1.0`; `core` answers 404.
- **SC-002** SHA-512 integrity of all five matches the `release-tarballs` artefact of run 42843343125.
- **SC-003** `npm audit signatures` (npm ≥ 11): registry signatures and provenance attestations
  verified, none invalid or missing; provenance names repository, workflow, `refs/tags/v0.1.0` and
  commit `9a3d4de`.
- **SC-004** Clean external installation and smoke test pass.
- **SC-005** `pnpm check:starters --from-registry` passes for the three starters.
- **SC-006** CI green on Linux, Windows and macOS for PR #2 and for the finalization PR.

SC-001–SC-005 are met and SC-006 is met for PR #2; the finalization PR's CI result is recorded in
[evidence.md](evidence.md).
