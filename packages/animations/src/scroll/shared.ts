/**
 * Shared building blocks of the scroll families (Phase 011, internal).
 *
 * `progressEffect(spec)` builds a scroll-family effect driven by a `ScrollProgress`: the shared timeline
 * passed in `timeline` (e.g. a `<ScrollScene>`'s) or one it creates and owns for a subject (the element by
 * default). It draws on every timeline update through the motion host only (spec.render), clears every
 * contribution when the catalogue's reduced behaviour is `static`/`off` and motion is reduced (live), and
 * re-creates its timeline only when timeline options change.
 */

import type { SpringPreset } from "../core/defaults.js";
import {
  type ChannelClaim,
  defineEffect,
  type EffectContext,
  type EffectDefinition,
} from "../core/effect.js";
import { optionsKeyOf } from "../core/options-key.js";
import type { ReducedMotion } from "../core/reduced-motion.js";
import type { SpringOptions } from "../core/spring.js";
import { type Validator, validator } from "../core/validate.js";
import {
  createScrollProgress,
  isScrollProgress,
  type RangeInput,
  type ScrollProgress,
} from "./engine/progress.js";
import type { ScrollAxis } from "./engine/source.js";

/** Options shared by every progress-driven effect. */
export interface ProgressOptions {
  /** A shared timeline (e.g. from `useScrollScene()`); otherwise the effect creates one. */
  timeline?: ScrollProgress;
  /** Range of the effect's own timeline (ignored with `timeline`). */
  range?: readonly [RangeInput, RangeInput];
  /** Scroll container of the effect's own timeline (default: the root scroller). */
  source?: Element | Window | null;
  /** Scroll axis of the effect's own timeline (default `"block"`). */
  scrollAxis?: ScrollAxis;
  /** SP10 spring smoothing of the effect's own timeline. */
  smooth?: boolean | SpringOptions | SpringPreset;
  reducedMotion?: ReducedMotion;
}

export interface ResolvedProgress {
  timeline: ScrollProgress | undefined;
  range: readonly [RangeInput, RangeInput] | undefined;
  source: Element | Window | null | undefined;
  scrollAxis: ScrollAxis;
  smooth: boolean | SpringOptions | SpringPreset | undefined;
  reducedMotion: ReducedMotion;
}

export function resolveProgress(o: Partial<ProgressOptions>, v: Validator): ResolvedProgress {
  if (o.timeline !== undefined && !isScrollProgress(o.timeline)) {
    v.fail('"timeline" must be a ScrollProgress (createScrollProgress / useScrollScene).');
  }
  if (o.range !== undefined && (!Array.isArray(o.range) || o.range.length !== 2)) {
    v.fail('"range" must be [start, end].');
  }
  return {
    timeline: o.timeline,
    range: o.range,
    source: o.source,
    scrollAxis: v.oneOf("scrollAxis", o.scrollAxis, ["block", "inline"] as const, "block"),
    smooth: o.smooth,
    reducedMotion: v.reducedMotion(o.reducedMotion),
  };
}

export interface DrawContext<Extra> {
  readonly context: EffectContext<ResolvedProgress & { extra: Extra }>;
  readonly extra: Extra;
  readonly timeline: ScrollProgress;
}

export interface ProgressEffectSpec<Options extends ProgressOptions, Extra> {
  id: `scroll/${string}` | `scroll-trigger/${string}`;
  name: string;
  channels: readonly ChannelClaim[];
  reducedMotion: "static" | "off" | "instant" | "reduced";
  /** Keep calling `render` while motion is reduced (default: for `reduced`/`instant` behaviours). */
  keepDrawing?: boolean;
  /** Default range of the effect's own timeline. */
  range: readonly [RangeInput, RangeInput];
  /** Subject of the effect's own timeline (default: the element). `null` = whole scroll range. */
  subject?(element: Element, extra: Extra): Element | null;
  resolve(options: Partial<Options>, v: Validator): Extra;
  /** Draw progress `p` (motion not reduced, or reduced behaviour that keeps drawing). */
  render(draw: DrawContext<Extra>, p: number): void;
  /** Remove every contribution (reduced static/off, destroy). */
  clear(draw: DrawContext<Extra>): void;
  /** Optional setup hook (native driver, tokens); returns a cleanup. */
  start?(draw: DrawContext<Extra>, redraw: () => void): (() => void) | undefined;
}

const timelineKey = (o: ResolvedProgress) =>
  optionsKeyOf([o.timeline, o.range, o.source, o.scrollAxis, o.smooth, o.reducedMotion]);

export function progressEffect<Options extends ProgressOptions, Extra>(
  spec: ProgressEffectSpec<Options, Extra>,
): EffectDefinition<Options, ResolvedProgress & { extra: Extra }> {
  const v = validator(spec.name);
  const keepsDrawing =
    spec.keepDrawing ?? (spec.reducedMotion === "reduced" || spec.reducedMotion === "instant");
  return defineEffect<Options, ResolvedProgress & { extra: Extra }>({
    id: spec.id,
    family: spec.id.startsWith("scroll-trigger/") ? "scroll-trigger" : "scroll",
    channels: spec.channels,
    priority: 0,
    reducedMotion: spec.reducedMotion,
    resolve(input) {
      const o = v.options(input) as Partial<Options>;
      return { ...resolveProgress(o, v), extra: spec.resolve(o, v) };
    },
    policy: (options) => options.reducedMotion,
    setup(context) {
      let o = context.options;
      let timeline: ScrollProgress;
      let owned = false;
      let unsubscribe: (() => void) | undefined;
      let stopStart: (() => void) | undefined;
      let key = timelineKey(o);

      const draw = (): DrawContext<Extra> => ({ context, extra: o.extra, timeline });
      const redraw = () => {
        if (context.reduced && !keepsDrawing) spec.clear(draw());
        else spec.render(draw(), timeline.get());
      };

      function connect(): void {
        owned = o.timeline === undefined;
        timeline =
          o.timeline ??
          createScrollProgress({
            source: o.source,
            axis: o.scrollAxis,
            subject: spec.subject ? spec.subject(context.element, o.extra) : context.element,
            range: o.range ?? spec.range,
            smooth: o.smooth,
            reducedMotion: o.reducedMotion,
          });
        unsubscribe = timeline.subscribe(redraw);
        stopStart = spec.start?.(draw(), redraw);
      }
      function disconnect(): void {
        stopStart?.();
        unsubscribe?.();
        if (owned) timeline.destroy();
        stopStart = unsubscribe = undefined;
      }

      connect();
      const stopReduced = context.onReducedChange(redraw);
      return {
        update(next) {
          o = next;
          const nextKey = timelineKey(o);
          if (nextKey !== key) {
            key = nextKey;
            disconnect();
            spec.clear(draw());
            connect();
          } else redraw();
        },
        destroy() {
          stopReduced();
          disconnect();
          spec.clear(draw());
        },
      };
    },
  });
}

export const roundTo = (value: number, digits = 3) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

/** Remember an attribute's original value; returns setter and restore. */
export function attributeWriter(element: Element, name: string) {
  const original = element.getAttribute(name);
  let last: string | null | undefined;
  return {
    set(value: string | null) {
      if (value === last) return;
      last = value;
      if (value === null) element.removeAttribute(name);
      else element.setAttribute(name, value);
    },
    restore() {
      last = undefined;
      if (original === null) element.removeAttribute(name);
      else element.setAttribute(name, original);
    },
  };
}
