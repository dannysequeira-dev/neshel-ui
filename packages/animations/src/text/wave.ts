/**
 * T07 — Kinetic wave (catalogue §10, structure S; contracts/text-api.md §3). Decorative: each cluster moves
 * vertically by `sin(phase − i·spread) × amplitude × energy`, computed by `text.css` from one phase value
 * written per frame on the visual root. The energy envelope ramps in and out so the rest state is no
 * transform. No opacity or colour change (no flashing). Reduced motion (`off`): no motion at all.
 */
import {
  createLoopTextEffect,
  type LoopEffectControl,
  type LoopTextOptions,
} from "./engine/loop-effect.js";
import { reportDefaultDegrade, SIMULTANEOUS_PIECES, splitText } from "./engine/split.js";

export interface TextWaveOptions extends LoopTextOptions {
  /** CSS length (default `"0.18em"`; keep ≤ 0.5em). */
  amplitude?: string;
  /** Phase offset between clusters in radians (0–3; default 0.5). */
  spread?: number;
  locale?: string;
  maxPieces?: number;
}

const round = (value: number) => String(Math.round(value * 10000) / 10000);

export function createTextWave(
  element: HTMLElement,
  options: TextWaveOptions = {},
): LoopEffectControl {
  if (!element || element.nodeType !== 1)
    throw new TypeError("createTextWave: element must be an HTML element");
  const spread = options?.spread ?? 0.5;
  if (typeof spread !== "number" || !(spread >= 0 && spread <= 3))
    throw new TypeError('createTextWave: "spread" must be from 0 to 3.');
  const split = splitText(element, {
    split: "chars",
    locale: options?.locale,
    maxPieces: options?.maxPieces ?? SIMULTANEOUS_PIECES,
  });
  reportDefaultDegrade("createTextWave", split, "chars", options?.maxPieces);
  const root = split.root;
  if (!root) {
    // Unsupported content: static text, inert control.
    return {
      state: "idle",
      progress: 0,
      play() {},
      pause() {},
      stop() {},
      seek() {},
      track: () => {
        throw new TypeError("createTextWave: the element's content is not split (unsupported).");
      },
      drive: () => () => {},
      destroy() {},
    };
  }
  let total = 0;
  const effect = createLoopTextEffect(root, element, options, {
    name: "createTextWave",
    token: "text-wave",
    channels: ["--neshel-wave-phase", "--neshel-wave-energy"],
    defaults: { duration: 1200, repeat: 2, minDuration: 400 },
    vars: {
      "--neshel-wave-amplitude": options?.amplitude ?? "0.18em",
      "--neshel-wave-spread": String(spread),
    },
    frame(time, period) {
      const phase = (time / period) * Math.PI * 2;
      // Smooth energy envelope: ramp in over the first 15 % of a cycle, out over the last one.
      const ramp = Math.min(period * 0.6, Number.isFinite(total) ? total / 2 : period);
      const end = Number.isFinite(total) ? total : Number.POSITIVE_INFINITY;
      const energy = Math.max(0, Math.min(1, time / ramp, (end - time) / ramp));
      return { "--neshel-wave-phase": round(phase), "--neshel-wave-energy": round(energy) };
    },
    rest: () => ({ "--neshel-wave-phase": undefined, "--neshel-wave-energy": undefined }),
  });
  effect.v.css("amplitude", options?.amplitude, "0.18em");
  const repeat = options?.repeat ?? 2;
  total = effect.period * (repeat + 1);
  effect.onDestroy(() => split.revert());
  return effect.control;
}
