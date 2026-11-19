# Feature Specification: Typography & Text, SVG & Paths (Phase 014)

**Feature Branch**: `feature/014-typography-svg-paths` (from `origin/main` `7207638`, after the PR #13 squash
merge)

**Created**: 2026-11-19

**Status**: **Specified (014.0).** Implementation status per slice in [tasks.md](tasks.md); verification in
[evidence.md](evidence.md). `@neshel-ui/animations` stays private (0.0.0).

**Input**: Owner direction 2026-11-19, summarised in [brief.md](brief.md).

Companion documents: [research.md](research.md) (R1–R15), [plan.md](plan.md), [tasks.md](tasks.md),
[analysis.md](analysis.md), [manual-checks.md](manual-checks.md); contracts
[text-splitter.md](contracts/text-splitter.md), [text-api.md](contracts/text-api.md),
[svg-geometry.md](contracts/svg-geometry.md), [svg-api.md](contracts/svg-api.md),
[accessibility-014.md](contracts/accessibility-014.md), [support-matrix-014.md](contracts/support-matrix-014.md),
[composition-matrix-014.md](contracts/composition-matrix-014.md),
[entry-points-014.md](contracts/entry-points-014.md); ADR
[0029](../../docs/decisions/0029-text-splitting-and-svg-geometry.md).

## Problem

Text effects are where motion libraries break accessibility (screen readers spelling words letter by
letter, `aria-label` on elements that cannot be named, emoji cut in half, RTL reversed, hidden text without
JavaScript) and SVG effects are where they interpolate `d` strings blindly or overwrite the consumer's
strokes. Phase 014 adds both families as thin layers on the 009–013 engine with one accessible text, exact
geometry and exact restoration.

## Goals

1. An accessible, Unicode-correct text splitter shared by the text effects (T01 foundation).
2. Text effects T01–T11 driven by one value per effect (seekable, scrubbable, timeline-ready).
3. A path parser, geometry and strict morph policy shared by the SVG effects (S foundation).
4. SVG effects S01–S10 through the Motion Host (internal channels) and an attribute ledger.
5. Evidence: unit, composition, three engines, packed SSR consumer, budgets, three-OS CI.

## Non-goals

Charting or data-visualisation APIs (S06 animates the consumer's paths only); an icon library (one
`menuCloseShapes` pair for S04); path resampling or heuristic morphing; text splitting of interactive or
editable content; images/media/ambient/feedback (015); GPU/WebGL (016); changes to Config, the CLI, the five
public packages or the release workflow; publication, versions, tags, releases; merging the PR; closing
issue #9.

## Inventory (the 21 catalogue entries)

| Id  | Effect                        | Catalogue driver → Phase 014 driver                         | Structure | Reduced | Engine / React                                  |
| --- | ----------------------------- | ----------------------------------------------------------- | --------- | ------- | ----------------------------------------------- |
| T01 | Split reveal (chars/words/lines) | CSS → one host value + CSS piece math                    | S         | instant | `createTextReveal` / `TextReveal`               |
| T02 | Typewriter                    | JS → one host value + CSS step math; caret attribute         | S         | instant | `createTypewriter` / `Typewriter`               |
| T03 | Scramble / decode             | JS → one host value + deterministic glyph attributes        | S         | instant | `createScramble` / `ScrambleText`               |
| T04 | Gradient sweep text           | CSS → host value + token styles (R-1)                       | —         | static  | `createGradientSweep` / `GradientText`          |
| T05 | Number roll                   | CSS → one host value + CSS column math                      | S         | instant | `createNumberRoll` / `NumberRoll`               |
| T06 | Rotating words                | CSS → host value per swap + CSS stack                       | S         | static  | `createRotatingWords` / `RotatingWords`         |
| T07 | Kinetic wave                  | CSS → one host phase value + CSS `sin()`                    | S         | off     | `createTextWave` / `WaveText`                   |
| T08 | Highlighter draw              | CSS → host value + token background band                    | —         | instant | `createHighlighter` / `Highlight`               |
| T09 | Text mask reveal              | CSS → host value + line clip/mask (or element `mask`)       | S / —     | instant | `createTextMask` / `TextMask`                   |
| T10 | Variable-font axis animation  | CSS → host channels (font-weight/stretch/style/fvs)         | —         | static  | `createFontAxes` / `FontAxes`                   |
| T11 | Line-by-line reveal on scroll | SDA → progress source value (011 contract) + CSS line math  | S         | instant | `createLineReveal` / `LineReveal`               |
| S01 | Path draw                     | CSS → host dash channels                                    | —         | instant | `createPathDraw` / `usePathDraw`, `PathDraw`    |
| S02 | Path morph                    | WAAPI → scheduler + attribute ledger (`d`; WebKit lacks CSS `d`) | —    | instant | `createPathMorph` / `usePathMorph`              |
| S03 | Motion along a path           | CSS → host `offset-*` channels; JS geometry fallback        | —         | static  | `createMotionPath` / `useMotionPath`            |
| S04 | Icon morph (menu ↔ close)     | CSS → S02 with named states                                 | —         | instant | `createIconMorph` / `MorphIcon`                 |
| S05 | Animated gradient stops       | CSS → host `stop-*` channels (`color-mix`) + offset ledger  | —         | static  | `createGradientStops` / `useGradientStops`      |
| S06 | Line-chart draw-in            | CSS → S01 per line + point reveal                           | —         | instant | `createChartDraw` / `useChartDraw`              |
| S07 | Turbulence wobble             | JS → package filter + arbitrated `filter`                   | —         | off     | `createTurbulence` / `useTurbulence`            |
| S08 | Logo reveal mask              | CSS → arbitrated `mask` channel                             | —         | instant | `createLogoReveal` / `useLogoReveal`            |
| S09 | Dash flow (marching ants)     | CSS → host dash channels in a gated loop                    | —         | static  | `createDashFlow` / `useDashFlow`                |
| S10 | Success checkmark draw        | CSS → S01 sequenced                                         | —         | instant | `createCheckmark` / `SuccessCheck`              |

Driver changes follow rule R-1 (ADR 0025): the consumer's element is animated only by the engine; CSS
renders package-owned DOM keyed on engine tokens and host-written values.

## Clarifications

### Session 2026-11-19 — owner brief

- Q: Which effects? → A: T01–T11, S01–S10 (21); variants are options, not entries.
- Q: Dependencies? → A: none unless benchmarked against native + a small implementation (R15: none added).
- Q: Subpaths? → A: evaluate `./text`, `./svg`, `./text.css`, `./svg.css`; confirmed by this spec (D-1).
- Q: Authority? → A: slices 014.0–014.5, commits, push and PR authorised; no merge, no publication.

### Decisions recorded by this spec (additive; no owner input needed)

- D-1 Subpaths `./text` (family `text`), `./svg` (family `svg`), opt-in `text.css`, `svg.css` (ADR 0029 §1).
- D-2 Shared internals `core/progress-driver.ts`, `core/loop.ts`, `core/channel.ts` (not exported from
  `./core`; the approved core budget is unaffected).
- D-3 Accessible copy = moved original nodes in a visually hidden span; visual copy `aria-hidden` (R2).
- D-4 One host-written custom property per effect per frame; per-piece math in CSS (R5).
- D-5 SVG writes through internal exclusive host channels and an svg attribute ledger (ADR 0029 §4); no
  change to `src/core/host.ts`.
- D-6 Morph policy `exact` (default) / `cubic`, no resampling (R9).
- D-7 Continuous effects: finite defaults, `Infinity` explicit, visibility-gated (R14).
- D-8 Playground uses the OFL Inter variable font (`@fontsource-variable/inter`, already in the lockfile) as
  the real variable font for T10.

## Functional requirements

Text foundation (014.1)

- FR-001 `segmentGraphemes`/`segmentWords` lossless, `Intl.Segmenter` first, documented fallback (R1).
- FR-002 `splitText` per text-splitter.md: one accessible copy, supported-content policy, direction runs,
  shaping-script rule, lines with bounded re-measurement, exact `revert()`, counters.
- FR-003 SSR-safe React integration (`useSplitText`, string children), StrictMode safe.

Text effects (014.2)

- FR-010 T01–T11 per text-api.md, each with engine + React, `track()`/`drive()`, reduced behaviour, exact
  restoration, no-JS content.
- FR-011 T05 localisation (signs, separators, currencies, numbering systems) with a stable accessible value.
- FR-012 T10 registered/custom axes without overwriting the consumer's settings.
- FR-013 T11 progress-source contract; no scroll-family import.

SVG foundation (014.3)

- FR-020 `parsePathData`/`serializePathData` with the exact normal form and controlled errors.
- FR-021 `getPathGeometry`/`measurePath` (native first, JS geometry fallback; zero length; subpaths).
- FR-022 Morph compatibility and interpolation per svg-geometry.md §3.

SVG effects (014.4)

- FR-030 S01–S10 per svg-api.md, each with engine + React, `track()`/`drive()`, reduced behaviour, exact
  restoration (styles and attributes).
- FR-031 S03 native Motion Path with verified fallback; S05 `color-mix` with fallback; S07 bounded and
  measured; S08 visible without mask support; S09 visibility-gated.

Quality (014.5)

- FR-040 Unit tests for every FR (jsdom, manual frames), Unicode corpus (ZWJ, modifiers, flags, combining
  marks, CJK, Thai, Hebrew, Arabic, mixed bidi), valid and invalid path corpus, cleanup counters, StrictMode.
- FR-041 Composition matrix (18 rows) in unit tests; browser rows in the lab.
- FR-042 Playground gallery + in-page suite for all 21 entries, run by the CDP check (≥ 125 earlier cases kept)
  and Playwright engines; real variable font.
- FR-043 Storybook stories for all 21 entries.
- FR-044 Packed consumer SSR + hydration of the new subpaths.
- FR-045 Measured gzip budgets proposed for the new entries; earlier budgets unchanged.
- FR-046 `pnpm check`, Storybook/Playground builds, three-OS CI on the PR's head commit.

## Success criteria

- SC-001 21 entries implemented, each with an API, a unit test, a story and a gallery demo.
- SC-002 Split effects expose exactly one accessible text (accessibility tree check in the lab); revert restores
  child node identity and order.
- SC-003 Zero React commits during playback; zero scheduler tasks at rest; at most one host write per effect
  per frame for split effects; layout reads only at documented points (counted).
- SC-004 axe clean on the galleries; reduced motion live in three engines.
- SC-005 Three engines pass the Phase 014 suite; native/fallback statuses recorded per engine.
- SC-006 Packed SSR consumer hydrates without mismatch; budgets met; CI green on three OSes.
