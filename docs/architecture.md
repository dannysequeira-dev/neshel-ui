# Architecture and dependency rules

## Dependency direction

```text
apps/storybook              apps/playground-vite          apps/playground-next (planned)
       |                              |                           |
       +---------- consumer packages / CSS -----------------------+
                                      |
                    +-----------------+-----------------+
                    |                 |                 |
               components          layout          typography
                    |                 |                 |
            config + core           core              core
                    ^
                    |
                   cli   (build-time only; config generation)

config (independently usable CSS/tokens)
core   (private implementation details; never an external dependency)
```

The diagram expresses the **planned** API and dependency direction; actual
imports and feature code are not implemented yet. CLI uses config and should not
import any React component package. React packages declare React 19 as a peer.
Since milestone 001.2, workspace dependencies are declared only when a source file
imports them, so today no package has a runtime dependency on another (research R9);
the arrows above become real dependencies in the slices that introduce those imports.
The workspace apps use Vite 8 with `@vitejs/plugin-react` 5 since milestone 001.4
([ADR 0005](decisions/0005-vite-8.md)); published packages do not depend on Vite.

## Publication boundary

- Each public package exposes only intentional `exports` plus `./styles.css`.
- `files` allowlists protect tarballs from leaking tests, source maps with secrets,
  private documentation and internal scripts. JS and declaration source maps are
  published together with the `src` files they reference (ADR 0004, D5).
- `sideEffects: ["**/*.css"]` preserves stylesheet imports under tree-shaking.
- Generate `.d.ts` and ESM JS. Do not ship TypeScript source as the only entrypoint.
- CSS must work without consumers scanning our internal source in `node_modules`.
  If implementation includes Tailwind utility classes, precompile appropriate styles
  or document an explicit `@source` tradeoff with an integration test.
- `pnpm pack` rewrites `workspace:*` to exact versions and `catalog:` to ranges (research
  R7); `pnpm check:pack` validates the packed manifests and contents of every intended
  public package. External Vite consumer builds follow in milestone 001.3.
- `@neshel-ui/core` is private, so **no public npm package may depend on it at
  publishing time** unless its reusable runtime content is inlined/bundled or the
  shared package is intentionally made public. Resolved by
  [ADR 0002](decisions/0002-internal-core-package.md) and enforced by `check:pack`.

## Theme evaluation model

```text
neshel.config.ts (optional) --[CLI, build time]--> neshel.generated.css   (@layer neshel.config)
                                                           |
@neshel-ui/config/tokens.css | tailwind.css (defaults) ----+   (@layer neshel.defaults)
                                                           |
                                    consumer global CSS imports
                                                           |
                         CSS custom properties + @theme inline
                                                           |
                         utility classes + component styles
```

The default path requires **no CLI**. The advanced config path generates a
static stylesheet. Never run user TS config in the browser, or rely on a global
React provider for primitive CSS theme switching.

Planned in feature 002 (ADR 0006/0007, Accepted, not implemented): `styles.css` stays as a 0.x
alias of `tailwind.css`; the CLI generator is private to `@neshel-ui/cli`, which peer-depends
on `@neshel-ui/config` for the token contract (`colorRoles`, `contrastPairs`, `defaults`).

## Theme selector / layering

Implemented (Phase 001): `:root` light, overridden by `[data-neshel-theme="light|dark"]`.

Planned (feature 002, [contracts/css.md](../specs/002-config-and-tokens/contracts/css.md)):
layers `neshel.defaults < neshel.config` under one `neshel` layer; complete theme blocks;
`data-neshel-theme` = absent/`light` → light, `dark`, `system` (OS preference), named themes;
canonical import order Tailwind → Neshel stylesheet → generated file → app CSS. Import-order
independence is claimed only for orders verified by the browser check.
Applications load their fonts; no remote fetch required by the library.

## Cross-platform development and delivery

- Windows 11 / PowerShell is the maintainer environment, but **Linux and macOS are first-class**.
- Every root/package npm script must run in the native default shell of each platform.
- File operations use Node (path-safe) helpers; no absolute drives or POSIX shell assumptions.
- GitHub Actions runs the same gates on Node 26 for Linux, Windows and macOS, plus Node 22
  and 24 on Linux (5 jobs, research R17).
- Spec Kit uses its official `--script py` mode through `pnpm spec-kit:init`.
- See [ADR 0003](decisions/0003-cross-platform-ci.md).

## Cross-package quality gates

- No circular dependencies; no runtime imports from apps into packages.
- `layout` and `typography` cannot import `components`.
- All package exports and CSS paths resolve after build.
- SSR/render/hydration tests for React public components when implemented.
- Packed tarball tests in a clean consumer (not only `workspace:*`).

## Phase 001 decisions (2026-11-07)

- `core` stays private; unused dependencies on it are removed. Rules for future
  shared utilities: [ADR 0002](decisions/0002-internal-core-package.md).
- Library packages: ESM only, NodeNext resolution with explicit `.js` extensions,
  published source maps with their sources, React 19 peer range, validation from
  packed artifacts with `check:pack`, `publint` and `@arethetypeswrong/cli`:
  [ADR 0004](decisions/0004-package-distribution.md). Apps may keep `Bundler`.
- Node 26 primary for development; CI Node 26 on three OSes plus Node 22/24 on Linux:
  [ADR 0003](decisions/0003-cross-platform-ci.md) amendment.
- Vite 8 adopted after the 001.4 spike ([ADR 0005](decisions/0005-vite-8.md)).
- Standard CSS tokens and the Tailwind `@theme` integration become separate
  exports in feature 002 ([ADR 0006](decisions/0006-token-stylesheets-and-theme-cascade.md)).
- Configuration API boundary, Color.js and jiti in the CLI
  ([ADR 0007](decisions/0007-config-engine-and-cli-loading.md)).

Status of each decision (implemented / locally verified / CI-verified) is tracked in
`specs/001-foundation/evidence.md`.

## Open decisions

- Exact semantic token vocabulary and accessibility policy — decided in feature 002
  ([spec](../specs/002-config-and-tokens/spec.md), ADRs 0006/0007 Accepted); implementation pending.
- Component-level CSS distribution strategy and choice of class variance tooling.
- Stable polymorphism / `asChild` / refs contract for layouts and typography.

See [`docs/decisions/`](decisions/0001-architecture.md).
