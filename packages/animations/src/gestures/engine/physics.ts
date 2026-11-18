/**
 * Physics primitives (Phase 012; contracts/gesture-engine.md §5, research R4–R6). Pure functions and a small
 * velocity tracker: no scheduler, no DOM. Springs are NOT here — gestures use the 009 integrator
 * (`stepSpring`) through the 010 spring rig, so there is still one spring integrator.
 */

export interface DecayOptions {
  /** Fraction of the release velocity carried into the motion (0–1, default 0.8). */
  power?: number;
  /** Time constant τ in ms (50–2000, default 325). */
  timeConstant?: number;
  /** Speed below which the motion rests, px/s (default 5). */
  restSpeed?: number;
}

export const DEFAULT_DECAY: Readonly<Required<DecayOptions>> = Object.freeze({
  power: 0.8,
  timeConstant: 325,
  restSpeed: 5,
});

export interface DecayState {
  value: number;
  velocity: number;
}

/**
 * Rest position of an exponential decay started from `value` with release `velocity` (px/s):
 * `value + power · velocity · τ` (research R5). Lets snap points be chosen before animating.
 */
export function projectDecay(
  value: number,
  velocity: number,
  options: DecayOptions = DEFAULT_DECAY,
): number {
  const power = options.power ?? DEFAULT_DECAY.power;
  const tau = (options.timeConstant ?? DEFAULT_DECAY.timeConstant) / 1000;
  return value + power * velocity * tau;
}

/**
 * Advance a decay by `dt` seconds with the exact exponential solution (frame-rate independent). The state's
 * velocity is the CURRENT velocity (start it at `power · releaseVelocity`). Returns `true` at rest, where the
 * value lands on its exact projected end.
 */
export function stepDecay(state: DecayState, options: DecayOptions, dt: number): boolean {
  const tau = (options.timeConstant ?? DEFAULT_DECAY.timeConstant) / 1000;
  const k = Math.exp(-Math.max(0, dt) / tau);
  state.value += state.velocity * tau * (1 - k);
  state.velocity *= k;
  if (Math.abs(state.velocity) < (options.restSpeed ?? DEFAULT_DECAY.restSpeed)) {
    state.value += state.velocity * tau;
    state.velocity = 0;
    return true;
  }
  return false;
}

/**
 * Rubber band: displacement `overshoot` beyond a bound, over `dimension` px, maps to
 * `(1 − 1 / (|x|·c/d + 1)) · d` with the sign of `overshoot` (research R6). Continuous at 0, monotonic,
 * asymptotic to `dimension`.
 */
export function rubberband(overshoot: number, dimension: number, constant = 0.55): number {
  if (dimension <= 0 || overshoot === 0) return 0;
  const x = Math.abs(overshoot);
  return Math.sign(overshoot) * (1 - 1 / ((x * constant) / dimension + 1)) * dimension;
}

/** The point of `points` nearest to `value` (`value` itself when the list is empty). */
export function nearestSnap(value: number, points: readonly number[]): number {
  let best = value;
  let distance = Number.POSITIVE_INFINITY;
  for (const point of points) {
    const d = Math.abs(point - value);
    if (d < distance) {
      distance = d;
      best = point;
    }
  }
  return best;
}

export interface VelocityTracker {
  /** Add a sample (`time` in ms). */
  add(time: number, x: number, y: number): void;
  /** Velocity in px/s at `time` (ms); 0 when the last sample is older than 40 ms (the pointer stopped). */
  velocity(time?: number): { x: number; y: number };
  /** Change of velocity between the last two estimates, px/s² (diagnostic). */
  acceleration(): { x: number; y: number };
  reset(): void;
}

const SIZE = 20;

/**
 * Release-velocity estimate from the samples of the last `windowMs` (default 100): slope between the oldest
 * sample in the window and the newest, minimum span 8 ms (research R4). Ring buffer, no allocation per add.
 */
export function createVelocityTracker(windowMs = 100): VelocityTracker {
  const t = new Float64Array(SIZE);
  const xs = new Float64Array(SIZE);
  const ys = new Float64Array(SIZE);
  let count = 0;
  let head = 0;
  let last = { x: 0, y: 0, time: 0 };
  let accel = { x: 0, y: 0 };

  function estimate(at?: number): { x: number; y: number } {
    if (count < 2) return { x: 0, y: 0 };
    const newest = (head - 1 + SIZE) % SIZE;
    const tn = t[newest] as number;
    if (at !== undefined && at - tn > 40) return { x: 0, y: 0 };
    let oldest = newest;
    for (let i = 1; i < count; i++) {
      const index = (newest - i + SIZE) % SIZE;
      if (tn - (t[index] as number) > windowMs) break;
      oldest = index;
    }
    let span = tn - (t[oldest] as number);
    if (span < 8) {
      // Too close: widen to the previous sample if there is one.
      const previous = (newest - 1 + SIZE) % SIZE;
      if (count < 2) return { x: 0, y: 0 };
      oldest = previous;
      span = tn - (t[oldest] as number);
      if (span <= 0) return { x: 0, y: 0 };
    }
    return {
      x: (((xs[newest] as number) - (xs[oldest] as number)) / span) * 1000,
      y: (((ys[newest] as number) - (ys[oldest] as number)) / span) * 1000,
    };
  }

  return {
    add(time, x, y) {
      t[head] = time;
      xs[head] = x;
      ys[head] = y;
      head = (head + 1) % SIZE;
      count = Math.min(count + 1, SIZE);
      const v = estimate();
      const dt = (time - last.time) / 1000;
      if (dt > 0 && count > 2) accel = { x: (v.x - last.x) / dt, y: (v.y - last.y) / dt };
      last = { x: v.x, y: v.y, time };
    },
    velocity: estimate,
    acceleration: () => accel,
    reset() {
      count = 0;
      head = 0;
      last = { x: 0, y: 0, time: 0 };
      accel = { x: 0, y: 0 };
    },
  };
}
