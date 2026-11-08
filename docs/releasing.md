# Release safety and npm publishing

**There is no functional v0.1.0 and no publication automation in this ZIP.**
All packages are deliberately `private: true`; `@neshel-ui` scope ownership
and package name availability are unverified.

## Before lifting publishing guards

1. Verify scope ownership and name availability on npm; check brand conflicts.
2. Settle ADR 0001's private-core dependency trap: bundle core or publish it.
3. Finalize public exports, `files`, dependency/peer ranges, license and
   `publishConfig: { "access": "public" }` on each _approved_ public package.
4. Execute `pnpm install` and commit the real `pnpm-lock.yaml`.
5. Run `pnpm doctor` and lint/typecheck/tests and all package/app builds. Require native
   Windows, Linux and macOS GitHub Actions checks to pass before release.
6. For every publishable package, use `pnpm pack --pack-destination ...`, inspect
   the archive and install it into isolated Vite and Next applications.
7. Verify CSS/theme, Capsize typography, React peer resolution, SSR, tree shaking,
   install size and correct type declarations from packed artifacts.
8. Review npm provenance/trusted publishing requirements and GitHub Actions OIDC
   configuration. Avoid persistent npm tokens when supported.
9. Generate and review Changesets, package changelogs and semver versions.
10. Obtain explicit maintainer approval before `npm publish`, `pnpm publish`,
    `changeset publish`, release tags or remote pushes.

## Versioning

- First meaningful public version target: **0.1.0**.
- Keep breaking API changes explicit; pre-1.0 does not excuse surprises.
- Use Changesets only for user-facing changes after packages are implemented.

## Out of scope for foundation

No working `publish.yml`, automatic version bump PRs or npm release scripts
are included; they must be added and reviewed in slice 007.

See: https://docs.npmjs.com/trusted-publishers
