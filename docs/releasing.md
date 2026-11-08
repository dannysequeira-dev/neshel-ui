# Release safety and npm publishing

**There is no functional v0.1.0 and no publication automation.**
All packages are deliberately `private: true`; `@neshel-ui` scope ownership
and package name availability are unverified.

## Before lifting publishing guards

1. Verify scope ownership and name availability on npm; check brand conflicts.
2. Keep ADR 0002 satisfied: no public package may depend on the internal `core`
   package (`pnpm check:pack` enforces this; resolved for the current code in 001.2).
3. Finalize public exports, `files`, dependency/peer ranges and license. Intended public
   packages already declare `publishConfig: { "access": "public" }` (001.2); removing
   `private: true` is a separate, explicitly approved step.
4. Keep `pnpm-lock.yaml` committed; CI installs with `--frozen-lockfile`.
5. Run `pnpm doctor` and lint/typecheck/tests and all package/app builds. Require native
   Windows, Linux and macOS GitHub Actions checks to pass before release.
6. Run `pnpm check:pack` (packs and validates every intended public package: manifest,
   targets, declarations, source maps, publint, attw, external import/type checks), then
   install the tarballs into isolated Vite and Next applications (001.3, feature 006).
7. Verify CSS/theme, Capsize typography, React peer resolution, SSR, tree shaking,
   install size and correct type declarations from packed artifacts.
8. Review npm provenance/trusted publishing requirements and GitHub Actions OIDC
   configuration. Avoid persistent npm tokens when supported.
9. Generate and review Changesets, package changelogs and semver versions. Note:
   `.changeset/config.json` sets `privatePackages.version: false`, so Changesets ignores the
   packages while they are `private: true`; the release slice must decide the order of
   lifting the guard and versioning (found in the 001.5 audit).
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
