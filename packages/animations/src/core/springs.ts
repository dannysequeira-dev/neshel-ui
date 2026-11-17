/**
 * Spring rig (Phase 010, internal): several named springs advanced by ONE update task of the shared
 * frame scheduler — the Tilt3D performance model generalised for pointer-follow and press effects.
 * Targets are retargeted without allocation per pointer move; the task stops when every spring rests,
 * so an idle effect costs nothing. Uses the 008 integrator (`stepSpring`); not a second engine.
 */
import type { FrameInfo, FrameScheduler } from "./scheduler.js";
import { type SpringOptions, type SpringState, stepSpring } from "./spring.js";

export interface SpringRig<K extends string> {
  readonly values: Readonly<Record<K, number>>;
  /** Move toward new targets (springs keep their velocity). */
  to(targets: Partial<Record<K, number>>): void;
  /** Jump to values (velocity 0, targets too) and render once. */
  set(values: Partial<Record<K, number>>): void;
  /** Add velocity (units/s) to one spring and run. */
  kick(key: K, velocity: number): void;
  setSpring(spring: Required<SpringOptions>): void;
  /** Whether a frame task is pending. */
  readonly running: boolean;
  stop(): void;
}

export function createSpringRig<K extends string>(
  scheduler: FrameScheduler,
  initial: Record<K, number>,
  spring: Required<SpringOptions>,
  render: (values: Readonly<Record<K, number>>, settled: boolean) => void,
): SpringRig<K> {
  const keys = Object.keys(initial) as K[];
  const states = {} as Record<K, SpringState>;
  const targets = { ...initial };
  const values = { ...initial };
  for (const key of keys) states[key] = { value: initial[key], velocity: 0 };
  let options = spring;
  let cancel: (() => void) | undefined;

  function tick({ delta }: FrameInfo): boolean {
    let settled = true;
    for (const key of keys) {
      settled = stepSpring(states[key], targets[key], options, delta) && settled;
      values[key] = states[key].value;
    }
    render(values, settled);
    if (settled) cancel = undefined;
    return !settled;
  }
  const run = () => {
    cancel ??= scheduler.schedule(tick, "update");
  };

  return {
    values,
    to(next) {
      for (const key of Object.keys(next) as K[]) {
        const value = next[key];
        if (value !== undefined) targets[key] = value;
      }
      run();
    },
    set(next) {
      for (const key of Object.keys(next) as K[]) {
        const value = next[key];
        if (value === undefined) continue;
        targets[key] = value;
        states[key] = { value, velocity: 0 };
        values[key] = value;
      }
      const moving = keys.some(
        (key) => states[key].velocity !== 0 || states[key].value !== targets[key],
      );
      if (!moving) {
        cancel?.();
        cancel = undefined;
      }
      render(values, !moving);
    },
    kick(key, velocity) {
      states[key].velocity += velocity;
      run();
    },
    setSpring(next) {
      options = next;
    },
    get running() {
      return cancel !== undefined;
    },
    stop() {
      cancel?.();
      cancel = undefined;
    },
  };
}

/**
 * Call `fn` after `ms` of animation time on the shared scheduler (frame deltas, clamped like every
 * engine clock, so a hidden tab never fires a burst). Returns an idempotent cancel.
 */
export function afterDelay(scheduler: FrameScheduler, ms: number, fn: () => void): () => void {
  if (ms <= 0) {
    fn();
    return () => {};
  }
  let elapsed = 0;
  return scheduler.schedule(({ delta }) => {
    elapsed += delta * 1000;
    if (elapsed >= ms) {
      fn();
      return false;
    }
    return true;
  }, "update");
}

/**
 * Call `callback` in the write phase of the frame in which `control` settles (synchronously within the
 * frame, unlike its `finished` promise). While the control is paused the watcher stops; call again after
 * resuming. Returns an idempotent cancel.
 */
export function whenSettled(
  scheduler: FrameScheduler,
  control: { readonly state: string },
  callback: (status: "completed" | "cancelled" | "interrupted") => void,
): () => void {
  let done = false;
  const cancel = scheduler.schedule(() => {
    if (done) return false;
    const state = control.state;
    if (state === "running" || state === "idle") return true;
    if (state === "paused") return false;
    done = true;
    callback(
      state === "completed" || state === "cancelled" ? state : "interrupted",
    );
    return false;
  }, "write");
  return () => {
    done = true;
    cancel();
  };
}
