/**
 * E10 — Staggered children (catalogue §1, structure G; contracts/effects-010.md §1).
 *
 * Attached to a container, it attaches one entrance (definition or preset) to each element child with an
 * increasing delay, through the full engine (each child has its own motion host, so children keep
 * composing with their own effects). The total stagger is capped (`maxStagger`) so no child waits long
 * hidden. Children present when the effect is attached (or replayed) are animated; children added later
 * are not (list enter/exit is L03, Phase 012).
 */
import type { MotionResult } from "../core/controls.js";
import { attachEffect, defineEffect, type EffectHandle } from "../core/effect.js";
import { type PresetInput, resolvePreset } from "../core/preset.js";
import type { ReducedMotion } from "../core/reduced-motion.js";
import { validator } from "../core/validate.js";
import type { EntranceOptions } from "./factory.js";

export type StaggerOrder = "start" | "end" | "center";

export interface StaggerOptions<Options extends EntranceOptions = EntranceOptions> {
  /** Entrance applied to every child (an entrance definition or preset). */
  // biome-ignore lint/suspicious/noExplicitAny: any entrance definition (its resolved type is internal).
  preset: PresetInput<Options, any>;
  /** Options merged over the preset's options for every child (except `delay`, `appear`, `replay`). */
  options?: Partial<Options>;
  /** Delay between consecutive children in ms (0–1000, default 60). */
  interval?: number;
  /** Which child starts first (default `"start"`). */
  order?: StaggerOrder;
  /** Upper bound of the total stagger in ms; the interval shrinks to fit (0–3000, default 900). */
  maxStagger?: number;
  /** Delay before the first child, in ms (0–5000, default 0). */
  delay?: number;
  reducedMotion?: ReducedMotion;
  appear?: boolean;
  replay?: string | number | boolean;
  /** Called once when every child's run has settled (with the last status). */
  onFinish?: (status: MotionResult["status"]) => void;
}

interface ResolvedStagger {
  // biome-ignore lint/suspicious/noExplicitAny: see StaggerOptions.preset.
  preset: PresetInput<any, any>;
  options: Partial<EntranceOptions>;
  interval: number;
  order: StaggerOrder;
  maxStagger: number;
  delay: number;
  reducedMotion: ReducedMotion;
  appear: boolean;
  replay: string | number | boolean | undefined;
  onFinish: ((status: MotionResult["status"]) => void) | undefined;
}

const v = /* @__PURE__ */ validator("stagger");

/** Delay rank of child `index` of `count` for an order. */
export function staggerRank(index: number, count: number, order: StaggerOrder): number {
  if (order === "end") return count - 1 - index;
  if (order === "center") return Math.abs(index - (count - 1) / 2);
  return index;
}

export const stagger = /* @__PURE__ */ defineEffect<StaggerOptions, ResolvedStagger>({
  id: "entrance/stagger",
  family: "entrance",
  channels: [],
  priority: 0,
  reducedMotion: "fade",
  resolve(input) {
    const o = v.options(input) as Partial<StaggerOptions>;
    if (!o.preset) v.fail('"preset" is required (an entrance definition or preset).');
    const resolved = resolvePreset(o.preset as PresetInput<unknown, unknown>);
    const effect = resolved.effect;
    if (effect?.family !== "entrance" || effect.id === "entrance/stagger") {
      v.fail(`"preset" must be an entrance effect other than stagger (received ${effect?.id}).`);
    }
    const options = v.options(o.options) as Partial<EntranceOptions>;
    effect.resolve({ ...(resolved.options as object), ...options });
    return {
      preset: o.preset as PresetInput<unknown, unknown>,
      options,
      interval: v.number("interval", o.interval, 60, 0, 1000),
      order: v.oneOf("order", o.order, ["start", "end", "center"] as const, "start"),
      maxStagger: v.number("maxStagger", o.maxStagger, 900, 0, 3000),
      delay: v.number("delay", o.delay, 0, 0, 5000),
      reducedMotion: v.reducedMotion(o.reducedMotion),
      appear: v.flag("appear", o.appear, true),
      replay: v.key("replay", o.replay),
      onFinish: v.callback("onFinish", o.onFinish),
    };
  },
  policy: (options) => options.reducedMotion,
  setup(context) {
    let o = context.options;
    let handles: Array<EffectHandle<unknown>> = [];
    let pending = 0;
    let generation = 0;

    function attachChildren(appear: boolean): void {
      for (const handle of handles) handle.destroy();
      handles = [];
      const gen = ++generation;
      const children = [...context.element.children].filter(
        (child): child is HTMLElement => "style" in child,
      );
      const count = children.length;
      const span = Math.max(1, ...children.map((_, index) => staggerRank(index, count, o.order)));
      const interval = count > 1 ? Math.min(o.interval, o.maxStagger / span) : 0;
      pending = appear ? count : 0;
      let last: MotionResult["status"] = "completed";
      const { effect, options: presetOptions } = resolvePreset(o.preset);
      children.forEach((child, index) => {
        const childOptions = {
          ...(presetOptions as object),
          ...o.options,
          delay: o.delay + Math.round(staggerRank(index, count, o.order) * interval),
          reducedMotion: o.options.reducedMotion ?? o.reducedMotion,
          appear,
          onFinish: (status: MotionResult["status"]) => {
            if (gen !== generation) return;
            last = status;
            pending -= 1;
            if (pending === 0) o.onFinish?.(last);
          },
        };
        handles.push(attachEffect(child, effect, childOptions));
      });
      if (appear && count === 0) o.onFinish?.("completed");
    }

    attachChildren(o.appear);
    return {
      update(next) {
        const replay = next.replay !== o.replay;
        o = next;
        if (replay) attachChildren(true);
      },
      pause() {
        for (const handle of handles) handle.pause();
      },
      resume() {
        for (const handle of handles) handle.resume();
      },
      destroy() {
        generation++;
        for (const handle of handles) handle.destroy();
        handles = [];
      },
    };
  },
});
