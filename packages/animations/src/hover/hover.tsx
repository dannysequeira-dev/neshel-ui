"use client";
/**
 * `<Hover>` (Phase 010): hover & pointer effects on a `<div>` or, with `asChild`, your own element.
 * `preset={lift}` (+ `options`) or `preset={[lift, glow]}`. Server markup is the element with the
 * `neshel-hover` class; effects attach after hydration. Decor effects need `@neshel-ui/animations/hover.css`.
 */
import type { ReactNode } from "react";
import {
  type EffectHostProps,
  type EffectPrimitiveProps,
  useEffectPrimitive,
} from "../react/effect-primitive.js";
import { type CursorFollowerOptions, cursorFollower } from "./cursor-follower.js";

export type HoverProps<Options, Resolved> = EffectPrimitiveProps<Options, Resolved>;

export function Hover<Options, Resolved>(props: HoverProps<Options, Resolved>) {
  return useEffectPrimitive("Hover", ["hover"], "neshel-hover", props);
}

export interface CursorFollowerProps
  extends Omit<EffectHostProps, "children">,
    CursorFollowerOptions {
  children?: ReactNode;
}

/**
 * H11 `<CursorFollower>`: a decorative dot follows the pointer inside the area (mouse/pen; off for reduced
 * motion). Needs `@neshel-ui/animations/hover.css`.
 */
export function CursorFollower(props: CursorFollowerProps) {
  const { size, blend, spring, reducedMotion, disabled, pointerTypes, ...rest } = props;
  return useEffectPrimitive("CursorFollower", ["hover"], "neshel-hover", {
    ...rest,
    preset: cursorFollower,
    options: { size, blend, spring, reducedMotion, disabled, pointerTypes },
  });
}
