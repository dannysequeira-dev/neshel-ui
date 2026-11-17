"use client";
/**
 * Shared React lifecycle for effect attachments (contracts/react-bindings.md §2), parameterised by
 * the attach function so a family hook that only composes (Tilt3D) can avoid bundling the
 * exclusive-channel arbiter. Options are validated during render (identical errors on server and
 * client), the effect attaches after mount, `update` runs when option values change (no re-attach),
 * and the handle is destroyed on unmount. No React state changes per frame.
 */
import { type RefObject, useEffect, useRef, useState } from "react";
import type { AttachConfig } from "../core/attach.js";
import type { EffectDefinition, EffectHandle } from "../core/effect.js";

export type AttachFunction = <Options, Resolved>(
  element: Element & { readonly style: CSSStyleDeclaration },
  definition: EffectDefinition<Options, Resolved>,
  options: Options | undefined,
  config: AttachConfig,
) => EffectHandle<Options>;

/** Stable key of option values; functions and symbols are keyed by type only. */
export function optionsKey(options: unknown): string {
  try {
    return JSON.stringify(options ?? null, (_key, value) =>
      typeof value === "function" || typeof value === "symbol" ? `[${typeof value}]` : value,
    );
  } catch {
    return String(Math.random()); // circular options: update on every render
  }
}

export function useAttachment<Options, Resolved>(
  attach: AttachFunction,
  ref: RefObject<Element | null>,
  definition: EffectDefinition<Options, Resolved>,
  options: Options | undefined,
  config: AttachConfig,
): EffectHandle<Options> | undefined {
  definition.resolve(options);
  const latest = useRef(options);
  latest.current = options;
  const [handle, setHandle] = useState<EffectHandle<Options> | undefined>(undefined);
  const { conflicts, priority, reducedMotion } = config;

  useEffect(() => {
    const element = ref.current as (Element & { readonly style: CSSStyleDeclaration }) | null;
    if (!element) return;
    const attached = attach(element, definition, latest.current, {
      conflicts,
      priority,
      reducedMotion,
    });
    setHandle(attached);
    return () => {
      attached.destroy();
      setHandle(undefined);
    };
  }, [attach, ref, definition, conflicts, priority, reducedMotion]);

  const key = optionsKey(options);
  // biome-ignore lint/correctness/useExhaustiveDependencies: `key` captures every option value.
  useEffect(() => {
    handle?.update(latest.current);
  }, [key, handle]);
  return handle;
}
