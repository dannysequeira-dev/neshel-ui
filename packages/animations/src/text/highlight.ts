/**
 * T08 — Highlighter draw (catalogue §10, structure —; contracts/text-api.md §3). The element (best an inline
 * `<mark>`/`<span>`) gets the `highlight` token; `text.css` draws a background band behind the glyphs whose
 * width follows `--neshel-highlight-progress` (written through the Motion Host). With the default
 * `box-decoration-break: slice` the band runs across line fragments in reading order (`:dir(rtl)` from the
 * right). The band never covers the text; forced colours draw a `Highlight` underline instead. Reduced motion
 * (`instant`): the band appears at once.
 */
import { createTextEffect, type ProgressControl, type TextEffectOptions } from "./engine/effect.js";

export interface HighlighterOptions extends TextEffectOptions {
  /** `"marker"` (default; most of the line height) or `"underline"` (a low band). */
  variant?: "marker" | "underline";
  /** Band colour (CSS; default translucent yellow, `--neshel-highlight-color`). */
  color?: string;
}

export function createHighlighter(
  element: HTMLElement,
  options: HighlighterOptions = {},
): ProgressControl {
  const variant = options?.variant ?? "marker";
  if (variant !== "marker" && variant !== "underline")
    throw new TypeError(`createHighlighter: invalid variant ${JSON.stringify(variant)}`);
  const vars: Record<string, string> = {
    "--neshel-highlight-size": variant === "marker" ? "0.85em" : "0.3em",
  };
  if (options?.color !== undefined) vars["--neshel-highlight-color"] = options.color;
  const effect = createTextEffect(element, options, {
    name: "createHighlighter",
    token: "highlight",
    property: "--neshel-highlight-progress",
    defaults: { duration: 700, easing: "standard" },
    vars,
  });
  if (options?.color !== undefined) effect.v.css("color", options.color, "");
  return effect.control;
}
