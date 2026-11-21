/**
 * Capability report of the text family (Phase 014; contracts/support-matrix-014.md). Behavioural checks
 * through `CSS.supports` and `Intl`; `false` everywhere on the server.
 */
import { getSegmenterSupport } from "./engine/segment.js";

export interface TextSupport {
  segmenter: boolean;
  clamp: boolean;
  trigonometry: boolean;
  backgroundClipText: boolean;
  mask: boolean;
  fontVariation: boolean;
}

export function getTextSupport(): TextSupport {
  const css = (globalThis as { CSS?: { supports?(p: string, v?: string): boolean } }).CSS;
  const s = (property: string, value: string) =>
    typeof css?.supports === "function" && css.supports(property, value);
  return {
    segmenter: getSegmenterSupport().grapheme,
    clamp: s("opacity", "clamp(0, 0.5, 1)"),
    trigonometry: s("opacity", "sin(0)"),
    backgroundClipText: s("background-clip", "text") || s("-webkit-background-clip", "text"),
    mask: s("mask-image", "linear-gradient(#000, #000)"),
    fontVariation: s("font-variation-settings", '"wght" 400'),
  };
}
