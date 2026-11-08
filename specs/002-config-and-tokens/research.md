# Research — Feature 002 (Phase 0)

Prepared 2026-11-07 from the repository state at `b8c6198` (Phase 001 closed). Nothing here is
implemented. ⚑ marks the five decisions that need the owner.

## Brief audit

| Brief item / readiness decision                                                                                                                                   | Status after this pass                                                                                                                                         | Where          |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| Typed `defineConfig`                                                                                                                                              | Specified                                                                                                                                                      | R7, config-api |
| Light/dark semantic tokens                                                                                                                                        | Specified (21 roles)                                                                                                                                           | R1, tokens     |
| CSS-first baseline                                                                                                                                                | Specified (`tokens.css` / `tailwind.css`)                                                                                                                      | R3             |
| Custom config discovery                                                                                                                                           | Specified (cwd only, 4 extensions)                                                                                                                             | R6, cli        |
| Safe validation                                                                                                                                                   | Specified; "safe" = no browser evaluation, no sandbox claim                                                                                                    | R6, R7         |
| Deterministic generated CSS                                                                                                                                       | Specified                                                                                                                                                      | R13            |
| Capsize metrics hooks                                                                                                                                             | **Narrowed**: reserved shape only; Capsize in 004                                                                                                              | R12            |
| Explicit `neshel generate`                                                                                                                                        | Specified + `validate`, `--check`                                                                                                                              | cli            |
| Test categories (CSS-only, invalid values, determinism, concurrent themes, missing metrics, contrast, zero Node deps, tree shaking, exit codes, tarball consumer) | All mapped to tests; "concurrent applications" interpreted as nested/side-by-side theme scopes; two _different generated configs_ on one page are out of scope | R14            |
| Decisions 1–9                                                                                                                                                     | R1–R9 below                                                                                                                                                    |                |

## R1 — Token vocabulary

- **Decision**: fixed vocabulary of 21 colour roles (9 fill/foreground pairs + `border`,
  `input`, `focus`), radius scale `base/sm/md/lg/xl/full` derived from `base`, `spacing` unit,
  font families `body/display/mono`, focus width/offset. All nine Phase 001 names keep their
  meaning; `--neshel-radius-base` stays the knob.
- **Rationale**: covers the states the owner listed (background, foreground, surfaces, borders,
  primary/secondary/accent, focus, disabled, destructive, selected) and what features 003–005
  need, without hover/active tokens that components can derive. A closed vocabulary keeps
  one contract for zero-config and configured modes and keeps Tailwind utilities static.
- **Tradeoffs**: no custom roles in 0.x (a consumer wanting `brand-teal` uses their own
  Tailwind theme). Adding roles later is additive; removing would be breaking, hence minimal.
- **Alternatives**: shadcn-style list (`card`, `popover`, `ring`, `chart-*`) — more component-
  specific names; numeric palettes (`navy-50…950`) — not semantic, invites hardcoding.

## R2 — Contrast policy

- **Decision**: WCAG 2.x ratio. Text pairs ≥ 4.5:1, focus and input boundaries ≥ 3:1
  (1.4.11; focus also informed by 2.4.13). Built-ins enforced by tests (failure blocks the
  build). Custom themes: warnings by default; `--strict` or `contrast: "error"` makes them
  errors. Disabled pair and `border` exempt and documented.
- **Rationale**: guarantees what the library controls; gives consumers actionable diagnostics
  without blocking exploratory themes. Never claims conformance — usage decides conformance.
- **Tradeoffs**: default-warn means an inaccessible custom theme can ship; mitigated by
  recommending `--strict` in CI scripts. Large-text 3:1 is not modelled (role-based, not
  size-based).
- **Alternatives**: errors by default (safer, more friction); APCA (not a standard yet).

## R3 — CSS export names and `styles.css` ⚑ Q2

- **Decision**: `./tokens.css` and `./tailwind.css`, both self-contained and generated by the
  engine. Recommended: keep `./styles.css` as a byte-identical deprecated alias of
  `tailwind.css` for 0.x, removal decided by ADR before 1.0.
- **Rationale**: names state what each file needs. Nothing is published, so no external
  consumer depends on `styles.css`; the alias costs one file copy and preserves the
  "`./styles.css` per package" convention used by layout/typography/components and
  documentation written in Phase 001.
- **Alternative**: remove `styles.css` now and migrate the two internal apps and
  `check:consumer` (cleaner; breaks the per-package naming convention for `config` only).

## R4 — Cascade and theme selection ⚑ Q1

- **Decision**: layers `@layer neshel.defaults, neshel.config;` at the top of every Neshel
  stylesheet; `[data-neshel-theme]` on any element with `light | dark | system | <named>`;
  `system` maps to `prefers-color-scheme`. Recommended: no attribute ⇒ light (Phase 001
  behaviour); following the OS is opt-in via `system`.
- **Rationale**: a repeated layer statement makes precedence independent of import order —
  the first statement fixes order and both name the same order. Opt-in `system` avoids
  turning pages dark that have non-token colours (images, third-party widgets) and keeps
  Phase 001 behaviour. Pure CSS: no provider, no flash of wrong theme for `system`.
- **Tradeoffs**: unlayered consumer overrides beat everything, including dark — must be
  documented. Apps persisting a user choice still set the attribute themselves (server or
  inline script); no helper is shipped.
- **Alternative (Q1)**: no attribute ⇒ follow OS (`:root:not([data-neshel-theme])` in the
  media block). Better out-of-box dark support; a visible behaviour change for Phase 001 users.
- **Alternatives rejected**: specificity tricks (`:where()` / doubled selectors) — fragile with
  consumer CSS; Tailwind `dark:` variant — Tailwind-only.

## R5 — Tailwind namespace and collisions

- **Decision**: keep `--color-neshel-*`, `--radius-neshel-*`, `--font-neshel-*` under
  `@theme inline`; reserve the `--neshel-*` / `--*-neshel-*` prefixes; no unprefixed utilities,
  no override of Tailwind defaults, no custom variants in 0.x.
- **Rationale**: matches Phase 001 (CI-verified utilities), cannot collide with consumer
  `--color-primary`, and `inline` lets scoped and generated values flow through `var()`.
- **Alternatives**: unprefixed `bg-primary` (collides with most Tailwind apps and shadcn).

## R6 — Loading `neshel.config.ts` ⚑ Q4

- **Facts**: Node's unflagged TypeScript type stripping exists in Node 23.6+ and later 22.x
  releases, but **not in 22.13** (the floor); it only strips erasable syntax and does not
  rewrite import specifiers. Requiring it would raise `cli`'s `engines` above the
  contributor floor and still fail for some valid TS.
- **Decision (recommended)**: `jiti` (v2, ESM, zero dependencies, maintained, used by the
  Tailwind v4 Node tooling to load configs) as the only runtime dependency besides
  `@neshel-ui/config`. Pin an exact minor range; licence check (MIT) at implementation.
- **Rationale**: works on every supported Node line and OS, full TS syntax, in-memory.
- **Tradeoffs**: one third-party dependency in a Node-only package; browser consumers never
  receive it (`config` stays dependency-free).
- **Alternatives**: raise `cli` to Node ≥ 22.18 (or the exact first unflagged release, to be
  verified) and use native stripping + `.mjs` fallback — zero deps, narrower support, erasable
  syntax only; `tsx`/`esbuild` — heavier; ask users to write `.mjs` only — poor DX.
- **Discovery**: working directory only, four extensions, ambiguity is an error. Upward search
  is rejected: surprising in monorepos and harder to reason about in CI.

## R7 — Validation approach and engine location

- **Decision**: hand-written validators in `@neshel-ui/config/engine` (pure, browser-safe),
  `defineConfig` + types in `.`; `cli` does discovery, loading, I/O and exit codes.
- **Rationale**: the schema is small and closed; colour parsing and contrast must be written
  anyway; constitution II asks for minimal dependencies; one engine generates both the shipped
  stylesheets and consumer CSS (FR-012). Keeping the engine off `.` keeps config files and
  browser bundles tiny.
- **Tradeoffs**: more code to own (colour parsing for hex/rgb/hsl/oklch, error messages); the
  engine subpath is a semver surface → marked experimental in 0.x.
- **Alternatives**: `zod`/`valibot` in `cli` (good messages, but types would be duplicated or
  inferred from a schema the browser entry cannot import); engine inside `cli` (then
  `config`'s build would depend on `cli`, inverting the dependency direction).
- **Versioning**: optional `version: 1`; any other value is an error, so a future v2 can be
  detected.

## R8 — Testing TypeScript sources

- **Decision**: keep `node:test`. Package unit tests are `.test.mjs` files that import the
  built `dist` output; `pnpm check` runs `build:packages` before tests that need it (order to
  be fixed in the plan). Type contracts are tested by `tsc --noEmit` on fixture files with
  `@ts-expect-error` negatives as part of `pnpm typecheck`.
- **Rationale**: no new runner; tests exercise what is shipped; works on Node 22.13.
- **Tradeoffs**: build-before-test; no TS in test files. Revisit if test volume grows (Vitest
  would be the candidate, by ADR).

## R9 — Gate extensions

- `check:pack`: expect `./engine`, `./tokens.css`, `./tailwind.css` (+ alias); fail if
  `dist/index.js` or `dist/engine/**` import `node:` modules or any package; allow the
  `cli → config` public workspace dependency (rewritten to an exact version on pack) while
  still rejecting internal ones; verify `jiti` is the only third-party runtime dependency.
- `check:consumer`: three generated apps from tarballs in a spaces+Unicode path —
  (a) Vite + Tailwind with `tailwind.css`, (b) Vite without Tailwind with `tokens.css`,
  (c) Vite + Tailwind + packed CLI running `neshel generate` on a `neshel.config.ts`, then
  asserting configured values and layer order in the built CSS. Expectations derive from the
  shipped/generated CSS, as in Phase 001.
- CI: unchanged 5-job matrix; determinism golden files compared on every job.

## R10 — Default palette ⚑ Q3

- **Decision (proposed)**: values in [contracts/tokens.md](contracts/tokens.md), anchored on
  colours sampled from the approved logo; all 18 checked pairs per theme pass (computed).
- **Notes**: brand gold fails as text/focus on ivory, so it is a fill (`accent`) with navy
  text, and the light focus ring uses bronze `#8f6d3f`. Destructive red is not a brand colour;
  chosen for contrast. The owner may adjust any value; tests will hold the thresholds.

## R11 — Named themes ⚑ Q5

- **Decision (recommended)**: allow named themes in configuration with
  `extends: "light" | "dark"` (no chains), selected by the same attribute, emitted after the
  built-ins, alphabetically. Not in the shipped defaults.
- **Rationale**: the owner's brief lists theme variants; the cost is a small validation and
  generation loop on the same contract. `system` cannot target them.
- **Conflict**: `docs/package-contracts.md` says "defer extra modes until needed" — this
  decision would amend it.
- **Alternative**: light/dark only in 002; named themes later (additive).

## R12 — Font metrics and Capsize

- **Decision**: `typography.metrics` accepted with Capsize-compatible field names, validated
  for shape, informational diagnostic, no CSS. No `@capsizecss/*` dependency in 002.
- **Rationale**: reserves the extension point the brief asks for without implementing
  feature 004; field names follow Capsize's `FontMetrics` to avoid a later rename.
- **Risk**: feature 004 may need a different shape (e.g. per-weight); the key is documented
  as reserved/experimental.

## R13 — Determinism

- Fixed role order (contract order), theme order (light, dark, named alphabetical), fixed
  indentation, LF, trailing newline, colours emitted as authored (hex lower-cased), font stacks
  quoted deterministically, header with package version but no timestamp/path.
- Shipped stylesheets are generated during `pnpm build:packages` by a Node script that imports
  the freshly built engine; a test re-generates and compares (no drift between engine and
  `dist/*.css`). Golden files in the repository are compared byte-for-byte on all CI jobs.

## R14 — Testing and accessibility strategy

| Layer                  | What                                                                                                                                                                   | Tool                                                            |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Engine unit            | colour parsing (valid/invalid per format), luminance against WCAG reference values, resolution order, every diagnostic code, generation golden files                   | `node:test` on `dist`                                           |
| Built-in accessibility | every contrast pair of every built-in theme meets its threshold                                                                                                        | `node:test`                                                     |
| Type contract          | positive/negative `defineConfig` fixtures                                                                                                                              | `tsc --noEmit`                                                  |
| CSS structure          | layer statement first; only allowed selectors; no resets/`@font-face`/`url()`; `color-scheme` per block; Tailwind-free file has no `@theme`                            | `node:test`                                                     |
| Browser safety         | `.` and `./engine` import no `node:` and no packages; `.` < 1 kB minified                                                                                              | `check:pack` / test                                             |
| CLI                    | negative matrix in [contracts/cli.md](contracts/cli.md) in temp dirs with spaces + Unicode; spawn `dist/bin.js` and assert exit code, stderr path, file written or not | `node:test`                                                     |
| Determinism            | golden outputs on 5 CI jobs; generate twice → identical; unchanged output keeps mtime                                                                                  | `node:test`, CI                                                 |
| Packed consumers       | three consumers (R9)                                                                                                                                                   | `check:consumer`                                                |
| Theme behaviour        | precedence matrix incl. emulated `prefers-color-scheme` and import order                                                                                               | headless Chrome via CDP, recorded in evidence (as US-03 in 001) |
| Visual/a11y            | Storybook "Foundations/Tokens" story with every pair in light/dark; `@storybook/addon-a11y` run                                                                        | Storybook                                                       |

Browser verification stays a recorded milestone step, not a CI job, unless the owner wants a
browser dependency in CI (not proposed).

## Conflicts with Phase 001 documents and ADRs

| Source                                                                              | Conflict                                                | Resolution                                                             |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------- | ---------------------------------------------------------------------- |
| `docs/architecture.md` "exports … plus `./styles.css`"; ADR 0004                    | `config` gains `tokens.css`, `tailwind.css`, `./engine` | ADR 0006 amends; architecture updated in 002.1                         |
| `docs/package-contracts.md` distribution table: `cli` runtime deps "none"           | `cli` → `@neshel-ui/config`, `jiti`                     | ADR 0007; table updated when implemented                               |
| `docs/architecture.md` "no package has a runtime dependency on another" (R9 of 001) | first real inter-package dependency (`cli → config`)    | Expected by the diagram; `check:pack` must allow public workspace deps |
| `docs/package-contracts.md` "defer extra modes until needed"                        | named themes (R11)                                      | ⚑ Q5                                                                   |
| `docs/typography.md` step 1–2: metrics in config, Capsize in CLI                    | consistent; 002 reserves only                           | none                                                                   |
| `docs/theming.md` illustrative config (flat `themes.light.primary`, violet)         | new shape nests roles under `colors`; navy/gold palette | Replace example in 002.5                                               |
| `docs/architecture.md` theme model: generated file imported "after base CSS"        | order no longer matters (layers)                        | Update diagram text in 002.1                                           |
| `pnpm check` order (test before build)                                              | package tests need `dist`                               | Reorder in plan (R8)                                                   |
| ADR 0002, 0003, 0005                                                                | no conflict                                             | —                                                                      |

No conflict blocks the phase; none reopens Phase 001.

## Risks and compatibility implications

| Risk                                                                                | Impact | Mitigation                                                                  |
| ----------------------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------- |
| Tailwind/Lightning CSS reorders or drops repeated `@layer` statements when bundling | High   | Consumer tests assert layer statement and order in built CSS; browser check |
| Unlayered consumer overrides unexpectedly beat dark theme                           | Medium | Documented pattern; example in README and Storybook                         |
| `jiti` behaviour change or maintenance risk                                         | Medium | Exact range, loader isolated behind one module, CLI tests per OS/Node       |
| Engine subpath becomes a de-facto stable API                                        | Medium | "experimental" label in 0.x docs and types                                  |
| Palette disagreement after implementation                                           | Low    | Owner approval in 002.0; values are data, thresholds are tests              |
| Visual change for Phase 001 users (violet → navy/gold, more tokens)                 | Low    | Nothing published; changeset documents the pre-1.0 change                   |
| Colour parsing bugs (hsl/oklch → sRGB) produce wrong contrast numbers               | Medium | Reference vectors from the CSS Color 4 spec; cross-check with known ratios  |
| Generated file stale in CI                                                          | Low    | `generate --check` exit 4                                                   |
| Browser verification is manual                                                      | Medium | Scripted CDP steps and recorded values, as accepted in Phase 001            |
| `check:consumer` needs the registry (Tailwind, Vite, jiti)                          | Low    | Already accepted in 001; tarballs remain the source of Neshel code          |
