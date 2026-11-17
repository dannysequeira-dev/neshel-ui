/**
 * Pointer tracking with a box-based hit area (Phase 010, internal; the Tilt3D technique of research
 * 008 R6, shared by hover effects). The box is measured once when the pointer enters (rect centre plus
 * transform-free `offsetWidth/Height`), invalidated on scroll and resize, and the pointer is followed
 * on `window` until it leaves that box — so an element that moves under the pointer (lift, magnetic,
 * tilt) never oscillates between enter and leave. No layout read per pointer move.
 */

export interface PointerSample {
  /** Normalised position in the box, -1 (left/top) … 1 (right/bottom). */
  readonly x: number;
  readonly y: number;
  /** Position in px from the box's left/top edge. */
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

export interface PointerTrackOptions {
  pointerTypes: ReadonlySet<string>;
  /** Extra px around the box that still counts as inside (default 0). */
  margin?: number;
  onMove(sample: PointerSample): void;
  onLeave(): void;
}

const clampUnit = (value: number) => Math.min(1, Math.max(-1, value));

export function trackPointer(element: HTMLElement, options: PointerTrackOptions): () => void {
  let box: { cx: number; cy: number; hw: number; hh: number } | undefined;
  let hovering = false;
  const margin = options.margin ?? 0;

  function measure(): NonNullable<typeof box> {
    const rect = element.getBoundingClientRect();
    const width = element.offsetWidth || rect.width;
    const height = element.offsetHeight || rect.height;
    box = {
      cx: rect.left + rect.width / 2,
      cy: rect.top + rect.height / 2,
      hw: Math.max(width / 2, 1),
      hh: Math.max(height / 2, 1),
    };
    return box;
  }
  const invalidate = () => {
    box = undefined;
  };
  const accepts = (event: PointerEvent) => options.pointerTypes.has(event.pointerType || "mouse");
  const inside = (event: PointerEvent, b: NonNullable<typeof box>) =>
    Math.abs(event.clientX - b.cx) <= b.hw + margin &&
    Math.abs(event.clientY - b.cy) <= b.hh + margin;

  function move(event: PointerEvent): void {
    if (!hovering || !accepts(event)) return;
    const b = box ?? measure();
    if (!inside(event, b)) {
      end();
      return;
    }
    options.onMove({
      x: clampUnit((event.clientX - b.cx) / b.hw),
      y: clampUnit((event.clientY - b.cy) / b.hh),
      left: event.clientX - (b.cx - b.hw),
      top: event.clientY - (b.cy - b.hh),
      width: b.hw * 2,
      height: b.hh * 2,
    });
  }
  function start(event: PointerEvent): void {
    if (!accepts(event)) return;
    if (!hovering) {
      hovering = true;
      measure();
      window.addEventListener("pointermove", move, { passive: true });
      window.addEventListener("scroll", invalidate, { capture: true, passive: true });
      window.addEventListener("resize", invalidate, { passive: true });
      document.documentElement.addEventListener("pointerleave", end);
    }
    move(event);
  }
  function removeWindowListeners(): void {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("scroll", invalidate, { capture: true });
    window.removeEventListener("resize", invalidate);
    document.documentElement.removeEventListener("pointerleave", end);
  }
  function end(): void {
    if (!hovering) return;
    hovering = false;
    removeWindowListeners();
    box = undefined;
    options.onLeave();
  }
  /** The element appeared under a still pointer (no `pointerenter`). */
  function onElementMove(event: PointerEvent): void {
    if (!hovering) start(event);
  }
  function onElementLeave(event: PointerEvent): void {
    if (!hovering) return;
    if (event.type === "pointercancel" || !inside(event, box ?? measure())) end();
  }

  element.addEventListener("pointerenter", start);
  element.addEventListener("pointermove", onElementMove);
  element.addEventListener("pointerleave", onElementLeave);
  element.addEventListener("pointercancel", onElementLeave);
  return () => {
    element.removeEventListener("pointerenter", start);
    element.removeEventListener("pointermove", onElementMove);
    element.removeEventListener("pointerleave", onElementLeave);
    element.removeEventListener("pointercancel", onElementLeave);
    hovering = false;
    removeWindowListeners();
  };
}
