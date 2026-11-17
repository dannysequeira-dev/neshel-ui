/**
 * Presets (Phase 010; contracts/presets.md, ADR 0025): a preset is a named, frozen option set for one
 * effect definition. Presets are plain values (tree-shakeable, typed); nothing registers at import
 * time. `attachPreset` merges caller overrides over the preset's options and attaches through the full
 * engine (`attachEffect`).
 */
import type { AttachConfig } from "./attach.js";
import { attachEffect, type EffectDefinition, type EffectHandle } from "./effect.js";
import { animationsError } from "./errors.js";

export interface EffectPreset<Options, Resolved> {
  /** Kebab-case preset name, unique within its effect (e.g. `"fade-up"`). */
  readonly name: string;
  readonly effect: EffectDefinition<Options, Resolved>;
  readonly options: Readonly<Options>;
}

/** A definition (default options) or a preset (definition + options). */
export type PresetInput<Options, Resolved> =
  | EffectDefinition<Options, Resolved>
  | EffectPreset<Options, Resolved>;

/** Define a preset; its options are validated by `effect.resolve` now (same error everywhere). */
export function definePreset<Options, Resolved>(
  name: string,
  effect: EffectDefinition<Options, Resolved>,
  options: Options,
): EffectPreset<Options, Resolved> {
  if (typeof name !== "string" || !/^[a-z0-9][a-z0-9-]*$/.test(name)) {
    throw animationsError("definePreset", `invalid preset name ${JSON.stringify(name)}`);
  }
  if (!effect || typeof effect.resolve !== "function" || typeof effect.setup !== "function") {
    throw animationsError("definePreset", `"${name}": effect must be an effect definition`);
  }
  effect.resolve(options);
  return Object.freeze({ name, effect, options: Object.freeze({ ...options }) });
}

export function isEffectPreset<O, R>(input: PresetInput<O, R>): input is EffectPreset<O, R> {
  return typeof (input as EffectPreset<O, R>).effect === "object";
}

/** Definition and merged options of a preset input (overrides win, shallowly). */
export function resolvePreset<Options, Resolved>(
  input: PresetInput<Options, Resolved>,
  overrides?: Partial<Options>,
): { effect: EffectDefinition<Options, Resolved>; options: Options | undefined } {
  if (isEffectPreset(input)) {
    return {
      effect: input.effect,
      options: { ...input.options, ...(overrides ?? {}) } as Options,
    };
  }
  return { effect: input, options: overrides as Options | undefined };
}

/** Attach a preset (or a definition) to an element through the full engine. */
export function attachPreset<Options, Resolved>(
  element: Element & { readonly style: CSSStyleDeclaration },
  input: PresetInput<Options, Resolved>,
  overrides?: Partial<Options>,
  config: AttachConfig = {},
): EffectHandle<Options> {
  const { effect, options } = resolvePreset(input, overrides);
  return attachEffect(element, effect, options, config);
}
