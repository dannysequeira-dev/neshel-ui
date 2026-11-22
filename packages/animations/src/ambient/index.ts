/**
 * `@neshel-ui/animations/ambient` — Background & Ambient family (Phase 015, catalogue B01–B10). Experimental,
 * private. Decorative layers and canvases only (`aria-hidden`, no pointer interception); paused off-screen, on
 * hidden pages, under reduced motion and by the page-level `ambientMotion` switch; finite by default (5 s of
 * motion). `@neshel-ui/animations/ambient.css` holds the layers (paused by default) and keyframes.
 */
export {
  type CanvasAmbientOptions,
  createParticles,
  createStarfield,
  type ParticlesOptions,
  type StarfieldOptions,
} from "./canvas.js";
export type {
  AmbientBlock,
  AmbientControl,
  AmbientOptions,
  AmbientState,
} from "./engine/ambient.js";
export { type AmbientDebugInfo, getAmbientDebugInfo } from "./engine/debug.js";
export { type AmbientMotionSwitch, ambientMotion } from "./engine/registry.js";
export {
  createFloatingShapes,
  createPointerGlow,
  type FloatingShapesOptions,
  type PointerGlowOptions,
} from "./interactive.js";
export {
  type AuroraOptions,
  createAurora,
  createGradientShift,
  createGrain,
  createGridPattern,
  createMeshGradient,
  createWaves,
  type GradientShiftOptions,
  type GrainOptions,
  type GridPatternOptions,
  type MeshGradientOptions,
  type WavesOptions,
  waveTile,
} from "./layers.js";
export {
  AmbientMotionToggle,
  type AmbientMotionToggleProps,
  Aurora,
  type AuroraProps,
  FloatingShapes,
  type FloatingShapesProps,
  GradientShift,
  type GradientShiftProps,
  Grain,
  type GrainProps,
  GridPattern,
  type GridPatternProps,
  MeshGradient,
  type MeshGradientProps,
  Particles,
  type ParticlesProps,
  PointerGlow,
  type PointerGlowProps,
  Starfield,
  type StarfieldProps,
  Waves,
  type WavesProps,
} from "./react.js";
