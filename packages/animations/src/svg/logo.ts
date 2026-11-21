/**
 * S08 — Logo reveal mask (catalogue §11; contracts/svg-api.md, research R13). The element (an `<svg>`,
 * `<img>` or any box) is revealed by a linear or radial gradient written to the arbitrated `mask` channel of
 * its Motion Host — only when `mask-image` is supported; otherwise nothing is hidden. Optional decorative
 * `outline` paths are drawn first (S01 renderer). The logo is fully visible without JavaScript, before the
 * effect starts, after `destroy()` and under reduced motion (`instant`); its accessible name is untouched.
 */
import { createChannelWriter } from "../core/channel.js";
import { clamp } from "../core/interpolate.js";
import { createDashRenderer, type DashRenderer } from "./draw.js";
import { getSvgSupport } from "./engine/debug.js";
import {
  createSvgEffect,
  elementsOf,
  type ProgressControl,
  type SvgEffectOptions,
} from "./engine/effect.js";

type Styled = Element & { readonly style: CSSStyleDeclaration };

export type LogoRevealPattern = "wipe-right" | "wipe-left" | "wipe-up" | "wipe-down" | "circle";

export interface LogoRevealOptions extends SvgEffectOptions {
  pattern?: LogoRevealPattern;
  /** Edge softness 0–0.5 (default 0.15). */
  softness?: number;
  /** Decorative outline paths drawn before the mask opens. */
  outline?: Element | Iterable<Element>;
}

const PATTERNS: readonly LogoRevealPattern[] = [
  "wipe-right",
  "wipe-left",
  "wipe-up",
  "wipe-down",
  "circle",
];
const DIRECTION: Record<string, string> = {
  "wipe-right": "to right",
  "wipe-left": "to left",
  "wipe-up": "to top",
  "wipe-down": "to bottom",
};

export function maskFor(pattern: LogoRevealPattern, progress: number, softness: number): string {
  const r = (n: number) => Math.round(n * 100) / 100;
  const edge = progress * (100 + softness * 100);
  const start = r(edge - softness * 100);
  if (pattern === "circle") {
    // The far corner is at ~71 % of the diagonal: scale so progress 1 uncovers everything.
    return `radial-gradient(circle at 50% 50%, #000 ${r(start * 0.75)}%, transparent ${r(edge * 0.75)}%)`;
  }
  return `linear-gradient(${DIRECTION[pattern]}, #000 ${start}%, transparent ${r(edge)}%)`;
}

export function createLogoReveal(
  element: Element,
  options: LogoRevealOptions = {},
): ProgressControl {
  if (!element || element.nodeType !== 1)
    throw new TypeError("createLogoReveal: element must be an element.");
  const pattern = options.pattern ?? "wipe-right";
  if (!PATTERNS.includes(pattern))
    throw new TypeError(`createLogoReveal: invalid pattern ${JSON.stringify(pattern)}`);
  const softness = options.softness ?? 0.15;
  if (typeof softness !== "number" || !(softness >= 0 && softness <= 0.5))
    throw new TypeError('createLogoReveal: "softness" must be from 0 to 0.5.');
  const outlines =
    options.outline === undefined ? [] : elementsOf(options.outline, undefined, "createLogoReveal");
  const supported = getSvgSupport().mask;
  const writer = supported
    ? createChannelWriter(element as Styled, ["mask"], { id: "svg/logo-reveal" })
    : undefined;
  let outline: DashRenderer | undefined;
  const effect = createSvgEffect(element, options, {
    name: "createLogoReveal",
    defaults: { duration: 1000, easing: "standard" },
    render(progress) {
      outline?.render(progress);
      if (!writer) return;
      const local = outlines.length ? clamp((progress - 0.35) / 0.65, 0, 1) : progress;
      if (local >= 1) writer.set("mask", undefined);
      else writer.set("mask", maskFor(pattern, local, softness));
    },
    onSettle(result) {
      if (result.status === "completed" && result.direction === "forward") {
        writer?.release();
        outline?.release();
      }
    },
  });
  if (outlines.length) {
    outline = createDashRenderer(
      outlines.map((el) => ({ element: el, window: [0, 0.6] as [number, number] })),
      "svg/logo-outline",
    );
  }
  if (effect.driver.state !== "idle" || effect.driver.driven) effect.driver.refresh();
  effect.onDestroy(() => {
    writer?.release();
    outline?.destroy();
  });
  return effect.control;
}
