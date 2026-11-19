/**
 * Text diagnostics (Phase 014): live counters for tests, the lab and performance reports. Plain numbers, no
 * listeners; never used for behaviour.
 */
export const counters = {
  /** Elements currently split. */
  splits: 0,
  /** ResizeObserver / font listeners held by line splits. */
  observers: 0,
  /** Layout read passes (word offsets), cumulative. */
  reads: 0,
  /** Line re-splits after resize/font/refresh, cumulative. */
  resplits: 0,
  /** Live text effects. */
  effects: 0,
};

export interface TextDebugInfo {
  splits: number;
  observers: number;
  reads: number;
  resplits: number;
  effects: number;
}

/** Snapshot of the text counters (development and tests). */
export function getTextDebugInfo(): TextDebugInfo {
  return { ...counters };
}
