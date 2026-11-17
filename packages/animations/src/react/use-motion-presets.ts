"use client";
/**
 * `useMotionPresets(ref, entries, config)` (Phase 010, internal; contracts/presets.md §3): attach several
 * effect definitions/presets to ONE element through the full engine, in order. Options are validated
 * during render (identical errors on the server and the client); attachments happen in a layout effect
 * so an entrance writes its start pose before the first paint of a client-rendered element; option
 * changes call `update` (no re-attach); a change of the effect list re-attaches; unmount destroys in
 * reverse order. No React state, no render per frame.
 */
import { type RefObject, useLayoutEffect, useRef } from "react";
import type { AttachConfig } from "../core/attach.js";
import { type AnyEffectDefinition, attachEffect, type EffectHandle } from "../core/effect.js";
import { optionsKey } from "./use-attachment.js";

export interface PresetEntry {
  readonly effect: AnyEffectDefinition;
  readonly options: unknown;
}

export function useMotionPresets(
  ref: RefObject<Element | null>,
  entries: readonly PresetEntry[],
  config: AttachConfig = {},
): void {
  for (const entry of entries) entry.effect.resolve(entry.options);
  const latest = useRef(entries);
  latest.current = entries;
  const handles = useRef<Array<EffectHandle<unknown>>>([]);
  const attachedKey = useRef<string | undefined>(undefined);
  const structure = entries.map((entry) => entry.effect.id).join("|");
  const key = optionsKey(entries.map((entry) => entry.options));
  const { conflicts, priority, reducedMotion } = config;

  // biome-ignore lint/correctness/useExhaustiveDependencies: `structure` identifies the effect list.
  useLayoutEffect(() => {
    const element = ref.current as (Element & { readonly style: CSSStyleDeclaration }) | null;
    if (!element) return;
    const created: Array<EffectHandle<unknown>> = [];
    try {
      for (const entry of latest.current) {
        created.push(
          attachEffect(element, entry.effect, entry.options, { conflicts, priority, reducedMotion }),
        );
      }
    } catch (error) {
      for (const handle of created.reverse()) handle.destroy();
      throw error;
    }
    handles.current = created;
    attachedKey.current = optionsKey(latest.current.map((entry) => entry.options));
    return () => {
      for (const handle of [...created].reverse()) handle.destroy();
      handles.current = [];
      attachedKey.current = undefined;
    };
  }, [ref, structure, conflicts, priority, reducedMotion]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: `key` captures every option value.
  useLayoutEffect(() => {
    if (attachedKey.current === undefined || attachedKey.current === key) return;
    attachedKey.current = key;
    handles.current.forEach((handle, index) => {
      handle.update(latest.current[index]?.options);
    });
  }, [key]);
}
