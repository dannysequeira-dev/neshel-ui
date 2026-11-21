"use client";
/**
 * React bindings of the Typography & Text family (Phase 014; contracts/text-api.md). Components render the
 * element (`as`, default per component) with its plain text, so server markup is the readable text; the
 * engine runs in a layout effect after hydration and is recreated when the text or option values change.
 * `controlRef` receives the live control (play/pause/seek/track/…). No React state per frame.
 */
import {
  type ComponentPropsWithoutRef,
  createElement,
  type ElementType,
  type ReactNode,
  type RefObject,
  useLayoutEffect,
  useRef,
} from "react";
import type { ProgressControl } from "../core/progress-driver.js";
import { textOf, useEngine } from "../react/use-engine.js";
import {
  createFontAxes,
  type FontAxesControl,
  type FontAxesOptions,
  type FontAxes as FontAxesValues,
} from "./axes.js";
import type { LoopEffectControl } from "./engine/loop-effect.js";
import { type SplitText, type SplitTextOptions, splitText } from "./engine/split.js";
import { createHighlighter, type HighlighterOptions } from "./highlight.js";
import { createTextMask, type TextMaskOptions } from "./mask.js";
import { createNumberRoll, type NumberRollControl, type NumberRollOptions } from "./number.js";
import {
  createLineReveal,
  createTextReveal,
  type LineRevealOptions,
  type TextRevealOptions,
} from "./reveal.js";
import {
  createRotatingWords,
  type RotatingWordsControl,
  type RotatingWordsOptions,
} from "./rotate.js";
import { createScramble, type ScrambleOptions } from "./scramble.js";
import { createGradientSweep, type GradientSweepOptions } from "./sweep.js";
import { createTypewriter, type TypewriterControl, type TypewriterOptions } from "./typewriter.js";
import { createTextWave, type TextWaveOptions } from "./wave.js";

const useClientLayoutEffect = typeof window === "undefined" ? () => {} : useLayoutEffect;

type HostProps = Omit<ComponentPropsWithoutRef<"span">, "children"> & {
  /** Element to render (default per component; e.g. `"h2"`, `"p"`). */
  as?: ElementType;
};

type WithControl<C> = { controlRef?: RefObject<C | null> };

function useText<C extends { destroy(): void }>(
  component: string,
  as: ElementType,
  text: string | undefined,
  rest: Record<string, unknown>,
  controlRef: RefObject<C | null> | undefined,
  create: (element: HTMLElement) => C,
  options: unknown,
  deps: readonly unknown[] = [],
  children?: ReactNode,
) {
  const ref = useRef<HTMLElement | null>(null);
  const handle = useEngine(
    ref,
    (element) => {
      const control = create(element);
      if (controlRef) controlRef.current = control;
      return control;
    },
    options,
    [text, ...deps],
  );
  void handle;
  void component;
  return createElement(as, { ...rest, ref }, text ?? children);
}

function pick<T extends object>(
  props: T,
  keys: readonly string[],
): [Record<string, unknown>, Record<string, unknown>] {
  const options: Record<string, unknown> = {};
  const rest: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (keys.includes(key)) options[key] = value;
    else rest[key] = value;
  }
  return [options, rest];
}

const BASE = ["duration", "easing", "reducedMotion", "trigger", "progress", "onComplete"];
const LOOP = ["duration", "repeat", "reducedMotion", "trigger", "onComplete"];

/** `useSplitText(ref, options)` — split an element you render yourself; reverted on cleanup. */
export function useSplitText(
  ref: RefObject<HTMLElement | null>,
  options: SplitTextOptions = {},
  content?: unknown,
): RefObject<SplitText | null> {
  const handle = useRef<SplitText | null>(null);
  const key = JSON.stringify(options);
  // biome-ignore lint/correctness/useExhaustiveDependencies: option values and content only.
  useClientLayoutEffect(() => {
    if (!ref.current) return;
    const split = splitText(ref.current, options);
    handle.current = split;
    return () => {
      split.revert();
      handle.current = null;
    };
  }, [key, content]);
  return handle;
}

export type TextRevealProps = HostProps &
  TextRevealOptions &
  WithControl<ProgressControl> & { children: string | number };
/** T01 — split reveal. */
export function TextReveal(props: TextRevealProps) {
  const { as = "span", children, controlRef, ...all } = props;
  const [options, rest] = pick(all, [
    ...BASE,
    "split",
    "locale",
    "maxPieces",
    "variant",
    "stagger",
    "order",
    "seed",
    "distance",
  ]);
  return useText(
    "TextReveal",
    as,
    textOf("TextReveal", children),
    rest,
    controlRef,
    (el) => createTextReveal(el, options),
    options,
    [options.progress],
  );
}

export type TypewriterProps = HostProps &
  TypewriterOptions &
  WithControl<TypewriterControl> & { children: string | number };
/** T02 — typewriter. */
export function Typewriter(props: TypewriterProps) {
  const { as = "span", children, controlRef, ...all } = props;
  const [options, rest] = pick(all, [...BASE, "speed", "caret", "locale", "maxPieces"]);
  return useText(
    "Typewriter",
    as,
    textOf("Typewriter", children),
    rest,
    controlRef,
    (el) => createTypewriter(el, options),
    options,
    [options.progress],
  );
}

export type ScrambleTextProps = HostProps &
  ScrambleOptions &
  WithControl<ProgressControl> & { children: string | number };
/** T03 — scramble / decode. */
export function ScrambleText(props: ScrambleTextProps) {
  const { as = "span", children, controlRef, ...all } = props;
  const [options, rest] = pick(all, [...BASE, "charset", "seed", "rate", "locale", "maxPieces"]);
  return useText(
    "ScrambleText",
    as,
    textOf("ScrambleText", children),
    rest,
    controlRef,
    (el) => createScramble(el, options),
    options,
    [options.progress],
  );
}

export type GradientTextProps = HostProps &
  GradientSweepOptions &
  WithControl<LoopEffectControl> & { children?: ReactNode; paused?: boolean };
/** T04 — gradient sweep text (renders a `<span>` by default). */
export function GradientText(props: GradientTextProps) {
  const { as = "span", children, controlRef, paused, ...all } = props;
  const [options, rest] = pick(all, [...LOOP, "color", "width", "angle"]);
  const inner = useRef<LoopEffectControl | null>(null);
  const node = useText(
    "GradientText",
    as,
    undefined,
    rest,
    inner,
    (el) => createGradientSweep(el, options),
    options,
    [],
    children,
  );
  usePaused(inner, paused, controlRef);
  return node;
}

function usePaused<C extends { play(): void; pause(): void }>(
  inner: RefObject<C | null>,
  paused: boolean | undefined,
  controlRef: RefObject<C | null> | undefined,
) {
  useClientLayoutEffect(() => {
    if (controlRef) controlRef.current = inner.current;
    if (paused === undefined) return;
    if (paused) inner.current?.pause();
    else inner.current?.play();
  });
}

export type NumberRollProps = HostProps &
  Omit<NumberRollOptions, "value"> &
  WithControl<NumberRollControl> & { value: number | bigint };
/** T05 — number roll. Server markup: the formatted value. */
export function NumberRoll(props: NumberRollProps) {
  const { as = "span", value, controlRef, ...all } = props;
  const [options, rest] = pick(all, ["locale", "format", "duration", "easing", "reducedMotion"]);
  const ref = useRef<HTMLElement | null>(null);
  const initial = useRef(value);
  const latestValue = useRef(value);
  latestValue.current = value;
  const handle = useEngine(
    ref,
    (el) => createNumberRoll(el, { ...options, value: latestValue.current }),
    options,
  );
  useClientLayoutEffect(() => {
    if (controlRef) controlRef.current = handle.current;
    if (handle.current && handle.current.value !== value) void handle.current.set(value);
  }, [value]);
  let text: string;
  try {
    // The rendered child stays the first value: React never rewrites the engine's DOM.
    text = new Intl.NumberFormat(
      options.locale as string | undefined,
      options.format as Intl.NumberFormatOptions,
    ).format(initial.current as number);
  } catch {
    text = String(initial.current);
  }
  return createElement(as, { ...rest, ref }, text);
}

export type RotatingWordsProps = HostProps &
  RotatingWordsOptions &
  WithControl<RotatingWordsControl> & { paused?: boolean };
/** T06 — rotating words. Server markup: the first word (and the full list for assistive technology). */
export function RotatingWords(props: RotatingWordsProps) {
  const { as = "span", controlRef, paused, ...all } = props;
  const [options, rest] = pick(all, [
    ...LOOP,
    "words",
    "interval",
    "variant",
    "pauseOnHover",
    "accessibleText",
  ]);
  const inner = useRef<RotatingWordsControl | null>(null);
  const words = options.words as string[];
  const node = useText(
    "RotatingWords",
    as,
    undefined,
    rest,
    inner,
    (el) => createRotatingWords(el, options as unknown as RotatingWordsOptions),
    options,
    [],
    words?.[0],
  );
  usePaused(inner, paused, controlRef);
  return node;
}

export type WaveTextProps = HostProps &
  TextWaveOptions &
  WithControl<LoopEffectControl> & { children: string | number; paused?: boolean };
/** T07 — kinetic wave. */
export function WaveText(props: WaveTextProps) {
  const { as = "span", children, controlRef, paused, ...all } = props;
  const [options, rest] = pick(all, [...LOOP, "amplitude", "spread", "locale", "maxPieces"]);
  const inner = useRef<LoopEffectControl | null>(null);
  const node = useText(
    "WaveText",
    as,
    textOf("WaveText", children),
    rest,
    inner,
    (el) => createTextWave(el, options),
    options,
  );
  usePaused(inner, paused, controlRef);
  return node;
}

export type HighlightProps = HostProps &
  HighlighterOptions &
  WithControl<ProgressControl> & { children?: ReactNode };
/** T08 — highlighter draw (renders `<mark>` by default). */
export function Highlight(props: HighlightProps) {
  const { as = "mark", children, controlRef, ...all } = props;
  const [options, rest] = pick(all, [...BASE, "variant", "color"]);
  return useText(
    "Highlight",
    as,
    undefined,
    rest,
    controlRef,
    (el) => createHighlighter(el, options),
    options,
    [options.progress],
    children,
  );
}

export type TextMaskProps = HostProps &
  TextMaskOptions &
  WithControl<ProgressControl> & { children: string | number };
/** T09 — text mask reveal. */
export function TextMask(props: TextMaskProps) {
  const { as = "span", children, controlRef, ...all } = props;
  const [options, rest] = pick(all, [...BASE, "variant", "scope", "stagger", "locale"]);
  return useText(
    "TextMask",
    as,
    textOf("TextMask", children),
    rest,
    controlRef,
    (el) => createTextMask(el, options),
    options,
    [options.progress],
  );
}

export type FontAxesProps = HostProps &
  Omit<FontAxesOptions, "trigger"> &
  WithControl<FontAxesControl> & {
    children?: ReactNode;
    /** `true` animates to `to`, `false` back to `from` (default: play once on mount when undefined). */
    active?: boolean;
  };
/** T10 — variable-font axis animation. */
export function FontAxes(props: FontAxesProps) {
  const { as = "span", children, controlRef, active, ...all } = props;
  const [options, rest] = pick(all, [...BASE, "from", "to"]);
  const inner = useRef<FontAxesControl | null>(null);
  const node = useText(
    "FontAxes",
    as,
    undefined,
    rest,
    inner,
    (el) =>
      createFontAxes(el, {
        ...(options as unknown as FontAxesOptions),
        trigger: active === undefined ? "visible" : "manual",
      }),
    options,
    [],
    children,
  );
  useClientLayoutEffect(() => {
    if (controlRef) controlRef.current = inner.current;
    if (active === undefined || !inner.current) return;
    void inner.current.to((active ? options.to : options.from) as FontAxesValues);
  }, [active]);
  return node;
}

export type LineRevealProps = HostProps &
  LineRevealOptions &
  WithControl<ProgressControl> & { children: string | number };
/** T11 — line-by-line reveal from a progress source (e.g. `useScrollScene()` / `ScrollProgress`). */
export function LineReveal(props: LineRevealProps) {
  const { as = "p", children, controlRef, ...all } = props;
  const [options, rest] = pick(all, [
    "duration",
    "easing",
    "reducedMotion",
    "onComplete",
    "source",
    "mode",
    "threshold",
    "variant",
    "stagger",
    "order",
    "seed",
    "distance",
    "locale",
    "maxPieces",
  ]);
  return useText(
    "LineReveal",
    as,
    textOf("LineReveal", children),
    rest,
    controlRef,
    (el) => createLineReveal(el, options as LineRevealOptions),
    options,
    [options.source],
  );
}
