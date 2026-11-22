/**
 * Canvas 2D surface (Phase 015, internal; ADR 0030 §3, research R12, contracts/ambient-api.md §2). One
 * decorative canvas per effect (`aria-hidden`, `pointer-events: none`, inline positioning so it works without
 * a stylesheet), created lazily, sized from ResizeObserver content boxes (no layout read per frame; one
 * `clientWidth/Height` read at creation) and resized in the scheduler's write phase, with the device pixel
 * ratio capped. `contextlost` stops drawing (`lost`), `contextrestored` asks for a full redraw. `release()`
 * zeroes the bitmap, removes the canvas and disconnects everything. This lifecycle (ensure → resize → draw →
 * release) is the seam a 016 GPU Surface Manager may implement with WebGL contexts.
 */
import { getFrameScheduler } from "./scheduler.js";

export interface CanvasSurfaceOptions {
  /** Upper bound of the device pixel ratio (1–3, default 2). */
  maxDpr?: number;
  /** Class of the canvas (package stylesheet hooks). */
  className?: string;
  /** Called after the bitmap was resized (CSS px size, dpr). */
  onResize?(width: number, height: number, dpr: number): void;
  /** Called after a lost context was restored (redraw everything). */
  onRestore?(): void;
}

export interface CanvasSurface {
  readonly canvas: HTMLCanvasElement | undefined;
  readonly context: CanvasRenderingContext2D | undefined;
  /** CSS px. */
  readonly width: number;
  readonly height: number;
  readonly dpr: number;
  readonly lost: boolean;
  /** Whether a 2D context could be created (false after a failed `ensure`). */
  readonly supported: boolean;
  /** Create the canvas and context on first use; `undefined` when 2D canvas is unavailable or lost. */
  ensure(): CanvasRenderingContext2D | undefined;
  release(): void;
}

/** Live surface counters (tests and lab). */
export const surfaceCounters = { surfaces: 0, contexts: 0, resizes: 0, restores: 0 };

const INLINE =
  "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;display:block;border:0";

export function createCanvasSurface(
  container: HTMLElement,
  options: CanvasSurfaceOptions = {},
): CanvasSurface {
  const maxDpr = Math.min(3, Math.max(1, options.maxDpr ?? 2));
  let canvas: HTMLCanvasElement | undefined;
  let context: CanvasRenderingContext2D | undefined;
  let width = 0;
  let height = 0;
  let dpr = 1;
  let lost = false;
  let supported = true;
  let observer: ResizeObserver | undefined;
  let cancelResize: (() => void) | undefined;
  let pending: { w: number; h: number } | undefined;
  const scheduler = getFrameScheduler();

  function currentDpr(): number {
    const ratio = (globalThis as { devicePixelRatio?: number }).devicePixelRatio;
    return Math.min(maxDpr, Math.max(1, Number.isFinite(ratio) && ratio ? ratio : 1));
  }

  function apply(w: number, h: number): void {
    if (!canvas) return;
    const nextDpr = currentDpr();
    const bw = Math.max(0, Math.round(w * nextDpr));
    const bh = Math.max(0, Math.round(h * nextDpr));
    width = w;
    height = h;
    dpr = nextDpr;
    if (canvas.width !== bw) canvas.width = bw;
    if (canvas.height !== bh) canvas.height = bh;
    surfaceCounters.resizes++;
    try {
      options.onResize?.(w, h, nextDpr);
    } catch (error) {
      queueMicrotask(() => {
        throw error;
      });
    }
  }

  const onLost = (event: Event) => {
    event.preventDefault(); // allow restoration
    lost = true;
  };
  const onRestored = () => {
    lost = false;
    surfaceCounters.restores++;
    apply(width, height);
    options.onRestore?.();
  };

  const surface: CanvasSurface = {
    get canvas() {
      return canvas;
    },
    get context() {
      return context;
    },
    get width() {
      return width;
    },
    get height() {
      return height;
    },
    get dpr() {
      return dpr;
    },
    get lost() {
      return lost;
    },
    get supported() {
      return supported;
    },
    ensure() {
      if (context) return lost ? undefined : context;
      if (!supported || typeof document === "undefined") return undefined;
      const node = container.ownerDocument.createElement("canvas");
      let ctx: CanvasRenderingContext2D | null = null;
      try {
        ctx = node.getContext("2d");
      } catch {
        ctx = null;
      }
      if (!ctx) {
        supported = false;
        return undefined;
      }
      node.setAttribute("aria-hidden", "true");
      node.setAttribute("role", "presentation");
      node.setAttribute("style", INLINE);
      if (options.className) node.className = options.className;
      node.addEventListener("contextlost", onLost);
      node.addEventListener("contextrestored", onRestored);
      container.appendChild(node);
      canvas = node;
      context = ctx;
      surfaceCounters.surfaces++;
      surfaceCounters.contexts++;
      apply(container.clientWidth, container.clientHeight);
      if (typeof ResizeObserver === "function") {
        observer = new ResizeObserver((entries) => {
          const box = entries[entries.length - 1]?.contentRect;
          if (!box) return;
          pending = { w: box.width, h: box.height };
          // Never resize inside the observer callback (Phase 012 gotcha): apply in the write phase.
          cancelResize ??= scheduler.schedule(() => {
            cancelResize = undefined;
            if (pending && (pending.w !== width || pending.h !== height || currentDpr() !== dpr))
              apply(pending.w, pending.h);
            pending = undefined;
          }, "write");
        });
        observer.observe(container);
      }
      return ctx;
    },
    release() {
      cancelResize?.();
      cancelResize = undefined;
      observer?.disconnect();
      observer = undefined;
      if (canvas) {
        canvas.removeEventListener("contextlost", onLost);
        canvas.removeEventListener("contextrestored", onRestored);
        canvas.width = 0;
        canvas.height = 0;
        canvas.remove();
        canvas = undefined;
        surfaceCounters.surfaces--;
      }
      if (context) {
        context = undefined;
        surfaceCounters.contexts--;
      }
      width = height = 0;
      lost = false;
      supported = true;
    },
  };
  return surface;
}
