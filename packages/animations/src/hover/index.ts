/**
 * `@neshel-ui/animations/hover` — Hover & Pointer family (catalogue H01–H10; H03 Tilt3D from 008/009).
 * Experimental, private. Decor effects (lift shadow, glow, spotlight, underline, shine, border sweep)
 * render with the opt-in `@neshel-ui/animations/hover.css`.
 */
import type { AnyEffectDefinition } from "../core/effect.js";
import {
  borderSweep,
  glow,
  lift,
  magnetic,
  mediaZoom,
  parallax,
  shine,
  spotlight,
  underline,
} from "./effects.js";
import { tilt3D } from "./tilt/controller.js";

export {
  type BorderSweepOptions,
  borderSweep,
  type GlowOptions,
  glow,
  type LiftOptions,
  lift,
  type MagneticOptions,
  type MediaZoomOptions,
  magnetic,
  mediaZoom,
  type ParallaxOptions,
  parallax,
  type ShineOptions,
  type SpotlightOptions,
  shine,
  spotlight,
  type UnderlineOptions,
  underline,
} from "./effects.js";
export { Hover, type HoverProps } from "./hover.js";
export type { HoverOptions, HoverPointerType } from "./shared.js";
export {
  createTilt3D,
  type Tilt3DController,
  type Tilt3DState,
  tilt3D,
} from "./tilt/controller.js";
export type {
  ResolvedTilt3DOptions,
  Tilt3DAxis,
  Tilt3DOptions,
  Tilt3DPointerType,
} from "./tilt/options.js";
export { Tilt3D, type Tilt3DProps } from "./tilt/tilt-3d.js";
export { useTilt3D } from "./tilt/use-tilt-3d.js";

/** Every hover definition in catalogue order (H01–H10), for explicit registries. */
export const hoverEffects: readonly AnyEffectDefinition[] = /* @__PURE__ */ Object.freeze([
  lift,
  glow,
  tilt3D,
  magnetic,
  spotlight,
  borderSweep,
  underline,
  mediaZoom,
  parallax,
  shine,
]);
