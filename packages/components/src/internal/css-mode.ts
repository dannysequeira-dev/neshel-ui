"use client";
/**
 * Reads a responsive mode that CSS decides (ADR 0014 §1): a custom property set by a responsive
 * class (`--neshel-shell-mode`, `--neshel-menu-mode`). `undefined` on the server and before the
 * first effect, so markup never depends on it during hydration.
 */
import { type RefObject, useEffect, useState } from "react";

export type CssMode = "desktop" | "mobile";

export function useCssMode(
  ref: RefObject<HTMLElement | null>,
  property: string,
): CssMode | undefined {
  const [mode, setMode] = useState<CssMode | undefined>(undefined);
  useEffect(() => {
    const read = () => {
      const element = ref.current;
      if (!element) return;
      const value = getComputedStyle(element).getPropertyValue(property).trim();
      setMode(value === "desktop" ? "desktop" : value === "mobile" ? "mobile" : undefined);
    };
    read();
    // Stylesheets injected after mount (development servers) change the value without a resize.
    const frame = requestAnimationFrame(read);
    window.addEventListener("resize", read);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", read);
    };
  }, [ref, property]);
  return mode;
}

/**
 * Click handler that closes a navigation container after a link is activated in the same tab
 * (primary button, no modifier keys, not prevented).
 */
export function closeOnNavigate(close: () => void) {
  return (event: {
    target: EventTarget;
    defaultPrevented: boolean;
    button: number;
    metaKey: boolean;
    ctrlKey: boolean;
    shiftKey: boolean;
    altKey: boolean;
    currentTarget: EventTarget;
  }) => {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    const link = target.closest("a[href]");
    if (link && (event.currentTarget as Element).contains(link)) close();
  };
}
