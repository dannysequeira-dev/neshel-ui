/**
 * Cinematic diagnostics (Phase 013): live counters for tests, the lab and performance reports. Plain numbers,
 * no listeners; never used for behaviour.
 */
export const counters = {
  /** Timelines created and not destroyed. */
  timelines: 0,
  /** Running timeline clocks (scheduler tasks owned by timelines). */
  clocks: 0,
  /** `visibilitychange` listeners held by running timelines. */
  listeners: 0,
  /** Track renders (cumulative). */
  renders: 0,
  /** Tracks released because their target left the document (cumulative). */
  detached: 0,
  /** Awaited calls started (cumulative). */
  waits: 0,
  /** Geometry reads by cinematic effects (camera, spotlight, …; cumulative). */
  reads: 0,
  /** Observers (Resize/Intersection) held by cinematic effects. */
  observers: 0,
};

export interface CinematicDebugInfo {
  timelines: number;
  clocks: number;
  listeners: number;
  renders: number;
  detached: number;
  waits: number;
  reads: number;
  observers: number;
}

/** Snapshot of the cinematic counters (development and tests). */
export function getCinematicDebugInfo(): CinematicDebugInfo {
  return { ...counters };
}
