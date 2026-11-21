/**
 * `@neshel-ui/animations/text` — Typography & Text family (Phase 014, catalogue T01–T11). Experimental,
 * private. The accessible splitter and every effect engine are framework-free; React components are client
 * modules. Per-piece rendering lives in the opt-in `@neshel-ui/animations/text.css`; without it the text is
 * fully visible and static.
 */
export {
  createFontAxes,
  type FontAxes as FontAxesValues,
  type FontAxesControl,
  type FontAxesOptions,
  fontVariationSupported,
} from "./axes.js";
export { getTextDebugInfo, type TextDebugInfo } from "./engine/debug.js";
export type {
  ProgressControl,
  ProgressSource,
  TextEffectOptions,
  TextTrigger,
} from "./engine/effect.js";
export type { LoopEffectControl, LoopTextOptions } from "./engine/loop-effect.js";
export {
  getSegmenterSupport,
  segmentGraphemes,
  segmentWords,
  type WordSegment,
} from "./engine/segment.js";
export {
  type SplitGranularity,
  type SplitText,
  type SplitTextOptions,
  splitText,
} from "./engine/split.js";
export { createHighlighter, type HighlighterOptions } from "./highlight.js";
export { createTextMask, type TextMaskOptions } from "./mask.js";
export { createNumberRoll, type NumberRollControl, type NumberRollOptions } from "./number.js";
export {
  FontAxes,
  type FontAxesProps,
  GradientText,
  type GradientTextProps,
  Highlight,
  type HighlightProps,
  LineReveal,
  type LineRevealProps,
  NumberRoll,
  type NumberRollProps,
  RotatingWords,
  type RotatingWordsProps,
  ScrambleText,
  type ScrambleTextProps,
  TextMask,
  type TextMaskProps,
  TextReveal,
  type TextRevealProps,
  Typewriter,
  type TypewriterProps,
  useSplitText,
  WaveText,
  type WaveTextProps,
} from "./react.js";
export {
  createLineReveal,
  createTextReveal,
  type LineRevealOptions,
  type RevealOrder,
  type RevealVariant,
  type TextRevealOptions,
} from "./reveal.js";
export {
  createRotatingWords,
  type RotatingWordsControl,
  type RotatingWordsOptions,
} from "./rotate.js";
export { createScramble, type ScrambleOptions } from "./scramble.js";
export { getTextSupport, type TextSupport } from "./support.js";
export { createGradientSweep, type GradientSweepOptions } from "./sweep.js";
export { createTypewriter, type TypewriterControl, type TypewriterOptions } from "./typewriter.js";
export { createTextWave, type TextWaveOptions } from "./wave.js";
