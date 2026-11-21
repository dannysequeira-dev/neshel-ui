"use client";
/**
 * Shared React lifecycle for Phase 014 engines (text and SVG effects): creates the engine in a layout
 * effect (before paint, after hydration — server and client markup stay identical), recreates it when the
 * option values or the content key change, destroys it on cleanup (StrictMode safe), and exposes the live
 * control through a stable ref. No React state per frame.
 */
import { type RefObject, useLayoutEffect, useRef } from "react";
import { optionsKeyOf } from "../core/options-key.js";

const useClientLayoutEffect = typeof window === "undefined" ? () => {} : useLayoutEffect;

export function useEngine<E extends Element, C extends { destroy(): void }>(
  ref: RefObject<E | null>,
  create: (element: E) => C,
  options: unknown,
  /** Extra identities that recreate the engine (content, sources); constant length. */
  deps: readonly unknown[] = [],
): RefObject<C | null> {
  const handle = useRef<C | null>(null);
  const latest = useRef(create);
  latest.current = create;
  const key = optionsKeyOf(options);
  // biome-ignore lint/correctness/useExhaustiveDependencies: recreated on option values and content only.
  useClientLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const control = latest.current(element);
    handle.current = control;
    return () => {
      control.destroy();
      if (handle.current === control) handle.current = null;
    };
  }, [key, ...deps]);
  return handle;
}

/** A string (or number) child, or a development error: split effects need plain text. */
export function textOf(component: string, children: unknown): string {
  if (typeof children === "string") return children;
  if (typeof children === "number") return String(children);
  if (
    Array.isArray(children) &&
    children.every((c) => typeof c === "string" || typeof c === "number")
  )
    return children.join("");
  throw new TypeError(
    `[@neshel-ui/animations] ${component}: children must be text (links and other markup are never split).`,
  );
}
