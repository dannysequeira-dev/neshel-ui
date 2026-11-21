/**
 * SVG effect base (Phase 014, internal to `./svg`; contracts/svg-api.md). The shared progress driver (009
 * tween controller, `track()`, `drive()`, live reduced motion) plus triggers (`visible` once, `mount`,
 * `manual`, external `progress`) and finite repeats that pause while the element is off-screen or the page is
 * hidden. Effects render the progress through host channels and the attribute ledger.
 */
import type { MotionResult } from "../../core/controls.js";
import type { Easing, EasingPreset } from "../../core/easing.js";
import {
  createProgressDriver,
  type ProgressControl,
  type ProgressDriver,
  type ProgressSource,
} from "../../core/progress-driver.js";
import type { ReducedMotion } from "../../core/reduced-motion.js";
import { type Validator, validator } from "../../core/validate.js";
import { counters } from "./debug.js";

export type SvgTrigger = "visible" | "mount" | "manual";

export interface SvgEffectOptions {
  /** ms (0–10000; default per effect). */
  duration?: number;
  easing?: Easing | EasingPreset;
  reducedMotion?: ReducedMotion;
  /** Default `"visible"` (once); ignored with `progress`. */
  trigger?: SvgTrigger;
  /** Drive from a 0–1 source instead of the own clock. */
  progress?: ProgressSource;
  onComplete?(result: MotionResult): void;
}

export type { ProgressControl, ProgressSource };

export interface SvgConfig {
  name: string;
  defaults: { duration: number; easing: Easing | EasingPreset };
  /** Total duration from the resolved per-item duration (e.g. stagger). */
  total?(duration: number): number;
  /** Hidden start state rendered when the effect is armed (default true). */
  arm?: boolean;
  /** Extra repeats (0–1000 or Infinity) and alternation. */
  repeat?: number;
  yoyo?: boolean;
  render(progress: number): void;
  onSettle?(result: MotionResult): void;
}

export interface SvgEffect {
  readonly control: ProgressControl;
  readonly driver: ProgressDriver;
  readonly v: Validator;
  readonly duration: number;
  readonly destroyed: boolean;
  onDestroy(fn: () => void): void;
}

export function createSvgEffect(
  gate: Element,
  options: SvgEffectOptions,
  config: SvgConfig,
): SvgEffect {
  const v = validator(config.name);
  if (!gate || gate.nodeType !== 1) v.fail('"element" must be an element.');
  const o = v.options(options);
  const duration = v.duration("duration", o.duration, config.defaults.duration);
  const easing = o.easing === undefined ? config.defaults.easing : v.easing(o.easing);
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
  const cleanups: Array<() => void> = [];
  let destroyed = false;
  let remaining = config.repeat ?? 0;
  let onScreen = true;
  let wantRun = false;

  const driver: ProgressDriver = createProgressDriver({
    duration: config.total ? config.total(duration) : duration,
    easing,
    reducedMotion: policy,
    render(progress) {
      if (!destroyed) config.render(progress);
    },
    onSettle(result) {
      config.onSettle?.(result);
      if (result.status !== "completed" || destroyed || driver.reduced()) return;
      if (remaining > 0) {
        remaining--;
        if (config.yoyo) driver.reverse();
        else {
          driver.seek(0);
          driver.play();
        }
      } else onComplete?.(result);
    },
    onReduced(reduced) {
      if (reduced && !driver.driven && driver.state !== "running" && driver.progress < 1)
        driver.finish();
    },
  });
  counters.effects++;

  // Repeating effects pause while off-screen or hidden (research R14).
  if ((config.repeat ?? 0) > 0) {
    const sync = () => {
      const visible = onScreen && !(typeof document !== "undefined" && document.hidden);
      if (!visible && driver.state === "running") {
        wantRun = true;
        driver.pause();
      } else if (visible && wantRun) {
        wantRun = false;
        driver.play();
      }
    };
    if (typeof IntersectionObserver === "function") {
      const observer = new IntersectionObserver((entries) => {
        onScreen = entries[entries.length - 1]?.isIntersecting ?? true;
        sync();
      });
      observer.observe(gate);
      cleanups.push(() => observer.disconnect());
    }
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", sync);
      cleanups.push(() => document.removeEventListener("visibilitychange", sync));
    }
  }

  if (source) driver.drive(source);
  else if (trigger !== "manual") {
    if (config.arm !== false && !driver.reduced()) {
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
      observer.observe(gate);
      cleanups.push(() => observer.disconnect());
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
    pause: () => {
      wantRun = false;
      driver.pause();
    },
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
      counters.effects--;
    },
  };
  return {
    control,
    driver,
    v,
    duration,
    get destroyed() {
      return destroyed;
    },
    onDestroy(fn) {
      cleanups.push(fn);
    },
  };
}

/** Elements from an element, a list or a selector inside `scope`. */
export function elementsOf(input: unknown, scope: ParentNode | undefined, name: string): Element[] {
  if (typeof input === "string") {
    if (!scope) throw new TypeError(`${name}: a selector needs a scope element.`);
    return [...scope.querySelectorAll(input)];
  }
  if (input && typeof input === "object" && "nodeType" in input) return [input as Element];
  if (input && typeof (input as Iterable<Element>)[Symbol.iterator] === "function") {
    const list = [...(input as Iterable<Element>)];
    if (list.every((item) => item && item.nodeType === 1)) return list;
  }
  throw new TypeError(`${name}: expected an element, a list of elements or a selector.`);
}
