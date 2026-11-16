/**
 * Motion defaults inside Animations (owner decision D5, ADR 0024; contracts/motion-defaults.md).
 * The same values are read by package CSS as `--neshel-motion-*` custom properties with fallbacks;
 * the package never declares those properties globally.
 */
import { easings } from "./easing.js";

export const motionDefaults = Object.freeze({
  duration: Object.freeze({ instant: 0, fast: 120, normal: 200, slow: 320, deliberate: 500 }),
  easing: easings,
  distance: Object.freeze({ sm: 4, md: 8, lg: 16 }),
  spring: Object.freeze({
    gentle: Object.freeze({ stiffness: 120, damping: 20, mass: 1 }),
    snappy: Object.freeze({ stiffness: 300, damping: 30, mass: 1 }),
    bouncy: Object.freeze({ stiffness: 260, damping: 12, mass: 1 }),
  }),
});

export type DurationPreset = keyof typeof motionDefaults.duration;
export type SpringPreset = keyof typeof motionDefaults.spring;
