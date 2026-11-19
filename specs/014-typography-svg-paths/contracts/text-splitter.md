# Contract — Accessible text splitter (T01 foundation)

**Status: see [../evidence.md](../evidence.md).** Lives in `src/text/engine/` (`segment.ts`, `split.ts`),
exported by `@neshel-ui/animations/text`; framework-free; nothing runs at import time; SSR-safe (the
splitter needs a DOM element, so it never runs on the server). Research R1–R5; ADR 0029 §2.

## 1. Segmentation

```ts
segmentGraphemes(text: string, locale?: string): string[]
segmentWords(text: string, locale?: string): WordSegment[]   // { text, wordLike, space }
getSegmenterSupport(): { grapheme: boolean; word: boolean }  // Intl.Segmenter availability
```

- Graphemes are extended grapheme clusters (`Intl.Segmenter` `granularity: "grapheme"`); the concatenation
  of the segments always equals the input (lossless).
- Words: word-like segments carry following non-space punctuation (`Hello,`); whitespace runs are `space`
  segments and stay real text nodes between word pieces (line breaking and copy keep working); spaceless
  scripts use the segmenter's dictionary words.
- Fallback without `Intl.Segmenter`: research R1 (approximate; documented; tested).

## 2. `splitText(element, options)`

```ts
splitText(element: HTMLElement, options?: SplitTextOptions): SplitText

interface SplitTextOptions {
  split?: "chars" | "words" | "lines";   // default "words"; chars and lines always contain word pieces
  locale?: string;                       // default: closest [lang] of the element, else the document's
  /** Maximum animated pieces (default 1000, max 5000); above it chars degrade to words, words to lines. */
  maxPieces?: number;
}

interface SplitText {
  readonly state: "split" | "unsupported" | "reverted";
  readonly reason: string | undefined;   // why the content was not split
  readonly split: "chars" | "words" | "lines";  // actual granularity after degradation
  readonly root: HTMLElement | null;     // the aria-hidden visual root
  readonly pieces: readonly HTMLElement[];  // animated unit (chars, words or lines) in reading order
  readonly words: readonly HTMLElement[];
  readonly lines: readonly HTMLElement[];   // lines mode only
  readonly text: string;                 // the accessible text (textContent of the original nodes)
  /** Called after every re-split (lines regrouped); returns the unsubscribe. */
  onChange(listener: () => void): () => void;
  refresh(): void;                       // re-measure lines in the next frame
  revert(): void;                        // idempotent: exact restoration
}
```

### Resulting DOM

```html
<h2 data-neshel-split="words">                      <!-- the consumer's element: untouched otherwise -->
  <span class="neshel-text-a11y">Original <em>nodes</em></span>   <!-- moved, not cloned; visually hidden -->
  <span class="neshel-split" aria-hidden="true" style="--neshel-n: 2">
    <span class="neshel-split-word" style="--neshel-i: 0">Original</span> <em><span class="neshel-split-word" style="--neshel-i: 1">nodes</span></em>
  </span>
</h2>
```

- The visually hidden span carries its styles inline (`position:absolute; width:1px; height:1px;
  overflow:hidden; clip-path:inset(50%); white-space:nowrap; user-select:none`), so the content is never
  duplicated visually even without `text.css`. Essential layout of pieces is inline as well
  (`display:inline-block` for chars/words, `display:block` for lines); `text.css` adds effect rules only.
- Inline phrasing elements are reproduced in the visual copy as shallow clones without `id`, `name`,
  `role`, `tabindex`, `contenteditable`, `aria-*`, `on*` and `style` attributes (classes, `lang`, `dir`
  kept); `<br>` becomes a visual `<br>`.
- Direction runs (R3) are `<span dir>` isolates; RTL/LTR words carry `dir`; words of joining/shaping scripts
  are never split into chars (`data-neshel-split-whole`).
- Indexes: `--neshel-i` on each animated piece, `--neshel-n` (count) on the root.

### Supported content (the limitation is deliberate)

| Content                                                                                                                                                 | Behaviour                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Text nodes, `<br>`, phrasing elements `abbr b bdi bdo cite code data dfn em i kbd mark q s samp small span strong sub sup time u var` (nested)          | split                                                          |
| Anything else (`a`, `button`, `input`, `label`, `select`, `textarea`, `img`, `svg`, `video`, `iframe`, `math`, `ruby`, …), `[tabindex]`, `[contenteditable]`, an editable ancestor, an already split element (other granularity) | **not split**: `state: "unsupported"`, content untouched, development warning; effects fall back to their reduced end state (content fully visible) |
| Empty or whitespace-only text                                                                                                                           | `state: "unsupported"`, reason `"empty"`                       |

Links and buttons inside animated text are therefore never cloned or duplicated: wrap them outside the
split element or animate the element as a whole (Entrance).

### Lines

Research R4: lines are grouped from word `offsetTop` after construction (one documented layout read) and
re-grouped on inline-size change (`ResizeObserver`), `document.fonts` `loadingdone` and `refresh()`, at most
once per frame (scheduler read → write). Never per animation frame.

### Restoration and lifetime

`revert()` cancels pending re-splits, disconnects observers, removes the visual root, moves the original
node objects back in order, removes `data-neshel-split` and `data-neshel-justify`. Defensive: if the
consumer (or React) replaced the element's content meanwhile, `revert()` only releases resources. Counters
(`getTextDebugInfo()`): live splits, observers, layout reads, re-splits.

### SSR and hydration

Markup rendered on the server is the plain text (the React components render their string children);
splitting happens in a layout effect after hydration, so server and client markup match and no-JS users
read normal text. React components accept only string (or number) children; React may replace the
element's text on update (`textContent`), after which the effect re-splits.
