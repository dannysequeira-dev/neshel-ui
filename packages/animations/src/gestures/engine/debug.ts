/** Diagnostics of the gestures family (tests and the browser lab). */
import { sessionStats } from "../../core/pointer-session.js";

export interface GestureDebugInfo {
  /** Pointer sessions alive (one per element with an attached gesture). */
  readonly sessions: number;
  /** Pointers currently claimed by an active exclusive gesture. */
  readonly claims: number;
}

export function getGestureDebugInfo(): GestureDebugInfo {
  return sessionStats();
}
