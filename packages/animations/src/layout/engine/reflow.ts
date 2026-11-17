/**
 * Reflow groups (Phase 012; contracts/layout-engine.md §5, research R7): the children of a container animate
 * whenever the container reflows without a React render (resize, column change, item size change, image
 * load) and when its child list changes. One shared `ResizeObserver` for every group; a `MutationObserver`
 * per group for its child list. A pass compares cached boxes with fresh ones INSIDE the observer callback —
 * after layout, before paint — and flushes the changed motion hosts synchronously, so the inverted frame is the
 * one painted. Animation frames never read layout.
 */
import type { FlipAnimator } from "../../core/flip.js";
import { getMotionHost } from "../../core/host.js";
import { type Box, measureBox } from "../../core/layout-box.js";
import { counters } from "./debug.js";

type SizeHandler = (entries: readonly ResizeObserverEntry[]) => void;

const handlers = new Map<Element, Set<SizeHandler>>();
let shared: ResizeObserver | undefined;

function sharedObserver(): ResizeObserver | undefined {
  if (shared || typeof ResizeObserver === "undefined") return shared;
  shared = new ResizeObserver((entries) => {
    const batches = new Map<SizeHandler, ResizeObserverEntry[]>();
    for (const entry of entries) {
      for (const handler of handlers.get(entry.target) ?? []) {
        const batch = batches.get(handler);
        if (batch) batch.push(entry);
        else batches.set(handler, [entry]);
      }
    }
    for (const [handler, batch] of batches) handler(batch);
  });
  return shared;
}

/** Observe `target` with the shared ResizeObserver; returns the unobserve function. */
export function observeSize(target: Element, handler: SizeHandler): () => void {
  const observer = sharedObserver();
  if (!observer) return () => {};
  let set = handlers.get(target);
  if (!set) {
    set = new Set();
    handlers.set(target, set);
    observer.observe(target);
  }
  set.add(handler);
  counters.observers++;
  let done = false;
  return () => {
    if (done) return;
    done = true;
    counters.observers--;
    const current = handlers.get(target);
    if (!current) return;
    current.delete(handler);
    if (current.size === 0) {
      handlers.delete(target);
      observer.unobserve(target);
    }
  };
}

/** Block size of a ResizeObserver entry's border box (no layout read). */
export function entryHeight(entry: ResizeObserverEntry): number {
  const box = entry.borderBoxSize?.[0];
  return box ? box.blockSize : entry.contentRect.height;
}

export interface ReflowOptions {
  animatorOf(child: HTMLElement): FlipAnimator;
  /** `false` while motion is reduced (changes apply without animation). */
  animate(): boolean;
  /** Children size entries before the pass (masonry spans). */
  onSizes?(entries: readonly ResizeObserverEntry[]): void;
  /** Children taking part (default: every element child). */
  children?(): HTMLElement[];
}

export interface Reflow {
  /** Run a pass now (layout must be clean for a cheap read; used after explicit changes). */
  pass(): void;
  destroy(): void;
}

export function createReflow(container: HTMLElement, options: ReflowOptions): Reflow {
  const cache = new Map<Element, Box>();
  const observed = new Map<HTMLElement, () => void>();
  const children = () => options.children?.() ?? ([...container.children] as HTMLElement[]);

  function pass(): void {
    counters.reflows++;
    const animate = options.animate();
    const changed: HTMLElement[] = [];
    const seen = new Set<Element>();
    for (const child of children()) {
      seen.add(child);
      const box = measureBox(child);
      counters.reads++;
      const before = cache.get(child);
      cache.set(child, box);
      if (!before) continue;
      if (
        before.x === box.x &&
        before.y === box.y &&
        before.width === box.width &&
        before.height === box.height
      ) {
        continue;
      }
      const animator = options.animatorOf(child);
      if (animate) animator.from(before, box, "position");
      else animator.stop();
      changed.push(child);
    }
    for (const key of [...cache.keys()]) if (!seen.has(key)) cache.delete(key);
    // Write the inverted offsets now, so the frame painted after this callback shows them.
    for (const child of changed) getMotionHost(child).flush();
  }

  const onSizes: SizeHandler = (entries) => {
    const childEntries = entries.filter((entry) => entry.target !== container);
    if (childEntries.length > 0) options.onSizes?.(childEntries);
    pass();
  };
  function sync(): void {
    const current = new Set(children());
    for (const [child, off] of observed) {
      if (!current.has(child)) {
        off();
        observed.delete(child);
      }
    }
    for (const child of current) {
      if (!observed.has(child)) observed.set(child, observeSize(child, onSizes));
    }
  }
  const unobserveContainer = observeSize(container, onSizes);
  sync();
  const mutations =
    typeof MutationObserver === "undefined"
      ? undefined
      : new MutationObserver(() => {
          sync();
          pass();
        });
  mutations?.observe(container, { childList: true });

  return {
    pass,
    destroy() {
      mutations?.disconnect();
      unobserveContainer();
      for (const off of observed.values()) off();
      observed.clear();
      cache.clear();
    },
  };
}
