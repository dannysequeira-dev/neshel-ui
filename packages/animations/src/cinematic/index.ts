/**
 * `@neshel-ui/animations/cinematic` — Cinematic & Scenes family (Phase 013, catalogue C01–C10). Experimental,
 * private. The timeline engine (C01) and every effect engine are framework-free; React components and hooks
 * are client modules. Package-rendered parts are styled by the opt-in `@neshel-ui/animations/cinematic.css`.
 */
export {
  type Camera,
  type CameraOptions,
  type CameraPose,
  type CameraTarget,
  createCamera,
} from "./camera.js";
export { type Cover, type CoverOptions, type CoverPattern, createCover } from "./cover.js";
export {
  createDepthOfField,
  type DepthOfField as DepthOfFieldControl,
  type DepthOfFieldOptions,
} from "./depth.js";
export { type CinematicDebugInfo, getCinematicDebugInfo } from "./engine/debug.js";
export type { Pose } from "./engine/pose.js";
export type { MoveOptions, TrackOptions } from "./engine/progress.js";
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
export { createLetterbox, type LetterboxControl, type LetterboxOptions } from "./letterbox.js";
export {
  type CameraHandle,
  CameraStage,
  type CameraStageProps,
  Chapter,
  type ChapterProps,
  CurtainReveal,
  type CurtainRevealProps,
  DepthOfField,
  type DepthOfFieldProps,
  Letterbox,
  type LetterboxProps,
  SceneChapters,
  type SceneChaptersProps,
  SceneSegment,
  type SceneSegmentProps,
  SplitReveal,
  type SplitRevealProps,
  Spotlight,
  type SpotlightProps,
  Storyboard,
  StoryboardFrame,
  type StoryboardFrameProps,
  type StoryboardProps,
  TitleSequence,
  type TitleSequenceProps,
  useCamera,
} from "./react.js";
export {
  type ChapterInput,
  createSceneChapters,
  type ProgressSource,
  type SceneChapter,
  type SceneChapters as SceneChaptersControl,
  type SceneChaptersOptions,
} from "./scene.js";
export {
  createSpotlight,
  type Spotlight as SpotlightControl,
  type SpotlightOptions,
  type SpotlightTarget,
} from "./spotlight.js";
export {
  createStoryboard,
  type Storyboard as StoryboardControl,
  type StoryboardOptions,
} from "./storyboard.js";
export { type TitleSequenceOptions, titleSequence } from "./title.js";
export { type TimelineHandle, useTimeline } from "./use-timeline.js";
