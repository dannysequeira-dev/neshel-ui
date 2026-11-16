/**
 * Damped spring integrator (contracts/core-engine.md §2).
 *
 * Pure and framework-agnostic: the caller owns the state object and the clock. Semi-implicit Euler
 * with fixed sub-steps (at most 1/240 s) keeps the integration stable for any frame rate; the
 * spring snaps to its target once both the distance and the speed fall below the rest thresholds,
 * so an idle effect stops scheduling frames.
 */

export interface SpringOptions {
  /** Spring constant k (default 170). Higher is faster. */
  stiffness?: number;
  /** Damping coefficient c (default 26). `c >= 2 * sqrt(k * m)` never overshoots. */
  damping?: number;
  /** Mass m (default 1). */
  mass?: number;
  /** Distance below which the spring may rest (default 0.01, in the value's unit). */
  restDelta?: number;
  /** Speed below which the spring may rest (default 0.01 units/s). */
  restSpeed?: number;
}

export interface SpringState {
  value: number;
  velocity: number;
}

export const DEFAULT_SPRING: Readonly<Required<SpringOptions>> = Object.freeze({
  stiffness: 170,
  damping: 26,
  mass: 1,
  restDelta: 0.01,
  restSpeed: 0.01,
});

const MAX_STEP = 1 / 240;

/** Validated, complete options; throws `RangeError` for non-finite or out-of-range values. */
export function resolveSpring(options: SpringOptions = {}): Required<SpringOptions> {
  const resolved: Required<SpringOptions> = { ...DEFAULT_SPRING };
  for (const key of Object.keys(DEFAULT_SPRING) as Array<keyof SpringOptions>) {
    const value = options[key];
    if (value === undefined) continue;
    const allowZero = key === "damping";
    if (
      typeof value !== "number" ||
      !Number.isFinite(value) ||
      value < 0 ||
      (!allowZero && value === 0)
    ) {
      throw new RangeError(
        `spring ${key} must be a ${allowZero ? "non-negative" : "positive"} finite number (received ${String(value)})`,
      );
    }
    resolved[key] = value;
  }
  return resolved;
}

/**
 * Advance `state` toward `target` by `dt` seconds (mutates `state`).
 * Returns `true` when the spring is at rest on the target.
 */
export function stepSpring(
  state: SpringState,
  target: number,
  options: Required<SpringOptions>,
  dt: number,
): boolean {
  const { stiffness, damping, mass, restDelta, restSpeed } = options;
  let remaining = Math.max(0, dt);
  while (remaining > 0) {
    const step = Math.min(remaining, MAX_STEP);
    const force = -stiffness * (state.value - target) - damping * state.velocity;
    state.velocity += (force / mass) * step;
    state.value += state.velocity * step;
    remaining -= step;
  }
  if (Math.abs(target - state.value) < restDelta && Math.abs(state.velocity) < restSpeed) {
    state.value = target;
    state.velocity = 0;
    return true;
  }
  return false;
}
