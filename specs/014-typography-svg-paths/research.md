# Research — Phase 014

Each finding states what was **observed** (with where) and what is **inferred**. Engine observations come
from the lab (`pnpm check:browser:animations`, `pnpm check:animations:engines`; Playwright Chromium, Firefox,
WebKit — WebKit is not Safari) and are recorded in [evidence.md](evidence.md). Node observations: Node
26.13.0, ICU 78.3, Unicode 17.0.

## R1 — `Intl.Segmenter`

- Observed (Node 26): grapheme segmentation keeps `👨‍👩‍👧‍👦` (ZWJ family), `👍🏽` (modifier), `🇪🇸` (regional
  indicator pair) and `e◌́` (combining acute) as single clusters; word segmentation is dictionary-based for
  Japanese (`こんにちは|世界|、|元気|です|か|。`) and Thai (`สวัสดี|ครับ| |ยินดี`), keeps `3.14` and `don't`
  as single word-like segments and reports punctuation as non-word-like.
- Shipped in Chromium 87, Safari 14.1 and Firefox 125 (MDN compat data; inferred, not re-verified on old
  versions). The lab records `typeof Intl.Segmenter` and a fixed grapheme/word probe in the three engines.
- **Decision.** Use `Intl.Segmenter` when present. Fallback (engines/runtimes without it): a Unicode
  property regex for extended grapheme clusters (base + `\p{M}`/variation selectors/emoji modifiers,
  ZWJ-joined sequences, regional-indicator pairs, CRLF) and words split at `\s` with punctuation attached;
  spaceless scripts (Han, Hiragana, Katakana, Thai, Lao, Khmer, Myanmar) fall back to one segment per
  grapheme. The fallback is approximate (no dictionary words, no Indic conjunct rules) and documented;
  it is exercised by unit tests that disable the segmenter.
- Rejected: `string.split("")` / `Array.from(string)` (code units / code points, not clusters),
  `grapheme-splitter`/`graphemer` (8–25 KiB for what the platform ships).

## R2 — One accessible copy

| Strategy                                                   | Problem                                                                                                                                       |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Leave pieces exposed (no ARIA)                             | VoiceOver (Safari) reads inline-block pieces one by one; NVDA browse mode may split words (known reports; to be confirmed in the manual pass) |
| `aria-label` on the element + `aria-hidden` pieces         | ARIA 1.2 prohibits naming `generic`/`paragraph` roles; labels on `<p>`/`<span>` are ignored by some readers; translation tools skip them      |
| **Visually hidden original + `aria-hidden` visual pieces** | the original text (and its inline markup) stays in the accessibility tree inside the original element; heading names come from content        |

**Decision:** the third. The original child nodes are **moved** (not cloned) into a visually hidden span
inside the element (`.neshel-text-a11y`, inline styles so it works without any stylesheet), and the visual
copy is built from text with inline phrasing clones stripped of `id`/ARIA/event attributes, under one
`aria-hidden="true"` root. Restoration moves the same node objects back. The hidden copy gets
`user-select: none` so a selection over the visible text copies it once.

## R3 — Bidirectional text and shaping

- Inline-block pieces are atomic inlines: the bidi algorithm treats them as neutral (U+FFFC). An RTL word
  split into atomic pieces inside an LTR paragraph would be laid out left-to-right (reversed reading).
- **Decision.** The splitter computes direction runs from the first strong character of each word (Hebrew,
  Arabic, Syriac, Thaana, N'Ko, Samaritan, Mandaic, Adlam, Hanifi Rohingya … → RTL; other letters → LTR;
  neutrals join the previous run) and wraps runs whose direction differs from the element's resolved base
  direction in `<span dir="…">` (HTML `dir` isolates). Words get `dir` too, so pieces inside a word follow
  its direction.
- Joining/shaping scripts (Arabic, Syriac, Mongolian, N'Ko, Mandaic, Adlam, Hanifi Rohingya and the Indic
  and Southeast-Asian abugidas — Devanagari … Sinhala, Myanmar, Khmer, Tibetan, Balinese, Javanese) lose
  their contextual forms when letters become separate boxes. **Decision:** character splitting keeps such
  words whole (`data-neshel-split-whole`), documented and tested; effects then animate them as one piece.

## R4 — Lines

- Lines exist only after layout. The splitter groups word pieces by their `offsetTop` (one read pass) into
  `display: block` line spans. Re-grouping needs the words unwrapped first (a line block forces a break),
  so a re-split is write → read → write: **one forced layout per re-split**, never per frame.
- Triggers: `ResizeObserver` inline-size change of the element, `document.fonts` `loadingdone`, `refresh()`,
  content change (React re-render). Re-splits are coalesced to one per frame through the scheduler.
- `text-align: justify` would leave every line block unjustified (each is a last line); the splitter marks
  the root (`data-neshel-justify`) and the stylesheet sets `text-align-last: justify` on all lines but the
  last. `text-wrap: balance/pretty` decisions are frozen at split time (documented).

## R5 — Driving hundreds of pieces (no per-piece writes per frame)

- Options: (a) one Motion Host per piece writing transform/opacity every frame; (b) WAAPI per piece;
  (c) **one** custom property on the package-owned visual root, per-piece values computed by CSS
  (`calc()`, `clamp()`, `sin()`) from an inline index `--neshel-i` written once at split time.
- (a) costs N host writes per frame; (b) creates N animations and a second clock outside the scheduler;
  (c) costs one host write per frame regardless of N and stays seekable and scrubbable (the number is a
  motion value). `clamp()` and `sin()` are in Chromium 111+/Firefox 108+/Safari 15.4+.
- **Decision (c).** Local progress of piece `i` of `n` with stagger `k`:
  `t = clamp(0, p·(1 + (n−1)·k) − i·k, 1)`, eased in CSS by smoothstep `t²(3 − 2t)`. Measured in the lab
  (evidence §Performance): frame cost with 600 graphemes.

## R6 — Numbers (T05)

- Observed (Node 26): `formatToParts` gives typed parts (`minusSign`, `integer`, `group`, `decimal`,
  `fraction`, `currency`, `literal`, `percentSign`, `compact`, `exponent…`), including bidi marks for
  `ar-EG` (`؜`, `‏`) and Arabic-Indic digits; `numberingSystem: "deva"` gives `०१२३४५६७८९`.
- **Decision.** Digits of the active numbering system are discovered by formatting 0–9 with the same
  locale/numbering system; a column per digit part rolls between those ten glyphs; every other part is a
  static piece. Numbering systems whose digits are not ten distinct single graphemes (algorithmic systems)
  swap the whole value without rolling. The accessible value is `Intl.NumberFormat#format(value)` in the
  hidden copy, updated once per `set()` (no live region). The visual root is an LTR isolate with bidi marks
  removed from static parts; for locales whose sign renders on the right in RTL contexts the visual order
  follows the logical part order (documented limitation; the accessible text is exact).

## R7 — Variable fonts (T10)

- No web API lists a font's axes; out-of-range values are clamped by the font engine, unknown axes ignored.
- Registered axes have high-level properties: `wght` → `font-weight` (1–1000), `wdth` → `font-stretch`
  (50%–200% usual, any percentage accepted), `slnt` → `font-style: oblique <angle>` (−90°…90°), `ital` →
  `font-style: italic`, `opsz` → automatic via `font-optical-sizing`. Writing these does not touch the
  consumer's `font-variation-settings`.
- **Decision.** Registered axes animate through their high-level property (host channel). Custom axes
  (`GRAD`, `XTRA`, `CASL`, …) need `font-variation-settings`: the effect reads the computed value once at
  start, parses the consumer's axis list, replaces only its own axes and writes the merged list through the
  host (exact restoration). Capability: `CSS.supports('font-variation-settings', '"wght" 400')`. The lab
  uses a real variable font (Roboto Flex, OFL) served by the Playground to verify wght/wdth/GRAD changes in
  glyph advance widths.

## R8 — Path geometry

- jsdom implements no SVG geometry (`getTotalLength` absent), so unit tests need a JavaScript geometry.
- **Decision.** One parser (absolute, exact normalisation H/V→L, S→C, T→Q) and a JS geometry (lines,
  quadratic/cubic Béziers by adaptive subdivision, arcs by endpoint→centre conversion, closed subpaths,
  moves) giving length, `pointAt(length)` with tangent angle, and per-subpath data. `measurePath` prefers
  native `getTotalLength()` when available and finite; the lab compares native and JS lengths and points on
  a corpus (curves, arcs, relative commands, disconnected subpaths, transforms, viewBox) — tolerance 0.5%.
- Dash units are **user units of the path** (before transforms and viewBox scaling), so transforms,
  `viewBox` changes and resizes do not change the length used for dashes; `pathLength` changes the unit and
  is honoured; a `d` change (MutationObserver) re-measures. `vector-effect: non-scaling-stroke` is outside
  the guarantee (documented).

## R9 — Morph policy (S02)

- Interpolating `d` strings by number position breaks as soon as commands differ (relative vs absolute,
  `H` vs `L`, implicit repeats, arc flags packed without separators).
- **Decision.** Parse both paths to the exact normal form. `normalize: "exact"` (default): sequences must
  match command by command (same letters, same subpath structure, same closure, equal arc flags).
  `normalize: "cubic"` additionally promotes `L` and `Q` to `C` (exact degree elevation, geometry
  unchanged), so lines and curves morph into each other. No resampling, point insertion or subpath
  re-ordering: they change geometry or require heuristics (flubber-style), and are out of scope.
  Incompatible input: `NeshelAnimationsError` naming the first mismatch (default) or `incompatible: "swap"`
  (documented fallback: the `d` switches at the midpoint, no interpolation). Non-finite numbers and
  malformed data are rejected; output is rounded to `precision` decimals (default 3).
- CSS `d: path()` is not supported in WebKit, so morphs write the `d` attribute in the scheduler's write
  phase (attribute ledger with exact restoration), not WAAPI (catalogue driver change, recorded).

## R10 — Motion along a path (S03)

- CSS Motion Path (`offset-path: path()`, `offset-distance`, `offset-rotate`) — Chromium 64+ (path), Firefox
  72+, Safari 16+ (MDN; inferred). With `offset-position: normal`, the path's origin is the element's box and
  the element's anchor (centre) is placed on the path; the offset transform composes with `translate`,
  `rotate`, `scale` and `transform` natively.
- **Decision.** Native mode writes `offset-path`, `offset-distance` and `offset-rotate` through internal host
  channels (exact restoration). Fallback mode (no `CSS.supports('offset-path', 'path("M0 0")')`) uses the R8
  geometry to place the centre on the path with a host transform layer (composes with other layers);
  differences are documented (the fallback rotates about the transform origin). Paths are in CSS px.

## R11 — Gradient stops (S05)

- `stop-color`/`stop-opacity` are CSS properties on `<stop>` in all three engines; `offset` is an
  attribute. **Decision:** colours interpolate with `color-mix(in oklab, from p%, to)` written as
  `stop-color` through the host (no JS colour parsing); without `color-mix` support the colour switches at
  the midpoint (fallback); offsets are attributes (ledger). Only the stops the consumer passes are touched.
  Forced colours or reduced motion: static.

## R12 — SVG filters (S07)

- `feTurbulence` + `feDisplacementMap` repaint the filtered region every change; cost grows with area and
  octaves. **Decision:** bounded options (frequency 0.001–0.2, amplitude 0–24 px, octaves 1–3, update rate
  1–30 Hz, region padding 0–25%), animation only while visible and not reduced; the package renders the
  filter in a hidden `aria-hidden` SVG and applies `filter: url(#…)` through the arbitrated `filter`
  channel. Frame cost is measured in the lab with and without the filter; no compositor/GPU claim.

## R13 — Masks (T09, S08)

- Unprefixed `mask-image` — Chromium 120+, Firefox 53+, Safari 15.4+ (inferred). **Decision:** masks are
  applied only by JavaScript after a capability check; without support nothing is hidden. Initial states are
  never hidden in SSR markup; failure, unmount, reduced motion and destroy end visible.

## R14 — Continuous effects (T04 loops, T06, T07, S05 loops, S07, S09)

WCAG 2.2.2: automatic motion lasting more than 5 s shown alongside other content needs pause/stop/hide.
**Policy:** defaults are finite (≤ 5 s); `repeat: Infinity` is explicit; every continuous effect exposes
`pause()`/`play()`, stops while its element is off-screen (IntersectionObserver) or the page is hidden, and
never runs under reduced motion (catalogue `off`/`static`). React components accept `paused`.

## R15 — Dependencies considered (ADR 0020)

| Candidate                               | Why rejected                                                                                                  |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| GSAP SplitText / MorphSVG / DrawSVG     | ADR 0018: GSAP is never a dependency; second engine                                                           |
| splitting.js, SplitType                 | code-unit/character splitting, `aria-label` approach (R2), no bidi runs                                       |
| grapheme-splitter, graphemer            | `Intl.Segmenter` ships in all target engines                                                                  |
| flubber, polymorph, svg-path-morph      | heuristic resampling changes geometry (R9); 10–40 KiB                                                         |
| svgpath, svg-path-properties, path-data | small, but the R8 parser + geometry is ~4 KiB gzip of our own, testable in jsdom, and shared with S02/S03/S06 |
