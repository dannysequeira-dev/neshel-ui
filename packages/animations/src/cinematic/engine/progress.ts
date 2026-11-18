/**
 * Animated progress (Phase 013, internal to `./cinematic`): one motion value driven by the 009 controller
 * (`animateValue`, tween) for effects that open/close or move between poses (covers, letterbox, spotlight,
 * camera, depth of field). Reduced motion is the controller's policy (jump to the end); a new move
 * interrupts the previous one and continues from the current value. `track()` hands the same value to a
 * C01 timeline instead (deterministic, seekable).
 */
import { animateValue, type MotionControl } from "../../core/controls.js";
import type { Easing, EasingPreset } from "../../core/easing.js";
import { type MotionValue, motionValue } from "../../core/motion-value.js";
import type { ReducedMotion } from "../../core/reduced-motion.js";
import type { ValueTrackInput } from "./timeline.js";

export interface MoveOptions {
  /** ms (0–10000; default per effect). */
  duration?: number;
  easing?: Easing | EasingPreset;
}

export interface TrackOptions extends MoveOptions {
  id?: string;
}

export interface AnimatedProgress {
  readonly value: MotionValue;
  move(target: number, options: MoveOptions, defaults: Required<MoveOptions>): MotionControl;
  jump(target: number): void;
  stop(): void;
  track(
    from: number,
    to: number,
    options: TrackOptions,
    defaults: Required<MoveOptions>,
  ): ValueTrackInput;
}

export function createAnimatedProgress(
  initial: number,
  reducedMotion: () => ReducedMotion,
): AnimatedProgress {
  const value = motionValue(initial);
  let control: MotionControl | undefined;
  return {
    value,
    move(target, options, defaults) {
      control?.cancel();
      control = animateValue(
        value,
        target,
        {
          type: "tween",
          duration: options.duration ?? defaults.duration,
          easing: options.easing ?? defaults.easing,
        },
        { reducedMotion: reducedMotion() },
      );
      return control;
    },
    jump(target) {
      control?.cancel();
      control = undefined;
      value.set(target);
    },
    stop() {
      control?.cancel();
      control = undefined;
    },
    track(from, to, options, defaults) {
      return {
        id: options.id,
        value,
        from,
        to,
        duration: options.duration ?? defaults.duration,
        easing: options.easing ?? defaults.easing,
      };
    },
  };
}
