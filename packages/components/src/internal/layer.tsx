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
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

export const TriggerContext = createContext<RefObject<HTMLElement | null> | null>(null);

/** A ref object for a root to provide through `TriggerContext`. */
export function useTriggerRegistry(): RefObject<HTMLElement | null> {
  return useRef<HTMLElement | null>(null);
}

type PopupName = { "aria-label"?: string; "aria-labelledby"?: string };

/** Visible text of a label without decorative content (e.g. Label's aria-hidden "*"). */
function labelText(label: HTMLElement): string {
  const clone = label.cloneNode(true) as HTMLElement;
  for (const hidden of clone.querySelectorAll('[aria-hidden="true"]')) hidden.remove();
  return (clone.textContent ?? "").replace(/\s+/g, " ").trim();
}

/**
 * Accessible name for a selection popup (listbox) taken from its control (feature 006, R3): the
 * control's aria-labelledby, else its aria-label, else the text of its <label> elements.
 */
export function popupNameFrom(element: HTMLElement | null): PopupName {
  if (!element) return {};
  const control = element.matches("input, button")
    ? element
    : (element.querySelector<HTMLElement>("input") ?? element.querySelector<HTMLElement>("button"));
  if (!control) return {};
  const labelledBy = control.getAttribute("aria-labelledby");
  if (labelledBy) return { "aria-labelledby": labelledBy };
  const label = control.getAttribute("aria-label");
  if (label) return { "aria-label": label };
  const labels = (control as HTMLInputElement).labels;
  const text = labels ? Array.from(labels, labelText).filter(Boolean).join(" ") : "";
  return text ? { "aria-label": text } : {};
}

/** The popup's accessible name, read from the registered control after each render (client only). */
export function usePopupName(explicit?: RefObject<HTMLElement | null>): PopupName {
  const context = useContext(TriggerContext);
  const registry = explicit ?? context;
  const [name, setName] = useState<PopupName>({});
  useEffect(() => {
    const next = popupNameFrom(registry?.current ?? null);
    setName((previous) =>
      previous["aria-label"] === next["aria-label"] &&
      previous["aria-labelledby"] === next["aria-labelledby"]
        ? previous
        : next,
    );
  });
  return name;
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

// ---------------------------------------------------------------------------------------------
// Open state and Escape ownership (feature 017, K-15; contracts/overlay-escape.md)
//
// Radix DismissableLayer attaches its Escape listener only to the layer that was the highest at its
// last render, and refreshes that render asynchronously (a `dismissableLayer.update` event followed
// by a state update). Between a nested layer opening (and taking focus) and that render, the outer
// layer still owns Escape, so one Escape dismissed the outer layer and, with it, every nested one.
// Right after a nested layer closes there is also a window in which no layer listens at all.
//
// Neshel keeps its own registry of open layers, updated synchronously in layout effects and ranked
// by the React tree (a layer is never above its own descendants), and decides at event time which
// layer owns an Escape: whichever Radix listener receives the event routes it to that layer, each
// event is handled at most once, and a document listener covers the window with no Radix owner.
// ---------------------------------------------------------------------------------------------

type EscapeHandler = ((event: KeyboardEvent) => void) | undefined;

/** Open state shared by a Neshel layer root and its content. */
export interface LayerRoot {
  open: boolean;
  setOpen(open: boolean): void;
}

export const LayerRootContext = createContext<LayerRoot | null>(null);

interface OpenStateProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/**
 * Controllable open state with Radix semantics (`onOpenChange` only fires on a real change), so a
 * root can close its layer itself. The Radix root is always rendered controlled by this value.
 */
export function useLayerOpenState({ open, defaultOpen, onOpenChange }: OpenStateProps): LayerRoot {
  const [uncontrolled, setUncontrolled] = useState(defaultOpen ?? false);
  const controlled = open !== undefined;
  const value = controlled ? open : uncontrolled;
  const latest = useRef({ value, controlled, onOpenChange });
  latest.current = { value, controlled, onOpenChange };
  const [setOpen] = useState(() => (next: boolean) => {
    const current = latest.current;
    if (next === current.value) return;
    if (!current.controlled) {
      current.value = next;
      setUncontrolled(next);
    }
    current.onOpenChange?.(next);
  });
  return { open: value, setOpen };
}

interface EscapeEntry {
  parent: EscapeEntry | null;
  order: number;
  handle(event: KeyboardEvent): void;
}

const openLayers = new Set<EscapeEntry>();
const handledEscapes = new WeakSet<Event>();
let registrations = 0;

/** The layer that owns Escape: the most recently opened layer with no open descendant layer. */
function topLayer(): EscapeEntry | undefined {
  const ancestors = new Set<EscapeEntry>();
  for (const entry of openLayers) {
    for (let parent = entry.parent; parent; parent = parent.parent) ancestors.add(parent);
  }
  let top: EscapeEntry | undefined;
  for (const entry of openLayers) {
    if (ancestors.has(entry)) continue;
    if (!top || entry.order > top.order) top = entry;
  }
  return top;
}

/** Escape that reached the document while a Neshel layer is open but no Radix layer listened. */
function onUnownedEscape(event: KeyboardEvent): void {
  if (event.key !== "Escape" || event.isComposing) return;
  if (event.defaultPrevented || handledEscapes.has(event) || isSelectionEscape(event)) return;
  const top = topLayer();
  if (!top) return;
  handledEscapes.add(event);
  top.handle(event);
}

function registerLayer(entry: EscapeEntry): () => void {
  entry.order = ++registrations;
  openLayers.add(entry);
  if (openLayers.size === 1) document.addEventListener("keydown", onUnownedEscape);
  return () => {
    openLayers.delete(entry);
    if (openLayers.size === 0) document.removeEventListener("keydown", onUnownedEscape);
  };
}

const EscapeLayerContext = createContext<EscapeEntry | null>(null);

const useIsomorphicLayoutEffect = typeof document === "undefined" ? useEffect : useLayoutEffect;

/**
 * Escape ownership for a Radix layer content rendered inside a Neshel root (`LayerRootContext`).
 * Returns the `onEscapeKeyDown` to give Radix and a provider that makes this layer the parent of the
 * layers rendered inside it. Selection Escape is left to the selection control (as `guardEscape`).
 */
export function useEscapeLayer(onEscapeKeyDown: EscapeHandler) {
  const root = useContext(LayerRootContext);
  const parent = useContext(EscapeLayerContext);
  const latest = useRef({ onEscapeKeyDown, root });
  latest.current = { onEscapeKeyDown, root };
  const [entry] = useState<EscapeEntry>(() => ({
    parent: null,
    order: 0,
    handle(event) {
      const current = latest.current;
      current.onEscapeKeyDown?.(event);
      if (event.defaultPrevented) return;
      event.preventDefault();
      current.root?.setOpen(false);
    },
  }));
  const open = root?.open ?? false;
  useIsomorphicLayoutEffect(() => {
    if (!open) return;
    entry.parent = parent;
    return registerLayer(entry);
  }, [open, parent, entry]);
  const [handler] = useState(() => (event: KeyboardEvent) => {
    if (handledEscapes.has(event)) {
      // Already handled for this keydown by another Neshel layer: never dismiss twice.
      event.preventDefault();
      return;
    }
    handledEscapes.add(event);
    if (isSelectionEscape(event)) {
      event.preventDefault();
      latest.current.onEscapeKeyDown?.(event);
      return;
    }
    const top = topLayer();
    if (top && top !== entry) {
      // Radix delivered Escape to a layer that is no longer the topmost one: route it.
      top.handle(event);
      event.preventDefault();
      return;
    }
    latest.current.onEscapeKeyDown?.(event);
  });
  return { onEscapeKeyDown: handler, entry };
}

/** Provider making `entry` the parent layer of the Neshel layers rendered inside it. */
export function EscapeLayerProvider({
  entry,
  children,
}: {
  entry: EscapeEntry;
  children: ReactNode;
}) {
  return <EscapeLayerContext.Provider value={entry}>{children}</EscapeLayerContext.Provider>;
}

type AutoFocusHandler = ((event: Event) => void) | undefined;

/**
 * Focus restoration for modal layers opened without a Radix trigger (controlled dialogs, the
 * mobile sidebar drawer): records the focused element when the layer opens and focuses the
 * registered trigger, else that element, when it closes (brief §17, §15).
 */
export function useFocusReturn(
  onOpenAutoFocus: AutoFocusHandler,
  onCloseAutoFocus: AutoFocusHandler,
) {
  const registry = useContext(TriggerContext);
  const opener = useRef<HTMLElement | null>(null);
  return {
    onOpenAutoFocus(event: Event) {
      const active = typeof document === "undefined" ? null : document.activeElement;
      opener.current = active instanceof HTMLElement && active !== document.body ? active : null;
      onOpenAutoFocus?.(event);
    },
    onCloseAutoFocus(event: Event) {
      onCloseAutoFocus?.(event);
      if (event.defaultPrevented) return;
      event.preventDefault();
      const trigger = registry?.current;
      const target = trigger?.isConnected ? trigger : opener.current;
      if (target?.isConnected) target.focus();
    },
  };
}
