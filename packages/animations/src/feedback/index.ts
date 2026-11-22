/**
 * `@neshel-ui/animations/feedback` — Loading & Feedback family (Phase 015, catalogue F01–F10). Experimental,
 * private. Semantics before motion: ARIA progressbars without invented values, skeletons hidden from assistive
 * technology, a success mark that never announces, toasts announced once. Works with any element (including the
 * Components `Button`/`Skeleton`) through DOM contracts — no dependency in either direction.
 * `@neshel-ui/animations/feedback.css` styles the package elements and token layers.
 */
export type { ProgressSource } from "../core/progress-driver.js";
export {
  DotsPulse,
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
  Toaster,
  type ToasterProps,
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
export {
  autoDuration,
  createToaster,
  type Toast,
  type Toaster as ToasterStore,
  type ToasterOptions,
  type ToastInput,
  type ToastTone,
} from "./toaster.js";

import { feedbackCounters } from "./toaster.js";

export interface FeedbackDebugInfo {
  toasters: number;
  timers: number;
  loadingButtons: number;
  optimistic: number;
}

/** Live feedback counters (tests, lab). */
export function getFeedbackDebugInfo(): FeedbackDebugInfo {
  return { ...feedbackCounters };
}
