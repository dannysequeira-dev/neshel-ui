/**
 * M08 gallery cross-fade and M09 pixel/dissolve transition (catalogue §12; contracts/media-api.md, research R7,
 * R8). Slides are the container's element children, stacked in one grid cell (`media.css`). Only the active slide
 * is in the accessibility tree: inactive slides get `inert` + `aria-hidden` (never unmounted — media inside keep
 * their state); originals are restored on destroy. M08 tweens per-slide host opacity FROM THE CURRENT VALUE, so
 * rapid changes retarget without queueing. M09 paints the incoming image cell by cell on a decorative Canvas 2D
 * surface in a seeded order (real block dissolve, incremental), then swaps and releases the canvas; without a 2D
 * context, a decodable image or under reduced motion it cross-fades and reports `mode: "fade"`.
 */
import { animateValue, type MotionControl } from "../core/controls.js";
import type { Easing, EasingPreset } from "../core/easing.js";
import { resolveEasing } from "../core/easing.js";
import { getMotionHost } from "../core/host.js";
import { type MotionValue, motionValue } from "../core/motion-value.js";
import { createProgressDriver, type ProgressDriver } from "../core/progress-driver.js";
import {
  prefersReducedMotion,
  type ReducedMotion,
  shouldReduceMotion,
} from "../core/reduced-motion.js";
import { createCanvasSurface } from "../core/surface.js";
import { type Validator, validator } from "../core/validate.js";
import { counters } from "./engine/debug.js";

type Styled = HTMLElement;

interface Slide {
  element: Styled;
  key: symbol;
  value: MotionValue;
  control?: MotionControl;
  unsubscribe: () => void;
  original: { inert: boolean; hidden: string | null };
}

function createSlides(container: HTMLElement, v: Validator, id: string) {
  const elements = [...container.children].filter(
    (child): child is HTMLElement => child.nodeType === 1 && !child.matches("canvas[aria-hidden]"),
  );
  if (elements.length === 0) v.fail("the container has no slides (element children).");
  const slides: Slide[] = elements.map((element) => {
    const key = Symbol(id);
    const value = motionValue(0);
    const host = getMotionHost(element);
    const unsubscribe = value.subscribe((opacity) => host.setOpacity(key, opacity));
    return {
      element,
      key,
      value,
      unsubscribe,
      original: {
        inert: (element as HTMLElement & { inert?: boolean }).inert === true,
        hidden: element.getAttribute("aria-hidden"),
      },
    };
  });
  const setActive = (index: number) => {
    slides.forEach((slide, i) => {
      const el = slide.element as HTMLElement & { inert?: boolean };
      if (i === index) {
        el.inert = slide.original.inert;
        if (!slide.original.inert) el.removeAttribute("inert");
        if (slide.original.hidden === null) el.removeAttribute("aria-hidden");
        else el.setAttribute("aria-hidden", slide.original.hidden);
      } else {
        el.inert = true;
        el.setAttribute("inert", "");
        el.setAttribute("aria-hidden", "true");
      }
    });
  };
  const restore = () => {
    for (const slide of slides) {
      slide.control?.cancel();
      slide.unsubscribe();
      getMotionHost(slide.element).setOpacity(slide.key, undefined);
      const el = slide.element as HTMLElement & { inert?: boolean };
      el.inert = slide.original.inert;
      if (!slide.original.inert) el.removeAttribute("inert");
      if (slide.original.hidden === null) el.removeAttribute("aria-hidden");
      else el.setAttribute("aria-hidden", slide.original.hidden);
    }
  };
  return { slides, setActive, restore };
}

export interface GalleryOptions {
  /** Initial slide (default 0). */
  index?: number;
  /** ms (0–10000; default per effect). */
  duration?: number;
  easing?: Easing | EasingPreset;
  reducedMotion?: ReducedMotion;
  onIndexChange?(index: number): void;
}

export interface CrossfadeOptions extends GalleryOptions {
  /** Autoplay interval in ms (≥ 2000; none by default). Paused on hover, focus inside and hidden pages. */
  interval?: number;
}

export interface CrossfadeControl {
  readonly index: number;
  readonly count: number;
  show(index: number): void;
  next(): void;
  prev(): void;
  /** Stop autoplay (WCAG 2.2.2). */
  pause(): void;
  play(): void;
  destroy(): void;
}

const wrap = (index: number, count: number) => ((index % count) + count) % count;

/** M08 — cross-fade between slides; interruptible from the current opacities. */
export function createCrossfade(
  container: HTMLElement,
  options: CrossfadeOptions = {},
): CrossfadeControl {
  const v = validator("createCrossfade");
  if (!container || container.nodeType !== 1) v.fail('"container" must be an element.');
  const duration = v.duration("duration", options.duration, 500);
  const easing = options.easing === undefined ? "standard" : v.easing(options.easing);
  const policy = v.reducedMotion(options.reducedMotion);
  const onIndex = v.callback<(index: number) => void>("onIndexChange", options.onIndexChange);
  const interval =
    options.interval === undefined
      ? undefined
      : v.number("interval", options.interval, 0, 2000, 600000);
  const { slides, setActive, restore } = createSlides(container, v, "media/crossfade");
  let index = wrap(v.number("index", options.index, 0, 0, 10000), slides.length);
  let destroyed = false;
  counters.effects++;
  for (const [i, slide] of slides.entries()) slide.value.set(i === index ? 1 : 0);
  setActive(index);

  const reduced = () => shouldReduceMotion(policy, prefersReducedMotion());
  function show(next: number): void {
    if (destroyed) return;
    const target = wrap(Math.trunc(Number.isFinite(next) ? next : 0), slides.length);
    if (target === index) return;
    index = target;
    setActive(index);
    // Reduced motion keeps the fade (catalogue `fade`), capped short.
    const ms = reduced() ? Math.min(duration, 200) : duration;
    for (const [i, slide] of slides.entries()) {
      const goal = i === index ? 1 : 0;
      if (slide.value.get() === goal && !slide.control) continue;
      slide.control = animateValue(
        slide.value,
        goal,
        { type: "tween", duration: ms, easing },
        { reducedMotion: "never" },
      );
    }
    onIndex?.(index);
    restartTimer();
  }

  // --- Optional autoplay ---------------------------------------------------------------------------------
  let timer: ReturnType<typeof setTimeout> | undefined;
  let playing = interval !== undefined;
  let hovering = false;
  let focused = false;
  function restartTimer(): void {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
    const hidden = typeof document !== "undefined" && document.hidden;
    if (!playing || interval === undefined || hovering || focused || hidden || destroyed) return;
    timer = setTimeout(() => show(index + 1), interval);
  }
  const listeners: Array<[EventTarget, string, EventListener]> = [];
  if (interval !== undefined) {
    const on = (target: EventTarget, type: string, fn: EventListener) => {
      target.addEventListener(type, fn);
      listeners.push([target, type, fn]);
    };
    on(container, "pointerenter", () => {
      hovering = true;
      restartTimer();
    });
    on(container, "pointerleave", () => {
      hovering = false;
      restartTimer();
    });
    on(container, "focusin", () => {
      focused = true;
      restartTimer();
    });
    on(container, "focusout", () => {
      focused = container.contains(document.activeElement);
      restartTimer();
    });
    on(document, "visibilitychange", () => restartTimer());
    restartTimer();
  }

  return {
    get index() {
      return index;
    },
    get count() {
      return slides.length;
    },
    show,
    next: () => show(index + 1),
    prev: () => show(index - 1),
    pause() {
      playing = false;
      restartTimer();
    },
    play() {
      if (interval === undefined) return;
      playing = true;
      restartTimer();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      if (timer !== undefined) clearTimeout(timer);
      for (const [target, type, fn] of listeners) target.removeEventListener(type, fn);
      restore();
      counters.effects--;
    },
  };
}

/** Deterministic PRNG (mulberry32) — the same seed gives the same dissolve. */
export function seededRandom(seed: number): () => number {
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface PixelDissolveOptions extends GalleryOptions {
  /** Cell size in CSS px (4–64, default 16); enlarged when the grid would exceed `maxCells`. */
  cell?: number;
  /** Order seed (default 1). */
  seed?: number;
  /** Upper bound of cells (64–4096, default 4096). */
  maxCells?: number;
  /** Canvas DPR cap (1–3, default 2). */
  maxDpr?: number;
}

export interface DissolveControl {
  readonly index: number;
  /** `dissolve` (canvas) or `fade` (fallback) — of the last transition. */
  readonly mode: "dissolve" | "fade" | "none";
  readonly running: boolean;
  show(index: number): void;
  destroy(): void;
}

function imageOf(slide: HTMLElement): HTMLImageElement | null {
  return slide.tagName === "IMG" ? (slide as HTMLImageElement) : slide.querySelector("img");
}

/** M09 — block dissolve between images on a Canvas 2D surface; cross-fade fallback. */
export function createPixelDissolve(
  container: HTMLElement,
  options: PixelDissolveOptions = {},
): DissolveControl {
  const v = validator("createPixelDissolve");
  if (!container || container.nodeType !== 1) v.fail('"container" must be an element.');
  const duration = v.duration("duration", options.duration, 900);
  const easing = resolveEasing(
    options.easing === undefined ? "standard" : v.easing(options.easing),
  );
  const policy = v.reducedMotion(options.reducedMotion);
  const cellOption = v.number("cell", options.cell, 16, 4, 64);
  const seed = v.number("seed", options.seed, 1, -2147483648, 2147483647);
  const maxCells = v.number("maxCells", options.maxCells, 4096, 64, 4096);
  const maxDpr = v.number("maxDpr", options.maxDpr, 2, 1, 3);
  const onIndex = v.callback<(index: number) => void>("onIndexChange", options.onIndexChange);
  const { slides, setActive, restore } = createSlides(container, v, "media/dissolve");
  let index = wrap(v.number("index", options.index, 0, 0, 10000), slides.length);
  let mode: DissolveControl["mode"] = "none";
  let destroyed = false;
  let driver: ProgressDriver | undefined;
  let finishCurrent: (() => void) | undefined;
  const surface = createCanvasSurface(container, {
    maxDpr,
    className: "neshel-dissolve-canvas",
    onResize: () => finishCurrent?.(), // geometry changed mid-transition: complete at once
    onRestore: () => finishCurrent?.(),
  });
  counters.effects++;
  for (const [i, slide] of slides.entries()) slide.value.set(i === index ? 1 : 0);
  setActive(index);
  const reduced = () => shouldReduceMotion(policy, prefersReducedMotion());

  function fade(from: number, to: number): void {
    mode = "fade";
    const ms = reduced() ? Math.min(duration, 200) : duration;
    for (const [i, slide] of slides.entries()) {
      if (i !== from && i !== to) slide.value.set(0);
    }
    (slides[to] as Slide).control = animateValue(
      (slides[to] as Slide).value,
      1,
      { type: "tween", duration: ms, easing },
      { reducedMotion: "never" },
    );
    (slides[from] as Slide).control = animateValue(
      (slides[from] as Slide).value,
      0,
      { type: "tween", duration: ms, easing },
      { reducedMotion: "never" },
    );
  }

  function dissolve(to: number): boolean {
    const img = imageOf((slides[to] as Slide).element);
    if (!img || !(img.complete && img.naturalWidth > 0)) return false;
    const ctx = surface.ensure();
    if (!ctx || surface.width < 1 || surface.height < 1) {
      surface.release();
      return false;
    }
    const w = surface.width;
    const h = surface.height;
    let cell = cellOption;
    if (Math.ceil(w / cell) * Math.ceil(h / cell) > maxCells)
      cell = Math.ceil(Math.sqrt((w * h) / maxCells));
    const cols = Math.ceil(w / cell);
    const rows = Math.ceil(h / cell);
    const total = cols * rows;
    const order = new Uint32Array(total);
    for (let i = 0; i < total; i++) order[i] = i;
    const random = seededRandom(seed + to);
    for (let i = total - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      const t = order[i] as number;
      order[i] = order[j] as number;
      order[j] = t;
    }
    // object-fit: cover mapping of the image into the container box.
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    const scale = Math.max(w / nw, h / nh);
    const ox = (w - nw * scale) / 2;
    const oy = (h - nh * scale) / 2;
    const dpr = surface.dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    let painted = 0;
    const paint = (n: number) => {
      const c = order[n] as number;
      const x = (c % cols) * cell;
      const y = Math.floor(c / cols) * cell;
      ctx.drawImage(
        img,
        (x - ox) / scale,
        (y - oy) / scale,
        cell / scale,
        cell / scale,
        x,
        y,
        cell,
        cell,
      );
      counters.cells++;
    };
    const clear = (n: number) => {
      const c = order[n] as number;
      ctx.clearRect((c % cols) * cell, Math.floor(c / cols) * cell, cell, cell);
      counters.cells++;
    };
    mode = "dissolve";
    const complete = () => {
      finishCurrent = undefined;
      driver?.destroy();
      driver = undefined;
      for (const [i, slide] of slides.entries()) {
        slide.control?.cancel();
        slide.value.set(i === to ? 1 : 0);
      }
      surface.release();
    };
    finishCurrent = complete;
    driver = createProgressDriver({
      duration,
      easing,
      reducedMotion: "never",
      render(p) {
        if (surface.lost) return;
        const target = Math.round(p * total);
        while (painted < target) paint(painted++);
        while (painted > target) clear(--painted);
      },
      onComplete: () => {
        if (!destroyed) complete();
      },
    });
    driver.play();
    return true;
  }

  return {
    get index() {
      return index;
    },
    get mode() {
      return mode;
    },
    get running() {
      return driver !== undefined;
    },
    show(next) {
      if (destroyed) return;
      const to = wrap(Math.trunc(Number.isFinite(next) ? next : 0), slides.length);
      if (to === index) return;
      finishCurrent?.(); // interruption: the running transition completes at once
      const from = index;
      index = to;
      setActive(to);
      if (reduced() || !dissolve(to)) fade(from, to);
      onIndex?.(to);
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      driver?.destroy();
      driver = undefined;
      finishCurrent = undefined;
      surface.release();
      restore();
      counters.effects--;
    },
  };
}
