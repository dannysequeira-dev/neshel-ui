/**
 * Gesture recogniser (Phase 012; contracts/gesture-engine.md §3). Subscribes to the element's shared pointer
 * session (no DOM listeners of its own), follows one pointer (drag) or up to two (transform gestures), and
 * reports one reused state object through start/move/end/cancel callbacks. 1 ↔ 2 pointer transitions re-base
 * the centroid, distance and angle at their current values (offset, scale and rotation accumulate), so adding
 * or lifting a finger never jumps. No layout read here: callbacks that need geometry measure once on start.
 */
import {
  type PointerSession,
  type SessionPointer,
  subscribePointerSession,
  type TouchToken,
} from "../../core/pointer-session.js";
import { createVelocityTracker } from "./physics.js";

export type GestureAxis = "x" | "y" | "both";
export type PointerKind = "mouse" | "pen" | "touch";
export const POINTER_KINDS: readonly PointerKind[] = ["mouse", "pen", "touch"];

export interface Vec {
  x: number;
  y: number;
}

export interface GestureState {
  /** Movement since the gesture started, including scroll compensation (px, client axes). */
  readonly offset: Vec;
  /** Movement since the previous callback. */
  readonly delta: Vec;
  /** px/s (research R4). */
  readonly velocity: Vec;
  /** px/s² (diagnostic). */
  readonly acceleration: Vec;
  /** Two pointers: distance ratio since start (accumulated across re-bases); 1 otherwise. */
  readonly scale: number;
  /** Two pointers: angle change in degrees since start (accumulated); 0 otherwise. */
  readonly rotation: number;
  /** Centroid of the active pointers (client coordinates). */
  readonly origin: Vec;
  readonly pointers: number;
  readonly pointerType: string;
  readonly event: PointerEvent | undefined;
}

export interface GestureOptions {
  /** 1 = drag-like (default); 2 = transform gesture (also follows its 1-pointer phase). */
  pointers?: 1 | 2;
  /** Required direction before activation (default `"both"`): a vertical swipe never starts an x drag. */
  axis?: GestureAxis;
  /** px before activation (default 3; 0 = on press). Two pointers activate a transform gesture at once. */
  threshold?: number;
  pointerTypes?: readonly string[];
  /** Exclusive gestures never share a pointer with another exclusive gesture (default true). */
  exclusive?: boolean;
  /** Touch gestures left to the browser on this element (`touch-action` contribution). */
  touchAction?: readonly TouchToken[];
  /** Call before activation to veto it (e.g. a handle-only reorder). */
  accept?(event: PointerEvent | undefined, pointer: SessionPointer): boolean;
  onPress?(state: GestureState): void;
  onStart?(state: GestureState): void;
  onMove?(state: GestureState): void;
  onEnd?(state: GestureState): void;
  onCancel?(state: GestureState): void;
  /** Released while still pending (no movement beyond the threshold). */
  onTap?(state: GestureState): void;
}

export type GesturePhase = "idle" | "pending" | "active";

export interface GestureHandle {
  readonly phase: GesturePhase;
  readonly session: PointerSession;
  /** Replace options (live); `touchAction` changes apply at once. */
  setOptions(options: GestureOptions): void;
  /** Abort the current gesture (`onCancel` when active); its pointers are ignored until released. */
  cancel(): void;
  destroy(): void;
}

const DEG = 180 / Math.PI;
const wrap = (deg: number) => ((((deg + 180) % 360) + 360) % 360) - 180;
const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

export function createGesture(element: HTMLElement, initial: GestureOptions): GestureHandle {
  let options = initial;
  let phase: GesturePhase = "idle";
  const owner = {};
  const tracked = new Map<number, SessionPointer>();
  const ignored = new Set<number>();
  const tracker = createVelocityTracker();
  // Base of the current pointer set (re-based on every change of the set).
  let baseCentroid: Vec = { x: 0, y: 0 };
  let baseScroll: Vec = { x: 0, y: 0 };
  let baseDistance = 0;
  let baseAngle = 0;
  let accOffset: Vec = { x: 0, y: 0 };
  let accScale = 1;
  let accRotation = 0;
  const state = {
    offset: { x: 0, y: 0 },
    delta: { x: 0, y: 0 },
    velocity: { x: 0, y: 0 },
    acceleration: { x: 0, y: 0 },
    scale: 1,
    rotation: 0,
    origin: { x: 0, y: 0 },
    pointers: 0,
    pointerType: "mouse",
    event: undefined as PointerEvent | undefined,
  };

  const [session, unsubscribe] = subscribePointerSession(element, onPointer);

  function centroid(): Vec {
    let x = 0;
    let y = 0;
    for (const p of tracked.values()) {
      x += p.x;
      y += p.y;
    }
    const n = Math.max(1, tracked.size);
    return { x: x / n, y: y / n };
  }
  function pair(): [SessionPointer, SessionPointer] | undefined {
    if (tracked.size < 2) return undefined;
    const [a, b] = [...tracked.values()];
    return [a as SessionPointer, b as SessionPointer];
  }
  function rebase(): void {
    accOffset = { x: state.offset.x, y: state.offset.y };
    accScale = state.scale;
    accRotation = state.rotation;
    baseCentroid = centroid();
    baseScroll = { x: session.scroll.x, y: session.scroll.y };
    const p = pair();
    if (p) {
      baseDistance = Math.hypot(p[1].x - p[0].x, p[1].y - p[0].y) || 1;
      baseAngle = Math.atan2(p[1].y - p[0].y, p[1].x - p[0].x) * DEG;
    }
  }
  function compute(event: PointerEvent | undefined): void {
    const c = centroid();
    const ox = accOffset.x + c.x - baseCentroid.x + session.scroll.x - baseScroll.x;
    const oy = accOffset.y + c.y - baseCentroid.y + session.scroll.y - baseScroll.y;
    state.delta.x = ox - state.offset.x;
    state.delta.y = oy - state.offset.y;
    state.offset.x = ox;
    state.offset.y = oy;
    state.origin.x = c.x;
    state.origin.y = c.y;
    const p = pair();
    if (p) {
      const distance = Math.hypot(p[1].x - p[0].x, p[1].y - p[0].y) || 1;
      const angle = Math.atan2(p[1].y - p[0].y, p[1].x - p[0].x) * DEG;
      state.scale = accScale * (distance / baseDistance);
      state.rotation = accRotation + wrap(angle - baseAngle);
    }
    state.pointers = tracked.size;
    state.event = event;
    const t = now();
    tracker.add(t, ox, oy);
    const v = tracker.velocity();
    state.velocity.x = v.x;
    state.velocity.y = v.y;
    const a = tracker.acceleration();
    state.acceleration.x = a.x;
    state.acceleration.y = a.y;
  }
  function reset(): void {
    tracked.clear();
    tracker.reset();
    accOffset = { x: 0, y: 0 };
    accScale = 1;
    accRotation = 0;
    state.offset.x = state.offset.y = state.delta.x = state.delta.y = 0;
    state.velocity.x = state.velocity.y = state.acceleration.x = state.acceleration.y = 0;
    state.scale = 1;
    state.rotation = 0;
    state.pointers = 0;
  }

  function passedThreshold(): "yes" | "no" | "wrong-axis" {
    if ((options.pointers ?? 1) === 2 && tracked.size >= 2) return "yes";
    const threshold = options.threshold ?? 3;
    const x = Math.abs(state.offset.x);
    const y = Math.abs(state.offset.y);
    const axis = options.axis ?? "both";
    if (axis === "both") return Math.hypot(x, y) > threshold ? "yes" : "no";
    const main = axis === "x" ? x : y;
    const cross = axis === "x" ? y : x;
    if (main > threshold && main >= cross) return "yes";
    if (cross > Math.max(threshold, 6) && cross > main) return "wrong-axis";
    return "no";
  }
  function activate(): boolean {
    if ((options.exclusive ?? true) && !session.claim(tracked.keys(), owner)) return false;
    phase = "active";
    options.onStart?.(state);
    return true;
  }
  function abandon(): void {
    for (const id of tracked.keys()) ignored.add(id);
    phase = "idle";
    reset();
  }

  function onPointer(
    type: "down" | "move" | "up" | "cancel",
    pointer: SessionPointer,
    event: PointerEvent | undefined,
  ): void {
    if (type === "down") {
      if (ignored.has(pointer.id)) return;
      const types = options.pointerTypes;
      if (types && !types.includes(pointer.type)) return;
      const max = options.pointers ?? 1;
      if (tracked.size >= max) return;
      if ((options.exclusive ?? true) && session.isClaimed(pointer.id, owner)) return;
      if (options.accept && !options.accept(event, pointer)) return;
      if (tracked.size === 0) {
        reset();
        state.pointerType = pointer.type;
      } else {
        compute(event); // bring the state up to date before re-basing
      }
      tracked.set(pointer.id, pointer);
      session.capture(pointer.id);
      rebase();
      compute(event);
      if (phase === "idle") {
        phase = "pending";
        options.onPress?.(state);
        if ((options.threshold ?? 3) === 0 && !activate()) abandon();
      } else if (phase === "pending" && passedThreshold() === "yes") {
        if (!activate()) abandon();
      } else if (phase === "active") {
        if ((options.exclusive ?? true) && !session.claim([pointer.id], owner)) {
          tracked.delete(pointer.id);
          rebase();
        }
      }
      return;
    }
    if (!tracked.has(pointer.id)) {
      if (type !== "move") ignored.delete(pointer.id);
      return;
    }
    if (type === "move") {
      compute(event);
      if (phase === "pending") {
        const passed = passedThreshold();
        if (passed === "yes") {
          if (!activate()) abandon();
          else options.onMove?.(state);
        } else if (passed === "wrong-axis") abandon();
        return;
      }
      if (phase === "active") options.onMove?.(state);
      return;
    }
    // up / cancel
    compute(event);
    tracked.delete(pointer.id);
    if (type === "cancel") {
      const wasActive = phase === "active";
      for (const id of tracked.keys()) ignored.add(id);
      phase = "idle";
      if (wasActive) options.onCancel?.(state);
      reset();
      return;
    }
    if (tracked.size > 0) {
      rebase();
      return;
    }
    const was = phase;
    phase = "idle";
    if (was === "active") {
      // Velocity at release (stale samples → 0, research R4).
      const v = tracker.velocity(now());
      state.velocity.x = v.x;
      state.velocity.y = v.y;
      options.onEnd?.(state);
    } else if (was === "pending") options.onTap?.(state);
    reset();
  }

  session.setTouchAction(owner, options.touchAction);

  return {
    get phase() {
      return phase;
    },
    session,
    setOptions(next) {
      const touch = next.touchAction?.join(" ") !== options.touchAction?.join(" ");
      options = next;
      if (touch) session.setTouchAction(owner, options.touchAction);
    },
    cancel() {
      if (phase === "idle") return;
      const wasActive = phase === "active";
      abandon();
      if (wasActive) options.onCancel?.(state);
    },
    destroy() {
      if (phase !== "idle") {
        const wasActive = phase === "active";
        phase = "idle";
        if (wasActive) options.onCancel?.(state);
      }
      reset();
      ignored.clear();
      session.setTouchAction(owner, undefined);
      unsubscribe();
    },
  };
}
