/**
 * M06 video scroll scrub (catalogue §12; contracts/media-api.md, research R5). A 0–1 progress source (the 011
 * `ScrollProgress`, a timeline value, any `{ get, subscribe }`) maps to `currentTime` through the seek
 * coalescer: one seek in flight, the newest target wins, seekable clamp, metadata awaited,
 * `requestVideoFrameCallback` when present. The engine never calls `play()` (no audio), never writes `muted`,
 * `src` or `controls`, and restores `currentTime` on destroy only with `restore: true`. Reduced motion (catalogue
 * `static`): the source is not followed and the video rests on `restTime`.
 */
import type { ProgressSource } from "../core/progress-driver.js";
import {
  prefersReducedMotion,
  type ReducedMotion,
  shouldReduceMotion,
  subscribeReducedMotion,
} from "../core/reduced-motion.js";
import { validator } from "../core/validate.js";
import { counters } from "./engine/debug.js";
import { createSeekCoalescer } from "./engine/seek.js";

export interface VideoScrubOptions {
  /** 0–1 source (required unless you call `drive()` later). */
  progress?: ProgressSource;
  /** Time range in s mapped to 0–1 (default the whole duration). */
  range?: readonly [number, number];
  /** `exact` (default) or `fast` (keyframe seeks via `fastSeek` where available). */
  precision?: "exact" | "fast";
  /** s; smaller differences are not sought (0–1, default 1/60). */
  tolerance?: number;
  /** s shown under reduced motion (default: the current time). */
  restTime?: number;
  /** Restore the original `currentTime` on destroy (default false). */
  restore?: boolean;
  reducedMotion?: ReducedMotion;
}

export interface VideoScrubControl {
  /** `waiting` (no metadata yet), `ready`, `reduced`. */
  readonly state: "waiting" | "ready" | "reduced";
  /** Newest requested time (s) or NaN. */
  readonly target: number;
  /** Follow another source; returns the unsubscribe. */
  drive(source: ProgressSource): () => void;
  /** Request a progress 0–1 directly. */
  seek(progress: number): void;
  destroy(): void;
}

export function createVideoScrub(
  video: HTMLVideoElement,
  options: VideoScrubOptions = {},
): VideoScrubControl {
  const v = validator("createVideoScrub");
  if (!video || video.tagName !== "VIDEO") v.fail('"video" must be a <video> element.');
  const precision = v.oneOf("precision", options.precision, ["exact", "fast"], "exact");
  const tolerance = v.number("tolerance", options.tolerance, 1 / 60, 0, 1);
  const policy = v.reducedMotion(options.reducedMotion);
  const restoreTime = v.flag("restore", options.restore, false);
  const range = options.range;
  if (
    range !== undefined &&
    !(
      Array.isArray(range) &&
      range.length === 2 &&
      range.every((n) => typeof n === "number" && Number.isFinite(n) && n >= 0) &&
      range[1] > range[0]
    )
  )
    v.fail('"range" must be [start, end] seconds with end > start ≥ 0.');
  const original = video.currentTime;
  const restTime = options.restTime;
  if (restTime !== undefined) v.number("restTime", restTime, 0, 0, Number.MAX_SAFE_INTEGER);
  const coalescer = createSeekCoalescer(video, { tolerance, precision });
  let systemReduced = prefersReducedMotion();
  const reduced = () => shouldReduceMotion(policy, systemReduced);
  let source: ProgressSource | undefined;
  let unsource: (() => void) | undefined;
  let destroyed = false;
  counters.effects++;

  function timeOf(progress: number): number {
    const p = Math.min(1, Math.max(0, Number.isFinite(progress) ? progress : 0));
    const duration = coalescer.duration;
    const [start, end] = range ?? [0, Number.isFinite(duration) ? duration : 0];
    return start + (end - start) * p;
  }
  const pendingProgress = { value: Number.NaN };
  function request(progress: number): void {
    if (destroyed) return;
    if (reduced()) return;
    pendingProgress.value = progress;
    if (!coalescer.ready && !range) return; // mapped once metadata gives the duration
    coalescer.request(timeOf(progress));
  }
  const onMetadata = () => {
    if (!destroyed && Number.isFinite(pendingProgress.value) && !reduced())
      coalescer.request(timeOf(pendingProgress.value));
  };
  video.addEventListener("loadedmetadata", onMetadata);
  function rest(): void {
    if (restTime !== undefined) coalescer.request(restTime);
  }
  const unreduced = subscribeReducedMotion((next) => {
    systemReduced = next;
    if (destroyed) return;
    if (reduced()) rest();
    else if (source) request(source.get());
  });

  function drive(next: ProgressSource): () => void {
    if (destroyed) return () => {};
    if (!next || typeof next.get !== "function" || typeof next.subscribe !== "function")
      v.fail("drive(source): source must have get() and subscribe().");
    unsource?.();
    source = next;
    const unsubscribe = next.subscribe((progress) => {
      if (source === next) request(progress);
    });
    unsource = unsubscribe;
    request(next.get());
    return () => {
      if (source !== next) return;
      unsubscribe();
      source = undefined;
      unsource = undefined;
    };
  }
  if (options.progress) drive(options.progress);
  if (reduced()) rest();

  return {
    get state() {
      if (reduced()) return "reduced";
      return coalescer.ready ? "ready" : "waiting";
    },
    get target() {
      return coalescer.target;
    },
    drive,
    seek: (progress) => request(progress),
    destroy() {
      if (destroyed) return;
      destroyed = true;
      unsource?.();
      unsource = undefined;
      source = undefined;
      unreduced();
      video.removeEventListener("loadedmetadata", onMetadata);
      coalescer.destroy();
      if (restoreTime && Number.isFinite(original)) video.currentTime = original;
      counters.effects--;
    },
  };
}
