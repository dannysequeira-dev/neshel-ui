/**
 * WAAPI driver (ADR 0023; contracts/controllers.md §4). Exclusive channels only: a browser animation
 * on `transform`/`opacity` would override the composed inline values of other effects.
 * The channel is claimed through the element's motion host (arbitration + conflict policy); on
 * completion the final keyframe is committed as the new baseline and the browser animation is
 * cancelled (no fill-forever); on cancel/interruption the captured inline value is restored.
 */

import { type ConflictPolicy, releaseChannels, requestChannels } from "./arbiter.js";
import {
  type ControlOptions,
  createRunCore,
  type MotionResult,
  resolveDuration,
  resolveSpringPreset,
  type Transition,
  type TweenControl,
} from "./controls.js";
import { resolveEasing, springEasing, toCssEasing } from "./easing.js";
import { NeshelAnimationsError } from "./errors.js";
import { type Claim, type ExclusiveChannel, getMotionHost, isExclusiveChannel } from "./host.js";
import {
  prefersReducedMotion,
  shouldReduceMotion,
  subscribeReducedMotion,
} from "./reduced-motion.js";

export interface AnimateElementOptions extends ControlOptions {
  effectId: string;
  priority?: number;
  conflicts?: ConflictPolicy;
}

const camel = (property: string) =>
  property.startsWith("--")
    ? property
    : property.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());

type Animated = Element & {
  readonly style: CSSStyleDeclaration;
  animate?: (keyframes: Keyframe[], options: KeyframeAnimationOptions) => Animation;
};

export function animateElement(
  element: Animated,
  channel: ExclusiveChannel,
  keyframes: readonly string[],
  transition: Transition = { type: "tween" },
  options: AnimateElementOptions,
): TweenControl {
  if (!isExclusiveChannel(channel)) {
    throw new NeshelAnimationsError(
      `[@neshel-ui/animations] animateElement: "${String(channel)}" is not an exclusive channel (transform and opacity use motion values).`,
    );
  }
  if (!Array.isArray(keyframes) || keyframes.length < 2) {
    throw new NeshelAnimationsError(
      "[@neshel-ui/animations] animateElement: at least two keyframes are required.",
    );
  }
  const core = createRunCore();
  const host = getMotionHost(element);
  const last = keyframes[keyframes.length - 1] as string;
  const first = keyframes[0] as string;
  let duration: number;
  let easing: string;
  let delay = 0;
  if (transition.type === "spring") {
    const sampled = springEasing(resolveSpringPreset(transition.spring));
    duration = sampled.duration;
    easing = sampled.easing;
  } else {
    duration = resolveDuration(transition.duration);
    easing = toCssEasing(resolveEasing(transition.easing));
    delay = Math.max(0, transition.delay ?? 0);
  }
  let animation: Animation | undefined;
  let granted = false;

  const progressOf = () => {
    const time = Number(animation?.currentTime ?? 0) - delay;
    return duration === 0
      ? core.direction === "forward"
        ? 1
        : 0
      : Math.min(1, Math.max(0, time / duration));
  };

  let unsubscribeReduced: (() => void) | undefined;

  function teardown(): void {
    unsubscribeReduced?.();
    unsubscribeReduced = undefined;
    if (animation) {
      animation.onfinish = null;
      animation.cancel();
      animation = undefined;
    }
  }
  function settle(status: MotionResult["status"], value: number): void {
    teardown();
    granted = false;
    releaseChannels(host, claim); // also drops a waiting (suspended) request
    core.settle(status, value);
  }

  const claim: Claim = {
    id: options.effectId,
    priority: options.priority ?? 0,
    channels: [channel],
    onGrant: () => {
      granted = true;
      begin();
    },
    onRevoke: () => {
      granted = false;
      settle("interrupted", progressOf());
    },
  };

  function complete(): void {
    // Only the owner may commit: a suspended (or never granted) run must not touch the channel.
    if (!granted) {
      settle("interrupted", progressOf());
      return;
    }
    const end = core.direction === "forward" ? last : first;
    host.commit(channel, end);
    settle("completed", core.direction === "forward" ? 1 : 0);
  }

  function begin(): void {
    if (core.state !== "running") return;
    if (shouldReduceMotion(options.reducedMotion ?? "user", prefersReducedMotion())) {
      complete();
      return;
    }
    if (typeof element.animate !== "function") {
      // No WAAPI: same outcome as reduced motion (final state, completed).
      complete();
      return;
    }
    try {
      const property = camel(channel);
      animation = element.animate(
        keyframes.map((value) => ({ [property]: value }) as Keyframe),
        { duration, easing, delay, fill: "both" },
      );
      if (core.direction === "reverse") animation.reverse();
      animation.onfinish = () => complete();
      // Live preference change: a switch to reduced motion finishes the run immediately (§5).
      unsubscribeReduced = subscribeReducedMotion((reduced) => {
        const active = core.state === "running" || core.state === "paused";
        if (active && shouldReduceMotion(options.reducedMotion ?? "user", reduced)) complete();
      });
    } catch (error) {
      teardown();
      granted = false;
      releaseChannels(host, claim);
      core.fail(error);
    }
  }

  function start(): void {
    core.state = "running";
    granted = requestChannels(host, claim, options.conflicts);
    if (granted) begin();
  }

  const settled = () => ["completed", "cancelled", "interrupted", "failed"].includes(core.state);

  const control: TweenControl = {
    get state() {
      return core.state;
    },
    get finished() {
      return core.finished;
    },
    play() {
      if (core.state === "running" || core.state === "failed") return;
      if (core.state === "paused" && animation) {
        core.state = "running";
        animation.play();
        return;
      }
      if (settled()) core.newRun();
      start();
    },
    pause() {
      if (core.state !== "running") return;
      core.state = "paused";
      animation?.pause();
    },
    reverse() {
      core.direction = core.direction === "forward" ? "reverse" : "forward";
      if ((core.state === "running" || core.state === "paused") && animation) {
        const state = core.state;
        animation.reverse();
        if (state === "paused") animation.pause();
        return;
      }
      if (core.state === "failed") return;
      if (settled()) core.newRun();
      start();
    },
    finish() {
      if (settled()) return;
      complete();
    },
    cancel() {
      if (settled()) return;
      settle("cancelled", progressOf());
    },
    seek(target) {
      if (core.state === "failed") return;
      const p = Math.min(1, Math.max(0, Number.isFinite(target) ? target : 0));
      if (settled()) {
        core.newRun();
        core.state = "running";
        granted = requestChannels(host, claim, options.conflicts);
        if (granted) begin();
        core.state = "paused";
        animation?.pause();
      }
      if (animation) animation.currentTime = delay + p * duration;
    },
  };
  start();
  return control;
}
