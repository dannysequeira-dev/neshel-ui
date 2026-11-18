"use client";
/**
 * `@neshel-ui/animations/page-transitions/react-router` — React Router adapter (PT10; router-adapters.md §3).
 * Verified against react-router@8.5.0 (installed type declarations and runtime): data routers
 * (`createBrowserRouter` + `<RouterProvider>`) commit navigation state inside `React.startTransition`, so
 * React's own view transitions (`<PageTransition>` boundaries) capture the real commit — do not also pass
 * React Router's `viewTransition` prop (it starts a second, competing document transition). The adapter adds
 * PT07 progress from the data router's real navigation state (`navigation.state !== "idle"`; declarative
 * routers have no pending state), PT04 direction and focus after commit. Plain `<Link>`s keep every native
 * behaviour: nothing is intercepted.
 */
import { type ReactNode, useContext } from "react";
import { UNSAFE_DataRouterNavigationContext, useLocation, useNavigationType } from "react-router";
import type { RouteProgressOptions } from "./engine/progress.js";
import { RouteProgress, useRouteTransition } from "./react.js";

export interface RouterPageTransitionsProps {
  /** Focus `[data-neshel-route-focus]` after a committed push/replace (default `"auto"`). */
  focus?: "auto" | "none";
  /** Route progress options, or `false` to render none. */
  progress?: RouteProgressOptions | false;
  /** Set by the application when it knows the last navigation failed (error boundary shown). */
  failed?: boolean;
  children?: ReactNode;
}

const TYPES = { POP: "traverse", PUSH: "push", REPLACE: "replace" } as const;

/** Inside a router: progress, direction and focus around navigations. */
export function RouterPageTransitions({
  focus,
  progress,
  failed,
  children,
}: RouterPageTransitionsProps) {
  const location = useLocation();
  const action = useNavigationType();
  const data = useContext(UNSAFE_DataRouterNavigationContext);
  const pending = data ? data.navigation.state !== "idle" : false;
  useRouteTransition({
    location: location.key,
    type: TYPES[action as keyof typeof TYPES] ?? "unknown",
    focus,
  });
  return (
    <>
      {children}
      {progress === false ? null : (
        <RouteProgress pending={pending} failed={failed} {...progress} />
      )}
    </>
  );
}
