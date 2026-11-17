"use client";
/**
 * Shared rendering of an effect host element (Phase 010, internal): a `<div>` or, with `asChild`, the
 * single child element through Radix Slot (refs, classes, styles and handlers merged). Invalid `asChild`
 * usage throws the same `NeshelAnimationsError` on the server and the client.
 */
import { Slot } from "@radix-ui/react-slot";
import {
  Children,
  Fragment,
  isValidElement,
  type ReactNode,
  type Ref,
  type RefObject,
  useCallback,
  useRef,
  useSyncExternalStore,
} from "react";
import type { AnyEffectDefinition } from "../core/effect.js";
import { animationsError } from "../core/errors.js";
import { isEffectPreset, type PresetInput } from "../core/preset.js";
import type { PresetEntry } from "./use-motion-presets.js";

function assignRef<T>(ref: Ref<T> | undefined, value: T | null): void {
  if (typeof ref === "function") ref(value);
  else if (ref) (ref as { current: T | null }).current = value;
}

/** A stable callback ref that keeps an internal ref and forwards to the caller's ref. */
export function useHostRef<T extends Element>(
  ref: Ref<T> | undefined,
): [RefObject<T | null>, (node: T | null) => void] {
  const element = useRef<T | null>(null);
  const setRef = useCallback(
    (node: T | null) => {
      element.current = node;
      assignRef(ref, node);
    },
    [ref],
  );
  return [element, setRef];
}

export function renderHost(
  name: string,
  asChild: boolean,
  props: Record<string, unknown>,
  children: ReactNode,
) {
  if (asChild) {
    if (!isValidElement(children) || children.type === Fragment) {
      const count = Children.count(children);
      const received = isValidElement(children)
        ? "a Fragment"
        : count === 1
          ? typeof children
          : `${count} children`;
      throw animationsError(
        name,
        `asChild expects exactly one React element child that accepts a ref and className (received ${received}).`,
      );
    }
    return <Slot {...props}>{children}</Slot>;
  }
  return <div {...props}>{children}</div>;
}

export const joinClass = (base: string, className: unknown) =>
  typeof className === "string" && className ? `${base} ${className}` : base;

// biome-ignore lint/suspicious/noExplicitAny: presets of any option types.
type AnyPresetInput = PresetInput<any, any>;

/** Normalise `preset` (+ single-preset `options`) into attach entries; checks the family. */
export function presetEntries(
  name: string,
  families: readonly string[],
  preset: AnyPresetInput | readonly AnyPresetInput[],
  options: object | undefined,
  extra?: object,
): PresetEntry[] {
  const list = Array.isArray(preset) ? preset : [preset];
  if (list.length === 0) throw animationsError(name, '"preset" must not be empty.');
  if (Array.isArray(preset) && options !== undefined) {
    throw animationsError(name, '"options" applies to a single preset; use definePreset for lists.');
  }
  return list.map((input: AnyPresetInput) => {
    const effect: AnyEffectDefinition | undefined = isEffectPreset(input) ? input.effect : input;
    if (!effect || typeof effect.setup !== "function") {
      throw animationsError(name, '"preset" must be an effect definition or a preset.');
    }
    if (!families.includes(effect.family)) {
      throw animationsError(
        name,
        `"${effect.id}" belongs to the "${effect.family}" family; ${name} accepts ${families.join(", ")} effects.`,
      );
    }
    const base = isEffectPreset(input) ? (input.options as object) : undefined;
    return {
      effect,
      options: base || options || extra ? { ...base, ...options, ...extra } : undefined,
    };
  });
}

const subscribeNothing = () => () => {};

/**
 * `true` when this component instance first rendered while hydrating server markup (or on the
 * server); `false` for client-only mounts. Stable for the instance's lifetime.
 */
export function useFirstRenderHydrating(): boolean {
  const hydrating = useSyncExternalStore(
    subscribeNothing,
    () => false,
    () => true,
  );
  const first = useRef<boolean | null>(null);
  if (first.current === null) first.current = hydrating;
  return first.current;
}
