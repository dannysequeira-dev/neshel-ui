# Feature Specification: Design tokens, semantic theming and consumer configuration

**Feature Branch**: `main` (spec directory `specs/002-config-and-tokens`; no feature branch created)

**Created**: 2026-11-07

**Status**: Approved direction (owner, 2026-11-07); clarified. Milestone 002.0 (architecture and
planning) complete pending owner review; nothing implemented.

**Input**: Owner brief "Neshel-UI — Phase 002: Design Tokens & Theming" (2026-11-07),
[brief.md](brief.md) and the owner's "Phase 002.0 Architecture Approval" (decisions D1–D5,
amendments A–F).

Companion documents:

- [plan.md](plan.md), [tasks.md](tasks.md), [data-model.md](data-model.md),
  [quickstart.md](quickstart.md), [analysis.md](analysis.md).
- [research.md](research.md) — decisions, rationale, tradeoffs, brief audit, conflicts, risks.
- [contracts/tokens.md](contracts/tokens.md) — vocabulary, palette, contrast pairs.
- [contracts/css.md](contracts/css.md) — stylesheet exports, cascade, theme selection.
- [contracts/config-api.md](contracts/config-api.md) — `defineConfig()` and contract data.
- [contracts/cli.md](contracts/cli.md) — commands, loading, validation, output, exit codes.
- ADRs (Accepted): [0006](../../docs/decisions/0006-token-stylesheets-and-theme-cascade.md),
  [0007](../../docs/decisions/0007-config-engine-and-cli-loading.md).

## Problem

Phase 001 ships an experimental stylesheet with nine violet `--neshel-*` variables, light and
dark selectors and Tailwind utilities in one file. There is no token contract, no
accessibility guarantee, no configured mode, and the colours do not reflect the Neshel brand
(navy-blue rose, ivory, subtle gold). Layout, typography and components need a stable,
semantic token contract to build on.

## Goals

1. One semantic token contract shared by a zero-config mode and a configured mode.
2. Default visual theme derived from the Neshel identity, verified against WCAG AA pairs.
3. Plain CSS tokens usable without Tailwind; a separate Tailwind v4 integration.
4. Light, dark, system and named themes with tested precedence, no React provider.
5. A typed `defineConfig()` and a Node-only CLI that validates configuration and writes
   deterministic static CSS on explicit command.

## Non-goals

- Layout primitives (003), typography components, Capsize calculations and font trimming
  (004), interactive components (005).
- A Vite/Next plugin, watch mode, `neshel init`, a theme editor, a programmatic CLI API.
- User-defined token roles beyond the fixed vocabulary.
- Runtime theme persistence helpers; Shadow DOM (`:host`) theming.
- Publishing any package, removing a `private` guard, pushing to a remote.

## Clarifications

### Session 2026-11-07 — specification pass

Proposals R1–R14 recorded in [research.md](research.md); five items were escalated to the
owner as Q1–Q5.

### Session 2026-11-07 — owner architecture approval (002.0)

- Q1: What does a page without `data-neshel-theme` show? → A (**D1**): light.
  `light`/`dark` force a theme, `system` follows `prefers-color-scheme`, explicit values
  override the OS preference, no React provider; nested boundaries and inheritance are verified.
- Q2: What happens to `./styles.css`? → A (**D2**): kept as a compatibility alias of
  `./tailwind.css` during 0.x. Consumers import either `tokens.css` or `tailwind.css`, not both.
  The Phase 001 consumer contract is preserved.
- Q3: Which palette? → A (**D3**): the navy/ivory/gold palette of
  [contracts/tokens.md](contracts/tokens.md). Brand references — Midnight `#040D1D`, Navy
  `#071936`, Blue `#244679`, Gold `#C49A59`, Ivory `#F5F1EE` — are design references, not
  unconditional token values; final palettes must pass the documented pairs with accessible
  foregrounds. Logo and brand assets are not modified.
- Q4: How is `neshel.config.ts` loaded? → A (**D4**): `jiti` in the Node-only CLI, Node
  `>=22.13` preserved, never in the browser; configuration files are documented as
  executable, trusted project code; discovery, validation, generation and errors deterministic.
- Q5: Named themes? → A (**D5**): yes. `light`/`dark` are built-in bases; custom themes extend
  exactly one of them, names are unique, `system` is reserved, no multi-level chains, invalid
  or missing bases are rejected; switching and isolation are tested.
- Q: Does generated CSS always win? → A (**amendment A**): not assumed. Neshel layers are
  nested under one `neshel` layer; every theme block (shipped and generated) declares the
  complete resolved role set so values cannot leak across themes or nested scopes; a
  canonical import order is defined; import-order independence is claimed only for the orders
  verified by computed-style browser tests (SC-005).
- Q: How are colours parsed and contrast computed? → A (**amendment B**): structural
  validation stays hand-written; colour parsing, gamut mapping and WCAG 2.1 contrast use
  Color.js (`colorjs.io`, procedural API) inside `@neshel-ui/cli` only. Effective contrast
  policy: `--strict` › config `contrast` › default `"warn"`.
- Q: Is there an engine subpath? → A (**amendment C**): no. `@neshel-ui/config` exports
  `defineConfig`, types and contract data (`colorRoles`, `contrastPairs`, `defaults`) only;
  validation and generation are internal to `@neshel-ui/cli`, which declares
  `@neshel-ui/config` as a peer dependency. No experimental public subpath is exported.
- Q: Output paths and partial writes? → A (**amendment D**): resolution, rejection rules and
  atomic writes are specified in [contracts/cli.md](contracts/cli.md).
- Q: Typography scope? → A (**amendment E**): family tokens and reserved `typography.metrics`
  only; no Capsize, font trimming or typography components.
- Q: Testing? → A (**amendment F**): `node:test`, packed artifacts, TypeScript consumers and
  automated computed-style browser tests on Windows, Linux and macOS.

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Zero-config tokens with Tailwind (Priority: P1)

A developer installs `@neshel-ui/config`, imports `tailwind.css` after Tailwind and gets the
navy/gold theme, semantic utilities (`bg-neshel-primary`, `text-neshel-primary-foreground`,
`rounded-neshel-md`) and dark mode via `data-neshel-theme="dark"` — no configuration file, CLI
or provider.

**Why this priority**: default experience and base for every package.

**Independent Test**: packed-tarball Vite + Tailwind + TypeScript consumer; built CSS has every
declaration and utility; browser test switches the attribute and reads computed colours.

**Acceptance Scenarios**:

1. **Given** a fresh Tailwind v4 app, **When** it imports `@neshel-ui/config/tailwind.css` after
   `tailwindcss`, **Then** the build contains all `--neshel-*` declarations for light and dark and
   every used `*-neshel-*` utility references its variable.
2. **Given** that app, **When** `<html data-neshel-theme="dark">` is set, **Then** all 21 colour
   roles compute to their dark values and `color-scheme` is `dark`.
3. **Given** only the package is installed, **When** no stylesheet is imported, **Then** no Neshel
   CSS appears in the output.
4. **Given** an app importing `@neshel-ui/config/styles.css`, **Then** it receives exactly the
   CSS of `tailwind.css`.

---

### User Story 2 — Plain CSS tokens without Tailwind (Priority: P1)

A developer without Tailwind imports `@neshel-ui/config/tokens.css` and uses
`var(--neshel-primary)` in their own CSS.

**Why this priority**: constitution III requires interoperable custom properties.

**Independent Test**: packed-tarball Vite consumer without Tailwind; build has the layer
statement and tokens and no `@theme`; browser test reads computed token values.

**Acceptance Scenarios**:

1. **Given** a Vite app with no Tailwind, **When** it imports `tokens.css`, **Then** the build
   succeeds without unknown at-rule warnings and contains every `--neshel-*` declaration.
2. **Given** that app in a browser, **Then** `--neshel-background` computes to the light default
   and to the dark value under `data-neshel-theme="dark"`.

---

### User Story 3 — Predictable theme switching and precedence (Priority: P1)

A developer selects light, dark, system or a named theme with one attribute on the root or any
subtree; explicit choices override the OS preference; nested scopes are isolated.

**Why this priority**: precedence is public contract; changing it later is breaking.

**Independent Test**: automated computed-style browser tests over the precedence matrix in
[contracts/css.md](contracts/css.md), with emulated `prefers-color-scheme`, nested scopes,
named themes and every supported import order, on Windows, Linux and macOS.

**Acceptance Scenarios**:

1. **Given** no attribute anywhere and an OS preference of dark, **Then** light values apply.
2. **Given** `data-neshel-theme="light"` on the root and OS dark, **Then** light values apply.
3. **Given** `data-neshel-theme="system"`, **Then** values follow the OS preference.
4. **Given** a dark root and a subtree with `data-neshel-theme="light"`, **Then** the subtree and
   its descendants compute light values for **all** roles (no dark leakage).
5. **Given** a named theme `sepia` extending `light` on a subtree inside a dark root, **Then** the
   subtree computes `sepia` values for all roles, with non-overridden roles equal to light.

---

### User Story 4 — Typed configuration (Priority: P2)

A developer writes `neshel.config.ts` with `defineConfig()` and gets completion and type errors
for unknown roles, wrong value types and invalid theme shapes.

**Why this priority**: entry of the configured mode; its types are public contract.

**Independent Test**: type fixtures (positive and `@ts-expect-error` negative); the browser-safe
entry imports nothing and has no runtime dependencies.

**Acceptance Scenarios**:

1. **Given** a misspelled role (`primay`), **Then** TypeScript reports an error.
2. **Given** a named theme without `extends`, **Then** TypeScript reports an error.
3. **Given** `defineConfig(x)`, **Then** it returns `x` unchanged at runtime.
4. **Given** a browser bundle importing only `defineConfig`, **Then** it contains no contract data,
   validator, colour library or Node built-in.

---

### User Story 5 — Validate and generate CSS from configuration (Priority: P2)

A developer runs `neshel validate` and `neshel generate` (chained before `dev`/`build`) to check
the configuration and write a static stylesheet that overrides the defaults.

**Why this priority**: delivers the configured mode on the same token contract.

**Independent Test**: CLI fixture tests in temporary paths with spaces and Unicode; an external
configured consumer built from packed tarballs; browser test confirms overrides.

**Acceptance Scenarios**:

1. **Given** a valid config, **When** `neshel generate` runs, **Then** it writes the output, exits
   0 and prints the relative path and warnings.
2. **Given** the same config on Windows, Linux and macOS, **Then** the output is byte-identical.
3. **Given** `themes.dark.colors.primary: "navy"`, **Then** the CLI reports that path, the value
   and accepted formats, writes nothing and exits 1.
4. **Given** a custom theme with a 3.1:1 `accentForeground`/`accent` pair, **Then** `generate`
   warns and exits 0; with `--strict` or `contrast: "error"` it exits 1 and writes nothing.
5. **Given** an up-to-date output, **When** `generate --check` runs, **Then** exit 0 without
   writing; stale or missing output exits 4.
6. **Given** no config file, **Then** the CLI lists the searched names and exits 3.
7. **Given** the canonical import order, **Then** configured values compute in the browser for
   every theme, including nested scopes.

### Edge Cases

- Two config candidates in one directory → ambiguity error, exit 3.
- Config throws, has a syntax error or lacks an object default export → exit 3 with file and
  loader message; stack only with `--debug`.
- Unknown keys anywhere → error with "did you mean" when edit distance ≤ 2.
- Named colours, `var()`, `color-mix()`, `light-dark()`, relative colour syntax, `lab()`/`lch()`
  and other spaces → error (unsupported syntax in 0.x).
- Alpha < 1 on any role other than `border` → error; alpha allowed on `border` only.
- Colours outside the sRGB gamut (e.g. wide `oklch()`) → warning; contrast is computed after CSS
  gamut mapping to sRGB.
- Theme names: `system` reserved; `light`/`dark` cannot declare `extends`; names must match
  `^[a-z][a-z0-9-]{0,31}$`; `extends` must be `light` or `dark`.
- Output path inside `node_modules`, equal to the config file, an existing directory, or not
  ending in `.css` → nothing written; exit 2 when given by `--out`, exit 1 (`invalid-output`)
  when given by the config's `output`.
- Output unchanged → not rewritten (mtime preserved).
- Unlayered consumer overrides beat every Neshel layer, including dark — documented, with a
  regression test showing the documented scoped pattern works.
- An element combining `data-neshel-theme` with a Tailwind `scheme-*` utility: under the
  canonical import order Neshel layers come later than Tailwind's and set `color-scheme`;
  documented.
- Two different generated configurations on one document: unsupported; later CSS wins.
- `typography.metrics` → shape validated, `info` diagnostic, no CSS.

## Requirements _(mandatory)_

### Functional Requirements

**Token contract**

- **FR-001**: `@neshel-ui/config` MUST define the fixed vocabulary of
  [contracts/tokens.md](contracts/tokens.md) as `--neshel-*` custom properties for each built-in
  theme and MUST keep every Phase 001 token name with the same meaning.
- **FR-002**: Default themes MUST use the approved navy/ivory/gold palette (D3); brand reference
  colours are not required to appear verbatim as tokens. No component package may hardcode
  brand colours.
- **FR-003**: Every built-in theme MUST meet the contrast pairs in
  [contracts/tokens.md](contracts/tokens.md), verified by an automated test using the same
  contrast implementation as the CLI.
- **FR-004**: The disabled pair and `border` MUST be documented as contrast-exempt.

**Stylesheets and cascade**

- **FR-005**: `./tokens.css` MUST contain only standard CSS (custom properties, `color-scheme`,
  `@layer`, `@media`) and work without Tailwind.
- **FR-006**: `./tailwind.css` MUST contain the token declarations plus an `@theme inline`
  mapping for `*-neshel-*` colour, radius and font utilities, without unprefixed theme variables.
- **FR-007**: `./styles.css` MUST be byte-identical to `./tailwind.css` and documented as a 0.x
  compatibility alias.
- **FR-008**: Every Neshel stylesheet MUST begin with `@layer neshel.defaults, neshel.config;`;
  shipped tokens live in `neshel.defaults`, generated tokens in `neshel.config`.
- **FR-009**: Every theme block (shipped and generated, built-in and named) MUST declare all 21
  colour roles and `color-scheme`; theme-independent tokens are declared on `:root`.
- **FR-010**: Theme selection MUST follow D1 and D5 via `data-neshel-theme` on the root or any
  element; no attribute ⇒ light.
- **FR-011**: The documentation MUST define the canonical import order and MUST claim import-order
  independence only for orders verified by SC-005.
- **FR-012**: No Neshel stylesheet may contain selectors other than `:root` and
  `[data-neshel-theme=…]`, resets, `@font-face` or `url()`.
- **FR-013**: Shipped stylesheets MUST be produced by the CLI's generator from the `defaults`
  exported by `@neshel-ui/config`; a test MUST fail on drift between the committed stylesheet
  sources and the generator output.

**Configuration API**

- **FR-014**: `@neshel-ui/config` `.` MUST export `defineConfig`, the public types and the
  contract data `colorRoles`, `contrastPairs` and `defaults`; it MUST have no runtime dependencies,
  no Node built-ins and no side effects, and expose no subpath other than the stylesheets.
- **FR-015**: The configuration MUST support: `version` (only `1`), partial `light`/`dark`
  overrides, named themes (D5), radius base and scale, spacing unit, font families
  (`body`, `display`, `mono`), focus width/offset, contrast policy, output path and reserved
  `typography.metrics`.
- **FR-016**: Unspecified values MUST resolve to `defaults`; resolution order is documented and
  deterministic.
- **FR-017**: Structural validation MUST reject unknown keys, wrong types, invalid lengths, font
  stacks and theme names with diagnostics containing the path, the received value and the
  expected form, reporting all problems in one pass, sorted by path.

**Colour and contrast**

- **FR-018**: The CLI MUST accept only `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`, `rgb()`/`rgba()`,
  `hsl()`/`hsla()` and `oklch()` and parse them with Color.js restricted to the sRGB, HSL and OKLCH
  spaces.
- **FR-019**: Contrast MUST be computed as the WCAG 2.1 relative-luminance ratio on colours
  gamut-mapped to sRGB; diagnostics state pair, measured ratio (2 decimals) and threshold and never
  claim WCAG conformance.
- **FR-020**: Effective contrast policy MUST be `error` when `--strict` is passed, otherwise the
  config's `contrast` value, otherwise `warn`; configuration cannot weaken `--strict`.

**CLI**

- **FR-021**: `@neshel-ui/cli` MUST provide `neshel validate` and `neshel generate` with the options,
  discovery, loading and exit codes of [contracts/cli.md](contracts/cli.md).
- **FR-022**: The CLI MUST load `.ts`, `.mts`, `.js` and `.mjs` configs with `jiti` on Node
  `>=22.13` on Windows, Linux and macOS, without writing cache files.
- **FR-023**: Generation MUST run only on explicit command; no package may declare install
  lifecycle scripts.
- **FR-024**: Generated CSS MUST be byte-identical for identical input across OS and Node versions:
  fixed ordering, LF, trailing newline, header without timestamps, versions or absolute paths.
- **FR-025**: `generate` MUST resolve and validate the output path per contract, write atomically
  (temporary sibling + rename), skip unchanged content, and write nothing when validation fails.
- **FR-026**: `generate --check` MUST compare without writing and exit 4 when output is missing or
  stale.
- **FR-027**: The CLI documentation MUST state that configuration files are executable, trusted
  project code.

**Distribution and gates**

- **FR-028**: `check:pack` MUST validate the stylesheet exports, the absence of other config
  subpaths, `config`'s zero runtime dependencies and `node:`-free entry, and `cli`'s exact runtime
  dependency set (`jiti`, `colorjs.io`) and its peer dependency on `@neshel-ui/config`.
- **FR-029**: `check:consumer` MUST cover a Tailwind consumer, a Tailwind-free consumer and a
  configured consumer (packed CLI), each with TypeScript, in a path with spaces and Unicode.
- **FR-030**: A browser check MUST verify computed styles for the precedence matrix and import
  orders on the three native CI OSes.
- **FR-031**: Internal apps MUST migrate to the new imports and demonstrate light/dark/system,
  a named theme and a nested scope; Storybook MUST document every token pair.
- **FR-032**: README, `docs/theming.md`, `docs/package-contracts.md`, `docs/architecture.md`
  and a changeset MUST describe both modes, precedence, the canonical import order and the
  intentional pre-1.0 changes.

### Key Entities

See [data-model.md](data-model.md): Token role, Contrast pair, Theme (built-in/named),
NeshelConfig, ResolvedConfig, Diagnostic, Stylesheet, Output target.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Tailwind and Tailwind-free consumers each build from packed tarballs with one
  stylesheet import and no configuration file, on Linux, Windows and macOS.
- **SC-002**: 100% of built-in contrast pairs meet their thresholds in automated tests; the
  ratios are published in the token documentation.
- **SC-003**: Generated CSS for the golden fixtures is byte-identical across the five CI jobs.
- **SC-004**: Every documented CLI failure mode has a negative test asserting exit code and
  diagnostic path (at least one per exit code and per validation rule family).
- **SC-005**: The precedence matrix (no attribute / light / dark / system / named × OS light/dark ×
  nested scope × supported import orders × Tailwind and plain CSS) passes automated computed-style
  browser tests on the three CI OSes.
- **SC-006**: Importing only `defineConfig` adds < 1 kB minified to a consumer bundle;
  `@neshel-ui/config` keeps zero runtime dependencies.
- **SC-007**: A developer goes from no configuration to a custom theme in a running app using only
  the documented commands ([quickstart.md](quickstart.md) walk-through recorded in evidence).

## Milestones

| ID    | Scope                                                                                                 | Exit gate                                                                        |
| ----- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| 002.0 | Clarified spec, contracts, research, accepted ADRs 0006/0007, plan, tasks, analysis                   | Owner review (this milestone)                                                    |
| 002.1 | Contract data in `config`; CLI generator core + Color.js contrast; shipped stylesheets; apps migrated | Contrast + drift + golden tests; `check:pack`; Tailwind `check:consumer`; CI 5/5 |
| 002.2 | Cascade proof: Tailwind-free consumer, automated browser check, Storybook token/precedence stories    | SC-001 and SC-005 (shipped CSS) on CI 5/5                                        |
| 002.3 | `defineConfig()` types + structural and colour validation with diagnostics                            | Type fixtures; validator negative tests; SC-006                                  |
| 002.4 | CLI commands: discovery, jiti loading, `validate`, `generate`, `--check`, `--strict`, atomic writes   | CLI negative matrix in spaces/Unicode paths; SC-003, SC-004 on CI 5/5            |
| 002.5 | Configured consumer from packed CLI; browser check with generated CSS; docs, changeset, evidence      | All consumers + browser check CI 5/5; SC-001–SC-007 traced; owner approval       |

Detailed tasks and gates: [tasks.md](tasks.md) and [plan.md](plan.md).

## Assumptions

- Consumers using `tailwind.css` run Tailwind CSS v4.1+; Tailwind v3 is unsupported.
- Target browsers support cascade layers and `prefers-color-scheme` (evergreen since 2022).
- Configuration files execute with the consumer's privileges (same model as `vite.config.ts`);
  no sandbox is provided or claimed.
- WCAG 2.x relative luminance is the contrast measure; APCA is not used.
- Font loading remains the consumer's responsibility.
- GitHub-hosted Windows, Linux and macOS runners provide Google Chrome for the browser check
  (verified in 002.2; a missing browser fails CI rather than skipping).
- `@neshel-ui` npm scope availability remains unverified; nothing is published.
