# Package contracts (planned public API)

## `@neshel-ui/config`

Default import: `@neshel-ui/config/styles.css` (explicit import). Intended JS API:
`defineConfig`, configuration typing, token validation and a future generated CSS
contract. Do not promise that installing the package injects CSS automatically.

- Semantic tokens: primary/foreground, background/foreground, surface/foreground,
  border, muted, destructive, focus, etc. The final list requires specification.
- Light/dark and user-defined named modes (defer extra modes until needed).
- Document contrast pairs and variable cascade.
- No heavy React or Node runtime dependency for CSS-only consumers.

## `@neshel-ui/layout`

Intended exports: `Box`, `Stack`, `Inline`, `Grid`, `Center`, `Container`.
API shape proposal:

```tsx
<Stack gap="4" align="start">
  <Grid columns={{ base: 1, md: 3 }} gap="6">
    <Box>Item</Box>
  </Grid>
</Stack>;
```

Responsive props must translate to CSS variables/static variants, not runtime
Tailwind class interpolation. Clarify semantics and what unit names mean before coding.

## `@neshel-ui/typography`

Intended exports: `Heading`, `Text`, `Paragraph`, `Caption`.

```tsx
<Heading as="h2" size="2xl">Meaningful heading</Heading>
<Text tone="muted" size="sm">Supporting description</Text>
```

The `as` tag controls HTML semantics, not visual scale. Capsize uses font metrics
at generation time and must not embed proprietary font files or run layout probes.

## `@neshel-ui/components`

Initial components: `Button`, `Card`, `Badge`, `Input`, `Separator`, `Skeleton`.
They must support accessible markup, focus states, appropriate native props and
stable refs. Interactive components must have deterministic React/SSR behavior.
No commitment to a proprietary copy/paste registry in v0.1.

## `@neshel-ui/cli`

Planned commands:

```text
neshel init       (optional scaffolding; after MVP if needed)
neshel generate   (reads neshel.config.ts and writes CSS)
neshel validate   (validates settings, with actionable diagnostics)
```

The CLI is a **deliberate placeholder**. Its importable entry (`.`) is empty and
side-effect free; the `neshel` executable (`dist/bin.js`) prints a "not implemented"
message and exits with code 1. File loading, runtime evaluation safety, deterministic
output, export shape and naming must be specified and tested before making these
commands available. Requires Node `>=22.13` (`engines`).

## Distribution contract (implemented in milestone 001.2)

Status: **implemented and CI-verified** with `pnpm check:pack` (run 42434061443: Node 22 on
Linux, Windows and macOS; Node 24 on Linux; locally on Windows with Node 26). **No package is
published**; all six keep `private: true`, and the `@neshel-ui` scope remains unverified on npm.

| Package                 | Intended public | Runtime deps | Peer deps       | Exports                              |
| ----------------------- | --------------- | ------------ | --------------- | ------------------------------------ |
| `@neshel-ui/config`     | Yes             | none         | none            | `.` (types + import), `./styles.css` |
| `@neshel-ui/layout`     | Yes             | none         | `react ^19.0.0` | `.` (types + import), `./styles.css` |
| `@neshel-ui/typography` | Yes             | none         | `react ^19.0.0` | `.` (types + import), `./styles.css` |
| `@neshel-ui/components` | Yes             | none         | `react ^19.0.0` | `.` (types + import), `./styles.css` |
| `@neshel-ui/cli`        | Yes             | none         | none            | `.` (types + import); bin `neshel`   |
| `@neshel-ui/core`       | No (internal)   | none         | none            | `.` (never packed for publication)   |

- **Intended public** = `"publishConfig": { "access": "public" }`. It is metadata only while
  `private: true` blocks publication.
- **ESM only**: `types` is always the first export condition, then `import`. No CommonJS build.
- **NodeNext**: libraries compile through `tsconfig.library.json`; relative imports need
  explicit `.js` extensions. Apps keep `Bundler` resolution.
- **Tarball contents**: `dist/` (JS, `.d.ts`, JS and declaration maps, CSS), `src/**/*.ts(x)`
  (so maps resolve; tests and stories excluded), `README.md`, `LICENSE`, `package.json`.
- **Side effects**: packages exporting CSS declare `"sideEffects": ["**/*.css"]`; `cli` and
  `core` declare `false`.
- **Dependencies are declared when first imported** (research R9). A workspace runtime
  dependency on an internal package fails `check:pack` (ADR 0002).
- **Builds are clean**: `pnpm build:packages` deletes `packages/*/dist` first, so removed
  sources never leave stale files in a tarball.

How pnpm rewrites manifests when packing (observed, research R7): `workspace:*` becomes the
exact version, `catalog:` becomes the catalog range, `private` is preserved.

## Consuming the packages (milestone 001.3)

Nothing is published yet. Consumers are verified with the packed tarball, exactly as the
external smoke test (`pnpm check:consumer`) does:

```text
pnpm build:packages
cd packages/config && pnpm pack --pack-destination <dir>
# in the consumer app:
pnpm add file:./vendor/neshel-ui-config-0.0.0.tgz
```

Import the stylesheet after Tailwind in the app's global CSS. No `@source` entry and no
PostCSS configuration are required for `@neshel-ui/config`:

```css
@import "tailwindcss";
@import "@neshel-ui/config/styles.css";
```

This yields the `--neshel-*` custom properties (light on `:root`, overrides on
`[data-neshel-theme="light|dark"]`) and Tailwind utilities such as `bg-neshel-primary`.
The token names are the Phase 001 baseline; feature 002 defines the final contract and
separates the plain CSS tokens from the Tailwind integration.

### Tested versus intended compatibility

| Aspect                      | Tested (automated)                                                                                         | Intended, not yet tested                            |
| --------------------------- | ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| Package under consumer test | `@neshel-ui/config` (CSS + empty JS entry)                                                                 | layout, typography, components, cli in real apps    |
| Bundler / framework         | Vite 8.3.6 + `@vitejs/plugin-react` 5.2.0 (Vite 7.3.7 CI-verified in run 42435072683, no longer re-tested) | Vite 8 (001.4 spike), Next.js (feature 006)         |
| Tailwind CSS                | 4.3.5 via `@tailwindcss/vite`                                                                              | other Tailwind 4.x minors; PostCSS plugin setup     |
| React                       | 19.3.1                                                                                                     | other React 19.x; React 18 is not supported         |
| TypeScript                  | 5.9.3, `moduleResolution` Bundler (consumer) and NodeNext/Bundler (`check:pack`)                           | other 5.x versions                                  |
| Package manager             | pnpm 12.16.1                                                                                               | npm, Yarn, Bun                                      |
| Node.js (build tooling)     | 26 locally; 22 and 24 in CI (run 42435072683)                                                              | Node 26 in CI (matrix added in 001.4, pending push) |
| OS                          | CI on Linux, Windows and macOS for `check:pack` and `check:consumer` (run 42435072683)                     | —                                                   |

## Build conventions

- React `peerDependencies` and ESM declarations.
- Browser-safe code in visual packages; Node-specific code only in CLI.
- `./styles.css` export published per visual package.
- Tree-shakeable, no hidden global resets or network fonts.
- `pnpm check:pack` validates real tarballs (001.2); `pnpm check:consumer` builds an external
  Vite + Tailwind app from the `config` tarball (001.3); Next.js consumers follow in feature 006.

**All component, layout, typography and configuration APIs above are proposed, not
implemented.**
