# Evidence — Phase 014 (Typography & Text, SVG & Paths)

Local machine (review round 2026-11-21 included): Windows 11, Node 26.13.0 (ICU 78.3, Unicode 17.0), pnpm 12.16.1. Browsers: Chrome 157 (CDP
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
| `pnpm check`                               | passed — doctor, lint (0 errors), typecheck, `tests/` 110 (109 pass, 1 skipped), build, `test:packages` 673 pass (animations 469: 398 earlier + text 23 + svg 17 + composition-014 18 + review-014 13), exports, `check:pack --with animations`                                                                                                                                           |
| `pnpm check:browser:animations` (CDP)      | **147 cases passed** (125 Phase 013 cases kept + 22 Phase 014: 20 suite cases, AX tree, reduced motion live) incl. axe and no page errors                                                                                                                                                                                                                                                 |
| `pnpm check:animations:engines`            | **161 cases each** in Chromium 158, Firefox 159, WebKit 27.2 — all passed                                                                                                                                                                                                                                                                                                                 |
| `pnpm check:animations:consumer`           | passed — packed tarball, Vite build, SSR markup plain text, hydration (inside `<StrictMode>` since the review; production build, so no double effects there — the development double mount is unit-tested) without recoverable errors, Phase 014 interaction                                                                                                                              |
| `pnpm check:animations:bundles`            | passed — every earlier budget unchanged and met; the 12 Phase 014 budgets (owner-approved) met (§8)                                                                                                                                                                                                                                                                                       |
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

## 8. Bundles (real tarball, Vite/Rolldown minified, gzip) — budgets approved by the owner (PR #15 review)

Measured on the final tree of the review (shared attribute ledger, K-5 default). "First proposal" is the size
measured when the budgets were proposed. No budget was changed.

| Entry                                          | First proposal | After the review | Approved budget |
| ---------------------------------------------- | -------------- | ---------------- | --------------- |
| text: splitText (engine)                       | 4928 B         | 4926 B           | 5248 B          |
| text: createTextReveal (engine)                | 12780 B        | 12916 B          | 13312 B         |
| text: TextReveal                               | 13397 B        | 13527 B          | 13952 B         |
| text: NumberRoll                               | 9821 B         | 9821 B           | 10240 B         |
| text: entire entry                             | 20892 B        | 21114 B          | 21760 B         |
| svg: path data + geometry + morph (pure)       | 3947 B         | 3946 B           | 4224 B          |
| svg: createPathDraw (engine)                   | 11994 B        | 11993 B          | 12544 B         |
| svg: createPathMorph (engine)                  | 8382 B         | 8676 B           | 8832 B          |
| svg: MorphIcon                                 | 9167 B         | 9477 B           | 9600 B          |
| svg: entire entry                              | 20980 B        | 21296 B          | 21888 B         |
| css: text.css (with `@property` registrations) | 2755 B         | 2758 B           | 2944 B          |
| css: svg.css                                   | 446 B          | 446 B            | 512 B           |

The first version of the shared ledger measured 8969 B / 9726 B (createPathMorph / MorphIcon), above the
approved budgets; it was compacted (same behaviour, same tests) instead of raising them.

Tree-shaking markers: text entries contain no SVG, Cinematic or Scroll code; SVG entries no text code; the
pure geometry entry has no React and no scheduler. No earlier budget changed.

## 9. Performance (local observations, not guarantees)

| Measurement (lab, same page)                         | Chrome 157 CDP | Chromium 158 | Firefox 159 | WebKit 27.2 |
| ---------------------------------------------------- | -------------- | ------------ | ----------- | ----------- |
| `splitText` 600 characters → 489 cluster pieces      | 8.4 ms         | 3.8 ms       | 20 ms       | 10 ms       |
| `splitText` 5000 characters, words                   | 14.1 ms        | 7 ms         | 27 ms       | 15 ms       |
| Morph interpolation per frame (6 commands)           | 3.6 µs         | 6.1 µs       | 4 µs        | 5.5 µs      |
| Frame Δ 200×120 box without / with turbulence (mean) | 16.1 / 16.6    | 16.1 / 16.6  | 6.7 / 6.9   | 18.9 / 20.1 |

Architectural guarantees (unit/lab-verified): one host write per effect per frame for split effects, zero React
commits during playback, zero scheduler tasks at rest, loops without tasks off-screen/hidden/reduced, layout
reads only at split and on resize (1–3 read passes per resize, counted).

### 9.1 K-5 benchmark (owner review of PR #15)

`pnpm bench:animations:text` (`scripts/bench-animations-text.mjs`, in-page `benchTextLoad`): the built lab, the
same page and element, three states per trial — **idle** (plain text), **static** (split, nothing animating)
and **animated** (`TextReveal`, 6 s, `maxPieces: 5000` so the requested granularity is kept) — 60 frame
intervals each after 3 start-up intervals that are reported apart, **5 trials** per row (3 with throttling),
piece counts 20 → 2000. Δ = animated mean − static mean. Headless, no GPU, one Windows 11 machine; compare
rows and states, not absolute values across machines. Raw JSON is reproducible with `--report`.

Frame interval mean / p95 in ms; "> 25" = share of animated intervals above 25 ms.

| Pieces (chars) | Chromium static | Chromium animated | Δ    | > 25  | Firefox animated | Δ    | WebKit static | WebKit animated | Δ     | > 25  |
| -------------- | --------------- | ----------------- | ---- | ----- | ---------------- | ---- | ------------- | --------------- | ----- | ----- |
| 20             | 16.7 / 17.9     | 16.7 / 17.8       | 0    | 0 %   | 7.2 / 10         | 0    | 16.2 / 29     | 15.5 / 17       | −0.7  | 0 %   |
| 60             | 16.7 / 17.9     | 16.7 / 17.9       | 0    | 0 %   | 7.0 / 8          | 0.1  | 16.2 / 29     | 15.7 / 17       | −0.5  | 1 %   |
| 120            | 16.7 / 17.8     | 16.7 / 17.6       | 0    | 0 %   | 6.9 / 8          | 0    | 16.2 / 29     | 15.7 / 17       | −0.5  | 1 %   |
| 250            | 16.7 / 18.1     | 16.8 / 20.6       | 0.1  | 0.3 % | 6.9 / 8          | 0    | 16.1 / 17     | 12.3 / 18 ¹     | −3.8  | 0 %   |
| 489            | 16.7 / 17.9     | 21.0 / 31.9       | 4.3  | 27 %  | 7.2 / 9          | 0.2  | 16.1 / 17     | 15.9 / 23       | −0.2  | 2 %   |
| 1000           | 16.7 / 17.8     | 45.4 / 65.7       | 28.7 | 92 %  | 9.7 / 14         | 2.8  | 16.1 / 17     | 36.0 / 54       | 19.9  | 100 % |
| 2000           | 16.7 / 17.9     | 86.7 / 114.3      | 70.0 | 100 % | 17.6 / 26        | 10.7 | 20.1 / 31     | 142.6 / 188     | 122.5 | 100 % |

The same texts split by **words** (5 → 369 pieces) add ≤ 0.5 ms in Chromium and ≤ 0.1 ms in Firefox; in WebKit
up to 91 words add ≤ 0 ms, 186 words +4.8 ms and 369 words +15.8 ms. Idle and static rows are equal in every
engine: **the split DOM costs nothing at rest; the cost is the per-frame style work of animated pieces.**
Start-up (worst of the first 3 intervals after the effect starts): Chromium 18 ms (20 chars), 38 ms (250),
53 ms (489), 125–145 ms (1000–2000).

¹ WebKit headless sometimes delivers rAF faster than 60 Hz while animating (3–4 ms intervals with 23–47
words); such rows show negative Δ and are not evidence of a speed-up.

Chromium with the CPU throttled 4× (CDP `Emulation.setCPUThrottlingRate`, emulating a slower device; 3 trials):

| Pieces | chars animated (Δ, > 25)  | same text by words (pieces: Δ, > 25) |
| ------ | ------------------------- | ------------------------------------ |
| 60     | 20.3 / 38.3 (3.6, 22 %)   | 12: 16.7 / 19.5 (0, 0 %)             |
| 120    | 22.4 / 47.2 (5.8, 26 %)   | 23: 16.8 / 21.7 (0.1, 2 %)           |
| 200    | 29.8 / 68.4 (13.1, 44 %)  | 37: 17.8 / 26.4 (1.1, 7 %)           |
| 300    | 50.5 / 154.4 (33.8, 49 %) | 55: 20.5 / 40.3 (3.8, 21 %)          |
| 489    | 64.2 / 178.1 (47.5, 79 %) | 91: 18.3 / 32.1 (1.6, 11 %)          |

**Reconciliation with the earlier figure.** The first report (25.0–25.8 ms mean for 489 clusters in Chromium)
came from a single 60-frame sample in the lab suite that starts measuring on the frame the reveal is created,
so it mixes the start-up cost with the steady state. That sample varies between runs of the same build (16.6
and 24.5 ms in two Chromium runs during this review), which is why it is kept only as a lab observation; the
repeat-trial benchmark above is the reference. It confirms the limitation: hundreds of simultaneously animated
clusters cost Chromium +4.3 ms per frame at 489 and +28.7 ms at 1000; WebKit crosses its frame budget between
489 and 1000; Firefox stays within budget up to 1000.

### 9.2 K-5 decision (implemented): a default piece limit for simultaneous effects

TextReveal (T01) and TextWave (T07) animate every piece at once, so their default `maxPieces` is **200**
(the splitter's own default stays 1000). Above it the existing degradation applies — `chars` → words (→ lines
above 200 words) — with a one-time development warning; an explicit `maxPieces` (1–5000) keeps the authored
granularity (the opt-in to the expensive path). Typewriter (T02, one piece changes at a time) and Scramble
(T03, not measured here) keep 1000.

Why 200: unthrottled, every engine measured shows no incremental cost up to 250 clusters (Chromium +0.1 ms),
so headings and short paragraphs keep `chars` unchanged; the worst measured cases move to their words row
(489 chars → 91 words: Chromium +4.3 → 0 ms; 4× CPU +47.5 → +1.6 ms). It does not make chars animation free on
slow devices (60 chars already cost +3.6 ms at 4×); it bounds the default. Falsifiable: re-run the benchmark
(`--counts`, `--cpu-throttle`) on target hardware; if the knee moves, revise the constant
(`SIMULTANEOUS_PIECES`, `src/text/engine/split.ts`). Unit tests: degradation, explicit opt-in, wave and
typewriter (`test/review-014.test.mjs`, K-5 cases).

## 10. Known issues and limitations

- **K-5** (kept documented) Hundreds of simultaneously animating clusters exceed a 16.7 ms frame in headless
  Chromium (from ~489) and WebKit (between 489 and 1000) (§9.1). Mitigated by default: TextReveal/TextWave
  degrade above 200 pieces (§9.2); an explicit `maxPieces` re-enables the expensive path. Slow CPUs pay for
  per-character animation even below 200 (§9.1, 4× table). Not measured: real devices, GPUs, real Safari.
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

## 12. Owner review of PR #15 (issuecomment-7056966484) — regressions first

Tests in `test/review-014.test.mjs`, committed alone in `8ba955f` (run against the unfixed code) before the
fixes in `952aa66`, `db0e130` and `b2582c1` (compact ledger). Before = `e78ac4b` code; after = final head.

| Case                                                   | Before (failing evidence)                                                                                                                              | After                                                                              |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| R1 listeners after destroy                             | **fail** — `focusout` stayed registered (anonymous handler, no identity to remove)                                                                     | pass — the handler is kept and removed on destroy                                  |
| R1 React StrictMode remount + options change + unmount | **fail** — one extra `focusout` per mount survived                                                                                                     | pass — one live set, 0 after unmount                                               |
| R1 focusout microtask queued just before destroy       | pass — **refuted**: `loop.play()` is a no-op after destroy                                                                                             | pass — explicit `destroyed` guard added anyway                                     |
| R2 second morph on the same `<path>`                   | **fail** — B overwrote A's active geometry (`M0 25L50 25` instead of `M0 5L15 5`)                                                                      | pass — B waits (dev warning) and resumes with its last shape when A is destroyed   |
| R2 destroy the waiting morph first                     | **fail** — B restored its stale snapshot (`M0 5L15 5`) over A's current `M0 7.5L17.5 7.5`                                                              | pass — the survivor is untouched                                                   |
| R2 IconMorph + PathMorph, destroy mid-frame            | **fail** — the icon's destroy restored the original over the other morph                                                                               | pass — the waiting writer takes over at once                                       |
| R2 consumer (React) change of `d` during the morph     | **fail** — destroy restored the stale original `m0 0 h10`                                                                                              | pass — the consumer's newer value is restored                                      |
| R2 two gradient-stop loops on one stop `offset`        | **fail** — the second loop overwrote the first (`0.8438` instead of `0.5`)                                                                             | pass — one writer at a time, exact restore                                         |
| R3 `loopEffectControl.track()` after destroy           | **fail** — retained tracks still called `loop.seek` (`[50, 75, 100]`)                                                                                  | pass — every track unsubscribed on destroy; tracks created after destroy are inert |
| R3 real TextWave track retained by a timeline          | pass — **refuted as a visible defect**: the destroyed loop ignores seeks (no write); the subscription kept the loop reachable (retention), fixed by R3 | pass                                                                               |
| K-5 TextReveal / TextWave default limit                | **fail** (2 of 3) — 489 clusters animated as chars                                                                                                     | pass — words by default, chars with an explicit `maxPieces`                        |

Ownership policy (R2) and the React `d` case: contracts/svg-api.md §1.1; composition rows 19–20.
Resources after destroy verified by the tests: interaction listeners (counted on `EventTarget.prototype`),
track subscriptions, scheduler tasks (0), attribute values (exact strings), DOM restored.
