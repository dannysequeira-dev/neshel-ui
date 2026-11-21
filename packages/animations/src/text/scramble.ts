/**
 * T03 — Scramble / decode (catalogue §10, structure S; contracts/text-api.md §3). Each unresolved cluster
 * shows a random glyph as the `data-glyph` attribute rendered by a pseudo-element of an `aria-hidden` piece;
 * the real cluster stays in the DOM (transparent fill) so widths and line breaks never change, and screen
 * readers only ever get the accessible copy. Glyphs are a pure function of `(seed, index, tick)` with
 * `tick = floor(progress × duration / (1000 / rate))` — deterministic for a given progress (seekable,
 * scrubbable, timeline-ready), no `Math.random`, at most one attribute write per unresolved piece per tick.
 */
import { createTextEffect, type ProgressControl, type TextEffectOptions } from "./engine/effect.js";
import { segmentGraphemes } from "./engine/segment.js";

export interface ScrambleOptions extends TextEffectOptions {
  /** Glyphs shown while decoding (split into graphemes; default letters, digits and symbols). */
  charset?: string;
  /** Seed of the glyph sequence (default 1). */
  seed?: number;
  /** Glyph changes per second (1–60; default 24). */
  rate?: number;
  locale?: string;
  maxPieces?: number;
}

const DEFAULT_CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!<>-_/[]{}=+*^?#";

/** Integer hash of (seed, index, tick) → [0, 2³²). */
export function glyphHash(seed: number, index: number, tick: number): number {
  let h =
    Math.imul(seed ^ Math.imul(index + 1, 0x9e3779b1), 0x85ebca77) ^
    Math.imul(tick + 1, 0xc2b2ae3d);
  h ^= h >>> 16;
  h = Math.imul(h, 0x7feb352d);
  h ^= h >>> 15;
  h = Math.imul(h, 0x846ca68b);
  h ^= h >>> 16;
  return h >>> 0;
}

export function createScramble(
  element: HTMLElement,
  options: ScrambleOptions = {},
): ProgressControl {
  const charset = options?.charset ?? DEFAULT_CHARSET;
  if (typeof charset !== "string" || charset.length === 0 || charset.length > 500) {
    throw new TypeError(
      'createScramble: "charset" must be a non-empty string (at most 500 characters).',
    );
  }
  const glyphs = segmentGraphemes(charset);
  const seed = options?.seed ?? 1;
  const rate = options?.rate ?? 24;
  if (!Number.isInteger(seed) || seed < 0)
    throw new TypeError('createScramble: "seed" must be a non-negative integer.');
  if (typeof rate !== "number" || !(rate >= 1 && rate <= 60))
    throw new TypeError('createScramble: "rate" must be from 1 to 60.');

  let pieces: readonly HTMLElement[] = [];
  let shown: Array<string | null> = [];
  let duration = 1200;

  function render(progress: number): void {
    const n = pieces.length;
    const resolved = Math.max(0, Math.min(n, Math.floor(progress * n + 1e-6)));
    const tick = Math.floor((progress * duration) / (1000 / rate));
    for (let i = 0; i < n; i++) {
      const item = pieces[i] as HTMLElement;
      let next: string | null = null;
      if (i >= resolved) {
        next = item.hasAttribute("data-neshel-split-whole")
          ? ""
          : (glyphs[glyphHash(seed, i, tick) % glyphs.length] as string);
      }
      if (shown[i] === next) continue;
      shown[i] = next;
      if (next === null) item.removeAttribute("data-glyph");
      else item.setAttribute("data-glyph", next);
    }
  }

  const effect = createTextEffect(element, options, {
    name: "createScramble",
    token: "scramble",
    property: "--neshel-scramble-progress",
    split: { split: "chars", locale: options?.locale, maxPieces: options?.maxPieces },
    defaults: { duration: 1200, easing: "linear" },
    render: (progress) => render(progress),
  });
  pieces = effect.split?.pieces ?? [];
  shown = pieces.map((item) => item.getAttribute("data-glyph"));
  duration = effect.v.duration("duration", options?.duration, 1200);
  render(
    effect.driver.progress === 0 && effect.driver.state === "idle" ? 1 : effect.driver.progress,
  );
  effect.onDestroy(() => {
    for (const item of pieces) item.removeAttribute("data-glyph");
  });
  return effect.control;
}
