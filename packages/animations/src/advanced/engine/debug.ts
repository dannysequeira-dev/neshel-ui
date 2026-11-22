/** Diagnostics of the Advanced 3D family (Phase 016; tests and lab). */
import { attributeCounters } from "../../core/attributes.js";
import { gateCounters } from "../../core/visibility-gate.js";

export const counters = {
  /** Live effects of this family. */
  effects: 0,
  /** D05 flaps currently in the DOM. */
  flaps: 0,
  /** D07 glitch layers currently in the DOM. */
  glitchLayers: 0,
  /** D09/D11 package layers currently in the DOM. */
  layers: 0,
  /** Window/document listeners currently attached by the family. */
  listeners: 0,
  /** ResizeObserver / MutationObserver instances alive. */
  observers: 0,
  /** D07 slice changes issued (rate checks). */
  glitchSteps: 0,
};

export interface AdvancedDebugInfo {
  effects: number;
  flaps: number;
  glitchLayers: number;
  layers: number;
  listeners: number;
  observers: number;
  glitchSteps: number;
  attributeEntries: number;
  gateObservers: number;
  gateElements: number;
}

export function getAdvancedDebugInfo(): AdvancedDebugInfo {
  return {
    ...counters,
    attributeEntries: attributeCounters.entries,
    gateObservers: gateCounters.observers,
    gateElements: gateCounters.elements,
  };
}
