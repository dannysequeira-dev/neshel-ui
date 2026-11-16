# Contract — `@neshel-ui/animations` package (008.0)

**Status: implemented and verified locally** (unit + contract tests, `check:pack --with animations`).
Private and unpublished; this contract may change before the first publication. **Superseded in Phase 009**: Tilt3D moved to
`./hover` and the root became the React engine bindings ([009 react-bindings](../../009-motion-engine/contracts/react-bindings.md)).

## Manifest

| Field              | Value                                                                            |
| ------------------ | -------------------------------------------------------------------------------- |
| `name`             | `@neshel-ui/animations`                                                          |
| `version`          | `0.0.0` (not in the Changesets fixed group; `privatePackages.version: false`)    |
| `private`          | `true` — the publishing guard (constitution VIII); no `publishConfig`            |
| `type`             | `module` (ESM only)                                                              |
| `sideEffects`      | `["**/*.css"]`                                                                   |
| `peerDependencies` | `react ^19.0.0`                                                                  |
| `dependencies`     | `@radix-ui/react-slot` (catalog range, `asChild`)                                |
| `files`            | `dist`, `src/**/*.ts(x)` (maps resolve; tests/stories excluded), README, LICENSE |

## Exports

| Subpath        | Target                      | Contents                                                              |
| -------------- | --------------------------- | --------------------------------------------------------------------- |
| `.`            | `dist/index.{d.ts,js}`      | `Tilt3D`, `useTilt3D`, `createTilt3D`, `NeshelAnimationsError`, types |
| `./core`       | `dist/core/index.{d.ts,js}` | Framework-free engine ([core-engine.md](core-engine.md))              |
| `./styles.css` | `dist/styles.css`           | Opt-in `.neshel-tilt` rule in `@layer components.neshel`              |

Only implemented capabilities are exported (brief §6). Proposed future subpaths are in
[entry-points.md](entry-points.md) and are not part of this contract.

## Dependency graph rules

- `./core` imports only its own relative modules (no React, no Slot).
- The root entry imports only `react`, `react/jsx-runtime`, `@radix-ui/react-slot`.
- No import of `@neshel-ui/core` (private, ADR 0002) or `@neshel-ui/components`; the package does
  not depend on `config` in 008.0 (motion defaults stay inside Animations, D5; see research R12).
- React modules start with `"use client"`; nothing reads browser globals at import time.

## Enforcement

| Rule                                                      | Where                                                                                      |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Private, exports, deps, peers                             | `packages/animations/test/contract.test.mjs`, `checkAnimationsContract`                    |
| Core purity, root import allow-list                       | same, on `dist/` and on the packed tarball                                                 |
| Workspace membership and guard                            | `tests/workspace.test.mjs`, `pnpm check:workspace`                                         |
| Tarball (publint, attw, NodeNext/Bundler, runtime import) | `pnpm check:pack --with animations` (part of `pnpm check`)                                 |
| Not released by mistake                                   | `scripts/release-guards.mjs` and `publish-tarballs.mjs` list the five public packages only |

## Stylesheet

```css
@import "@neshel-ui/animations/styles.css"; /* optional: preserve-3d for depth children */
```

No reset, no element or `:root` selectors, no Tailwind directives; import order follows the
canonical order of ADR 0008 (after the config stylesheet, with the other package stylesheets).
