/**
 * Tilt3D options and their validation (contracts/tilt-3d.md §2). Pure; shared by the controller,
 * the hook and the component, so JavaScript consumers get the same errors as TypeScript ones.
 */
import { REDUCED_MOTION_VALUES, type ReducedMotion } from "../core/reduced-motion.js";
import { resolveSpring, type SpringOptions } from "../core/spring.js";
import { animationsError } from "../errors.js";

export type Tilt3DAxis = "both" | "x" | "y";
export type Tilt3DPointerType = "mouse" | "pen" | "touch";

export interface Tilt3DOptions {
  /** Largest rotation in degrees at the element's edges (default 10, range 0–45). */
  maxTilt?: number;
  /** Perspective distance in px; smaller is more dramatic (default 1000, at least 100). */
  perspective?: number;
  /** Scale while the pointer or keyboard focus is on the element (default 1, range 0.5–2). */
  scale?: number;
  /** Which rotation axes follow the pointer (default `"both"`). */
  axis?: Tilt3DAxis;
  /** Tilt toward the pointer instead of pressing away from it (default false). */
  reverse?: boolean;
  /** Spring used to follow the pointer and to return to rest. */
  spring?: SpringOptions;
  /**
   * Pointer types that drive the tilt (default mouse and pen). Touch is opt-in because a finger
   * moving over a card usually means scrolling.
   */
  pointerTypes?: readonly Tilt3DPointerType[];
  /** Keyboard focus inside the element shows a gentle fixed pose (default true). */
  focusTilt?: boolean;
  /** Reduced-motion policy (default `"user"`: follow `prefers-reduced-motion`). */
  reducedMotion?: ReducedMotion;
  /** Turn the effect off and return to rest. */
  disabled?: boolean;
}

export interface ResolvedTilt3DOptions {
  maxTilt: number;
  perspective: number;
  scale: number;
  axis: Tilt3DAxis;
  reverse: boolean;
  spring: Required<SpringOptions>;
  pointerTypes: ReadonlySet<string>;
  focusTilt: boolean;
  reducedMotion: ReducedMotion;
  disabled: boolean;
}

const EFFECT = "Tilt3D";
const AXES: readonly Tilt3DAxis[] = ["both", "x", "y"];
const POINTER_TYPES: readonly Tilt3DPointerType[] = ["mouse", "pen", "touch"];
const describe = (value: unknown) =>
  typeof value === "string" ? JSON.stringify(value) : String(value);

function numberIn(name: string, value: unknown, fallback: number, min: number, max: number) {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    throw animationsError(
      EFFECT,
      `invalid value ${describe(value)} for "${name}"; expected a number from ${min} to ${max}.`,
    );
  }
  return value;
}

function oneOf<T extends string>(name: string, value: unknown, allowed: readonly T[], fallback: T) {
  if (value === undefined || value === null) return fallback;
  if (!allowed.includes(value as T)) {
    throw animationsError(
      EFFECT,
      `invalid value ${describe(value)} for "${name}"; expected one of: ${allowed.map(describe).join(", ")}.`,
    );
  }
  return value as T;
}

function flag(name: string, value: unknown, fallback: boolean) {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== "boolean") {
    throw animationsError(
      EFFECT,
      `invalid value ${describe(value)} for "${name}"; expected a boolean.`,
    );
  }
  return value;
}

export function resolveTilt3DOptions(options: Tilt3DOptions = {}): ResolvedTilt3DOptions {
  let spring: Required<SpringOptions>;
  try {
    spring = resolveSpring(options.spring);
  } catch (error) {
    throw animationsError(EFFECT, (error as Error).message);
  }
  const pointerTypes = options.pointerTypes ?? ["mouse", "pen"];
  if (!Array.isArray(pointerTypes)) {
    throw animationsError(
      EFFECT,
      `"pointerTypes" must be an array of ${POINTER_TYPES.join(", ")}.`,
    );
  }
  for (const type of pointerTypes) oneOf("pointerTypes", type, POINTER_TYPES, "mouse");
  return {
    maxTilt: numberIn("maxTilt", options.maxTilt, 10, 0, 45),
    perspective: numberIn("perspective", options.perspective, 1000, 100, 100_000),
    scale: numberIn("scale", options.scale, 1, 0.5, 2),
    axis: oneOf("axis", options.axis, AXES, "both"),
    reverse: flag("reverse", options.reverse, false),
    spring,
    pointerTypes: new Set(pointerTypes),
    focusTilt: flag("focusTilt", options.focusTilt, true),
    reducedMotion: oneOf("reducedMotion", options.reducedMotion, REDUCED_MOTION_VALUES, "user"),
    disabled: flag("disabled", options.disabled, false),
  };
}
