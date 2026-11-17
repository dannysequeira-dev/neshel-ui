/**
 * Entrance factory (Phase 010; contracts/effects-010.md §1, ADR 0025).
 *
 * Every entrance animates ONE progress motion value (009 controller: tween, or spring for E11) from 0
 * to 1 and renders it through the element's motion host only: a `transform` layer (composes with Tilt3D,
 * hover and press layers), an `opacity` contribution (multiplies with the element's own opacity and
 * other contributions) and, for E05–E07, one exclusive channel (`filter`, `clip-path`, `mask`). At the
 * end every contribution is cleared, so the element is left exactly as it was before (inline styles
 * restored by the ledger). Content is never hidden before the effect is attached: server markup is
 * visible; the from-pose is written in the first write phase after attachment (before paint when the
 * attachment happens in a layout effect).
 *
 * Safety (contracts/accessibility-010.md §1): a hidden page, a reduced-motion "instant" behaviour or a
 * failed/destroyed run always ends at the final, visible state; delays are bounded.
 */
import { animateValue, type MotionControl, type MotionResult } from "../core/controls.js";
import type { DurationPreset, SpringPreset } from "../core/defaults.js";
import type { Easing, EasingPreset } from "../core/easing.js";
import { type ChannelClaim, defineEffect, type EffectDefinition } from "../core/effect.js";
import { pageHidden, watchVisibility } from "../core/interaction.js";
import { clamp, mix } from "../core/interpolate.js";
import { motionValue } from "../core/motion-value.js";
import type { ReducedMotion } from "../core/reduced-motion.js";
import type { SpringOptions } from "../core/spring.js";
import { afterDelay, whenSettled } from "../core/springs.js";
import { type Validator, validator } from "../core/validate.js";

export type EntranceDirection = "up" | "down" | "left" | "right";
export const DIRECTIONS: readonly EntranceDirection[] = ["up", "down", "left", "right"];

/** Options shared by every entrance effect. */
export interface EntranceOptions {
  /** Duration of tween entrances in ms or a `motionDefaults.duration` preset (default 320). */
  duration?: number | DurationPreset;
  /** Delay before the entrance starts, in ms (0–5000, default 0). */
  delay?: number;
  /** Easing of tween entrances (default `"decelerate"`). */
  easing?: Easing | EasingPreset;
  /** Reduced-motion policy (default `"user"`). */
  reducedMotion?: ReducedMotion;
  /**
   * Play when attached (default true). `<Reveal>` sets it to false while hydrating server-rendered
   * markup, so visible content is not hidden again (contracts/accessibility-010.md §1).
   */
  appear?: boolean;
  /** Changing this value replays the entrance from the start. */
  replay?: string | number | boolean;
  /** Called once per run: `"completed"`, `"cancelled"` or `"interrupted"`. */
  onFinish?: (status: MotionResult["status"]) => void;
  /**
   * Phase 011 (scroll triggers): while no run plays, keep the start pose (content hidden until a replay).
   * Ignored when motion is reduced and after `beforeprint`; `<Reveal>` never sets it. Default false.
   */
  hold?: boolean;
  /** Phase 011: `playback: "out"` plays end -> start and then holds the start pose (reverse on leave). Default `"in"`. */
  playback?: "in" | "out";
  /**
   * Phase 012 (presence re-entry): a replay that interrupts a running run continues from the current progress
   * with the remaining fraction of the duration, instead of restarting from the start pose. Default false.
   */
  continuous?: boolean;
}

export interface EntranceCommon {
  duration: number;
  delay: number;
  easing: Easing;
  reducedMotion: ReducedMotion;
  appear: boolean;
  replay: string | number | boolean | undefined;
  onFinish: ((status: MotionResult["status"]) => void) | undefined;
  hold: boolean;
  playback: "in" | "out";
  continuous: boolean;
}

/** Start pose of the entrance; the end pose is the identity. */
export interface EntrancePose {
  opacity?: number;
  translateX?: number;
  translateY?: number;
  scale?: number;
  rotateZ?: number;
  rotateX?: number;
  rotateY?: number;
  perspective?: number;
}

type PaintChannel = "filter" | "clip-path" | "mask";

export interface EntranceSpec<Options extends EntranceOptions, Extra> {
  id: `entrance/${string}`;
  /** Name used in error messages (e.g. `"fadeSlide"`). */
  name: string;
  reducedMotion: "fade" | "instant";
  paint?: readonly PaintChannel[];
  defaults?: { duration?: number | DurationPreset; easing?: EasingPreset };
  /** Spring-driven (E11); `spring` option replaces duration/easing. */
  spring?: SpringOptions | SpringPreset;
  resolve(options: Partial<Options>, v: Validator): Extra;
  pose(extra: Extra): EntrancePose;
  /** Exclusive channel values at progress `t` (0 start … 1 end). */
  render?(extra: Extra, t: number): Partial<Record<PaintChannel, string>>;
}

export type ResolvedEntrance<Extra> = EntranceCommon & {
  extra: Extra;
  spring: Required<SpringOptions> | undefined;
};

const round = (value: number, digits = 3) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

export function resolveCommon(
  options: Partial<EntranceOptions>,
  v: Validator,
  defaults: EntranceSpec<EntranceOptions, unknown>["defaults"] = {},
): EntranceCommon {
  return {
    duration: v.duration("duration", options.duration, defaults.duration ?? "slow"),
    delay: v.number("delay", options.delay, 0, 0, 5000),
    easing: v.easing(options.easing, defaults.easing ?? "decelerate"),
    reducedMotion: v.reducedMotion(options.reducedMotion),
    appear: v.flag("appear", options.appear, true),
    replay: v.key("replay", options.replay),
    onFinish: v.callback("onFinish", options.onFinish),
    hold: v.flag("hold", options.hold, false),
    playback: v.oneOf("playback", options.playback, ["in", "out"] as const, "in"),
    continuous: v.flag("continuous", options.continuous, false),
  };
}

export function createEntrance<Options extends EntranceOptions, Extra>(
  spec: EntranceSpec<Options, Extra>,
): EffectDefinition<Options, ResolvedEntrance<Extra>> {
  const paint = spec.paint ?? [];
  const channels: ChannelClaim[] = [
    { channel: "transform", mode: "compose" },
    { channel: "opacity", mode: "multiply" },
    ...paint.map((channel) => ({ channel, mode: "exclusive" as const })),
  ];
  const v = validator(spec.name);
  return defineEffect<Options, ResolvedEntrance<Extra>>({
    id: spec.id,
    family: "entrance",
    channels,
    priority: 0,
    reducedMotion: spec.reducedMotion,
    resolve(input) {
      const options = v.options(input) as Partial<Options>;
      const common = resolveCommon(options, v, spec.defaults);
      const spring = spec.spring
        ? v.spring((options as { spring?: unknown }).spring, spec.spring)
        : undefined;
      return { ...common, spring, extra: spec.resolve(options, v) };
    },
    policy: (options) => options.reducedMotion,
    setup(context) {
      let o = context.options;
      const progress = motionValue(0);
      let control: MotionControl | undefined;
      let cancelDelay: (() => void) | undefined;
      let cancelWatch: (() => void) | undefined;
      let mode: "full" | "fade" | "none" = "full";
      let runId = 0;
      let destroyed = false;
      /** The start pose is held (Phase 011 `hold` / end of an `"out"` run). */
      let holding = false;
      let running: "in" | "out" = "in";
      let printed = false;
      const exclusive = paint.map(
        (channel) => [channel, context.channels.exclusive(channel)] as const,
      );

      function render(value: number): void {
        if (mode === "none") return;
        const pose = spec.pose(o.extra);
        const t = clamp(value, 0, 1);
        const opacity = mix(pose.opacity ?? (mode === "fade" ? 0 : 1), 1, t);
        if (opacity < 1) context.channels.opacity.set(round(opacity, 4));
        else context.channels.opacity.clear();
        if (mode === "fade") return;
        // Transform parts follow the raw value so a spring may overshoot (E11).
        const layer = {
          perspective: pose.perspective,
          translateX: mix(pose.translateX ?? 0, 0, value),
          translateY: mix(pose.translateY ?? 0, 0, value),
          rotateZ: mix(pose.rotateZ ?? 0, 0, value),
          rotateX: mix(pose.rotateX ?? 0, 0, value),
          rotateY: mix(pose.rotateY ?? 0, 0, value),
          scale: mix(pose.scale ?? 1, 1, value),
        };
        const identity =
          Math.abs(layer.translateX) +
            Math.abs(layer.translateY) +
            Math.abs(layer.rotateX) +
            Math.abs(layer.rotateY) +
            Math.abs(layer.rotateZ) +
            Math.abs(layer.scale - 1) <
          1e-4;
        if (identity) context.channels.transform.clear();
        else context.channels.transform.set(layer);
        if (spec.render) {
          const values = spec.render(o.extra, t);
          for (const [channel, handle] of exclusive) {
            const next = t >= 1 ? undefined : values[channel];
            if (next === undefined) handle.clear();
            else handle.set(next);
          }
        }
      }

      function clearAll(): void {
        context.channels.opacity.clear();
        context.channels.transform.clear();
        for (const [, handle] of exclusive) handle.clear();
      }

      function settle(id: number, status: MotionResult["status"]): void {
        if (id !== runId || destroyed) return;
        control = undefined;
        if (running === "out" && status === "completed" && canHold()) {
          holding = true;
          render(0);
        } else {
          holding = false;
          clearAll();
        }
        o.onFinish?.(status);
      }

      const canHold = () => !context.reduced && !printed;

      /** Keep the start pose without playing (Phase 011 scroll triggers). */
      function holdStart(): void {
        if (!canHold() || control || cancelDelay) return;
        mode = "full";
        holding = true;
        progress.set(0);
        render(0);
      }

      /** Stop holding: the element is shown as it is (no animation). */
      function releaseHold(): void {
        if (!holding || control || cancelDelay) return;
        holding = false;
        clearAll();
      }

      function stopRun(): void {
        runId++;
        cancelDelay?.();
        cancelDelay = undefined;
        cancelWatch?.();
        cancelWatch = undefined;
        const running = control;
        control = undefined;
        running?.cancel();
      }

      function play(direction: "in" | "out" = "in"): void {
        const wasHolding = holding;
        // Phase 012 `continuous`: an interrupted run continues from where it is.
        const from =
          o.continuous && (control || cancelDelay) && mode === "full" ? progress.get() : undefined;
        stopRun();
        const id = runId;
        running = direction;
        if (direction === "out") {
          playOut(id, wasHolding, from);
          return;
        }
        holding = false;
        mode = context.reduced ? (spec.reducedMotion === "instant" ? "none" : "fade") : "full";
        if (mode === "none" || pageHidden()) {
          mode = "none";
          clearAll();
          o.onFinish?.("completed");
          return;
        }
        if (from === undefined) {
          progress.set(0);
          render(0);
        }
        let fired = false;
        const cancel = afterDelay(context.scheduler, from === undefined ? o.delay : 0, () => {
          fired = true;
          cancelDelay = undefined;
          if (id !== runId) return;
          const duration = from === undefined ? o.duration : o.duration * (1 - from);
          const transition =
            o.spring && mode === "full"
              ? ({ type: "spring", spring: o.spring } as const)
              : ({ type: "tween", duration, easing: o.easing } as const);
          control = animateValue(progress, 1, transition, { reducedMotion: "never" });
          watch(id);
        });
        // A zero delay may run the callback synchronously: never keep a stale cancel function.
        if (!fired) cancelDelay = cancel;
      }

      /** Phase 011: animate from the visible state back to the start pose, then hold it. */
      function playOut(id: number, wasHolding: boolean, from?: number): void {
        holding = false;
        if (!canHold()) {
          mode = "none";
          clearAll();
          o.onFinish?.("completed");
          return;
        }
        mode = "full";
        if (wasHolding || pageHidden()) {
          holdStart();
          o.onFinish?.("completed");
          return;
        }
        if (from === undefined) {
          progress.set(1);
          render(1);
        }
        let fired = false;
        const cancel = afterDelay(context.scheduler, 0, () => {
          fired = true;
          cancelDelay = undefined;
          if (id !== runId) return;
          control = animateValue(
            progress,
            0,
            {
              type: "tween",
              duration: from === undefined ? o.duration : o.duration * from,
              easing: o.easing,
            },
            { reducedMotion: "never" },
          );
          watch(id);
        });
        if (!fired) cancelDelay = cancel;
      }

      /** Settle in the write phase of the frame the run ends in (deterministic, unlike a promise). */
      function watch(id: number): void {
        const current = control;
        if (!current) return;
        cancelWatch = whenSettled(context.scheduler, current, (status) => {
          cancelWatch = undefined;
          settle(id, status);
        });
      }

      /** Jump to the final state now (reduced motion switched on, page hidden). */
      function finishNow(): void {
        if (!control && !cancelDelay) {
          if (holding && !canHold()) {
            holding = false;
            clearAll();
          }
          return;
        }
        stopRun();
        const id = runId;
        running = "in";
        progress.set(1);
        settle(id, "completed");
      }

      // Printing never shows held (hidden) content.
      const onBeforePrint = () => {
        printed = true;
        finishNow();
      };
      if (typeof window !== "undefined") window.addEventListener("beforeprint", onBeforePrint);

      const unsubscribeValue = progress.subscribe(render);
      const unsubscribeReduced = context.onReducedChange((reduced) => {
        if (reduced) finishNow();
      });
      const unsubscribeVisibility = watchVisibility(() => {
        if (running === "in") finishNow();
      });
      if (o.appear) play(o.playback);
      else if (o.hold) holdStart();

      return {
        update(next) {
          const replay = next.replay !== o.replay;
          const hold = next.hold !== o.hold;
          o = next;
          if (replay) play(o.playback);
          else if (hold && o.hold) holdStart();
          else if (hold) releaseHold();
        },
        pause() {
          control?.pause();
          cancelWatch?.();
          cancelWatch = undefined;
        },
        resume() {
          if (!control) return;
          control.play();
          watch(runId);
        },
        destroy() {
          if (destroyed) return;
          destroyed = true;
          stopRun();
          unsubscribeValue();
          unsubscribeReduced();
          unsubscribeVisibility();
          if (typeof window !== "undefined")
            window.removeEventListener("beforeprint", onBeforePrint);
          clearAll();
        },
      };
    },
  });
}

export { round };
