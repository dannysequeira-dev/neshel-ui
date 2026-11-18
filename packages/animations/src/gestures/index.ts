/**
 * `@neshel-ui/animations/gestures` — Physics & Gestures family (Phase 012, catalogue G01–G11). Experimental,
 * private. Built on the shared pointer session, the 009 scheduler and spring integrator and the motion host
 * (ADR 0027); package-rendered parts (buttons, indicators, handles) are styled by the opt-in
 * `@neshel-ui/animations/gestures.css`.
 */
import type { AnyEffectDefinition } from "../core/effect.js";
import { drag, dragSnap, fling, swipeDismiss } from "./drag.js";
import { springFollow, squashStretch } from "./follow.js";
import { reorder } from "./reorder.js";
import { elasticEdge, pullToRefresh } from "./scroller.js";
import { pinchZoom, rotateGesture } from "./transform.js";

export {
  type DragOptions,
  type DragSnapOptions,
  drag,
  dragSnap,
  type FlingOptions,
  fling,
  type Point,
  type SwipeDirection,
  type SwipeDismissOptions,
  swipeDismiss,
} from "./drag.js";
export { createGestureControls, type GestureControls } from "./engine/controls.js";
export { type GestureDebugInfo, getGestureDebugInfo } from "./engine/debug.js";
export {
  createGesture,
  type GestureAxis,
  type GestureHandle,
  type GestureOptions,
  type GesturePhase,
  type GestureState,
  type PointerKind,
} from "./engine/gesture.js";
export {
  createVelocityTracker,
  type DecayOptions,
  type DecayState,
  nearestSnap,
  projectDecay,
  rubberband,
  stepDecay,
  type VelocityTracker,
} from "./engine/physics.js";
export {
  type SpringFollowOptions,
  type SquashStretchOptions,
  springFollow,
  squashStretch,
} from "./follow.js";
export {
  ElasticScroll,
  type ElasticScrollProps,
  Gesture,
  type GestureProps,
  PinchZoom,
  type PinchZoomProps,
  PullToRefresh,
  type PullToRefreshProps,
  Reorder,
  ReorderHandle,
  type ReorderHandleProps,
  ReorderItem,
  type ReorderItemProps,
  type ReorderProps,
  SwipeDismiss,
  type SwipeDismissProps,
  useGestureControls,
  useReorderItem,
  useSpringFollow,
} from "./react.js";
export { type ReorderAnnouncements, type ReorderOptions, reorder, reorderMove } from "./reorder.js";
export {
  type ElasticEdgeOptions,
  elasticEdge,
  type PullToRefreshOptions,
  pullToRefresh,
} from "./scroller.js";
export type { Constraints, GestureCommonOptions } from "./shared.js";
export {
  type PinchZoomOptions,
  pinchZoom,
  type RotateGestureOptions,
  rotateGesture,
} from "./transform.js";

/** Every physics & gesture definition in catalogue order (G01–G11), for explicit registries. */
export const gestureEffects: readonly AnyEffectDefinition[] = /* @__PURE__ */ Object.freeze([
  drag,
  dragSnap,
  swipeDismiss,
  pullToRefresh,
  springFollow,
  elasticEdge,
  fling,
  pinchZoom,
  rotateGesture,
  reorder,
  squashStretch,
]);
