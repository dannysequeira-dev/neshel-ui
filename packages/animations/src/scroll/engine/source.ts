/**
 * Scroll sources (contracts/scroll-engine.md §1, research R6). One record per scroller, shared by every
 * timeline, trigger and effect that follows it:
 *
 * - one passive `scroll` listener that only schedules a read task (never reads layout, never prevents
 *   anything);
 * - the read phase reads the scroll position once per frame — the only read caused by scrolling — and
 *   derives velocity (px/s, smoothed) and direction; the task keeps polling one more frame after the
 *   position stops changing, which drops velocity to 0 so velocity-driven effects settle;
 * - listeners run in the update phase of the same frame (after every read), so effects compute from a
 *   consistent snapshot and write in the write phase.
 *
 * Scrollport size and maximum scroll are layout reads: they are measured only by the geometry module during
 * an invalidation pass (`measureSource`). A source without subscribers removes its listener.
 */
import { type FrameInfo, getFrameScheduler } from "../../core/scheduler.js";
import { counters } from "./debug.js";

export type ScrollAxis = "block" | "inline";

export interface AxisValues {
  block: number;
  inline: number;
}

export interface ScrollSourceRecord {
  /** The scroll container, or `null` for the root scroller. */
  readonly element: Element | null;
  readonly position: AxisValues;
  /** Scrollport size (px). */
  readonly viewport: AxisValues;
  /** Maximum scroll offset (px). */
  readonly max: AxisValues;
  /** Smoothed velocity (px/s). */
  readonly velocity: AxisValues;
  /** `1` forward, `-1` backward, `0` idle. */
  readonly direction: AxisValues;
  /** Whether `viewport`/`max` hold a measurement. */
  measured: boolean;
  /** Listener runs in the update phase after any position or geometry change. */
  subscribe(listener: () => void): () => void;
  /** Schedule a notification of every listener (geometry changed). */
  notify(): void;
  /** Read the position now (read phase only). */
  readPosition(): void;
}

// Records are kept (cheap) so holders of a record never see a duplicate; element records are weak.
let rootRecord: ScrollSourceRecord | undefined;
const records = new WeakMap<Element, ScrollSourceRecord>();
const SMOOTHING = 0.6;

/** Normalise a `source` option: root scroller aliases become `null`. */
export function normaliseSource(source: unknown): Element | null {
  if (source === undefined || source === null) return null;
  if (typeof window !== "undefined" && source === window) return null;
  if (typeof document !== "undefined") {
    if (source === document.documentElement || source === document.scrollingElement) return null;
    if (source === document.body) return null;
  }
  return source as Element;
}

function readRoot(axis: ScrollAxis): number {
  return axis === "block" ? window.scrollY || 0 : Math.abs(window.scrollX || 0);
}

export function getScrollSource(source: Element | null): ScrollSourceRecord {
  const existing = source === null ? rootRecord : records.get(source);
  if (existing) return existing;
  const scheduler = getFrameScheduler();
  const listeners = new Set<() => void>();
  const position: AxisValues = { block: 0, inline: 0 };
  const viewport: AxisValues = { block: 0, inline: 0 };
  const max: AxisValues = { block: 0, inline: 0 };
  const velocity: AxisValues = { block: 0, inline: 0 };
  const direction: AxisValues = { block: 0, inline: 0 };
  let readTask: (() => void) | undefined;
  let notifyTask: (() => void) | undefined;
  let lastTime: number | undefined;
  let attached = false;

  function readPosition(): void {
    counters.scrollReads++;
    if (source === null) {
      position.block = readRoot("block");
      position.inline = readRoot("inline");
    } else {
      position.block = source.scrollTop;
      position.inline = Math.abs(source.scrollLeft);
    }
  }

  function read({ time }: FrameInfo): boolean {
    const previousBlock = position.block;
    const previousInline = position.inline;
    readPosition();
    const dt = lastTime === undefined ? 0 : (time - lastTime) / 1000;
    lastTime = time;
    let changed = false;
    for (const axis of ["block", "inline"] as const) {
      const delta = position[axis] - (axis === "block" ? previousBlock : previousInline);
      if (delta !== 0) changed = true;
      const instant = dt > 0 ? delta / dt : 0;
      const next = delta === 0 ? 0 : velocity[axis] * (1 - SMOOTHING) + instant * SMOOTHING;
      velocity[axis] = Math.abs(next) < 1 ? 0 : next;
      direction[axis] = delta > 0 ? 1 : delta < 0 ? -1 : 0;
    }
    if (changed || velocity.block !== 0 || velocity.inline !== 0) notify();
    if (!changed) {
      // Trailing frame done: velocity is 0 and the loop stops until the next scroll event.
      velocity.block = velocity.inline = 0;
      direction.block = direction.inline = 0;
      readTask = undefined;
      lastTime = undefined;
      notify();
      return false;
    }
    return true;
  }

  const onScroll = () => {
    readTask ??= scheduler.schedule(read, "read");
  };

  function notify(): void {
    notifyTask ??= scheduler.schedule(() => {
      notifyTask = undefined;
      for (const listener of [...listeners]) listener();
    }, "update");
  }

  function attach(): void {
    if (attached || typeof window === "undefined") return;
    attached = true;
    counters.sources++;
    const target: EventTarget = source ?? window;
    target.addEventListener("scroll", onScroll, { passive: true });
  }

  function detach(): void {
    if (!attached) return;
    attached = false;
    counters.sources--;
    const target: EventTarget = source ?? window;
    target.removeEventListener("scroll", onScroll);
    readTask?.();
    notifyTask?.();
    readTask = notifyTask = undefined;
    lastTime = undefined;
  }

  const record: ScrollSourceRecord = {
    element: source,
    position,
    viewport,
    max,
    velocity,
    direction,
    measured: false,
    subscribe(listener) {
      listeners.add(listener);
      attach();
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) detach();
      };
    },
    notify,
    readPosition,
  };
  if (source === null) rootRecord = record;
  else records.set(source, record);
  return record;
}
