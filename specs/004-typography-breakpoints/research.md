# Research — feature 004

Decisions R1–R14 answer the open questions of the brief (§4–§17). Each lists the decision, the
rationale and the rejected alternatives. Spikes record what was measured, not assumed.

## Spikes

### S1 — Capsize trimming expressed with CSS custom properties (2026-11-08)

With line height given as a unitless ratio `L`, Capsize's `createStyleObject` trims are
independent of the font size when expressed in `em`:

```text
capHeightTrim = -((ascent - descent) / 2 - capHeight + L / 2) em
baselineTrim  = -((descent - ascent) / 2 + L / 2) em
(ascent, descent = |descent|, capHeight divided by unitsPerEm; lineGap cancels out)
```

Measured against `@capsizecss/core` 4.1.3 for Inter, Arial and Georgia at 12/16/48 px with
L = 2 / 1.5 / 1.1: identical to four decimals (Capsize rounds to four). Consequence: one pair of
per-font constants plus the active `L` reproduces Capsize for every size and breakpoint without
per-combination classes.

### S2 — Tailwind v4 breakpoint names (2026-11-08)

`compile()` from the workspace `tailwindcss` with
`@theme { --breakpoint-*: initial; --breakpoint-phone: 30rem; --breakpoint-phoneXL: 40rem; … }`
generated `phone:`, `phoneXL:`, `tablet:` and `max-phoneXL:` variants; `md:` disappeared and
`phonexl:` (wrong case) generated nothing. Variant names are case-sensitive and camelCase works.

### S3 — Capsize packages

`@capsizecss/core` 4.1.3: 48 KB unpacked, one dependency (`csstype`, types only).
`@capsizecss/metrics` 4.4.0: 27.7 MB unpacked. The CLI depends on `core` only; consumers who want
the metrics database import it in their own `neshel.config.ts` (it is executable TypeScript).

## Decisions

### R1 — Configuration shape

```ts
breakpoints?: {
  mode?: "extend" | "replace";        // default "extend"
  values: Record<string, `${number}rem`>;
  tailwind?: boolean;                  // emit Tailwind v4 @theme breakpoints; default false
};
types?: string;                        // generated declarations; default "./neshel.generated.d.ts"
```

`extend` keeps `sm md lg xl 2xl` and adds names; `replace` uses only the given names. Rationale:
the owner's proposed shape, plus an explicit, opt-in Tailwind switch. Rejected: a top-level
`screens` map (Tailwind v3 vocabulary), automatic Tailwind detection (surprising rewrites).

### R2 — Validation rules (CLI, generation time)

- Name: `^[a-z][A-Za-z0-9]*$`, 1–24 characters (camelCase allowed, starts with a lower-case
  letter, no `-`, so class names stay unambiguous).
- Reserved: `base`; `gap`, `text` (class-key prefixes); JavaScript prototype names (`constructor`,
  `prototype`, `toString`, `valueOf`, `hasOwnProperty`); Tailwind built-in variant names that would
  collide with a `--breakpoint-*` variant (`dark`, `print`, `hover`, `focus`, `active`, `visited`,
  `disabled`, `first`, `last`, `odd`, `even`, `open`, `max`, `min`, `not`, `has`, `group`, `peer`,
  `motion`, `contrast`, `portrait`, `landscape`, `ltr`, `rtl`, `starting`, `inert`, `forced`).
- Uniqueness is case-insensitive across the effective set (HTML quirks mode matches class names
  case-insensitively).
- Width: `^(?:0|[1-9]\d*)(?:\.\d{1,4})?rem$`, greater than 0 and at most 320rem. Only `rem`: mixing
  `px` with `rem`/`em` makes the order depend on the user's font-size setting.
- Widths are strictly distinct across the effective set (equal widths are ambiguous: rejected).
- `extend`: a default name may not be redefined (use `replace`), and no width may equal a default
  width.
- `replace`: at least one value.
- At most 12 effective breakpoints (bounds stylesheet size).
- Declaration order that is not ascending by width is a warning; output is always sorted by width.

### R3 — Order-independent runtime, CSS-resolved cascade

The runtime never needs the breakpoint order. Each responsive prop value becomes exactly one
class per breakpoint key the consumer wrote (`neshel-tablet-gap-4`); the stylesheet emits media
blocks in ascending width order, so the source order resolves the mobile-first cascade. Props
that compete for one CSS property (`align` < `alignX`/`alignY` < `justify`, Flex axes that move
with `direction`, Capsize trims that depend on size and leading) store their values in
component-scoped custom properties, and the component's base rule combines them with `var()`
fallbacks, which the browser evaluates per element and per viewport.

Rationale: the runtime output depends only on the props, so SSR and hydration are identical by
construction, no registry needs to be shipped, imported or kept in sync, and no Provider exists.
Rejected: a runtime registry module (must be imported in every server and client graph; a missed
import silently changes class output and causes hydration mismatches), reading breakpoints from
CSS at render time (unavailable during SSR), Phase 003's "derive per breakpoint" resolver (needs
the order).

Phase 003 compatibility: spacing, display, direction, wrap, columns, size and gutter classes keep
their names; alignment classes change from property classes (`neshel-md-ai-center`) to prop
classes (`neshel-md-align-x-center`); computed styles are unchanged (verified by the Phase 003
browser cases). Redundant classes for repeated values are no longer collapsed.

### R4 — JavaScript validation boundary

The runtime cannot know the configured names, so it validates what it can know authoritatively:
the key grammar (`base`, a default name, or `^[a-z][A-Za-z0-9]*$`), the values per prop, and the
prop combinations; violations throw (`NeshelLayoutError` / `NeshelTypographyError`) on server and
client alike. Configured names are authoritative only in the generated artefacts:

1. TypeScript consumers: the generated declarations reject unknown names at compile time.
2. JavaScript consumers in the browser: every Neshel stylesheet declares its effective names in
   `--neshel-breakpoints`. On the client only, the first time a component meets a syntactically
   valid key that is not listed there, it logs one `console.warn` per key. The check reads one
   computed custom property, never changes markup and is skipped during SSR, so it cannot cause a
   hydration mismatch. If no Neshel stylesheet is loaded the check stays silent (nothing to
   compare against).

Phase 003 change: an unknown but well-formed key (`{ tablet: "4" }`) no longer throws in
zero-config apps; it warns in the browser and is a type error in TSX. Malformed keys still throw.

### R5 — Generated component stylesheets from package style manifests

Each React package ships `./style-manifest.json`: its base rules and its responsive class table
(class suffix → declarations), schema version 1, generated from the same TypeScript tables the
runtime uses. The CLI renders a complete component stylesheet (base rules, responsive rules at
`base`, then one `@media (min-width: …)` block per breakpoint in ascending order) for every
installed `@neshel-ui/layout` / `@neshel-ui/typography` it can resolve from the configuration
file's directory. The packages' own `styles.css` is rendered by the same CLI function with the
default breakpoints (committed, drift-tested), so default and generated rules cannot diverge.

The generated stylesheet is complete and is imported after the package stylesheets (or instead of
them). Because it repeats every default rule after the package rule, its source order wins even
when both are imported. Size grows linearly: (number of responsive rules) × (breakpoints + 1).

Rejected: shipping a JavaScript stylesheet generator from each package (executes package code in
the CLI and creates a public API), generating only the custom breakpoints (a breakpoint narrower
than `sm` would be emitted after `sm` and win incorrectly), Tailwind `@source` scanning.

### R6 — Type registry

`@neshel-ui/config` declares an empty `BreakpointRegistry` interface and
`type BreakpointName = BreakpointRegistry extends { names: infer N extends string } ? N : "sm" | … | "2xl"`.
`neshel generate` writes a module-augmentation file that adds `names: "phone" | "tablet" | …`.
Augmentation adds a member to an interface (always allowed); the conditional type then _replaces_
the union, which is how `replace` mode removes default names — ordinary union augmentation could
not. Layout and Typography import `BreakpointName` from `@neshel-ui/config` (type-only) and declare
it as a peer dependency so consumers have one copy.

Rejected: augmenting each React package separately (augmenting an uninstalled module is a type
error; two registries can drift), global ambient types (pollute the global scope).

### R7 — Responsive objects keep an optional `base`

The brief asks for a required `base` "unless an existing project-wide contract specifies an
equally safe alternative". Phase 003 (accepted, CI-verified) makes `base` optional: below the
first written breakpoint the component's own default applies (or the property is not set). This
is deterministic and SSR-safe, and requiring `base` would break Phase 003 consumers, so the Phase
003 rule is kept for both packages.

### R8 — Tailwind v4 synchronisation

With `breakpoints.tailwind: true` the generated stylesheet ends with an `@theme` block:
`replace` → `--breakpoint-*: initial;` followed by the configured names; `extend` → only the new
names (Tailwind keeps its defaults, which equal ours). Only the `--breakpoint-` namespace is
touched. Without the flag nothing Tailwind-specific is emitted. The `@theme` block requires the
generated file to be processed by Tailwind (imported from the Tailwind entry CSS).

### R9 — Typography components

Ship the four required components. `Title`/`Subtitle` would only change default sizes of
`Heading`/`Paragraph` (rejected as redundant wrappers); `Label` needs form association and focus
behaviour (component territory, Phase 005); `Code` is covered by `<Text as="code" family="mono">`.

### R10 — Cap-height-based sizing

Size tokens are nominal font sizes for a reference cap height of 0.7275 (Inter, the default body
and display font). Each font role has `--neshel-font-<role>-scale` = 0.7275 ÷ its cap height, and
`font-size = token × scale`, so every role renders the same cap height for a token and swapping a
font keeps visual sizes. With the default fonts the scale is exactly 1, so the default sizes are
the familiar rem values. Without metrics the scale is 1 and trimming is off for that role.

### R11 — Trimming implementation

Capsize's pseudo-element technique (`::before` / `::after`, `display: table`, negative block
margins) with per-role constants from S1. Rationale: deterministic in every evergreen browser and
follows the configured metrics. `text-box-trim` (Chrome 133+, Safari 18.2+, not in Firefox) uses
the rendered font's metrics, which would be more robust against fallback fonts, but behaves
differently per browser and cannot be verified uniformly; it is recorded as future work. Trimming
is on by default for block components, off for `Text`, removed automatically for `truncate` and
for inline host elements, and can be disabled with `trim={false}` (for example when the consumer
needs `::before`/`::after`).

### R12 — Font metrics and fallbacks

`typography.metrics[role]` accepts Capsize-compatible metrics (`capHeight`, `ascent`, `descent`,
`lineGap`, `unitsPerEm`, optional `xHeight`, `xWidthAvg`, `familyName`, …), so objects from
`@capsizecss/metrics` can be passed directly. `typography.fallbacks[role]` lists metrics of local
fallback fonts; the CLI calls Capsize's `createFontStack` to emit `@font-face` rules with
`size-adjust` / `ascent-override` / `descent-override` / `line-gap-override` and inserts the
adjusted fallback families after the primary family, so a fallback renders with the primary
font's metrics (which keeps trimming accurate while the web font loads or if it fails). A role
with a custom family but no metrics gets a `missing-metrics` warning and no trimming.

### R13 — Font metrics in tokens

Per-role constants (`--neshel-font-<role>-scale`, `-cap-trim`, `-baseline-trim`, `-trim`) live
with the font families in `@neshel-ui/config` (defaults in `tokens.css`/`tailwind.css`,
configured values in the generated stylesheet), because metrics must change together with the
family. The default data embeds Inter's metrics from `@capsizecss/metrics` 4.4.0 (a test compares
them); `mono` has no default metrics.

### R14 — Generation workflow

One command (`neshel generate`) validates once and writes up to two files: the stylesheet and,
when breakpoints are configured, the declarations. `--check` compares both and exits 4 when either
is stale or missing. Writes stay atomic and byte-compared. A previously generated declarations file
(recognised by its header) is removed when breakpoints are removed from the config. Consumers run
`neshel generate` in their `dev`/`build` scripts (documented; no lifecycle hooks).
