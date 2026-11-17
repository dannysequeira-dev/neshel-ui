/**
 * G10 `reorder` — drag-to-reorder with a keyboard alternative (catalogue §4; contracts/api-012.md §1,
 * accessibility-012.md §2–§3). Attaches to the list element; items are its children marked
 * `data-neshel-reorder-item`, drag starts on a `data-neshel-reorder-handle` inside an item (any pointer) or on
 * the item itself (mouse/pen only, when it has no handle). The package never reorders the DOM: `onReorder(from,
 * to)` asks the consumer to change its order; after its re-render, every item settles from where it is shown
 * with the shared FLIP animator. Boxes are read once at drag start and once per committed move.
 */

import type { SpringPreset } from "../core/defaults.js";
import { type ChannelClaim, defineEffect } from "../core/effect.js";
import { createFlipAnimator, type FlipAnimator } from "../core/flip.js";
import { getMotionHost } from "../core/host.js";
import { type Box, measureBox } from "../core/layout-box.js";
import type { ReducedMotion } from "../core/reduced-motion.js";
import type { SpringOptions } from "../core/spring.js";
import { addToken, FX_ACTIVE_ATTRIBUTE, toggleToken } from "../core/tokens.js";
import { validator } from "../core/validate.js";
import {
  createGesture,
  type GestureState,
  POINTER_KINDS,
  type PointerKind,
} from "./engine/gesture.js";

const ITEM = "[data-neshel-reorder-item]";
const HANDLE = "[data-neshel-reorder-handle]";

export interface ReorderAnnouncements {
  grab(label: string, position: number, count: number): string;
  move(label: string, position: number, count: number): string;
  drop(label: string, position: number, count: number): string;
  cancel(label: string, position: number, count: number): string;
}

const DEFAULT_ANNOUNCEMENTS: ReorderAnnouncements = {
  grab: (label, position, count) =>
    `Grabbed ${label}. Position ${position} of ${count}. Use the arrow keys to move, Space to drop, Escape to cancel.`,
  move: (label, position, count) => `Moved ${label} to position ${position} of ${count}.`,
  drop: (label, position, count) => `Dropped ${label} at position ${position} of ${count}.`,
  cancel: (label, position, count) =>
    `Reorder cancelled. ${label} returned to position ${position} of ${count}.`,
};

export interface ReorderOptions {
  /** List direction (default `"y"`). */
  axis?: "x" | "y";
  /** Move the item at `from` to `to` in the consumer's order (required for the list to change). */
  onReorder?: (from: number, to: number) => void;
  /** Announce a message (default: a shared polite live region; `<Reorder>` passes its own). */
  announce?: (message: string) => void;
  /** Override the English announcements. */
  announcements?: Partial<ReorderAnnouncements>;
  /** Pointer kinds that may drag (default mouse, pen and touch; touch always needs a handle). */
  pointerTypes?: readonly PointerKind[];
  /** Spring of shifts and settling (default 420/36). */
  spring?: SpringOptions | SpringPreset;
  /** Reduced motion: shifts and settling jump (default `"user"`). */
  reducedMotion?: ReducedMotion;
  disabled?: boolean;
}

interface ResolvedReorder {
  axis: "x" | "y";
  onReorder: ((from: number, to: number) => void) | undefined;
  announce: ((message: string) => void) | undefined;
  announcements: ReorderAnnouncements;
  pointerTypes: readonly PointerKind[];
  spring: Required<SpringOptions>;
  reducedMotion: ReducedMotion;
  disabled: boolean;
}

const reorderV = /* @__PURE__ */ validator("reorder");
const movers = new WeakMap<Element, (item: HTMLElement, step: number) => unknown>();

/**
 * Move `item` of a list with an attached `reorder` effect by `step` positions (move up/down buttons): asks the
 * consumer through `onReorder`, announces the result and settles the items. No-op without the effect.
 */
export function reorderMove(list: Element, item: HTMLElement, step: number): void {
  movers.get(list)?.(item, step);
}
// The effect writes transform layers of its items (through each item's motion host), not of the list.
const NONE: readonly ChannelClaim[] = [];

/* Shared polite live region for framework-free use (created lazily, removed with the last user). */
let region: HTMLElement | undefined;
let regionUsers = 0;
function defaultAnnounce(message: string): void {
  if (!region) return;
  region.textContent = "";
  // A new text node after clearing makes screen readers announce repeated messages too.
  region.textContent = message;
}
function acquireRegion(): () => void {
  regionUsers++;
  if (!region && typeof document !== "undefined") {
    region = document.createElement("div");
    region.setAttribute("aria-live", "polite");
    region.setAttribute("role", "status");
    region.className = "neshel-sr-only";
    region.style.cssText =
      "position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0";
    document.body.append(region);
  }
  let done = false;
  return () => {
    if (done) return;
    done = true;
    regionUsers--;
    if (regionUsers === 0) {
      region?.remove();
      region = undefined;
    }
  };
}

export const reorder = /* @__PURE__ */ defineEffect<ReorderOptions, ResolvedReorder>({
  id: "physics/reorder",
  family: "physics",
  channels: NONE,
  reducedMotion: "instant",
  resolve(input) {
    const o = reorderV.options(input);
    const announcements = { ...DEFAULT_ANNOUNCEMENTS };
    if (o.announcements !== undefined && o.announcements !== null) {
      for (const key of Object.keys(DEFAULT_ANNOUNCEMENTS) as Array<keyof ReorderAnnouncements>) {
        const fn = reorderV.callback<ReorderAnnouncements[typeof key]>(
          `announcements.${key}`,
          (o.announcements as Partial<ReorderAnnouncements>)[key],
        );
        if (fn) announcements[key] = fn;
      }
    }
    let pointerTypes: readonly PointerKind[] = POINTER_KINDS;
    if (o.pointerTypes !== undefined) {
      if (
        !Array.isArray(o.pointerTypes) ||
        o.pointerTypes.some((t) => !POINTER_KINDS.includes(t))
      ) {
        reorderV.fail(`invalid "pointerTypes"; expected an array of: "mouse", "pen", "touch".`);
      }
      pointerTypes = o.pointerTypes;
    }
    return {
      axis: reorderV.oneOf("axis", o.axis, ["x", "y"] as const, "y"),
      onReorder: reorderV.callback("onReorder", o.onReorder),
      announce: reorderV.callback("announce", o.announce),
      announcements,
      pointerTypes,
      spring: reorderV.spring(o.spring, { stiffness: 420, damping: 36 }),
      reducedMotion: reorderV.reducedMotion(o.reducedMotion),
      disabled: reorderV.flag("disabled", o.disabled, false),
    };
  },
  policy: (o) => o.reducedMotion,
  setup(context) {
    const list = context.element as HTMLElement;
    const releaseRegion = acquireRegion();
    const animators = new Map<Element, { animator: FlipAnimator; key: symbol }>();
    const activeToken = toggleToken(list, FX_ACTIVE_ATTRIBUTE, "reorder");
    const items = () => [...list.children].filter((child) => child.matches(ITEM)) as HTMLElement[];
    const say = (message: string) => (context.options.announce ?? defaultAnnounce)(message);
    const labelOf = (item: Element) =>
      item.getAttribute("data-neshel-reorder-label") ??
      (item.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 80);
    const transition = () => ({ type: "spring" as const, spring: context.options.spring });

    function animatorOf(item: Element): FlipAnimator {
      let entry = animators.get(item);
      if (!entry) {
        const key = Symbol("physics/reorder");
        const host = getMotionHost(item as HTMLElement);
        const animator = createFlipAnimator(context.scheduler, transition(), (layer) =>
          host.setLayer(key, layer),
        );
        entry = { animator, key };
        animators.set(item, entry);
      }
      entry.animator.setTransition(transition());
      return entry.animator;
    }
    /**
     * Focus to keep on a moved item: browsers blur an element that is moved in the DOM (React moves the node
     * when the order changes), so it is restored after the consumer's update (accessibility-012 §3).
     */
    let restoreFocus: HTMLElement | undefined;
    const restore = () => {
      const target = restoreFocus;
      if (target?.isConnected && document.activeElement !== target)
        target.focus({ preventScroll: true });
    };
    /** After the consumer's re-render, settle every item from where it is shown (FLIP). */
    function settle(first: Map<Element, Box>): void {
      context.scheduler.schedule(() => {
        restore();
        restoreFocus = undefined;
        for (const [item, box] of first) {
          const entry = animators.get(item);
          if (!entry) continue;
          if (!item.isConnected || context.reduced) {
            entry.animator.stop();
            continue;
          }
          entry.animator.from(box, measureBox(item));
        }
      }, "read");
    }
    const boxesOf = (list: readonly Element[]) =>
      new Map(list.map((item) => [item, measureBox(item)]));

    /* ---------------------------------------------------------------- pointer drag */
    let drag:
      | {
          item: HTMLElement;
          from: number;
          to: number;
          order: HTMLElement[];
          boxes: Map<Element, Box>;
          shift: number;
        }
      | undefined;
    let removeDragging: (() => void) | undefined;
    const start = (box: Box) => (context.options.axis === "x" ? box.x : box.y);
    const size = (box: Box) => (context.options.axis === "x" ? box.width : box.height);

    function candidate(
      event: PointerEvent | undefined,
      pointerType: string,
    ): HTMLElement | undefined {
      const target = event?.target as Element | null;
      const item = target?.closest?.(ITEM) as HTMLElement | null;
      if (!item || item.parentElement !== list) return undefined;
      if (item.querySelector(HANDLE)) return target?.closest(HANDLE) ? item : undefined;
      return pointerType === "touch" ? undefined : item;
    }
    let pressed: HTMLElement | undefined;
    const handlers = {
      onStart() {
        const item = pressed;
        if (!item) return;
        const order = items();
        const from = order.indexOf(item);
        if (from === -1) return;
        const boxes = boxesOf(order);
        const next = order[from + 1];
        const previous = order[from - 1];
        const own = boxes.get(item) as Box;
        // Distance a sibling moves to fill the dragged item's slot (its size plus the list gap).
        const gap = next
          ? start(boxes.get(next) as Box) - (start(own) + size(own))
          : previous
            ? start(own) - (start(boxes.get(previous) as Box) + size(boxes.get(previous) as Box))
            : 0;
        drag = { item, from, to: from, order, boxes, shift: size(own) + Math.max(0, gap) };
        activeToken(true);
        removeDragging?.();
        item.setAttribute("data-neshel-reorder-state", "dragging");
        removeDragging = () => item.removeAttribute("data-neshel-reorder-state");
      },
      onMove(state: GestureState) {
        if (!drag) return;
        const { item, from, order, boxes, shift } = drag;
        const own = boxes.get(item) as Box;
        const firstBox = boxes.get(order[0] as Element) as Box;
        const lastBox = boxes.get(order[order.length - 1] as Element) as Box;
        const raw = context.options.axis === "x" ? state.offset.x : state.offset.y;
        const offset = Math.min(
          start(lastBox) + size(lastBox) - (start(own) + size(own)),
          Math.max(start(firstBox) - start(own), raw),
        );
        animatorOf(item).jump(context.options.axis === "x" ? { x: offset } : { y: offset });
        const center = start(own) + size(own) / 2 + offset;
        let to = from;
        for (let i = 0; i < order.length; i++) {
          if (i === from) continue;
          const box = boxes.get(order[i] as Element) as Box;
          const mid = start(box) + size(box) / 2;
          // Reaching a sibling's centre takes its slot (the clamp stops exactly there at the ends).
          if (i > from && center >= mid) to = Math.max(to, i);
          if (i < from && center <= mid) to = Math.min(to, i);
        }
        drag.to = to;
        order.forEach((sibling, i) => {
          if (sibling === item) return;
          let delta = 0;
          if (from < to && i > from && i <= to) delta = -shift;
          else if (from > to && i >= to && i < from) delta = shift;
          const animator = animatorOf(sibling);
          const target = context.options.axis === "x" ? { x: delta } : { y: delta };
          if (context.reduced) animator.jump(target);
          else animator.to(target);
        });
      },
      onEnd() {
        finishDrag(true);
      },
      onCancel() {
        finishDrag(false);
      },
    };
    const gestureOptions = () => ({
      axis: context.options.axis,
      threshold: 4,
      pointerTypes: context.options.pointerTypes,
      accept(event: PointerEvent | undefined, pointer: { type: string }) {
        if (context.options.disabled || keyboard) return false;
        pressed = candidate(event, pointer.type);
        return pressed !== undefined;
      },
      ...handlers,
    });
    const gesture = createGesture(list, gestureOptions());

    function finishDrag(commit: boolean): void {
      const current = drag;
      drag = undefined;
      removeDragging?.();
      removeDragging = undefined;
      activeToken(false);
      if (!current) return;
      const { item, from, to, order, boxes } = current;
      if (commit && from !== to) {
        context.options.onReorder?.(from, to);
        say(context.options.announcements.drop(labelOf(item), to + 1, order.length));
      }
      settle(boxes);
    }

    /* ---------------------------------------------------------------- keyboard */
    let keyboard: { item: HTMLElement; from: number; at: number; handle: HTMLElement } | undefined;
    const removeAttr = addToken(list, "data-neshel-reorder", "list");

    /** One committed move of `item` by `step` positions (keyboard, move up/down buttons). */
    function moveItem(item: HTMLElement, step: number): number | undefined {
      if (context.options.disabled || drag) return undefined;
      const order = items();
      const at = order.indexOf(item);
      if (at === -1) return undefined;
      const to = Math.max(0, Math.min(order.length - 1, at + step));
      if (to === at) return undefined;
      const first = boxesOf(order);
      for (const each of order) animatorOf(each);
      const focused = document.activeElement as HTMLElement | null;
      restoreFocus = focused && item.contains(focused) ? focused : restoreFocus;
      context.options.onReorder?.(at, to);
      restore(); // a synchronous DOM update (framework-free consumers)
      say(context.options.announcements.move(labelOf(item), to + 1, order.length));
      settle(first);
      return to;
    }
    function moveBy(step: number): void {
      if (!keyboard) return;
      const to = moveItem(keyboard.item, step);
      if (to !== undefined) keyboard.at = to;
    }
    movers.set(list, moveItem);
    function grab(item: HTMLElement, handle: HTMLElement): void {
      const order = items();
      const at = order.indexOf(item);
      keyboard = { item, from: at, at, handle };
      handle.setAttribute("aria-pressed", "true");
      item.setAttribute("data-neshel-reorder-state", "grabbed");
      activeToken(true);
      say(context.options.announcements.grab(labelOf(item), at + 1, order.length));
    }
    function release(cancel: boolean): void {
      const current = keyboard;
      if (!current) return;
      if (cancel) {
        const order = items();
        const at = order.indexOf(current.item);
        if (at !== current.from && at !== -1) {
          const first = boxesOf(order);
          for (const item of order) animatorOf(item);
          restoreFocus = current.handle;
          context.options.onReorder?.(at, current.from);
          restore();
          settle(first);
        }
        keyboard = undefined;
        say(
          context.options.announcements.cancel(
            labelOf(current.item),
            current.from + 1,
            order.length,
          ),
        );
      } else {
        keyboard = undefined;
        say(
          context.options.announcements.drop(labelOf(current.item), current.at + 1, items().length),
        );
      }
      current.handle.setAttribute("aria-pressed", "false");
      current.item.removeAttribute("data-neshel-reorder-state");
      activeToken(false);
    }
    function onKeyDown(event: KeyboardEvent): void {
      if (context.options.disabled || event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target as HTMLElement;
      const item = target.closest?.(ITEM) as HTMLElement | null;
      if (!item || item.parentElement !== list) return;
      const handle =
        (target.closest(HANDLE) as HTMLElement | null) ??
        (item.querySelector(HANDLE) ? null : item);
      if (!handle || (handle !== target && handle !== item)) return;
      const back = context.options.axis === "x" ? "ArrowLeft" : "ArrowUp";
      const forward = context.options.axis === "x" ? "ArrowRight" : "ArrowDown";
      if (event.key === " " || event.key === "Enter") {
        if (event.repeat) return;
        event.preventDefault();
        if (keyboard) release(false);
        else grab(item, handle);
      } else if (keyboard && event.key === "Escape") {
        event.preventDefault();
        release(true);
      } else if (keyboard && (event.key === back || event.key === forward)) {
        event.preventDefault();
        moveBy(event.key === back ? -1 : 1);
      }
    }
    function onFocusOut(event: FocusEvent): void {
      // A blur caused by the reorder itself (the node moved) is restored, not a drop.
      if (!keyboard || restoreFocus) return;
      const next = event.relatedTarget as Node | null;
      // React moves the focused node when the order changes; focus stays on the handle.
      if (next && keyboard.handle.contains(next)) return;
      if (keyboard.handle.isConnected && document.activeElement === keyboard.handle) return;
      release(false);
    }
    list.addEventListener("keydown", onKeyDown);
    list.addEventListener("focusout", onFocusOut);

    const unsubscribeReduced = context.onReducedChange((reduced) => {
      if (!reduced) return;
      for (const { animator } of animators.values()) if (animator.running) animator.stop();
    });

    return {
      update() {
        gesture.setOptions(gestureOptions());
      },
      destroy() {
        gesture.destroy();
        if (keyboard) {
          keyboard.handle.setAttribute("aria-pressed", "false");
          keyboard.item.removeAttribute("data-neshel-reorder-state");
          keyboard = undefined;
        }
        removeDragging?.();
        activeToken(false);
        list.removeEventListener("keydown", onKeyDown);
        list.removeEventListener("focusout", onFocusOut);
        unsubscribeReduced();
        for (const { animator } of animators.values()) animator.stop();
        animators.clear();
        if (movers.get(list) === moveItem) movers.delete(list);
        removeAttr();
        releaseRegion();
      },
    };
  },
});
