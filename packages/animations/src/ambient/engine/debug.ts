/** Ambient diagnostics (Phase 015): live counters for tests, the lab and performance reports. */
import { surfaceCounters } from "../../core/surface.js";
import { counters } from "./registry.js";

export interface AmbientDebugInfo {
  effects: number;
  ticking: number;
  cssRunning: number;
  observers: number;
  visibilityListeners: number;
  toggles: number;
  draws: number;
  surfaces: number;
  contexts: number;
}

export function getAmbientDebugInfo(): AmbientDebugInfo {
  return { ...counters, surfaces: surfaceCounters.surfaces, contexts: surfaceCounters.contexts };
}
