"use client";
/**
 * React bindings of the page-transitions family (Phase 013; contracts/page-transitions.md §7,
 * router-adapters.md §1). When the installed React exports `ViewTransition` (19.3+), boundaries render it
 * with the package classes and React starts the document transition at the real commit of a Transition;
 * otherwise they render plain children (navigation unaffected). React state changes only on navigations.
 */
import * as React from "react";
import {
  type HTMLAttributes,
  type ReactNode,
  type Ref,
  startTransition,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { joinClass, renderHost, useHostRef } from "../react/motion-host.js";
import {
  type PageEffect,
  type PageTransitionOptions,
  startPageTransition,
} from "./engine/controller.js";
import {
  type NavigationDirection,
  type NavigationType,
  trackNavigationDirection,
} from "./engine/direction.js";
import { registerSharedElement } from "./engine/names.js";
import {
  createRouteProgress,
  type RouteProgress as RouteProgressControl,
  type RouteProgressOptions,
} from "./engine/progress.js";

type ViewTransitionComponent = (props: {
  name?: string;
  default?: string;
  enter?: string;
  exit?: string;
  update?: string;
  share?: string;
  children?: ReactNode;
}) => ReactNode;

/** React's `ViewTransition` when this React exports it (19.3+), else `undefined`. */
export function getReactViewTransition(): ViewTransitionComponent | undefined {
  return (React as unknown as { ViewTransition?: ViewTransitionComponent }).ViewTransition;
}
const addTransitionType = (React as unknown as { addTransitionType?: (type: string) => void })
  .addTransitionType;

const useClientLayoutEffect = typeof window === "undefined" ? () => {} : useLayoutEffect;

type DivProps = Omit<HTMLAttributes<HTMLDivElement>, "children"> & {
  ref?: Ref<HTMLDivElement>;
  children?: ReactNode;
};

export interface PageTransitionProps extends DivProps {
  /** Effect of the route content (default `"fade"`). */
  effect?: PageEffect;
  asChild?: boolean;
}

/** Boundary around route content: React `<ViewTransition>` with `neshel-pt-<effect>` (PT01, PT03–PT06). */
export function PageTransition({
  effect = "fade",
  asChild = false,
  children,
  ...rest
}: PageTransitionProps) {
  const ViewTransition = getReactViewTransition();
  const className = `neshel-pt-${effect}`;
  const content = renderHost(
    "PageTransition",
    asChild,
    { ...rest, className: asChild ? rest.className : joinClass("neshel-page", rest.className) },
    children,
  );
  if (!ViewTransition) return content;
  return (
    <ViewTransition default={className} enter={className} exit={className}>
      {content}
    </ViewTransition>
  );
}

interface NamedProps extends DivProps {
  /** Stable name: lowercase letters, digits and hyphens; unique among visible elements. */
  name: string;
  asChild?: boolean;
}

function Named({
  name,
  asChild = false,
  persist,
  children,
  ref,
  ...rest
}: NamedProps & { persist: boolean }) {
  const [element, setRef] = useHostRef<HTMLDivElement>(ref);
  useClientLayoutEffect(() => {
    if (!element.current) return;
    return registerSharedElement(element.current, name, { persist });
  }, [name, persist]);
  const content = renderHost(
    persist ? "PersistentElement" : "SharedElement",
    asChild,
    { ...rest, ref: setRef },
    children,
  );
  const ViewTransition = getReactViewTransition();
  if (!ViewTransition) return content;
  const className = persist ? "neshel-pt-persist" : "neshel-pt-morph";
  return (
    <ViewTransition name={`neshel-${name}`} share={className} default={className}>
      {content}
    </ViewTransition>
  );
}

/** PT02: an element that morphs into the element with the same name on the next route. */
export function SharedElement(props: NamedProps) {
  return <Named {...props} persist={false} />;
}

/** PT08: an element that stays in place (no motion, no cross-fade) while the page changes. */
export function PersistentElement(props: NamedProps) {
  return <Named {...props} persist />;
}

export interface RouteProgressProps extends Omit<DivProps, "children">, RouteProgressOptions {
  /** The router's real pending state. */
  pending: boolean;
  /** The last navigation failed (shown when `pending` turns false). */
  failed?: boolean;
  /** Identity of the current navigation: a new value while still pending restarts the indicator. */
  navigation?: string | number;
}

/** PT07: indeterminate, accessible navigation progress (never a fake percentage). */
export function RouteProgress({
  pending,
  failed = false,
  navigation,
  onTimeout,
  delay,
  minVisible,
  timeout,
  announce,
  labels,
  className,
  ref,
  ...rest
}: RouteProgressProps) {
  const [element, setRef] = useHostRef<HTMLDivElement>(ref);
  const control = useRef<RouteProgressControl | undefined>(undefined);
  const latest = useRef({ pending, failed, onTimeout });
  latest.current = { pending, failed, onTimeout };
  useClientLayoutEffect(() => {
    if (!element.current) return;
    const progress = createRouteProgress(element.current, {
      delay,
      minVisible,
      timeout,
      announce,
      labels,
      onTimeout: () => latest.current.onTimeout?.(),
    });
    control.current = progress;
    if (latest.current.pending) progress.start();
    return () => {
      progress.destroy();
      control.current = undefined;
    };
  }, [delay, minVisible, timeout, announce]);
  const wasPending = useRef(pending);
  const lastNavigation = useRef(navigation);
  // A layout effect, not a passive one (feature 017): when the pending state is committed inside a React view
  // transition (data routers update navigation state in `startTransition`), React runs passive effects only after
  // the transition animation finishes, which showed the indicator ~0.4–0.7 s after the navigation started.
  useClientLayoutEffect(() => {
    const progress = control.current;
    if (!progress) return;
    const restarted = pending && wasPending.current && navigation !== lastNavigation.current;
    if (pending && (!wasPending.current || restarted)) progress.start();
    else if (!pending && wasPending.current) {
      if (failed) progress.fail();
      else progress.done();
    }
    wasPending.current = pending;
    lastNavigation.current = navigation;
  }, [pending, failed, navigation]);
  return (
    <div {...rest} ref={setRef} className={joinClass("neshel-route-progress", className)} hidden />
  );
}

/** PT04: the last navigation's direction (state changes only on navigation). */
export function useNavigationDirection(): { direction: NavigationDirection; type: NavigationType } {
  const [value, setValue] = useState<{ direction: NavigationDirection; type: NavigationType }>({
    direction: "unknown",
    type: "unknown",
  });
  useEffect(() => {
    const tracker = trackNavigationDirection({
      onChange: (direction, type) => setValue({ direction, type }),
    });
    return () => tracker.destroy();
  }, []);
  return value;
}

export interface StartOptions extends PageTransitionOptions {
  /** Force the framework-free controller even when React manages view transitions. */
  native?: boolean;
}

/**
 * Router-free page transitions: `start(update, options)` runs `update` (a state change) inside a React
 * Transition with transition types when React manages view transitions, so React captures the real commit;
 * otherwise inside `startPageTransition`, whose update resolves at the next commit of the component that
 * called this hook (its layout effect) — or after `maxWait`, when the browser stops holding rendering.
 */
export function usePageTransition(): { start(update: () => void, options?: StartOptions): void } {
  const api = useRef<{ start(update: () => void, options?: StartOptions): void } | null>(null);
  const commits = useRef(new Set<() => void>());
  useClientLayoutEffect(() => {
    const waiting = [...commits.current];
    commits.current.clear();
    for (const resolve of waiting) resolve();
  });
  api.current ??= {
    start(update, options = {}) {
      const effect = options.effect ?? "fade";
      const direction =
        options.direction && options.direction !== "auto" ? options.direction : undefined;
      if (getReactViewTransition() && addTransitionType && !options.native) {
        // The effect comes from the <PageTransition> boundaries; an explicit direction is published like the
        // tracker does (it describes the latest navigation and stays until the next one).
        if (direction) document.documentElement.setAttribute("data-neshel-pt-direction", direction);
        startTransition(() => {
          addTransitionType(`neshel-${effect}`);
          if (direction) addTransitionType(`neshel-${direction}`);
          for (const type of options.types ?? []) addTransitionType(type);
          update();
        });
        return;
      }
      startPageTransition(
        () =>
          new Promise<void>((resolve) => {
            // Resolved by the next commit of this component, or after maxWait at the latest.
            const timer = setTimeout(done, options.maxWait ?? 1500);
            function done() {
              clearTimeout(timer);
              commits.current.delete(done);
              resolve();
            }
            commits.current.add(done);
            update();
          }),
        options,
      );
    },
  };
  return api.current;
}

export interface RouteTransitionInput {
  /** Committed location (pathname + search, or a router key). */
  location: string;
  /** The router's real navigation state. */
  pending?: boolean;
  failed?: boolean;
  type?: NavigationType;
  /** After a committed push/replace, focus `[data-neshel-route-focus]` (default `"auto"`). */
  focus?: "auto" | "none";
}

/**
 * Router-independent contract (PT10): coordinates with the COMMITTED location (a layout effect after React
 * committed the new route, never a click), moves focus only after a push/replace commit to an element the
 * application marked, and reports the direction. Never intercepts links or history events.
 */
export function useRouteTransition({ location, type, focus = "auto" }: RouteTransitionInput): {
  direction: NavigationDirection;
} {
  const { direction, type: trackedType } = useNavigationDirection();
  const first = useRef(true);
  const latest = useRef({ type: type ?? trackedType, focus });
  latest.current = { type: type ?? trackedType, focus };
  useClientLayoutEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const current = latest.current;
    if (current.focus === "none" || current.type === "traverse") return;
    const target = document.querySelector<HTMLElement>("[data-neshel-route-focus]");
    if (!target) return;
    if (!target.hasAttribute("tabindex") && target.tabIndex < 0)
      target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });
  }, [location]);
  return { direction };
}
