/**
 * `@neshel-ui/animations/core`: framework-free motion engine (experimental; features 008–010).
 * No React and no DOM access at import time; nothing registers at import time; safe on the server.
 */

export type { ConflictPolicy } from "./arbiter.js";
export { composeTransform, type TransformLayer } from "./compose.js";
export {
  animateValue,
  bindChannel,
  type ChannelBinding,
  type ControlOptions,
  type MotionControl,
  type MotionDirection,
  type MotionResult,
  type MotionState,
  type Transition,
  type TweenControl,
} from "./controls.js";
export { getMotionDebugInfo, type MotionDebugInfo } from "./debug.js";
export { type DurationPreset, motionDefaults, type SpringPreset } from "./defaults.js";
export {
  cubicBezier,
  type Easing,
  type EasingPreset,
  easings,
  linear,
  springEasing,
  steps,
  toCssEasing,
} from "./easing.js";
export {
  type AnyEffectDefinition,
  type AttachConfig,
  attachEffect,
  type ChannelClaim,
  type ChannelHandles,
  createEffectRegistry,
  type DrivableSpan,
  defineEffect,
  type EffectContext,
  type EffectDefinition,
  type EffectHandle,
  type EffectId,
  type EffectInstance,
  type EffectRegistry,
  type EffectState,
  type FamilyId,
  type ReducedBehaviour,
} from "./effect.js";
export { NeshelAnimationsError } from "./errors.js";
export type { ExclusiveChannel } from "./host.js";
export { clamp, mapRange, mix, progress } from "./interpolate.js";
export { type MotionValue, motionValue } from "./motion-value.js";
export {
  attachPreset,
  definePreset,
  type EffectPreset,
  type PresetInput,
} from "./preset.js";
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
export { type AnimateElementOptions, animateElement } from "./waapi.js";
