/**
 * Frame scheduler (contracts/core-engine.md §1, ADR 0018 §3).
 *
 * One `requestAnimationFrame` loop shared by every effect. Each frame runs three phases in a fixed
 * order so effects never interleave layout reads with style writes (no layout thrashing):
 *
 *   read   — measure (getBoundingClientRect, scroll positions)
 *   update — advance springs and timelines (pure computation)
 *   write  — apply styles (transform, custom properties)
 *
 * A task runs once per frame while it returns `true`; returning anything else removes it. Tasks
 * added to a later phase during a frame run in that same frame; tasks added to the current or an
 * earlier phase run in the next frame. The loop stops requesting frames when no task is pending,
 * so an idle page costs nothing. On the server (no `requestAnimationFrame`) scheduling is a no-op.
 */

export type FramePhase = "read" | "update" | "write";

export interface FrameInfo {
  /** `requestAnimationFrame` timestamp (ms). */
  readonly time: number;
  /** Seconds since the previous frame, clamped to `maxDelta` (0 on the first frame). */
  readonly delta: number;
}

/** Return `true` to run again on the next frame; any other value (or none) ends the task. */
export type FrameTask = (frame: FrameInfo) => unknown;

export interface FrameScheduler {
  /** Queue `task` in `phase` (default `"update"`); returns an idempotent cancel function. */
  schedule(task: FrameTask, phase?: FramePhase): () => void;
  /** Number of pending tasks (diagnostics and tests). */
  readonly size: number;
}

export interface FrameSchedulerOptions {
  /** Upper bound of `delta` in seconds (default 1/15) so a background tab never "jumps". */
  maxDelta?: number;
}

const PHASES: readonly FramePhase[] = ["read", "update", "write"];

type RafHost = {
  requestAnimationFrame?: (callback: (time: number) => void) => number;
  cancelAnimationFrame?: (handle: number) => void;
};

export function createFrameScheduler(options: FrameSchedulerOptions = {}): FrameScheduler {
  const maxDelta = options.maxDelta ?? 1 / 15;
  // Entries (not bare functions) so the same function may be scheduled twice and a task cancelled
  // while the frame runs is never re-queued.
  type Entry = { task: FrameTask; cancelled: boolean };
  const queues: Record<FramePhase, Set<Entry>> = {
    read: new Set(),
    update: new Set(),
    write: new Set(),
  };
  let handle: number | undefined;
  let lastTime: number | undefined;
  let running: FramePhase | undefined;

  const size = () => queues.read.size + queues.update.size + queues.write.size;

  function request(): void {
    // Looked up on every call so tests and late polyfills can provide it.
    const host = globalThis as RafHost;
    if (handle !== undefined || typeof host.requestAnimationFrame !== "function") return;
    handle = host.requestAnimationFrame(frame);
  }

  function frame(time: number): void {
    handle = undefined;
    const delta =
      lastTime === undefined ? 0 : Math.min(Math.max(0, (time - lastTime) / 1000), maxDelta);
    lastTime = time;
    const info: FrameInfo = { time, delta };
    const keep: Array<[FramePhase, Entry]> = [];
    for (const phase of PHASES) {
      running = phase;
      const entries = [...queues[phase]];
      queues[phase].clear();
      for (const entry of entries) {
        if (entry.cancelled) continue;
        let again = false;
        try {
          again = entry.task(info) === true;
        } catch (error) {
          // One faulty effect must not stop every other animation on the page.
          reportError(error);
        }
        if (again && !entry.cancelled) keep.push([phase, entry]);
      }
    }
    running = undefined;
    for (const [phase, entry] of keep) queues[phase].add(entry);
    if (size() > 0) request();
    else lastTime = undefined; // the next burst starts with delta 0
  }

  function cancelIfIdle(): void {
    if (size() > 0 || handle === undefined || running !== undefined) return;
    (globalThis as RafHost).cancelAnimationFrame?.(handle);
    handle = undefined;
    lastTime = undefined;
  }

  return {
    schedule(task, phase = "update") {
      if (!PHASES.includes(phase)) throw new TypeError(`unknown frame phase ${String(phase)}`);
      const entry: Entry = { task, cancelled: false };
      queues[phase].add(entry);
      request();
      return () => {
        if (entry.cancelled) return;
        entry.cancelled = true;
        queues[phase].delete(entry);
        cancelIfIdle();
      };
    },
    get size() {
      return size();
    },
  };
}

function reportError(error: unknown): void {
  const host = globalThis as { reportError?: (error: unknown) => void };
  if (typeof host.reportError === "function") host.reportError(error);
  else console.error(error);
}

let shared: FrameScheduler | undefined;

/** The page-wide scheduler, created on first use (never at import time). */
export function getFrameScheduler(): FrameScheduler {
  shared ??= createFrameScheduler();
  return shared;
}
