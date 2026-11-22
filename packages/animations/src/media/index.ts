/**
 * `@neshel-ui/animations/media` — Images & Media family (Phase 015, catalogue M01–M10). Experimental, private.
 * Engines keep native media semantics (attributes never written; images never left hidden), write the consumer's
 * styles only through the Motion Host and release every node, listener and canvas on destroy. React components are
 * client modules. `@neshel-ui/animations/media.css` styles package-rendered frames, layers and the dialog.
 */
export { type ImageLoadState, type WatchImageOptions, watchImage } from "../core/media-load.js";
export type { ProgressControl, ProgressSource } from "../core/progress-driver.js";
export type { ProgressEffectOptions, ProgressTrigger } from "../core/progress-effect.js";
export {
  type CameraPose,
  cameraValues,
  createHoverPan,
  createKenBurns,
  type HoverPanControl,
  type HoverPanOptions,
  type KenBurnsOptions,
} from "./camera.js";
export { type CompareControl, type CompareSliderOptions, createCompareSlider } from "./compare.js";
export { createDuotone, type DuotoneOptions } from "./duotone.js";
export {
  getMediaDebugInfo,
  getMediaSupport,
  type MediaDebugInfo,
  type MediaSupport,
} from "./engine/debug.js";
export {
  type CrossfadeControl,
  type CrossfadeOptions,
  createCrossfade,
  createPixelDissolve,
  type DissolveControl,
  type GalleryOptions,
  type PixelDissolveOptions,
} from "./gallery.js";
export { createLightboxZoom, type LightboxControl, type LightboxZoomOptions } from "./lightbox.js";
export {
  BlurUpImage,
  type BlurUpImageProps,
  CompareSlider,
  type CompareSliderProps,
  Crossfade,
  type CrossfadeProps,
  Duotone,
  type DuotoneProps,
  HoverPan,
  type HoverPanProps,
  KenBurns,
  type KenBurnsProps,
  Lightbox,
  type LightboxProps,
  LoadReveal,
  type LoadRevealProps,
  PixelDissolve,
  type PixelDissolveProps,
  useKenBurns,
  useVideoScrub,
} from "./react.js";
export {
  type BlurUpOptions,
  createBlurUp,
  createLoadReveal,
  type LoadRevealOptions,
  type MediaRevealControl,
  type MediaRevealOptions,
  type MediaRevealState,
} from "./reveal.js";
export { createVideoScrub, type VideoScrubControl, type VideoScrubOptions } from "./video.js";
