/**
 * Drag effects G01 `drag`, G02 `dragSnap`, G07 `fling` and G03 `swipeDismiss` (catalogue §4;
 * contracts/api-012.md §1). One recogniser on the element's shared pointer session and one drag motion per
 * attachment; the position is the effect's own transform layer, so other effects compose with it and a new
 * drag starts where the element is (also mid-inertia). Geometry is read once per gesture start (container
 * constraints, element size), never per pointer move.
 */
import type { SpringPreset } from "../core/defaults.js";
import { type ChannelClaim, defineEffect, type EffectContext } from "../core/effect.js";
import type { SpringOptions } from "../core/spring.js";
import { type Validator, validator } from "../core/validate.js";
import { bindControls, type GestureControls } from "./engine/controls.js";
import {
  type Bounds,
  createDragMotion,
  type DragMotion,
  elasticClamp,
  UNBOUNDED,
} from "./engine/drag-motion.js";
import { createGesture, type GestureAxis, type GestureState } from "./engine/gesture.js";
import { publishVelocity } from "./engine/motion-registry.js";
import { DEFAULT_DECAY, type DecayOptions, projectDecay } from "./engine/physics.js";
import {
  type Constraints,
  clampTo,
  dragTouchAction,
  type GestureCommonOptions,
  measureBounds,
  ownKey,
  type ResolvedCommon,
  resolveCommon,
  resolveConstraints,
} from "./shared.js";

const TRANSFORM: ChannelClaim = { channel: "transform", mode: "compose" };
const OPACITY: ChannelClaim = { channel: "opacity", mode: "multiply" };
const AXES: readonly GestureAxis[] = ["x", "y", "both"];

export interface Point {
  x: number;
  y: number;
}

/** G01 — Drag with inertia. */
export interface DragOptions extends GestureCommonOptions {
  /** Movement axis (default `"both"`). */
  axis?: GestureAxis;
  /** Keep moving after release with exponential decay (default true). */
  inertia?: boolean;
  /** Decay of the inertia (`power` 0–1, `timeConstant` 50–2000 ms). */
  decay?: DecayOptions;
  /** Limits of the movement: `"parent"`, an element, or px from the rest position. */
  constraints?: Constraints;
  /** Rubber band beyond the constraints while dragging (0 hard … 1, default 0.35). */
  elastic?: number;
  /** Spring used for bounces and keyboard moves (default `"snappy"`-like 300/30). */
  spring?: SpringOptions | SpringPreset;
  /** px per arrow key (1–200, default 10; Shift × 5). Requires a focusable element. */
  keyboardStep?: number;
  onStart?: () => void;
  /** Called when the element comes to rest after a drag, a key or a command. */
  onEnd?: (position: Point) => void;
}

/** G02 — Drag constraints + snap points. */
export interface DragSnapOptions extends Omit<DragOptions, "inertia"> {
  /** Snap points (px from the rest position) or a grid (default: the rest position only). */
  snap?: readonly Partial<Point>[] | { grid: Partial<Point> };
  /** Called at rest with the snap point and its index (-1 for grid points). */
  onSnap?: (point: Point, index: number) => void;
}

/** G07 — Throw / fling with decay. */
export interface FlingOptions extends Omit<DragOptions, "inertia" | "onEnd"> {
  /** Energy kept when bouncing off a constraint (0–1, default 0.5). */
  bounce?: number;
  /** Called when the thrown element comes to rest. */
  onRest?: (position: Point) => void;
}

type DragKind = "drag" | "snap" | "fling";

interface ResolvedDrag extends ResolvedCommon {
  kind: DragKind;
  axis: GestureAxis;
  inertia: boolean;
  decay: Required<DecayOptions>;
  constraints: Constraints | undefined;
  elastic: number;
  spring: Required<SpringOptions>;
  keyboardStep: number;
  onStart: (() => void) | undefined;
  onEnd: ((position: Point) => void) | undefined;
  snap: { points: readonly Partial<Point>[] } | { grid: Partial<Point> } | undefined;
  onSnap: ((point: Point, index: number) => void) | undefined;
  bounce: number;
}

function resolveDecay(v: Validator, value: unknown): Required<DecayOptions> {
  const o = v.options((value ?? undefined) as DecayOptions | undefined) as DecayOptions;
  return {
    power: v.number("decay.power", o.power, DEFAULT_DECAY.power, 0, 1),
    timeConstant: v.number(
      "decay.timeConstant",
      o.timeConstant,
      DEFAULT_DECAY.timeConstant,
      50,
      2000,
    ),
    restSpeed: v.number("decay.restSpeed", o.restSpeed, DEFAULT_DECAY.restSpeed, 0.1, 100),
  };
}

function resolveSnap(v: Validator, value: unknown): ResolvedDrag["snap"] {
  if (value === undefined || value === null) return undefined;
  const finite = (n: unknown) => n === undefined || (typeof n === "number" && Number.isFinite(n));
  if (Array.isArray(value)) {
    for (const point of value) {
      if (typeof point !== "object" || point === null || !finite(point.x) || !finite(point.y)) {
        v.fail(`invalid "snap" point ${JSON.stringify(point)}; expected { x?, y? } numbers.`);
      }
    }
    return { points: Object.freeze([...value]) };
  }
  const grid = (value as { grid?: Partial<Point> }).grid;
  if (typeof grid === "object" && grid !== null) {
    for (const key of ["x", "y"] as const) {
      const step = grid[key];
      if (
        step !== undefined &&
        (typeof step !== "number" || !(step > 0) || !Number.isFinite(step))
      ) {
        v.fail(`invalid "snap.grid.${key}"; expected a positive number.`);
      }
    }
    return { grid: { ...grid } };
  }
  return v.fail(`invalid "snap"; expected an array of points or { grid: { x?, y? } }.`);
}

function resolveDrag(kind: DragKind, name: string) {
  const v = validator(name);
  return (input: unknown): ResolvedDrag => {
    const o = v.options(input as DragOptions & DragSnapOptions & FlingOptions);
    return {
      ...resolveCommon(o, v),
      kind,
      axis: v.oneOf("axis", o.axis, AXES, "both"),
      inertia: v.flag("inertia", (o as DragOptions).inertia, true),
      decay: resolveDecay(v, o.decay),
      constraints: resolveConstraints(v, o.constraints, kind === "drag" ? undefined : "parent"),
      elastic: v.number("elastic", o.elastic, 0.35, 0, 1),
      spring: v.spring(o.spring, { stiffness: 300, damping: 30 }),
      keyboardStep: v.number("keyboardStep", o.keyboardStep, 10, 1, 200),
      onStart: v.callback("onStart", o.onStart),
      onEnd: v.callback("onEnd", (o as DragOptions).onEnd ?? (o as FlingOptions).onRest),
      snap: kind === "snap" ? resolveSnap(v, (o as DragSnapOptions).snap) : undefined,
      onSnap: v.callback("onSnap", (o as DragSnapOptions).onSnap),
      bounce: v.number("bounce", (o as FlingOptions).bounce, 0.5, 0, 1),
    };
  };
}

/** Candidate snap targets near `target` (array points, or grid points around it). */
function snapCandidates(o: ResolvedDrag, target: Point): Array<{ point: Point; index: number }> {
  const snap = o.snap;
  if (!snap) return [{ point: { x: 0, y: 0 }, index: 0 }];
  if ("grid" in snap) {
    const gx = snap.grid.x;
    const gy = snap.grid.y;
    return [
      {
        point: {
          x: gx ? Math.round(target.x / gx) * gx : target.x,
          y: gy ? Math.round(target.y / gy) * gy : target.y,
        },
        index: -1,
      },
    ];
  }
  return snap.points.map((point, index) => ({
    point: { x: point.x ?? target.x, y: point.y ?? target.y },
    index,
  }));
}

function nearest(o: ResolvedDrag, target: Point, bounds: Bounds): { point: Point; index: number } {
  let best = { point: target, index: -1 };
  let distance = Number.POSITIVE_INFINITY;
  for (const candidate of snapCandidates(o, target)) {
    const point = {
      x: o.axis === "y" ? 0 : clampTo(candidate.point.x, bounds.left, bounds.right),
      y: o.axis === "x" ? 0 : clampTo(candidate.point.y, bounds.top, bounds.bottom),
    };
    const d = Math.hypot(point.x - target.x, point.y - target.y);
    if (d < distance) {
      distance = d;
      best = { point, index: candidate.index };
    }
  }
  return best;
}

function setupDrag(context: EffectContext<ResolvedDrag>) {
  const element = context.element as HTMLElement;
  let bounds: Bounds = UNBOUNDED;
  let size = { w: 200, h: 200 };
  let start: Point = { x: 0, y: 0 };
  /** Rest callback owed after a release/keyboard/command movement. */
  let owed: { point?: Point; index?: number } | undefined;

  const motion: DragMotion = createDragMotion(context.scheduler, (x, y, resting) => {
    if (Math.abs(x) < 1e-3 && Math.abs(y) < 1e-3) context.channels.transform.clear();
    else context.channels.transform.set({ translateX: x, translateY: y });
    publishVelocity(element, resting ? 0 : motion.vx, resting ? 0 : motion.vy);
    if (resting && owed) {
      const settled = owed;
      owed = undefined;
      const o = context.options;
      const position = { x, y };
      if (o.kind === "snap" && settled.point) o.onSnap?.(settled.point, settled.index ?? -1);
      o.onEnd?.(position);
    }
  });

  const refreshBounds = () => {
    bounds = measureBounds(element, context.options.constraints);
  };

  /** Move to `target` (clamped) with the spring, or at once when motion is reduced. */
  function goTo(target: Point, snapped?: { point: Point; index: number }): void {
    const o = context.options;
    const x = o.axis === "y" ? 0 : clampTo(target.x, bounds.left, bounds.right);
    const y = o.axis === "x" ? 0 : clampTo(target.y, bounds.top, bounds.bottom);
    owed = snapped ? { point: snapped.point, index: snapped.index } : {};
    if (context.reduced) motion.set(x, y);
    else motion.release({ kind: "spring", vx: motion.vx, vy: motion.vy, x, y, spring: o.spring });
  }

  function release(vx: number, vy: number): void {
    const o = context.options;
    if (o.axis === "y") vx = 0;
    if (o.axis === "x") vy = 0;
    if (o.kind === "snap") {
      const projected = {
        x: projectDecay(motion.x, vx, o.decay),
        y: projectDecay(motion.y, vy, o.decay),
      };
      const snapped = nearest(o, projected, bounds);
      owed = { point: snapped.point, index: snapped.index };
      if (context.reduced) motion.set(snapped.point.x, snapped.point.y);
      else
        motion.release({
          kind: "spring",
          vx,
          vy,
          x: snapped.point.x,
          y: snapped.point.y,
          spring: o.spring,
        });
      return;
    }
    owed = {};
    if (context.reduced) {
      // Instant: the end state of the motion, no animation (bounds respected).
      const end =
        o.kind === "drag" && o.inertia
          ? { x: projectDecay(motion.x, vx, o.decay), y: projectDecay(motion.y, vy, o.decay) }
          : { x: motion.x, y: motion.y };
      motion.set(
        clampTo(end.x, bounds.left, bounds.right),
        clampTo(end.y, bounds.top, bounds.bottom),
      );
      return;
    }
    if (o.kind === "fling") {
      motion.release({ kind: "fling", vx, vy, decay: o.decay, bounds, restitution: o.bounce });
      return;
    }
    motion.release({
      kind: "inertia",
      vx: o.inertia ? vx : 0,
      vy: o.inertia ? vy : 0,
      decay: o.decay,
      bounds,
      spring: o.spring,
    });
  }

  const gestureOptions = () => {
    const o = context.options;
    return {
      axis: o.axis,
      threshold: o.threshold,
      pointerTypes: o.pointerTypes,
      touchAction: dragTouchAction(o.axis),
      accept: () => !context.options.disabled,
      onStart() {
        motion.stop();
        owed = undefined;
        start = { x: motion.x, y: motion.y };
        refreshBounds();
        size = { w: element.offsetWidth || 200, h: element.offsetHeight || 200 };
        context.options.onStart?.();
      },
      onMove(s: GestureState) {
        const current = context.options;
        const x = current.axis === "y" ? 0 : start.x + s.offset.x;
        const y = current.axis === "x" ? 0 : start.y + s.offset.y;
        motion.set(
          elasticClamp(x, bounds.left, bounds.right, current.elastic, size.w),
          elasticClamp(y, bounds.top, bounds.bottom, current.elastic, size.h),
        );
        publishVelocity(element, s.velocity.x, s.velocity.y);
      },
      onEnd(s: GestureState) {
        release(s.velocity.x, s.velocity.y);
      },
      onCancel() {
        release(0, 0);
      },
    };
  };
  const gesture = createGesture(element, gestureOptions());

  function step(dx: number, dy: number): void {
    const o = context.options;
    refreshBounds();
    if (o.kind === "snap") {
      const target = { x: motion.x + Math.sign(dx), y: motion.y + Math.sign(dy) };
      const candidates = snapCandidates(o, { x: motion.x + dx, y: motion.y + dy });
      // The nearest candidate strictly in the key's direction.
      let best: { point: Point; index: number } | undefined;
      let distance = Number.POSITIVE_INFINITY;
      for (const candidate of candidates) {
        const p = candidate.point;
        const along =
          dx !== 0 ? (p.x - motion.x) * Math.sign(dx) : (p.y - motion.y) * Math.sign(dy);
        if (along <= 0.5) continue;
        const d = Math.hypot(p.x - target.x, p.y - target.y);
        if (d < distance) {
          distance = d;
          best = candidate;
        }
      }
      if (best) goTo(best.point, best);
      return;
    }
    goTo({ x: motion.x + dx, y: motion.y + dy });
  }

  function onKey(event: KeyboardEvent): void {
    const o = context.options;
    if (o.disabled || !ownKey(element, event)) return;
    const unit = o.keyboardStep * (event.shiftKey ? 5 : 1);
    const grid = o.snap && "grid" in o.snap ? o.snap.grid : undefined;
    const sx = grid?.x ?? unit;
    const sy = grid?.y ?? unit;
    let dx = 0;
    let dy = 0;
    if (event.key === "ArrowLeft" && o.axis !== "y") dx = -sx;
    else if (event.key === "ArrowRight" && o.axis !== "y") dx = sx;
    else if (event.key === "ArrowUp" && o.axis !== "x") dy = -sy;
    else if (event.key === "ArrowDown" && o.axis !== "x") dy = sy;
    else if (event.key === "Home") {
      event.preventDefault();
      refreshBounds();
      goTo({ x: 0, y: 0 });
      return;
    } else return;
    event.preventDefault();
    step(dx, dy);
  }
  element.addEventListener("keydown", onKey);

  const commands: Partial<GestureControls> = {
    moveBy(dx, dy) {
      refreshBounds();
      goTo({ x: motion.x + dx, y: motion.y + dy });
    },
    moveTo(x, y) {
      refreshBounds();
      goTo({ x, y });
    },
    reset() {
      refreshBounds();
      goTo({ x: 0, y: 0 });
    },
    snapTo(index) {
      const o = context.options;
      const snap = o.snap;
      if (!snap || !("points" in snap)) return;
      const point = snap.points[index];
      if (!point) return;
      refreshBounds();
      const target = { x: point.x ?? motion.x, y: point.y ?? motion.y };
      goTo(target, { point: target, index });
    },
  };
  let boundControls: GestureControls | undefined = context.options.controls;
  let unbindControls = bindControls(boundControls, commands);

  const unsubscribeReduced = context.onReducedChange((reduced) => {
    if (reduced && motion.running) {
      // Finish the automatic motion at its end now (live switch).
      refreshBounds();
      motion.set(
        clampTo(motion.x, bounds.left, bounds.right),
        clampTo(motion.y, bounds.top, bounds.bottom),
      );
    }
  });

  return {
    update(next: ResolvedDrag) {
      gesture.setOptions(gestureOptions());
      if (next.controls !== boundControls) {
        unbindControls();
        boundControls = next.controls;
        unbindControls = bindControls(next.controls, commands);
      }
      if (gesture.phase === "idle" && !motion.running && next.constraints !== undefined) {
        // Dynamic constraints: bring a resting element into the new bounds.
        refreshBounds();
        const x = clampTo(motion.x, bounds.left, bounds.right);
        const y = clampTo(motion.y, bounds.top, bounds.bottom);
        if (x !== motion.x || y !== motion.y) goTo({ x, y });
      }
    },
    destroy() {
      gesture.destroy();
      motion.stop();
      element.removeEventListener("keydown", onKey);
      unbindControls();
      unsubscribeReduced();
      publishVelocity(element, 0, 0);
    },
  };
}

const dragResolve = /* @__PURE__ */ resolveDrag("drag", "drag");
export const drag = /* @__PURE__ */ defineEffect<DragOptions, ResolvedDrag>({
  id: "physics/drag",
  family: "physics",
  channels: [TRANSFORM],
  reducedMotion: "instant",
  resolve: (input) => dragResolve(input),
  policy: (o) => o.reducedMotion,
  setup: setupDrag,
});

const snapResolve = /* @__PURE__ */ resolveDrag("snap", "dragSnap");
export const dragSnap = /* @__PURE__ */ defineEffect<DragSnapOptions, ResolvedDrag>({
  id: "physics/drag-snap",
  family: "physics",
  channels: [TRANSFORM],
  reducedMotion: "instant",
  resolve: (input) => snapResolve(input),
  policy: (o) => o.reducedMotion,
  setup: setupDrag,
});

const flingResolve = /* @__PURE__ */ resolveDrag("fling", "fling");
export const fling = /* @__PURE__ */ defineEffect<FlingOptions, ResolvedDrag>({
  id: "physics/fling",
  family: "physics",
  channels: [TRANSFORM],
  reducedMotion: "instant",
  resolve: (input) => flingResolve(input),
  policy: (o) => o.reducedMotion,
  setup: setupDrag,
});

/* ------------------------------------------------------------------------------------------------ */
/** G03 — Swipe to dismiss. */
export type SwipeDirection = "x" | "left" | "right" | "y" | "up" | "down";

export interface SwipeDismissOptions extends GestureCommonOptions {
  /** Allowed direction(s) (default `"x"`: left or right). */
  direction?: SwipeDirection;
  /** Fraction of the element's size that dismisses on release (0.1–1, default 0.5). */
  distance?: number;
  /** Release speed that dismisses, px/s (100–5000, default 800). */
  velocity?: number;
  /** Delete / Backspace dismiss when the element is focused (default true). */
  keyboard?: boolean;
  /** Called once when the element has left; the consumer removes it. */
  onDismiss?: (direction: "left" | "right" | "up" | "down") => void;
}

interface ResolvedSwipe extends ResolvedCommon {
  direction: SwipeDirection;
  distance: number;
  velocity: number;
  keyboard: boolean;
  onDismiss: SwipeDismissOptions["onDismiss"];
}

const swipeV = /* @__PURE__ */ validator("swipeDismiss");
const FLY: Required<SpringOptions> = {
  stiffness: 380,
  damping: 40,
  mass: 1,
  restDelta: 0.5,
  restSpeed: 5,
};
const BACK: Required<SpringOptions> = {
  stiffness: 420,
  damping: 34,
  mass: 1,
  restDelta: 0.01,
  restSpeed: 0.01,
};

export const swipeDismiss = /* @__PURE__ */ defineEffect<SwipeDismissOptions, ResolvedSwipe>({
  id: "physics/swipe-dismiss",
  family: "physics",
  channels: [TRANSFORM, OPACITY],
  reducedMotion: "instant",
  resolve(input) {
    const o = swipeV.options(input);
    return {
      ...resolveCommon(o, swipeV),
      direction: swipeV.oneOf(
        "direction",
        o.direction,
        ["x", "left", "right", "y", "up", "down"] as const,
        "x",
      ),
      distance: swipeV.number("distance", o.distance, 0.5, 0.1, 1),
      velocity: swipeV.number("velocity", o.velocity, 800, 100, 5000),
      keyboard: swipeV.flag("keyboard", o.keyboard, true),
      onDismiss: swipeV.callback("onDismiss", o.onDismiss),
    };
  },
  policy: (o) => o.reducedMotion,
  setup(context) {
    const element = context.element as HTMLElement;
    const horizontal = () => ["x", "left", "right"].includes(context.options.direction);
    let size = 200;
    let start = 0;
    let dismissed = false;
    let leaving: "left" | "right" | "up" | "down" | undefined;
    const allowed = (sign: number) => {
      const d = context.options.direction;
      if (d === "x" || d === "y") return true;
      return sign < 0 ? d === "left" || d === "up" : d === "right" || d === "down";
    };
    const render = (value: number) => {
      const h = horizontal();
      if (Math.abs(value) < 1e-3) {
        context.channels.transform.clear();
        context.channels.opacity.clear();
      } else {
        context.channels.transform.set(h ? { translateX: value } : { translateY: value });
        const fade = Math.min(1, Math.abs(value) / (size + 40));
        context.channels.opacity.set(Math.round((1 - fade * 0.9) * 1000) / 1000);
      }
    };
    const motion = createDragMotion(context.scheduler, (x, y, resting) => {
      render(horizontal() ? x : y);
      if (resting && leaving && !dismissed) {
        dismissed = true;
        const direction = leaving;
        context.options.onDismiss?.(direction);
      }
    });
    const position = () => (horizontal() ? motion.x : motion.y);
    const place = (value: number) => (horizontal() ? motion.set(value, 0) : motion.set(0, value));

    function fly(sign: number, velocity: number): void {
      const h = horizontal();
      leaving = h ? (sign < 0 ? "left" : "right") : sign < 0 ? "up" : "down";
      const target = sign * (size + 40);
      if (context.reduced) {
        place(target);
        return;
      }
      motion.release({
        kind: "spring",
        vx: h ? velocity : 0,
        vy: h ? 0 : velocity,
        x: h ? target : 0,
        y: h ? 0 : target,
        spring: FLY,
      });
    }
    function back(velocity: number): void {
      if (context.reduced) {
        place(0);
        return;
      }
      const h = horizontal();
      motion.release({
        kind: "spring",
        vx: h ? velocity : 0,
        vy: h ? 0 : velocity,
        x: 0,
        y: 0,
        spring: BACK,
      });
    }
    const measure = () => {
      size = (horizontal() ? element.offsetWidth : element.offsetHeight) || 200;
    };

    const gestureOptions = () => ({
      axis: (horizontal() ? "x" : "y") as GestureAxis,
      threshold: context.options.threshold,
      pointerTypes: context.options.pointerTypes,
      touchAction: dragTouchAction(horizontal() ? "x" : "y"),
      accept: () => !context.options.disabled && !leaving,
      onStart() {
        motion.stop();
        start = position();
        measure();
      },
      onMove(s: GestureState) {
        const raw = start + (horizontal() ? s.offset.x : s.offset.y);
        // Resistance in a direction that does not dismiss.
        const value = allowed(Math.sign(raw)) ? raw : elasticClamp(raw, 0, 0, 0.5, size);
        place(value);
      },
      onEnd(s: GestureState) {
        const o = context.options;
        const value = position();
        const v = horizontal() ? s.velocity.x : s.velocity.y;
        const sign = Math.sign(value) || Math.sign(v);
        const far = Math.abs(value) >= o.distance * size;
        const fast = Math.abs(v) >= o.velocity && Math.sign(v) === Math.sign(value || v);
        if (sign !== 0 && allowed(sign) && (far || fast)) fly(sign, v);
        else back(v);
      },
      onCancel() {
        back(0);
      },
    });
    const gesture = createGesture(element, gestureOptions());

    function dismiss(): void {
      if (leaving || context.options.disabled) return;
      measure();
      const d = context.options.direction;
      fly(d === "left" || d === "up" ? -1 : 1, 0);
    }
    function onKey(event: KeyboardEvent): void {
      const o = context.options;
      if (!o.keyboard || o.disabled || !ownKey(element, event)) return;
      if (event.key !== "Delete" && event.key !== "Backspace") return;
      event.preventDefault();
      dismiss();
    }
    element.addEventListener("keydown", onKey);
    const commands: Partial<GestureControls> = {
      dismiss,
      reset() {
        leaving = undefined;
        dismissed = false;
        back(0);
      },
    };
    let bound = context.options.controls;
    let unbind = bindControls(bound, commands);
    const unsubscribeReduced = context.onReducedChange((reduced) => {
      if (reduced && motion.running) place(leaving ? Math.sign(position()) * (size + 40) : 0);
    });
    return {
      update() {
        gesture.setOptions(gestureOptions());
        if (context.options.controls !== bound) {
          unbind();
          bound = context.options.controls;
          unbind = bindControls(bound, commands);
        }
      },
      destroy() {
        gesture.destroy();
        motion.stop();
        element.removeEventListener("keydown", onKey);
        unbind();
        unsubscribeReduced();
      },
    };
  },
});
