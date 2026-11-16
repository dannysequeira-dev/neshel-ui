/** Pure interpolation helpers (contracts/motion-defaults.md §4). */

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

/** Linear interpolation from `from` to `to` at `t` (not clamped). */
export const mix = (from: number, to: number, t: number): number => from + (to - from) * t;

/** Inverse of `mix`: where `value` sits between `from` and `to` (0 when they are equal). */
export const progress = (from: number, to: number, value: number): number =>
  to === from ? 0 : (value - from) / (to - from);

export function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
  options: { clamp?: boolean } = {},
): number {
  const t = progress(inMin, inMax, value);
  return mix(outMin, outMax, options.clamp ? clamp(t, 0, 1) : t);
}
