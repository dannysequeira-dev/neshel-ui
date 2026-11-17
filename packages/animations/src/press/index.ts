/**
 * `@neshel-ui/animations/press` — Press & Microinteractions family (Phase 010, catalogue P01–P10).
 * Experimental, private. Ripple, burst, toggle, checkbox and content swap render with the opt-in
 * `@neshel-ui/animations/press.css`.
 */
import type { AnyEffectDefinition } from "../core/effect.js";
import { checkboxDraw, contentSwap, numberTick, toggleMorph } from "./controls.js";
import { burst, nudge, pressScale, ripple, shake, tapBounce } from "./effects.js";

export {
  CheckboxDraw,
  type CheckboxDrawProps,
  ContentSwap,
  type ContentSwapProps,
  NumberTick,
  type NumberTickProps,
  Press,
  type PressProps,
  ToggleMorph,
  type ToggleMorphProps,
} from "./components.js";
export {
  type CheckboxDrawOptions,
  type ContentSwapOptions,
  checkboxDraw,
  contentSwap,
  type NumberTickOptions,
  numberTick,
  type ToggleMorphOptions,
  toggleMorph,
} from "./controls.js";
export {
  type BurstOptions,
  burst,
  type NudgeOptions,
  nudge,
  type PressOptions,
  type PressScaleOptions,
  pressScale,
  type RippleOptions,
  ripple,
  type ShakeOptions,
  shake,
  type TapBounceOptions,
  type TriggerOptions,
  tapBounce,
} from "./effects.js";

/** Every press definition in catalogue order (P01–P10), for explicit registries. */
export const pressEffects: readonly AnyEffectDefinition[] = /* @__PURE__ */ Object.freeze([
  pressScale,
  ripple,
  tapBounce,
  toggleMorph,
  checkboxDraw,
  burst,
  shake,
  nudge,
  numberTick,
  contentSwap,
]);
