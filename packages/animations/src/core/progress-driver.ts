/**
 * Progress driver (Phase 014, internal; contracts/text-api.md §1, ADR 0029 §5): the shared control of the
 * text and SVG effects. One motion value (0–1) is the only state; the effect renders it. `play()` animates
 * it with the 009 tween controller (`animateValue`) — no second clock; `track()` hands the same value to a
 * C01 timeline (a structural value track, so families never import `./cinematic`); `drive()` follows any
 * `{ get, subscribe }` source such as the 011 `ScrollProgress`.
 *
 * Reduced motion (`instant` entries): a running effect finishes, `play()` jumps to the end, and an external
 * source is not followed while reduced (the end state is shown) — the Phase 013 C02 / issue #11 rule.
 */
import {
  animateValue,
  type MotionResult,
  type MotionState,
  type TweenControl,
} from "./controls.js";
import { reportError } from "./dev.js";
import type { Easing, EasingPreset } from "./easing.js";
import { clamp } from "./interpolate.js";
import { type MotionValue, motionValue } from "./motion-value.js";
import {
  prefersReducedMotion,
  type ReducedMotion,
  shouldReduceMotion,
  subscribeReducedMotion,
} from "./reduced-motion.js";

/** Any 0–1 progress source (the 011 `ScrollProgress` and motion values fit). */
export interface ProgressSource {
  get(): number;
  subscribe(listener: (progress: number) => void): () => void;
}

/** A C01 value track (`timeline.add(effect.track())`). */
export interface ProgressTrack {
  id?: string;
  value: MotionValue;
  from: number;
  to: number;
  duration: number;
  easing: Easing | EasingPreset;
}

export interface ProgressTrackOptions {
  id?: string;
  from?: number;
  to?: number;
  /** ms (0–60000). */
  duration?: number;
  easing?: Easing | EasingPreset;
}

export interface ProgressControl {
  readonly state: MotionState;
  /** Rendered progress 0–1. */
  readonly progress: number;
  /** Promise of the current (or next) run. */
  readonly finished: Promise<MotionResult>;
  play(): void;
  pause(): void;
  reverse(): void;
  finish(): void;
  cancel(): void;
  /** Render the effect at a time fraction 0–1 of its run (eased). */
  seek(progress: number): void;
  /** A value track for `createTimeline().add(…)`: the timeline clock drives this effect. */
  track(options?: ProgressTrackOptions): ProgressTrack;
  /** Follow a 0–1 source instead of the own clock; returns the unsubscribe. */
  drive(source: ProgressSource): () => void;
  /** Idempotent: stops, releases and restores. */
  destroy(): void;
}

export interface DriverOptions {
  duration: number;
  easing: Easing | EasingPreset;
  reducedMotion: ReducedMotion;
  /** Called synchronously on every change of the value. */
  render(progress: number): void;
  onComplete?(result: MotionResult): void;
  /** Every settlement of a run (completed, cancelled, interrupted). */
  onSettle?(result: MotionResult): void;
  /** Reduced-motion changes (live), after the driver applied its own policy. */
  onReduced?(reduced: boolean): void;
}

export interface ProgressDriver extends Omit<ProgressControl, "destroy"> {
  readonly value: MotionValue;
  /** Whether motion is currently reduced for this driver's policy. */
  reduced(): boolean;
  /** Whether an external source currently drives the value. */
  readonly driven: boolean;
  /** Set the value directly (no animation, no run). */
  jump(progress: number): void;
  /** Render the current value again (after the effect built its DOM). */
  refresh(): void;
  destroy(): void;
}

function deferred() {
  let resolve!: (result: MotionResult) => void;
  const promise = new Promise<MotionResult>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

export function createProgressDriver(options: DriverOptions): ProgressDriver {
  const value = motionValue(0);
  const unrender = value.subscribe((progress) => {
    try {
      options.render(progress);
    } catch (error) {
      reportError(error);
    }
  });
  let control: TweenControl | undefined;
  let watched: Promise<MotionResult> | undefined;
  let pending: ReturnType<typeof deferred> | undefined;
  let pendingTime = 0;
  let source: ProgressSource | undefined;
  let unsource: (() => void) | undefined;
  let destroyed = false;
  let systemReduced = prefersReducedMotion();
  const reduced = () => shouldReduceMotion(options.reducedMotion, systemReduced);

  function watch(): void {
    if (!control || control.finished === watched) return;
    const promise = control.finished;
    watched = promise;
    promise.then(
      (result) => {
        if (pending) {
          pending.resolve(result);
          pending = undefined;
        }
        if (destroyed) return;
        options.onSettle?.(result);
        if (result.status === "completed") options.onComplete?.(result);
      },
      () => {},
    );
  }

  function ensure(run: boolean): TweenControl {
    if (!control) {
      const time = pendingTime;
      value.set(0);
      control = animateValue(
        value,
        1,
        { type: "tween", duration: options.duration, easing: options.easing },
        { reducedMotion: options.reducedMotion },
      ) as TweenControl;
      if (time > 0 && control.state === "running") control.seek(time);
      if (!run && control.state === "running") control.pause();
      watch();
    }
    return control;
  }

  function stopSource(): void {
    unsource?.();
    unsource = undefined;
    source = undefined;
  }

  const unreduced = subscribeReducedMotion((next) => {
    systemReduced = next;
    if (destroyed) return;
    if (source) value.set(reduced() ? 1 : clamp(source.get(), 0, 1));
    options.onReduced?.(reduced());
  });

  const driver: ProgressDriver = {
    value,
    reduced,
    get driven() {
      return source !== undefined;
    },
    get state() {
      if (source) return "running";
      return control?.state ?? "idle";
    },
    get progress() {
      return value.get();
    },
    get finished() {
      if (control && !["completed", "cancelled", "interrupted", "failed"].includes(control.state)) {
        return control.finished;
      }
      pending ??= deferred();
      return pending.promise;
    },
    play() {
      if (destroyed || source) return;
      if (!control) ensure(true);
      else control.play();
      watch();
    },
    pause() {
      control?.pause();
    },
    reverse() {
      if (destroyed || source) return;
      ensure(false).reverse();
      if (control?.state === "paused") control.play();
      watch();
    },
    finish() {
      if (destroyed || source) return;
      const own = ensure(false);
      if (own.state === "completed" && value.get() === 1) return;
      if (own.state !== "paused" && own.state !== "running") {
        // Settled (cancelled/interrupted/completed in reverse): a new run, finished at once.
        own.play();
        watch();
      }
      own.finish();
    },
    cancel() {
      control?.cancel();
    },
    seek(progress) {
      if (destroyed || source) return;
      const time = clamp(Number.isFinite(progress) ? progress : 0, 0, 1);
      const before = value.get();
      if (control) control.seek(time);
      else {
        pendingTime = time;
        ensure(false).seek(time);
      }
      watch();
      // A seek is an explicit render request, even when the value did not change.
      if (value.get() === before) driver.refresh();
    },
    refresh() {
      if (destroyed) return;
      try {
        options.render(value.get());
      } catch (error) {
        reportError(error);
      }
    },
    jump(progress) {
      if (destroyed) return;
      control?.cancel();
      control = undefined;
      watched = undefined;
      value.set(clamp(progress, 0, 1));
    },
    track(trackOptions = {}) {
      return {
        id: trackOptions.id,
        value,
        from: trackOptions.from ?? 0,
        to: trackOptions.to ?? 1,
        duration: trackOptions.duration ?? options.duration,
        easing: trackOptions.easing ?? options.easing,
      };
    },
    drive(next) {
      if (destroyed) return () => {};
      if (!next || typeof next.get !== "function" || typeof next.subscribe !== "function") {
        throw new TypeError("drive(source): source must have get() and subscribe()");
      }
      stopSource();
      control?.cancel();
      control = undefined;
      watched = undefined;
      source = next;
      value.set(reduced() ? 1 : clamp(next.get(), 0, 1));
      const unsubscribe = next.subscribe((progress) => {
        if (source !== next || destroyed) return;
        value.set(reduced() ? 1 : clamp(Number.isFinite(progress) ? progress : 0, 0, 1));
      });
      unsource = unsubscribe;
      return () => {
        if (source === next) stopSource();
      };
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      stopSource();
      control?.cancel();
      control = undefined;
      unreduced();
      unrender();
    },
  };
  return driver;
}
