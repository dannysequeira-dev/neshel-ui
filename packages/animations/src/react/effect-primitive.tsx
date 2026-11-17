"use client";
/**
 * Shared body of the `<Hover>` and `<Press>` primitives (Phase 010; contracts/presets.md §4): one element
 * (or `asChild`) with one preset — `preset={lift}` plus `options` — or several presets composed on the
 * same element — `preset={[lift, glow]}` (options through `definePreset`).
 */
import type { HTMLAttributes, ReactNode, Ref } from "react";
import type { ConflictPolicy } from "../core/arbiter.js";
import type { PresetInput } from "../core/preset.js";
import { joinClass, presetEntries, renderHost, useHostRef } from "./motion-host.js";
import { useMotionPresets } from "./use-motion-presets.js";

export interface EffectHostProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /** Apply the effects to the single child element instead of rendering a `<div>`. */
  asChild?: boolean;
  /** Conflict reporting for exclusive channels (default: warn in development). */
  conflicts?: ConflictPolicy;
  ref?: Ref<HTMLDivElement>;
  children?: ReactNode;
}

/** One preset with typed option overrides. */
export interface SinglePresetProps<Options, Resolved> {
  preset: PresetInput<Options, Resolved>;
  options?: NoInfer<Partial<Options>>;
}

/** Several presets composed on one element (configure each with `definePreset`). */
export interface PresetListProps {
  // biome-ignore lint/suspicious/noExplicitAny: presets of any option types.
  preset: readonly PresetInput<any, any>[];
  options?: undefined;
}

export type EffectPrimitiveProps<Options, Resolved> = EffectHostProps &
  (SinglePresetProps<Options, Resolved> | PresetListProps);

export function useEffectPrimitive<Options, Resolved>(
  name: string,
  families: readonly string[],
  className: string,
  props: EffectPrimitiveProps<Options, Resolved>,
) {
  const {
    preset,
    options,
    asChild = false,
    conflicts,
    className: extra,
    ref,
    children,
    ...rest
  } = props;
  const [element, setRef] = useHostRef(ref);
  useMotionPresets(element, presetEntries(name, families, preset, options), { conflicts });
  return renderHost(
    name,
    asChild,
    { ...rest, ref: setRef, className: joinClass(className, extra) },
    children,
  );
}
