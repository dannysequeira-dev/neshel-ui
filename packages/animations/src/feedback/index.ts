/**
 * `@neshel-ui/animations/feedback` — Loading & Feedback family (Phase 015, catalogue F01–F10). Experimental,
 * private. Semantics before motion: ARIA progressbars without invented values, skeletons hidden from assistive
 * technology, a success mark that never announces. F06 is enter/exit motion only: notifications themselves (store,
 * timers, announcements, focus) belong to `@neshel-ui/components` (`createToaster`, `<Toaster motion="none">`).
 * Works with any element (including the Components `Button`/`Skeleton`/`Toaster`) through DOM contracts — no
 * dependency in either direction.
 * `@neshel-ui/animations/feedback.css` styles the package elements and token layers.
 */
export type { ProgressSource } from "../core/progress-driver.js";
export {
  createEnterExit,
  type EnterExitControl,
  type EnterExitOptions,
  type EnterExitSide,
  type NeshelExitDetail,
} from "./enter-exit.js";
export {
  DotsPulse,
  EnterExit,
  type EnterExitProps,
  LoadingButton,
  type LoadingButtonProps,
  OptimisticPulse,
  type OptimisticPulseProps,
  PendingText,
  type PendingTextProps,
  ProgressBar,
  type ProgressBarProps,
  ProgressRing,
  type ProgressRingProps,
  Shimmer,
  SkeletonShimmer,
  type SkeletonShimmerProps,
  Spinner,
  SuccessMark,
  type SuccessMarkProps,
} from "./react.js";
export {
  createLoadingButton,
  createOptimisticPulse,
  type LoadingButtonControl,
  type LoadingButtonOptions,
  type OptimisticPulseControl,
  type OptimisticPulseOptions,
  type OptimisticStatus,
} from "./states.js";

import { feedbackCounters } from "./counters.js";

export interface FeedbackDebugInfo {
  loadingButtons: number;
  optimistic: number;
  enterExit: number;
}

/** Live feedback counters (tests, lab). */
export function getFeedbackDebugInfo(): FeedbackDebugInfo {
  return { ...feedbackCounters };
}
