/**
 * Ambient registry (Phase 015, internal to `./ambient`; research R14, contracts/ambient-api.md §1). Every ambient
 * effect on the page shares ONE IntersectionObserver and ONE `visibilitychange` listener (created on first use,
 * removed with the last effect), and the page-level `ambientMotion` switch — the user pause mechanism of WCAG
 * 2.2.2 rendered by `<AmbientMotionToggle>`.
 */

export const counters = {
  /** Live ambient effects. */
  effects: 0,
  /** Scheduler tasks currently held by ambient effects (JS-driven). */
  ticking: 0,
  /** CSS layers currently marked running. */
  cssRunning: 0,
  /** Shared observers/listeners alive (0 or 1 each). */
  observers: 0,
  visibilityListeners: 0,
  /** Mounted page toggles. */
  toggles: 0,
  /** Canvas frames drawn (cumulative). */
  draws: 0,
};

// --- Shared IntersectionObserver ---------------------------------------------------------------------
const watchers = new Map<Element, Set<(visible: boolean) => void>>();
let observer: IntersectionObserver | undefined;

export function observeVisibility(
  element: Element,
  listener: (visible: boolean) => void,
): () => void {
  if (typeof IntersectionObserver !== "function") return () => {};
  if (!observer) {
    observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        for (const fn of [...(watchers.get(entry.target) ?? [])]) fn(entry.isIntersecting);
      }
    });
    counters.observers = 1;
  }
  let set = watchers.get(element);
  if (!set) {
    set = new Set();
    watchers.set(element, set);
    observer.observe(element);
  }
  set.add(listener);
  return () => {
    const current = watchers.get(element);
    if (!current?.delete(listener)) return;
    if (current.size === 0) {
      watchers.delete(element);
      observer?.unobserve(element);
    }
    if (watchers.size === 0 && observer) {
      observer.disconnect();
      observer = undefined;
      counters.observers = 0;
    }
  };
}

// --- Shared page visibility ---------------------------------------------------------------------------
const pageListeners = new Set<(hidden: boolean) => void>();
const onVisibility = () => {
  for (const fn of [...pageListeners]) fn(document.hidden);
};
export function onPageVisibility(listener: (hidden: boolean) => void): () => void {
  if (typeof document === "undefined") return () => {};
  if (pageListeners.size === 0) {
    document.addEventListener("visibilitychange", onVisibility);
    counters.visibilityListeners = 1;
  }
  pageListeners.add(listener);
  return () => {
    if (!pageListeners.delete(listener)) return;
    if (pageListeners.size === 0) {
      document.removeEventListener("visibilitychange", onVisibility);
      counters.visibilityListeners = 0;
    }
  };
}

// --- Page-level ambient switch ------------------------------------------------------------------------
export interface AmbientMotionSwitch {
  /** Whether the user paused ambient motion for the page. */
  readonly paused: boolean;
  pause(): void;
  resume(): void;
  toggle(): void;
  subscribe(listener: (paused: boolean) => void): () => void;
}

let paused = false;
const switchListeners = new Set<(paused: boolean) => void>();
function setPaused(next: boolean): void {
  if (paused === next) return;
  paused = next;
  for (const fn of [...switchListeners]) fn(paused);
}

/** The page-level ambient switch (shared by every ambient effect and `<AmbientMotionToggle>`). */
export const ambientMotion: AmbientMotionSwitch = {
  get paused() {
    return paused;
  },
  pause: () => setPaused(true),
  resume: () => setPaused(false),
  toggle: () => setPaused(!paused),
  subscribe(listener) {
    switchListeners.add(listener);
    return () => {
      switchListeners.delete(listener);
    };
  },
};

/** A mounted toggle (dev check for infinite effects); returns the unregister. */
export function registerToggle(): () => void {
  counters.toggles++;
  let done = false;
  return () => {
    if (done) return;
    done = true;
    counters.toggles--;
  };
}
