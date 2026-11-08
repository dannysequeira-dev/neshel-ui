# ADR 0002 — Internal `core` package and shared utilities

- Status: Accepted (2026-11-07); implemented in milestone 001.2 (locally verified; CI pending)
- Date: 2026-11-07
- Resolves: the open decision in [ADR 0001](0001-architecture.md)

## Context

`@neshel-ui/core` is `private: true`. `layout`, `typography` and `components` declared
`"@neshel-ui/core": "workspace:*"`, but no source file imports it. On publication,
pnpm would rewrite that to a real version of a package that does not exist on npm,
producing uninstallable public packages.

## Decision

1. Remove every `@neshel-ui/core` dependency that no source file uses.
2. `core` stays private and is not published.
3. Rules for future shared internal utilities:
   - Duplicate trivial helpers locally until a second real consumer exists.
   - A helper may move to `core` only when two or more packages need it and it is
     browser-safe, dependency-free and has no React-provider or global side effects.
   - Before any public package depends on `core` at runtime, a new ADR must choose
     either inlining at build time or publishing `core` as a semver package.
   - Type-only imports from `core` must not leak into published `.d.ts` files.
4. `pnpm check:pack` rejects any packed manifest that references `@neshel-ui/core`
   or another private or unpublished package.
5. No bundler is introduced to solve a problem that does not exist yet.

## Consequences

- Published dependency graphs stay honest and installable.
- `core` is kept as a placeholder; it can be deleted if it stays empty at the release gate.
- A future need for shared runtime code triggers an explicit, reviewed decision.

## Alternatives considered

- Publish `core` now: adds a public semver surface with no content.
- Bundle `core` into each package now: needs a bundler for zero code.

## Verification

- Implemented: no package declares a dependency on `@neshel-ui/core`; `check-workspace`
  rejects `publishConfig.access: "public"` on `core`; `check:pack` rejects any packed runtime
  dependency on an internal workspace package.
- Locally verified (2026-11-07, Windows, Node 26): `pnpm check:pack` passes for the five
  intended public packages; a deliberate `layout -> core` dependency makes it fail with
  `dependencies.@neshel-ui/core: @neshel-ui/core is internal and unpublished`.
- CI: pending push. Evidence: `specs/001-foundation/evidence.md` §001.2. Covers SC-003.
