/**
 * `@neshel-ui/animations/hover` — Hover & Pointer family (first family subpath, owner decision D3).
 * Experimental, private.
 */
export {
  createTilt3D,
  type Tilt3DController,
  type Tilt3DState,
  tilt3D,
} from "./tilt/controller.js";
export type {
  ResolvedTilt3DOptions,
  Tilt3DAxis,
  Tilt3DOptions,
  Tilt3DPointerType,
} from "./tilt/options.js";
export { Tilt3D, type Tilt3DProps } from "./tilt/tilt-3d.js";
export { useTilt3D } from "./tilt/use-tilt-3d.js";
