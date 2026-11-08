"use client";
/**
 * Overlay layering shared by Radix and Base UI parts (ADR 0014 §4, research R11/R12,
 * contracts/shell-and-overlays.md "Overlay layering"):
 *
 * - roots register their trigger element (`TriggerContext`);
 * - portal contents copy the nearest `data-neshel-theme` of the trigger (or of the element that
 *   had focus when the content mounted) onto a `display: contents` wrapper;
 * - Radix contents publish their DOM node so Base UI selection popups portal inside them;
 * - Radix layers ignore Escape that belongs to an open selection popup.
 */
import {
  createContext,
  type ReactNode,
  type Ref,
  type RefCallback,
  type RefObject,
  useContext,
  useRef,
  useState,
} from "react";

export const TriggerContext = createContext<RefObject<HTMLElement | null> | null>(null);

/** A ref object for a root to provide through `TriggerContext`. */
export function useTriggerRegistry(): RefObject<HTMLElement | null> {
  return useRef<HTMLElement | null>(null);
}

/** Compose refs (objects and callbacks) into one callback ref. */
export function composeRefs<T>(...refs: Array<Ref<T> | undefined | null>): RefCallback<T> {
  return (node: T | null) => {
    for (const ref of refs) {
      if (typeof ref === "function") ref(node);
      else if (ref && typeof ref === "object") (ref as { current: T | null }).current = node;
    }
  };
}

/** Ref for a trigger part: registers the element with its root and keeps the consumer's ref. */
export function useTriggerRef<T extends HTMLElement>(ref: Ref<T> | undefined): RefCallback<T> {
  const registry = useContext(TriggerContext);
  return composeRefs<T>(ref, registry as Ref<T> | null);
}

function themeOf(element: Element | null | undefined): string | undefined {
  const boundary = element?.closest?.("[data-neshel-theme]");
  return boundary?.getAttribute("data-neshel-theme") ?? undefined;
}

/** The theme name for content opened from the registered trigger (resolved once, on mount). */
export function usePortalTheme(): string | undefined {
  const registry = useContext(TriggerContext);
  const [theme] = useState(() => {
    if (typeof document === "undefined") return undefined;
    return themeOf(registry?.current) ?? themeOf(document.activeElement);
  });
  return theme;
}

/**
 * Theme name re-resolved on every render, for portals whose host component stays mounted while
 * closed (Base UI portals). Closed portals render nothing, so hydration never sees the value.
 */
export function useLivePortalTheme(): string | undefined {
  const registry = useContext(TriggerContext);
  if (typeof document === "undefined") return undefined;
  return themeOf(registry?.current) ?? themeOf(document.activeElement);
}

/** Wrapper rendered inside every portal: carries the theme boundary of the trigger. */
export function PortalTheme({ children }: { children: ReactNode }) {
  const theme = usePortalTheme();
  return (
    <div className="neshel-portal" data-neshel-portal="" data-neshel-theme={theme}>
      {children}
    </div>
  );
}

/** DOM node of the innermost Radix layer content; Base UI popups portal into it. */
export const LayerContainerContext = createContext<HTMLElement | null>(null);

/** State + callback ref for a Radix content element published through `LayerContainerContext`. */
export function useLayerContainer(): [HTMLElement | null, RefCallback<HTMLElement>] {
  const [node, setNode] = useState<HTMLElement | null>(null);
  return [node, setNode as RefCallback<HTMLElement>];
}

export const SELECTION_POPUP_ATTRIBUTE = "data-neshel-selection-popup";

/** Whether an Escape keydown belongs to an open selection control inside the layer. */
export function isSelectionEscape(event: KeyboardEvent): boolean {
  const target = event.target;
  if (!(target instanceof Element)) return false;
  return (
    target.closest(`[${SELECTION_POPUP_ATTRIBUTE}]`) !== null ||
    target.matches('[role="combobox"][aria-expanded="true"]')
  );
}

/** Radix `onEscapeKeyDown` that leaves selection Escape to the selection control. */
export function guardEscape(
  handler: ((event: KeyboardEvent) => void) | undefined,
): (event: KeyboardEvent) => void {
  return (event) => {
    if (isSelectionEscape(event)) event.preventDefault();
    handler?.(event);
  };
}
