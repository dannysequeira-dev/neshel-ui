/**
 * PT04 — Navigation direction (contracts/page-transitions.md §4, research R3).
 *
 * With the Navigation API, every `navigate` event decides the direction from history entry indexes (never
 * from URLs): push → forward, replace/reload → replace, traverse → back or forward by comparing
 * `destination.index` with `currentEntry.index`. The tracker writes `data-neshel-pt-direction` on `<html>`
 * synchronously in the event — before any router updates the DOM — so CSS and React's own view transitions
 * see it. Without the API, routers may call `set()`; otherwise the direction stays `"unknown"` and
 * direction-aware effects use their neutral variant. One shared listener, reference-counted.
 */

export type NavigationDirection = "forward" | "back" | "replace" | "unknown";
export type NavigationType = "push" | "replace" | "traverse" | "reload" | "unknown";

export interface DirectionTracker {
  readonly direction: NavigationDirection;
  readonly type: NavigationType;
  /** Router-provided direction (when the Navigation API is unavailable or the router knows better). */
  set(direction: NavigationDirection, type?: NavigationType): void;
  destroy(): void;
}

export const DIRECTION_ATTRIBUTE = "data-neshel-pt-direction";

interface NavigateEventLike extends Event {
  navigationType?: string;
  destination?: { index?: number };
}

const state = {
  direction: "unknown" as NavigationDirection,
  type: "unknown" as NavigationType,
  refs: 0,
  original: null as string | null,
  listeners: new Set<(direction: NavigationDirection, type: NavigationType) => void>(),
  detach: undefined as (() => void) | undefined,
};

/** The last known direction (without subscribing). */
export function currentDirection(): NavigationDirection {
  return state.direction;
}

function publish(direction: NavigationDirection, type: NavigationType): void {
  state.direction = direction;
  state.type = type;
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute(DIRECTION_ATTRIBUTE, direction);
  }
  for (const listener of [...state.listeners]) listener(direction, type);
}

/** Direction of a navigation from its type and history indexes (exported for tests and the MPA helper). */
export function directionOf(
  type: string | undefined,
  from: number | undefined,
  to: number | undefined,
): { direction: NavigationDirection; type: NavigationType } {
  switch (type) {
    case "push":
      return { direction: "forward", type: "push" };
    case "replace":
      return { direction: "replace", type: "replace" };
    case "reload":
      return { direction: "replace", type: "reload" };
    case "traverse":
      if (typeof from !== "number" || typeof to !== "number" || from < 0 || to < 0 || from === to) {
        return { direction: "unknown", type: "traverse" };
      }
      return { direction: to < from ? "back" : "forward", type: "traverse" };
    default:
      return { direction: "unknown", type: "unknown" };
  }
}

function attach(): void {
  if (typeof window === "undefined") return;
  state.original = document.documentElement.getAttribute(DIRECTION_ATTRIBUTE);
  const navigation = (
    window as {
      navigation?: EventTarget & { currentEntry?: { index?: number } };
    }
  ).navigation;
  if (!navigation || typeof navigation.addEventListener !== "function") return;
  const onNavigate = (event: Event) => {
    const navigate = event as NavigateEventLike;
    const result = directionOf(
      navigate.navigationType,
      navigation.currentEntry?.index,
      navigate.destination?.index,
    );
    publish(result.direction, result.type);
  };
  navigation.addEventListener("navigate", onNavigate);
  state.detach = () => navigation.removeEventListener("navigate", onNavigate);
}

export function trackNavigationDirection(
  options: { onChange?(direction: NavigationDirection, type: NavigationType): void } = {},
): DirectionTracker {
  if (state.refs === 0) attach();
  state.refs++;
  const listener = options.onChange;
  if (listener) state.listeners.add(listener);
  let destroyed = false;
  return {
    get direction() {
      return state.direction;
    },
    get type() {
      return state.type;
    },
    set(direction, type = "unknown") {
      if (!destroyed) publish(direction, type);
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      if (listener) state.listeners.delete(listener);
      state.refs--;
      if (state.refs > 0) return;
      state.detach?.();
      state.detach = undefined;
      state.direction = "unknown";
      state.type = "unknown";
      if (typeof document !== "undefined") {
        if (state.original === null) document.documentElement.removeAttribute(DIRECTION_ATTRIBUTE);
        else document.documentElement.setAttribute(DIRECTION_ATTRIBUTE, state.original);
      }
    },
  };
}
