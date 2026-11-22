/**
 * `@neshel-ui/animations/gpu` — optional WebGL2 surfaces and the GPU entries of Advanced 3D & Distortion (Phase 016,
 * catalogue D04, D06, D08, D10; ADR 0031). Experimental, private. No graphics dependency; shaders are package
 * constants; nothing touches WebGL, `window` or `document` at import. Native images stay in the DOM and in the
 * accessibility tree; decorative canvases cover them only after a successful draw and the image comes back on any
 * failure, context loss, reduced motion or destroy. `@neshel-ui/animations/gpu.css` positions package frames.
 */
export type { ProgressSource, ProgressTrack } from "../core/progress-driver.js";
export {
  createDepthParallax,
  DEPTH_ASPECT_TOLERANCE,
  type DepthParallaxControl,
  type DepthParallaxOptions,
  type ParallaxPose,
} from "./depth-parallax.js";
export {
  createDisplacementHover,
  type DisplacementControl,
  type DisplacementHoverOptions,
} from "./displacement.js";
export { configureGpu, type GpuConfig, type GpuSupport, getGpuSupport } from "./engine/config.js";
export { type GpuDebugInfo, getGpuDebugInfo } from "./engine/debug.js";
export type { GpuMode } from "./engine/image-effect.js";
export type { MapSource } from "./engine/sources.js";
export type { GpuReason } from "./engine/surface.js";
export { createPageCurl, type PageCurlControl, type PageCurlOptions } from "./page-curl.js";
export {
  DepthParallax,
  type DepthParallaxProps,
  DisplacementHover,
  type DisplacementHoverProps,
  PageCurl,
  type PageCurlProps,
  Ripple,
  type RippleProps,
} from "./react.js";
export { createRipple, type RippleControl, type RippleOptions } from "./ripple.js";
