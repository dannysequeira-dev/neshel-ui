/**
 * Layout group (Phase 012; contracts/layout-engine.md §4, research R7). Registered elements animate when an
 * update changes their layout box: `snapshot()` reads every box in one batch before the change (React: in
 * `getSnapshotBeforeUpdate`), `play()` schedules ONE read task that measures the new boxes before paint and
 * hands each change to the element's FLIP animator (written in the same frame's write phase). Elements with a
 * `layoutId` also animate across elements: a newly registered element whose id was in the snapshot starts
 * from that box (L04 shared layout). Nothing runs while no change is pending.
 */
import type { FlipAnimator, LayoutMode } from "../../core/flip.js";
import { type Box, measureBox } from "../../core/layout-box.js";
import { getFrameScheduler } from "../../core/scheduler.js";
import { counters } from "./debug.js";

export interface LayoutEntry {
  readonly animator: FlipAnimator;
  layout: LayoutMode;
  layoutId: string | undefined;
  /** `false` while motion is reduced: changes are applied without animation. */
  animate(): boolean;
}

export interface LayoutGroup {
  /** Register an element; returns the unregister function. */
  register(element: Element, entry: LayoutEntry): () => void;
  /** Read every registered box (once per pending change; further calls are no-ops until `play`). */
  snapshot(): void;
  /** Measure the new boxes in the next read phase and animate the changes. */
  play(): void;
  readonly size: number;
  destroy(): void;
}

interface Shared {
  box: Box;
  element: Element;
}

export function createLayoutGroup(): LayoutGroup {
  const entries = new Map<Element, LayoutEntry>();
  let first: Map<Element, Box> | undefined;
  const shared = new Map<string, Shared>();
  let cancelPlay: (() => void) | undefined;
  let destroyed = false;

  /** The box an element is SHOWN at: layout box plus its current FLIP offset. */
  function visual(box: Box, animator: FlipAnimator): Box {
    const o = animator.offset;
    const width = box.width * o.sx;
    const height = box.height * o.sy;
    return {
      x: box.x + box.width / 2 + o.x - width / 2,
      y: box.y + box.height / 2 + o.y - height / 2,
      width,
      height,
    };
  }

  function run(): void {
    cancelPlay = undefined;
    const before = first;
    first = undefined;
    counters.plays++;
    for (const [element, entry] of entries) {
      if (!element.isConnected) continue;
      let from = before?.get(element);
      if (!from && entry.layoutId) {
        // A new element taking over a shared id starts from the old element's visual box (its own
        // offset is identity, so `from` adds nothing).
        const source = shared.get(entry.layoutId);
        if (source && source.element !== element) from = source.box;
      }
      if (!from) continue;
      if (!entry.animate()) {
        entry.animator.stop();
        continue;
      }
      const last = measureBox(element);
      counters.reads++;
      entry.animator.from(from, last, entry.layout);
    }
    shared.clear();
  }

  return {
    register(element, entry) {
      entries.set(element, entry);
      return () => {
        if (entries.get(element) !== entry) return;
        // Keep the last box of a shared id for an element that replaces this one in the same update.
        if (entry.layoutId && first?.has(element)) {
          shared.set(entry.layoutId, {
            box: visual(first.get(element) as Box, entry.animator),
            element,
          });
        }
        entries.delete(element);
      };
    },
    snapshot() {
      if (destroyed || first) return;
      first = new Map();
      counters.snapshots++;
      for (const [element, entry] of entries) {
        if (!element.isConnected) continue;
        const box = measureBox(element);
        counters.reads++;
        first.set(element, box);
        if (entry.layoutId)
          shared.set(entry.layoutId, { box: visual(box, entry.animator), element });
      }
    },
    play() {
      if (destroyed || cancelPlay) return;
      if (!first && shared.size === 0) return;
      cancelPlay = getFrameScheduler().schedule(run, "read");
    },
    get size() {
      return entries.size;
    },
    destroy() {
      destroyed = true;
      cancelPlay?.();
      cancelPlay = undefined;
      first = undefined;
      shared.clear();
      entries.clear();
    },
  };
}
