/** Options and helpers shared by the Phase 012 gesture effects (internal). */
import { measureBox } from "../core/layout-box.js";
import type { MotionValue } from "../core/motion-value.js";
import type { TouchToken } from "../core/pointer-session.js";
import type { ReducedMotion } from "../core/reduced-motion.js";
import type { Validator } from "../core/validate.js";
import { type GestureControls, isGestureControls } from "./engine/controls.js";
import { type Bounds, UNBOUNDED } from "./engine/drag-motion.js";
import { type GestureAxis, POINTER_KINDS, type PointerKind } from "./engine/gesture.js";

/** Options shared by every gesture effect. */
export interface GestureCommonOptions {
  /** Pointer kinds that may start the gesture (default mouse, pen and touch). */
  pointerTypes?: readonly PointerKind[];
  /** px of movement before the gesture starts (0–40, default 3). */
  threshold?: number;
  /** Turn the gesture off (disabled elements never react either). */
  disabled?: boolean;
  /** Reduced-motion policy (default `"user"`): automatic motion jumps to its end; direct manipulation stays. */
  reducedMotion?: ReducedMotion;
  /** Non-gesture alternatives (`createGestureControls()` / `useGestureControls()`). */
  controls?: GestureControls;
}

export interface ResolvedCommon {
  pointerTypes: readonly PointerKind[];
  threshold: number;
  disabled: boolean;
  reducedMotion: ReducedMotion;
  controls: GestureControls | undefined;
}

export function resolveCommon(o: Partial<GestureCommonOptions>, v: Validator): ResolvedCommon {
  let pointerTypes: readonly PointerKind[] = POINTER_KINDS;
  if (o.pointerTypes !== undefined && o.pointerTypes !== null) {
    if (
      !Array.isArray(o.pointerTypes) ||
      o.pointerTypes.length === 0 ||
      o.pointerTypes.some((type) => !POINTER_KINDS.includes(type))
    ) {
      v.fail(`invalid "pointerTypes"; expected a non-empty array of: "mouse", "pen", "touch".`);
    }
    pointerTypes = Object.freeze([...o.pointerTypes]);
  }
  if (o.controls !== undefined && o.controls !== null && !isGestureControls(o.controls)) {
    v.fail(`invalid "controls"; create it with createGestureControls() or useGestureControls().`);
  }
  return {
    pointerTypes,
    threshold: v.number("threshold", o.threshold, 3, 0, 40),
    disabled: v.flag("disabled", o.disabled, false),
    reducedMotion: v.reducedMotion(o.reducedMotion),
    controls: o.controls ?? undefined,
  };
}

/** `touch-action` left to the browser by a drag on `axis` (research R2). */
export function dragTouchAction(axis: GestureAxis): TouchToken[] {
  if (axis === "x") return ["pan-y", "pinch-zoom"];
  if (axis === "y") return ["pan-x", "pinch-zoom"];
  return ["pinch-zoom"];
}

export type Constraints =
  | "parent"
  | Element
  | { left?: number; right?: number; top?: number; bottom?: number };

export function resolveConstraints(
  v: Validator,
  value: unknown,
  fallback: Constraints | undefined,
): Constraints | undefined {
  if (value === undefined || value === null) return fallback;
  if (value === "parent") return value;
  if (typeof Element !== "undefined" && value instanceof Element) return value;
  if (typeof value === "object" && !Array.isArray(value) && !("nodeType" in value)) {
    const rect = value as Record<string, unknown>;
    for (const key of ["left", "right", "top", "bottom"]) {
      const side = rect[key];
      if (side !== undefined && (typeof side !== "number" || Number.isNaN(side))) {
        v.fail(`invalid "constraints.${key}"; expected a number (px from the rest position).`);
      }
    }
    return rect as Constraints;
  }
  // Server render: a ref's element is not available yet; any object passes, checked on the client.
  if (typeof value === "object" && "nodeType" in (value as object)) return value as Element;
  return v.fail(
    `invalid "constraints"; expected "parent", an element or { left, right, top, bottom }.`,
  );
}

/**
 * Bounds of the translation of `element` (px from its rest position) for `constraints`. Container
 * constraints are measured from the offset chain (transforms ignored) — call once per gesture start.
 */
export function measureBounds(element: HTMLElement, constraints: Constraints | undefined): Bounds {
  if (constraints === undefined) return UNBOUNDED;
  if (
    constraints === "parent" ||
    (typeof Element !== "undefined" && constraints instanceof Element)
  ) {
    const container =
      constraints === "parent" ? element.parentElement : (constraints as HTMLElement);
    if (!container) return UNBOUNDED;
    const e = measureBox(element);
    const p = measureBox(container);
    const left = p.x + (container.clientLeft || 0);
    const top = p.y + (container.clientTop || 0);
    const width = container.clientWidth || p.width;
    const height = container.clientHeight || p.height;
    const bounds = {
      left: left - e.x,
      right: left + width - (e.x + e.width),
      top: top - e.y,
      bottom: top + height - (e.y + e.height),
    };
    // An element larger than its container may not move along that axis.
    if (bounds.left > bounds.right) bounds.left = bounds.right = (bounds.left + bounds.right) / 2;
    if (bounds.top > bounds.bottom) bounds.top = bounds.bottom = (bounds.top + bounds.bottom) / 2;
    return bounds;
  }
  const rect = constraints as { left?: number; right?: number; top?: number; bottom?: number };
  return {
    left: rect.left ?? UNBOUNDED.left,
    right: rect.right ?? UNBOUNDED.right,
    top: rect.top ?? UNBOUNDED.top,
    bottom: rect.bottom ?? UNBOUNDED.bottom,
  };
}

export const clampTo = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export function isMotionValue(value: unknown): value is MotionValue {
  const candidate = value as MotionValue | null;
  return (
    typeof candidate === "object" &&
    candidate !== null &&
    typeof candidate.get === "function" &&
    typeof candidate.subscribe === "function"
  );
}

/** Whether keyboard events on `element` should be handled (the element itself is the target). */
export const ownKey = (element: Element, event: KeyboardEvent) =>
  event.target === element &&
  !event.defaultPrevented &&
  !event.altKey &&
  !event.ctrlKey &&
  !event.metaKey;
