/**
 * T01 — Split reveal (chars / words / lines) and T11 — Line-by-line reveal on scroll (catalogue §10,
 * structure S; contracts/text-api.md). The accessible splitter renders the pieces; one progress value
 * (`--neshel-reveal-progress` on the visual root) drives every piece through `text.css`:
 * `t = clamp(0, p·(1 + (n−1)·k) − i·k, 1)` eased by smoothstep. T11 takes a 0–1 progress source (the 011
 * `ScrollProgress` of a `<ScrollScene>`, received as a value) and scrubs lines, or plays once when the source
 * crosses a threshold. Reduced motion (`instant`): everything visible, the source is not followed.
 */
import type { ProgressSource } from "../core/progress-driver.js";
import { prefersReducedMotion, shouldReduceMotion } from "../core/reduced-motion.js";
import { createTextEffect, type ProgressControl, type TextEffectOptions } from "./engine/effect.js";
import type { SplitGranularity } from "./engine/split.js";

export type RevealVariant = "fade-up" | "fade" | "fade-down" | "blur" | "scale";
export type RevealOrder = "start" | "end" | "center" | "random";

export interface TextRevealOptions extends TextEffectOptions {
  /** Default `"words"`. */
  split?: SplitGranularity;
  locale?: string;
  maxPieces?: number;
  /** Default `"fade-up"`. */
  variant?: RevealVariant;
  /** Overlap between pieces: 0 (together) … 1 (one after another); default 0.2. */
  stagger?: number;
  /** Default `"start"`. */
  order?: RevealOrder;
  /** Seed of `order: "random"` (deterministic). */
  seed?: number;
  /** CSS length of the slide (default `"0.6em"`). */
  distance?: string;
}

export interface LineRevealOptions
  extends Omit<TextRevealOptions, "split" | "progress" | "trigger"> {
  /** 0–1 progress source; required for `scrub`, optional for `enter` (default IntersectionObserver). */
  source?: ProgressSource;
  /** `"scrub"` (default): lines follow the source; `"enter"`: play once past `threshold`. */
  mode?: "scrub" | "enter";
  /** `enter` threshold 0–1 (default 0.25). */
  threshold?: number;
}

const VARIANTS: readonly RevealVariant[] = ["fade-up", "fade", "fade-down", "blur", "scale"];
const ORDERS: readonly RevealOrder[] = ["start", "end", "center", "random"];

/** Deterministic PRNG (mulberry32). */
export function prng(seed: number): () => number {
  let state = seed >>> 0 || 1;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function orderIndexes(n: number, order: RevealOrder, seed: number): number[] | undefined {
  if (order === "start") return undefined;
  if (order === "end") return Array.from({ length: n }, (_, i) => n - 1 - i);
  if (order === "center") {
    const mid = (n - 1) / 2;
    return Array.from({ length: n }, (_, i) => Math.round(Math.abs(i - mid)));
  }
  const random = prng(seed);
  const slots = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [slots[i], slots[j]] = [slots[j] as number, slots[i] as number];
  }
  return slots;
}

function create(
  name: string,
  element: HTMLElement,
  options: TextRevealOptions,
  split: SplitGranularity,
): ProgressControl {
  const pre = createTextEffect(element, options, {
    name,
    token: "text-reveal",
    property: "--neshel-reveal-progress",
    split: { split, locale: options?.locale, maxPieces: options?.maxPieces },
    defaults: { duration: 900, easing: "linear" },
  });
  const { v, target, split: handle } = pre;
  const o = v.options(options);
  const variant = v.oneOf("variant", o.variant, VARIANTS, "fade-up");
  const stagger = v.number("stagger", o.stagger, split === "lines" ? 0.5 : 0.2, 0, 1);
  const order = v.oneOf("order", o.order, ORDERS, "start");
  const seed = v.number("seed", o.seed, 1, 0, 2 ** 32 - 1);
  const distance = v.css("distance", o.distance, "0.6em");
  if (target && handle) {
    target.setAttribute("data-neshel-reveal", variant);
    target.style.setProperty("--neshel-reveal-stagger", String(stagger));
    target.style.setProperty("--neshel-reveal-distance", distance);
    const applyOrder = () => {
      const indexes = orderIndexes(handle.pieces.length, order, seed);
      if (!indexes) return;
      const span = order === "center" ? Math.max(...indexes) + 1 : handle.pieces.length;
      target.style.setProperty("--neshel-reveal-count", String(span));
      handle.pieces.forEach((item, i) => {
        item.style.setProperty("--neshel-o", String(indexes[i]));
      });
    };
    applyOrder();
    // Lines are regrouped on resize/font changes: re-apply the order (no replay; same progress).
    pre.onDestroy(handle.onChange(applyOrder));
    pre.onDestroy(() => target.removeAttribute("data-neshel-reveal"));
  }
  return pre.control;
}

/** T01 — reveal the pieces of a text (chars, words or lines). */
export function createTextReveal(
  element: HTMLElement,
  options: TextRevealOptions = {},
): ProgressControl {
  return create("createTextReveal", element, options, options?.split ?? "words");
}

/** T11 — reveal a text line by line from a scroll (or any 0–1) progress source. */
export function createLineReveal(
  element: HTMLElement,
  options: LineRevealOptions = {},
): ProgressControl {
  const mode = options?.mode ?? "scrub";
  if (mode !== "scrub" && mode !== "enter") {
    throw new TypeError(`createLineReveal: invalid mode ${JSON.stringify(mode)}`);
  }
  const source = options?.source;
  if (mode === "scrub") {
    if (!source) {
      throw new TypeError('createLineReveal: "source" is required for mode "scrub".');
    }
    return create("createLineReveal", element, { ...options, progress: source }, "lines");
  }
  const threshold = options?.threshold ?? 0.25;
  if (typeof threshold !== "number" || !(threshold >= 0 && threshold <= 1)) {
    throw new TypeError("createLineReveal: threshold must be a number from 0 to 1.");
  }
  if (!source)
    return create("createLineReveal", element, { ...options, trigger: "visible" }, "lines");
  const control = create("createLineReveal", element, { ...options, trigger: "manual" }, "lines");
  if (!shouldReduceMotion(options.reducedMotion ?? "user", prefersReducedMotion())) control.seek(0);
  let played = false;
  const check = (progress: number) => {
    if (!played && progress >= threshold) {
      played = true;
      control.play();
    }
  };
  const unsubscribe = source.subscribe(check);
  check(source.get());
  const destroy = control.destroy;
  return Object.assign(control, {
    destroy() {
      unsubscribe();
      destroy();
    },
  });
}
