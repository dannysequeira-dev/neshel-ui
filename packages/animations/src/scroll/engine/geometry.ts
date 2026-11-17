/**
 * Geometry cache and invalidation (contracts/scroll-engine.md §2–§3, research R3/R5; generalises the 008.0
 * ScrollScene prototype).
 *
 * Layout reads happen ONLY in an invalidation pass that runs in the scheduler's read phase, for every dirty
 * item at once. Passes are triggered by one shared ResizeObserver (subjects, sources, the document element
 * and every element preceding a subject along its ancestor chain — catches content above growing,
 * shrinking or being compensated), one shared MutationObserver (child lists of those ancestors — insertion
 * and removal above; targets are re-collected), viewport `resize`, `document.fonts` `loadingdone`, window
 * `load` and explicit refreshes. Scrolling never triggers a pass.
 *
 * Positions are layout positions from the offset chain, which ignores transforms: an element moved by its
 * own parallax layer is measured where layout put it, so effects never feed on their own output.
 */
import { getFrameScheduler } from "../../core/scheduler.js";
import { counters } from "./debug.js";
import type { ScrollAxis, ScrollSourceRecord } from "./source.js";

/** Something whose geometry is cached (a timeline, a section spy, an effect's measurement). */
export interface Measurable {
  readonly source: ScrollSourceRecord;
  /** Elements whose size changes may move or resize the measured geometry. */
  targets(): readonly Element[];
  /** Elements whose child list changes may move the measured geometry. */
  ancestors(): readonly Element[];
  /** Read layout (called in a read phase, after the source was measured in the same pass). */
  measure(): void;
  /** Geometry changed; called after the pass (in the read phase). */
  measured?(): void;
}

type HTML = HTMLElement & { offsetTop: number; offsetLeft: number };

const isHtml = (element: Element): element is HTML =>
  typeof (element as HTML).offsetTop === "number";

/**
 * Layout offset of an element's border box from the document origin, ignoring transforms (offset chain).
 * Non-HTML elements (SVG) fall back to the bounding box plus the root scroll offset.
 */
export function layoutOffset(element: Element, axis: ScrollAxis): number {
  if (!isHtml(element)) {
    const rect = element.getBoundingClientRect();
    return axis === "block" ? rect.top + (window.scrollY || 0) : rect.left + (window.scrollX || 0);
  }
  let total = 0;
  let node: HTML | null = element;
  while (node) {
    total += axis === "block" ? node.offsetTop : node.offsetLeft;
    const parent = node.offsetParent as HTML | null;
    // offsetTop relative to <body> (or a null parent) is already relative to the document.
    if (!parent || parent === document.body) break;
    total += axis === "block" ? parent.clientTop : parent.clientLeft;
    node = parent;
  }
  return total;
}

/** Subject start in the source's content coordinates (layout, transforms ignored). */
export function subjectStart(subject: Element, source: Element | null, axis: ScrollAxis): number {
  const start = layoutOffset(subject, axis);
  if (source === null) return start;
  const border = axis === "block" ? source.clientTop : source.clientLeft;
  return start - layoutOffset(source, axis) - border;
}

/** Fresh subject start from the bounding box (includes transforms) — diagnostics only. */
export function actualStart(subject: Element, source: Element | null, axis: ScrollAxis): number {
  const rect = subject.getBoundingClientRect();
  const edge = axis === "block" ? rect.top : rect.left;
  if (source === null) {
    return edge + (axis === "block" ? window.scrollY || 0 : window.scrollX || 0);
  }
  const box = source.getBoundingClientRect();
  return axis === "block"
    ? edge - box.top - source.clientTop + source.scrollTop
    : edge - box.left - source.clientLeft + Math.abs(source.scrollLeft);
}

export const subjectSize = (subject: Element, axis: ScrollAxis): number =>
  isHtml(subject)
    ? axis === "block"
      ? subject.offsetHeight
      : subject.offsetWidth
    : axis === "block"
      ? subject.getBoundingClientRect().height
      : subject.getBoundingClientRect().width;

/** Measure a source's scrollport and maximum scroll (read phase). */
export function measureSource(record: ScrollSourceRecord): void {
  const element = record.element;
  const root = document.documentElement;
  const box = element ?? root;
  const scroller = element ?? document.scrollingElement ?? root;
  record.viewport.block = box.clientHeight;
  record.viewport.inline = box.clientWidth;
  record.max.block = Math.max(0, scroller.scrollHeight - box.clientHeight);
  record.max.inline = Math.max(0, scroller.scrollWidth - box.clientWidth);
  record.measured = true;
  record.readPosition();
}

/** Elements to observe for a subject in a source (prototype rule set). */
export function collectTargets(
  subject: Element | null,
  source: Element | null,
): { targets: Element[]; ancestors: Element[] } {
  const root = document.documentElement;
  const targets: Element[] = [source ?? root];
  const ancestors: Element[] = [];
  if (!subject) {
    // Whole-range timeline: the content changes the scroll size, not necessarily the scroller's box
    // (e.g. `html, body { height: 100% }`), so the content's top-level boxes are observed too.
    const content = source ?? document.body;
    if (content) {
      if (!source) targets.push(content);
      targets.push(...content.children);
      ancestors.push(content);
    }
    return { targets, ancestors };
  }
  targets.push(subject);
  const stop = source ?? document.body;
  for (let node: Element = subject; node.parentElement; ) {
    const parent: Element = node.parentElement;
    ancestors.push(parent);
    for (let sibling = node.previousElementSibling; sibling; ) {
      targets.push(sibling);
      sibling = sibling.previousElementSibling;
    }
    if (parent === stop || parent === root) break;
    node = parent;
  }
  return { targets, ancestors };
}

// --- shared observers and invalidation passes ------------------------------------------------------

interface Entry {
  targets: readonly Element[];
  ancestors: readonly Element[];
}

const items = new Map<Measurable, Entry>();
const dirty = new Set<Measurable>();
const observedCounts = new Map<Element, number>();
const ancestorCounts = new Map<Element, number>();
let resizeObserver: ResizeObserver | undefined;
let mutationObserver: MutationObserver | undefined;
let passTask: (() => void) | undefined;
let globalsAttached = false;

function runPass(): void {
  passTask = undefined;
  const batch = [...dirty];
  dirty.clear();
  const sources = new Set<ScrollSourceRecord>();
  for (const item of batch) {
    if (!items.has(item)) continue;
    if (!sources.has(item.source)) {
      sources.add(item.source);
      measureSource(item.source);
    }
  }
  for (const item of batch) {
    if (!items.has(item)) continue;
    counters.measurements++;
    item.measure();
  }
  for (const item of batch) if (items.has(item)) item.measured?.();
  for (const source of sources) source.notify();
}

/** Request a measurement of `item` (or of every item) in the next read phase (coalesced). */
export function invalidate(item?: Measurable): void {
  if (item) {
    if (!items.has(item)) return;
    dirty.add(item);
  } else {
    for (const each of items.keys()) dirty.add(each);
  }
  if (dirty.size > 0) passTask ??= getFrameScheduler().schedule(runPass, "read");
}

/** Re-measure every scroll timeline, trigger and effect (for changes the observers cannot see). */
export function refreshScroll(): void {
  invalidate();
}

const invalidateAll = () => invalidate();

function retain(map: Map<Element, number>, element: Element): boolean {
  const count = (map.get(element) ?? 0) + 1;
  map.set(element, count);
  return count === 1;
}

function release(map: Map<Element, number>, element: Element): boolean {
  const count = (map.get(element) ?? 1) - 1;
  if (count > 0) {
    map.set(element, count);
    return false;
  }
  map.delete(element);
  return true;
}

function observeAncestors(): void {
  if (!mutationObserver) return;
  // MutationObserver cannot unobserve one node: re-observe the current set.
  mutationObserver.disconnect();
  for (const ancestor of ancestorCounts.keys()) {
    mutationObserver.observe(ancestor, { childList: true });
  }
}

function track(entry: Entry): void {
  for (const target of entry.targets) {
    if (retain(observedCounts, target)) resizeObserver?.observe(target);
  }
  let changed = false;
  for (const ancestor of entry.ancestors) changed = retain(ancestorCounts, ancestor) || changed;
  if (changed) observeAncestors();
  counters.observedTargets = observedCounts.size;
}

function untrack(entry: Entry): void {
  for (const target of entry.targets) {
    if (release(observedCounts, target)) resizeObserver?.unobserve(target);
  }
  let changed = false;
  for (const ancestor of entry.ancestors) changed = release(ancestorCounts, ancestor) || changed;
  if (changed) observeAncestors();
  counters.observedTargets = observedCounts.size;
}

function collect(item: Measurable): Entry {
  return { targets: [...item.targets()], ancestors: [...item.ancestors()] };
}

function onMutation(): void {
  for (const [item, entry] of items) {
    const next = collect(item);
    track(next); // retain before releasing so unchanged targets are not re-observed
    untrack(entry);
    items.set(item, next);
  }
  invalidateAll();
}

function attachGlobals(): void {
  if (globalsAttached) return;
  globalsAttached = true;
  if (typeof ResizeObserver === "function") resizeObserver = new ResizeObserver(invalidateAll);
  if (typeof MutationObserver === "function") mutationObserver = new MutationObserver(onMutation);
  window.addEventListener("resize", invalidateAll, { passive: true });
  window.addEventListener("load", invalidateAll);
  document.fonts?.addEventListener?.("loadingdone", invalidateAll);
}

function detachGlobals(): void {
  if (!globalsAttached) return;
  globalsAttached = false;
  resizeObserver?.disconnect();
  mutationObserver?.disconnect();
  resizeObserver = mutationObserver = undefined;
  observedCounts.clear();
  ancestorCounts.clear();
  counters.observedTargets = 0;
  window.removeEventListener("resize", invalidateAll);
  window.removeEventListener("load", invalidateAll);
  document.fonts?.removeEventListener?.("loadingdone", invalidateAll);
  passTask?.();
  passTask = undefined;
}

/** Start caching `item`'s geometry (measures in the next read phase); returns the unregister function. */
export function registerGeometry(item: Measurable): () => void {
  if (typeof window === "undefined" || items.has(item)) return () => {};
  attachGlobals();
  const entry = collect(item);
  items.set(item, entry);
  track(entry);
  invalidate(item);
  return () => {
    const current = items.get(item);
    if (!current) return;
    items.delete(item);
    dirty.delete(item);
    untrack(current);
    if (items.size === 0) detachGlobals();
  };
}
