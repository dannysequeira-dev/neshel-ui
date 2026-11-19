/**
 * Unicode segmentation (Phase 014; contracts/text-splitter.md §1, research R1). `Intl.Segmenter` first:
 * extended grapheme clusters (emoji ZWJ sequences, modifiers, flags, combining marks) and dictionary words
 * for spaceless scripts. Without it, an approximate Unicode-property fallback (documented). Segments are
 * lossless: their concatenation is always the input. UTF-16 code units are never treated as characters.
 */

export interface WordSegment {
  readonly text: string;
  /** A word (with attached punctuation) — an animated piece. */
  readonly wordLike: boolean;
  /** A whitespace run — stays a plain text node between pieces. */
  readonly space: boolean;
}

type SegmentData = { segment: string; isWordLike?: boolean };
type SegmenterLike = { segment(text: string): Iterable<SegmentData> };
type SegmenterCtor = new (
  locale: string | undefined,
  options: { granularity: "grapheme" | "word" },
) => SegmenterLike;

/** Test hook: `false` forces the fallback (never used in production code paths). */
export const segmenterOverride: { enabled: boolean } = { enabled: true };

function getCtor(): SegmenterCtor | undefined {
  if (!segmenterOverride.enabled) return undefined;
  const intl = (globalThis as { Intl?: { Segmenter?: SegmenterCtor } }).Intl;
  return typeof intl?.Segmenter === "function" ? intl.Segmenter : undefined;
}

const cache = new Map<string, SegmenterLike>();
function segmenter(granularity: "grapheme" | "word", locale?: string): SegmenterLike | undefined {
  const Ctor = getCtor();
  if (!Ctor) return undefined;
  const key = `${granularity}|${locale ?? ""}`;
  let instance = cache.get(key);
  if (!instance) {
    try {
      instance = new Ctor(locale || undefined, { granularity });
    } catch {
      // Invalid locale tag: fall back to the default locale rather than failing the effect.
      instance = new Ctor(undefined, { granularity });
    }
    cache.set(key, instance);
  }
  return instance;
}

export function getSegmenterSupport(): { grapheme: boolean; word: boolean } {
  const available = getCtor() !== undefined;
  return { grapheme: available, word: available };
}

// Fallback cluster: a code point followed by marks, variation selectors, ZWNJ, emoji modifiers or tag
// characters, and ZWJ-joined code points; regional-indicator pairs; CRLF.
// Continuation: combining marks, variation selectors U+FE0E/U+FE0F, ZWNJ U+200C, emoji modifiers, tag
// characters; ZWJ U+200D joins the next code point.
const FALLBACK_GRAPHEME =
  // biome-ignore lint/suspicious/noMisleadingCharacterClass: the class lists continuation code points on purpose.
  /\p{Regional_Indicator}{2}|\r\n|[\s\S](?:[\p{M}\uFE0E\uFE0F\u200C\p{Emoji_Modifier}\u{E0020}-\u{E007F}]|\u200D[\s\S])*/gu;

export function segmentGraphemes(text: string, locale?: string): string[] {
  const native = segmenter("grapheme", locale);
  if (native) return Array.from(native.segment(text), (item) => item.segment);
  return text.match(FALLBACK_GRAPHEME) ?? [];
}

/** Whitespace that allows a line break (no-break spaces stay inside words). */
const SPACE = /^[^\S   ]+$/u;
const SPACELESS =
  /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}\p{Script=Lao}\p{Script=Khmer}\p{Script=Myanmar}]/u;
const LETTER_OR_DIGIT = /[\p{L}\p{N}]/u;

function rawWords(text: string, locale?: string): Array<{ text: string; word: boolean }> {
  const native = segmenter("word", locale);
  if (native) {
    return Array.from(native.segment(text), (item) => ({
      text: item.segment,
      word: item.isWordLike === true,
    }));
  }
  // Fallback: whitespace runs; spaceless-script clusters become one segment each.
  const out: Array<{ text: string; word: boolean }> = [];
  for (const run of text.split(/(\s+)/u)) {
    if (!run) continue;
    if (SPACE.test(run)) {
      out.push({ text: run, word: false });
      continue;
    }
    let buffer = "";
    for (const cluster of segmentGraphemes(run)) {
      if (SPACELESS.test(cluster)) {
        if (buffer) out.push({ text: buffer, word: LETTER_OR_DIGIT.test(buffer) });
        buffer = "";
        out.push({ text: cluster, word: true });
      } else buffer += cluster;
    }
    if (buffer) out.push({ text: buffer, word: LETTER_OR_DIGIT.test(buffer) });
  }
  return out;
}

/**
 * Words with attached punctuation (`Hello,` · `«Hola»`) and whitespace runs. Leading punctuation joins the
 * next word, trailing punctuation the previous one; a punctuation-only text is one piece.
 */
export function segmentWords(text: string, locale?: string): WordSegment[] {
  const out: Array<{ text: string; wordLike: boolean; space: boolean }> = [];
  let prefix = "";
  for (const item of rawWords(text, locale)) {
    if (SPACE.test(item.text)) {
      if (prefix) {
        out.push({ text: prefix, wordLike: true, space: false });
        prefix = "";
      }
      const last = out[out.length - 1];
      if (last?.space) last.text += item.text;
      else out.push({ text: item.text, wordLike: false, space: true });
      continue;
    }
    const last = out[out.length - 1];
    if (!item.word) {
      // Punctuation / symbols: attach to the previous word when adjacent, else keep for the next word.
      if (last && !last.space && !prefix) last.text += item.text;
      else prefix += item.text;
      continue;
    }
    out.push({ text: prefix + item.text, wordLike: true, space: false });
    prefix = "";
  }
  if (prefix) out.push({ text: prefix, wordLike: true, space: false });
  return out;
}

// Scripts (research R3).
const RTL =
  /[\p{Script=Hebrew}\p{Script=Arabic}\p{Script=Syriac}\p{Script=Thaana}\p{Script=Nko}\p{Script=Samaritan}\p{Script=Mandaic}\p{Script=Adlam}\p{Script=Hanifi_Rohingya}\p{Script=Yezidi}]/u;
const SHAPING =
  /[\p{Script=Arabic}\p{Script=Syriac}\p{Script=Mongolian}\p{Script=Nko}\p{Script=Mandaic}\p{Script=Adlam}\p{Script=Hanifi_Rohingya}\p{Script=Devanagari}\p{Script=Bengali}\p{Script=Gurmukhi}\p{Script=Gujarati}\p{Script=Oriya}\p{Script=Tamil}\p{Script=Telugu}\p{Script=Kannada}\p{Script=Malayalam}\p{Script=Sinhala}\p{Script=Myanmar}\p{Script=Khmer}\p{Script=Tibetan}\p{Script=Balinese}\p{Script=Javanese}]/u;
const STRONG = /\p{L}/u;

/** Direction of the first strong character: `"rtl"`, `"ltr"` or `undefined` (neutral only). */
export function strongDirection(text: string): "rtl" | "ltr" | undefined {
  for (const char of text) {
    if (RTL.test(char)) return "rtl";
    if (STRONG.test(char)) return "ltr";
  }
  return undefined;
}

/** Whether splitting this word into clusters would break contextual shaping (joining/abugida scripts). */
export function needsShaping(text: string): boolean {
  return SHAPING.test(text);
}
