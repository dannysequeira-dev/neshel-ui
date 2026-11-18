/**
 * `@neshel-ui/animations/page-transitions` — Page Transitions family (Phase 013, catalogue PT01–PT09 and the
 * router-independent part of PT10). Experimental, private. Native View Transitions first, with verified
 * fallbacks; navigation never waits for an effect. Opt-in stylesheets:
 * `@neshel-ui/animations/page-transitions.css` and `@neshel-ui/animations/page-transitions-mpa.css`.
 * Router adapters: `@neshel-ui/animations/page-transitions/next` and `…/react-router`.
 */
export {
  EFFECT_ATTRIBUTE,
  PAGE_EFFECTS,
  type PageEffect,
  type PageTransition as PageTransitionControl,
  type PageTransitionOptions,
  type PageTransitionResult,
  type PageTransitionState,
  startPageTransition,
} from "./engine/controller.js";
export {
  DIRECTION_ATTRIBUTE,
  type DirectionTracker,
  type NavigationDirection,
  type NavigationType,
  trackNavigationDirection,
} from "./engine/direction.js";
export { type CrossDocumentOptions, enableCrossDocumentTransitions } from "./engine/mpa.js";
export { registerSharedElement } from "./engine/names.js";
export {
  createRouteProgress,
  type RouteProgress as RouteProgressControl,
  type RouteProgressOptions,
  type RouteProgressState,
} from "./engine/progress.js";
export { getViewTransitionSupport, type ViewTransitionSupport } from "./engine/support.js";
export {
  getReactViewTransition,
  PageTransition,
  type PageTransitionProps,
  PersistentElement,
  RouteProgress,
  type RouteProgressProps,
  type RouteTransitionInput,
  SharedElement,
  type StartOptions,
  useNavigationDirection,
  usePageTransition,
  useRouteTransition,
} from "./react.js";
