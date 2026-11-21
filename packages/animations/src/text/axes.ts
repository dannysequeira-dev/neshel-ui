/**
 * T10 — Variable-font axis animation (catalogue §10, structure —; contracts/text-api.md §3, research R7).
 * Registered axes animate through their high-level property (`wght` → `font-weight`, `wdth` →
 * `font-stretch`, `slnt` → `font-style: oblique`, `ital` → `font-style: italic` at ≥ 0.5) so the consumer's
 * `font-variation-settings` is untouched; `opsz` and custom axes (`GRAD`, `XTRA`, …) go through a merged
 * `font-variation-settings` that keeps every axis the consumer set (read once from the computed style). All
 * writes are Motion Host channels (exact restoration). The package cannot know a font's axes: unknown axes are
 * ignored by the font, out-of-range values clamped by it. Reduced motion (`static`): values applied directly.
 */
import { createChannelWriter } from "../core/channel.js";
import { mix } from "../core/interpolate.js";
import { createTextEffect, type ProgressControl, type TextEffectOptions } from "./engine/effect.js";

export type FontAxes = Record<string, number>;

export interface FontAxesOptions extends TextEffectOptions {
  from: FontAxes;
  to: FontAxes;
}

export interface FontAxesControl extends ProgressControl {
  /** Animate from the current values to new targets. */
  to(axes: FontAxes): Promise<unknown>;
}

const RANGES: Record<string, [number, number]> = {
  wght: [1, 1000],
  wdth: [1, 1000],
  slnt: [-90, 90],
  ital: [0, 1],
  opsz: [1, 1000],
};
const TAG = /^[A-Za-z0-9 ]{4}$/;

export function fontVariationSupported(): boolean {
  const css = (globalThis as { CSS?: { supports?(p: string, v: string): boolean } }).CSS;
  return (
    typeof css?.supports === "function" && css.supports("font-variation-settings", '"wght" 400')
  );
}

/** Parse a computed `font-variation-settings` value into axis → value. */
export function parseVariationSettings(value: string): Map<string, number> {
  const out = new Map<string, number>();
  if (!value || value === "normal") return out;
  for (const match of value.matchAll(/["']([A-Za-z0-9 ]{4})["']\s+(-?[\d.]+(?:e-?\d+)?)/g)) {
    out.set(match[1] as string, Number(match[2]));
  }
  return out;
}

function validate(name: string, axes: unknown): FontAxes {
  if (!axes || typeof axes !== "object")
    throw new TypeError(`createFontAxes: "${name}" must be an object of axis values.`);
  for (const [tag, value] of Object.entries(axes)) {
    if (!TAG.test(tag))
      throw new TypeError(
        `createFontAxes: invalid axis tag ${JSON.stringify(tag)} (4 characters).`,
      );
    const [min, max] = RANGES[tag] ?? [-1000, 1000];
    if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max)
      throw new TypeError(`createFontAxes: ${tag} must be a number from ${min} to ${max}.`);
  }
  return axes as FontAxes;
}

export function createFontAxes(element: HTMLElement, options: FontAxesOptions): FontAxesControl {
  let from = { ...validate("from", options?.from) };
  let target = { ...validate("to", options?.to) };
  const supported = fontVariationSupported();
  const writer = createChannelWriter(
    element,
    ["font-weight", "font-stretch", "font-style", "font-variation-settings"],
    { id: "text/font-axes" },
  );
  let consumer: Map<string, number> | undefined;
  let current: FontAxes = { ...from };

  function apply(values: FontAxes): void {
    current = values;
    if (!supported) return;
    const custom: string[] = [];
    for (const [tag, value] of Object.entries(values)) {
      const v = Math.round(value * 100) / 100;
      if (tag === "wght") writer.set("font-weight", String(v));
      else if (tag === "wdth") writer.set("font-stretch", `${v}%`);
      else if (tag === "slnt") writer.set("font-style", `oblique ${-v}deg`);
      else if (tag === "ital") writer.set("font-style", v >= 0.5 ? "italic" : "normal");
      else custom.push(tag);
    }
    if (custom.length) {
      if (!consumer) {
        // One computed-style read: the consumer's axes are kept in the merged value.
        const style = element.ownerDocument.defaultView?.getComputedStyle(element);
        consumer = parseVariationSettings(
          style?.getPropertyValue("font-variation-settings") ||
            element.style.getPropertyValue("font-variation-settings"),
        );
      }
      const merged = new Map(consumer);
      for (const tag of custom) merged.set(tag, Math.round((values[tag] as number) * 100) / 100);
      writer.set(
        "font-variation-settings",
        [...merged].map(([tag, value]) => `"${tag}" ${value}`).join(", "),
      );
    }
  }

  const effect = createTextEffect(
    element,
    { trigger: "manual", ...options },
    {
      name: "createFontAxes",
      token: "font-axes",
      property: "--neshel-axes-progress",
      defaults: { duration: 600, easing: "standard" },
      render(progress) {
        const keys = new Set([...Object.keys(from), ...Object.keys(target)]);
        const values: FontAxes = {};
        for (const key of keys)
          values[key] = mix(from[key] ?? target[key] ?? 0, target[key] ?? from[key] ?? 0, progress);
        apply(values);
      },
    },
  );
  effect.onDestroy(() => writer.release());
  const control = effect.control as FontAxesControl;
  control.to = (axes) => {
    from = { ...current };
    target = { ...validate("to", axes) };
    effect.driver.jump(0);
    effect.driver.play();
    return effect.driver.finished;
  };
  return control;
}
