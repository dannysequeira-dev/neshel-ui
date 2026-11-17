/**
 * Drag motion (Phase 012; contracts/gesture-engine.md §6): the position of a dragged element after release —
 * inertia (exact decay, spring bounce at bounds), spring to a target (snap, home), or a fling with
 * restitution. One update task of the shared scheduler for both axes; springs use the 009 integrator
 * (`stepSpring`); the task ends when both axes rest, so an idle element costs nothing.
 */
import type { FrameInfo, FrameScheduler } from "../../core/scheduler.js";
import { type SpringOptions, type SpringState, stepSpring } from "../../core/spring.js";
import { type DecayOptions, rubberband, stepDecay } from "./physics.js";

export interface Bounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export const UNBOUNDED: Readonly<Bounds> = Object.freeze({
  left: Number.NEGATIVE_INFINITY,
  right: Number.POSITIVE_INFINITY,
  top: Number.NEGATIVE_INFINITY,
  bottom: Number.POSITIVE_INFINITY,
});

export type Release =
  | {
      kind: "inertia";
      vx: number;
      vy: number;
      decay: Required<DecayOptions>;
      bounds: Bounds;
      spring: Required<SpringOptions>;
    }
  | {
      kind: "spring";
      vx: number;
      vy: number;
      x: number;
      y: number;
      spring: Required<SpringOptions>;
    }
  | {
      kind: "fling";
      vx: number;
      vy: number;
      decay: Required<DecayOptions>;
      bounds: Bounds;
      restitution: number;
    };

type AxisPhase = "rest" | "decay" | "spring" | "fling";
interface Axis extends SpringState {
  phase: AxisPhase;
  target: number;
  min: number;
  max: number;
}

export interface DragMotion {
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
  readonly running: boolean;
  /** Jump to a position (motion stopped, velocity 0) and render. */
  set(x: number, y: number): void;
  release(mode: Release): void;
  /** Stop the motion where it is (grab mid-flight: no jump). */
  stop(): void;
}

/** Clamp `value` to [min, max] with a rubber band of `elastic` (0 hard … 1 full) over `dimension`. */
export function elasticClamp(
  value: number,
  min: number,
  max: number,
  elastic: number,
  dimension: number,
): number {
  if (value < min) return min + elastic * rubberband(value - min, dimension);
  if (value > max) return max + elastic * rubberband(value - max, dimension);
  return value;
}

export function createDragMotion(
  scheduler: FrameScheduler,
  render: (x: number, y: number, resting: boolean) => void,
): DragMotion {
  const axes: [Axis, Axis] = [
    { phase: "rest", value: 0, velocity: 0, target: 0, min: 0, max: 0 },
    { phase: "rest", value: 0, velocity: 0, target: 0, min: 0, max: 0 },
  ];
  let mode: Release | undefined;
  let cancel: (() => void) | undefined;

  function stepAxis(axis: Axis, dt: number): void {
    const m = mode;
    if (!m || axis.phase === "rest") return;
    if (axis.phase === "spring") {
      const spring = (m as { spring?: Required<SpringOptions> }).spring ?? SETTLE;
      if (stepSpring(axis, axis.target, spring, dt)) axis.phase = "rest";
      return;
    }
    const decay = (m as { decay: Required<DecayOptions> }).decay;
    const rest = stepDecay(axis, decay, dt);
    if (axis.phase === "decay") {
      if (axis.value < axis.min || axis.value > axis.max) {
        // Crossed a bound: hand the velocity to the spring integrator (bounce, research R5).
        axis.phase = "spring";
        axis.target = axis.value < axis.min ? axis.min : axis.max;
        return;
      }
    } else if (axis.value < axis.min || axis.value > axis.max) {
      // Fling: reflect at the bound with restitution.
      const restitution = (m as { restitution: number }).restitution;
      axis.value = axis.value < axis.min ? axis.min : axis.max;
      axis.velocity = -axis.velocity * restitution;
      if (Math.abs(axis.velocity) < decay.restSpeed * 4) {
        axis.velocity = 0;
        axis.phase = "rest";
      }
      return;
    }
    if (rest) axis.phase = "rest";
  }

  function tick({ delta }: FrameInfo): boolean {
    stepAxis(axes[0], delta);
    stepAxis(axes[1], delta);
    const resting = axes[0].phase === "rest" && axes[1].phase === "rest";
    render(axes[0].value, axes[1].value, resting);
    if (resting) {
      cancel = undefined;
      mode = undefined;
    }
    return !resting;
  }

  function start(axis: Axis, velocity: number, m: Release, index: 0 | 1): void {
    axis.velocity = velocity;
    if (m.kind === "spring") {
      axis.target = index === 0 ? m.x : m.y;
      axis.phase =
        Math.abs(axis.target - axis.value) < 0.01 && Math.abs(velocity) < 0.01 ? "rest" : "spring";
      return;
    }
    const b = m.bounds;
    axis.min = index === 0 ? b.left : b.top;
    axis.max = index === 0 ? b.right : b.bottom;
    if (axis.value < axis.min || axis.value > axis.max) {
      if (m.kind === "inertia") {
        axis.phase = "spring";
        axis.target = axis.value < axis.min ? axis.min : axis.max;
      } else {
        axis.value = axis.value < axis.min ? axis.min : axis.max;
        axis.phase = "fling";
        axis.velocity = velocity * m.decay.power;
      }
      return;
    }
    const v = velocity * m.decay.power;
    axis.velocity = v;
    axis.phase =
      Math.abs(v) < m.decay.restSpeed ? "rest" : m.kind === "inertia" ? "decay" : "fling";
  }

  return {
    get x() {
      return axes[0].value;
    },
    get y() {
      return axes[1].value;
    },
    get vx() {
      return axes[0].velocity;
    },
    get vy() {
      return axes[1].velocity;
    },
    get running() {
      return cancel !== undefined;
    },
    set(x, y) {
      cancel?.();
      cancel = undefined;
      mode = undefined;
      axes[0].value = x;
      axes[1].value = y;
      for (const axis of axes) {
        axis.velocity = 0;
        axis.phase = "rest";
      }
      render(x, y, true);
    },
    release(m) {
      mode = m;
      start(axes[0], m.vx, m, 0);
      start(axes[1], m.vy, m, 1);
      if (axes[0].phase === "rest" && axes[1].phase === "rest") {
        cancel?.();
        cancel = undefined;
        mode = undefined;
        render(axes[0].value, axes[1].value, true);
        return;
      }
      cancel ??= scheduler.schedule(tick, "update");
    },
    stop() {
      cancel?.();
      cancel = undefined;
      mode = undefined;
      for (const axis of axes) {
        axis.phase = "rest";
        axis.velocity = 0;
      }
    },
  };
}

/** Bounce spring used when a release mode carries none (inertia always does). */
const SETTLE: Required<SpringOptions> = {
  stiffness: 300,
  damping: 30,
  mass: 1,
  restDelta: 0.01,
  restSpeed: 0.01,
};
