# Traceability — Feature 003

Requirement → implementation → verification. "CI" = verified in GitHub Actions (runs
42480913188, 42481749103, 42482142182; see [evidence.md](evidence.md)).

## Functional requirements

| ID     | Implementation                                                        | Verification                                                                                                | Status      |
| ------ | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ----------- |
| FR-001 | `src/index.ts`                                                        | `render.test.mjs` "public runtime exports"; `check:pack` typed entry                                        | CI          |
| FR-002 | `render.tsx` (`as`, default `div`)                                    | `render.test.mjs` "as selects"; `composition.test.mjs` invalid `as`                                         | CI          |
| FR-003 | `style-tables.ts` base classes; components                            | `render.test.mjs` defaults; browser `stack-basic`, `inline-wrap`, `flex-*`, `grid-*`, `center`, `container` | CI          |
| FR-004 | Box `display`, Container `size`/`gutter`                              | `render.test.mjs`; browser `box-display`, `container*`                                                      | CI          |
| FR-005 | prop destructuring in components                                      | `render.test.mjs` "layout props never reach the DOM"                                                        | CI          |
| FR-006 | tv `class` append; no inline styles                                   | `render.test.mjs` className/style                                                                           | CI          |
| FR-007 | React 19 ref-as-prop                                                  | `composition.test.mjs` refs for all primitives                                                              | CI          |
| FR-010 | `gap`/`gap-x`/`gap-y` tables                                          | `render.test.mjs`; browser gap assertions                                                                   | CI          |
| FR-011 | `SpacingProps` union                                                  | `type-tests/invalid.tsx` + mutation (evidence); consumer `type-contract.tsx`                                | CI          |
| FR-012 | `assertSpacing`                                                       | `errors.test.mjs` (server and client)                                                                       | CI          |
| FR-013 | no such props                                                         | `type-tests/invalid.tsx` (`gap`, `rowGap`)                                                                  | CI          |
| FR-020 | component specs in `resolve.ts`                                       | `render.test.mjs` axis mapping; browser alignment geometry                                                  | CI          |
| FR-021 | `justify ?? axis` derivation                                          | `render.test.mjs` precedence; browser `inline-justify`                                                      | CI          |
| FR-022 | cascade-then-derive resolver                                          | `render.test.mjs` precedence across breakpoints                                                             | CI          |
| FR-023 | allowed values per prop; Flex runtime check                           | `errors.test.mjs`; `type-tests/invalid.tsx`                                                                 | CI          |
| FR-024 | no default classes except Center/Container defaults                   | `render.test.mjs` defaults; browser `flex-direction` (`normal`)                                             | CI          |
| FR-025 | logical `start`/`end` values                                          | browser `inline-rtl`, `flex-row-reverse`; `docs/layout.md`                                                  | CI          |
| FR-030 | `normalize`, breakpoints table                                        | `render.test.mjs` responsive; browser viewport sweep                                                        | CI          |
| FR-031 | table lookups, validation                                             | `errors.test.mjs` unknown keys/values; consistency sweep                                                    | CI          |
| FR-032 | pure resolver, change-only emission                                   | `render.test.mjs` determinism; hydration tests                                                              | CI          |
| FR-033 | `cols`, `dir`, `fw` tables                                            | `render.test.mjs`; browser `grid-responsive`, `inline-wrap`                                                 | CI          |
| FR-040 | `variants.ts` (`tailwind-variants/lite`, `extend`, `defaultVariants`) | rendering tests; `check:pack` allowed imports                                                               | CI          |
| FR-041 | generator, `@layer components.neshel`                                 | `styles.test.mjs` hygiene; `check:pack` layout contract                                                     | CI          |
| FR-042 | —                                                                     | `styles.test.mjs` C1/C2 sweep + negative control                                                            | CI          |
| FR-043 | precompiled CSS                                                       | `check:consumer` tailwind and plain (no `@source`), browser consumer probes                                 | CI          |
| FR-044 | committed `src/styles.css`                                            | `styles.test.mjs` drift, determinism, budget                                                                | CI          |
| FR-045 | `var(--neshel-border)`                                                | `tests/no-hardcoded-colors.test.mjs`; browser separator colour light/dark                                   | CI          |
| FR-050 | Radix Slot in `render.tsx`                                            | `composition.test.mjs` merge, refs, handlers, custom component                                              | CI          |
| FR-051 | `asChild` validation                                                  | `composition.test.mjs` invalid children                                                                     | CI          |
| FR-052 | conflict check                                                        | `composition.test.mjs`; `type-tests/invalid.tsx`                                                            | CI          |
| FR-053 | —                                                                     | `composition.test.mjs` non-forwarding child; `docs/layout.md`                                               | CI          |
| FR-060 | `separate()`                                                          | `separators.test.mjs`                                                                                       | CI          |
| FR-061 | `Children.toArray` minus `""`                                         | `separators.test.mjs` 0/1/n, conditional children                                                           | CI          |
| FR-062 | separator keys                                                        | `separators.test.mjs` re-render reuses nodes by key                                                         | CI          |
| FR-063 | `separatorTag`, `aria-hidden`, orientation classes                    | `separators.test.mjs`; browser `separator-*`                                                                | CI          |
| FR-064 | wrap / asChild rules                                                  | `separators.test.mjs`                                                                                       | CI          |
| FR-065 | separators are flex items                                             | browser `separator-stack` gaps before/after; `docs/layout.md`                                               | CI          |
| FR-066 | `activeSeparator`                                                     | `separators.test.mjs` invalid values                                                                        | CI          |
| FR-070 | `packages/layout/package.json`                                        | `check:pack` layout contract, publint, attw                                                                 | CI          |
| FR-071 | imports                                                               | `check:pack` allowed imports; consumer prerender without `window`                                           | CI          |
| FR-072 | `checkLayoutContract`                                                 | `tests/pack-checks.test.mjs`; manual mutation (evidence)                                                    | CI          |
| FR-080 | `apps/storybook/src/layout/*`                                         | Storybook build in CI; visual verification                                                                  | CI          |
| FR-081 | docs, changeset                                                       | review                                                                                                      | Implemented |

## Success criteria

| ID     | Result                                                                                                      |
| ------ | ----------------------------------------------------------------------------------------------------------- |
| SC-001 | Browser layout cases pass in Chrome on Windows (local) and in CI on Linux/Windows/macOS                     |
| SC-002 | 100% / 100% (661 classes) — `styles.test.mjs`                                                               |
| SC-003 | 31 type-level and 22 runtime invalid cases fail as required                                                 |
| SC-004 | Tailwind and plain consumers: tsc, build, Node SSR from tarball, hydration with 0 errors                    |
| SC-005 | Negative controls detected (unit tests, browser control, manual `check:pack` mutations)                     |
| SC-006 | 42 283 B raw / 3 584 B gzip; layout imports limited to React, Radix Slot, tv lite                           |
| SC-007 | `pnpm check`, `check:consumer`, `check:browser`, Storybook build: CI 5/5 on `73ac0c9`, `3656920`, `f31878a` |

## Brief §11 coverage

| Brief item                                                                                                             | Where                                                                |
| ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Native HTML, semantics, defaults, props, className merging                                                             | `render.test.mjs`                                                    |
| Responsive types, spacing exclusivity, runtime conflicts                                                               | `type-tests/`, `errors.test.mjs`                                     |
| Refs, asChild, invalid asChild                                                                                         | `composition.test.mjs`                                               |
| Separators, conditional children, orientation                                                                          | `separators.test.mjs`, browser                                       |
| Precedence, errors                                                                                                     | `render.test.mjs`, `errors.test.mjs`                                 |
| Browser: directions, grid, centre, container, spacing, alignment, breakpoints, wrapping, separators, theme inheritance | `scripts/lib/layout-browser.mjs`                                     |
| Packed consumers with/without Tailwind: CSS, JSX, peers, declarations, SSR, hydration, exports, leaks                  | `scripts/lib/consumer-layout.mjs`, `check:consumer`, `check:browser` |
| Negative tests: broken CSS, exports, invalid props                                                                     | see SC-005                                                           |

## Accepted risks

K1 Chrome-only browser coverage · K3 fixed breakpoints · K4 non-forwarding `asChild` children ·
K5 `tailwind-variants` 4.x migration · K6 canonical import order only · Spacer deferred (R12) ·
no Storybook a11y run · no Next.js consumer (feature 006).
