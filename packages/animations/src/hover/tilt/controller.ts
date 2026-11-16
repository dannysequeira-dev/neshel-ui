/**
 * Tilt3D as an engine definition (Phase 009; contracts/tilt-3d.md §3, ADR 0021).
 *
 * Performance model (unchanged from 008.0): pointer events only record a target; one frame task
 * advances three springs (rotateX, rotateY, scale) and hands a layer to the element's motion host,
 * which writes `transform` once per frame through its style ledger (the element's own inline
 * transform is kept and restored). No React state, no re-render, no layout read per pointer move.
 */
import {
  attachEffect,
  defineEffect,
  type EffectContext,
  type EffectInstance,
} from "../../core/effect.js";
import type { FrameInfo } from "../../core/scheduler.js";
import { type SpringState, stepSpring } from "../../core/spring.js";
import { type ResolvedTilt3DOptions, resolveTilt3DOptions, type Tilt3DOptions } from "./options.js";

/** Value of the `data-neshel-tilt` attribute (styling and test hook). */
export type Tilt3DState = "rest" | "pointer" | "focus" | "reduced" | "disabled";

export interface Tilt3DController {
  /** Apply new options (validated); the current pose follows them. */
  update(options?: Tilt3DOptions): void;
  /** Remove every listener, stop the frame task and restore the element's own styles. */
  destroy(): void;
  readonly state: Tilt3DState;
}

/** Share of `maxTilt` used for the keyboard-focus pose. */
export const FOCUS_POSE_RATIO = 0.35;
export const STATE_ATTRIBUTE = "data-neshel-tilt";

interface Pose {
  rotateX: number;
  rotateY: number;
  scale: number;
}

const REST: Pose = { rotateX: 0, rotateY: 0, scale: 1 };
const clamp = (value: number) => Math.min(1, Math.max(-1, value));

function matchesFocusVisible(element: Element): boolean {
  try {
    return element.matches(":focus-visible");
  } catch {
    return true; // engines without :focus-visible: treat focus as keyboard focus
  }
}

function setupTilt3D(
  context: EffectContext<ResolvedTilt3DOptions>,
): EffectInstance<ResolvedTilt3DOptions> {
  const element = context.element as HTMLElement;
  let o = context.options;
  const scheduler = context.scheduler;
  const layer = context.channels.transform;
  const springs: Record<keyof Pose, SpringState> = {
    rotateX: { value: 0, velocity: 0 },
    rotateY: { value: 0, velocity: 0 },
    scale: { value: 1, velocity: 0 },
  };
  let pointer: { x: number; y: number } | undefined; // normalised, -1..1
  let focused = false;
  let box: { cx: number; cy: number; hw: number; hh: number } | undefined;
  let cancelTask: (() => void) | undefined;
  let state: Tilt3DState | undefined;
  let destroyed = false;

  const inactive = () => o.disabled || context.reduced;

  function setState(next: Tilt3DState): void {
    if (state === next) return;
    state = next;
    element.setAttribute(STATE_ATTRIBUTE, next);
  }

  function targetPose(): Pose {
    if (pointer) {
      const sign = o.reverse ? -1 : 1;
      return {
        rotateX: o.axis === "y" ? 0 : -sign * pointer.y * o.maxTilt,
        rotateY: o.axis === "x" ? 0 : sign * pointer.x * o.maxTilt,
        scale: o.scale,
      };
    }
    if (focused && o.focusTilt) {
      return {
        rotateX: FOCUS_POSE_RATIO * o.maxTilt,
        rotateY: -FOCUS_POSE_RATIO * o.maxTilt,
        scale: o.scale,
      };
    }
    return REST;
  }

  function refreshState(): void {
    if (o.disabled) setState("disabled");
    else if (inactive()) setState("reduced");
    else if (pointer) setState("pointer");
    else if (focused && o.focusTilt) setState("focus");
    else setState("rest");
  }

  /** Snap to rest without animation (reduced motion, disabled, destroy). */
  function snapToRest(): void {
    cancelTask?.();
    cancelTask = undefined;
    springs.rotateX = { value: 0, velocity: 0 };
    springs.rotateY = { value: 0, velocity: 0 };
    springs.scale = { value: 1, velocity: 0 };
    layer.clear();
  }

  function tick({ delta }: FrameInfo): boolean {
    const target = targetPose();
    let settled = true;
    for (const key of ["rotateX", "rotateY", "scale"] as const) {
      settled = stepSpring(springs[key], target[key], o.spring, delta) && settled;
    }
    const atRest =
      springs.rotateX.value === 0 && springs.rotateY.value === 0 && springs.scale.value === 1;
    if (atRest && settled) layer.clear();
    else {
      layer.set({
        perspective: o.perspective,
        rotateX: springs.rotateX.value,
        rotateY: springs.rotateY.value,
        scale: springs.scale.value,
      });
    }
    if (settled) cancelTask = undefined;
    return !settled;
  }

  function animate(): void {
    refreshState();
    if (inactive()) {
      snapToRest();
      return;
    }
    cancelTask ??= scheduler.schedule(tick, "update");
  }

  function measure(): void {
    const rect = element.getBoundingClientRect();
    // offsetWidth/offsetHeight ignore transforms, so the tilt never feeds back into the
    // measurement; the bounding-box centre is stable under rotations about the centre.
    const width = element.offsetWidth || rect.width;
    const height = element.offsetHeight || rect.height;
    box = {
      cx: rect.left + rect.width / 2,
      cy: rect.top + rect.height / 2,
      hw: Math.max(width / 2, 1),
      hh: Math.max(height / 2, 1),
    };
  }

  const invalidate = () => {
    box = undefined;
  };
  const accepts = (event: PointerEvent) => o.pointerTypes.has(event.pointerType || "mouse");
  const inside = (event: PointerEvent) => {
    const b = box as NonNullable<typeof box>;
    return Math.abs(event.clientX - b.cx) <= b.hw && Math.abs(event.clientY - b.cy) <= b.hh;
  };

  /*
   * Hit area = the untransformed box, not the projected shape. When the region under the pointer
   * recedes, the projected shape moves away from the pointer and the browser fires `pointerleave`
   * although the pointer is still over the card's layout box; following the pointer on `window`
   * until it leaves that box avoids the enter/leave oscillation of naive tilt effects
   * (research R6, found by the browser check).
   */
  let hovering = false;

  function track(event: PointerEvent): void {
    if (!hovering || !accepts(event)) return;
    if (!box) measure();
    if (!inside(event)) {
      endHover();
      return;
    }
    if (inactive()) return;
    const b = box as NonNullable<typeof box>;
    pointer = { x: clamp((event.clientX - b.cx) / b.hw), y: clamp((event.clientY - b.cy) / b.hh) };
    animate();
  }

  function startHover(event: PointerEvent): void {
    if (!accepts(event)) return;
    if (!hovering) {
      hovering = true;
      measure();
      window.addEventListener("pointermove", track, { passive: true });
      window.addEventListener("scroll", invalidate, { capture: true, passive: true });
      window.addEventListener("resize", invalidate, { passive: true });
      document.documentElement.addEventListener("pointerleave", endHover);
    }
    track(event);
  }

  function endHover(): void {
    if (!hovering) return;
    hovering = false;
    removeHoverListeners();
    box = undefined;
    if (!pointer) return;
    pointer = undefined;
    animate();
  }

  function removeHoverListeners(): void {
    window.removeEventListener("pointermove", track);
    window.removeEventListener("scroll", invalidate, { capture: true });
    window.removeEventListener("resize", invalidate);
    document.documentElement.removeEventListener("pointerleave", endHover);
  }

  /** Starts tracking when the element appears under a still pointer (no `pointerenter`). */
  function onElementMove(event: PointerEvent): void {
    if (!hovering) startHover(event);
  }

  function onPointerLeave(event: PointerEvent): void {
    if (!hovering) return;
    if (!box) measure();
    if (event.type === "pointercancel" || !inside(event)) endHover();
  }

  function onFocusIn(event: FocusEvent): void {
    const target = event.target instanceof Element ? event.target : element;
    const next = matchesFocusVisible(target);
    if (next === focused) return;
    focused = next;
    animate();
  }

  function onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget;
    if (next instanceof Node && element.contains(next)) return;
    if (!focused) return;
    focused = false;
    animate();
  }

  const unsubscribe = context.onReducedChange(() => animate());
  element.addEventListener("pointerenter", startHover);
  element.addEventListener("pointermove", onElementMove);
  element.addEventListener("pointerleave", onPointerLeave);
  element.addEventListener("pointercancel", onPointerLeave);
  element.addEventListener("focusin", onFocusIn);
  element.addEventListener("focusout", onFocusOut);
  refreshState();

  return {
    update(next) {
      if (destroyed) return;
      o = next;
      animate();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      unsubscribe();
      element.removeEventListener("pointerenter", startHover);
      element.removeEventListener("pointermove", onElementMove);
      element.removeEventListener("pointerleave", onPointerLeave);
      element.removeEventListener("pointercancel", onPointerLeave);
      element.removeEventListener("focusin", onFocusIn);
      element.removeEventListener("focusout", onFocusOut);
      hovering = false;
      removeHoverListeners();
      snapToRest();
      element.removeAttribute(STATE_ATTRIBUTE);
    },
  };
}

/** The Tilt3D definition (`hover/tilt-3d`): one composable `transform` layer, no exclusive channel. */
export const tilt3D = /* @__PURE__ */ defineEffect<Tilt3DOptions, ResolvedTilt3DOptions>({
  id: "hover/tilt-3d",
  family: "hover",
  channels: [{ channel: "transform", mode: "compose" }],
  priority: 0,
  reducedMotion: "off",
  resolve: (options) => resolveTilt3DOptions(options),
  policy: (options) => options.reducedMotion,
  setup: setupTilt3D,
});

/** Imperative controller: `attachEffect(element, tilt3D, options)` with a Tilt3D-shaped handle. */
export function createTilt3D(element: HTMLElement, options: Tilt3DOptions = {}): Tilt3DController {
  const handle = attachEffect(element, tilt3D, options);
  return {
    update: (next = {}) => handle.update(next),
    destroy: () => handle.destroy(),
    get state() {
      return (element.getAttribute(STATE_ATTRIBUTE) as Tilt3DState | null) ?? "rest";
    },
  };
}
