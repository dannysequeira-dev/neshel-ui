/**
 * T04 — Gradient sweep text (catalogue §10, structure —; contracts/text-api.md §3). The element gets the
 * `text-sweep` token; `text.css` paints its text with a gradient whose base is `currentColor` (inside
 * `@supports (background-clip: text)` and `@media (forced-colors: none)`), so the text keeps the consumer's
 * colour wherever the highlight band is not, and is plain text without the capability or under forced
 * colours. The band position is `--neshel-text-sweep-progress`, written by the engine through the Motion Host
 * (rule R-1: no CSS animation on the consumer's element). One sweep by default; `repeat: Infinity` explicit.
 * Reduced motion (`static`): no sweep.
 */
import {
  createLoopTextEffect,
  type LoopEffectControl,
  type LoopTextOptions,
} from "./engine/loop-effect.js";

export interface GradientSweepOptions extends LoopTextOptions {
  /** Highlight colour (CSS; default `var(--neshel-primary, #6366f1)`). */
  color?: string;
  /** Band half-width as a fraction of the element (0.05–0.5; default 0.25). */
  width?: number;
  /** Gradient angle in degrees (default 100). */
  angle?: number;
}

const round = (value: number) => String(Math.round(value * 10000) / 10000);

export function createGradientSweep(
  element: HTMLElement,
  options: GradientSweepOptions = {},
): LoopEffectControl {
  if (!element || element.nodeType !== 1)
    throw new TypeError("createGradientSweep: element must be an HTML element");
  const color = options?.color;
  const width = options?.width ?? 0.25;
  const angle = options?.angle ?? 100;
  if (typeof width !== "number" || !(width >= 0.05 && width <= 0.5))
    throw new TypeError('createGradientSweep: "width" must be from 0.05 to 0.5.');
  if (typeof angle !== "number" || !Number.isFinite(angle) || Math.abs(angle) > 360)
    throw new TypeError('createGradientSweep: "angle" must be from -360 to 360.');
  const vars: Record<string, string> = {
    "--neshel-text-sweep-width": String(width),
    "--neshel-text-sweep-angle": `${angle}deg`,
  };
  const effect = createLoopTextEffect(element, element, options, {
    name: "createGradientSweep",
    token: "text-sweep",
    channels: ["--neshel-text-sweep-progress"],
    defaults: { duration: 1600, repeat: 0 },
    vars: color === undefined ? vars : { ...vars, "--neshel-text-sweep-color": color },
    frame: (time, period) => ({ "--neshel-text-sweep-progress": round((time % period) / period) }),
    rest: () => ({ "--neshel-text-sweep-progress": undefined }),
  });
  if (color !== undefined) effect.v.css("color", color, "");
  return effect.control;
}
