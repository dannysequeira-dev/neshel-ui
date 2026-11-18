/**
 * `@neshel-ui/animations/layout` — Layout Animations family (Phase 012, catalogue L01–L10). Experimental,
 * private. FLIP on the offset chain and the motion host, reflow observers, height drivers and presence
 * (ADR 0027); package-rendered parts (collapse panel, tab indicator, cross-fade stack, masonry grid) are styled
 * by the opt-in `@neshel-ui/animations/layout.css`.
 */
import type { AnyEffectDefinition } from "../core/effect.js";
import {
  autoHeight,
  collapse,
  crossFade,
  flipMove,
  gridReflow,
  listItem,
  masonry,
  sharedLayout,
  tabIndicator,
} from "./effects.js";

export type { LayoutMode } from "../core/flip.js";
export type { Box } from "../core/layout-box.js";
export { measureBox } from "../core/layout-box.js";
export {
  type AutoHeightOptions,
  autoHeight,
  type CollapseOptions,
  type CrossFadeOptions,
  collapse,
  crossFade,
  type FlipMoveOptions,
  flipMove,
  type GridReflowOptions,
  gridReflow,
  type LayoutTransition,
  type ListItemOptions,
  listItem,
  type MasonryOptions,
  masonry,
  type SharedLayoutOptions,
  sharedLayout,
  type TabIndicatorOptions,
  tabIndicator,
} from "./effects.js";
export { getLayoutDebugInfo, type LayoutDebugInfo } from "./engine/debug.js";
export {
  createLayoutGroup,
  type LayoutEntry,
  type LayoutGroup as LayoutGroupHandle,
} from "./engine/group.js";
export {
  createPresence,
  type Presence as PresenceState,
  type PresenceEntry,
  type PresenceStatus,
} from "./engine/presence.js";
export { Presence, type PresenceProps, useIsPresent, usePresence } from "./presence.js";
export {
  AnimatedList,
  type AnimatedListProps,
  AutoHeight,
  type AutoHeightProps,
  Collapse,
  type CollapseProps,
  CrossFade,
  type CrossFadeProps,
  LayoutGroup,
  LayoutItem,
  type LayoutItemOptions,
  type LayoutItemProps,
  Masonry,
  type MasonryProps,
  Reflow,
  type ReflowProps,
  TabIndicator,
  type TabIndicatorProps,
  useLayoutGroup,
  useLayoutItem,
} from "./react.js";

/** Every layout definition in catalogue order (L01–L07, L09, L10; L08 is `<Presence>`), for registries. */
export const layoutEffects: readonly AnyEffectDefinition[] = /* @__PURE__ */ Object.freeze([
  flipMove,
  autoHeight,
  listItem,
  sharedLayout,
  gridReflow,
  collapse,
  tabIndicator,
  crossFade,
  masonry,
]);
