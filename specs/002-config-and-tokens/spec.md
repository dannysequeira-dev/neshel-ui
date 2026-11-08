# Feature Specification: Design tokens, semantic theming and consumer configuration

**Feature Branch**: `main` (spec directory `specs/002-config-and-tokens`; no feature branch created)

**Created**: 2026-11-07

**Status**: Draft — proposed architecture awaiting owner review. Nothing in this feature is
implemented. Decisions marked **Proposed** become binding only after owner approval and the
acceptance of ADR 0006 and ADR 0007.

**Input**: Owner brief "Neshel-UI — Phase 002: Design Tokens & Theming" (2026-11-07) and
[brief.md](brief.md) with its nine readiness decisions.

Companion documents:

- [research.md](research.md) — decisions, rationale, tradeoffs, brief audit and ADR conflicts.
- [contracts/tokens.md](contracts/tokens.md) — semantic token vocabulary, default palette,
  contrast pairs.
- [contracts/css.md](contracts/css.md) — stylesheet exports, cascade layers, theme selection.
- [contracts/config-api.md](contracts/config-api.md) — `defineConfig()` and the engine API.
- [contracts/cli.md](contracts/cli.md) — commands, discovery, diagnostics, exit codes.
- ADRs (Proposed): [0006](../../docs/decisions/0006-token-stylesheets-and-theme-cascade.md),
  [0007](../../docs/decisions/0007-config-engine-and-cli-loading.md).

## Problem

Phase 001 ships an experimental stylesheet with nine violet `--neshel-*` variables, light and
dark selectors, and Tailwind utilities in one file. There is no token contract, no
accessibility guarantee, no way to configure a theme other than hand-writing CSS overrides,
and the colours do not reflect the Neshel brand (navy-blue rose, subtle gold). Every later
package (layout, typography, components) needs a stable, semantic token contract to build on.

## Goals

1. One semantic token contract shared by a zero-config mode and a configured mode.
2. Default visual theme derived from the Neshel identity, verified against WCAG AA pairs.
3. Plain CSS tokens usable without Tailwind; a separate Tailwind v4 integration.
4. Light, dark and system-preference themes with predictable precedence, no React provider.
5. A typed `defineConfig()` and a Node-only CLI that validates configuration and writes
   deterministic static CSS on explicit command.

## Non-goals

- Layout primitives (feature 003), typography components and Capsize calculations
  (feature 004), interactive components (feature 005).
- A Vite/Next plugin, watch mode, `neshel init` scaffolding, a theme editor UI.
- User-defined token roles beyond the fixed vocabulary (future extension point).
- Runtime theme persistence helpers (e.g. a script that stores the user's choice).
- Publishing any package or removing a `private` guard.

## Clarifications

### Session 2026-11-07 — decisions proposed by the specification pass

Each item below is a **proposed** answer pending owner review. Rationale and alternatives
are in [research.md](research.md); the five items needing an owner decision are marked ⚑.

- Q: Which token vocabulary? → A (R1): fixed semantic vocabulary of 21 colour roles
  (background, surface, muted, primary, secondary, accent, destructive, selected, disabled —
  each with a foreground — plus border, input, focus), a radius scale derived from one base,
  one spacing unit, three font families and focus-ring geometry. All Phase 001 names are kept.
- Q: Contrast policy? → A (R2): built-in themes MUST meet 4.5:1 for text pairs and 3:1 for
  focus/input boundaries, enforced by tests. Custom themes receive the same checks as
  diagnostics: warnings by default, errors with `--strict` or `contrast: "error"`. Passing
  checks is never presented as WCAG conformance.
- Q: CSS export names? → A (R3): `./tokens.css` (plain custom properties) and
  `./tailwind.css` (tokens plus `@theme inline`). ⚑ `./styles.css` is kept as a deprecated
  alias of `./tailwind.css` during 0.x (recommended) or removed.
- Q: Cascade and theme selection? → A (R4): cascade layers `neshel.defaults` <
  `neshel.config`, declared at the top of every Neshel stylesheet, so generated tokens win
  regardless of import order. `[data-neshel-theme="light|dark|system"]` on any element.
  ⚑ Whether a page with no attribute follows the OS preference (recommended: no — light,
  as in Phase 001; `system` is opt-in).
- Q: Tailwind namespace? → A (R5): keep `*-neshel-*` utilities via `--color-neshel-*`,
  `--radius-neshel-*`, `--font-neshel-*`; the `--neshel-` and `--*-neshel-` prefixes are
  reserved; no unprefixed utilities.
- Q: How does the CLI load `neshel.config.ts`? → A (R6): ⚑ through `jiti` (single runtime
  dependency of `@neshel-ui/cli`, recommended) rather than raising the CLI floor to a Node
  version with unflagged type stripping. Discovery in the working directory only.
- Q: Validation approach? → A (R7): hand-written validators in a browser-safe engine inside
  `@neshel-ui/config` (no schema dependency), path-specific diagnostics, documented exit codes.
- Q: Testing TypeScript sources? → A (R8): keep `node:test`; tests import built `dist` output;
  type-level tests run through `tsc` with `@ts-expect-error` fixtures.
- Q: Gate extensions? → A (R9): `check:pack` expects the new CSS subpaths and the engine
  entry, and asserts browser-safe entries import no `node:` modules; `check:consumer` gains a
  Tailwind-free consumer and a configured consumer driven by the packed CLI.
- Q: Default palette? → A (R10): ⚑ navy/gold values sampled from the approved logo and
  listed in [contracts/tokens.md](contracts/tokens.md); all built-in pairs pass AA
  (computed 2026-11-07). Brand artwork is not modified.
- Q: Named themes beyond light/dark? → A (R11): ⚑ allowed in configuration
  (`extends: "light" | "dark"`), selected with the same attribute (recommended), or deferred.
- Q: Font metrics? → A (R12): `typography.metrics` is a reserved, shape-validated key that
  produces no CSS in feature 002; Capsize output is feature 004.

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Zero-config tokens with Tailwind (Priority: P1)

A developer installs `@neshel-ui/config`, adds one stylesheet import after Tailwind and gets
the Neshel navy/gold theme, semantic utilities (`bg-neshel-primary`,
`text-neshel-primary-foreground`, `rounded-neshel-md`) and dark mode by setting
`data-neshel-theme="dark"` — with no configuration file, CLI or provider.

**Why this priority**: it is the default experience and the base every package builds on.

**Independent Test**: an external Vite + Tailwind app built from the packed tarball contains
every token declaration and utility; switching the attribute changes computed colours.

**Acceptance Scenarios**:

1. **Given** a fresh app with Tailwind v4, **When** it imports `@neshel-ui/config/tailwind.css`
   after `tailwindcss`, **Then** the build contains all `--neshel-*` declarations for light
   and dark and every used `*-neshel-*` utility references its variable.
2. **Given** that app, **When** `<html data-neshel-theme="dark">` is set, **Then** every colour
   role resolves to its dark value and `color-scheme` is `dark`.
3. **Given** only the package is installed, **When** no stylesheet is imported, **Then** no
   Neshel CSS appears in the output (installation injects nothing).
4. **Given** an app still importing `@neshel-ui/config/styles.css`, **When** it builds,
   **Then** it receives the same CSS as `tailwind.css` (if the alias is kept, ⚑ Q2).

---

### User Story 2 — Plain CSS tokens without Tailwind (Priority: P1)

A developer who does not use Tailwind imports `@neshel-ui/config/tokens.css` and uses
`var(--neshel-primary)` in their own CSS.

**Why this priority**: the constitution requires interoperable CSS custom properties; the
token contract must not depend on Tailwind.

**Independent Test**: an external Vite app without Tailwind builds from the packed tarball;
its CSS contains the token declarations, the layer order statement and no `@theme` rule.

**Acceptance Scenarios**:

1. **Given** a Vite app with no Tailwind, **When** it imports `tokens.css`, **Then** the build
   succeeds without unknown at-rule warnings and contains every `--neshel-*` declaration.
2. **Given** that app, **When** it reads `getComputedStyle(root).getPropertyValue("--neshel-background")`,
   **Then** it gets the light default (browser verification).

---

### User Story 3 — Predictable theme switching and precedence (Priority: P1)

A developer switches between light, dark and system themes by setting one attribute on the
root or on any subtree, with explicit choices always overriding the OS preference.

**Why this priority**: theme precedence is part of the public contract; getting it wrong
later is a breaking change.

**Independent Test**: a Storybook story and the playground expose light/dark/system and a
nested scope; browser verification under emulated `prefers-color-scheme` records computed
values for each combination in a precedence matrix.

**Acceptance Scenarios**:

1. **Given** `data-neshel-theme="light"` on the root and an OS preference of dark,
   **Then** light values apply.
2. **Given** `data-neshel-theme="system"` on the root, **When** the OS preference is dark,
   **Then** dark values apply; **When** it is light, **Then** light values apply.
3. **Given** a dark root and a subtree with `data-neshel-theme="light"`, **Then** the subtree
   uses light values and its descendants inherit them.
4. **Given** no attribute anywhere, **Then** the behaviour matches the owner's decision on
   ⚑ Q1 (recommended: light).

---

### User Story 4 — Typed configuration (Priority: P2)

A developer creates `neshel.config.ts` with `defineConfig()` and gets autocompletion and type
errors for unknown roles, wrong value types and invalid theme names.

**Why this priority**: entry point of the configured mode; useless without the CLI (US-5),
but its types are a public contract that can be tested alone.

**Independent Test**: type-level fixtures compile; negative fixtures fail with
`@ts-expect-error`; the public entry imports no Node modules and has no runtime dependencies.

**Acceptance Scenarios**:

1. **Given** a config with a misspelled role (`primay`), **Then** TypeScript reports an error.
2. **Given** `defineConfig(x)`, **Then** it returns `x` unchanged at runtime.
3. **Given** a browser bundle that imports `@neshel-ui/config`, **Then** it contains no
   validator, generator or Node built-in code.

---

### User Story 5 — Validate and generate CSS from configuration (Priority: P2)

A developer runs `neshel validate` and `neshel generate` (e.g. in `predev`/`prebuild`) to
check the configuration and write a static stylesheet that overrides the defaults,
regardless of whether it is imported before or after the Neshel stylesheet.

**Why this priority**: delivers the fully configurable mode on the same token contract.

**Independent Test**: CLI fixtures in temporary directories (paths with spaces and Unicode)
cover discovery, load failures, schema errors, contrast diagnostics, `--strict`, `--check`
and output determinism; an external configured consumer builds from packed tarballs.

**Acceptance Scenarios**:

1. **Given** a valid config, **When** `neshel generate` runs, **Then** it writes the output
   file, exits 0 and prints the path and any warnings.
2. **Given** the same config on Windows, Linux and macOS, **Then** the output is
   byte-identical (LF, no timestamps, no absolute paths).
3. **Given** an invalid colour at `themes.dark.colors.primary`, **Then** the CLI prints that
   path, the received value and the accepted formats, writes nothing and exits 1.
4. **Given** a custom theme with a 3.1:1 `accentForeground`/`accent` pair, **Then**
   `generate` warns and exits 0; with `--strict` it exits 1 and writes nothing.
5. **Given** an up-to-date output, **When** `neshel generate --check` runs, **Then** it exits
   0 without writing; **Given** a stale output, **Then** it exits 4.
6. **Given** no config file, **Then** the CLI explains the searched names and exits 3.
7. **Given** the generated file imported before `tailwind.css`, **Then** configured values
   still win over defaults.

### Edge Cases

- Two config candidates (`neshel.config.ts` and `neshel.config.mjs`) in the same directory →
  ambiguity error, exit 3.
- Config throws at import, has a syntax error, or has no default export → exit 3 with the
  loader message and file path; no stack trace unless `--debug`.
- Unknown keys anywhere → error with a "did you mean" suggestion when the edit distance ≤ 2.
- Colours with alpha, `var()`, `color-mix()` or named colours on contrast-checked roles →
  error (contrast cannot be computed deterministically); alpha is allowed on `border`.
- Theme names `system` (reserved), uppercase, or with characters outside `[a-z0-9-]` → error.
- Named theme `extends` an unknown or custom theme → error (no chains in 0.x).
- Output path inside `node_modules` or equal to the config file → error, exit 2.
- Output unchanged → file is not rewritten (preserves mtime, avoids dev-server reload loops).
- Unlayered consumer overrides on `:root` beat every layered theme, including dark — this
  is documented with the recommended scoped override pattern.
- Two different generated configurations on one document are unsupported; the later one wins
  per CSS order (documented).
- `typography.metrics` present → shape validated, informational note "reserved for
  feature 004", no CSS emitted.

## Requirements _(mandatory)_

### Functional Requirements

**Token contract**

- **FR-001**: `@neshel-ui/config` MUST define the fixed semantic vocabulary in
  [contracts/tokens.md](contracts/tokens.md) as `--neshel-*` custom properties for every
  built-in theme, and MUST keep every Phase 001 token name with the same meaning.
- **FR-002**: The default light and dark themes MUST use the navy/gold palette approved for
  feature 002 (⚑ Q3). No component package may hardcode brand colours.
- **FR-003**: Every built-in theme MUST meet the contrast pairs in
  [contracts/tokens.md](contracts/tokens.md) (4.5:1 text, 3:1 focus/input boundaries), verified
  by an automated test computing WCAG 2.x relative luminance.
- **FR-004**: The disabled pair and `border` MUST be documented as exempt from contrast
  minimums, with that exemption stated rather than hidden.

**Stylesheets and cascade**

- **FR-005**: `./tokens.css` MUST contain only standard CSS (custom properties, `color-scheme`,
  `@layer`, `@media`) and MUST work without Tailwind.
- **FR-006**: `./tailwind.css` MUST contain the token declarations plus an `@theme inline`
  mapping exposing `*-neshel-*` colour, radius and font utilities; it MUST NOT emit
  unprefixed theme variables or override Tailwind defaults.
- **FR-007**: The fate of `./styles.css` MUST follow ⚑ Q2; if kept, its content MUST equal
  `./tailwind.css` and it MUST be documented as deprecated.
- **FR-008**: Every Neshel stylesheet (shipped or generated) MUST begin with the same layer
  order statement so generated values override defaults independent of import order.
- **FR-009**: Theme selection MUST use `data-neshel-theme` with values `light`, `dark`,
  `system` and configured theme names, on the root or any element; explicit values MUST
  override the OS preference; `system` MUST follow `prefers-color-scheme`.
- **FR-010**: Each theme block MUST set `color-scheme` consistently with its colours.
- **FR-011**: No Neshel stylesheet may contain element/universal selectors, resets, `@font-face`
  or remote URLs.
- **FR-012**: Shipped stylesheets MUST be produced by the same engine that generates consumer
  CSS, from the built-in default configuration (single source of truth), and the build MUST be
  deterministic.

**Configuration API**

- **FR-013**: `@neshel-ui/config` MUST export `defineConfig()` and its types from `.`; this
  entry MUST have no runtime dependencies, no Node built-ins and no side effects.
- **FR-014**: The configuration MUST support: schema `version` (only `1`), partial overrides
  of `light` and `dark` colour roles, named themes (⚑ Q5), radius base and scale overrides,
  spacing unit, font families (`body`, `display`, `mono`), focus-ring width/offset, contrast
  mode, output path, and reserved `typography.metrics`.
- **FR-015**: Unspecified values MUST resolve to the built-in defaults; resolution order MUST
  be documented and deterministic.
- **FR-016**: A browser-safe engine entry (`@neshel-ui/config/engine`) MUST provide
  validation, resolution, contrast checking and CSS generation as pure functions with no I/O.
- **FR-017**: Validation MUST reject unknown keys, invalid colours, lengths, font stacks and
  theme names with diagnostics that include the config path, the received value and the
  expected form.

**CLI**

- **FR-018**: `@neshel-ui/cli` MUST provide `neshel validate` and `neshel generate` with the
  options, discovery rules and exit codes in [contracts/cli.md](contracts/cli.md).
- **FR-019**: The CLI MUST load `.ts`, `.mts`, `.js` and `.mjs` configs on every supported Node
  version (`>=22.13`) on Windows, Linux and macOS.
- **FR-020**: Generation MUST run only on explicit command; no package may declare install
  lifecycle scripts.
- **FR-021**: Generated CSS MUST be byte-identical for identical input on every supported OS
  and Node version: fixed ordering, LF, trailing newline, header without timestamps or paths.
- **FR-022**: `generate` MUST write atomically, MUST NOT rewrite unchanged content and MUST
  write nothing when validation fails.
- **FR-023**: `generate --check` MUST compare without writing and exit 4 when stale.
- **FR-024**: Contrast diagnostics MUST state the pair, the measured ratio and the threshold,
  and MUST NOT claim WCAG conformance.

**Distribution and gates**

- **FR-025**: `check:pack` MUST validate the new exports, the engine entry and the CLI's
  runtime dependency on `@neshel-ui/config`, and MUST fail if a browser-safe entry imports a
  `node:` module or if `config` gains a runtime dependency.
- **FR-026**: `check:consumer` MUST cover a Tailwind consumer (`tailwind.css`), a Tailwind-free
  consumer (`tokens.css`) and a configured consumer (packed CLI generates CSS that overrides
  defaults), in a path with spaces and Unicode.
- **FR-027**: Internal apps (playground, Storybook) MUST migrate to the new imports and show
  light/dark/system and a nested scope; Storybook MUST document every token pair.
- **FR-028**: README, `docs/theming.md`, `docs/package-contracts.md` and a changeset MUST
  describe both modes, the precedence rules and any intentional pre-1.0 change.

### Key Entities

- **Token role**: a semantic name (e.g. `primary`), its CSS variable, its pairing and contrast
  threshold, and whether Tailwind exposes it.
- **Theme**: a named set of colour role values with a `color-scheme`; built-in `light`/`dark`,
  optional named themes extending one of them.
- **Configuration**: versioned user input (`NeshelConfig`), resolved against defaults into a
  complete `ResolvedConfig`.
- **Diagnostic**: severity (`error`/`warning`/`info`), config path, code, message.
- **Stylesheet**: shipped (`tokens.css`, `tailwind.css`, alias) or generated; each carries the
  layer order statement and theme blocks.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A Tailwind consumer and a Tailwind-free consumer each build from packed
  tarballs with one stylesheet import and zero configuration files, on Linux, Windows and macOS.
- **SC-002**: 100% of built-in contrast pairs meet their thresholds in automated tests; the
  computed ratios are published in the token documentation.
- **SC-003**: Generated CSS for the golden fixtures is byte-identical across the five CI jobs.
- **SC-004**: Every documented CLI failure mode has a negative test asserting exit code and
  diagnostic path (at least one test per exit code and per validation rule family).
- **SC-005**: The precedence matrix (no attribute / light / dark / system × OS light/dark ×
  nested scope × import order) is verified in a real browser with recorded computed values.
- **SC-006**: The browser-safe `@neshel-ui/config` entry imports nothing and adds < 1 kB
  (minified) to a consumer bundle; `config` keeps zero runtime dependencies.
- **SC-007**: A developer can go from no configuration to a custom theme applied in a running
  app using only the documented commands (quickstart walk-through recorded in evidence).

## Milestones _(proposed)_

Each milestone is independently verifiable and stops for review.

| ID    | Scope                                                                                                                                              | Exit gate                                                                                                 |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 002.0 | This specification, research, contracts; ADR 0006/0007 accepted; owner answers ⚑ Q1–Q5; then `/speckit-plan`, `/speckit-tasks`, `/speckit-analyze` | Owner approval; analyze reports no critical issue                                                         |
| 002.1 | Engine core (resolve, contrast, CSS generation) + built-in themes; build emits `tokens.css`, `tailwind.css` (+ alias); internal apps migrated      | Contrast tests, golden CSS, `check:pack`, updated Tailwind `check:consumer`, CI 5/5                       |
| 002.2 | Theme cascade proof: Tailwind-free consumer, Storybook token/precedence stories, playground system + nested scope                                  | Tailwind-free consumer CI 5/5; browser precedence matrix recorded (SC-005)                                |
| 002.3 | `defineConfig()` types + engine validation and diagnostics                                                                                         | Type fixtures (positive/negative), validator negative tests, browser-safety check                         |
| 002.4 | CLI: discovery, TS loading, `validate`, `generate`, `--check`, `--strict`, exit codes, atomic writes                                               | CLI fixture tests incl. spaces/Unicode paths; determinism across 5 CI jobs (SC-003, SC-004)               |
| 002.5 | Configured external consumer from packed CLI + config; docs, changeset, evidence and traceability; phase closure                                   | `check:consumer` (all three consumers) CI 5/5; SC-001–SC-007 traced; owner approval (no publish, no push) |

## Assumptions

- Consumers use Tailwind CSS v4.1+ when they use `tailwind.css`; Tailwind v3 is unsupported.
- Target browsers support CSS cascade layers and `prefers-color-scheme` (all evergreen
  browsers since 2022); no fallback for older engines is provided.
- Running a configuration file executes the consumer's own code with their privileges, the
  same trust model as `vite.config.ts`; the CLI provides no sandbox.
- WCAG 2.x relative-luminance contrast is the measurement; APCA is not used.
- Font loading remains the consumer's responsibility; families are names, not files.
- `@neshel-ui` npm scope availability remains unverified; nothing is published.
