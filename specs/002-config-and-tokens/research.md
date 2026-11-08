# Research — Feature 002 (Phase 0)

First pass 2026-11-07 from `b8c6198` (Phase 001 closed); revised the same day after the owner's
002.0 approval (D1–D5, amendments A–F). Nothing here is implemented. Spikes ran outside the
repository (session scratch directory) on Windows 11, Node 26.13.0; they verify facts, not code.

## Brief audit

| Brief item / readiness decision | Outcome                                                                                                                            | Where          |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| Typed `defineConfig`            | Specified                                                                                                                          | R7, config-api |
| Light/dark semantic tokens      | 21 roles + named themes                                                                                                            | R1, R11        |
| CSS-first baseline              | `tokens.css` / `tailwind.css` / alias                                                                                              | R3             |
| Custom config discovery         | cwd only, 4 extensions                                                                                                             | R6, cli        |
| Safe validation                 | No browser evaluation; trusted-code model; no sandbox claim                                                                        | R6, R7         |
| Deterministic generated CSS     | Specified                                                                                                                          | R13, R18       |
| Capsize metrics hooks           | Narrowed to reserved shape; Capsize in 004 (amendment E)                                                                           | R12            |
| Explicit `neshel generate`      | + `validate`, `--check`                                                                                                            | cli            |
| Test categories                 | All mapped; "concurrent applications" = nested/side-by-side theme scopes; two different generated configs on one page out of scope | R14, R17       |
| Readiness decisions 1–9         | R1–R9                                                                                                                              |                |

## R1 — Token vocabulary

- **Decision**: 21 colour roles (9 fill/foreground pairs + `border`, `input`, `focus`), radius
  scale from `base`, spacing unit, three font families, focus width/offset. Phase 001 names kept.
- **Rationale**: covers the owner's list and the needs of 003–005; closed vocabulary keeps one
  contract and static Tailwind utilities.
- **Tradeoffs**: no custom roles in 0.x; additions are additive.
- **Alternatives**: shadcn-style component names; numeric palettes (not semantic).

## R2 — Contrast policy

- **Decision**: WCAG 2.1 ratio; text 4.5:1, focus/input 3:1; built-ins enforced by tests; custom
  themes warn by default, error under `--strict` or `contrast: "error"`; disabled and border exempt.
- **Precedence** (amendment B): `--strict` › config `contrast` › `"warn"`. A flag can only
  tighten; configuration cannot weaken CI's `--strict`.
- **Tradeoffs**: default-warn lets an inaccessible custom theme ship; recommended scripts use
  `--strict`. Large-text 3:1 not modelled (role-based).
- **Alternatives**: errors by default; APCA (not a standard).

## R3 — CSS exports (D2)

- **Decision**: `./tokens.css`, `./tailwind.css`, `./styles.css` (byte-identical alias during 0.x);
  consumers import one of `tokens.css` / `tailwind.css`.
- **Rationale**: preserves the Phase 001 consumer contract (`styles.css` + `*-neshel-*` utilities)
  while naming the split explicitly.

## R4 — Theme selection (D1)

- **Decision**: no attribute ⇒ light; `light`/`dark` force; `system` follows
  `prefers-color-scheme`; named themes via the same attribute; any element can scope.
- **Rationale**: Phase 001 behaviour preserved; no flash of wrong theme for `system` (pure CSS);
  no provider.

## R5 — Tailwind namespace

- **Decision**: `--color-neshel-*`, `--radius-neshel-*`, `--font-neshel-*` under `@theme inline`;
  reserved prefixes; no unprefixed utilities, no default overrides, no custom variants in 0.x.

## R6 — Loading `neshel.config.ts` (D4)

- **Facts**: unflagged type stripping is unavailable on Node 22.13 (the floor) and handles only
  erasable syntax.
- **Decision**: `jiti` 2.x in `@neshel-ui/cli`.
- **Spike (2026-11-07)**: `jiti@2.7.0` — MIT, ESM with types, **no dependencies**, 1.7 MB unpacked,
  last published 2026-05. `createJiti(url, { fsCache: false, moduleCache: false }).import(file,
  { default: true })` loaded a TS file using `enum` from `dir with spaces ñ/` and wrote no files.
  Linux/macOS and Node 22/24 behaviour is verified by CI in 002.4.
- **Discovery**: cwd only; ambiguity is an error.

## R7 — Validation and generator location (amendments B, C)

- **Decision**: `@neshel-ui/config` `.` exports `defineConfig`, types and contract data
  (`colorRoles`, `contrastPairs`, `defaults`). Structural validation (hand-written), colour
  processing (Color.js), resolution and CSS generation are **private modules of `@neshel-ui/cli`**.
  No `./engine` subpath.
- **Rationale**: an exported subpath is consumable API regardless of labels; keeping the generator
  private avoids a premature semver surface. Contract data in `config` keeps constitution II
  (config owns tokens) and lets the CLI, the shipped stylesheets and tests share one source.
  Color.js stays out of every browser-reachable entry.
- **How shipped CSS is produced**: a repository script runs the built CLI generator on `defaults`
  and writes `packages/config/src/tokens.css` and `tailwind.css` (committed, "do not edit"
  header). `config`'s build only copies CSS (as today) plus the alias, so there is no build-time
  cycle (`cli` → `config` at runtime; `config` never imports `cli`). A drift test fails when the
  committed files differ from generator output.
- **Dependency kind**: `cli` declares `@neshel-ui/config` as a **peer** (`workspace:^`) and dev
  dependency, so the CLI and the user's `neshel.config.ts` resolve the same copy of the contract.
  `check:pack` must accept a public workspace peer and still reject internal packages.
- **Alternatives**: engine subpath in `config` (public surface + Color.js in `config`'s install
  graph); generator in `config` with a runtime dependency on Color.js (browser-adjacent package
  gains a 16 MB dependency); `zod`/`valibot` for structure (unneeded for a small closed schema).

## R8 — Testing TypeScript sources

- **Decision**: keep `node:test`. Repository tests stay in `tests/**/*.test.mjs` (run before
  build). Package tests live in `packages/*/test/**/*.test.mjs`, import built `dist`, and run via
  a new `pnpm test:packages` after `build:packages`; root `test` becomes an explicit glob so it
  does not pick up package tests. Type contracts are checked by `tsc --noEmit` on fixture files
  (`@ts-expect-error` negatives) inside `pnpm typecheck`.
- **Rationale**: tests exercise shipped output; works on Node 22.13; no new runner.

## R9 — Gate extensions

- `check:pack`: `config` exports exactly `.`, `./tokens.css`, `./tailwind.css`, `./styles.css`;
  alias identical to `tailwind.css`; `config` has no `dependencies`; `dist/index.js` imports
  nothing; `cli` runtime dependencies exactly `jiti`, `colorjs.io`; peer `@neshel-ui/config`
  rewritten to a caret range; internal packages still rejected.
- `check:consumer`: three generated TypeScript apps from tarballs in a spaces+Unicode path —
  Tailwind (`tailwind.css`), plain (`tokens.css`), configured (packed CLI + `neshel.config.ts`).
- `check:browser` (new, R17) on all three CI OSes.

## R10 — Palette (D3)

- **Decision**: [contracts/tokens.md](contracts/tokens.md). Dark background moved from `#06132a`
  to Midnight `#040d1d` after D3; all pairs re-verified with Color.js (`contrastWCAG21`), results
  identical to an independent WCAG formula implementation for overlapping values.
- **Notes**: gold is a fill with navy text; light focus uses bronze `#8f6d3f` (4.51:1 — closest to
  its threshold; any change must keep ≥ 3:1).

## R11 — Named themes (D5)

- **Decision**: object keys under `themes` other than `light`/`dark`; must declare
  `extends: "light" | "dark"`; resolved from the resolved base; no chains; `system` reserved;
  names `^[a-z][a-z0-9-]{0,31}$` (unique by construction as object keys, and lower-case only,
  so no case-variant duplicates). Emitted after built-ins, alphabetically, each block complete. `color-scheme` from the base.
- Amends `docs/package-contracts.md` ("defer extra modes until needed").

## R12 — Typography scope (amendment E)

- **Decision**: family tokens; `typography.metrics` reserved with Capsize-compatible names,
  shape-validated, `info` diagnostic, no CSS, no `@capsizecss/*` dependency.

## R13 — Determinism

Fixed role order (contract), theme order (light, system-dark, dark, named alphabetical),
two-space indentation, LF, trailing newline, authored colour values (hex lower-cased),
deterministic font-stack quoting, headers without versions/timestamps/paths. Golden files are
compared byte-for-byte on all CI jobs.

## R14 — Testing and accessibility strategy

| Layer                 | What                                                                                                                 | Tool                  |
| --------------------- | -------------------------------------------------------------------------------------------------------------------- | --------------------- |
| Contract data         | `colorRoles` order/uniqueness, `defaults` complete and frozen, `contrastPairs` reference valid roles                 | `node:test` (config)  |
| Built-in a11y         | every pair of both built-in themes meets its threshold                                                               | `node:test` (cli)     |
| Generator             | golden CSS for defaults and fixtures; complete blocks; selector/at-rule allowlist; idempotence                       | `node:test` (cli)     |
| Drift                 | committed `tokens.css`/`tailwind.css` equal generator output; alias identical                                        | `node:test`           |
| Colour                | allowlist, parse, alpha, gamut, contrast vectors                                                                     | `node:test` (cli)     |
| Structural validation | each diagnostic code; did-you-mean; sorting; all-errors-in-one-pass                                                  | `node:test` (cli)     |
| Types                 | positive/negative `defineConfig` fixtures                                                                            | `tsc --noEmit`        |
| CLI                   | negative matrix of [contracts/cli.md](contracts/cli.md) via spawned `dist/bin.js` in temp dirs with spaces + Unicode | `node:test`           |
| Packaging             | exports, dependency sets, `node:`-free entry, bundle size of `defineConfig` import                                   | `check:pack`, test    |
| Consumers             | Tailwind, plain, configured — from tarballs, TypeScript                                                              | `check:consumer`      |
| Cascade / themes      | precedence matrix + cascade cases of [contracts/css.md](contracts/css.md), computed styles                           | `check:browser` (R17) |
| Visual / a11y         | Storybook token pairs in light/dark + `@storybook/addon-a11y`                                                        | Storybook             |

## R15 — Colour library evaluation (amendment B)

Spike 2026-11-07 (`colorjs.io@0.7.1`, `culori@4.0.2`), same inputs:

| Criterion              | Color.js 0.7.1                                                                     | culori 4.0.2                      |
| ---------------------- | ---------------------------------------------------------------------------------- | --------------------------------- |
| Licence / deps         | MIT / none                                                                         | MIT / none                        |
| Module format / types  | ESM, bundled `.d.ts`                                                               | ESM, types via `@types/culori`    |
| Unpacked size          | 15.8 MB (15 MB prebuilt `dist/`; ESM `src/` ≈ 0.55 MB)                             | 1.1 MB                            |
| Last publish           | 2026-07                                                                            | 2026-04                           |
| Restrict spaces        | procedural `colorjs.io/fn` + `ColorSpace.register` (unregistered `lab()` rejected) | `culori/fn` + mode registration   |
| Hex/rgb/hsl/oklch      | yes (incl. legacy comma syntax, alpha)                                             | yes                               |
| Named colours          | accepted (`navy`) → needs our allowlist                                            | accepted → same                   |
| `var()`, `color-mix()` | rejected                                                                           | rejected                          |
| WCAG 2.1 contrast      | `contrastWCAG21`                                                                   | `wcagContrast`                    |
| Gamut mapping          | CSS Color 4 algorithm (`toGamut`, method `css`)                                    | `toGamut` (approximation options) |
| Results on palette     | identical ratios (e.g. 16.36, 3.57, 4.51, 6.75)                                    | identical                         |

- **Decision**: Color.js via `colorjs.io/fn`, registering sRGB, HSL and OKLCH only, in
  `@neshel-ui/cli` `dependencies`. Our syntax allowlist runs first.
- **Rationale**: the owner's suggestion; maintained by CSS Color specification editors, so parsing
  and gamut mapping follow the spec; bundled types; no transitive dependencies.
- **Tradeoffs**: 15.8 MB install weight for the Node-only CLI (never in browser bundles; not
  installed by zero-config consumers). Pin `~0.7.x` (0.x semver); wrap behind one internal module
  (`colour.ts`) so a swap to culori is local.
- **Transparency behaviour**: both expose alpha; we reject alpha < 1 on paired roles instead of
  compositing (background of a translucent colour is unknown at build time).

## R16 — Cascade analysis (amendment A)

Findings recorded in [contracts/css.md](contracts/css.md#cascade-layers):

1. First appearance fixes layer order → identical statement in every file; sublayers under a
   single `neshel` parent so consumers can position Neshel among their layers.
2. Tailwind v4 layers declared first under the canonical order; only `color-scheme` can overlap
   (with `scheme-*` utilities) — documented, tested (C9).
3. Unlayered consumer CSS wins over all layers — documented pattern, tested (C5, C6).
4. Import order: precedence between `neshel.defaults` and `neshel.config` does not depend on import
   order **by the cascade rules**, but bundlers (Tailwind's import inlining, Lightning CSS
   minification) could reorder or merge statements; independence is claimed only for orders
   that pass the browser check (C1–C3).
5. **Leakage hazard found**: layer precedence beats specificity, and `:root` matches a dark root;
   a partial generated `:root` block would override dark values. Fix: complete blocks for every
   theme in every file (FR-009), tested by C4 and matrix rows 7–12.
6. Nested scopes rely on inheritance being replaced by the scoped block; complete blocks make
   isolation total, including named themes (rows 11–12).

## R17 — Browser verification approach (amendment F)

- **Decision**: `pnpm check:browser`, a zero-dependency Node script driving an installed
  Chrome/Chromium through the DevTools Protocol (`--headless=new`, `--remote-debugging-port=0`,
  global `WebSocket`, available unflagged on Node 22). It loads static HTML fixtures composed from
  shipped/generated CSS in each supported order, plus the built output of the three
  `check:consumer` apps, emulates `prefers-color-scheme` (`Emulation.setEmulatedMedia`), and
  asserts `getComputedStyle` values for every matrix row and cascade case.
- Browser discovery: `NESHEL_CHROME` env, then standard install paths per OS. Locally, absence
  prints `SKIPPED (no Chrome found)` and exits 0 **only** outside CI; with `CI=true` absence fails.
- **Rationale**: real cascade evaluation; no Playwright download; works on GitHub-hosted images,
  which ship Google Chrome on all three OSes (assumption verified in 002.2).
- **Alternatives**: Playwright (large browser downloads, new dependency); jsdom (does not implement
  cascade layers/`@media` emulation faithfully); manual CDP as in 001 (not regression-proof).

## R18 — Output path and atomic writes (amendment D)

- `--out` relative to cwd; config `output` relative to the config file; default next to the config.
- Reject non-`.css`, `node_modules` segments, the config file itself, existing directories.
- Temp sibling + `rename` (same directory ⇒ same volume ⇒ atomic replace on POSIX; on Windows
  Node's `rename` replaces existing files; transient `EPERM`/`EBUSY` from scanners or editors are
  retried, then exit 5 with the previous file intact).
- Byte comparison before writing keeps runs idempotent and avoids dev-server reload loops.

## Conflicts with Phase 001 documents and ADRs (resolved)

| Source                                                           | Conflict                                       | Resolution (task)                                                    |
| ---------------------------------------------------------------- | ---------------------------------------------- | -------------------------------------------------------------------- |
| `docs/architecture.md` "exports … plus `./styles.css`"; ADR 0004 | `config` gains `tokens.css`, `tailwind.css`    | ADR 0006 amends; architecture updated now                            |
| `docs/package-contracts.md` `cli` runtime deps "none"            | `jiti`, `colorjs.io`, peer `@neshel-ui/config` | ADR 0007; table marked planned now, updated on implementation (T066) |
| `docs/architecture.md` "no runtime dependency between packages"  | first real one: `cli` → `config` (peer)        | Expected by the diagram; `check:pack` change (T012)                  |
| `docs/package-contracts.md` "defer extra modes until needed"     | named themes (D5)                              | Updated now                                                          |
| `docs/package-contracts.md` "token validation" in config         | validation lives in `cli`                      | Updated now                                                          |
| `docs/theming.md` illustrative config, violet; "after base CSS"  | new shape, palette, canonical order            | Status note now; rewrite in T067                                     |
| Architecture theme model diagram                                 | generated order/precedence wording             | Updated now                                                          |
| `pnpm check` / CI run tests before build                         | package tests need `dist`                      | `test:packages` after build (T004, T005)                             |
| ADR 0002, 0003, 0005                                             | none                                           | —                                                                    |

## Dependencies introduced by feature 002 (planned)

| Package                           | Kind       | Where | Reason                       |
| --------------------------------- | ---------- | ----- | ---------------------------- |
| `jiti` `^2.7.0`                   | runtime    | `cli` | TS config loading (D4)       |
| `colorjs.io` `~0.7.1`             | runtime    | `cli` | parsing, gamut, contrast (B) |
| `@neshel-ui/config` `workspace:^` | peer + dev | `cli` | token contract and defaults  |

No new dependency in `config`, `layout`, `typography`, `components`, `core` or the root.

## Risks and compatibility implications

| Risk                                                       | Impact | Mitigation                                                                          |
| ---------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------- |
| Bundlers reorder/merge `@layer` statements                 | High   | Consumer CSS assertions + browser check per order; claims limited (FR-011)          |
| Consumer unlayered overrides beat dark                     | Medium | Documented pattern; C5/C6 regression tests                                          |
| Chrome unavailable or different on a CI image              | Medium | Explicit discovery, CI fails loudly; `NESHEL_CHROME` override                       |
| Color.js 0.x API change / install weight                   | Medium | Exact-minor pin; single wrapper module; culori fallback documented                  |
| `jiti` behaviour change                                    | Medium | Range pin; loader isolated; CLI tests on 5 jobs                                     |
| Peer-dependency skew between `cli` and `config`            | Medium | Same-minor caret peer; release together; changeset `fixed` group decided before 007 |
| Contract data in `.` grows the public surface              | Low    | Three frozen exports, documented versioning policy                                  |
| Visual change from violet to navy/gold for Phase 001 users | Low    | Nothing published; changeset documents the pre-1.0 change                           |
| Committed generated CSS edited by hand                     | Low    | "do not edit" header + drift test                                                   |
| Network needed by `check:consumer`                         | Low    | Already accepted in 001; Neshel code only from tarballs                             |
