/**
 * `@neshel-ui/animations/scroll` — scroll engine, Scroll Triggers (ST01–ST10) and Scroll & Parallax
 * (SP01–SP11) (Phase 011; contracts/api-011.md, ADR 0026). Experimental, private.
 *
 * The engine (`createScrollProgress`, `observeInView`, …) and the effect definitions are framework-free;
 * the React components and hooks are client modules. Optional stylesheet: `@neshel-ui/animations/scroll.css`
 * (scenes, stage pinning, progress bar, horizontal section, sticky stack, parallax frame).
 */
import type { AnyEffectDefinition } from "../core/effect.js";
import {
  depthParallax,
  imageParallax,
  pinnedScene,
  scrollColorShift,
  scrollProgress,
  scrubTransform,
  stickyStack,
  velocitySkew,
  zoomOnScroll,
} from "./parallax.js";
import {
  directionHeader,
  inViewProgress,
  lazyEffect,
  revealOnEnter,
  staggerOnEnter,
  stuckState,
} from "./triggers.js";

export { getScrollDebugInfo, type ScrollDebugInfo } from "./engine/debug.js";
export { refreshScroll } from "./engine/geometry.js";
export {
  createScrollTrigger,
  createSectionSpy,
  type InViewInput,
  type InViewOptions,
  type InViewPosition,
  type InViewPreset,
  type InViewReport,
  inViewPresets,
  observeInView,
  type ResolvedInView,
  resolveInView,
  type ScrollTrigger,
  type ScrollTriggerOptions,
  type SectionSpy,
  type SectionSpyOptions,
  type TriggerMode,
  type TriggerState,
} from "./engine/in-view.js";
export { type DriverPreference, nativeScrollAvailable } from "./engine/native.js";
export {
  createScrollProgress,
  type RangeInput,
  type RangeName,
  type ScrollDiagnostics,
  type ScrollGeometry,
  type ScrollProgress,
  type ScrollProgressOptions,
} from "./engine/progress.js";
export type { ScrollAxis } from "./engine/source.js";
export {
  type HorizontalLayout,
  HorizontalScroll,
  type HorizontalScrollProps,
} from "./horizontal.js";
export {
  colorAt,
  coveredScale,
  type DepthParallaxOptions,
  depthParallax,
  type ImageParallaxOptions,
  imageParallax,
  type PinnedSceneOptions,
  type PropertyProgressOptions,
  pinnedScene,
  type ScrollColorShiftOptions,
  type ScrollProgressOptions as ScrollProgressEffectOptions,
  type ScrubPose,
  type ScrubTransformOptions,
  type StickyStackOptions,
  scrollColorShift,
  scrollProgress,
  scrubTransform,
  stickyStack,
  type VelocitySkewOptions,
  velocitySkew,
  type ZoomOnScrollOptions,
  zoomOnScroll,
} from "./parallax.js";
export {
  ParallaxImage,
  type ParallaxImageProps,
  RevealOnScroll,
  type RevealOnScrollProps,
  ScrollEffect,
  type ScrollEffectProps,
  ScrollLayer,
  type ScrollLayerProps,
  ScrollProgressBar,
  type ScrollProgressBarProps,
  ScrollScene,
  type ScrollSceneProps,
  type SectionSpyHookOptions,
  StaggerOnScroll,
  StickyStack,
  type StickyStackProps,
  useInView,
  useScrollProgress,
  useScrollScene,
  useScrollTrigger,
  useSectionSpy,
} from "./react.js";
export type { ProgressOptions } from "./shared.js";
export {
  type DirectionHeaderOptions,
  directionHeader,
  type InViewProgressOptions,
  inViewProgress,
  type LazyEffectOptions,
  lazyEffect,
  type RevealOnEnterOptions,
  revealOnEnter,
  type StuckStateOptions,
  staggerOnEnter,
  stuckState,
} from "./triggers.js";

/** Scroll Trigger definitions in catalogue order (ST01, ST02, ST05, ST06, ST07, ST09), for registries. */
export const scrollTriggerEffects: readonly AnyEffectDefinition[] = /* @__PURE__ */ Object.freeze([
  revealOnEnter,
  staggerOnEnter,
  inViewProgress,
  directionHeader,
  stuckState,
  lazyEffect,
]);

/** Scroll & Parallax definitions in catalogue order (SP01–SP03, SP05–SP09, SP11), for registries. */
export const scrollEffects: readonly AnyEffectDefinition[] = /* @__PURE__ */ Object.freeze([
  depthParallax,
  scrubTransform,
  scrollProgress,
  pinnedScene,
  imageParallax,
  zoomOnScroll,
  scrollColorShift,
  stickyStack,
  velocitySkew,
]);
