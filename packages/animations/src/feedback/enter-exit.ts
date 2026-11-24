/**
 * F06 — enter / exit motion for keyed lists (feature 017, specs/017-components-completion/contracts/f06-enter-exit.md;
 * catalogue "Toast enter / exit", reduced: fade). Generic and stateless about content: it does not create items,
 * announce, time, queue or dismiss anything — the list owner does (e.g. the Components `Toaster` with
 * `motion="none"`). F06 only animates items that carry `data-state`:
 *
 * - an item that appears with `data-state="entering"` (or `"open"`) slides/fades in;
 * - an item whose owner dispatches the `neshel-exit` DOM event slides/fades out and the owner waits for it through
 *   `event.detail.waitUntil(promise)`; an item switched to `data-state="closing"` without that event does the
 *   same (lists that remove items after their own timeout);
 * - an item that returns to `entering`/`open` while exiting re-enters from where it is.
 *
 * Every style write goes through the element's motion host (a transform layer and an opacity contribution, both
 * restored exactly when the item leaves or the controller is destroyed). Reduced motion (live): opacity only.
 */

import { attachWith } from "../core/attach.js";
import type { DurationPreset } from "../core/defaults.js";
import { defineEffect, type EffectHandle } from "../core/effect.js";
import { clamp } from "../core/interpolate.js";
import type { ReducedMotion } from "../core/reduced-motion.js";
import { validator } from "../core/validate.js";
import { feedbackCounters } from "./counters.js";

export type EnterExitSide = "bottom" | "top" | "start" | "end";

export interface EnterExitOptions {
  /** Side the items enter from (default `"bottom"`; logical start/end follow the writing direction). */
  from?: EnterExitSide;
  /** Side the items leave towards (default `"end"`). */
  exitTo?: EnterExitSide;
  /** Travel in px (0–200, default 12). */
  distance?: number;
  /** Duration in ms or a `motionDefaults.duration` preset (default 220). */
  duration?: number | DurationPreset;
  /** Items to animate inside the container (default `"[data-state]"`). */
  selector?: string;
  /** Reduced-motion policy (default `"user"`): reduced → opacity only. */
  reducedMotion?: ReducedMotion;
}

export interface EnterExitControl {
  /** Items currently tracked. */
  readonly size: number;
  update(options: EnterExitOptions): void;
  /** Idempotent: stops observing and restores every item's styles. */
  destroy(): void;
}

/** Detail of the `neshel-exit` event a list owner dispatches on an item before removing it. */
export interface NeshelExitDetail {
  waitUntil(promise: Promise<unknown>): void;
}

const SIDES: readonly EnterExitSide[] = ["bottom", "top", "start", "end"];
const STATES = new Set(["entering", "open", "closing"]);

interface Resolved {
  from: EnterExitSide;
  exitTo: EnterExitSide;
  distance: number;
  duration: number;
  selector: string;
  reducedMotion: ReducedMotion;
}

const v = validator("createEnterExit");

function resolve(input: EnterExitOptions | undefined): Resolved {
  const o = v.options(input);
  const selector = o.selector ?? "[data-state]";
  if (typeof selector !== "string" || selector.trim() === "")
    v.fail('"selector" must be a non-empty CSS selector.');
  return {
    from: v.oneOf("from", o.from, SIDES, "bottom"),
    exitTo: v.oneOf("exitTo", o.exitTo, SIDES, "end"),
    distance: v.number("distance", o.distance, 12, 0, 200),
    duration: v.duration("duration", o.duration, 220),
    selector,
    reducedMotion: v.reducedMotion(o.reducedMotion),
  };
}

function offset(side: EnterExitSide, distance: number, rtl: boolean): [number, number] {
  if (side === "bottom") return [0, distance];
  if (side === "top") return [0, -distance];
  const inline = side === "end" ? distance : -distance;
  return [rtl ? -inline : inline, 0];
}

interface ItemOptions extends Resolved {
  /** 1 = shown, 0 = hidden (exit pose). */
  target: 0 | 1;
  /** Start hidden (a new item entering). */
  appear: boolean;
  /** Called when a run reaches its target. */
  notify(target: 0 | 1): void;
}

/** Per-item effect: one progress value rendered as a transform layer + opacity contribution. */
const itemEffect = defineEffect<ItemOptions, ItemOptions>({
  id: "feedback/enter-exit",
  family: "feedback",
  channels: [
    { channel: "transform", mode: "compose" },
    { channel: "opacity", mode: "multiply" },
  ],
  reducedMotion: "fade",
  resolve: (options) => options as ItemOptions,
  policy: (options) => options.reducedMotion,
  setup(context) {
    let o = context.options;
    // One progress value (0 hidden … 1 shown) driven by a small tween on the shared frame scheduler
    // (elapsed time accumulates the scheduler's clamped delta, so a background tab never jumps).
    let progress = o.appear ? 0 : 1;
    let cancelFrame: (() => void) | undefined;
    let run = 0;
    const rtl = () =>
      typeof getComputedStyle === "function" &&
      getComputedStyle(context.element as Element).direction === "rtl";

    function render(value: number): void {
      const t = clamp(value, 0, 1);
      if (t >= 1) {
        context.channels.opacity.clear();
        context.channels.transform.clear();
        return;
      }
      context.channels.opacity.set(Math.round(t * 10000) / 10000);
      if (context.reduced) {
        context.channels.transform.clear();
        return;
      }
      const side = o.target === 1 ? o.from : o.exitTo;
      const [x, y] = offset(side, o.distance, rtl());
      context.channels.transform.set({ translateX: x * (1 - t), translateY: y * (1 - t) });
    }

    function play(): void {
      cancelFrame?.();
      const id = ++run;
      const target = o.target;
      const from = progress;
      const total = o.duration * Math.abs(target - from);
      let elapsed = 0;
      const step = (frame: { delta: number }) => {
        if (id !== run) return;
        elapsed += frame.delta * 1000;
        const t = total <= 0 ? 1 : Math.min(1, elapsed / total);
        progress = from + (target - from) * (1 - (1 - t) ** 3); // ease-out cubic
        render(progress);
        if (t < 1) cancelFrame = context.scheduler.schedule(step, "update");
        else {
          cancelFrame = undefined;
          o.notify(target);
        }
      };
      cancelFrame = context.scheduler.schedule(step, "update");
    }
    render(progress);
    if (progress !== o.target) play();
    else o.notify(o.target);

    const instance = {
      update(next: ItemOptions) {
        const changed = next.target !== o.target;
        o = next;
        if (changed) play();
        else render(progress);
      },
      destroy() {
        run++;
        cancelFrame?.();
        context.channels.opacity.clear();
        context.channels.transform.clear();
      },
    };
    return instance;
  },
});

/**
 * Animate the items of a keyed list on enter and exit. The container keeps its own semantics; F06 never moves
 * focus, never announces and never removes an item.
 */
export function createEnterExit(
  container: HTMLElement,
  options?: EnterExitOptions,
): EnterExitControl {
  if (!container || typeof (container as Element).querySelectorAll !== "function")
    v.fail("expected an element container.");
  let o = resolve(options);
  interface Item {
    handle: EffectHandle<ItemOptions>;
    target: 0 | 1;
    /** Target the item last reached (`undefined` while its first run plays). */
    at: 0 | 1 | undefined;
    waiters: Array<() => void>;
  }
  const items = new Map<HTMLElement, Item>();
  let destroyed = false;
  feedbackCounters.enterExit++;

  const release = (item: Item) => {
    for (const resolve of item.waiters.splice(0)) resolve();
  };

  function optionsFor(item: Item, appear: boolean): ItemOptions {
    return {
      ...o,
      target: item.target,
      appear,
      notify: (target) => {
        item.at = target;
        if (target === 0) release(item);
      },
    };
  }

  function setTarget(element: HTMLElement, target: 0 | 1, appear: boolean): Item {
    const existing = items.get(element);
    if (existing) {
      if (existing.target !== target) {
        existing.target = target;
        existing.at = undefined;
        if (target === 1) release(existing);
        existing.handle.update(optionsFor(existing, false));
      }
      return existing;
    }
    const item: Item = { target, at: undefined, waiters: [], handle: undefined as never };
    items.set(element, item);
    item.handle = // Compose-only channels (transform layer + opacity factor): no exclusive-channel arbiter needed.
      attachWith(element, itemEffect, optionsFor(item, appear && target === 1), {}, undefined);
    return item;
  }

  function track(element: HTMLElement, appear: boolean): void {
    const state = element.getAttribute("data-state");
    if (!state || !STATES.has(state)) return;
    setTarget(element, state === "closing" ? 0 : 1, appear);
  }

  function untrack(element: HTMLElement): void {
    const item = items.get(element);
    if (!item) return;
    items.delete(element);
    release(item);
    item.handle.destroy();
  }

  const matches = (node: Node): node is HTMLElement =>
    node instanceof HTMLElement && node.matches(o.selector);
  const within = (node: Node): HTMLElement[] =>
    node instanceof HTMLElement
      ? [...(matches(node) ? [node] : []), ...node.querySelectorAll<HTMLElement>(o.selector)]
      : [];

  for (const element of container.querySelectorAll<HTMLElement>(o.selector)) track(element, false);

  const observer = new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === "attributes") {
        if (matches(record.target)) track(record.target, false);
        continue;
      }
      for (const node of record.removedNodes) for (const element of within(node)) untrack(element);
      for (const node of record.addedNodes)
        for (const element of within(node)) track(element, true);
    }
  });
  observer.observe(container, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["data-state"],
  });

  /** `neshel-exit`: play the exit now and let the owner wait for it (bounded by duration + 500 ms). */
  const onExit = (event: Event) => {
    const element = (event.target as Element | null)?.closest?.(o.selector) as HTMLElement | null;
    if (!element || !container.contains(element)) return;
    const item = setTarget(element, 0, false);
    const finished = new Promise<void>((resolve) => {
      if (item.at === 0) return resolve();
      const timer = setTimeout(resolve, o.duration + 500);
      item.waiters.push(() => {
        clearTimeout(timer);
        resolve();
      });
    });
    (event as CustomEvent<NeshelExitDetail>).detail?.waitUntil?.(finished);
  };
  container.addEventListener("neshel-exit", onExit);

  return {
    get size() {
      return items.size;
    },
    update(next) {
      if (destroyed) return;
      o = resolve(next);
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      observer.disconnect();
      container.removeEventListener("neshel-exit", onExit);
      for (const element of [...items.keys()]) untrack(element);
      feedbackCounters.enterExit--;
    },
  };
}
