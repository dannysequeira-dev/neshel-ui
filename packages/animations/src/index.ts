/**
 * `@neshel-ui/animations` (experimental, private, feature 008.0). Exports only what is implemented:
 * the Tilt3D effect at three API levels (component, hook, controller). The framework-agnostic
 * engine lives in `@neshel-ui/animations/core`.
 */

export type { ReducedMotion } from "./core/reduced-motion.js";
export type { SpringOptions } from "./core/spring.js";
export { NeshelAnimationsError } from "./errors.js";
export {
  createTilt3D,
  type Tilt3DController,
  type Tilt3DState,
} from "./tilt/controller.js";
export type { Tilt3DAxis, Tilt3DOptions, Tilt3DPointerType } from "./tilt/options.js";
export { Tilt3D, type Tilt3DProps } from "./tilt/tilt-3d.js";
export { useTilt3D } from "./tilt/use-tilt-3d.js";
