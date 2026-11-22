/**
 * SVG effect base (Phase 014, internal to `./svg`; contracts/svg-api.md). Since Phase 015 the generic progress
 * effect lives in `src/core/progress-effect.ts` (shared with `./media`); this module binds it to the SVG
 * counters and keeps the Phase 014 names.
 */
import {
  createProgressEffect,
  type ProgressControl,
  type ProgressEffect,
  type ProgressEffectConfig,
  type ProgressEffectOptions,
  type ProgressSource,
  type ProgressTrigger,
} from "../../core/progress-effect.js";
import { counters } from "./debug.js";

export type SvgTrigger = ProgressTrigger;
export type SvgEffectOptions = ProgressEffectOptions;
export type SvgConfig = ProgressEffectConfig;
export type SvgEffect = ProgressEffect;
export type { ProgressControl, ProgressSource };

export function createSvgEffect(
  gate: Element,
  options: SvgEffectOptions,
  config: SvgConfig,
): SvgEffect {
  return createProgressEffect(gate, options, config, counters);
}

/** Elements from an element, a list or a selector inside `scope`. */
export function elementsOf(input: unknown, scope: ParentNode | undefined, name: string): Element[] {
  if (typeof input === "string") {
    if (!scope) throw new TypeError(`${name}: a selector needs a scope element.`);
    return [...scope.querySelectorAll(input)];
  }
  if (input && typeof input === "object" && "nodeType" in input) return [input as Element];
  if (input && typeof (input as Iterable<Element>)[Symbol.iterator] === "function") {
    const list = [...(input as Iterable<Element>)];
    if (list.every((item) => item && item.nodeType === 1)) return list;
  }
  throw new TypeError(`${name}: expected an element, a list of elements or a selector.`);
}
