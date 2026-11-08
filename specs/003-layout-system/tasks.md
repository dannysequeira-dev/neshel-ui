---

## description: "Task list for feature 003 — layout system"

# Tasks: Layout system (`@neshel-ui/layout`)

**Input**: design documents in `specs/003-layout-system/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

Tests are mandatory for this feature (constitution VI, spec SC-001–SC-007).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on incomplete tasks)
- **[Story]**: US1–US6 from spec.md; setup/foundational/polish tasks have no story label

---

## Milestone 003.0 — Specification and planning

- [x] T001 Record the owner brief in `specs/003-layout-system/brief.md`
- [x] T002 Write `spec.md`, `research.md`, `contracts/layout-api.md`, `contracts/layout-css.md`
- [x] T003 [P] Write ADR 0008 and ADR 0009 in `docs/decisions/`
- [x] T004 Write `plan.md`, `data-model.md`, `quickstart.md`, this `tasks.md`
- [x] T005 Run `/speckit-analyze`; record `analysis.md`; add `checklists/requirements.md`

## Milestone 003.1 — Foundations, Box, Flex, Stack, Inline

### Phase 1: Setup

- [x] T006 Add `tailwind-variants` ^3.3.1 and `@radix-ui/react-slot` ^1.5.0 (layout deps), `jsdom`
  ^29.1.1 and React (root dev) to the catalog and manifests; refresh `pnpm-lock.yaml`
- [x] T007 Move `rootDir` to `packages/layout/tsconfig.build.json`; include `type-tests/**/*.tsx`
  in `packages/layout/tsconfig.json`

### Phase 2: Foundational (blocks all stories)

- [x] T008 `packages/layout/src/types.ts` — shared public types (contracts/layout-api.md)
- [x] T009 `packages/layout/src/style-tables.ts` — breakpoints, space scale, base classes,
  property tables (contracts/layout-css.md)
- [x] T010 `packages/layout/src/errors.ts` — `NeshelLayoutError` and message helpers
- [x] T011 `packages/layout/src/resolve.ts` — normalise/validate responsive values, cascade,
  spacing exclusivity, diff to class selections
- [x] T012 `packages/layout/src/variants.ts` — `tv()` from `tailwind-variants/lite`, generated
  variants per (breakpoint, key), `extend` composition
- [x] T013 `packages/layout/scripts/generate-css.mjs` + `src/styles.css` + build script; Biome
  ignore for the generated file; root `generate:layout-css`
- [x] T014 `packages/layout/src/render.tsx` — prop stripping, element rendering (as/asChild hooks
  completed in 003.3)

### Phase 3: User Story 1 — Stack and Inline (P1)

- [x] T015 [P] [US1] `box.tsx` (display) and `flex.tsx` (direction, wrap, direction-aware alignment)
- [x] T016 [P] [US1] `stack.tsx` and `inline.tsx` (spacing, align*, justify, wrap)
- [x] T017 [US1] `src/index.ts` exports
- [x] T018 [US1] `test/render.test.mjs` — SSR markup, defaults, class merging, prop stripping,
  spacing classes, alignment precedence, Flex direction mapping and resets
- [x] T019 [US1] `test/styles.test.mjs` — drift (C3), consistency sweep (C1/C2), hygiene, budget;
  negative control for the consistency checker

## Milestone 003.2 — Grid, Center, Container, responsive verification

### Phase 4: User Story 2 — Responsive grids and containers (P1)

- [x] T020 [P] [US2] `grid.tsx`, `center.tsx`, `container.tsx` (+ exports)
- [x] T021 [US2] Unit tests for Grid/Center/Container and responsive cascades
- [x] T022 [US2] `scripts/lib/cdp.mjs` `setViewport()`; `scripts/lib/layout-browser.mjs`
  fixtures/probes; `check:browser` layout section (viewports 360–1600, LTR/RTL/row-reverse,
  separators, theme inheritance) with a negative control and a non-canonical import-order fixture
  (layout before Tailwind) that documents the lost `margin-inline: auto`
- [x] T023 [US2] Pure tests for `layout-browser.mjs` in `tests/`

## Milestone 003.3 — Composition, separators, validation

### Phase 5: User Story 3 — `as` / `asChild` (P1)

- [x] T024 [US3] Complete `render.tsx`: `as` union check, `asChild` validation, Radix Slot
- [x] T025 [US3] `test/composition.test.mjs` (jsdom): refs, handlers, className/style merge,
  custom forwarding components, invalid children, `as` + `asChild`

### Phase 6: User Story 4 — Separators (P2)

- [x] T026 [US4] `separators.tsx`; Stack/Inline integration; wrap/asChild rules
- [x] T027 [US4] `test/separators.test.mjs`: 0/1/n children, conditional children, keys, tags,
  custom separators, asChild host/component, wrap rejection

### Phase 7: Type contract

- [x] T028 `type-tests/valid.tsx` and `type-tests/invalid.tsx` (spacing exclusivity, responsive
  keys/values, as/asChild, per-component alignment sets, separator type)
- [x] T029 `test/errors.test.mjs`: every error row of the contract, SSR and client parity,
  hydration without mismatch (jsdom)

## Milestone 003.4 — Storybook, packaging, external consumers

### Phase 8: User Story 6 — Storybook (P2)

- [x] T030 [US6] Storybook dependency on `@neshel-ui/layout`, stylesheet import, theme toolbar
  decorator (`preview.tsx`)
- [x] T031 [P] [US6] Stories: Box, Flex, Stack, Inline, Grid, Center, Container, composition
  (asChild, separators, nesting, custom theme, realistic app layout)

### Phase 9: User Story 5 — Distribution (P1)

- [x] T032 [US5] `scripts/lib/pack-checks.mjs` layout contract (exports, deps, imports, stylesheet
  hygiene, C4) + tests with negative cases in `tests/pack-checks.test.mjs`
- [x] T033 [US5] `check:consumer`: layout in Tailwind and plain variants, SSR prerender + hydrate,
  CSS selector check (C5), type checks incl. `@ts-expect-error` conflict; checker unit tests
- [x] T034 [US5] `check:browser`: consumer probes (computed layout, Tailwind override, hydration)
- [x] T035 Push; verify CI 5/5 via GitHub REST API; fix failures

## Milestone 003.5 — Documentation and closure

- [x] T036 [P] `docs/layout.md`, `packages/layout/README.md`, `docs/package-contracts.md`,
  `docs/architecture.md`, `docs/roadmap.md`, root `README.md`, `CLAUDE.md` phase line;
  document limitations FR-053 (asChild) and FR-065 (spacing around separators)
- [x] T037 [P] Changeset for `@neshel-ui/layout`
- [x] T038 `evidence.md`, `traceability.md`, ADR verification sections, spec status
- [x] T039 Final `pnpm check`, `check:consumer`, `check:browser`, Storybook build; push; CI 5/5;
  closure recommendation

---

## Dependencies & execution order

- 003.0 → 003.1 (T006–T014 block every story) → US1 → 003.2 → 003.3 → 003.4 → 003.5.
- T022 depends on T015–T020 (fixtures render components). T033/T034 depend on T024–T029
  (consumer apps use asChild and separators).
- T032 can start after T013 (stylesheet exists).

## Parallel examples

- T015 and T016 (different component files) after T014.
- T030/T031 alongside T032.
- T036 and T037.

## Implementation strategy

MVP = 003.1 (Stack/Inline usable). Each milestone is committed and pushed separately with CI
verification; evidence is recorded per milestone (planned vs implemented vs verified).
