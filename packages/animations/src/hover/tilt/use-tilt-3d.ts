"use client";
/**
 * `useTilt3D(ref, options)`: Tilt3D on an element you render yourself (contracts/tilt-3d.md §4).
 * A thin wrapper over the generic `useMotionEffect` (Phase 009).
 */
import type { RefObject } from "react";
import { useMotionEffect } from "../../react/use-motion-effect.js";
import { tilt3D } from "./controller.js";
import type { Tilt3DOptions } from "./options.js";

export function useTilt3D(ref: RefObject<HTMLElement | null>, options: Tilt3DOptions = {}): void {
  useMotionEffect(ref, tilt3D, options);
}
