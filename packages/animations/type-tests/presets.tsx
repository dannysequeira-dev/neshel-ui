// Positive type fixtures for Phase 010 presets and primitives (pnpm typecheck).
import { useRef } from "react";
import { attachPreset, definePreset, type EffectPreset } from "../src/core/index.js";
import {
  clipReveal,
  type FadeSlideOptions,
  fadeSlide,
  fadeUp,
  Reveal,
  Stagger,
  springIn,
} from "../src/entrance/index.js";
import { glow, Hover, lift, spotlight, Tilt3D } from "../src/hover/index.js";
import {
  burst,
  CheckboxDraw,
  ContentSwap,
  NumberTick,
  Press,
  pressScale,
  ripple,
  ToggleMorph,
} from "../src/press/index.js";

const fadeFar: EffectPreset<FadeSlideOptions, unknown> = definePreset("fade-far", fadeSlide, {
  direction: "left",
  distance: 64,
});
const softGlow = definePreset("soft-glow", glow, { color: "hotpink", size: 2 });
attachPreset(document.body, fadeUp, { distance: 8 });
attachPreset(document.body, clipReveal, { shape: "circle" });

export function Gallery() {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <>
      <Reveal
        preset={fadeUp}
        options={{ distance: 24, delay: 100 }}
        replayKey={1}
        appear="always"
      />
      <Reveal preset={fadeFar} className="hero" />
      <Reveal preset={springIn} options={{ spring: "gentle", direction: "down" }} asChild>
        <section>Hello</section>
      </Reveal>
      <Stagger preset={fadeUp} interval={40} order="center" onFinish={(status) => status}>
        <p>a</p>
      </Stagger>
      <Hover preset={lift} options={{ distance: 6, pointerTypes: ["mouse", "touch"] }} ref={ref} />
      <Hover preset={[lift, softGlow, spotlight]} asChild conflicts="error">
        <a href="/x">x</a>
      </Hover>
      <Press preset={pressScale} options={{ scale: 0.94 }} onClick={() => {}} />
      <Press preset={[pressScale, ripple]} asChild>
        <button type="button">Buy</button>
      </Press>
      <Press preset={burst} options={{ trigger: 3, colors: ["gold"] }} />
      <Tilt3D asChild>
        <div />
      </Tilt3D>
      <button type="button" role="switch" aria-checked={true}>
        <ToggleMorph checked spring="bouncy" />
      </button>
      <CheckboxDraw checked={false} indeterminate duration="fast" />
      <NumberTick value={42} locale="de-DE" formatOptions={{ style: "percent" }} live="polite" />
      <ContentSwap active confirm={<span>Copied</span>}>
        Copy
      </ContentSwap>
    </>
  );
}
