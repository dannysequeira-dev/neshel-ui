/**
 * T09 — Text mask reveal (catalogue §10, structure S/—; contracts/text-api.md §3). `scope: "lines"`
 * (default) splits lines: `rise` lifts each line's content inside a clipped package line box, `wipe` sweeps a
 * gradient mask per line (only when `mask-image` is supported). `scope: "element"` writes the arbitrated
 * `mask` channel of the element itself. Nothing is hidden without JavaScript, before the effect starts,
 * without the stylesheet or without the capability; reduced motion (`instant`) shows everything.
 */
import { createChannelWriter } from "../core/channel.js";
import { createTextEffect, type ProgressControl, type TextEffectOptions } from "./engine/effect.js";

export interface TextMaskOptions extends TextEffectOptions {
  variant?: "rise" | "wipe";
  scope?: "lines" | "element";
  /** Line overlap 0–1 (default 0.25). */
  stagger?: number;
  locale?: string;
}

export function maskSupported(): boolean {
  const css = (globalThis as { CSS?: { supports?(p: string, v: string): boolean } }).CSS;
  return (
    typeof css?.supports === "function" && css.supports("mask-image", "linear-gradient(#000, #000)")
  );
}

export function createTextMask(
  element: HTMLElement,
  options: TextMaskOptions = {},
): ProgressControl {
  const variant = options?.variant ?? "rise";
  const scope = options?.scope ?? "lines";
  if (variant !== "rise" && variant !== "wipe")
    throw new TypeError(`createTextMask: invalid variant ${JSON.stringify(variant)}`);
  if (scope !== "lines" && scope !== "element")
    throw new TypeError(`createTextMask: invalid scope ${JSON.stringify(scope)}`);
  const stagger = options?.stagger ?? 0.25;
  if (typeof stagger !== "number" || !(stagger >= 0 && stagger <= 1))
    throw new TypeError('createTextMask: "stagger" must be from 0 to 1.');
  const supported = maskSupported();

  if (scope === "element") {
    // The element's own mask, through the host (exclusive `mask` channel, exact restoration).
    const writer = supported
      ? createChannelWriter(element, ["mask"], { id: "text/text-mask" })
      : undefined;
    const effect = createTextEffect(element, options, {
      name: "createTextMask",
      token: "text-mask-element",
      property: "--neshel-mask-progress",
      defaults: { duration: 900, easing: "standard" },
      render(progress) {
        if (!writer) return;
        if (progress >= 1) writer.set("mask", undefined);
        else {
          const edge = Math.round(progress * 1200) / 10;
          writer.set("mask", `linear-gradient(90deg, #000 ${edge - 20}%, transparent ${edge}%)`);
        }
      },
    });
    effect.onDestroy(() => writer?.release());
    return effect.control;
  }

  const effect = createTextEffect(element, options, {
    name: "createTextMask",
    token: "text-mask",
    property: "--neshel-mask-progress",
    split: { split: "lines", locale: options?.locale },
    defaults: { duration: 900, easing: "linear" },
    vars: { "--neshel-mask-stagger": String(stagger) },
  });
  const root = effect.target;
  if (root && effect.split?.root) {
    // `wipe` without mask support falls back to `rise` (still never hides content without CSS/JS).
    root.setAttribute("data-neshel-mask", variant === "wipe" && !supported ? "rise" : variant);
    const wrap = () => {
      for (const line of effect.split?.lines ?? []) {
        if (line.firstElementChild?.classList.contains("neshel-split-line-inner")) continue;
        const inner = line.ownerDocument.createElement("span");
        inner.className = "neshel-split-line-inner";
        inner.style.display = "block";
        while (line.firstChild) inner.appendChild(line.firstChild);
        line.appendChild(inner);
      }
    };
    wrap();
    effect.onDestroy(effect.split.onChange(wrap));
  }
  return effect.control;
}
