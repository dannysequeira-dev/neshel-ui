/**
 * Entrance & Reveal effects E01–E09 and E11 (catalogue §1; contracts/effects-010.md §1). Each is a frozen
 * effect definition built by the entrance factory; named presets are option sets of these entries.
 */
import type { SpringPreset } from "../core/defaults.js";
import { definePreset } from "../core/preset.js";
import type { SpringOptions } from "../core/spring.js";
import {
  createEntrance,
  DIRECTIONS,
  type EntranceDirection,
  type EntranceOptions,
  round,
} from "./factory.js";

/** Offset of the start pose for a direction of travel ("up" starts below and moves up). */
function offset(direction: EntranceDirection, distance: number) {
  switch (direction) {
    case "up":
      return { translateY: distance };
    case "down":
      return { translateY: -distance };
    case "left":
      return { translateX: distance };
    default:
      return { translateX: -distance };
  }
}

/** E01 — Fade in. */
export type FadeInOptions = EntranceOptions;
export const fadeIn = /* @__PURE__ */ createEntrance<FadeInOptions, null>({
  id: "entrance/fade",
  name: "fadeIn",
  reducedMotion: "instant",
  resolve: () => null,
  pose: () => ({ opacity: 0 }),
});

/** E02 — Fade + slide. */
export interface FadeSlideOptions extends EntranceOptions {
  /** Direction of travel (default `"up"`). */
  direction?: EntranceDirection;
  /** Travel distance in px (0–200, default 16). */
  distance?: number;
}
export const fadeSlide = /* @__PURE__ */ createEntrance<
  FadeSlideOptions,
  { direction: EntranceDirection; distance: number }
>({
  id: "entrance/fade-slide",
  name: "fadeSlide",
  reducedMotion: "fade",
  resolve: (o, v) => ({
    direction: v.oneOf("direction", o.direction, DIRECTIONS, "up"),
    distance: v.number("distance", o.distance, 16, 0, 200),
  }),
  pose: (x) => ({ opacity: 0, ...offset(x.direction, x.distance) }),
});

/** E03 — Scale in. */
export interface ScaleInOptions extends EntranceOptions {
  /** Start scale (0.3–1, default 0.92). */
  from?: number;
}
export const scaleIn = /* @__PURE__ */ createEntrance<ScaleInOptions, { from: number }>({
  id: "entrance/scale",
  name: "scaleIn",
  reducedMotion: "fade",
  resolve: (o, v) => ({ from: v.number("from", o.from, 0.92, 0.3, 1) }),
  pose: (x) => ({ opacity: 0, scale: x.from }),
});

/** E04 — Zoom out → in (starts larger and settles). */
export interface ZoomInOptions extends EntranceOptions {
  /** Start scale (1–2, default 1.12). */
  from?: number;
}
export const zoomIn = /* @__PURE__ */ createEntrance<ZoomInOptions, { from: number }>({
  id: "entrance/zoom",
  name: "zoomIn",
  reducedMotion: "fade",
  resolve: (o, v) => ({ from: v.number("from", o.from, 1.12, 1, 2) }),
  pose: (x) => ({ opacity: 0, scale: x.from }),
});

/** E05 — Blur in. */
export interface BlurInOptions extends EntranceOptions {
  /** Start blur radius in px (0–40, default 12). */
  amount?: number;
}
export const blurIn = /* @__PURE__ */ createEntrance<BlurInOptions, { amount: number }>({
  id: "entrance/blur",
  name: "blurIn",
  reducedMotion: "fade",
  paint: ["filter"],
  resolve: (o, v) => ({ amount: v.number("amount", o.amount, 12, 0, 40) }),
  pose: () => ({ opacity: 0 }),
  render: (x, t) => ({ filter: `blur(${round(x.amount * (1 - t), 2)}px)` }),
});

/** E06 — Clip reveal (inset from an edge, or a circle from the centre). */
export interface ClipRevealOptions extends EntranceOptions {
  /** `"inset"` (default) or `"circle"`. */
  shape?: "inset" | "circle";
  /** Direction the inset reveal travels (default `"up"`: revealed from the bottom edge upward). */
  direction?: EntranceDirection;
}
export const clipReveal = /* @__PURE__ */ createEntrance<
  ClipRevealOptions,
  { shape: "inset" | "circle"; direction: EntranceDirection }
>({
  id: "entrance/clip",
  name: "clipReveal",
  reducedMotion: "instant",
  paint: ["clip-path"],
  defaults: { easing: "emphasized", duration: "deliberate" },
  resolve: (o, v) => ({
    shape: v.oneOf("shape", o.shape, ["inset", "circle"] as const, "inset"),
    direction: v.oneOf("direction", o.direction, DIRECTIONS, "up"),
  }),
  pose: () => ({}),
  render: (x, t) => {
    if (x.shape === "circle") return { "clip-path": `circle(${round(t * 75, 2)}% at 50% 50%)` };
    const hidden = `${round((1 - t) * 100, 2)}%`;
    const sides = {
      up: `inset(${hidden} 0 0 0)`,
      down: `inset(0 0 ${hidden} 0)`,
      left: `inset(0 0 0 ${hidden})`,
      right: `inset(0 ${hidden} 0 0)`,
    };
    return { "clip-path": sides[x.direction] };
  },
});

/** E07 — Gradient-mask wipe. */
export interface MaskWipeOptions extends EntranceOptions {
  /** Direction of the wipe (default `"right"`: revealed from the left edge). */
  direction?: EntranceDirection;
  /** Width of the soft edge as a percentage of the element (0–100, default 25). */
  softness?: number;
}
const ANGLES: Record<EntranceDirection, number> = { up: 0, right: 90, down: 180, left: 270 };
export const maskWipe = /* @__PURE__ */ createEntrance<
  MaskWipeOptions,
  { direction: EntranceDirection; softness: number }
>({
  id: "entrance/mask-wipe",
  name: "maskWipe",
  reducedMotion: "instant",
  paint: ["mask"],
  defaults: { duration: "deliberate", easing: "standard" },
  resolve: (o, v) => ({
    direction: v.oneOf("direction", o.direction, DIRECTIONS, "right"),
    softness: v.number("softness", o.softness, 25, 0, 100),
  }),
  pose: () => ({}),
  render: (x, t) => {
    const position = t * (100 + x.softness);
    return {
      mask: `linear-gradient(${ANGLES[x.direction]}deg, #000 ${round(position - x.softness, 2)}%, transparent ${round(position, 2)}%)`,
    };
  },
});

/** E08 — Rotate in. */
export interface RotateInOptions extends EntranceOptions {
  /** Start rotation in degrees (-180–180, default -6). */
  angle?: number;
}
export const rotateIn = /* @__PURE__ */ createEntrance<RotateInOptions, { angle: number }>({
  id: "entrance/rotate",
  name: "rotateIn",
  reducedMotion: "fade",
  resolve: (o, v) => ({ angle: v.number("angle", o.angle, -6, -180, 180) }),
  pose: (x) => ({ opacity: 0, rotateZ: x.angle, scale: 0.98 }),
});

/** E09 — Flip in about the X or Y axis (perspective inside the composed transform; no wrapper). */
export interface FlipInOptions extends EntranceOptions {
  /** Rotation axis (default `"x"`). */
  axis?: "x" | "y";
  /** Start angle in degrees (-120–120, default 70). */
  angle?: number;
  /** Perspective distance in px (200–5000, default 800). */
  perspective?: number;
}
export const flipIn = /* @__PURE__ */ createEntrance<
  FlipInOptions,
  { axis: "x" | "y"; angle: number; perspective: number }
>({
  id: "entrance/flip",
  name: "flipIn",
  reducedMotion: "fade",
  defaults: { duration: "deliberate", easing: "emphasized" },
  resolve: (o, v) => ({
    axis: v.oneOf("axis", o.axis, ["x", "y"] as const, "x"),
    angle: v.number("angle", o.angle, 70, -120, 120),
    perspective: v.number("perspective", o.perspective, 800, 200, 5000),
  }),
  pose: (x) => ({
    opacity: 0,
    perspective: x.perspective,
    ...(x.axis === "x" ? { rotateX: x.angle } : { rotateY: x.angle }),
  }),
});

/** E11 — Spring entrance with overshoot (engine spring; interruptible). */
export interface SpringInOptions extends EntranceOptions {
  direction?: EntranceDirection;
  /** Travel distance in px (0–200, default 24). */
  distance?: number;
  /** Start scale (0.3–1, default 0.9). */
  from?: number;
  /** Spring (default `"bouncy"`); replaces `duration`/`easing`. */
  spring?: SpringOptions | SpringPreset;
}
export const springIn = /* @__PURE__ */ createEntrance<
  SpringInOptions,
  { direction: EntranceDirection; distance: number; from: number }
>({
  id: "entrance/spring",
  name: "springIn",
  reducedMotion: "fade",
  spring: "bouncy",
  resolve: (o, v) => ({
    direction: v.oneOf("direction", o.direction, DIRECTIONS, "up"),
    distance: v.number("distance", o.distance, 24, 0, 200),
    from: v.number("from", o.from, 0.9, 0.3, 1),
  }),
  pose: (x) => ({ opacity: 0, scale: x.from, ...offset(x.direction, x.distance) }),
});

/* Named presets (option sets of the entries above). */
export const fadeUp = /* @__PURE__ */ definePreset("fade-up", fadeSlide, { direction: "up" });
export const fadeDown = /* @__PURE__ */ definePreset("fade-down", fadeSlide, { direction: "down" });
export const fadeLeft = /* @__PURE__ */ definePreset("fade-left", fadeSlide, { direction: "left" });
export const fadeRight = /* @__PURE__ */ definePreset("fade-right", fadeSlide, {
  direction: "right",
});
export const clipCircle = /* @__PURE__ */ definePreset("clip-circle", clipReveal, {
  shape: "circle",
});
export const flipX = /* @__PURE__ */ definePreset("flip-x", flipIn, { axis: "x" });
export const flipY = /* @__PURE__ */ definePreset("flip-y", flipIn, { axis: "y" });
