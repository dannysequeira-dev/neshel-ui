/**
 * Motion controllers (ADR 0023; contracts/controllers.md, owner requirement 3.2).
 *
 * `finished` resolves with a typed result for normal outcomes — `completed`, `cancelled`,
 * `interrupted` — and rejects only on real errors (state `failed`). Each run has its own promise.
 */

import { type ConflictPolicy, releaseChannels, requestChannels, setExclusive } from "./arbiter.js";
import type { TransformLayer } from "./compose.js";
import { type DurationPreset, motionDefaults, type SpringPreset } from "./defaults.js";
import { type Easing, type EasingPreset, resolveEasing } from "./easing.js";
import { NeshelAnimationsError } from "./errors.js";
import { type Claim, type ExclusiveChannel, getMotionHost, isExclusiveChannel } from "./host.js";
import { clamp, mix } from "./interpolate.js";
import { driveValue, type MotionValue } from "./motion-value.js";
import {
  prefersReducedMotion,
  type ReducedMotion,
  shouldReduceMotion,
  subscribeReducedMotion,
} from "./reduced-motion.js";
import { type FrameInfo, getFrameScheduler } from "./scheduler.js";
import { resolveSpring, type SpringOptions, type SpringState, stepSpring } from "./spring.js";

export type MotionState =
  | "idle"
  | "running"
  | "paused"
  | "completed"
  | "cancelled"
  | "interrupted"
  | "failed";
export type MotionDirection = "forward" | "reverse";

export interface MotionResult {
  status: "completed" | "cancelled" | "interrupted";
  direction: MotionDirection;
  /** Final value (JS driver) or progress 0–1 (WAAPI driver). */
  value: number;
}

export interface MotionControl {
  readonly state: MotionState;
  /** Promise of the current run. */
  readonly finished: Promise<MotionResult>;
  play(): void;
  pause(): void;
  reverse(): void;
  finish(): void;
  cancel(): void;
}

export interface TweenControl extends MotionControl {
  /** Set progress in [0, 1] (clamped). From a settled state the control becomes paused in a new run. */
  seek(progress: number): void;
}

export type Transition =
  | { type: "spring"; spring?: SpringOptions | SpringPreset }
  | {
      type: "tween";
      duration?: number | DurationPreset;
      easing?: Easing | EasingPreset;
      delay?: number;
    };

export interface ControlOptions {
  reducedMotion?: ReducedMotion;
}

const SETTLED: readonly MotionState[] = ["completed", "cancelled", "interrupted", "failed"];

export function resolveDuration(duration: number | DurationPreset | undefined): number {
  if (duration === undefined) return motionDefaults.duration.normal;
  if (typeof duration === "string") {
    const preset = motionDefaults.duration[duration];
    if (preset === undefined)
      throw new RangeError(`unknown duration preset ${JSON.stringify(duration)}`);
    return preset;
  }
  if (!Number.isFinite(duration) || duration < 0)
    throw new RangeError("duration must be a non-negative number (ms)");
  return duration;
}

export function resolveSpringPreset(spring: SpringOptions | SpringPreset | undefined) {
  if (typeof spring === "string") {
    const preset = motionDefaults.spring[spring];
    if (!preset) throw new RangeError(`unknown spring preset ${JSON.stringify(spring)}`);
    return resolveSpring(preset);
  }
  return resolveSpring(spring);
}

/** Shared run bookkeeping: state, direction, one promise per run. */
export interface RunCore {
  state: MotionState;
  direction: MotionDirection;
  readonly finished: Promise<MotionResult>;
  newRun(): void;
  settle(status: MotionResult["status"], value: number): void;
  fail(error: unknown): void;
}

export function createRunCore(): RunCore {
  let resolve!: (result: MotionResult) => void;
  let reject!: (error: unknown) => void;
  let promise!: Promise<MotionResult>;
  let open = false;
  const core: RunCore = {
    state: "idle",
    direction: "forward",
    get finished() {
      return promise;
    },
    newRun() {
      promise = new Promise<MotionResult>((res, rej) => {
        resolve = res;
        reject = rej;
      });
      open = true;
    },
    settle(status, value) {
      if (!open) return;
      open = false;
      core.state = status;
      resolve({ status, direction: core.direction, value });
    },
    fail(error) {
      if (!open) return;
      open = false;
      core.state = "failed";
      reject(error);
    },
  };
  core.newRun();
  return core;
}

const activeControls = new WeakMap<MotionValue, { interrupt(): void }>();

/** Animate a motion value with a spring (default) or a tween; starts immediately. */
export function animateValue(
  value: MotionValue,
  target: number,
  transition: Transition = { type: "spring" },
  options: ControlOptions = {},
): MotionControl | TweenControl {
  if (!Number.isFinite(target)) throw new RangeError("animateValue: target must be finite");
  activeControls.get(value)?.interrupt();
  const scheduler = getFrameScheduler();
  const core = createRunCore();
  const from = value.get();
  const to = target;
  const policy = options.reducedMotion ?? "user";
  const isTween = transition.type === "tween";
  const duration = isTween ? resolveDuration(transition.duration) : 0;
  const delay = isTween ? Math.max(0, transition.delay ?? 0) : 0;
  const easing = isTween ? resolveEasing(transition.easing) : undefined;
  const spring = isTween ? undefined : resolveSpringPreset(transition.spring);
  if (transition.type !== "tween" && transition.type !== "spring") {
    throw new NeshelAnimationsError(
      `[@neshel-ui/animations] unknown transition type ${JSON.stringify((transition as { type?: unknown }).type)}`,
    );
  }
  let progress = 0; // tween
  let waited = 0; // tween delay (ms), forward runs only
  const physics: SpringState = { value: from, velocity: value.getVelocity() };
  let cancelTask: (() => void) | undefined;
  let unsubscribeReduced: (() => void) | undefined;

  const end = () => (core.direction === "forward" ? to : from);
  const write = (next: number, velocity: number) => driveValue(value, next, velocity);
  const tweenValue = (p: number) => mix(from, to, (easing as Easing)(p));

  function stopFrames(): void {
    cancelTask?.();
    cancelTask = undefined;
  }
  function cleanup(): void {
    stopFrames();
    unsubscribeReduced?.();
    unsubscribeReduced = undefined;
    if (activeControls.get(value) === entry) activeControls.delete(value);
  }
  function settle(status: MotionResult["status"]): void {
    cleanup();
    core.settle(status, value.get());
  }
  function fail(error: unknown): void {
    cleanup();
    core.fail(error);
  }

  function tick({ delta }: FrameInfo): boolean {
    if (core.state !== "running") return false;
    try {
      if (isTween) {
        let ms = delta * 1000;
        if (core.direction === "forward" && waited < delay) {
          const used = Math.min(ms, delay - waited);
          waited += used;
          ms -= used;
        }
        const step = duration === 0 ? 1 : ms / duration;
        progress = clamp(progress + (core.direction === "forward" ? step : -step), 0, 1);
        const previous = value.get();
        const next = tweenValue(progress);
        write(next, delta > 0 ? (next - previous) / delta : 0);
        const done = core.direction === "forward" ? progress >= 1 : progress <= 0;
        if (done) {
          write(end(), 0);
          settle("completed");
          return false;
        }
        return true;
      }
      const rested = stepSpring(physics, end(), spring as Required<SpringOptions>, delta);
      write(physics.value, physics.velocity);
      if (rested) {
        settle("completed");
        return false;
      }
      return true;
    } catch (error) {
      fail(error);
      return false;
    }
  }

  function jumpToEnd(): void {
    progress = core.direction === "forward" ? 1 : 0;
    physics.value = end();
    physics.velocity = 0;
    write(end(), 0);
  }

  function run(): void {
    if (shouldReduceMotion(policy, prefersReducedMotion())) {
      core.state = "running";
      jumpToEnd();
      settle("completed");
      return;
    }
    core.state = "running";
    activeControls.set(value, entry);
    unsubscribeReduced ??= subscribeReducedMotion((reduced) => {
      if (reduced && shouldReduceMotion(policy, reduced) && core.state === "running")
        control.finish();
    });
    cancelTask ??= scheduler.schedule(tick, "update");
  }

  const isSettled = () => SETTLED.includes(core.state);
  const entry = {
    interrupt() {
      if (isSettled()) return;
      settle("interrupted");
    },
  };

  function restart(): void {
    core.newRun();
    if (isTween) {
      progress = core.direction === "forward" ? 0 : 1;
      waited = 0;
      write(tweenValue(progress), 0);
    } else {
      physics.velocity = 0;
    }
  }

  const control: TweenControl = {
    get state() {
      return core.state;
    },
    get finished() {
      return core.finished;
    },
    play() {
      if (core.state === "running" || core.state === "failed") return;
      if (isSettled()) restart();
      run();
    },
    pause() {
      if (core.state !== "running") return;
      core.state = "paused";
      stopFrames();
    },
    reverse() {
      core.direction = core.direction === "forward" ? "reverse" : "forward";
      if (core.state === "running") return; // spring retargets / tween turns around on the next frame
      if (core.state === "paused") return;
      if (core.state === "failed") return;
      if (isSettled()) restart();
      run();
    },
    finish() {
      if (isSettled()) return;
      jumpToEnd();
      settle("completed");
    },
    cancel() {
      if (isSettled()) return;
      settle("cancelled");
    },
    seek(target) {
      if (!isTween)
        throw new NeshelAnimationsError(
          "[@neshel-ui/animations] seek() is only available on tween controls.",
        );
      if (core.state === "failed") return;
      const p = clamp(Number.isFinite(target) ? target : 0, 0, 1);
      if (isSettled()) {
        core.newRun();
        core.state = "paused";
      }
      progress = p;
      waited = delay;
      write(tweenValue(p), 0);
    },
  };
  run();
  if (!isTween) {
    // Springs have no seek (no fixed duration); expose the narrower interface at runtime too.
    delete (control as Partial<TweenControl>).seek;
  }
  return control;
}

export type ChannelBinding =
  | { channel: "opacity" }
  | { channel: "transform"; layer(value: number): TransformLayer }
  | { channel: ExclusiveChannel; format(value: number): string };

/**
 * Write a motion value into an element channel through its motion host; returns the release
 * function, which restores the captured inline value.
 */
export function bindChannel(
  value: MotionValue,
  element: Element & { readonly style: CSSStyleDeclaration },
  binding: ChannelBinding,
  options: { effectId: string; priority?: number; conflicts?: ConflictPolicy },
): () => void {
  const host = getMotionHost(element);
  const key = Symbol(options.effectId);
  let claim: Claim | undefined;
  let apply: (current: number) => void;
  if (binding.channel === "opacity") {
    apply = (current) => host.setOpacity(key, current);
  } else if (binding.channel === "transform") {
    const toLayer = (binding as { layer(v: number): TransformLayer }).layer;
    apply = (current) => host.setLayer(key, toLayer(current));
  } else if (isExclusiveChannel(binding.channel)) {
    const channel = binding.channel;
    const format = (binding as { format(v: number): string }).format;
    const exclusive: Claim = {
      id: options.effectId,
      priority: options.priority ?? 0,
      channels: [channel],
      onGrant: () => apply(value.get()),
      onRevoke: () => {},
    };
    claim = exclusive;
    requestChannels(host, exclusive, options.conflicts);
    apply = (current) => setExclusive(host, exclusive, channel, format(current));
  } else {
    throw new NeshelAnimationsError(
      `[@neshel-ui/animations] bindChannel: unknown channel ${JSON.stringify(binding.channel)}`,
    );
  }
  apply(value.get());
  const unsubscribe = value.subscribe(apply);
  let released = false;
  return () => {
    if (released) return;
    released = true;
    unsubscribe();
    if (claim) releaseChannels(host, claim);
    else if (binding.channel === "opacity") host.setOpacity(key, undefined);
    else host.setLayer(key, undefined);
  };
}
