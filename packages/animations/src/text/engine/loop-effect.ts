/**
 * Continuous text effect base (Phase 014, internal to `./text`; research R14): a visibility-gated loop whose
 * time is rendered as custom properties through the target's Motion Host. Finite by default, `Infinity`
 * explicit; never runs under reduced motion (`rest()` shows the static state); paused off-screen and on hidden
 * pages. Trigger `visible`/`mount` plays on creation (the loop itself waits until the element is visible).
 */
import { createChannelWriter } from "../../core/channel.js";
import { createLoop, type LoopEffectControl, loopEffectControl } from "../../core/loop.js";
import type { ReducedMotion } from "../../core/reduced-motion.js";
import { addToken, FX_ATTRIBUTE } from "../../core/tokens.js";
import { type Validator, validator } from "../../core/validate.js";
import { counters } from "./debug.js";
import type { TextTrigger } from "./effect.js";

export type { LoopEffectControl };

export interface LoopTextOptions {
  /** One cycle, ms (default per effect). */
  duration?: number;
  /** Extra cycles (0–1000 or `Infinity`, explicit). */
  repeat?: number;
  reducedMotion?: ReducedMotion;
  /** `visible`/`mount` start the loop on creation (default `"visible"`); `manual` waits for `play()`. */
  trigger?: TextTrigger;
  onComplete?(): void;
}

export interface LoopConfig {
  name: string;
  token: string;
  /** Channels written through the target's host. */
  channels: readonly string[];
  defaults: { duration: number; repeat: number; minDuration?: number };
  /** Static channel values written at creation. */
  vars?: Record<string, string>;
  /** Render at `time` ms; returns channel values (undefined clears). */
  frame(time: number, period: number): Record<string, string | undefined>;
  /** Rest state (stopped/reduced/complete). */
  rest(): Record<string, string | undefined>;
}

export interface LoopTextEffect {
  readonly control: LoopEffectControl;
  readonly v: Validator;
  readonly period: number;
  onDestroy(fn: () => void): void;
}

export function repeatOption(v: Validator, value: unknown, fallback: number): number {
  if (value === Number.POSITIVE_INFINITY) return value;
  return v.number("repeat", value, fallback, 0, 1000);
}

export function createLoopTextEffect(
  target: HTMLElement,
  gate: Element,
  options: LoopTextOptions,
  config: LoopConfig,
): LoopTextEffect {
  const v = validator(config.name);
  const o = v.options(options);
  const period = v.number(
    "duration",
    o.duration,
    config.defaults.duration,
    config.defaults.minDuration ?? 100,
    600_000,
  );
  const repeat = repeatOption(v, o.repeat, config.defaults.repeat);
  const policy = v.reducedMotion(o.reducedMotion);
  const trigger = v.oneOf("trigger", o.trigger, ["visible", "mount", "manual"], "visible");
  const onComplete = v.callback<() => void>("onComplete", o.onComplete);
  const writer = createChannelWriter(
    target,
    [...config.channels, ...Object.keys(config.vars ?? {})],
    {
      id: `text/${config.token}`,
    },
  );
  const cleanups: Array<() => void> = [addToken(target, FX_ATTRIBUTE, config.token)];
  for (const [name, value] of Object.entries(config.vars ?? {})) writer.set(name, value);
  const apply = (values: Record<string, string | undefined>) => {
    for (const [name, value] of Object.entries(values)) writer.set(name, value);
  };
  counters.effects++;
  const loop = createLoop({
    element: gate,
    period,
    repeat,
    reducedMotion: policy,
    render: (time) => apply(config.frame(time, period)),
    rest: () => apply(config.rest()),
    onComplete,
  });
  let destroyed = false;
  const control = loopEffectControl(loop, period, repeat, () => {
    if (destroyed) return;
    destroyed = true;
    loop.destroy();
    for (const fn of cleanups.splice(0).reverse()) fn();
    writer.release();
    counters.effects--;
  });
  if (trigger !== "manual") control.play();
  return {
    control,
    v,
    period,
    onDestroy(fn) {
      cleanups.push(fn);
    },
  };
}
