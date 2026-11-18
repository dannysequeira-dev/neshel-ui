/**
 * C06 — Title sequence: staggered lines + background (catalogue §7; contracts/cinematic-api.md).
 *
 * A timeline builder: one effect track per line (a drivable Entrance definition or preset, passed as a
 * value — families never import each other) offset by `interval`, plus one background pose track. Lines are
 * the consumer's own elements (a heading, paragraphs): no text splitting here (Phase 014). Reduced motion
 * (`fade`): the entrances render their declared reduced behaviour (opacity only) and the background loses
 * its scale, so nothing travels.
 */
import type { PresetInput } from "../core/preset.js";
import {
  prefersReducedMotion,
  type ReducedMotion,
  shouldReduceMotion,
} from "../core/reduced-motion.js";
import { validator } from "../core/validate.js";
import type { Pose, Styled } from "./engine/pose.js";
import type { Timeline, TimelinePosition } from "./engine/timeline.js";

export interface TitleSequenceOptions {
  lines: readonly Element[];
  /** Drivable entrance (definition or preset) for every line. */
  // biome-ignore lint/suspicious/noExplicitAny: entrance definitions of any option types.
  effect: PresetInput<any, any>;
  /** Options merged into the effect's options for every line. */
  options?: object;
  /** ms between line starts (0–1000, default 120). */
  interval?: number;
  background?: Element | null;
  /** Background start pose (default `{ opacity: 0, scale: 1.08 }`); it ends at identity. */
  backgroundFrom?: Pose;
  /** ms (0–10000, default 1200). */
  backgroundDuration?: number;
  /** Where the sequence starts in the timeline (default its current end). */
  at?: TimelinePosition;
  reducedMotion?: ReducedMotion;
}

const v = /* @__PURE__ */ validator("titleSequence");

export function titleSequence(timeline: Timeline, options: TitleSequenceOptions): Timeline {
  const o = v.options(options) as TitleSequenceOptions;
  if (!Array.isArray(o.lines)) v.fail('"lines" must be an array of elements.');
  if (!o.effect) v.fail('"effect" is required.');
  const interval = v.number("interval", o.interval, 120, 0, 1000);
  const backgroundDuration = v.number("backgroundDuration", o.backgroundDuration, 1200, 0, 10000);
  const reduced = shouldReduceMotion(v.reducedMotion(o.reducedMotion), prefersReducedMotion());
  const start = o.at ?? undefined;
  const label = `title:${timeline.labels.size}`;
  timeline.label(label, start);
  if (o.background) {
    const fromPose = { ...(o.backgroundFrom ?? { opacity: 0, scale: 1.08 }) };
    if (reduced) {
      delete fromPose.scale;
      delete fromPose.x;
      delete fromPose.y;
      delete fromPose.rotate;
    }
    timeline.add(
      {
        id: "title:background",
        target: o.background as Styled,
        from: fromPose,
        to: {},
        duration: backgroundDuration,
        easing: "decelerate",
      },
      label,
    );
  }
  for (const [index, line] of o.lines.entries()) {
    timeline.add(
      { id: `title:line-${index}`, target: line as Styled, effect: o.effect, options: o.options },
      `${label}+=${index * interval}`,
    );
  }
  return timeline;
}
