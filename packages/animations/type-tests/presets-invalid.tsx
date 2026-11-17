// Negative type fixtures for Phase 010: each `@ts-expect-error` must be needed (pnpm typecheck).
import { definePreset } from "../src/core/index.js";
import { fadeSlide, fadeUp, Reveal } from "../src/entrance/index.js";
import { glow, Hover, lift } from "../src/hover/index.js";
import { NumberTick, Press, pressScale, ToggleMorph } from "../src/press/index.js";

// @ts-expect-error direction is a closed list
definePreset("bad", fadeSlide, { direction: "diagonal" });

export function Invalid() {
  return (
    <>
      {/* @ts-expect-error options follow the preset's option type */}
      <Reveal preset={fadeUp} options={{ distance: "far" }} />
      {/* @ts-expect-error unknown option of the preset */}
      <Reveal preset={fadeSlide} options={{ angle: 3 }} />
      {/* @ts-expect-error appear is a closed list */}
      <Reveal preset={fadeUp} appear="sometimes" />
      {/* @ts-expect-error lift has no color option */}
      <Hover preset={lift} options={{ color: "red" }} />
      {/* @ts-expect-error options are not accepted with a preset list */}
      <Hover preset={[lift, glow]} options={{ distance: 2 }} />
      {/* @ts-expect-error scale is a number */}
      <Press preset={pressScale} options={{ scale: "small" }} />
      {/* @ts-expect-error checked is required */}
      <ToggleMorph />
      {/* @ts-expect-error value is a number */}
      <NumberTick value="42" />
    </>
  );
}
