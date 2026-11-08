# ADR 0011 — Typography: Capsize trimming through font-metric custom properties

- Status: **Accepted** (2026-11-08, within the owner's Phase 004 brief); implemented and
  CI-verified in feature 004 (run 42488883635, 5/5 jobs)
- Date: 2026-11-08
- Feature: [004](../../specs/004-typography-breakpoints/spec.md); normative detail in
  [contracts/typography-api.md](../../specs/004-typography-breakpoints/contracts/typography-api.md)
  and [contracts/typography-css.md](../../specs/004-typography-breakpoints/contracts/typography-css.md)
- Resolves: "Whether typography and components reuse the layout styling pipeline" (open decision
  in `docs/architecture.md`) for typography.

## Context

`@neshel-ui/typography` must provide `Heading`, `Text`, `Paragraph`, `Caption` with responsive
size, weight, alignment and leading, precise vertical trimming from real font metrics (Capsize),
consumer-supplied fonts, no font files, build-time CSS, and no glyph clipping. Pre-computing
Capsize styles per (font role × size × leading × breakpoint) would multiply the stylesheet.

## Decision

1. **Same pipeline as Layout** (ADR 0008/0010): namespaced classes from TypeScript tables,
   `tailwind-variants/lite`, a style manifest, the shared renderer, `@layer components.neshel`,
   Radix Slot composition (ADR 0009).
2. **Capsize via custom properties.** With a unitless line height `L`, Capsize's trims are
   `-((a − d)/2 − c + L/2) em` (cap height) and `-((d − a)/2 + L/2) em` (baseline), where `a`, `d`,
   `c` are ascent, |descent| and cap height over units-per-em (spike S1, identical to
   `@capsizecss/core` to four decimals). The CLI writes per-role constants
   (`--neshel-font-<role>-cap-trim`, `-baseline-trim`, `-scale`, `-trim`) next to the font
   families; the trim pseudo-elements combine them with the active leading, so every size and
   breakpoint is precise without extra classes.
3. **Cap-height-based sizing.** `font-size = token × (0.7275 / capHeight)`; the default fonts have
   scale 1. Roles without metrics: scale 1, no trimming, `missing-metrics` warning.
4. **Metrics and fallbacks.** Capsize-compatible metric objects (for example from
   `@capsizecss/metrics`, imported in the consumer's config). Fallback metrics produce
   `createFontStack` `@font-face` rules so fallbacks render with the primary font's metrics. The CLI
   depends on `@capsizecss/core` only.
5. **Trimming rules.** On by default for `Heading`, `Paragraph`, `Caption`; never on `Text`;
   removed for `truncate` and inline host elements; `trim={false}` frees `::before`/`::after`.
6. **Components.** Four required components only; `Title`/`Subtitle` (redundant), `Label` (form
   behaviour, Phase 005) and `Code` (`<Text as="code" family="mono">`) are not added.

## Consequences

- Precise trimming depends on the configured metrics matching the rendered font; a missing web
  font without configured fallbacks shifts trims by the metric difference (documented, measurable
  in Storybook and the browser check).
- `::before`/`::after` are used on trimmed elements; consumers needing them pass `trim={false}`.
- Line heights set by other CSS are not seen by the trim calculation (use `leading`).
- `@neshel-ui/config` tokens gain 12 metric custom properties; its generated goldens change.
- `text-box-trim` remains future work (not in Firefox; uses rendered metrics, behaves differently).

## Alternatives considered

- Pre-computed Capsize classes per combination: combinatorial CSS growth.
- Runtime `createStyleObject` in React: per-render work, inline styles, SSR/override friction.
- `text-box-trim` only: not cross-browser; cannot be verified uniformly.
- Depending on `@capsizecss/metrics` in the CLI: 27.7 MB for data consumers can import themselves.

## Verification

Evidence (details in `specs/004-typography-breakpoints/evidence.md`, CI run 42488883635): CLI equivalence tests against
`@capsizecss/core` for several fonts, sizes and leadings; unit/SSR/hydration tests; type fixtures;
browser geometry checks of cap-height and baseline alignment with in-page metrics plus a mismatch
negative control; packed consumers with and without Tailwind; CI on three OSes.
