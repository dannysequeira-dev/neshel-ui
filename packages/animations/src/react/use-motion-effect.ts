"use client";
/**
 * `useMotionEffect(ref, definition, options, config)` (contracts/react-bindings.md §2): any effect
 * definition, with composition and exclusive-channel arbitration (`attachEffect`).
 */
import type { RefObject } from "react";
import type { AttachConfig } from "../core/attach.js";
import { attachEffect, type EffectDefinition, type EffectHandle } from "../core/effect.js";
import { useAttachment } from "./use-attachment.js";

export function useMotionEffect<Options, Resolved>(
  ref: RefObject<Element | null>,
  definition: EffectDefinition<Options, Resolved>,
  options?: Options,
  config: AttachConfig = {},
): EffectHandle<Options> | undefined {
  return useAttachment(attachEffect, ref, definition, options, config);
}
