"use client";
/**
 * `<Hover>` (Phase 010): hover & pointer effects on a `<div>` or, with `asChild`, your own element.
 * `preset={lift}` (+ `options`) or `preset={[lift, glow]}`. Server markup is the element with the
 * `neshel-hover` class; effects attach after hydration. Decor effects need `@neshel-ui/animations/hover.css`.
 */
import { type EffectPrimitiveProps, useEffectPrimitive } from "../react/effect-primitive.js";

export type HoverProps<Options, Resolved> = EffectPrimitiveProps<Options, Resolved>;

export function Hover<Options, Resolved>(props: HoverProps<Options, Resolved>) {
  return useEffectPrimitive("Hover", ["hover"], "neshel-hover", props);
}
