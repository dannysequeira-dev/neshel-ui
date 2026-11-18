/**
 * Pointer session (Phase 012, internal; contracts/gesture-engine.md §2, ADR 0027 §3).
 *
 * One session per element, shared by every gesture attached to it (and by P11 long press): one set of DOM
 * listeners whatever the number of subscribers, pointer capture, a map of the pointers that went down on the
 * element, scroll compensation while a pointer is down, page-wide pointer claims for competing gestures and
 * the element's composed `touch-action`. The session never reads layout; while no pointer is down only
 * `pointerdown` and `lostpointercapture` listeners exist on the element.
 */

import { releaseChannels, requestChannels, setExclusive } from "./arbiter.js";
import { type Claim, getMotionHost } from "./host.js";
import { isDisabled } from "./interaction.js";

export interface SessionPointer {
  readonly id: number;
  readonly type: string;
  /** Current client position. */
  x: number;
  y: number;
  readonly startX: number;
  readonly startY: number;
  /** `performance.now()`-like timestamp (ms) of the last event. */
  time: number;
}

export type SessionEventType = "down" | "move" | "up" | "cancel";

export type SessionListener = (
  type: SessionEventType,
  pointer: SessionPointer,
  event: PointerEvent | undefined,
) => void;

export interface PointerSession {
  readonly element: HTMLElement;
  readonly pointers: ReadonlyMap<number, SessionPointer>;
  /** Scroll accumulated since the first pointer went down (px; add to pointer deltas). */
  readonly scroll: { readonly x: number; readonly y: number };
  /** Ask the browser to keep sending this pointer's events to the element. */
  capture(id: number): void;
  /** Claim pointers for an exclusive owner; `false` (nothing claimed) when one is owned by another. */
  claim(ids: Iterable<number>, owner: object): boolean;
  isClaimed(id: number, owner?: object): boolean;
  /** Contribute the touch gestures this owner leaves to the browser (`undefined` removes it). */
  setTouchAction(owner: object, allowed: readonly TouchToken[] | undefined): void;
}

export type TouchToken = "pan-x" | "pan-y" | "pinch-zoom";
const TOKENS: readonly TouchToken[] = ["pan-x", "pan-y", "pinch-zoom"];

interface SessionRecord extends PointerSession {
  listeners: Set<SessionListener>;
  dispose(): void;
}

const sessions = new WeakMap<Element, SessionRecord>();
/** Page-wide pointer claims (pointerId → owner). */
const claims = new Map<number, object>();
let live = 0;

/** Diagnostics: sessions alive and claims held (getGestureDebugInfo). */
export const sessionStats = () => ({ sessions: live, claims: claims.size });

const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

/**
 * Subscribe to the element's session (created on first use, disposed with the last subscriber).
 * Returns the session and the unsubscribe function.
 */
export function subscribePointerSession(
  element: HTMLElement,
  listener: SessionListener,
): [PointerSession, () => void] {
  let record = sessions.get(element);
  if (!record) {
    record = createSession(element);
    sessions.set(element, record);
  }
  const session = record;
  session.listeners.add(listener);
  let done = false;
  return [
    session,
    () => {
      if (done) return;
      done = true;
      session.listeners.delete(listener);
      if (session.listeners.size === 0) {
        session.dispose();
        if (sessions.get(element) === session) sessions.delete(element);
      }
    },
  ];
}

function createSession(element: HTMLElement): SessionRecord {
  live++;
  const listeners = new Set<SessionListener>();
  const pointers = new Map<number, SessionPointer>();
  const scroll = { x: 0, y: 0 };
  const scrollBase = new Map<EventTarget, { x: number; y: number }>();
  const touch = new Map<object, readonly TouchToken[]>();
  let windowBound = false;
  let touchClaim: Claim | undefined;

  const emit = (type: SessionEventType, pointer: SessionPointer, event?: PointerEvent) => {
    for (const listener of [...listeners]) listener(type, pointer, event);
  };

  function scrollOf(target: EventTarget): { x: number; y: number } {
    if (target === document || target === window || target === document.documentElement) {
      return { x: window.scrollX || 0, y: window.scrollY || 0 };
    }
    const node = target as Element;
    return { x: node.scrollLeft || 0, y: node.scrollTop || 0 };
  }
  function onScroll(event: Event): void {
    const target = event.target === document.documentElement ? document : event.target;
    if (!target) return;
    const base = scrollBase.get(target);
    if (!base) return; // a scroller that does not contain the element
    const next = scrollOf(target);
    scroll.x += next.x - base.x;
    scroll.y += next.y - base.y;
    base.x = next.x;
    base.y = next.y;
  }

  function bindWindow(): void {
    if (windowBound) return;
    windowBound = true;
    scroll.x = scroll.y = 0;
    scrollBase.clear();
    // Scroll positions of the document and of every ancestor (read once per gesture; never layout).
    scrollBase.set(document, scrollOf(document));
    for (let node = element.parentElement; node; node = node.parentElement) {
      if (node !== document.documentElement && node !== document.body) {
        scrollBase.set(node, scrollOf(node));
      }
    }
    window.addEventListener("pointermove", onMove, true);
    window.addEventListener("pointerup", onUp, true);
    window.addEventListener("pointercancel", onCancel, true);
    window.addEventListener("scroll", onScroll, { capture: true, passive: true });
    document.addEventListener("visibilitychange", onVisibility);
  }
  function unbindWindow(): void {
    if (!windowBound) return;
    windowBound = false;
    window.removeEventListener("pointermove", onMove, true);
    window.removeEventListener("pointerup", onUp, true);
    window.removeEventListener("pointercancel", onCancel, true);
    window.removeEventListener("scroll", onScroll, { capture: true });
    document.removeEventListener("visibilitychange", onVisibility);
    scrollBase.clear();
  }

  function onDown(event: PointerEvent): void {
    const type = event.pointerType || "mouse";
    if (type !== "touch" && event.button !== 0) return;
    if (pointers.has(event.pointerId) || isDisabled(element)) return;
    const pointer: SessionPointer = {
      id: event.pointerId,
      type,
      x: event.clientX,
      y: event.clientY,
      startX: event.clientX,
      startY: event.clientY,
      time: now(),
    };
    if (pointers.size === 0) bindWindow();
    pointers.set(pointer.id, pointer);
    emit("down", pointer, event);
  }
  function onMove(event: PointerEvent): void {
    const pointer = pointers.get(event.pointerId);
    if (!pointer) return;
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.time = now();
    emit("move", pointer, event);
  }
  function end(id: number, type: "up" | "cancel", event?: PointerEvent): void {
    const pointer = pointers.get(id);
    if (!pointer) return;
    if (event) {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      pointer.time = now();
    }
    pointers.delete(id);
    claims.delete(id);
    emit(type, pointer, event);
    if (pointers.size === 0) unbindWindow();
  }
  const onUp = (event: PointerEvent) => end(event.pointerId, "up", event);
  const onCancel = (event: PointerEvent) => end(event.pointerId, "cancel", event);
  // Capture lost before `pointerup` (element removed, another capture): a cancel (gesture-engine §2).
  const onLost = (event: PointerEvent) => end(event.pointerId, "cancel");
  function onVisibility(): void {
    if (!document.hidden) return;
    for (const id of [...pointers.keys()]) end(id, "cancel");
  }

  element.addEventListener("pointerdown", onDown);
  element.addEventListener("lostpointercapture", onLost);

  function writeTouchAction(): void {
    const host = getMotionHost(element);
    if (touch.size === 0) {
      if (touchClaim) releaseChannels(host, touchClaim);
      touchClaim = undefined;
      return;
    }
    let allowed = TOKENS;
    for (const tokens of touch.values())
      allowed = allowed.filter((token) => tokens.includes(token));
    if (!touchClaim) {
      touchClaim = {
        id: "gestures/touch-action",
        priority: 0,
        channels: ["touch-action" as never],
        onGrant: () => writeTouchAction(),
        onRevoke: () => {},
      };
      requestChannels(host, touchClaim, "silent");
    }
    setExclusive(
      host,
      touchClaim,
      "touch-action" as never,
      allowed.length ? allowed.join(" ") : "none",
    );
  }

  return {
    element,
    pointers,
    scroll,
    listeners,
    capture(id) {
      try {
        element.setPointerCapture?.(id);
      } catch {
        // Synthetic pointers (tests, assistive tooling) cannot be captured; window listeners still see them.
      }
    },
    claim(ids, owner) {
      const list = [...ids];
      if (list.some((id) => (claims.get(id) ?? owner) !== owner)) return false;
      for (const id of list) claims.set(id, owner);
      return true;
    },
    isClaimed(id, owner) {
      const current = claims.get(id);
      return current !== undefined && current !== owner;
    },
    setTouchAction(owner, allowed) {
      if (allowed) touch.set(owner, allowed);
      else if (!touch.delete(owner)) return;
      writeTouchAction();
    },
    dispose() {
      live--;
      for (const id of [...pointers.keys()]) end(id, "cancel");
      unbindWindow();
      element.removeEventListener("pointerdown", onDown);
      element.removeEventListener("lostpointercapture", onLost);
      touch.clear();
      writeTouchAction();
    },
  };
}
