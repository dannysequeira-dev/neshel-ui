/**
 * Seek coalescer (Phase 015, internal to `./media`; research R5, contracts/media-api.md §1). Scroll progress may
 * request a new `currentTime` every frame; issuing each one aborts the previous seek and queues decoder work.
 * Rules: at most ONE seek in flight; while seeking only the newest target is kept; on `seeked` (and, when
 * `requestVideoFrameCallback` exists, after the next presented frame) the newest pending target is issued if it
 * differs from the shown time by more than `tolerance`. Targets are clamped into the nearest `seekable` range;
 * nothing is issued before metadata (`loadedmetadata` applies the pending target). Never calls `play()`.
 */
import { counters } from "./debug.js";

type FrameCallbackVideo = HTMLVideoElement & {
  requestVideoFrameCallback?(callback: (now: number, meta: { mediaTime: number }) => void): number;
  cancelVideoFrameCallback?(handle: number): void;
  fastSeek?(time: number): void;
};

export interface SeekCoalescerOptions {
  /** s; targets closer than this to the shown time are skipped (default 1/60). */
  tolerance: number;
  /** `fast` uses `fastSeek` (keyframe) when present. */
  precision: "exact" | "fast";
}

export interface SeekCoalescer {
  /** Request a time (s). */
  request(time: number): void;
  /** Newest requested target (s), or NaN. */
  readonly target: number;
  readonly seeking: boolean;
  /** Whether metadata (duration) is known. */
  readonly ready: boolean;
  readonly duration: number;
  destroy(): void;
}

const HAVE_METADATA = 1;

/** Clamp `time` into the nearest seekable range (whole [0, duration] when ranges are unavailable). */
export function clampSeekable(video: HTMLVideoElement, time: number): number {
  const duration = video.duration;
  const t = Math.max(0, Number.isFinite(duration) ? Math.min(time, duration) : time);
  const ranges = video.seekable;
  if (!ranges || ranges.length === 0) return t;
  // No assignment cycle between locals (tools such as react-docgen follow `a = b; b = a` forever).
  let nearest = Number.NaN;
  let distance = Number.POSITIVE_INFINITY;
  for (let i = 0; i < ranges.length; i++) {
    const start = ranges.start(i);
    const end = ranges.end(i);
    if (t >= start && t <= end) return t;
    const candidate = t < start ? start : end;
    const d = Math.abs(candidate - t);
    if (d < distance) {
      distance = d;
      nearest = candidate;
    }
  }
  return Number.isNaN(nearest) ? t : nearest;
}

export function createSeekCoalescer(
  video: HTMLVideoElement,
  options: SeekCoalescerOptions,
): SeekCoalescer {
  const v = video as FrameCallbackVideo;
  let target = Number.NaN;
  let inFlight = false;
  let frameHandle: number | undefined;
  /** Fallback for a frame callback that never fires (hidden video); one per `seeked` cycle (Phase 016 §17). */
  let fallback: ReturnType<typeof setTimeout> | undefined;
  let destroyed = false;

  function clearFallback(): void {
    if (fallback !== undefined) clearTimeout(fallback);
    fallback = undefined;
  }

  const ready = () => video.readyState >= HAVE_METADATA && Number.isFinite(video.duration);

  function issue(): void {
    if (destroyed || inFlight || !ready() || !Number.isFinite(target)) return;
    const time = clampSeekable(video, target);
    if (Math.abs(video.currentTime - time) <= options.tolerance) return;
    inFlight = true;
    counters.seeksIssued++;
    if (options.precision === "fast" && typeof v.fastSeek === "function") v.fastSeek(time);
    else video.currentTime = time;
  }

  function settle(): void {
    if (destroyed) return;
    inFlight = false;
    issue();
  }

  const onSeeked = () => {
    if (!inFlight || destroyed) return;
    // Wait for the sought frame to be presented when the engine can tell us; otherwise continue now.
    if (typeof v.requestVideoFrameCallback === "function") {
      if (frameHandle !== undefined) v.cancelVideoFrameCallback?.(frameHandle);
      clearFallback();
      frameHandle = v.requestVideoFrameCallback(() => {
        frameHandle = undefined;
        clearFallback();
        counters.framesPresented++;
        settle();
      });
      // A paused video presents the sought frame once; if the engine never calls back (hidden video), the
      // next `seeking` cycle is still unblocked by the timeout below. The timer belongs to THIS cycle: it is
      // cleared by the presented frame, by the next `seeked` and by destroy, so a stale timer can never settle
      // a later cycle early and nothing is retained after destroy.
      fallback = setTimeout(() => {
        fallback = undefined;
        if (frameHandle !== undefined && !destroyed) {
          v.cancelVideoFrameCallback?.(frameHandle);
          frameHandle = undefined;
          settle();
        }
      }, 250);
    } else settle();
  };
  const onMetadata = () => issue();
  video.addEventListener("seeked", onSeeked);
  video.addEventListener("loadedmetadata", onMetadata);

  return {
    request(time) {
      if (destroyed || !Number.isFinite(time)) return;
      counters.seeksRequested++;
      if (inFlight) counters.seeksCoalesced++;
      target = time;
      issue();
    },
    get target() {
      return target;
    },
    get seeking() {
      return inFlight;
    },
    get ready() {
      return ready();
    },
    get duration() {
      return video.duration;
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      if (frameHandle !== undefined) v.cancelVideoFrameCallback?.(frameHandle);
      frameHandle = undefined;
      clearFallback();
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("loadedmetadata", onMetadata);
    },
  };
}
