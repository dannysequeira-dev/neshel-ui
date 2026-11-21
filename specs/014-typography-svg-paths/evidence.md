# Evidence — Phase 014 (Typography & Text, SVG & Paths)

Local machine: Windows 11, Node 26.13.0 (ICU 78.3, Unicode 17.0), pnpm 12.16.1. Browsers: Chrome 157 (CDP
check), Playwright Chromium 158, Firefox 159, WebKit 27.2 (**WebKit is not Safari**). Statuses use the 001
vocabulary: **implemented**, **verified locally**, **verified in GitHub Actions** (recorded in the PR),
**planned/pending**. Nothing below was inferred from a run that did not happen.

## 1. Inventory (21 entries) — implemented and verified locally

| Id  | API (engine / React)                         | Unit | Composition row | Gallery + CDP/Playwright case                 | Story |
| --- | -------------------------------------------- | ---- | --------------- | --------------------------------------------- | ----- |
| T01 | `createTextReveal` / `TextReveal`            | ✓    | 1, 2, 3, 15     | ✓ (+ AX tree, Unicode, Capsize, lines resize) | ✓     |
| T02 | `createTypewriter` / `Typewriter`            | ✓    | 4               | ✓                                             | ✓     |
| T03 | `createScramble` / `ScrambleText`            | ✓    | 5               | ✓                                             | ✓     |
| T04 | `createGradientSweep` / `GradientText`       | ✓    | 16              | ✓                                             | ✓     |
| T05 | `createNumberRoll` / `NumberRoll`            | ✓    | —               | ✓ (de-DE, ar-EG)                              | ✓     |
| T06 | `createRotatingWords` / `RotatingWords`      | ✓    | 6               | ✓                                             | ✓     |
| T07 | `createTextWave` / `WaveText`                | ✓    | —               | ✓                                             | ✓     |
| T08 | `createHighlighter` / `Highlight`            | ✓    | 16              | ✓                                             | ✓     |
| T09 | `createTextMask` / `TextMask`                | ✓    | —               | ✓                                             | ✓     |
| T10 | `createFontAxes` / `FontAxes`                | ✓    | 18              | ✓ (Inter Variable)                            | ✓     |
| T11 | `createLineReveal` / `LineReveal`            | ✓    | 7               | ✓ (real ScrollProgress)                       | ✓     |
| S01 | `createPathDraw` / `usePathDraw`, `PathDraw` | ✓    | 8, 15, 17       | ✓                                             | ✓     |
| S02 | `createPathMorph` / `usePathMorph`           | ✓    | 9               | ✓                                             | ✓     |
| S03 | `createMotionPath` / `useMotionPath`         | ✓    | 10              | ✓ (native in all three)                       | ✓     |
| S04 | `createIconMorph` / `MorphIcon`              | ✓    | 11              | ✓ (keyboard, focus kept)                      | ✓     |
| S05 | `createGradientStops` / `useGradientStops`   | ✓    | 12              | ✓                                             | ✓     |
| S06 | `createChartDraw` / `useChartDraw`           | ✓    | —               | ✓                                             | ✓     |
| S07 | `createTurbulence` / `useTurbulence`         | ✓    | 14              | ✓                                             | ✓     |
| S08 | `createLogoReveal` / `useLogoReveal`         | ✓    | 13              | ✓                                             | ✓     |
| S09 | `createDashFlow` / `useDashFlow`             | ✓    | 17              | ✓                                             | ✓     |
| S10 | `createCheckmark` / `SuccessCheck`           | ✓    | —               | ✓                                             | ✓     |

## 2. Gates run locally (final tree of the PR)

| Gate                                       | Result                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm check`                               | passed — doctor, lint (0 errors), typecheck, `tests/` 110 (109 pass, 1 skipped), build, `test:packages` 660 pass (animations 456: 398 earlier + text 23 + svg 17 + composition-014 18), exports, `check:pack --with animations`                                                                                                                                                           |
| `pnpm check:browser:animations` (CDP)      | **147 cases passed** (125 Phase 013 cases kept + 22 Phase 014: 20 suite cases, AX tree, reduced motion live) incl. axe and no page errors                                                                                                                                                                                                                                                 |
| `pnpm check:animations:engines`            | **161 cases each** in Chromium 158, Firefox 159, WebKit 27.2 — all passed                                                                                                                                                                                                                                                                                                                 |
| `pnpm check:animations:consumer`           | passed — packed tarball, Vite build, SSR markup plain text, hydration without recoverable errors, Phase 014 interaction                                                                                                                                                                                                                                                                   |
| `pnpm check:animations:bundles`            | passed — every earlier budget unchanged and met; Phase 014 entries measured (§8)                                                                                                                                                                                                                                                                                                          |
| `pnpm check:animations:routers`            | passed — React Router 8.5.0 (offline) and Next 16.4.5 (registry) consumers                                                                                                                                                                                                                                                                                                                |
| `pnpm build:playground`, `build:storybook` | passed                                                                                                                                                                                                                                                                                                                                                                                    |
| Type fixtures                              | `type-tests/text-svg.tsx` (valid usage + 5 `@ts-expect-error`) in `pnpm typecheck`                                                                                                                                                                                                                                                                                                        |
| Three-OS CI                                | **verified in GitHub Actions**: run 44855788524 on `d8ce48a`, first attempt, 14/14 jobs (Ubuntu Node 22/24/26, Windows Node 26, macOS Node 26, browsers, docs, Next + starters, Vercel build). Earlier run 44590484219 on `248ce7f` failed: the new type fixture imported `@neshel-ui/animations/*` (resolves to `dist/`, not built when CI typechecks); fixed by importing from `../src` |

## 3. Unicode, RTL, Capsize, accessibility

- Unicode corpus (unit, segmenter on **and** off): ZWJ family 👨‍👩‍👧‍👦, 👍🏽, 🇪🇸, `e◌́`, Japanese, Thai, Hebrew,
  Arabic, mixed punctuation; segments are lossless; clusters are single pieces. Browser: the emoji is one
  piece in the three engines.
- RTL (browser, three engines): in `Hello שלום עולם 123 مرحبا` (LTR paragraph) the Hebrew clusters are laid out
  right-to-left inside a `dir="rtl"` isolate, the digits `123` left-to-right, the Arabic word is kept whole.
- Capsize (browser): a trimmed `<Heading size="xl">` keeps its box height when split — 32 px / 32 px
  (Chromium, Firefox), 28 px / 28 px (WebKit).
- One accessible text (Chrome accessibility tree, CDP `Accessibility.getFullAXTree`): the split heading is named
  once by its whole text (including the emoji); no per-character text nodes are exposed. In all engines the
  suite checks one `.neshel-text-a11y` copy and an `aria-hidden` visual copy per split element.
- Restoration: unit tests assert child-node identity and order, markup, attribute set and `cssText` after
  `revert()`/`destroy()` (splitter, every effect, composition rows).
- Interactive content: links, buttons, `[tabindex]`, `[role]`, editable content are never split (unit).
- axe: no violations on the lab page (CDP), including the gallery.
- Reduced motion live (CDP and three engines): reveals at progress 1, wave without transform, ants static (offset
  0), no turbulence filter, scheduler idle.
- **Pending (not run):** NVDA and VoiceOver passes — reproducible scripts in [manual-checks.md](manual-checks.md).

## 4. Browser support observed (support-matrix-014.md)

| Capability                          | Chromium 158                                                                                     | Firefox 159 | WebKit 27.2                                |
| ----------------------------------- | ------------------------------------------------------------------------------------------------ | ----------- | ------------------------------------------ |
| `Intl.Segmenter`                    | native                                                                                           | native      | native                                     |
| `clamp()`/`sin()` piece math        | native                                                                                           | native      | native                                     |
| `background-clip: text` (T04)       | native                                                                                           | native      | native                                     |
| `mask-image` (T09, S08)             | native                                                                                           | native      | native                                     |
| `font-variation-settings` (T10)     | native                                                                                           | native      | native                                     |
| `offset-path: path()` (S03)         | native                                                                                           | native      | native                                     |
| `color-mix()` in `stop-color` (S05) | native                                                                                           | native      | native                                     |
| CSS `d` property                    | yes                                                                                              | yes         | **no** (confirms the S02 attribute ledger) |
| JS geometry vs native length/points | ≤ 0.5 % on the 6-path corpus (curves, arcs, relative, subpaths, transforms) in the three engines |

Fallback paths are unit-tested (no `CSS.supports`: S03 JS mode, no mask → nothing hidden, no `color-mix` →
midpoint switch; no `Intl.Segmenter` → regex fallback). Real Safari, Edge and mobile devices: **unverified**.

## 5. SVG geometry evidence

Unit: parser normal form (relative = absolute; H/V/S/T exact; compact numbers; packed arc flags; implicit
lines), controlled errors for 7 invalid inputs (missing move, missing parameter, unknown command, bad flag,
`1e400`, numbers after `Z`, `NaN`); geometry of lines, rects, circle arcs (2πr within 0.1), cubic quarter
circle (π/2·r within 0.1), disconnected subpaths, zero-length paths, scaled and zero-radius arcs; morph policy
(exact, cubic promotion preserving length, arc flags, subpath structure, precision bounds, endpoints exact).
Browser native/JS comparison (§4).

## 6. Composition matrix

18 rows of [composition-matrix-014.md](contracts/composition-matrix-014.md) in `composition-014.test.mjs` (all
pass); browser-marked rows are covered by the gallery suite cases (Capsize height, timeline-free reveal, ScrollProgress
lines, keyboard icon morph, reduced motion, filter lifecycle, text + SVG together).

## 7. Interruption and reduced-motion states (unit)

Reveal finishing on live reduced motion; armed (waiting) effects shown when motion becomes reduced; typewriter
finish/restart; path-morph interruption continuing from the rendered shape; dash-claim arbitration (draw vs
flow) with resume; turbulence pausing on hidden page and resuming; timeline seek/reverse equivalence; sources
ignored under reduced motion (#11 rule).

## 8. Bundles (real tarball, Vite/Rolldown minified, gzip) — budgets proposed for owner review

| Entry                                          | Measured | Proposed budget |
| ---------------------------------------------- | -------- | --------------- |
| text: splitText (engine)                       | 4928 B   | 5248 B          |
| text: createTextReveal (engine)                | 12780 B  | 13312 B         |
| text: TextReveal                               | 13397 B  | 13952 B         |
| text: NumberRoll                               | 9821 B   | 10240 B         |
| text: entire entry                             | 20892 B  | 21760 B         |
| svg: path data + geometry + morph (pure)       | 3947 B   | 4224 B          |
| svg: createPathDraw (engine)                   | 11994 B  | 12544 B         |
| svg: createPathMorph (engine)                  | 8382 B   | 8832 B          |
| svg: MorphIcon                                 | 9167 B   | 9600 B          |
| svg: entire entry                              | 20980 B  | 21888 B         |
| css: text.css (with `@property` registrations) | 2755 B   | 2944 B          |
| css: svg.css                                   | 446 B    | 512 B           |

Tree-shaking markers: text entries contain no SVG, Cinematic or Scroll code; SVG entries no text code; the
pure geometry entry has no React and no scheduler. No earlier budget changed.

## 9. Performance (local observations, not guarantees)

| Measurement (lab, same page)                         | Chrome 157 CDP | Chromium 158 | Firefox 159 | WebKit 27.2 |
| ---------------------------------------------------- | -------------- | ------------ | ----------- | ----------- |
| `splitText` 600 characters → 489 cluster pieces      | 8.4 ms         | 3.8 ms       | 20 ms       | 10 ms       |
| `splitText` 5000 characters, words                   | 14.1 ms        | 7 ms         | 27 ms       | 15 ms       |
| Frame Δ at rest (mean / p95)                         | 15.6 / 17.5    | 16.1 / 17.6  | 6.8 / 8     | 22.1 / 31   |
| Frame Δ while 489 clusters reveal (mean / p95)       | 25.0 / 44.8    | 25.8 / 36.7  | 12.3 / 15   | 43.1 / 81   |
| Morph interpolation per frame (6 commands)           | 3.6 µs         | 6.1 µs       | 4 µs        | 5.5 µs      |
| Frame Δ 200×120 box without / with turbulence (mean) | 16.1 / 16.6    | 16.1 / 16.6  | 6.7 / 6.9   | 18.9 / 20.1 |

Architectural guarantees (unit/lab-verified): one host write per effect per frame for split effects, zero React
commits during playback, zero scheduler tasks at rest, loops without tasks off-screen/hidden/reduced, layout
reads only at split and on resize (1–3 read passes per resize, counted).

Finding: registering the progress and intermediate custom properties as `<number>` (`@property`) reduced the
600-cluster reveal from 36.8 → ~22–25 ms mean in Chrome; registering the indexes as well did not help and was
reverted. Many hundreds of simultaneously animated clusters remain above a 60 fps budget in Chromium and WebKit
headless — recorded as **K-5** below; no GPU/compositor claim is made.

## 10. Known issues and limitations

- **K-5** Hundreds of simultaneously animating clusters exceed a 16.7 ms frame in headless Chromium/WebKit
  (§9). Guidance: chars for short headings, words/lines for paragraphs; `maxPieces` degrades long texts.
- Joining/shaping scripts animate by word under `split: "chars"`; an RTL run split by nested inline markup inside
  an LTR element may order its parts LTR (set `dir` on the nested element); lines mode freezes `text-wrap:
  balance/pretty` decisions and is not designed for vertical writing modes.
- T05: for locales whose sign renders on the right in RTL contexts the visual roll follows logical part order;
  the accessible text is exact. Algorithmic numbering systems swap without rolling.
- T10 cannot detect a font's axes (fonts ignore unknown axes and clamp ranges).
- S01: during a draw the consumer's dash pattern is replaced (restored at the end); `vector-effect:
  non-scaling-stroke` is outside the guarantee. S02 needs compatible authoring (no resampling).
- K-2, K-3 (Phase 013) remain documented and unchanged; no Phase 013 area was modified.

## 11. Issue #9 (ContentSwap) — observation only

`main` runs since the stabilisation (PR #12): 44334734060 (`b7bfe14`, first attempt, success) and
44550230559 (`7207638`, Phase 013 merge, first attempt, success, all 14 jobs incl. windows-latest / Node 26).
That is **2 of the 3** required; the issue stays open; feature-branch runs are not counted.
