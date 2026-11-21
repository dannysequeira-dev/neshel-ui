/**
 * Text effect base (Phase 014, internal to `./text`; contracts/text-api.md §1, research R5). One progress
 * driver per effect; its value is written as ONE custom property per frame through the Motion Host of the
 * render target — the package-owned visual root of a split, or the consumer's element for token effects
 * (T04, T08). Per-piece values come from `text.css`. Triggers: `visible` (once, IntersectionObserver),
 * `mount`, `manual`, or an external progress source.
 */
import { createChannelWriter } from "../../core/channel.js";
import type { MotionResult } from "../../core/controls.js";
import type { Easing, EasingPreset } from "../../core/easing.js";
import {
  createProgressDriver,
  type ProgressControl,
  type ProgressDriver,
  type ProgressSource,
} from "../../core/progress-driver.js";
import type { ReducedMotion } from "../../core/reduced-motion.js";
import { addToken, FX_ATTRIBUTE, FX_REDUCED_ATTRIBUTE, toggleToken } from "../../core/tokens.js";
import { type Validator, validator } from "../../core/validate.js";
import { counters } from "./debug.js";
import { type SplitGranularity, type SplitText, splitText } from "./split.js";

export type TextTrigger = "visible" | "mount" | "manual";

export interface TextEffectOptions {
  /** ms (0–10000; default per effect). */
  duration?: number;
  easing?: Easing | EasingPreset;
  reducedMotion?: ReducedMotion;
  /** When the effect plays by itself (default `"visible"`). Ignored with `progress`. */
  trigger?: TextTrigger;
  /** Drive the effect from a 0–1 source (`ScrollProgress`, motion value, …) instead of its clock. */
  progress?: ProgressSource;
  onComplete?(result: MotionResult): void;
}

export type { ProgressControl, ProgressSource };

export interface EffectConfig {
  name: string;
  token: string;
  /** Custom property written with the progress. */
  property: string;
  split?: { split: SplitGranularity; locale?: string; maxPieces?: number };
  defaults: { duration: number; easing: Easing | EasingPreset };
  /** Duration from the number of pieces when the consumer gives none (e.g. typewriter speed). */
  durationFor?(pieces: number): number;
  /** Every settlement of a run. */
  onSettle?(result: MotionResult): void;
  /** Static custom properties of the render target, written through its host (restored on destroy). */
  vars?: Record<string, string>;
  /** Extra work on each progress change (attributes on package pieces). */
  render?(progress: number): void;
  /** Called when the reduced-motion state changes (live). */
  onReduced?(reduced: boolean): void;
}

export interface TextEffect {
  readonly control: ProgressControl;
  readonly driver: ProgressDriver;
  readonly split: SplitText | undefined;
  /** Where the progress property is written (visual root or the element). */
  readonly target: HTMLElement | undefined;
  readonly v: Validator;
  readonly destroyed: boolean;
  /** Register cleanup run by `destroy()` (before the split reverts). */
  onDestroy(fn: () => void): void;
}

const round = (value: number) => String(Math.round(value * 10000) / 10000);

export function createTextEffect(
  element: HTMLElement,
  options: TextEffectOptions,
  config: EffectConfig,
): TextEffect {
  const v = validator(config.name);
  if (!element || element.nodeType !== 1 || !element.ownerDocument) {
    v.fail('"element" must be an HTML element.');
  }
  const o = v.options(options);
  let duration = v.duration("duration", o.duration, config.defaults.duration);
  const easing = v.easing(o.easing, "standard");
  const policy = v.reducedMotion(o.reducedMotion);
  const trigger = v.oneOf("trigger", o.trigger, ["visible", "mount", "manual"], "visible");
  const onComplete = v.callback<(result: MotionResult) => void>("onComplete", o.onComplete);
  const source = o.progress;
  if (
    source !== undefined &&
    (typeof source?.get !== "function" || typeof source?.subscribe !== "function")
  ) {
    v.fail('"progress" must be a source with get() and subscribe().');
  }

  const split = config.split ? splitText(element, config.split) : undefined;
  const target = split ? (split.root ?? undefined) : element;
  if (o.duration === undefined && config.durationFor && split) {
    duration = config.durationFor(split.pieces.length);
  }
  const cleanups: Array<() => void> = [];
  let destroyed = false;

  const vars = Object.entries(config.vars ?? {});
  const writer = target
    ? createChannelWriter(target, [config.property, ...vars.map(([name]) => name)], {
        id: `text/${config.token}`,
      })
    : undefined;
  if (target) {
    cleanups.push(addToken(target, FX_ATTRIBUTE, config.token));
    for (const [name, value] of vars) writer?.set(name, value);
  }
  const reducedToken = target ? toggleToken(target, FX_REDUCED_ATTRIBUTE, config.token) : undefined;

  const driver = createProgressDriver({
    duration,
    easing: o.easing === undefined ? config.defaults.easing : easing,
    reducedMotion: policy,
    render(progress) {
      if (destroyed || !target) return;
      writer?.set(config.property, round(progress));
      config.render?.(progress);
    },
    onComplete: onComplete ? (result) => onComplete(result) : undefined,
    onSettle: config.onSettle,
    onReduced(reduced) {
      reducedToken?.(reduced);
      // A waiting (armed) effect must not keep content hidden once motion is reduced.
      if (reduced && !driver.driven && driver.state !== "running" && driver.progress < 1) {
        driver.finish();
      }
      config.onReduced?.(reduced);
    },
  });
  reducedToken?.(driver.reduced());
  counters.effects++;

  if (target) {
    if (source) driver.drive(source);
    else if (trigger !== "manual") {
      // Hidden initial state only now that JavaScript runs (D4): never in SSR markup.
      if (!driver.reduced()) {
        driver.seek(0);
        driver.refresh();
      }
      if (trigger === "mount" || typeof IntersectionObserver !== "function") driver.play();
      else {
        const observer = new IntersectionObserver(
          (entries) => {
            if (entries.some((entry) => entry.isIntersecting)) {
              observer.disconnect();
              driver.play();
            }
          },
          { threshold: 0.15 },
        );
        observer.observe(element);
        cleanups.push(() => observer.disconnect());
      }
    }
  }

  const control: ProgressControl = {
    get state() {
      return driver.state;
    },
    get progress() {
      return driver.progress;
    },
    get finished() {
      return driver.finished;
    },
    play: () => driver.play(),
    pause: () => driver.pause(),
    reverse: () => driver.reverse(),
    finish: () => driver.finish(),
    cancel: () => driver.cancel(),
    seek: (progress) => driver.seek(progress),
    track: (trackOptions) => driver.track(trackOptions),
    drive: (next) => driver.drive(next),
    destroy() {
      if (destroyed) return;
      destroyed = true;
      driver.destroy();
      for (const fn of cleanups.splice(0).reverse()) fn();
      reducedToken?.(false);
      writer?.release();
      split?.revert();
      counters.effects--;
    },
  };

  return {
    control,
    driver,
    split,
    target,
    v,
    get destroyed() {
      return destroyed;
    },
    onDestroy(fn) {
      cleanups.push(fn);
    },
  };
}
