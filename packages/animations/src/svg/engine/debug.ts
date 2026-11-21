/**
 * SVG diagnostics and capabilities (Phase 014). Counters are plain numbers for tests, the lab and performance
 * reports; `getSvgSupport()` reports behavioural capability checks (`false` on the server).
 */
export const counters = {
  /** Live SVG effects. */
  effects: 0,
  /** Attribute writes by the ledger (cumulative). */
  attributeWrites: 0,
  /** Path measurements (cumulative). */
  measures: 0,
  /** Morph interpolations rendered (cumulative). */
  morphs: 0,
  /** Package filter elements alive. */
  filters: 0,
};

export interface SvgDebugInfo {
  effects: number;
  attributeWrites: number;
  measures: number;
  morphs: number;
  filters: number;
}

export function getSvgDebugInfo(): SvgDebugInfo {
  return { ...counters };
}

export interface SvgSupport {
  offsetPath: boolean;
  colorMix: boolean;
  mask: boolean;
  cssD: boolean;
}

const supports = (property: string, value: string) => {
  const css = (globalThis as { CSS?: { supports?(p: string, v: string): boolean } }).CSS;
  return typeof css?.supports === "function" && css.supports(property, value);
};

export function getSvgSupport(): SvgSupport {
  return {
    offsetPath: supports("offset-path", 'path("M0 0L1 1")'),
    colorMix: supports("color", "color-mix(in oklab, red 50%, blue)"),
    mask: supports("mask-image", "linear-gradient(#000, #000)"),
    cssD: supports("d", 'path("M0 0")'),
  };
}
