/**
 * `@neshel-ui/animations` (experimental, private): React bindings of the motion engine (Phase 009).
 * Effects live in family subpaths (`@neshel-ui/animations/hover`, …); the framework-free engine in
 * `@neshel-ui/animations/core`.
 */
export type {
  AttachConfig,
  EffectDefinition,
  EffectHandle,
  EffectState,
} from "./core/effect.js";
export { NeshelAnimationsError } from "./core/errors.js";
export type { MotionValue } from "./core/motion-value.js";
export type { ReducedMotion } from "./core/reduced-motion.js";
export type { SpringOptions } from "./core/spring.js";
export { useMotionEffect } from "./react/use-motion-effect.js";
export { useMotionValue, useMotionValueEvent } from "./react/use-motion-value.js";
