/**
 * Shared driver of the Phase 010 hover effects (contracts/effects-010.md §2).
 *
 * Interaction state (pointer inside the box, or keyboard focus-visible inside) moves a set of springs on
 * the shared scheduler (one update task, stops at rest); `render` writes the values through the motion
 * host only. Reduced motion (live): values jump instead of animating, and `render` receives
 * `reduced: true` so the effect can drop vestibular parts. `disabled` returns to rest. Touch is opt-in.
 */
import type { SpringPreset } from "../core/defaults.js";
import type { EffectContext } from "../core/effect.js";
import { watchHover } from "../core/interaction.js";
import type { PointerSample } from "../core/pointer.js";
import type { ReducedMotion } from "../core/reduced-motion.js";
import type { SpringOptions } from "../core/spring.js";
import { createSpringRig, type SpringRig } from "../core/springs.js";
import { addToken, FX_ACTIVE_ATTRIBUTE, FX_ATTRIBUTE, toggleToken } from "../core/tokens.js";
import type { Validator } from "../core/validate.js";

export type HoverPointerType = "mouse" | "pen" | "touch";
const POINTER_TYPES: readonly HoverPointerType[] = ["mouse", "pen", "touch"];

/** Options shared by the hover effects. */
export interface HoverOptions {
  /** Pointer types that activate the effect (default mouse and pen; touch is opt-in). */
  pointerTypes?: readonly HoverPointerType[];
  /** Spring of the transition (default `"snappy"`). */
  spring?: SpringOptions | SpringPreset;
  /** Reduced-motion policy (default `"user"`). */
  reducedMotion?: ReducedMotion;
  /** Turn the effect off and return to rest. */
  disabled?: boolean;
}

export interface ResolvedHover {
  pointerTypes: ReadonlySet<string>;
  spring: Required<SpringOptions>;
  reducedMotion: ReducedMotion;
  disabled: boolean;
}

export function resolveHover(
  o: Partial<HoverOptions>,
  v: Validator,
  spring: SpringOptions | SpringPreset = "snappy",
): ResolvedHover {
  const types = o.pointerTypes ?? ["mouse", "pen"];
  if (!Array.isArray(types))
    v.fail(`"pointerTypes" must be an array of ${POINTER_TYPES.join(", ")}.`);
  for (const type of types) v.oneOf("pointerTypes", type, POINTER_TYPES, "mouse");
  return {
    pointerTypes: new Set(types),
    spring: v.spring(o.spring, spring),
    reducedMotion: v.reducedMotion(o.reducedMotion),
    disabled: v.flag("disabled", o.disabled, false),
  };
}

export interface HoverDriver<K extends string> {
  readonly rig: SpringRig<K>;
  readonly active: boolean;
  /** Re-evaluate targets (after an options update). */
  refresh(): void;
  destroy(): void;
}

export interface HoverDriverSpec<K extends string, R extends ResolvedHover> {
  /** Token added to `data-neshel-fx` while granted (CSS hook). */
  token: string;
  /** Also add the shared `decor` token (the `::before` decor layer, hover.css). */
  decor?: boolean;
  /** Mirror the active state into `data-neshel-fx-active` (CSS-only parts such as the sweep). */
  activeToken?: boolean;
  /** Keyboard focus inside activates (default true). */
  focus?: boolean;
  rest: Record<K, number>;
  /** Targets while active. */
  target(options: R, reduced: boolean): Partial<Record<K, number>>;
  render(values: Readonly<Record<K, number>>, options: R, reduced: boolean): void;
  onMove?(sample: PointerSample, options: R, reduced: boolean): void;
  onActiveChange?(active: boolean, options: R, reduced: boolean): void;
}

export function createHoverDriver<K extends string, R extends ResolvedHover>(
  context: EffectContext<R>,
  spec: HoverDriverSpec<K, R>,
): HoverDriver<K> {
  const element = context.element as HTMLElement;
  const options = () => context.options;
  const tokens = [addToken(element, FX_ATTRIBUTE, spec.token)];
  if (spec.decor) tokens.push(addToken(element, FX_ATTRIBUTE, "decor"));
  const activeToken = spec.activeToken
    ? toggleToken(element, FX_ACTIVE_ATTRIBUTE, spec.token)
    : undefined;
  let active = false;
  const rig = createSpringRig(context.scheduler, spec.rest, options().spring, (values) =>
    spec.render(values, options(), context.reduced),
  );

  function refresh(): void {
    const o = options();
    const reduced = context.reduced;
    rig.setSpring(o.spring);
    const on = active && !o.disabled;
    activeToken?.(on);
    const targets = on ? { ...spec.rest, ...spec.target(o, reduced) } : spec.rest;
    if (reduced) rig.set(targets);
    else rig.to(targets);
  }

  const unwatch = watchHover(
    element,
    {
      // Read live so an options update (e.g. enabling touch) applies without re-attaching.
      get pointerTypes() {
        return options().pointerTypes;
      },
      focus: spec.focus !== false,
      onMove: spec.onMove
        ? (sample) => {
            if (!options().disabled) spec.onMove?.(sample, options(), context.reduced);
          }
        : undefined,
    },
    (next) => {
      active = next;
      spec.onActiveChange?.(next && !options().disabled, options(), context.reduced);
      refresh();
    },
  );
  const unsubscribe = context.onReducedChange(() => refresh());
  rig.set(spec.rest);

  return {
    rig,
    get active() {
      return active && !options().disabled;
    },
    refresh,
    destroy() {
      unwatch();
      unsubscribe();
      rig.stop();
      activeToken?.(false);
      for (const remove of tokens) remove();
    },
  };
}

export { fixed, propertyWriter } from "../core/writers.js";
