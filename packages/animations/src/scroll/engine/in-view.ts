/**
 * Visibility triggers (contracts/scroll-engine.md §5; catalogue ST03, ST04, ST08, ST10).
 *
 * - `inViewPresets` / `resolveInView` (ST10): named IntersectionObserver options.
 * - `observeInView`: one IntersectionObserver per (root, rootMargin, threshold), shared by every caller;
 *   reports whether the element is inside the trigger area and, when it is not, on which side it is.
 *   Without IntersectionObserver the callback gets one "inside" report: content is never left hidden.
 * - `createScrollTrigger` (ST03/ST04): `before → active → after` state machine with GSAP-style callbacks
 *   and `once`; a fast scroll that skips the area fires enter and leave in order.
 * - `createSectionSpy` (ST08): active section from cached geometry and the source position (no layout read
 *   on scroll); the last section is forced active at the end of the scroll range.
 */
import { elementKey } from "../../core/dev.js";
import { animationsError } from "../../core/errors.js";
import {
  collectTargets,
  invalidate,
  type Measurable,
  registerGeometry,
  subjectStart,
} from "./geometry.js";
import { getScrollSource, normaliseSource, type ScrollAxis } from "./source.js";

export interface InViewOptions {
  /** Intersection root; omitted or `null` → the viewport. */
  root?: Element | null;
  /** CSS margin around the root (px or %), as in IntersectionObserver. */
  rootMargin?: string;
  threshold?: number | readonly number[];
}

/** ST10 — named trigger areas (contracts/api-011.md §1). */
export const inViewPresets = /* @__PURE__ */ Object.freeze({
  /** Enters when the element crosses the bottom 10 % of the viewport. */
  default: Object.freeze({ rootMargin: "0px 0px -10% 0px", threshold: 0 }),
  /** Enters a quarter viewport before it becomes visible. */
  eager: Object.freeze({ rootMargin: "0px 0px 25% 0px", threshold: 0 }),
  /** Two viewports around the viewport (activation of heavy effects, ST09). */
  lazy: Object.freeze({ rootMargin: "200% 0px 200% 0px", threshold: 0 }),
  /** A thin band through the middle of the viewport. */
  center: Object.freeze({ rootMargin: "-45% 0px -45% 0px", threshold: 0 }),
  /** Half of the element is visible. */
  half: Object.freeze({ rootMargin: "0px", threshold: 0.5 }),
  /** The element is (almost) fully visible. */
  full: Object.freeze({ rootMargin: "0px", threshold: 0.99 }),
  /** The element reaches the top 15 % of the viewport. */
  top: Object.freeze({ rootMargin: "0px 0px -85% 0px", threshold: 0 }),
});
export type InViewPreset = keyof typeof inViewPresets;
export type InViewInput = InViewPreset | InViewOptions;

export interface ResolvedInView {
  root: Element | null;
  rootMargin: string;
  threshold: number[];
}

const MARGIN = /^(-?\d+(\.\d+)?(px|%)|0)(\s+(-?\d+(\.\d+)?(px|%)|0)){0,3}$/;

/** Validate and normalise a trigger (preset name or options). */
export function resolveInView(input: InViewInput | undefined, owner = "trigger"): ResolvedInView {
  const fail = (message: string): never => {
    throw animationsError(owner, message);
  };
  const value = input ?? "default";
  let options: InViewOptions;
  if (typeof value === "string") {
    if (!Object.hasOwn(inViewPresets, value)) {
      fail(
        `unknown trigger preset ${JSON.stringify(value)}; expected one of: ${Object.keys(inViewPresets).join(", ")}.`,
      );
    }
    options = inViewPresets[value as InViewPreset];
  } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    options = value;
  } else {
    return fail("trigger must be a preset name or { rootMargin, threshold, root }.");
  }
  const rootMargin = (options.rootMargin ?? "0px").trim();
  if (!MARGIN.test(rootMargin)) {
    fail(`invalid rootMargin ${JSON.stringify(options.rootMargin)}; expected 1–4 px or % values.`);
  }
  const raw = options.threshold ?? 0;
  const threshold = (Array.isArray(raw) ? [...raw] : [raw]) as number[];
  if (
    threshold.length === 0 ||
    threshold.some((t) => typeof t !== "number" || !(t >= 0 && t <= 1))
  ) {
    fail(`invalid threshold ${JSON.stringify(raw)}; expected numbers from 0 to 1.`);
  }
  const root = options.root ?? null;
  if (root !== null && (typeof root !== "object" || !("nodeType" in root))) {
    fail('"root" must be an element or null.');
  }
  return { root, rootMargin, threshold: threshold.sort((a, b) => a - b) };
}

export type InViewPosition = "before" | "inside" | "after";

export interface InViewReport {
  inView: boolean;
  ratio: number;
  /** `after`: the element left through the start edge (scrolled past). */
  position: InViewPosition;
  /** Element box edges relative to the viewport at the report (free from the observer entry). */
  top: number;
  bottom: number;
}

type Listener = (report: InViewReport) => void;

interface Pool {
  observer: IntersectionObserver;
  listeners: Map<Element, Set<Listener>>;
  min: number;
}

const pools = new Map<string, Pool>();

function poolKey(options: ResolvedInView): string {
  const root = options.root ? elementKey(options.root) : 0;
  return `${root}|${options.rootMargin}|${options.threshold.join(",")}`;
}

function report(entry: IntersectionObserverEntry, min: number, axis: ScrollAxis): InViewReport {
  const ratio = entry.intersectionRatio;
  const inView = entry.isIntersecting && (min === 0 || ratio >= min - 0.001);
  const rect = entry.boundingClientRect;
  if (inView) return { inView, ratio, position: "inside", top: rect.top, bottom: rect.bottom };
  const bounds = entry.rootBounds;
  const start = axis === "block" ? (bounds?.top ?? 0) : (bounds?.left ?? 0);
  const end =
    axis === "block"
      ? (bounds?.bottom ?? window.innerHeight)
      : (bounds?.right ?? window.innerWidth);
  const center = axis === "block" ? (rect.top + rect.bottom) / 2 : (rect.left + rect.right) / 2;
  const position = center < (start + end) / 2 ? "after" : "before";
  return { inView, ratio, position, top: rect.top, bottom: rect.bottom };
}

/** Observe `element` against a trigger area; returns the unobserve function. */
export function observeInView(
  element: Element,
  input: InViewInput | undefined,
  listener: Listener,
): () => void {
  const options = resolveInView(input, "observeInView");
  if (typeof IntersectionObserver !== "function") {
    let active = true;
    queueMicrotask(() => {
      if (active) listener({ inView: true, ratio: 1, position: "inside", top: 0, bottom: 0 });
    });
    return () => {
      active = false;
    };
  }
  const key = poolKey(options);
  let pool = pools.get(key);
  if (!pool) {
    const listeners = new Map<Element, Set<Listener>>();
    const min = options.threshold[0] ?? 0;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const set = listeners.get(entry.target);
          if (!set) continue;
          const value = report(entry, min, "block");
          for (const each of [...set]) each(value);
        }
      },
      { root: options.root, rootMargin: options.rootMargin, threshold: options.threshold },
    );
    pool = { observer, listeners, min };
    pools.set(key, pool);
  }
  const current = pool;
  let set = current.listeners.get(element);
  if (!set) {
    set = new Set();
    current.listeners.set(element, set);
    current.observer.observe(element);
  } else {
    // Already observed by another listener: IntersectionObserver will not report again, so ask for
    // a fresh report by re-observing.
    current.observer.unobserve(element);
    current.observer.observe(element);
  }
  set.add(listener);
  let done = false;
  return () => {
    if (done) return;
    done = true;
    const listeners = current.listeners.get(element);
    listeners?.delete(listener);
    if (listeners && listeners.size === 0) {
      current.listeners.delete(element);
      current.observer.unobserve(element);
    }
    if (current.listeners.size === 0) {
      current.observer.disconnect();
      pools.delete(key);
    }
  };
}

// --- ST03 / ST04: trigger state machine -------------------------------------------------------------

export type TriggerMode = "once" | "repeat" | "reverse";
export type TriggerState = "idle" | "before" | "active" | "after";

export interface ScrollTriggerOptions {
  trigger?: InViewInput;
  /** `"once"` stops observing after the first enter (default `"repeat"`). */
  mode?: TriggerMode;
  /** before → active (scrolling forward into the area). */
  onEnter?: () => void;
  /** active → after (scrolled past). */
  onLeave?: () => void;
  /** after → active (scrolling back into the area). */
  onEnterBack?: () => void;
  /** active → before (scrolled back above the area's start). */
  onLeaveBack?: () => void;
  onChange?: (state: TriggerState) => void;
}

export interface ScrollTrigger {
  readonly state: TriggerState;
  destroy(): void;
}

export function createScrollTrigger(
  element: Element,
  options: ScrollTriggerOptions = {},
): ScrollTrigger {
  const mode = options.mode ?? "repeat";
  if (!["once", "repeat", "reverse"].includes(mode)) {
    throw animationsError("createScrollTrigger", `invalid mode ${JSON.stringify(mode)}`);
  }
  let state: TriggerState = "idle";
  let stop: (() => void) | undefined;
  let destroyed = false;

  const set = (next: TriggerState) => {
    state = next;
    options.onChange?.(next);
  };
  const enter = (from: TriggerState) => {
    set("active");
    if (from === "after") options.onEnterBack?.();
    else options.onEnter?.();
    if (mode === "once") {
      stop?.();
      stop = undefined;
    }
  };

  stop = observeInView(element, options.trigger, ({ position }) => {
    if (destroyed) return;
    const target: TriggerState = position === "inside" ? "active" : position;
    if (target === state) return;
    const from = state;
    if (target === "active") {
      enter(from);
      return;
    }
    if (from === "active") {
      set(target);
      if (target === "after") options.onLeave?.();
      else options.onLeaveBack?.();
      return;
    }
    if (from === "idle") {
      set(target);
      return;
    }
    // Skipped the whole area between two reports (fast scroll): enter, then leave, in order.
    enter(from);
    if (destroyed || mode === "once") return;
    set(target);
    if (target === "after") options.onLeave?.();
    else options.onLeaveBack?.();
  });

  return {
    get state() {
      return state;
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      stop?.();
      stop = undefined;
    },
  };
}

// --- ST08: section spy --------------------------------------------------------------------------

export interface SectionSpyOptions {
  /** Activation line as a fraction of the scrollport from its start (0–1, default 0.3). */
  line?: number;
  source?: Element | Window | null;
  axis?: ScrollAxis;
  /** Called with the active index (-1 before the first section) and element. */
  onChange?: (index: number, section: Element | undefined) => void;
}

export interface SectionSpy {
  readonly active: number;
  refresh(): void;
  destroy(): void;
}

export function createSectionSpy(
  sections: readonly Element[],
  options: SectionSpyOptions = {},
): SectionSpy {
  const line = options.line ?? 0.3;
  if (typeof line !== "number" || !(line >= 0 && line <= 1)) {
    throw animationsError("createSectionSpy", `invalid line ${JSON.stringify(line)}; expected 0–1`);
  }
  const axis = options.axis ?? "block";
  const sourceElement = normaliseSource(options.source);
  const source = getScrollSource(sourceElement);
  const list = [...sections];
  const starts = list.map(() => 0);
  let active = -1;
  let measured = false;
  let destroyed = false;

  const item: Measurable = {
    source,
    targets: () => list.flatMap((section) => collectTargets(section, sourceElement).targets),
    ancestors: () => list.flatMap((section) => collectTargets(section, sourceElement).ancestors),
    measure() {
      list.forEach((section, index) => {
        starts[index] = subjectStart(section, sourceElement, axis);
      });
      measured = true;
    },
  };

  function update(): void {
    if (!measured || destroyed) return;
    const position = source.position[axis];
    const viewport = source.viewport[axis];
    const max = source.max[axis];
    let next = -1;
    const atEnd = max > 0 && position >= max - 1;
    const limit = atEnd ? position + viewport : position + viewport * line;
    for (let index = 0; index < starts.length; index++) {
      if ((starts[index] as number) <= limit) next = index;
    }
    if (next === active) return;
    active = next;
    options.onChange?.(active, list[active]);
  }

  const unsubscribe = list.length > 0 ? source.subscribe(update) : () => {};
  const unregister = list.length > 0 ? registerGeometry(item) : () => {};
  return {
    get active() {
      return active;
    },
    refresh: () => invalidate(item),
    destroy() {
      if (destroyed) return;
      destroyed = true;
      unsubscribe();
      unregister();
    },
  };
}
