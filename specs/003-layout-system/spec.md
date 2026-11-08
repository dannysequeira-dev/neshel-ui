# Feature Specification: Layout system (`@neshel-ui/layout`)

**Feature Branch**: `main` (spec directory `specs/003-layout-system`; no feature branch created)

**Created**: 2026-11-08

**Status**: Draft — milestone 003.0 (specification, contracts, plan).

**Input**: Owner brief "Neshel-UI — Phase 003: Complete Layout System" (2026-11-08), summarised in
[brief.md](brief.md). The brief is authoritative and pre-authorises autonomous execution of all
milestones; its decisions answer the clarification questions recorded below.

Companion documents:

- [plan.md](plan.md), [tasks.md](tasks.md), [data-model.md](data-model.md),
  [quickstart.md](quickstart.md), [analysis.md](analysis.md).
- [research.md](research.md) — decisions R1–R16, spikes, brief audit, risks.
- [contracts/layout-api.md](contracts/layout-api.md) — components, props, types, errors.
- [contracts/layout-css.md](contracts/layout-css.md) — class vocabulary, stylesheet, layers,
  breakpoints, consistency rules.
- ADRs: [0008](../../docs/decisions/0008-layout-styling-and-css-distribution.md) (styling and
  CSS distribution), [0009](../../docs/decisions/0009-layout-composition-aschild-separators.md)
  (composition: `as`, `asChild`, refs, separators).

## Problem

`@neshel-ui/layout` is an empty placeholder. Applications need composable, responsive and
accessible layout primitives that use the Neshel token contract (feature 002), work in apps with
or without Tailwind, render the same on the server and the client, and never require consumers to
compile or scan Neshel sources.

## Goals

1. Seven primitives — Box, Flex, Stack, Inline, Grid, Center, Container — on native Flexbox and
   CSS Grid with native `gap`.
2. One spacing vocabulary (`space`, `spaceX`, `spaceY`) and one alignment vocabulary (`align`,
   `alignX`, `alignY`, `justify`) with predictable, documented precedence.
3. Typed, mobile-first responsive values backed by precompiled, deterministic CSS.
4. Composition through `as` and `asChild` without extra wrappers; decorative separators.
5. A distributable stylesheet proven from packed artifacts in external apps with and without
   Tailwind, in a real browser, with SSR and hydration.

## Non-goals

- Spacer (evaluated, deferred — research R12), item-level props (`grow`, `shrink`, `basis`,
  `order`, grid `span`), grid rows/areas/auto-fit, container queries, configurable breakpoints.
- Typography (004), interactive components and the `Separator` component (005).
- Vertical writing modes (documented, not supported), RTL-specific behaviour beyond logical
  keywords.
- Publishing, releases, tags, removing `private`, Next.js consumer (006).

## Clarifications

### Session 2026-11-08 — owner brief as clarification answers

The brief fixes every decision that `/speckit-clarify` would otherwise escalate. Remaining
ambiguities were resolved by the agent within the brief's authority and recorded as research
decisions (R1–R16); none changes an established contract from features 001–002.

- Q: Public spacing props? → A: `space` / `spaceX` / `spaceY` only, mapped to `gap` /
  `column-gap` / `row-gap`; `space` excludes the other two at type level and at runtime.
- Q: Axis semantics? → A: X = inline (horizontal in horizontal writing modes), Y = block;
  per-component mapping as listed in FR-020.
- Q: Precedence when several props target one CSS property? → A (R6): values cascade
  mobile-first per prop, then `justify` > axis prop (`alignX`/`alignY`) > `align` per breakpoint.
- Q: How are styles shipped? → A (R1, R2): Neshel-namespaced classes composed with
  `tailwind-variants/lite`, generated from the same TypeScript tables into a precompiled
  `styles.css`; no Tailwind utilities, no consumer `@source`.
- Q: Cascade position? → A (R3): layout rules live in `@layer components.neshel`, below
  Tailwind's `utilities` and below unlayered application CSS.
- Q: Breakpoints? → A (R4): `sm` 40rem, `md` 48rem, `lg` 64rem, `xl` 80rem, `2xl` 96rem
  (`min-width`), matching Tailwind v4 defaults; fixed in 003.
- Q: `separator` with `wrap` / with `asChild`? → A (R10): `separator` + any truthy `wrap` throws;
  `separator` + `asChild` works for host (DOM) children and throws for component children.
- Q: Spacer? → A (R12): not shipped in 003; rationale recorded.

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Stack and Inline layouts with tokens (Priority: P1)

An application developer composes vertical and horizontal groups with token-based spacing and
alignment, with or without Tailwind.

**Why this priority**: most layouts are one-dimensional; this is the minimum useful package.

**Independent Test**: render Stack and Inline with `space`, `spaceX`, `spaceY`, `align*` and
`justify`; assert classes (unit), computed `flex-direction`, gaps and alignment (browser), and the
same results in packed consumers with and without Tailwind.

**Acceptance Scenarios**:

1. **Given** `<Stack space="4">`, **When** rendered, **Then** the element has `display: flex`,
   `flex-direction: column` and `gap = 4 × --neshel-spacing`.
2. **Given** `<Inline spaceX="4" spaceY="2" wrap>`, **Then** `column-gap` and `row-gap` differ
   and items wrap.
3. **Given** `<Stack space="4" spaceX="2">` in TSX, **Then** type checking fails; given the same
   props from JavaScript, **Then** rendering throws an error naming `space` and `spaceX`.
4. **Given** `<Inline align="center" justify="between">`, **Then** `align-items: center` and
   `justify-content: space-between`.

### User Story 2 — Responsive grids and containers (Priority: P1)

A developer builds responsive page structures: column counts, gaps, alignment and container
widths change at breakpoints without writing CSS.

**Independent Test**: browser viewport sweep (360 → 1600 px) on SSR fixtures and packed consumers.

**Acceptance Scenarios**:

1. **Given** `<Grid columns={{ base: 1, md: 2, lg: 4 }} space={{ base: "2", md: "4" }}>`,
   **When** the viewport is 360/800/1100 px, **Then** there are 1/2/4 tracks and the gap changes
   at 48rem.
2. **Given** `<Container size="lg" gutter="4">`, **Then** `max-width: 64rem`, inline margins are
   equal (`auto`) and inline padding is `4 × --neshel-spacing`.
3. **Given** `<Flex direction={{ base: "column", md: "row" }} alignX="center">`, **Then** below
   48rem `align-items: center`; from 48rem `justify-content: center` and `align-items: normal`.

### User Story 3 — Semantic composition with `as` and `asChild` (Priority: P1)

A developer applies layout to an existing semantic element or a custom component without an
extra wrapper.

**Independent Test**: unit tests on DOM output, ref identity, merged handlers/className/style;
error tests for invalid usage.

**Acceptance Scenarios**:

1. **Given** `<Stack asChild space="4"><section aria-label="Settings">…</section></Stack>`,
   **Then** exactly one `section` is rendered with the Stack classes and its own attributes.
2. **Given** `as="nav"` and `asChild` together, **Then** rendering throws.
3. **Given** `asChild` with zero, several, a text or a Fragment child, **Then** rendering throws
   an error explaining the single-element requirement.
4. **Given** a ref on a primitive (with or without `asChild`), **Then** it receives the DOM
   element; both the slot and child handlers run.

### User Story 4 — Separators between items (Priority: P2)

A developer separates list items with a decorative rule or a custom element.

**Independent Test**: unit tests on child sequences; browser check of orientation and colour per
theme.

**Acceptance Scenarios**:

1. **Given** `<Stack separator>` with children `A`, `false`, `B`, `null`, `C`, **Then** the
   output is `A | B | C` (two separators, none leading/trailing), separators `aria-hidden`.
2. **Given** `<Inline separator={<span aria-hidden="true">|</span>}>`, **Then** the custom
   element is inserted between items unchanged.
3. **Given** `<Inline separator wrap>`, **Then** rendering throws (orphaned separators).
4. **Given** `as="ul"`, **Then** default separators are `li` elements hidden from AT.
5. **Given** `data-neshel-theme="dark"` on an ancestor, **Then** the default separator colour is
   the dark `--neshel-border`.

### User Story 5 — Distributed CSS works in external apps (Priority: P1)

A consumer installs the packed package and imports `@neshel-ui/layout/styles.css`; layouts work
with or without Tailwind, the app server-renders and hydrates without mismatch, and types resolve.

**Independent Test**: `pnpm check:pack`, `pnpm check:consumer` (Tailwind and plain variants with
layout), `pnpm check:browser` against their builds.

**Acceptance Scenarios**:

1. **Given** a Vite + React 19 app without Tailwind importing `tokens.css` and the layout
   stylesheet, **Then** computed styles match the contract.
2. **Given** a Tailwind v4 app, **Then** a Tailwind utility on a primitive (`className="flex-row"`
   on Stack) overrides the layout class (layer contract).
3. **Given** server-rendered HTML hydrated by the client bundle, **Then** no hydration error is
   reported.
4. **Given** a stylesheet with a removed rule or a broken export, **Then** the checks fail
   (negative tests).

### User Story 6 — Documented in Storybook (Priority: P2)

Maintainers and consumers explore every primitive in Storybook, in light, dark and a custom theme,
rendered with the distributed stylesheet.

**Independent Test**: `pnpm build:storybook` succeeds; stories import only
`@neshel-ui/layout/styles.css` for layout styling.

### Edge Cases

- `space={{}}`, `columns={{}}`: no classes emitted (valid, no-op).
- Unknown breakpoint key (`{ tablet: "4" }`) or value (`space="7"`, `columns={13}`): type error;
  runtime error from JavaScript.
- `null` spacing values are treated as absent; `space={null} spaceX="2"` is valid at runtime.
- Children that are `null`, `undefined`, booleans or `""` are ignored by separator insertion; a
  Fragment counts as one item (documented limitation).
- `separator={false}` leaves children untouched (no re-keying).
- Flex `alignY="stretch"` where Y is the main axis (row → column switch): runtime error naming the
  breakpoint.
- `asChild` child that does not forward `className`/`ref`: styles/ref are lost — documented,
  cannot be detected reliably.
- Layout stylesheet imported without `@neshel-ui/config` tokens: gaps resolve to `0` (unset
  `--neshel-spacing`), separator border falls back to `currentcolor`; documented.
- Neshel stylesheet imported before Tailwind: Tailwind's `base` layer (preflight) is ordered after
  `components`, so preflight `margin: 0` beats Container's `margin-inline: auto`; only the
  canonical order is supported (documented, tested).

## Requirements _(mandatory)_

### Functional Requirements

**Primitives and rendering**

- **FR-001**: The package exports `Box`, `Flex`, `Stack`, `Inline`, `Grid`, `Center`, `Container`
  and their prop types; nothing else is public except shared types (`Breakpoint`, `Responsive`,
  `SpaceValue`, alignment value types, `LayoutElement`).
- **FR-002**: Each primitive renders exactly one element; default element `div`; `as` accepts the
  `LayoutElement` union (contracts/layout-api.md).
- **FR-003**: Stack = flex column; Inline = flex row; Flex = flex with configurable `direction`
  (`row` default, `column`, `row-reverse`, `column-reverse`) and `wrap`; Center = flex with both
  axes centred; Grid = CSS Grid; Container = `width: 100%`, `margin-inline: auto`, `box-sizing:
  border-box`, `max-width` from `size`; Box adds no CSS unless `display` is set.
- **FR-004**: Box `display` (responsive): `none`, `block`, `inline`, `inline-block`. Container
  `size` (responsive, default `xl`): `sm`, `md`, `lg`, `xl`, `2xl`, `full`; `gutter` (responsive
  `SpaceValue`) → `padding-inline`.
- **FR-005**: Native attributes, `className`, `style`, event handlers and `ref` pass to the
  rendered element; layout props (`space*`, `align*`, `justify`, `direction`, `wrap`, `columns`,
  `display`, `size`, `gutter`, `separator`, `as`, `asChild`) are never forwarded to the DOM.
- **FR-006**: `className` is appended after layout classes; `style` is untouched (layout never
  writes inline styles).
- **FR-007**: Refs use React 19 ref-as-prop and resolve to the rendered DOM element.

**Spacing**

- **FR-010**: `space` → `gap`, `spaceX` → `column-gap`, `spaceY` → `row-gap`, on Flex, Stack,
  Inline, Grid and Center. Values: `SpaceValue` = `"0" | "0.5" | "1" | "1.5" | "2" | "2.5" | "3" |
  "4" | "5" | "6" | "8" | "10" | "12" | "16" | "20" | "24"`; CSS value
  `calc(var(--neshel-spacing) * n)`.
- **FR-011**: Types make `space` mutually exclusive with `spaceX`/`spaceY` (which may coexist),
  including responsive forms; verified by TSX fixtures with `@ts-expect-error`.
- **FR-012**: At runtime, a defined (non-null) `space` together with a defined `spaceX` or
  `spaceY` throws a `NeshelLayoutError` naming the component and conflicting props, identically on
  server and client.
- **FR-013**: No `gap`, `rowGap`, `columnGap` or `space-x`/`space-y` public props.

**Alignment**

- **FR-020**: Axis mapping — Stack X→`align-items`, Y→`justify-content`; Inline and Center
  X→`justify-content`, Y→`align-items`; Grid X→`justify-items`, Y→`align-items`; Flex: row
  directions as Inline, column directions as Stack, resolved per breakpoint.
- **FR-021**: `align` sets both axes; `alignX`/`alignY` override per axis; `justify`
  (`start`, `center`, `end`, `between`, `around`, `evenly`) sets main-axis distribution on Flex,
  Stack and Inline and overrides the main-axis value derived from `align*`. Center and Grid have
  no `justify` (Center's X already targets `justify-content`; Grid tracks fill the container).
- **FR-022**: Precedence is evaluated per breakpoint after mobile-first cascading of each prop.
- **FR-023**: Value sets per axis are typed per component (contracts); main-axis targets accept
  `start | center | end`, cross-axis targets add `stretch` (and `baseline` where meaningful); Grid
  axes accept `start | center | end | stretch`. Invalid values throw at runtime.
- **FR-024**: No alignment class is emitted by default, preserving native `normal`/`stretch`,
  except Center's centred defaults.
- **FR-025**: Alignment keywords are logical (`start`/`end`), so X follows the inline direction
  (right-to-left in RTL) and does not flip with `row-reverse`; vertical writing modes are not
  supported. Documented and browser-tested for LTR, RTL and `row-reverse`.

**Responsive**

- **FR-030**: Every responsive prop accepts a value or an object with keys `base`, `sm`, `md`,
  `lg`, `xl`, `2xl`; breakpoints are mobile-first `min-width` 40/48/64/80/96rem.
- **FR-031**: Responsive output is static classes; class names are looked up from generated
  tables, never assembled from user input; unknown keys or values throw.
- **FR-032**: Resolution is deterministic and pure (same props → same class string, server and
  client); a class for a breakpoint is emitted only when the effective CSS value changes.
- **FR-033**: Grid `columns` (responsive) 1–12 → `repeat(n, minmax(0, 1fr))`. Flex `direction`
  and `wrap` (Flex, Inline; boolean) are responsive.

**Styling distribution**

- **FR-040**: Variant composition uses `tailwind-variants` (`tailwind-variants/lite`, no
  `tailwind-merge`): base classes, variants, default variants and composition (`extend`).
- **FR-041**: `@neshel-ui/layout/styles.css` contains every class the runtime can emit, generated
  from the same tables; no Tailwind directives; layered as `@layer components.neshel`.
- **FR-042**: A consistency test proves that every class emitted for an exhaustive set of prop
  combinations exists in the shipped stylesheet and that every stylesheet class is reachable.
- **FR-043**: Consumers need neither Tailwind nor `@source`; tested with packed consumers with
  and without Tailwind.
- **FR-044**: The stylesheet is deterministic, committed (drift-tested) and stays within a
  size budget (≤ 48 KiB raw, ≤ 8 KiB gzip).
- **FR-045**: Default separator colour uses `var(--neshel-border)` (semantic token); no colour
  literals in layout sources.

**Composition**

- **FR-050**: `asChild` on all seven primitives uses `@radix-ui/react-slot`: merged `className`,
  `style` (child wins), composed refs and handlers (child first), forwarded attributes.
- **FR-051**: `asChild` requires exactly one valid React element child that is not a Fragment;
  otherwise `NeshelLayoutError`.
- **FR-052**: `as` together with `asChild` throws `NeshelLayoutError`.
- **FR-053**: Limitations documented: Fragments, components that do not forward
  `className`/`ref`, lazy elements.

**Separators**

- **FR-060**: Stack and Inline accept `separator?: boolean | ReactElement`; `true` renders the
  default separator, an element renders that element, `false`/`undefined` none.
- **FR-061**: Separators appear only between rendered items (after dropping `null`,
  `undefined`, booleans and `""`); zero or one item → no separator.
- **FR-062**: Items keep their keys; separators get deterministic keys derived from the next
  item's key; no wrappers around items.
- **FR-063**: Default separator: `aria-hidden="true"`, horizontal rule in Stack and vertical rule
  in Inline, `align-self: stretch`, 1px border in `--neshel-border`; rendered as `li` when the host
  element is `ul`/`ol`, `span` when the host is `span`, otherwise `div`. Custom separators are
  cloned only to add a key.
- **FR-064**: `separator` with any truthy `wrap` value throws; `separator` with `asChild` works
  when the child is a host element (separators inserted into its children) and throws for
  component children.
- **FR-065**: Spacing applies on both sides of each separator (separators are flex items);
  documented.
- **FR-066**: A non-boolean, non-element `separator` throws.

**Architecture and packaging**

- **FR-070**: Runtime dependencies exactly `@radix-ui/react-slot` and `tailwind-variants`; React
  19 peer; ESM only; NodeNext declarations; source maps with sources; `sideEffects: ["**/*.css"]`;
  exports exactly `.` and `./styles.css`.
- **FR-071**: No imports of `@neshel-ui/components`, `@neshel-ui/core`, `@neshel-ui/cli`,
  `tailwind-merge` or `node:` modules; no browser globals at module or render time (SSR-safe).
- **FR-072**: `check:pack` enforces FR-070/071 and the stylesheet hygiene of FR-041.

**Documentation**

- **FR-080**: Storybook stories for every primitive covering the brief's §12 list, styled only by
  the distributed stylesheets plus Tailwind utilities for demo chrome.
- **FR-081**: `docs/layout.md`, package README, `docs/package-contracts.md`,
  `docs/architecture.md`, `docs/roadmap.md` and a changeset updated.

### Key Entities

- **Responsive value**: scalar or breakpoint-keyed object.
- **Style table**: CSS property → value token → class name and declaration (source of truth for
  runtime and stylesheet).
- **Resolved layout**: per-breakpoint effective CSS property values → class list.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: All seven primitives render the contracted CSS, verified by computed styles in
  headless Chrome on Linux, Windows and macOS CI.
- **SC-002**: 100% of classes reachable from an exhaustive prop sweep exist in the shipped
  stylesheet, and 100% of stylesheet classes are reachable (consistency test).
- **SC-003**: Every invalid combination in the type fixtures fails `tsc`; every runtime-invalid
  combination throws `NeshelLayoutError` with the offending prop names.
- **SC-004**: Packed consumers with and without Tailwind type-check, build, server-render in Node
  from the tarball and hydrate in Chrome with zero recoverable errors.
- **SC-005**: Negative controls (removed CSS rule, broken export, invalid prop) make the
  respective checks fail.
- **SC-006**: Stylesheet ≤ 48 KiB raw and ≤ 8 KiB gzip; layout JS has no dependency beyond
  React, `@radix-ui/react-slot` and `tailwind-variants/lite`.
- **SC-007**: `pnpm check`, `pnpm check:consumer`, `pnpm check:browser` and Storybook build pass
  in all five CI jobs for the closing commit.

## Milestones

| Milestone | Scope                                                                            |
| --------- | -------------------------------------------------------------------------------- |
| 003.0     | Spec, research, contracts, ADRs 0008/0009, plan, tasks, analysis                 |
| 003.1     | Foundations (types, tables, resolver, generator, tv) + Box, Flex, Stack, Inline  |
| 003.2     | Grid, Center, Container; responsive resolution; browser layout checks            |
| 003.3     | `as`/`asChild`, separators, validation errors, type fixtures                     |
| 003.4     | Storybook, pack contract, external consumers (Tailwind / plain, SSR + hydration) |
| 003.5     | Documentation, evidence, traceability, CI verification, closure                  |

## Assumptions

- Consumers load `@neshel-ui/config` tokens (`tokens.css` or `tailwind.css`) before the layout
  stylesheet; the canonical import order extends ADR 0006: Tailwind → config stylesheet →
  generated config CSS → layout stylesheet → application CSS.
- Evergreen browsers with cascade layers, `gap` for Flexbox and logical alignment keywords.
- React 19 only (ADR 0004).
