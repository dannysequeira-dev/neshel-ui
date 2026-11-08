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
import any React component package. React packages declare React as a peer.
The foundation pins Vite 7 (plus React plugin 5) until Vite 8 compatibility
with the Tailwind and Storybook plugin matrix is installation-tested.

## Publication boundary

- Each public package exposes only intentional `exports` plus `./styles.css`.
- `files` allowlists protect tarballs from leaking tests, source maps with secrets,
  private documentation and internal scripts. Source maps are optional; re-evaluate
  before the public release.
- `sideEffects: ["**/*.css"]` preserves stylesheet imports under tree-shaking.
- Generate `.d.ts` and ESM JS. Do not ship TypeScript source as the only entrypoint.
- CSS must work without consumers scanning our internal source in `node_modules`.
  If implementation includes Tailwind utility classes, precompile appropriate styles
  or document an explicit `@source` tradeoff with an integration test.
- On release, `workspace:*` dependencies resolve to real versions in packed packages;
  verify `pnpm pack` archives from external consumers.
- `@neshel-ui/core` is private, so **no public npm package may depend on it at
  publishing time** unless its reusable runtime content is inlined/bundled or the
  shared package is intentionally made public. This is an open release decision
  tracked in [ADR 0001](decisions/0001-architecture.md).

## Theme evaluation model

```text
neshel.config.ts (optional) --[CLI, build time]--> neshel.generated.css
                                                           |
@neshel-ui/config/styles.css (default CSS) -----------------+
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

## Theme selector / layering

Default theme: `:root`, overridden by `[data-neshel-theme="light|dark"]`.
Future CLI must namespace safely and define cascade/precedence for custom tokens.
Applications load their fonts; no remote fetch required by the library.

## Cross-platform development and delivery

- Windows 11 / PowerShell is the maintainer environment, but **Linux and macOS are first-class**.
- Every root/package npm script must run in the native default shell of each platform.
- File operations use Node (path-safe) helpers; no absolute drives or POSIX shell assumptions.
- GitHub Actions runs the same build/test matrix on three OSes and an extra Node 24 Linux lane.
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
- Vite 8: time-boxed spike in Phase 001; Vite 7 stays until gates pass.
- Standard CSS tokens and the Tailwind `@theme` integration become separate
  exports in feature 002.

Status of each decision (implemented / locally verified / CI-verified) is tracked in
`specs/001-foundation/evidence.md`.

## Open decisions

- Exact semantic token vocabulary and accessibility policy.
- Component-level CSS distribution strategy and choice of class variance tooling.
- Stable polymorphism / `asChild` / refs contract for layouts and typography.

See [`docs/decisions/`](decisions/0001-architecture.md).
