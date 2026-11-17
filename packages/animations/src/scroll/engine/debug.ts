/**
 * Scroll engine counters (contracts/scroll-engine.md §6). Plain numbers, no allocation per frame; tests and
 * the browser lab read them to prove, for example, that scrolling never triggers a geometry measurement.
 */

export interface ScrollDebugInfo {
  /** Live scroll sources (one per scroller with subscribers). */
  sources: number;
  /** Live timelines (`createScrollProgress` results not destroyed). */
  timelines: number;
  /** Timelines currently subscribed to their source. */
  activeTimelines: number;
  /** Geometry measurements (one per timeline per invalidation pass). */
  measurements: number;
  /** Scroll position reads (one per source per frame while scrolling). */
  scrollReads: number;
  /** Live native (scroll-timeline) animations. */
  nativeAnimations: number;
  /** Native animations replaced by the JS driver after the behavioural check. */
  nativeFallbacks: number;
  /** Elements watched by the shared ResizeObserver. */
  observedTargets: number;
}

export const counters: ScrollDebugInfo = {
  sources: 0,
  timelines: 0,
  activeTimelines: 0,
  measurements: 0,
  scrollReads: 0,
  nativeAnimations: 0,
  nativeFallbacks: 0,
  observedTargets: 0,
};

/** Snapshot of the scroll engine counters. */
export function getScrollDebugInfo(): ScrollDebugInfo {
  return { ...counters };
}
