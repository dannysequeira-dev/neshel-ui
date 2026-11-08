# Feature Specification: Typography system and custom responsive breakpoints

**Feature Branch**: `main` (spec directory `specs/004-typography-breakpoints`; no feature branch)

**Created**: 2026-11-08

**Status**: Specified (004.0). Implementation status is tracked in [tasks.md](tasks.md) and
[evidence.md](evidence.md). No package is published.

**Input**: Owner brief "Neshel-UI — Phase 004: Typography System & Custom Responsive Breakpoints"
(2026-11-08), summarised in [brief.md](brief.md). The brief is authoritative and pre-authorises
autonomous execution of all milestones.

Companion documents: [research.md](research.md) (spikes S1–S3, decisions R1–R14),
[plan.md](plan.md), [tasks.md](tasks.md), [data-model.md](data-model.md),
[quickstart.md](quickstart.md), [analysis.md](analysis.md), contracts
[breakpoints.md](contracts/breakpoints.md), [generation.md](contracts/generation.md),
[typography-api.md](contracts/typography-api.md), [typography-css.md](contracts/typography-css.md);
ADRs [0010](../../docs/decisions/0010-custom-breakpoints.md) and
[0011](../../docs/decisions/0011-typography-capsize.md).

## Problem

Breakpoints are fixed to `sm md lg xl 2xl` (feature 003), so applications cannot use their own
viewport vocabulary, and `@neshel-ui/typography` is an empty placeholder: there are no semantic
text primitives and the reserved font-metric configuration (feature 002) produces nothing.

## Goals

1. Consumer-defined breakpoints (`extend` / `replace`) shared by Layout and Typography, with
   types that know the configured names, generated CSS with resolved thresholds, optional Tailwind
   v4 synchronisation, and unchanged zero-config behaviour.
2. `Heading`, `Text`, `Paragraph`, `Caption` with static and responsive props, semantic elements
   independent of visual size, `as`/`asChild`, refs, SSR safety and distributed CSS.
3. Capsize-precise typography: real font metrics, cap-height-based sizing, trimming that follows
   size and leading at every breakpoint, metric-adjusted fallback fonts.
4. Evidence from unit, type, browser and packed external-consumer tests on three operating
   systems.

## Non-goals

- `Title`, `Subtitle`, `Label`, `Code` components (R9), a configurable type scale, container
  queries, `text-box-trim` (R11, future), font loading or bundling, a Next.js consumer (006).
- Publishing, releases, tags, removing `private`, Phase 005.

## Clarifications

### Session 2026-11-08 — owner brief and agent decisions

The brief answers the scope questions; the remaining ambiguities were resolved within its
authority (research R1–R14):

- Q: Configuration shape? → A (R1): `breakpoints: { mode: "extend" | "replace", values, tailwind }`
  plus top-level `types` for the declarations path.
- Q: How does the runtime cascade custom breakpoints without knowing their order? → A (R3): it
  does not need to; one class per written key, CSS source order and custom properties resolve the
  cascade and precedence.
- Q: JavaScript validation of unknown names? → A (R4): grammar/value errors throw everywhere;
  unknown well-formed names are compile-time errors (TS) and one browser `console.warn` per key
  (JS) based on `--neshel-breakpoints`; no false promise of runtime rejection.
- Q: Required `base`? → A (R7): stays optional, as in the accepted Phase 003 contract.
- Q: How do types remove default names in `replace` mode? → A (R6): conditional type over an
  augmentable registry interface in `@neshel-ui/config`.
- Q: Extra typography components? → A (R9): none in 004.
- Q: Capsize without per-combination CSS? → A (S1, R10, R11): per-font constants plus `em`
  trims driven by custom properties.

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Application-specific breakpoints (Priority: P1)

A developer declares `phone`, `phoneXL`, `tablet`, `laptop`, `desktop`, `wide` in
`neshel.config.ts`, runs `neshel generate`, and uses those names in Layout props.

**Independent Test**: CLI unit/golden tests; a packed consumer in `replace` mode builds,
type-checks, server-renders, hydrates and shows the expected computed styles at and just below
every threshold.

**Acceptance Scenarios**:

1. **Given** `mode: "replace"` with `tablet: "48rem"`, **When** `<Grid columns={{ base: 1, tablet: 2 }}>`
   renders at 767 px / 768 px, **Then** it has 1 / 2 tracks.
2. **Given** the same config, **When** a TSX file uses `{ md: 2 }`, **Then** type checking fails;
   **When** it uses `{ tablet: 2 }`, **Then** it passes with completion for configured names.
3. **Given** `mode: "extend"` with `phone: "30rem"`, **Then** `{ base, phone, sm, md }` all work and
   `phone` (30rem) applies before `sm` (40rem).
4. **Given** duplicate widths, non-`rem` units, reserved or malformed names, **Then**
   `neshel validate` exits 1 with a diagnostic naming the key.

### User Story 2 — Zero-config consumers keep working (Priority: P1)

**Independent Test**: Phase 003 unit, browser and consumer checks pass unchanged in behaviour;
consumers without a config use `sm … 2xl` with the shipped stylesheets.

**Acceptance Scenarios**:

1. **Given** no `neshel.config.ts`, **Then** `<Stack space={{ base: "2", md: "6" }}>` behaves as in
   Phase 003 and `{ tablet: "6" }` is a type error.
2. **Given** a JavaScript app passing `{ tablet: "6" }`, **Then** it renders, the browser console
   shows one Neshel warning naming `tablet`, and `{ "Tablet-X": "6" }` throws.

### User Story 3 — Semantic, responsive typography (Priority: P1)

**Independent Test**: unit tests (DOM, classes, refs, errors), SSR/hydration, browser computed
styles at breakpoint boundaries, packed consumers with and without Tailwind.

**Acceptance Scenarios**:

1. **Given** `<Heading as="h2" size="5xl">`, **Then** an `h2` is rendered with the `5xl` scale.
2. **Given** `size={{ base: "xl", tablet: "3xl" }}` with `tablet` configured, **Then** font size
   and line height change at the tablet threshold and the trims follow.
3. **Given** `<Text asChild tone="primary"><a href="/docs">Docs</a></Text>`, **Then** exactly one
   `a` with the Text classes, its `href`, merged className/style and the caller's ref.
4. **Given** `as` and `asChild` together, an invalid size, or a malformed breakpoint key, **Then**
   rendering throws `NeshelTypographyError`.

### User Story 4 — Capsize precision with the consumer's fonts (Priority: P1)

**Independent Test**: CLI tests against `@capsizecss/core`; browser measurement of the rendered
cap-height-to-box alignment with a locally installed font and with fallback fonts.

**Acceptance Scenarios**:

1. **Given** metrics for the body font, **When** `<Paragraph>` renders in a `Stack space="4"`,
   **Then** the distance from the previous block to the first line's cap height equals the gap
   within 1 px, for single- and multi-line text.
2. **Given** a custom family without metrics, **Then** `neshel validate` warns
   `missing-metrics` and the role is rendered without trimming (scale 1).
3. **Given** `fallbacks: { body: [arial] }`, **Then** the generated stylesheet contains a
   Capsize `@font-face` fallback and `--neshel-font-body` lists it after the primary family.
4. **Given** accented capitals, descenders, CJK/Thai/Arabic text, **Then** glyphs are not clipped
   (no overflow clipping is introduced by trimming).

### User Story 5 — Tailwind and Neshel share thresholds (Priority: P2)

**Acceptance Scenarios**:

1. **Given** `tailwind: true` and `replace`, **Then** a Tailwind build generates `tablet:` and no
   `md:` utilities, and `tablet:flex` switches at the same width as `<Stack space={{ tablet: … }}>`.
2. **Given** `tailwind` unset, **Then** the generated file contains no `@theme` block.

### User Story 6 — Fresh generated artefacts (Priority: P2)

**Acceptance Scenarios**:

1. **Given** an edited config, **When** `neshel generate --check` runs, **Then** it exits 4 naming
   the stale file(s); after `neshel generate` it exits 0; an unchanged rerun rewrites nothing.
2. **Given** breakpoints removed from the config, **Then** the previously generated declarations
   file is removed (only if it carries the Neshel header).

### User Story 7 — Storybook documentation (Priority: P2)

Stories for every typography component, variants, responsive behaviour with custom breakpoints,
Capsize comparisons, font roles, asChild, layout integration and themes, using distributed CSS.

### Edge Cases

- Responsive object without `base`: below the first written key the component default applies
  (Typography) or the property is unset (Layout) — R7.
- Repeated values (`{ base: "4", md: "4" }`): two classes, same result.
- `truncate` with trimming: trimming is removed (overflow clipping would cut ascenders).
- `asChild` with an inline host element (`a`, `span`, …) on a trimmed component: trimming is
  removed (pseudo-element blocks would break inline flow).
- A Tailwind `leading-*` utility on a trimmed element: line height changes but trims use the
  `leading` prop value — documented; use `leading`.
- Generated stylesheet imported before the package stylesheets in `extend` mode: the package rule
  for a default breakpoint would come later; only "generated after (or instead of) package
  stylesheets" is supported and tested.
- Font fails to load and no fallback metrics are configured: sizes and trims follow the primary
  font's metrics, the fallback renders with its own — documented mismatch, diagnosable with the
  metric story and `document.fonts`.

## Requirements _(mandatory)_

### Breakpoints

- **FR-001**: `@neshel-ui/config` MUST accept `breakpoints` (`mode`, `values`, `tailwind`) and
  `types` as specified in [contracts/breakpoints.md](contracts/breakpoints.md); `defineConfig`
  rejects unknown keys at compile time.
- **FR-002**: The CLI MUST validate breakpoints per R2 and report each problem with a stable
  diagnostic code and path.
- **FR-003**: Effective breakpoints MUST be sorted by width, with `base` first and without a
  media query; `extend` keeps the defaults, `replace` uses only configured names.
- **FR-004**: Layout and Typography MUST accept static values and responsive objects keyed by
  `base` and effective names; values cascade upwards (mobile first).
- **FR-005**: The runtime MUST emit, for each written key, one static class from a table lookup;
  class output MUST NOT depend on configuration, environment or breakpoint order.
- **FR-006**: Malformed breakpoint keys and invalid values MUST throw on server and client.
- **FR-007**: Unknown well-formed keys MUST produce at most one browser `console.warn` per key
  when a Neshel stylesheet declares `--neshel-breakpoints`; no warning during SSR.
- **FR-008**: `BreakpointName` MUST resolve to the defaults without generated declarations and to
  exactly the configured names with them (obsolete defaults rejected in `replace`).
- **FR-009**: Generated declarations MUST work with `moduleResolution` NodeNext and Bundler.
- **FR-010**: `neshel generate` MUST render complete component stylesheets for installed Layout
  and Typography packages from their style manifests when breakpoints are configured.
- **FR-011**: Package stylesheets and generated stylesheets MUST come from the same renderer and
  tables; drift tests MUST fail on any difference.
- **FR-012**: With `tailwind: true`, the generated stylesheet MUST contain the `@theme`
  breakpoint mapping of R8 and nothing else Tailwind-specific; without it, none.
- **FR-013**: Phase 003 layout behaviour (spacing exclusivity, alignment precedence, Flex axes,
  Grid, separators, `as`/`asChild`, errors other than unknown well-formed keys) MUST be preserved;
  the Phase 003 browser cases MUST pass unchanged.

### Generation

- **FR-020**: `neshel generate` MUST write the stylesheet and (with breakpoints) the declarations
  atomically, only when content differs; `--check` MUST exit 4 if either is stale or missing.
- **FR-021**: Output paths MUST follow the feature 002 safety rules; `types` must end in `.d.ts`.
- **FR-022**: Outputs MUST be byte-identical across operating systems and runs (LF, sorted).
- **FR-023**: A stale Neshel-generated declarations file MUST be removed when breakpoints are
  removed; files without the Neshel header MUST never be removed.

### Typography

- **FR-030**: `@neshel-ui/typography` MUST export `Heading`, `Text`, `Paragraph`, `Caption`,
  `NeshelTypographyError` and prop types as in [contracts/typography-api.md](contracts/typography-api.md).
- **FR-031**: The rendered element MUST be the one chosen by `as` (closed lists) or the default;
  heading level never changes with `size`.
- **FR-032**: `size`, `weight`, `align`, `leading` MUST be responsive; `tone`, `family`,
  `tracking`, `measure`, `wrap`, `truncate`, `trim` static.
- **FR-033**: `asChild` MUST follow ADR 0009 (Radix Slot, single element child, merged
  className/style/handlers/refs, `as` + `asChild` throws).
- **FR-034**: Typography components MUST set `margin: 0` and no other spacing.
- **FR-035**: Styles MUST be distributed as `@neshel-ui/typography/styles.css` in
  `@layer components.neshel`, with no Tailwind directives and no colour literals.
- **FR-036**: Invalid props MUST throw `NeshelTypographyError` on server and client.

### Capsize and fonts

- **FR-040**: Trimming MUST equal Capsize's `createStyleObject` output for the configured metrics,
  every size token and leading (tested to 1e-4 em).
- **FR-041**: `font-size` MUST equal `token × --neshel-font-<role>-scale` (R10).
- **FR-042**: Metrics MUST accept Capsize-compatible objects; invalid metrics are errors.
- **FR-043**: Roles with a custom family and no metrics MUST warn and render untrimmed.
- **FR-044**: Configured fallbacks MUST produce Capsize `createFontStack` `@font-face` rules.
- **FR-045**: Trimming MUST NOT clip glyphs, MUST be removable per element and MUST be removed for
  `truncate` and inline host elements.
- **FR-046**: The library MUST NOT ship or fetch font files.

### Distribution and verification

- **FR-050**: Layout and Typography MUST export `./styles.css` and `./style-manifest.json`; both
  declare `@neshel-ui/config` as a peer; `check:pack` enforces the contract.
- **FR-051**: External consumers from packed tarballs: zero-config with and without Tailwind,
  configured `extend` and `replace` with Layout and Typography, TypeScript declarations in NodeNext
  and Bundler, SSR and hydration.
- **FR-052**: Browser checks MUST assert computed styles just below and at each tested threshold.
- **FR-053**: Negative controls MUST show that broken CSS, types, exports and responsive rules fail.
- **FR-054**: Storybook MUST document the typography system and custom breakpoints with
  distributed CSS.

## Success Criteria _(mandatory)_

- **SC-001**: All Phase 003 layout browser cases pass with the refactored runtime and CSS.
- **SC-002**: In the `replace` consumer, computed styles switch exactly at each configured
  threshold (1 px below: previous value; at the threshold: new value) for Layout and Typography.
- **SC-003**: Type fixtures: `md` rejected and `tablet` accepted in `replace`; defaults accepted
  and `tablet` rejected without declarations; extend accepts both — in NodeNext and Bundler.
- **SC-004**: Capsize equivalence: 0 differences above 1e-4 em across fixtures; browser
  measurement of trimmed text within 1 px of the expected box.
- **SC-005**: `pnpm check` passes locally; CI passes on Linux, Windows and macOS (Node 26) and
  Linux Node 22/24.
- **SC-006**: Typography stylesheet ≤ 24 KiB raw; layout stylesheet stays ≤ 48 KiB raw.
- **SC-007**: `neshel generate` twice produces no write on the second run; `--check` detects every
  stale artefact.

## Assumptions

- Consumers run `neshel generate` before type checking and bundling when they configure
  breakpoints (documented scripts).
- Evergreen browsers with cascade layers, `min-width` media queries and custom properties.
- Metrics passed by consumers describe the font files they load.
