# Package contracts

## `@neshel-ui/config`

**Implemented in feature 002** (published as 0.1.0; [contracts](../specs/002-config-and-tokens/contracts/),
[theme guide](theming.md)). Installing the package never injects CSS; consumers import a
stylesheet explicitly.

- Stylesheets `./tokens.css` (plain CSS), `./tailwind.css` (tokens + `@theme inline`) and
  `./styles.css` (0.x alias of `tailwind.css`); import one of `tokens.css` / `tailwind.css`.
- JS entry: `defineConfig`, types and frozen contract data `colorRoles`, `contrastPairs`,
  `defaults`. No validation code, no runtime dependencies, no other subpath.
- Feature 004: `breakpoints` / `types` / `typography.fallbacks` schema, Capsize-format
  `FontMetrics`, `defaults.breakpoints` and `defaults.typography.metrics` (Inter), font metric
  tokens in the stylesheets, and the augmentable `BreakpointRegistry` / `BreakpointName` types
  shared by layout and typography (ADR 0010).
- 21 semantic colour roles with documented contrast pairs; light, dark, `system` and named
  themes extending light or dark (ADR 0006).

## `@neshel-ui/layout`

**Implemented in feature 003**, custom breakpoints in feature 004 (published as 0.1.0;
[contracts](../specs/003-layout-system/contracts/), [layout guide](layout.md), ADR 0008/0009/0010).
Peers `react ^19.0.0` and `@neshel-ui/config` (types only, feature 004); runtime dependencies
`@radix-ui/react-slot` and `tailwind-variants` (lite entry, no `tailwind-merge`).

- Exports: `Box`, `Flex`, `Stack`, `Inline`, `Grid`, `Center`, `Container` and their prop types;
  `./styles.css` (precompiled, `@layer components.neshel`, no Tailwind directives);
  `./style-manifest.json` (feature 004; read by `neshel generate`, not for direct use).
- Spacing `space` (`gap`) / `spaceX` (`column-gap`) / `spaceY` (`row-gap`); `space` excludes the
  other two in types and at runtime. Alignment `align`, `alignX`, `alignY`, `justify` with
  precedence `justify` > axis prop > `align`.
- Responsive objects keyed by `base` and the application's breakpoint names (defaults
  `sm md lg xl 2xl`, or configured names, feature 004) compile to one static class per key; no
  inline styles; the cascade and alignment precedence are resolved by CSS.
- `as` (closed element list), `asChild` (Radix Slot), React 19 refs; separators on Stack/Inline.
- Invalid usage throws `NeshelLayoutError` on server and client (unknown well-formed breakpoint
  keys warn in the browser instead, ADR 0010).

```tsx
<Stack space="4" alignX="start">
  <Grid columns={{ base: 1, md: 3 }} space="6">
    <Box>Item</Box>
  </Grid>
</Stack>;
```

The earlier `gap` proposal was replaced by the owner's `space` / `spaceX` / `spaceY` decision
(feature 003 brief §4).

## `@neshel-ui/typography`

**Implemented in feature 004** (published as 0.1.0; [contracts](../specs/004-typography-breakpoints/contracts/),
[typography guide](typography.md), ADR 0011). Peers `react ^19.0.0` and `@neshel-ui/config`;
runtime dependencies `@radix-ui/react-slot` and `tailwind-variants` (lite).

- Exports: `Heading`, `Text`, `Paragraph`, `Caption`, `NeshelTypographyError` and their prop
  types; `./styles.css`; `./style-manifest.json` (CLI contract).
- Semantic element via a closed `as` list or `asChild`; `size`, `weight`, `align`, `leading`
  responsive; `tone`, `family`, `tracking`, `measure`, `wrap`, `truncate`, `trim` static.
- Capsize trimming from per-role metric tokens; cap-height-normalised sizes; no font files.

```tsx
<Heading as="h2" size="2xl">Meaningful heading</Heading>
<Text tone="muted" size="sm">Supporting description</Text>
```

## `@neshel-ui/components`

**Implemented in feature 005** (published as 0.1.0; [contracts](../specs/005-components-navigation-shell/contracts/),
[components guide](components.md), ADR 0012/0013/0014). Peers `react ^19.0.0`, `react-dom ^19.0.0`
and `@neshel-ui/config` (types only); runtime dependencies `@base-ui/react` (select/combobox subpaths),
six Radix primitives (dialog, alert-dialog, popover, dropdown-menu, navigation-menu, tooltip),
`@radix-ui/react-slot` and `tailwind-variants` (lite).

- Exports: Button, Card family, Badge, Input, Label, Separator, Skeleton, VisuallyHidden; Dialog,
  AlertDialog, Sheet, Popover, Tooltip families; Select, MultiSelect, Combobox; Navbar,
  NavigationMenu, DropdownMenu, MobileMenu families; AppShell, Sidebar families, SidebarTrigger,
  `useAppShell`; `NeshelComponentsError`; prop types. Flat names only (no dot notation).
- `./styles.css` (precompiled, `@layer components.neshel`, keyframes, reduced motion) and
  `./style-manifest.json` (schema 2, read by `neshel generate`).
- Responsive: Button `size`, AppShell `breakpoint`, NavbarNav `hideBelow`, MobileMenu
  `breakpoint` — configured breakpoint names, CSS-decided.
- Interactive modules carry `"use client"`; presentational components are server-safe.

```tsx
<Button size={{ base: "sm", tablet: "md" }}>Save</Button>
<Select id="country" name="country" options={countries} />
```

## `@neshel-ui/cli`

**Implemented in feature 002** (published as 0.1.0; [contracts/cli.md](../specs/002-config-and-tokens/contracts/cli.md),
ADR 0007), Node `>=22.13`: `neshel validate` and `neshel generate` (`--config`, `--out`, `--check`, `--strict`),
exit codes 0–5, TS configs loaded with `jiti`, colour parsing/contrast with `colorjs.io`,
peer dependency on `@neshel-ui/config`. The importable entry (`.`) stays empty and side-effect free; `init` and a programmatic API are
out of scope. Configuration files are executable, trusted project code. Feature 004: `--types`,
breakpoint and font-metric validation, component stylesheets from installed packages' style
manifests, declarations, Tailwind `@theme` breakpoints, Capsize fallback fonts; runtime dependency
`@capsizecss/core`.

## Distribution contract (implemented in milestone 001.2)

Status: **implemented and CI-verified** with `pnpm check:pack` and `pnpm check:consumer`
(latest: run 42436591929 — Node 26 on Linux, Windows and macOS; Node 22 and 24 on Linux). The five intended
public packages are **published on npm as 0.1.0** (feature 007, [evidence](../specs/007-first-publication/evidence.md));
`@neshel-ui/core` stays private and unpublished.

| Package                 | Intended public | Runtime deps                                                            | Peer deps                                         | Exports                                                                        |
| ----------------------- | --------------- | ----------------------------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------ |
| `@neshel-ui/config`     | Yes             | none                                                                    | none                                              | `.` (types + import), `./tokens.css`, `./tailwind.css`, `./styles.css` (alias) |
| `@neshel-ui/layout`     | Yes             | `@radix-ui/react-slot`, `tailwind-variants`                             | `react ^19.0.0`, `@neshel-ui/config`              | `.` (types + import), `./styles.css`, `./style-manifest.json`                  |
| `@neshel-ui/typography` | Yes             | `@radix-ui/react-slot`, `tailwind-variants`                             | `react ^19.0.0`, `@neshel-ui/config`              | `.` (types + import), `./styles.css`, `./style-manifest.json`                  |
| `@neshel-ui/components` | Yes             | Radix ×6, `@radix-ui/react-slot`, `@base-ui/react`, `tailwind-variants` | `react`, `react-dom ^19.0.0`, `@neshel-ui/config` | `.` (types + import), `./styles.css`, `./style-manifest.json`                  |
| `@neshel-ui/cli`        | Yes             | `jiti`, `colorjs.io`, `@capsizecss/core`                                | `@neshel-ui/config` (`workspace:^`)               | `.` (types + import); bin `neshel`                                             |
| `@neshel-ui/core`       | No (internal)   | none                                                                    | none                                              | `.` (never packed for publication)                                             |

- **Intended public** = `"publishConfig": { "access": "public" }`. Only these five may omit
  `private: true`; every other workspace package, core included, keeps it (`pnpm check:workspace`).
- **ESM only**: `types` is always the first export condition, then `import`. No CommonJS build.
- **NodeNext**: libraries compile through `tsconfig.library.json`; relative imports need
  explicit `.js` extensions. Apps keep `Bundler` resolution.
- **Tarball contents**: `dist/` (JS, `.d.ts`, JS and declaration maps, CSS), `src/**/*.ts(x)`
  (so maps resolve; tests and stories excluded), `README.md`, `CHANGELOG.md`, `LICENSE`, `package.json`.
- **Side effects**: packages exporting CSS declare `"sideEffects": ["**/*.css"]`; `cli` and
  `core` declare `false`.
- **Dependencies are declared when first imported** (research R9). A workspace runtime
  dependency on an internal package fails `check:pack` (ADR 0002). Public workspace peers are
  allowed only as caret ranges (`workspace:^`); `config` must have no runtime dependencies and
  no package may declare install lifecycle scripts (feature 002).
- **Builds are clean**: `pnpm build:packages` deletes `packages/*/dist` first, so removed
  sources never leave stale files in a tarball.

How pnpm rewrites manifests when packing (observed, research R7): `workspace:*` becomes the
exact version, `catalog:` becomes the catalog range, `private` is preserved.

## Consuming the packages (milestone 001.3)

Consumers install the published packages from npm. Unreleased changes are verified with the
packed tarball, exactly as the external smoke test (`pnpm check:consumer`) does:

```text
pnpm build:packages
cd packages/config && pnpm pack --pack-destination <dir>
# in the consumer app:
pnpm add file:./vendor/neshel-ui-config-0.1.0.tgz
```

Import one stylesheet in the app's global CSS. No `@source` entry and no PostCSS configuration
are required:

```css
@import "tailwindcss";
@import "@neshel-ui/config/tailwind.css"; /* or, without Tailwind: @neshel-ui/config/tokens.css */
```

For the configured mode, also install the packed `@neshel-ui/cli`, add `neshel.config.ts`,
run `neshel generate` and import the generated file after the Neshel stylesheet
([theme guide](theming.md)). `pnpm check:consumer` runs all three set-ups from tarballs.

### Tested versus intended compatibility

| Aspect                         | Tested (automated)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Intended, not yet tested                        |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------- |
| Package under consumer test    | `@neshel-ui/config` (Tailwind, plain CSS, `defineConfig` bundle), `@neshel-ui/cli` (`neshel generate` via the installed bin) `@neshel-ui/layout` (Tailwind and plain apps: types, build, Node SSR from the tarball, browser hydration, computed styles; feature 003) and `@neshel-ui/typography` plus custom breakpoints (extend + Tailwind, replace + plain CSS, Bundler and NodeNext declarations; feature 004); `@neshel-ui/components` (Tailwind, plain, named theme + extend, replace; SSR prerender, hydration, real-input interaction and axe in Chrome, tree-shaking; feature 005) | — (Next.js verified in feature 006)             |
| Bundler / framework            | Vite 8.3.6 + `@vitejs/plugin-react` 5.2.0 (Vite 7.3.7 was CI-verified in run 42435072683, no longer re-tested)                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | `@vitejs/plugin-react` 6                        |
| Tailwind CSS                   | 4.3.5 via `@tailwindcss/vite`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | other Tailwind 4.x minors; PostCSS plugin setup |
| React                          | 19.3.1                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | other React 19.x; React 18 is not supported     |
| TypeScript                     | 5.9.3, `moduleResolution` Bundler (consumer) and NodeNext/Bundler (`check:pack`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | other 5.x versions                              |
| Package manager                | pnpm 12.16.1                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | npm, Yarn, Bun                                  |
| Node.js (build tooling)        | 26 on Linux, Windows and macOS; 22 and 24 on Linux (run 42436591929)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | —                                               |
| OS                             | Linux, Windows and macOS for `check:pack`, `check:consumer` and `check:browser` (feature 002 CI runs, see evidence)                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | —                                               |
| Browser (cascade, interaction) | Chrome on GitHub-hosted Linux, Windows and macOS runners (deep suite); Chromium, Firefox and WebKit (Playwright 1.65) smoke flows on Linux and macOS (feature 006)                                                                                                                                                                                                                                                                                                                                                                                                                         | Safari (the browser)                            |

## Build conventions

- React `peerDependencies` and ESM declarations.
- Browser-safe code in visual packages; Node-specific code only in CLI.
- `./styles.css` export published per visual package (`config` additionally ships `tokens.css`
  and `tailwind.css`; its `styles.css` is a 0.x alias).
- Tree-shakeable, no hidden global resets or network fonts.
- `pnpm check:pack` validates real tarballs (001.2); `pnpm check:consumer` builds an external
  Vite + Tailwind app from the `config` tarball (001.3); the isolated Next.js App Router consumer is `pnpm check:next` (feature 006).

The `components` contract is implemented and verified (feature 005). The `config` and `cli`
contracts are implemented and verified (feature 002, extended in 004); the `typography` contract
and custom breakpoints are implemented and verified (feature 004); the `layout` contract is implemented and
verified (feature 003).
