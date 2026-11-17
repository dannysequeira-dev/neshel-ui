/**
 * `@neshel-ui/animations/entrance` — Entrance & Reveal family (Phase 010, catalogue E01–E11).
 * Experimental, private. No stylesheet needed: every entrance renders through the motion host.
 */
import type { AnyEffectDefinition } from "../core/effect.js";
import {
  blurIn,
  clipReveal,
  fadeIn,
  fadeSlide,
  flipIn,
  maskWipe,
  rotateIn,
  scaleIn,
  springIn,
  zoomIn,
} from "./effects.js";
import { stagger } from "./stagger.js";

export {
  type BlurInOptions,
  blurIn,
  type ClipRevealOptions,
  clipCircle,
  clipReveal,
  type FadeInOptions,
  type FadeSlideOptions,
  type FlipInOptions,
  fadeDown,
  fadeIn,
  fadeLeft,
  fadeRight,
  fadeSlide,
  fadeUp,
  flipIn,
  flipX,
  flipY,
  type MaskWipeOptions,
  maskWipe,
  type RotateInOptions,
  rotateIn,
  type ScaleInOptions,
  type SpringInOptions,
  scaleIn,
  springIn,
  type ZoomInOptions,
  zoomIn,
} from "./effects.js";
export type { EntranceDirection, EntranceOptions } from "./factory.js";
export {
  Reveal,
  type RevealAppear,
  type RevealProps,
  Stagger,
  type StaggerProps,
} from "./reveal.js";
export { type StaggerOptions, type StaggerOrder, stagger } from "./stagger.js";

/** Every entrance definition in catalogue order (E01–E11), for explicit registries. */
export const entranceEffects: readonly AnyEffectDefinition[] = /* @__PURE__ */ Object.freeze([
  fadeIn,
  fadeSlide,
  scaleIn,
  zoomIn,
  blurIn,
  clipReveal,
  maskWipe,
  rotateIn,
  flipIn,
  stagger,
  springIn,
]);
