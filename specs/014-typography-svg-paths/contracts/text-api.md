# Contract — Typography & Text API (T01–T11)

**Status: see [../evidence.md](../evidence.md).** Subpath `@neshel-ui/animations/text` (family `text`),
stylesheet `@neshel-ui/animations/text.css` (opt-in). Engines are framework-free; React components are client
modules. Families never import each other: scroll progress (T11) and timelines reach text effects as values.

## 1. Shared control (also used by `./svg`)

```ts
interface ProgressSource {
  get(): number;
  subscribe(listener: (progress: number) => void): () => void;
}

interface ProgressControl {
  readonly state: MotionState; // "idle" | "running" | "paused" | "completed" | "cancelled" | "interrupted"
  readonly progress: number; // 0–1
  readonly finished: Promise<MotionResult>;
  play(): void;
  pause(): void;
  reverse(): void;
  finish(): void;
  cancel(): void;
  seek(progress: number): void; // deterministic render at a progress
  /** A C01 value track: `timeline.add(effect.track())` — the timeline clock drives the effect. */
  track(options?: {
    id?: string;
    from?: number;
    to?: number;
    duration?: number;
    easing?: Easing | EasingPreset;
  }): ProgressTrack;
  /** Follow any 0–1 source (`ScrollProgress`, motion value); replaces the own clock; returns the unsubscribe. */
  drive(source: ProgressSource): () => void;
  destroy(): void; // idempotent; exact restoration
}
```

- One motion value per effect; `play()` animates it with the 009 tween controller (`animateValue`) — no
  second clock; `track()` returns `{ id, value, from, to, duration, easing }`, structurally a C01
  `ValueTrackInput`, so `./text` never imports `./cinematic`.
- Common options: `duration`, `easing`, `reducedMotion` (`"user"` default), `trigger`
  (`"visible"` default — once, IntersectionObserver ≥ 15% visible; `"mount"`; `"manual"`), `progress`
  (a `ProgressSource`; implies scrubbing), `onComplete`.
- Reduced motion follows the catalogue column live: `instant` → the end state with no motion (a running
  effect finishes; an external source is not followed); `static`/`off` → continuous motion never runs.
- Rendering: one host-written custom property per frame on the package-owned visual root (research R5); the
  per-piece math lives in `text.css`. Without `text.css` the text is fully visible and static.

## 2. Entries

| Id  | Engine / React                            | Structure (catalogue)                                                                  | Key options (defaults)                                                                                                                                                                                | Reduced |
| --- | ----------------------------------------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| T01 | `createTextReveal` / `<TextReveal>`       | S — splitter (`chars`/`words`/`lines`)                                                 | `split: "words"`, `variant: "fade-up" \| "fade" \| "fade-down" \| "blur" \| "scale"`, `stagger: 0.2`, `order: "start" \| "end" \| "center" \| "random"`, `seed`, `distance: "0.6em"`, `duration: 900` | instant |
| T02 | `createTypewriter` / `<Typewriter>`       | S — chars                                                                              | `speed: 30` graphemes/s, `caret: "typing" \| "always" \| "none"`; `restart()`                                                                                                                         | instant |
| T03 | `createScramble` / `<ScrambleText>`       | S — chars; glyph overlay `::after { content: attr(data-glyph) }`                       | `charset` (graphemes), `seed: 1`, `rate: 24` (1–60 changes/s), `duration: 1200`                                                                                                                       | instant |
| T04 | `createGradientSweep` / `<GradientText>`  | — element token `text-sweep`, `--neshel-sweep-progress`                                | `color` (highlight, CSS), `width: 0.25`, `angle: 100`, `duration: 1600`, `repeat: 0` (`Infinity` explicit)                                                                                            | static  |
| T05 | `createNumberRoll` / `<NumberRoll>`       | S — package-rendered digit columns                                                     | `value`, `locale`, `format` (`Intl.NumberFormatOptions`), `duration: 800`; `set(value)`                                                                                                               | instant |
| T06 | `createRotatingWords` / `<RotatingWords>` | S — package-rendered stacked words                                                     | `words`, `interval: 2500`, `duration: 450`, `variant: "slide-up" \| "slide-down" \| "fade"`, `repeat: 0`, `pauseOnHover: true`, `accessibleText`                                                      | static  |
| T07 | `createTextWave` / `<WaveText>`           | S — chars                                                                              | `amplitude: "0.18em"` (≤ 0.5em), `spread: 0.5`, `duration: 1200` per cycle (≥ 400), `repeat: 2`                                                                                                       | off     |
| T08 | `createHighlighter` / `<Highlight>`       | — element token `highlight`, `--neshel-highlight-progress`                             | `variant: "marker" \| "underline"`, `color` (CSS), `duration: 700`                                                                                                                                    | instant |
| T09 | `createTextMask` / `<TextMask>`           | S — lines; or `scope: "element"` (host `mask` channel)                                 | `variant: "rise" \| "wipe"`, `scope: "lines"`, `stagger: 0.25`, `duration: 900`                                                                                                                       | instant |
| T10 | `createFontAxes` / `<FontAxes>`           | — host channels `font-weight`, `font-stretch`, `font-style`, `font-variation-settings` | `from`, `to` (axis → number), `duration: 600`; `to(axes)`                                                                                                                                             | static  |
| T11 | `createLineReveal` / `<LineReveal>`       | S — lines                                                                              | `source` (`ProgressSource`), `mode: "scrub" \| "enter"`, `threshold: 0.25`, `variant` (T01 variants), `stagger: 0.5`                                                                                  | instant |

Foundation exports: `splitText`, `segmentGraphemes`, `segmentWords`, `getSegmenterSupport`,
`getTextSupport`, `getTextDebugInfo`; React `useSplitText(ref, options)`.

## 3. Per-entry rules

- **K-5 default (owner review)** — T01 and T07 animate every piece at once, so their default `maxPieces` is
  **200** (instead of the splitter's 1000): a longer `chars` text animates by word (a longer `words` text by
  line), with a one-time development warning. An explicit `maxPieces` (1–5000) keeps the authored granularity
  (the opt-in to the measured, more expensive path; evidence §9). T02 typewriter and T03 scramble keep the
  splitter default (pieces change one at a time / not measured).
- **T01** — pieces start at their hidden pose only when the effect starts (never in SSR markup); lines mode
  re-groups on resize without replaying (the current progress is re-rendered).
- **T02** — the accessible copy is the complete text from the start (no per-character announcements); the
  caret is a package pseudo-element on the boundary piece (`data-caret`), `aria-hidden` with its root, blinks
  only while typing (and at most 5 s after, `caret: "always"`), never blinks under reduced motion. Layout is
  stable: hidden graphemes keep their space. `restart()` = `seek(0)` + `play()`; `finish()` shows all.
- **T03** — scramble glyphs are an attribute rendered by a pseudo-element of an `aria-hidden` piece; the
  real glyph stays in the DOM (transparent while scrambling), so width and line breaks never change. The
  glyph of piece `i` is a pure function of `(seed, i, tick)` with `tick = floor(progress × duration / (1000 /
  rate))` — deterministic for a given progress, no `Math.random`, at most one attribute write per unresolved
  piece per tick. Forced colours: overlay off, real text shown. Content change: React re-splits; the engine
  exposes `destroy()` + a new instance.
- **T04** — static styles keyed on the token inside `@supports (background-clip: text) or
  (-webkit-background-clip: text)` and `@media (forced-colors: none)`: the gradient uses `currentColor` as
  the base, so the text keeps the consumer's colour wherever the band is not, and is plain text when the
  capability is missing or forced colours are active. The element's own background image is replaced while
  the token is present (apply to an inline element; `<GradientText>` renders a `<span>`). Restoration =
  token removed + host property restored.
- **T05** — accessible value = `Intl.NumberFormat(locale, format).format(value)` in the hidden copy, updated
  once per `set()`, no live region; digit columns in the active numbering system (research R6); values must
  be finite numbers or bigints; increasing values roll up, decreasing roll down; structure changes (more
  digits, sign) take the target structure at the start; algorithmic numbering systems swap without rolling.
- **T06** — words stacked in one grid cell: the box is always the largest word (no layout shift); the
  accessible copy is `accessibleText` (default: the words joined by `", "`), no live region; rotation
  pauses on hover/focus, off-screen and hidden page; `pause()`/`play()`; reduced motion shows the first word.
- **T07** — vertical sine offset per grapheme from one phase value (`sin()` in CSS); amplitude envelope ramps
  to 0 at the end (rest state = no transform); no opacity or colour change (no flashing).
- **T08** — background band behind the text (`background-size` from the progress; `box-decoration-break:
  slice` draws across line fragments in reading order; `:dir(rtl)` starts at the right). The band is behind
  the glyphs; the default colour is a translucent yellow (`--neshel-highlight-color`); forced colours draw a
  `Highlight` underline instead of the band.
- **T09** — `rise`: each line's content rises inside a package line box (`overflow: clip`); `wipe`: a
  gradient mask per line (only after `CSS.supports` passes); without the capability or the stylesheet the
  text is simply visible. `scope: "element"` writes the arbitrated `mask` channel of the element.
- **T10** — registered axes through high-level properties; `opsz` and custom axes through a merged
  `font-variation-settings` (consumer axes kept, research R7); tags validated (`/^[A-Za-z0-9 ]{4}$/`);
  ranges validated (`wght` 1–1000, `wdth` 1–1000, `slnt` −90–90, `ital` 0–1, `opsz` 1–1000, custom
  −1000–1000); unsupported `font-variation-settings` → static. The package cannot detect a font's axes:
  unknown axes are ignored by the font, out-of-range values clamped by it.
- **T11** — `scrub`: lines follow `source`; `enter`: plays once when `source` crosses `threshold`; reduced
  motion: all lines shown, the source is not followed (C02/#11 rule); exact restoration on destroy.
