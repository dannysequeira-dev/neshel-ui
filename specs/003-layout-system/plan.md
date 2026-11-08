# Implementation Plan: Layout system (`@neshel-ui/layout`)

**Branch**: `main` | **Date**: 2026-11-08 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/003-layout-system/spec.md`

## Summary

Implement seven layout primitives in `@neshel-ui/layout` on Flexbox/Grid with a typed responsive
API. A TypeScript table module is the single source of truth for class names and declarations; it
drives `tailwind-variants/lite` at runtime and a generator for the committed, layered stylesheet.
Composition uses `as`, `asChild` (Radix Slot) and React 19 refs; Stack/Inline insert separators.
Verification extends the existing node:test suites (plus jsdom), type fixtures, `check:pack`,
`check:consumer` (layout in Tailwind and plain consumers with SSR + hydration) and
`check:browser` (computed styles at several viewports).

## Technical Context

**Language/Version**: TypeScript 5.9 strict, React 19 (peer `^19.0.0`), Node 26 (floor 22.13)
**Primary Dependencies**: `tailwind-variants` ^3.3.1 (`/lite`), `@radix-ui/react-slot` ^1.5.0
**Dev/Test**: `react-dom` (unit SSR/hydration), `jsdom` ^29.1.1 (root dev), existing CDP client
**Storage**: N/A
**Testing**: node:test against built `dist`; `tsc` type fixtures; headless Chrome via CDP;
packed-tarball consumers (Vite 8, Tailwind 4, React 19)
**Target Platform**: evergreen browsers (cascade layers, flex `gap`, logical alignment); SSR in
Node ≥ 22.13
**Project Type**: pnpm monorepo library package
**Performance Goals**: stylesheet ≤ 48 KiB raw / 8 KiB gzip; class resolution O(props × 6)
**Constraints**: no Tailwind utilities in output, no consumer `@source`, no inline styles, no
browser globals, ESM/NodeNext, cross-platform scripts (Node APIs only)
**Scale/Scope**: 7 components, ~12 CSS property tables, ~650 rules

## Constitution Check

| Principle | Gate | Status |
| --- | --- | --- |
| II Modular packages | `layout` imports neither `components` nor `core`; deps justified (R2, R9) | Pass (design) |
| III CSS-first, tokens | Precompiled CSS, `--neshel-spacing`, `--neshel-border`; no interpolated utility names | Pass (design) |
| IV Accessibility | Native elements, `as` semantics, decorative separators `aria-hidden`, `li` in lists | Pass (design) |
| V Intentional layout | Polymorphic only via closed `as` union and `asChild`; SSR-safe pure render | Pass (design) |
| VI Evidence | Unit, type, browser, packed consumers, negative controls; evidence.md | Planned |
| VII Spec-driven | This plan, tasks, analysis, ADRs 0008/0009 | Pass |
| VIII Safe releases | `private: true` kept; no publish/tags; pushes authorised by the brief | Pass |
| IX Cross-platform | Node-only scripts; CI on three OSes | Planned |

No violations; Complexity Tracking empty.

## Project Structure

### Documentation (this feature)

```text
specs/003-layout-system/
├── brief.md  spec.md  research.md  plan.md  data-model.md  quickstart.md
├── contracts/layout-api.md  contracts/layout-css.md
├── tasks.md  analysis.md  checklists/requirements.md
└── evidence.md  traceability.md   (filled during implementation)
```

### Source Code (repository root)

```text
packages/layout/
├── package.json                 # deps: @radix-ui/react-slot, tailwind-variants
├── scripts/generate-css.mjs     # tables (dist) -> src/styles.css; --check
├── src/
│   ├── index.ts                 # public exports
│   ├── types.ts                 # Breakpoint, Responsive, SpaceValue, props unions
│   ├── style-tables.ts          # single source of truth (no React, no tv)
│   ├── errors.ts                # NeshelLayoutError (internal)
│   ├── resolve.ts               # validation + per-breakpoint resolution
│   ├── variants.ts              # tv() instances built from tables
│   ├── render.tsx               # as / asChild / Slot / prop stripping
│   ├── separators.tsx           # separator insertion
│   ├── box.tsx flex.tsx stack.tsx inline.tsx grid.tsx center.tsx container.tsx
│   └── styles.css               # generated, committed
├── test/*.test.mjs              # node:test on dist (SSR, jsdom, consistency, drift)
└── type-tests/valid.tsx invalid.tsx
scripts/
├── check-browser.mjs            # + layout section
├── lib/layout-browser.mjs       # fixtures + probes (pure data/helpers)
├── lib/consumer-layout.mjs      # layout additions for tailwind/plain consumers
├── lib/pack-checks.mjs          # + layout contract
└── lib/cdp.mjs                  # + setViewport
apps/storybook/src/layout/*.stories.tsx, .storybook/preview.tsx (theme toolbar)
docs/layout.md, docs/decisions/0008, 0009
```

**Structure Decision**: single package `packages/layout`; verification scripts stay in the root
`scripts/` (existing pattern).

## Key design notes

- **Resolver** (`resolve.ts`): `normalize(prop, value, allowed)` → per-breakpoint map with
  validation; `cascade()` → effective values for all six breakpoints; component `derive()`
  functions turn effective props into CSS-property tokens; `diff()` emits `{bp, key, token}`
  only on change (reset token `normal` when a value disappears).
- **tv**: one `tv()` per component with `base` (`neshel-stack` …) and a generated variant per
  `(breakpoint, key)` (e.g. `md_ai`), shared through `extend` from a common `layoutVariants`;
  Container uses `defaultVariants: { base_mw: "xl" }`. The resolver output is passed as variant
  selections plus `class: className`.
- **Generator**: walks the same tables; `normal` resets only inside breakpoint blocks.
- **Render**: strips layout props, validates `as`/`asChild`, chooses `Slot` or the tag, applies
  separators (to children, or to the slotted host child's children).

## Milestones and gates

| Milestone | Gate |
| --- | --- |
| 003.0 | Spec, contracts, ADRs, plan, tasks, analysis committed |
| 003.1 | Foundations + Box/Flex/Stack/Inline; unit + drift + consistency tests; `pnpm check` |
| 003.2 | Grid/Center/Container; browser layout section passes locally |
| 003.3 | asChild/separators/errors; type fixtures; jsdom tests |
| 003.4 | Storybook; pack contract; consumers with SSR + hydration; CI 5/5 |
| 003.5 | Docs, evidence, traceability, closure CI 5/5 |

Each milestone ends with a local `pnpm check` (plus relevant consumer/browser checks), a
Conventional Commit and, from 003.1 on, a push followed by CI verification via the GitHub REST API.

## Complexity Tracking

None.
