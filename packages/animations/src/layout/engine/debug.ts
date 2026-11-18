/** Diagnostics counters of the layout family (`getLayoutDebugInfo`, tests and the browser lab). */
export const counters = {
  /** Batched snapshots (one per pending change). */
  snapshots: 0,
  /** Read tasks that measured new boxes. */
  plays: 0,
  /** Layout boxes read by groups and reflow observers. */
  reads: 0,
  /** Reflow passes run inside observer callbacks. */
  reflows: 0,
  /** Live reflow/height observers. */
  observers: 0,
  /** Presence exits completed by the watchdog instead of their animation. */
  watchdog: 0,
};

export interface LayoutDebugInfo {
  readonly snapshots: number;
  readonly plays: number;
  readonly reads: number;
  readonly reflows: number;
  readonly observers: number;
  readonly watchdog: number;
}

export function getLayoutDebugInfo(): LayoutDebugInfo {
  return { ...counters };
}
