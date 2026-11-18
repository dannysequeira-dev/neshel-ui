/**
 * `@neshel-ui/animations/cinematic` — Cinematic & Scenes family (Phase 013, catalogue C01–C10). Experimental,
 * private. The timeline engine (C01) and every effect engine are framework-free; React components and hooks
 * are client modules. Package-rendered parts are styled by the opt-in `@neshel-ui/animations/cinematic.css`.
 */
export { type CinematicDebugInfo, getCinematicDebugInfo } from "./engine/debug.js";
export type { Pose } from "./engine/pose.js";
export {
  type CallDirection,
  type CallFn,
  createTimeline,
  type EffectTrackInput,
  type PoseTrackInput,
  type Timeline,
  type TimelineOptions,
  type TimelinePosition,
  type TimelineTrackInput,
  type TrackFill,
  type TrackInfo,
  type TrackInput,
  type ValueTrackInput,
} from "./engine/timeline.js";
export { type TimelineHandle, useTimeline } from "./use-timeline.js";
