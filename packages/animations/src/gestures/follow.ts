/**
 * G05 `springFollow` and G11 `squashStretch` (catalogue §4; contracts/api-012.md §1). Both are one spring rig
 * (the 010 rig on the 009 integrator) feeding a transform layer: G05 chases motion values the consumer
 * controls, G11 reacts to the velocity published by a drag-like effect on the same element.
 */
import type { SpringPreset } from "../core/defaults.js";
import { type ChannelClaim, defineEffect } from "../core/effect.js";
import type { MotionValue } from "../core/motion-value.js";
import type { ReducedMotion } from "../core/reduced-motion.js";
import type { SpringOptions } from "../core/spring.js";
import { createSpringRig } from "../core/springs.js";
import { validator } from "../core/validate.js";
import { subscribeVelocity } from "./engine/motion-registry.js";
import { isMotionValue } from "./shared.js";

const TRANSFORM: ChannelClaim = { channel: "transform", mode: "compose" };

/** G05 — Spring follow (value chasing). */
export interface SpringFollowOptions {
  /** Horizontal translation to chase (px). */
  x?: MotionValue;
  /** Vertical translation to chase (px). */
  y?: MotionValue;
  /** Scale factor to chase. */
  scale?: MotionValue;
  /** Rotation to chase (degrees). */
  rotate?: MotionValue;
  /** Spring (default `"gentle"`-like 120/18). */
  spring?: SpringOptions | SpringPreset;
  /** Reduced motion jumps to the value (default `"user"`). */
  reducedMotion?: ReducedMotion;
}

interface ResolvedFollow {
  sources: Partial<Record<"x" | "y" | "s" | "r", MotionValue>>;
  spring: Required<SpringOptions>;
  reducedMotion: ReducedMotion;
}

const followV = /* @__PURE__ */ validator("springFollow");

export const springFollow = /* @__PURE__ */ defineEffect<SpringFollowOptions, ResolvedFollow>({
  id: "physics/spring-follow",
  family: "physics",
  channels: [TRANSFORM],
  reducedMotion: "instant",
  resolve(input) {
    const o = followV.options(input);
    const sources: ResolvedFollow["sources"] = {};
    for (const [key, name] of [
      ["x", "x"],
      ["y", "y"],
      ["s", "scale"],
      ["r", "rotate"],
    ] as const) {
      const value = o[name];
      if (value === undefined || value === null) continue;
      if (!isMotionValue(value)) followV.fail(`invalid "${name}"; expected a motion value.`);
      sources[key] = value;
    }
    return {
      sources,
      spring: followV.spring(o.spring, { stiffness: 120, damping: 18 }),
      reducedMotion: followV.reducedMotion(o.reducedMotion),
    };
  },
  policy: (o) => o.reducedMotion,
  setup(context) {
    const read = () => {
      const s = context.options.sources;
      return { x: s.x?.get() ?? 0, y: s.y?.get() ?? 0, s: s.s?.get() ?? 1, r: s.r?.get() ?? 0 };
    };
    const rig = createSpringRig(context.scheduler, read(), context.options.spring, (v) => {
      if (Math.abs(v.x) + Math.abs(v.y) + Math.abs(v.r) + Math.abs(v.s - 1) < 1e-3) {
        context.channels.transform.clear();
      } else {
        context.channels.transform.set({
          translateX: v.x,
          translateY: v.y,
          scale: v.s,
          rotateZ: v.r,
        });
      }
    });
    rig.set(read());
    const chase = () => {
      if (context.reduced) rig.set(read());
      else rig.to(read());
    };
    let unsubscribes: Array<() => void> = [];
    const subscribe = () => {
      for (const off of unsubscribes) off();
      unsubscribes = Object.values(context.options.sources).map((source) =>
        (source as MotionValue).subscribe(chase),
      );
    };
    subscribe();
    let current = context.options.sources;
    const unsubscribeReduced = context.onReducedChange((reduced) => {
      if (reduced) rig.set(read());
    });
    return {
      update(next) {
        rig.setSpring(next.spring);
        if (next.sources !== current) {
          current = next.sources;
          subscribe();
        }
        chase();
      },
      destroy() {
        for (const off of unsubscribes) off();
        unsubscribeReduced();
        rig.stop();
      },
    };
  },
});

/** G11 — Velocity squash & stretch (decorative). */
export interface SquashStretchOptions {
  /** Strength (0–1, default 0.25); the deformation never exceeds 25 %. */
  intensity?: number;
  /** Spring of the deformation (default 400/24). */
  spring?: SpringOptions | SpringPreset;
  /** Decorative: reduced motion turns it off (default `"user"`). */
  reducedMotion?: ReducedMotion;
}

interface ResolvedSquash {
  intensity: number;
  spring: Required<SpringOptions>;
  reducedMotion: ReducedMotion;
}

const squashV = /* @__PURE__ */ validator("squashStretch");

export const squashStretch = /* @__PURE__ */ defineEffect<SquashStretchOptions, ResolvedSquash>({
  id: "physics/squash-stretch",
  family: "physics",
  channels: [TRANSFORM],
  reducedMotion: "off",
  resolve(input) {
    const o = squashV.options(input);
    return {
      intensity: squashV.number("intensity", o.intensity, 0.25, 0, 1),
      spring: squashV.spring(o.spring, { stiffness: 400, damping: 24 }),
      reducedMotion: squashV.reducedMotion(o.reducedMotion),
    };
  },
  policy: (o) => o.reducedMotion,
  setup(context) {
    const rig = createSpringRig(
      context.scheduler,
      { sx: 1, sy: 1 },
      context.options.spring,
      (v) => {
        if (Math.abs(v.sx - 1) + Math.abs(v.sy - 1) < 1e-3) context.channels.transform.clear();
        else context.channels.transform.set({ scaleX: v.sx, scaleY: v.sy });
      },
    );
    const unsubscribe = subscribeVelocity(context.element, (vx, vy) => {
      if (context.reduced) return;
      const speed = Math.max(Math.abs(vx), Math.abs(vy));
      const s = Math.min(0.25, (context.options.intensity * speed) / 1500);
      // Volume-preserving stretch along the dominant axis (axis-aligned; documented).
      const along = 1 + s;
      const across = 1 / along;
      if (s < 1e-3) rig.to({ sx: 1, sy: 1 });
      else if (Math.abs(vx) >= Math.abs(vy)) rig.to({ sx: along, sy: across });
      else rig.to({ sx: across, sy: along });
    });
    const unsubscribeReduced = context.onReducedChange((reduced) => {
      if (reduced) rig.set({ sx: 1, sy: 1 });
    });
    return {
      update(next) {
        rig.setSpring(next.spring);
      },
      destroy() {
        unsubscribe();
        unsubscribeReduced();
        rig.stop();
      },
    };
  },
});
