# ADR 0029 — Accessible text splitting and SVG path geometry

- Status: **Accepted** (owner review of PR #15, issuecomment-7056966484: direction approved, accepted after
  the review corrections R1–R3 and K-5 below)
- Date: 2026-11-19
- Feature: [014](../../specs/014-typography-svg-paths/spec.md); research R1–R15; contracts
  [text-splitter.md](../../specs/014-typography-svg-paths/contracts/text-splitter.md),
  [text-api.md](../../specs/014-typography-svg-paths/contracts/text-api.md),
  [svg-geometry.md](../../specs/014-typography-svg-paths/contracts/svg-geometry.md),
  [svg-api.md](../../specs/014-typography-svg-paths/contracts/svg-api.md)

## Context

Phase 014 adds Typography & Text (T01–T11) and SVG & Paths (S01–S10). Split text is the classic place where
accessibility breaks (pieces read one by one, `aria-label` on unnamed roles, clusters cut, RTL reversed);
SVG effects are where libraries interpolate `d` strings blindly, overwrite strokes and add a geometry
dependency. The engine already provides one scheduler, motion values, the run model, the Motion Host and the
family boundary rule (ADR 0022, 0023, 0025, 0028).

## Decision

1. **Two families, two subpaths.** `./text` (family `text`) and `./svg` (family `svg`), with opt-in
   `text.css` and `svg.css`. They import `src/core` internals and React only — never each other, never
   `./cinematic` or `./scroll`.
2. **One accessible copy.** The splitter moves the element's original child nodes into a visually hidden
   span (inline styles) and renders an `aria-hidden` visual copy built from `Intl.Segmenter` clusters/words,
   with direction runs isolated by `dir`, shaping-script words kept whole, and interactive/editable content
   never split (documented `unsupported` state). `revert()` moves the same nodes back.
3. **Geometry is ours and pure.** One SVG path parser (exact normal form), a JS geometry (length, points,
   tangents) testable without a browser and checked against native `getTotalLength` in the lab, and a strict
   morph policy (`exact`/`cubic`, no resampling; incompatible → error or documented `swap`).
4. **Writes.** Split effects write one custom property per frame on their package-owned visual root through
   the Motion Host; piece values are computed by CSS (`calc`, `clamp`, `sin`). SVG effects write the consumer's
   styles through internal exclusive host channels (`stroke-dasharray`, `stroke-dashoffset`, `offset-path`,
   `offset-distance`, `offset-rotate`, `stop-color`, `stop-opacity`, `font-*` for T10) with the existing
   ledger (capture/restore), and attributes (`d`, stop `offset`) through a small attribute ledger flushed in
   the scheduler's write phase. `src/core/host.ts` does not change (the Phase 012/013 internal-channel pattern).
5. **Coordination as values.** Every effect exposes `track()` (a structural C01 value track) and
   `drive(source)` (any `{ get, subscribe }`, e.g. the 011 `ScrollProgress`); no second clock.
6. **Continuous effects are bounded.** Finite defaults (≤ 5 s), `Infinity` explicit, paused off-screen and on
   hidden pages, never under reduced motion (WCAG 2.2.2).
7. **No dependency.** No GSAP SplitText/MorphSVG/DrawSVG, splitting libraries, grapheme polyfills, flubber or
   path libraries (ADR 0020; research R15).

## Consequences

- Screen readers read the original text once; selection copies the visible text once; no-JS and pre-hydration
  users read plain text. Links/buttons inside text are not split (consumers animate the element instead).
- Shaping scripts animate by word under `split: "chars"`; the visual order of some RTL signed numbers in T05
  follows logical order (documented).
- S02 morphs need compatible authoring; there is no automatic shape matching.
- Driver column changes for most catalogue rows (CSS → host values + CSS math; S02 WAAPI → attribute ledger);
  recorded in the spec inventory.
- New bundle entries get proposed budgets; earlier budgets are unchanged.
- `text.css` registers the progress and per-piece intermediate custom properties as `<number>` (`@property`):
  measured to cut the 600-cluster reveal frame cost in Chromium from ~37 to ~22–25 ms; hundreds of
  simultaneously animated clusters still exceed a 60 fps budget in Chromium/WebKit headless (evidence K-5).
- Review corrections (PR #15): the SVG attribute ledger is shared per element and follows the ADR 0022
  ownership policy (one writer per attribute, waiting writers resume, original restored once by the last
  writer, external changes adopted); every listener and track subscription of an effect ends with `destroy()`.
- K-5: TextReveal and TextWave default to `maxPieces: 200` (a measured knee, evidence §9): longer `chars`
  texts animate by word with a development warning; an explicit `maxPieces` is the opt-in to more pieces.

## Verification

[evidence.md](../../specs/014-typography-svg-paths/evidence.md): unit (469 animations tests, incl. `test/review-014.test.mjs`), CDP 147 cases,
three engines 161 cases each, packed SSR consumer, bundles, routers; three-OS CI in the PR.

## Alternatives rejected

- `aria-label` on the split element (ARIA naming rules; ignored on generic roles).
- Per-piece Motion Hosts or WAAPI animations (N writes or N clocks per frame).
- CSS `d: path()` morphs (not in WebKit); heuristic resampling morphs (geometry changes).
- Native-only geometry (jsdom lacks it; untestable without a browser).
