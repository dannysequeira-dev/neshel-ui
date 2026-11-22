/**
 * Presence state machine — moved to `src/core/presence.ts` in Phase 015 so `./feedback` (F06 toasts) shares it
 * without importing `./layout` (ADR 0030 §1). Re-exported unchanged.
 */
export {
  createPresence,
  type Presence,
  type PresenceEntry,
  type PresenceStatus,
} from "../../core/presence.js";
