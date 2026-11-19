/**
 * `@neshel-ui/animations/svg` — SVG & Paths family (Phase 014, catalogue S01–S10). Experimental, private. The
 * path parser, geometry and morph policy are pure functions; effect engines write through the Motion Host and
 * an attribute ledger; React hooks/components are client modules. `@neshel-ui/animations/svg.css` styles only
 * package-rendered SVGs.
 */
export {
  type ChartDrawOptions,
  type CheckmarkOptions,
  createChartDraw,
  createCheckmark,
  createPathDraw,
  type PathDrawOptions,
} from "./draw.js";
export {
  getSvgDebugInfo,
  getSvgSupport,
  type SvgDebugInfo,
  type SvgSupport,
} from "./engine/debug.js";
export type {
  ProgressControl,
  ProgressSource,
  SvgEffectOptions,
  SvgTrigger,
} from "./engine/effect.js";
export {
  getPathGeometry,
  measurePath,
  type PathGeometry,
  type PathPoint,
} from "./engine/geometry.js";
export {
  getPathMorphCompatibility,
  interpolatePath,
  type MorphCompatibility,
  type MorphOptions,
} from "./engine/morph.js";
export { type PathCommand, parsePathData, serializePathData } from "./engine/path-data.js";
export { createLogoReveal, type LogoRevealOptions, type LogoRevealPattern } from "./logo.js";
export {
  createDashFlow,
  createGradientStops,
  createTurbulence,
  type DashFlowOptions,
  type GradientStop,
  type GradientStopsOptions,
  type LoopEffectControl,
  type LoopSvgOptions,
  type TurbulenceOptions,
} from "./loops.js";
export {
  createIconMorph,
  createPathMorph,
  type IconMorphControl,
  type IconMorphOptions,
  menuCloseShapes,
  type PathMorphControl,
  type PathMorphOptions,
} from "./morph.js";
export { createMotionPath, type MotionPathControl, type MotionPathOptions } from "./motion-path.js";
export {
  MorphIcon,
  type MorphIconProps,
  PathDraw,
  type PathDrawProps,
  SuccessCheck,
  type SuccessCheckProps,
  useChartDraw,
  useDashFlow,
  useGradientStops,
  useLogoReveal,
  useMotionPath,
  usePathDraw,
  usePathMorph,
  useTurbulence,
} from "./react.js";
