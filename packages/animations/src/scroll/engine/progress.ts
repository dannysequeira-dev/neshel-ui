/**
 * `createScrollProgress` (contracts/scroll-engine.md §2; SP10 smoothing). A normalised 0–1 progress of a
 * scroll range — the whole scroll range of a source, or a named view range of a subject (`cover`,
 * `contain`, `entry`, `exit`, `entry-crossing`, `exit-crossing` with percentage offsets) — computed in the
 * update phase from the source's scroll position and cached geometry. The formulas match native
 * `ViewTimeline` ranges in Chromium, Firefox and WebKit (research R1).
 *
 * Timelines are lazy: they follow their source only while something subscribes. Smoothing (SP10) runs the
 * 008 spring integrator through the 010 spring rig; reduced motion bypasses it.
 */

import type { SpringPreset } from "../../core/defaults.js";
import { clamp } from "../../core/interpolate.js";
import { motionValue } from "../../core/motion-value.js";
import {
  prefersReducedMotion,
  type ReducedMotion,
  shouldReduceMotion,
  subscribeReducedMotion,
} from "../../core/reduced-motion.js";
import { getFrameScheduler } from "../../core/scheduler.js";
import type { SpringOptions } from "../../core/spring.js";
import { createSpringRig, type SpringRig } from "../../core/springs.js";
import { validator } from "../../core/validate.js";
import { counters } from "./debug.js";
import {
  actualStart,
  collectTargets,
  invalidate,
  type Measurable,
  registerGeometry,
  subjectSize,
  subjectStart,
} from "./geometry.js";
import {
  getScrollSource,
  normaliseSource,
  type ScrollAxis,
  type ScrollSourceRecord,
} from "./source.js";

export const RANGE_NAMES = [
  "cover",
  "contain",
  "entry",
  "exit",
  "entry-crossing",
  "exit-crossing",
] as const;
export type RangeName = (typeof RANGE_NAMES)[number];

/**
 * A range edge. With a subject: `"<name>"` or `"<name> <percent>%"`. Without: px (number) or
 * `"<percent>%"` of the maximum scroll.
 */
export type RangeInput = number | `${number}%` | RangeName | `${RangeName} ${number}%`;

export type ParsedEdge =
  | { kind: "named"; name: RangeName; percent: number }
  | { kind: "px"; px: number }
  | { kind: "percent"; percent: number };

export interface ScrollProgressOptions {
  /** Scroll container; omitted, `null` or `window` → the root scroller. */
  source?: Element | Window | null;
  axis?: ScrollAxis;
  /** Element whose view range is tracked; omit for the source's whole scroll range. */
  subject?: Element | null;
  range?: readonly [RangeInput, RangeInput];
  /** SP10: spring-smoothed progress (`true` = prototype spring 90/20). */
  smooth?: boolean | SpringOptions | SpringPreset;
  /** Reduced-motion policy for smoothing (default `"user"`). */
  reducedMotion?: ReducedMotion;
}

export interface ScrollGeometry {
  /** Scroll offset where progress is 0 (px). */
  start: number;
  /** Scroll offset where progress is 1 (px). */
  end: number;
  position: number;
  viewport: number;
  max: number;
  subjectStart: number;
  subjectSize: number;
}

export interface ScrollDiagnostics {
  /** Cached subject start (layout, px). */
  computed: number;
  /** Fresh bounding-box subject start (includes transforms). */
  actual: number;
  drift: number;
}

export interface ScrollProgress {
  /** Progress 0–1 (smoothed when `smooth` is on and motion is not reduced). */
  get(): number;
  /** Unsmoothed progress 0–1. */
  getRaw(): number;
  /** Progress units per second. */
  getVelocity(): number;
  /** Source velocity on this timeline's axis (px/s). */
  readonly scrollVelocity: number;
  /** `1` forward, `-1` backward, `0` idle. */
  readonly direction: 1 | -1 | 0;
  readonly geometry: Readonly<ScrollGeometry>;
  /**
   * Listener after every update (update phase) and every smoothing step, with the current progress (not
   * only on change: a draw at progress 0 matters). The first subscription starts following the source.
   */
  subscribe(listener: (progress: number) => void): () => void;
  /** Re-measure this timeline in the next read phase. */
  refresh(): void;
  /** Cached vs fresh subject position (forces layout; diagnostics only). */
  diagnose(): ScrollDiagnostics;
  /** Idempotent: releases listeners, observers and frame tasks. */
  destroy(): void;
  toJSON(): string;
}

/** Engine-internal view of a timeline (native driver, effects). */
export interface ProgressInternals {
  readonly source: ScrollSourceRecord;
  readonly sourceElement: Element | null;
  readonly subject: Element | null;
  readonly axis: ScrollAxis;
  readonly range: readonly [ParsedEdge, ParsedEdge];
  readonly smooth: boolean;
  /** Called after every update (even when the value did not change). */
  onUpdate(listener: () => void): () => void;
}

const internals = new WeakMap<ScrollProgress, ProgressInternals>();
export const getInternals = (progress: ScrollProgress): ProgressInternals | undefined =>
  internals.get(progress);

export function isScrollProgress(value: unknown): value is ScrollProgress {
  return typeof value === "object" && value !== null && internals.has(value as ScrollProgress);
}

const SMOOTH_SPRING: SpringOptions = {
  stiffness: 90,
  damping: 20,
  restDelta: 0.0005,
  restSpeed: 0.0005,
};

export function parseEdge(
  input: unknown,
  hasSubject: boolean,
  edge: 0 | 1,
  fail: (message: string) => never,
): ParsedEdge {
  if (typeof input === "number" && Number.isFinite(input)) {
    if (hasSubject) fail('numeric range edges need no subject; use "<name> <percent>%".');
    return { kind: "px", px: input };
  }
  if (typeof input === "string") {
    const text = input.trim();
    const percent = /^(-?\d+(?:\.\d+)?)%$/.exec(text);
    if (percent && !hasSubject) return { kind: "percent", percent: Number(percent[1]) };
    const named = /^([a-z-]+)(?:\s+(-?\d+(?:\.\d+)?)%)?$/.exec(text);
    if (named && (RANGE_NAMES as readonly string[]).includes(named[1] as string)) {
      if (!hasSubject) fail(`named range "${text}" needs a subject.`);
      return {
        kind: "named",
        name: named[1] as RangeName,
        percent: named[2] === undefined ? (edge === 0 ? 0 : 100) : Number(named[2]),
      };
    }
  }
  return fail(
    `invalid range edge ${JSON.stringify(input)}; expected ${hasSubject ? '"cover 0%"-style named ranges' : 'px or "<percent>%"'}.`,
  );
}

/** Named range [start, end] for subject start `s`, size `h`, viewport `v` (contracts §2). */
export function namedRange(name: RangeName, s: number, h: number, v: number): [number, number] {
  const containLow = Math.min(s, s + h - v);
  const containHigh = Math.max(s, s + h - v);
  switch (name) {
    case "cover":
      return [s - v, s + h];
    case "contain":
      return [containLow, containHigh];
    case "entry":
      return [s - v, containLow];
    case "exit":
      return [containHigh, s + h];
    case "entry-crossing":
      return [s - v, s - v + h];
    case "exit-crossing":
      return [s, s + h];
  }
}

export function edgeOffset(edge: ParsedEdge, g: ScrollGeometry): number {
  if (edge.kind === "px") return edge.px;
  if (edge.kind === "percent") return (edge.percent / 100) * g.max;
  const [a, b] = namedRange(edge.name, g.subjectStart, g.subjectSize, g.viewport);
  return a + (edge.percent / 100) * (b - a);
}

export function progressAt(position: number, start: number, end: number): number {
  if (end <= start) return position >= start ? 1 : 0;
  return clamp((position - start) / (end - start), 0, 1);
}

let nextId = 1;

export function createScrollProgress(options: ScrollProgressOptions = {}): ScrollProgress {
  const v = validator("createScrollProgress");
  const o = v.options(options);
  const axis = v.oneOf("axis", o.axis, ["block", "inline"] as const, "block");
  const subject = o.subject ?? null;
  if (subject !== null && (typeof subject !== "object" || !("nodeType" in subject))) {
    v.fail('"subject" must be an element.');
  }
  const sourceElement = normaliseSource(o.source);
  const rawRange = o.range ?? (subject ? ["cover 0%", "cover 100%"] : [0, "100%"]);
  if (!Array.isArray(rawRange) || rawRange.length !== 2) v.fail('"range" must be [start, end].');
  const range = [
    parseEdge(rawRange[0], subject !== null, 0, v.fail),
    parseEdge(rawRange[1], subject !== null, 1, v.fail),
  ] as const;
  const smoothSpring =
    o.smooth === undefined || o.smooth === false
      ? undefined
      : v.spring(o.smooth === true ? SMOOTH_SPRING : o.smooth, SMOOTH_SPRING);
  const policy = v.reducedMotion(o.reducedMotion);
  const id = nextId++;

  const source = getScrollSource(sourceElement);
  const geometry: ScrollGeometry = {
    start: 0,
    end: 1,
    position: 0,
    viewport: 0,
    max: 0,
    subjectStart: 0,
    subjectSize: 0,
  };
  const raw = motionValue(0);
  const value = motionValue(0);
  const updateListeners = new Set<() => void>();
  const listeners = new Set<(progress: number) => void>();
  const emit = () => {
    const current = value.get();
    for (const listener of [...listeners]) listener(current);
  };
  let measuredOnce = false;
  let fresh = true; // the next update jumps (no spring from 0 on mount)
  let systemReduced = prefersReducedMotion();
  let rig: SpringRig<"p"> | undefined;
  let unsubscribeSource: (() => void) | undefined;
  let unregister: (() => void) | undefined;
  let unsubscribeReduced: (() => void) | undefined;
  let subscribers = 0;
  let destroyed = false;
  counters.timelines++;

  const smoothing = () => smoothSpring !== undefined && !shouldReduceMotion(policy, systemReduced);

  const item: Measurable = {
    source,
    targets: () => collectTargets(subject, sourceElement).targets,
    ancestors: () => collectTargets(subject, sourceElement).ancestors,
    measure() {
      if (subject) {
        geometry.subjectStart = subjectStart(subject, sourceElement, axis);
        geometry.subjectSize = subjectSize(subject, axis);
      }
      geometry.viewport = source.viewport[axis];
      geometry.max = source.max[axis];
      geometry.start = edgeOffset(range[0], geometry);
      geometry.end = edgeOffset(range[1], geometry);
      measuredOnce = true;
    },
  };

  function update(): void {
    if (!measuredOnce || destroyed) return;
    geometry.position = source.position[axis];
    const p = progressAt(geometry.position, geometry.start, geometry.end);
    raw.set(p);
    if (smoothing()) {
      rig ??= createSpringRig(
        getFrameScheduler(),
        { p },
        smoothSpring as Required<SpringOptions>,
        (values) => {
          value.set(values.p);
          emit();
        },
      );
      if (fresh) rig.set({ p });
      else rig.to({ p });
    } else {
      rig?.stop();
      value.set(p);
    }
    fresh = false;
    emit();
    for (const listener of [...updateListeners]) listener();
  }

  function activate(): void {
    if (unsubscribeSource || destroyed || typeof window === "undefined") return;
    counters.activeTimelines++;
    fresh = true;
    unsubscribeSource = source.subscribe(update);
    unregister = registerGeometry(item);
    if (smoothSpring) {
      unsubscribeReduced = subscribeReducedMotion((reduced) => {
        systemReduced = reduced;
        update();
      });
    }
  }

  function deactivate(): void {
    if (!unsubscribeSource) return;
    counters.activeTimelines--;
    unsubscribeSource();
    unregister?.();
    unsubscribeReduced?.();
    rig?.stop();
    unsubscribeSource = unregister = unsubscribeReduced = undefined;
    measuredOnce = false;
  }

  function retain(): () => void {
    subscribers++;
    activate();
    let released = false;
    return () => {
      if (released) return;
      released = true;
      subscribers--;
      if (subscribers === 0) deactivate();
    };
  }

  const progress: ScrollProgress = {
    get: () => value.get(),
    getRaw: () => raw.get(),
    getVelocity() {
      const span = geometry.end - geometry.start;
      return span > 0 ? source.velocity[axis] / span : 0;
    },
    get scrollVelocity() {
      return source.velocity[axis];
    },
    get direction() {
      return source.direction[axis] as 1 | -1 | 0;
    },
    geometry,
    subscribe(listener) {
      const entry = (next: number) => listener(next);
      listeners.add(entry);
      const release = retain();
      if (measuredOnce) entry(value.get()); // shared timeline already following: draw now
      return () => {
        listeners.delete(entry);
        release();
      };
    },
    refresh() {
      invalidate(item);
    },
    diagnose() {
      const actual = subject ? actualStart(subject, sourceElement, axis) : 0;
      return { computed: geometry.subjectStart, actual, drift: actual - geometry.subjectStart };
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      deactivate();
      updateListeners.clear();
      listeners.clear();
      counters.timelines--;
    },
    toJSON: () => `ScrollProgress#${id}`,
  };
  internals.set(progress, {
    source,
    sourceElement,
    subject,
    axis,
    range,
    smooth: smoothSpring !== undefined,
    onUpdate(listener) {
      updateListeners.add(listener);
      const release = retain();
      return () => {
        updateListeners.delete(listener);
        release();
      };
    },
  });
  return progress;
}
