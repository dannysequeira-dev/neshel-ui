# Architecture and dependency rules

## Dependency direction

```text
apps/storybook   apps/docs   apps/playground-vite   check:next (isolated Next.js)
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

animations (feature 008, private, experimental)
   ./hover (Tilt3D) -->  .  React bindings  -->  ./core framework-free engine (no React)
   runtime: react (peer), @radix-ui/react-slot; imports no other Neshel package
```

The diagram expresses the API and dependency direction. Since feature 002, `cli` imports
`config` at runtime (peer dependency); the React packages are not implemented yet. CLI uses config and should not
import any React component package. React packages declare React 19 as a peer.
Since milestone 001.2, workspace dependencies are declared only when a source file
imports them (research R9). The only inter-package dependency today is `cli` → `config`
(peer, feature 002); the other arrows become real in the slices that introduce those imports.
`layout` (feature 003) and `typography` (feature 004) consume the `config` tokens through CSS custom
properties and depend at runtime on `@radix-ui/react-slot` and `tailwind-variants` (ADR
0008/0009/0011). Since feature 004 both declare `@neshel-ui/config` as a peer for one type-only
import (`BreakpointName`, the augmentable breakpoint registry, ADR 0010); neither imports the other.
The CLI reads their `style-manifest.json` (data) to generate component CSS for custom breakpoints;
it never imports React packages. Since feature 005 `components` follows the same pattern (type-only
`@neshel-ui/config` peer, schema-2 manifest) and depends at runtime only on Radix, Base UI,
`@radix-ui/react-slot` and `tailwind-variants`.
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

Implemented in feature 002 (ADR 0006/0007): `styles.css` stays as a 0.x alias of
`tailwind.css`; the CLI generator is private to `@neshel-ui/cli`, which peer-depends
on `@neshel-ui/config` for the token contract (`colorRoles`, `contrastPairs`, `defaults`).

## Theme selector / layering

Implemented and browser-verified (feature 002, [contracts/css.md](../specs/002-config-and-tokens/contracts/css.md)):
layers `neshel.defaults < neshel.config` under one `neshel` layer; complete theme blocks;
`data-neshel-theme` = absent/`light` → light, `dark`, `system` (OS preference), named themes;
canonical import order Tailwind → Neshel stylesheet → generated file → app CSS. Verified by
`pnpm check:browser` on three OSes for the canonical order, "generated before the Neshel
stylesheet" and "generated file alone"; other orders are not claimed.
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

## Feature 003 decisions (2026-11-08)

- Component-level CSS distribution: Neshel-namespaced classes generated from TypeScript tables
  into a precompiled stylesheet in `@layer components.neshel`; `tailwind-variants/lite` composes
  them ([ADR 0008](decisions/0008-layout-styling-and-css-distribution.md)). Canonical import
  order: Tailwind → config stylesheet → generated config CSS → package stylesheets → app CSS.
- Polymorphism: closed `as` list, `asChild` via Radix Slot, React 19 ref-as-prop, runtime prop
  validation ([ADR 0009](decisions/0009-layout-composition-aschild-separators.md)); typography
  may adopt it in feature 004.

## Feature 004 decisions (2026-11-08)

- Custom breakpoints: order-free runtime (one class per written key; CSS source order and custom
  properties resolve cascade and precedence), style manifests rendered by one CLI renderer into the
  package stylesheets and the generated stylesheet, type registry augmentation, optional Tailwind
  `@theme` sync ([ADR 0010](decisions/0010-custom-breakpoints.md)). With configured breakpoints the
  generated stylesheet is imported after the package stylesheets.
- Typography reuses the layout pipeline; Capsize trimming through per-font metric tokens and the
  active leading; cap-height-normalised sizes; Capsize fallback fonts
  ([ADR 0011](decisions/0011-typography-capsize.md)).

## Feature 005 decisions (2026-11-08)

- Headless engines: Radix for dialogs, sheets, popovers, menus, navigation menu and tooltips;
  Base UI (select/combobox subpaths only) for Select, MultiSelect and Combobox
  ([ADR 0012](decisions/0012-headless-primitives.md)).
- Components reuse the style-table → manifest → renderer pipeline; manifest schema 2 adds keyframes
  and media-wrapped rules; four status colour roles join the token contract
  ([ADR 0013](decisions/0013-components-styling-and-tokens.md)).
- The shell's desktop/mobile mode is decided by CSS at a configurable breakpoint and read after
  hydration; sidebar content renders once; portals copy the trigger's theme
  ([ADR 0014](decisions/0014-app-shell-responsive-navigation-and-portals.md)).
- `components` depends on no other Neshel runtime package (`config` is a type-only peer);
  `layout` and `typography` still never import `components`.

## Feature 008.0 decisions (2026-11-15, proposed)

- `@neshel-ui/animations` is a new, **private** package (0.0.0) outside the fixed release group; its
  tarball is validated with `pnpm check:pack --with animations`
  ([ADR 0018](decisions/0018-animation-system-architecture.md)).
- Layers: React API → effect controllers/presets → core engine (`./core`: frame scheduler with
  read/update/write phases, springs, transform composer, reduced-motion policy) → drivers (CSS →
  WAAPI → JS → optional GPU) → composition. The engine lives in the package, not in the private core.
- Composition: CSS effects own `translate`/`rotate`/`scale`; JS effects add layers to one transform
  composer per element ([ADR 0019](decisions/0019-motion-composition-and-property-ownership.md)).
- No motion-engine dependency in 008.0; per-capability adoption only after a benchmark and an ADR;
  GSAP never as a dependency ([ADR 0020](decisions/0020-motion-engine-dependency-policy.md)).
- `animations` imports no other Neshel package; `layout`, `typography` and `components` do not import
  `animations`. Status and evidence: `specs/008-animations/evidence.md`.
- Phase 012 (ADR 0027) adds the `./gestures` and `./layout` family subpaths. Code shared by several
  families lives in internal `src/core` modules that `./core` does not export (pointer session,
  offset-chain boxes, FLIP animator), so families still never import each other; gestures and layout
  use the one scheduler, spring integrator and motion host.

## Phase 009 decisions (2026-11-16, accepted)

- Effects are frozen definitions (`defineEffect`); registries are explicit values; nothing registers at
  import time ([ADR 0021](decisions/0021-effect-definitions-and-explicit-registries.md)).
- One motion host per element owns managed inline styles: capture/restore of values and priorities,
  `transform` composition, `opacity` multiplication, exclusive channels arbitrated by priority with
  suspension/resumption; conflict policy warn/error/silent
  ([ADR 0022](decisions/0022-channel-arbitration-and-conflict-detection.md)).
- Controllers share `MotionControl`; `finished` resolves typed outcomes and rejects only on errors
  ([ADR 0023](decisions/0023-motion-controllers-and-drivers.md)); motion defaults inside Animations
  ([ADR 0024](decisions/0024-motion-defaults-and-config-integration.md)).
- Family subpaths as implemented (D3): `./hover` is the first. Evidence:
  `specs/009-motion-engine/evidence.md`.

## Open decisions

- `text-box-trim` as a progressive enhancement once cross-browser.
- Per-component subpath exports (evaluated in feature 005 research R2; not needed while
  tree-shaking of the single entry is verified).
- Animations: entry points, version line, first publication scope, motion tokens in `config`
  (decisions D1–D9 in `specs/008-animations/plan.md`).

See [`docs/decisions/`](decisions/0001-architecture.md).
