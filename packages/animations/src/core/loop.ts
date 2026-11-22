/**
 * Visibility-gated loop (Phase 014, internal; research R14, ADR 0029 §6): the clock of continuous effects
 * (T04 repeats, T06, T07, S05, S07, S09). ONE `update` task of the shared scheduler exists only while the loop
 * is wanted (played, not paused), its element is on screen (IntersectionObserver), the page is visible and
 * motion is not reduced. Time is a plain number, so `seek()` is deterministic and a hidden tab never jumps
 * (scheduler deltas are clamped). Finite by default: `repeat` extra cycles; `Infinity` must be explicit.
 */
import { reportError } from "./dev.js";
import { clamp } from "./interpolate.js";
import { motionValue } from "./motion-value.js";
import type { ProgressSource, ProgressTrack, ProgressTrackOptions } from "./progress-driver.js";
import {
  prefersReducedMotion,
  type ReducedMotion,
  shouldReduceMotion,
  subscribeReducedMotion,
} from "./reduced-motion.js";
import { type FrameInfo, getFrameScheduler } from "./scheduler.js";

export interface LoopOptions {
  /** Element whose visibility gates the clock (`null`: always considered visible). */
  element: Element | null;
  /** One cycle, ms (> 0). */
  period: number;
  /** Extra cycles after the first (0 … 1000 or `Infinity`). */
  repeat: number;
  reducedMotion: ReducedMotion;
  /** Render at `time` ms since the start (0 ≤ time ≤ total). */
  render(time: number): void;
  /** Render the rest state (stopped by reduced motion, `stop()` or completion). */
  rest(): void;
  onComplete?(): void;
}

export type LoopState = "idle" | "running" | "paused" | "completed";

export interface LoopControl {
  readonly state: LoopState;
  /** ms since the start of the run. */
  readonly time: number;
  /** Whether the clock task is currently scheduled (visible, not reduced, wanted). */
  readonly ticking: boolean;
  play(): void;
  pause(): void;
  /** Render at a time (ms); keeps the state. */
  seek(time: number): void;
  /** Stop and render the rest state (state `idle`). */
  stop(): void;
  destroy(): void;
}

/** Live loop counters (tests and lab). */
export const loopCounters = { loops: 0, ticking: 0, observers: 0 };

export function createLoop(options: LoopOptions): LoopControl {
  const total = options.period * (options.repeat + 1);
  const scheduler = getFrameScheduler();
  let state: LoopState = "idle";
  let time = 0;
  let visible = true;
  let hidden = typeof document !== "undefined" && document.hidden;
  let systemReduced = prefersReducedMotion();
  let cancelTask: (() => void) | undefined;
  let destroyed = false;
  const reduced = () => shouldReduceMotion(options.reducedMotion, systemReduced);
  loopCounters.loops++;

  function safe(fn: () => void): void {
    try {
      fn();
    } catch (error) {
      reportError(error);
    }
  }

  function tick({ delta }: FrameInfo): boolean {
    if (state !== "running") return false;
    time = Math.min(total, time + delta * 1000);
    safe(() => options.render(time));
    if (time >= total) {
      state = "completed";
      stopTask();
      safe(options.rest);
      safe(() => options.onComplete?.());
      return false;
    }
    return true;
  }

  function stopTask(): void {
    if (!cancelTask) return;
    cancelTask();
    cancelTask = undefined;
    loopCounters.ticking--;
  }

  function update(): void {
    const run = state === "running" && visible && !hidden && !reduced() && !destroyed;
    if (run && !cancelTask) {
      cancelTask = scheduler.schedule(tick, "update");
      loopCounters.ticking++;
    } else if (!run) stopTask();
  }

  let observer: IntersectionObserver | undefined;
  if (options.element && typeof IntersectionObserver === "function") {
    observer = new IntersectionObserver((entries) => {
      const entry = entries[entries.length - 1];
      if (!entry) return;
      visible = entry.isIntersecting;
      update();
    });
    observer.observe(options.element);
    loopCounters.observers++;
  }
  const onVisibility = () => {
    hidden = document.hidden;
    update();
  };
  if (typeof document !== "undefined") document.addEventListener("visibilitychange", onVisibility);
  const unreduced = subscribeReducedMotion((next) => {
    systemReduced = next;
    if (reduced()) safe(options.rest);
    else if (state === "running" || state === "paused") safe(() => options.render(time));
    update();
  });

  return {
    get state() {
      return state;
    },
    get time() {
      return time;
    },
    get ticking() {
      return cancelTask !== undefined;
    },
    play() {
      if (destroyed || state === "running") return;
      if (state === "completed" || state === "idle") time = 0;
      state = "running";
      if (reduced()) safe(options.rest);
      update();
    },
    pause() {
      if (state !== "running") return;
      state = "paused";
      update();
    },
    seek(next) {
      if (destroyed) return;
      time = Math.min(total, Math.max(0, Number.isFinite(next) ? next : 0));
      if (!reduced()) safe(() => options.render(time));
    },
    stop() {
      if (destroyed) return;
      state = "idle";
      time = 0;
      update();
      safe(options.rest);
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      state = "idle";
      stopTask();
      if (observer) {
        observer.disconnect();
        loopCounters.observers--;
      }
      if (typeof document !== "undefined")
        document.removeEventListener("visibilitychange", onVisibility);
      unreduced();
      loopCounters.loops--;
    },
  };
}

/** Control of a continuous effect (loop) — also seekable, timeline- and source-driven. */
export interface LoopEffectControl {
  readonly state: LoopState;
  /** Progress 0–1 of the whole run (of one cycle when `repeat` is `Infinity`). */
  readonly progress: number;
  play(): void;
  pause(): void;
  /** Stop and show the rest state. */
  stop(): void;
  seek(progress: number): void;
  /** A value track for `createTimeline().add(…)` (finite runs; one cycle when infinite). */
  track(options?: ProgressTrackOptions): ProgressTrack;
  /** Follow a 0–1 source (own clock paused); returns the unsubscribe. */
  drive(source: ProgressSource): () => void;
  destroy(): void;
}

export function loopEffectControl(
  loop: LoopControl,
  period: number,
  repeat: number,
  destroy: () => void,
): LoopEffectControl {
  const span = Number.isFinite(repeat) ? period * (repeat + 1) : period;
  let unsource: (() => void) | undefined;
  // Track subscriptions live until the effect is destroyed (review R3): a timeline may keep the value.
  const untracks = new Set<() => void>();
  let destroyed = false;
  const control: LoopEffectControl = {
    get state() {
      return loop.state;
    },
    get progress() {
      return span > 0 ? clamp(loop.time / span, 0, 1) : 0;
    },
    play: () => loop.play(),
    pause: () => loop.pause(),
    stop: () => loop.stop(),
    seek: (progress) => loop.seek(clamp(Number.isFinite(progress) ? progress : 0, 0, 1) * span),
    track(options = {}) {
      const value = motionValue(0);
      if (!destroyed) untracks.add(value.subscribe((progress) => loop.seek(progress * span)));
      return {
        id: options.id,
        value,
        from: options.from ?? 0,
        to: options.to ?? 1,
        duration: options.duration ?? span,
        easing: options.easing ?? "linear",
      };
    },
    drive(source) {
      // Inert after destroy (Phase 015 §6): no subscription, no pause/seek of the destroyed loop.
      if (destroyed) return () => {};
      unsource?.();
      loop.pause();
      const apply = (progress: number) => loop.seek(clamp(progress, 0, 1) * span);
      apply(source.get());
      const unsubscribe = source.subscribe(apply);
      unsource = unsubscribe;
      return () => {
        unsubscribe();
        if (unsource === unsubscribe) unsource = undefined;
      };
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      unsource?.();
      unsource = undefined;
      for (const untrack of untracks) untrack();
      untracks.clear();
      destroy();
    },
  };
  return control;
}
