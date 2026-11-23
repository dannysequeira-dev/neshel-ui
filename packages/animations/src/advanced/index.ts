/**
 * `@neshel-ui/animations/advanced` — Advanced 3D & Distortion, CSS entries (Phase 016, catalogue D01, D02, D03, D05,
 * D07, D09, D11). Experimental, private. Engines write the consumer's styles only through the Motion Host, change
 * accessibility attributes through a capture/restore ledger and release every layer, listener and observer on
 * destroy. Never imports the optional GPU layer (`./gpu`). React components are client modules.
 * `@neshel-ui/animations/advanced.css` lays out package-rendered structure and animates package layers only.
 */
export type { ProgressSource, ProgressTrack } from "../core/progress-driver.js";
export {
  type Corner,
  type CornerRecedeControl,
  type CornerRecedeOptions,
  createCornerRecede,
} from "./corner.js";
export { type CubeControl, type CubeRotateOptions, createCubeRotate } from "./cube.js";
export { type AdvancedDebugInfo, getAdvancedDebugInfo } from "./engine/debug.js";
export {
  type CardFlipControl,
  type CardFlipOptions,
  createCardFlip,
  type FlipSide,
} from "./flip.js";
export {
  createGlitch,
  GLITCH_MAX_RATE,
  type GlitchControl,
  type GlitchOptions,
  type GlitchTrigger,
} from "./glitch.js";
export {
  createPerspectiveGrid,
  type GridControl,
  type GridState,
  type PerspectiveGridOptions,
} from "./grid.js";
export {
  CardFlip,
  type CardFlipProps,
  CornerRecede,
  type CornerRecedeProps,
  CubeRotate,
  type CubeRotateProps,
  Glitch,
  type GlitchProps,
  PerspectiveGrid,
  type PerspectiveGridProps,
  RingCarousel,
  type RingCarouselProps,
  TiltShift,
  type TiltShiftProps,
} from "./react.js";
export { createRingCarousel, type RingCarouselOptions, type RingControl } from "./ring.js";
export { createTiltShift, type TiltShiftControl, type TiltShiftOptions } from "./tilt-shift.js";
