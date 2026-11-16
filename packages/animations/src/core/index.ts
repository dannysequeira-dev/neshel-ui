/**
 * `@neshel-ui/animations/core`: framework-agnostic motion engine (experimental, feature 008.0).
 * No React and no DOM access at import time; safe to import on the server.
 */
export {
  composeTransform,
  getTransformComposer,
  type StyledElement,
  type TransformComposer,
  type TransformLayer,
} from "./compose.js";
export {
  prefersReducedMotion,
  type ReducedMotion,
  shouldReduceMotion,
  subscribeReducedMotion,
} from "./reduced-motion.js";
export {
  createFrameScheduler,
  type FrameInfo,
  type FramePhase,
  type FrameScheduler,
  type FrameSchedulerOptions,
  type FrameTask,
  getFrameScheduler,
} from "./scheduler.js";
export {
  DEFAULT_SPRING,
  resolveSpring,
  type SpringOptions,
  type SpringState,
  stepSpring,
} from "./spring.js";
