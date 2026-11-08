# Research — Feature 003 (layout system)

Decisions taken within the authority of the owner brief ([brief.md](brief.md)). Each lists the
decision, rationale and rejected alternatives. Spike results are recorded with what was actually
run.

## R1 — Class vocabulary: Neshel-namespaced classes, not Tailwind utilities

**Decision**: the runtime emits only `neshel-*` class names (e.g. `neshel-stack`,
`neshel-gap-4`, `neshel-md-ai-center`) defined in the package's precompiled stylesheet.

**Rationale**: Tailwind utility names in a library collide with the consumer's own Tailwind
build (different `--spacing`, prefixes, breakpoints, layer placement) and are absent in apps
without Tailwind. Own names make `styles.css` the single, complete source of styles (brief §7) and
need no `@source` into `node_modules`.

**Alternatives**: (a) Tailwind utilities + consumer `@source` — rejected by the brief; (b) compile
Tailwind utilities into our stylesheet — duplicates/conflicts with the consumer's utilities of the
same name; (c) CSS-in-JS / inline styles — runtime cost, SSR style injection, overrides harder.

## R2 — `tailwind-variants/lite` as the composition engine; tables as single source of truth

**Decision**: `tailwind-variants` ^3.3.1, imported from `tailwind-variants/lite`. A TypeScript
table module (`style-tables.ts`) defines every CSS property, value token, class name and
declaration. It feeds (1) `tv()` variant maps (base classes, variants, `defaultVariants`, `extend`
composition) and (2) the generator that writes `styles.css`.

**Rationale**: the lite entry has no `tailwind-merge` dependency; merging is pointless because no
emitted class is a Tailwind utility, and conflicts between Neshel classes are prevented by
construction (one class per property per breakpoint). Consumer overrides are handled by cascade
layers (R3), not by class deletion. Version 3.3.1 (2026-08-03) is the latest 3.x; 4.0.x was nine
days old at selection time and is re-evaluated later. v3's `tailwindcss`/`tailwind-merge` peers
are optional and unused by `lite`.

**Spike (2026-11-08)**: `dist/lite.js` imports only internal chunks (`getTailwindVariants`, `cx`);
`tailwind-merge` is not imported. Verified by reading the installed package.

**Alternatives**: full entry (pulls `tailwind-merge`, ~20 KB, no benefit); `class-variance-authority`
(not the brief's choice); hand-written maps (no typed composition).

## R3 — Cascade layer `components.neshel`

**Decision**: every layout rule is inside `@layer components.neshel`.

**Rationale**: with Tailwind, `@import "tailwindcss"` declares `theme, base, components,
utilities`; nesting Neshel rules in `components` places them below `utilities`, so
`<Stack className="flex-row">` or `className="hidden md:flex"` work as consumers expect, and
unlayered application CSS always wins. Without Tailwind the layer is simply created by our file.
The sub-layer keeps Neshel rules identifiable and below a consumer's own unlayered `components`
rules. A top-level `neshel.layout` layer would be ordered after Tailwind's layers in the canonical
import order and beat utilities.

**Consequence**: if the layout stylesheet is imported _before_ Tailwind, `components` is ordered
before `base`, and preflight's `margin: 0` beats Container's `margin-inline: auto`. Only the
canonical order (Tailwind first) is supported; the browser check verifies it.

**Alternatives**: unlayered rules (beat every utility); `neshel.layout` (beats utilities);
`:where()` specificity tricks (irrelevant across layers).

## R4 — Breakpoints

**Decision**: `base` (0), `sm` 40rem, `md` 48rem, `lg` 64rem, `xl` 80rem, `2xl` 96rem,
`@media (min-width: …)`. Fixed in 003; exported as a type only.

**Rationale**: identical to Tailwind v4 defaults, so Neshel and consumer utilities switch together;
`rem` respects user font size. Media queries cannot use custom properties, so configurable
breakpoints would require a generated stylesheet (future CLI work, recorded as risk K3).

## R5 — Responsive resolution: materialised per breakpoint

**Decision**: for each primitive, a pure resolver walks breakpoints in order, cascades every
responsive prop mobile-first, derives the effective value of each CSS property and emits a class
for a breakpoint only when that value changes. When a property loses its value (Flex direction
switch moves an axis), a reset class (`normal`) is emitted.

**Rationale**: precedence (R6) and Flex's direction-dependent mapping are only correct after
cascading; emitting per-prop classes naively would let a lower-precedence prop at a larger
breakpoint override a higher-precedence prop from a smaller one. Emitting only changes keeps class
lists short and deterministic.

## R6 — Alignment precedence and value sets

**Decision**: per breakpoint, after cascading: `justify` > axis prop (`alignX`/`alignY`) >
`align`. Main-axis targets (`justify-content`) accept `start | center | end` from `align*`;
cross-axis `align-items` accepts `start | center | end | stretch` plus `baseline` on row-oriented
primitives (Inline, Flex rows, Center). Grid `justify-items`/`align-items` accept
`start | center | end | stretch`. Types encode the per-component sets; Flex validates at runtime
because its axes move with `direction`.

**Rationale**: "specific beats general" matches the brief (`alignX` overrides `align`) and keeps
the natural `align="center" justify="between"` combination valid. `justify-content: stretch`
behaves as `flex-start` in Flexbox, so it is rejected rather than silently ignored.

## R7 — Logical alignment keywords; RTL and writing modes

**Decision**: emit `start`/`end` (not `flex-start`/`left`). X therefore follows the inline
direction: in RTL `alignX="start"` is the right edge; `row-reverse` does not flip X. Vertical
writing modes are out of scope (X/Y follow logical axes there, untested).

**Rationale**: logical keywords are the CSS Box Alignment standard and are supported in Flexbox
by evergreen browsers; they give the same meaning to X across `row` and `row-reverse`.

## R8 — Spacing scale and units

**Decision**: tokens `0, 0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24` → `calc(var(
--neshel-spacing) * n)` using the feature-002 `--neshel-spacing` token (0.25rem default,
configurable via `neshel.config.ts`). String tokens only (brief examples).

**Rationale**: matches Tailwind's numeric rhythm (`space="4"` = 1rem by default) while following
the Neshel spacing token; 16 values × 3 props × 6 breakpoints = 288 rules, within the size budget.

## R9 — Composition: `as`, `asChild`, refs

**Decision**: `as` accepts a fixed `LayoutElement` union of block/sectioning/list/phrasing
containers; typed with `HTMLAttributes<HTMLElement>` (element-specific attributes such as `form`
`action` require `asChild`). `asChild` uses `@radix-ui/react-slot` ^1.5.0 (React 19 aware ref
extraction, className join, style merge with child precedence, handler composition child-first).
We validate before Slot: exactly one valid element, not a Fragment. `as` + `asChild` throws.
Refs use React 19 ref-as-prop (no `forwardRef`).

**Alternatives**: own Slot (re-implements React 19 ref edge cases); fully generic polymorphic
types (complex, slow type checking, poor errors).

## R10 — Separators

**Decision**: insertion with `Children.toArray` (drops `null`/`undefined`/booleans; we also drop
`""`), separator keys `neshel-separator:<next item key>`. Default element by host tag (`li` for
`ul`/`ol`, `span` for `span`, else `div`), `aria-hidden="true"`. `separator` + truthy `wrap`
throws (a wrapped line can start or end with a separator; CSS cannot hide it reliably).
`separator` + `asChild`: host-element child → separators inserted into its children; component
child → throws (we cannot know where it renders `children`).

**Alternatives**: wrapping each item (rejected by brief); CSS `::before` borders on items
(breaks custom separators and wraps); silently dropping separators under `wrap` (forbidden).

## R11 — Errors

**Decision**: one internal `NeshelLayoutError` (name `NeshelLayoutError`), message prefix
`[@neshel-ui/layout] <Component>:`. Thrown during render, so SSR and client behave identically.
Not exported (minimal API); consumers match `error.name`.

## R12 — Spacer: deferred

**Decision**: not shipped. **Rationale**: the one-push case is covered by `justify="between"` and
nested Inline; a general solution needs item-level props (`grow`), which are out of scope; a
Spacer is an extra aria-hidden node that separators would surround. Re-evaluate with item props.

## R13 — Testing strategy

- Unit (node:test, built `dist`): `react-dom/server` for markup and errors; `jsdom` ^29.1.1 for
  refs, events, `createRoot`, `hydrateRoot` (engines match the Node ≥ 22.13 floor; 30.x requires
  22.22).
- Types: `type-tests/*.tsx` in the package `typecheck`, each invalid line under `@ts-expect-error`.
- Consistency: exhaustive sweep of resolver inputs vs parsed `dist/styles.css`.
- Browser: `check:browser` gains a layout section — SSR fixtures with shipped CSS at viewports
  360–1600 px (CDP `Emulation.setDeviceMetricsOverride`), plus probes in packed consumer pages.
- Consumers: Tailwind and plain variants install the layout tarball, render an app using all
  primitives, prerender with a Vite SSR build in Node and hydrate in Chrome.
- Negative controls: unit tests for each new checker with broken input.

## R14 — Box and Container controls

**Decision**: Box gets responsive `display` (`none`, `block`, `inline`, `inline-block`) — the
only Box control with a clear use without Tailwind (responsive show/hide). Container gets
responsive `size` (`sm`…`2xl` = breakpoint widths, `full` = none) default `xl`, and responsive
`gutter` (inline padding). No width/height props on Box (use CSS/Tailwind).

## R15 — Stylesheet generation and drift

**Decision**: `packages/layout/scripts/generate-css.mjs` imports the built tables
(`dist/style-tables.js`) and writes `src/styles.css` (committed, excluded from Biome);
`build` copies it to `dist`. A package test fails on drift (pattern of feature 002 FR-013).

## R16 — Consumer SSR and hydration from tarballs

**Decision**: layout consumers add `src/entry-server.tsx`; after the client build they run
`vite build --ssr`, then a Node script renders the app with `react-dom/server` (resolving the
packed `@neshel-ui/layout` through Node ESM) into `dist/index.html`. The client calls
`hydrateRoot` when markup exists and records recoverable errors in
`document.documentElement.dataset`, read by `check:browser`.

## Brief audit

| Brief item                                                 | Status in spec                          |
| ---------------------------------------------------------- | --------------------------------------- |
| §2 Spacer evaluation                                       | Deferred with rationale (R12)           |
| §4 runtime conflict error, no DOM forwarding               | FR-012, FR-005                          |
| §5 `alignX="between"` not a substitute                     | `between` only in `justify` (FR-021)    |
| §5 writing modes                                           | FR-025 / R7 (documented limitation)     |
| §6 Box/Container responsive controls only where meaningful | R14                                     |
| §7 lite vs normal entry                                    | R2                                      |
| §8 `as` + `asChild` conflict                               | FR-052                                  |
| §9 separator + wrap / asChild                              | FR-064 (reject wrap; asChild host-only) |
| §11 negative tests                                         | SC-005                                  |
| §14 no Co-Authored-By, push allowed                        | Workflow (plan.md)                      |

## Risks

| ID  | Risk                                                                    | Mitigation                                                       |
| --- | ----------------------------------------------------------------------- | ---------------------------------------------------------------- |
| K1  | Only Chrome is browser-tested                                           | Logical keywords are standard; Firefox/Safari listed as untested |
| K2  | Stylesheet size grows with each new prop                                | Budget test (FR-044)                                             |
| K3  | Breakpoints fixed; differ from a consumer's custom Tailwind breakpoints | Documented; future generated layout CSS via CLI                  |
| K4  | `asChild` children that do not forward props lose styles silently       | Documented (FR-053); undetectable                                |
| K5  | `tailwind-variants` 4.x migration                                       | Lite API surface used is small (`tv`, `extend`)                  |
| K6  | Consumer imports layout CSS before Tailwind                             | Canonical order documented; only it is tested                    |
