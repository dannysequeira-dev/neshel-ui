// Engine API type fixtures (009). Each `@ts-expect-error` must be needed.
import { useRef } from "react";
import {
  animateElement,
  animateValue,
  attachEffect,
  createEffectRegistry,
  defineEffect,
  type MotionResult,
  motionValue,
} from "../src/core/index.js";
import { useMotionEffect, useMotionValue } from "../src/index.js";

const glow = defineEffect<{ amount?: number }, { amount: number }>({
  id: "ambient/glow",
  family: "ambient",
  channels: [{ channel: "--neshel-glow", mode: "exclusive" }],
  reducedMotion: "static",
  resolve: (options) => ({ amount: options?.amount ?? 1 }),
  setup: (context) => {
    context.channels.exclusive("--neshel-glow").set(`${context.options.amount}px`);
    return { update() {}, destroy() {} };
  },
});

defineEffect({
  // @ts-expect-error ids are "family/name"
  id: "glow",
  family: "ambient",
  channels: [],
  reducedMotion: "static",
  resolve: () => ({}),
  setup: () => ({ update() {}, destroy() {} }),
});

defineEffect({
  id: "ambient/bad",
  family: "ambient",
  // @ts-expect-error transform is composable, never exclusive
  channels: [{ channel: "transform", mode: "exclusive" }],
  reducedMotion: "static",
  resolve: () => ({}),
  setup: () => ({ update() {}, destroy() {} }),
});

createEffectRegistry([glow]).get("ambient/glow");
const handle = attachEffect(
  document.body,
  glow,
  { amount: 2 },
  { conflicts: "error", priority: 1 },
);
handle.update({ amount: 3 });
// @ts-expect-error unknown conflict policy
attachEffect(document.body, glow, {}, { conflicts: "loud" });

const value = motionValue(0);
const tween = animateValue(value, 1, { type: "tween", duration: "fast", easing: "standard" });
tween.finished.then(
  (result: MotionResult) => result.status satisfies "completed" | "cancelled" | "interrupted",
);
// @ts-expect-error unknown duration preset
animateValue(value, 1, { type: "tween", duration: "slowish" });
animateElement(
  document.body,
  "filter",
  ["none", "blur(2px)"],
  { type: "spring", spring: "gentle" },
  { effectId: "media/blur" },
).seek(0.5);
// @ts-expect-error transform is not an exclusive WAAPI channel
animateElement(document.body, "transform", ["none", "scale(2)"], undefined, {
  effectId: "media/x",
});

export function Hooked() {
  const ref = useRef<HTMLDivElement>(null);
  const handleOrUndefined = useMotionEffect(ref, glow, { amount: 1 });
  handleOrUndefined?.pause();
  useMotionValue(0).set(1);
  return null;
}
