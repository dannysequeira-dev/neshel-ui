/**
 * Easing functions and CSS conversions (contracts/motion-defaults.md §3).
 * Every easing is a function `t ∈ [0, 1] → value`; easings that have a CSS form carry it in `css`.
 */
import { DEFAULT_SPRING, resolveSpring, type SpringOptions, stepSpring } from "./spring.js";

export type Easing = ((t: number) => number) & { readonly css?: string };

function withCss(fn: (t: number) => number, css: string): Easing {
  return Object.assign(fn, { css });
}

/** CSS `cubic-bezier()` solved with Newton–Raphson and a bisection fallback (error ≤ 1e-6 in x). */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number): Easing {
  for (const value of [x1, y1, x2, y2]) {
    if (!Number.isFinite(value)) throw new RangeError("cubicBezier: control points must be finite");
  }
  if (x1 < 0 || x1 > 1 || x2 < 0 || x2 > 1) {
    throw new RangeError("cubicBezier: x1 and x2 must be within [0, 1]");
  }
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sampleX = (s: number) => ((ax * s + bx) * s + cx) * s;
  const sampleY = (s: number) => ((ay * s + by) * s + cy) * s;
  const slopeX = (s: number) => (3 * ax * s + 2 * bx) * s + cx;
  const solve = (x: number) => {
    let s = x;
    for (let index = 0; index < 8; index++) {
      const error = sampleX(s) - x;
      if (Math.abs(error) < 1e-7) return s;
      const slope = slopeX(s);
      if (Math.abs(slope) < 1e-6) break;
      s -= error / slope;
    }
    let low = 0;
    let high = 1;
    s = x;
    while (high - low > 1e-7) {
      const value = sampleX(s);
      if (Math.abs(value - x) < 1e-7) break;
      if (value < x) low = s;
      else high = s;
      s = (low + high) / 2;
    }
    return s;
  };
  const css = `cubic-bezier(${x1}, ${y1}, ${x2}, ${y2})`;
  return withCss((t) => (t <= 0 ? 0 : t >= 1 ? 1 : sampleY(solve(t))), css);
}

/** CSS `steps(count, jump-start | jump-end)`. */
export function steps(count: number, position: "start" | "end" = "end"): Easing {
  if (!Number.isInteger(count) || count < 1)
    throw new RangeError("steps: count must be a positive integer");
  const css = `steps(${count}, jump-${position})`;
  return withCss((t) => {
    if (t <= 0) return position === "start" ? 1 / count : 0;
    if (t >= 1) return 1;
    const step = position === "start" ? Math.ceil(t * count) : Math.floor(t * count);
    return Math.min(1, step / count);
  }, css);
}

export const linear: Easing = withCss((t) => t, "linear");

/** Named easings (values tuned in 009 with the lab). */
export const easings = Object.freeze({
  linear,
  standard: cubicBezier(0.2, 0, 0, 1),
  emphasized: cubicBezier(0.3, 0, 0, 1),
  decelerate: cubicBezier(0, 0, 0, 1),
  accelerate: cubicBezier(0.3, 0, 1, 1),
});

export type EasingPreset = keyof typeof easings;

export function resolveEasing(easing: Easing | EasingPreset | undefined): Easing {
  if (easing === undefined) return easings.standard;
  if (typeof easing === "function") return easing;
  const preset = easings[easing];
  if (!preset) throw new RangeError(`unknown easing preset ${JSON.stringify(easing)}`);
  return preset;
}

/** CSS string of a preset or of an easing created by `cubicBezier`/`steps`/`linear`. */
export function toCssEasing(easing: Easing | EasingPreset): string {
  const css = resolveEasing(easing).css;
  if (!css)
    throw new RangeError(
      "toCssEasing: this easing has no CSS form; use springEasing() or a cubic-bezier",
    );
  return css;
}

/**
 * Sample a spring from 0 to 1 into a CSS `linear()` easing plus the duration until rest (ms), so CSS
 * and WAAPI drivers keep the spring's character (research R4 of feature 008).
 */
export function springEasing(
  spring: SpringOptions = DEFAULT_SPRING,
  options: { points?: number } = {},
): { easing: string; duration: number } {
  const resolved = resolveSpring(spring);
  const step = 1 / 240;
  const state = { value: 0, velocity: 0 };
  const samples: number[] = [0];
  let time = 0;
  while (time < 10) {
    time += step;
    const settled = stepSpring(state, 1, resolved, step);
    samples.push(state.value);
    if (settled) break;
  }
  const points = Math.max(2, Math.min(200, Math.round(options.points ?? 40)));
  const values: string[] = [];
  for (let index = 0; index < points; index++) {
    const sample = samples[Math.round((index / (points - 1)) * (samples.length - 1))] ?? 1;
    values.push(String(Math.round(sample * 10000) / 10000));
  }
  values[0] = "0";
  values[values.length - 1] = "1";
  return { easing: `linear(${values.join(", ")})`, duration: Math.round(time * 1000) };
}
