"use client";
/**
 * `@neshel-ui/animations/page-transitions/next` — Next.js App Router adapter (PT10; router-adapters.md §2).
 * Verified against next@16.4.5 + React 19.3. App Router navigations run inside React transitions, so
 * React's own view transition integration (`<PageTransition>` boundaries) captures the real commit; this
 * adapter adds: transition types on links (`transitionTypes`), the pending state from `onNavigate` (called
 * by Next only for client-side navigations — never for modified clicks, new tabs or external URLs) until the
 * new location commits, PT07 progress, PT04 direction and focus after commit. It never prevents defaults
 * and never intercepts history events.
 */
// `.js` specifiers: next has no "exports" map, so NodeNext ESM resolution needs the file names.
import NextLink from "next/link.js";
import { usePathname, useSearchParams } from "next/navigation.js";
import {
  type ComponentProps,
  createContext,
  type ReactNode,
  type Ref,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { PageEffect } from "./engine/controller.js";
import type { RouteProgressOptions } from "./engine/progress.js";
import { RouteProgress, useRouteTransition } from "./react.js";

type LinkComponent = typeof import("next/dist/client/app-dir/link.js").default;
/** `next/link` is CommonJS: bundlers hand over the component, Node ESM the module object. */
const Link: LinkComponent =
  (NextLink as unknown as { default?: LinkComponent }).default ??
  (NextLink as unknown as LinkComponent);

interface PendingApi {
  begin(href: string): void;
}
const PendingContext = createContext<PendingApi | null>(null);

function SearchReader({ onChange }: { onChange(search: string): void }) {
  const search = useSearchParams()?.toString() ?? "";
  useEffect(() => onChange(search), [search, onChange]);
  return null;
}

export interface NextPageTransitionsProps {
  /** Focus `[data-neshel-route-focus]` after a committed push/replace (default `"auto"`). */
  focus?: "auto" | "none";
  /** Route progress options, or `false` to render none. */
  progress?: RouteProgressOptions | false;
  children?: ReactNode;
}

/** Root-layout component: progress, direction and focus around App Router navigations. */
export function NextPageTransitions({ focus, progress, children }: NextPageTransitionsProps) {
  const pathname = usePathname() ?? "";
  const [search, setSearch] = useState("");
  const [pending, setPending] = useState(false);
  const [navigation, setNavigation] = useState(0);
  const location = search ? `${pathname}?${search}` : pathname;
  useRouteTransition({ location, focus });
  // The committed location changed: the navigation is complete.
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs on every committed location.
  useEffect(() => setPending(false), [location]);
  const api = useMemo<PendingApi>(
    () => ({
      begin(href) {
        const target = new URL(href, window.location.href);
        const current = new URL(window.location.href);
        // A link to the current location supersedes a pending navigation and completes without a location
        // change: nothing stays pending (review D).
        if (target.pathname === current.pathname && target.search === current.search) {
          setPending(false);
          return;
        }
        setPending(true);
        setNavigation((n) => n + 1);
      },
    }),
    [],
  );
  const onSearch = useCallback((value: string) => setSearch(value), []);
  return (
    <PendingContext.Provider value={api}>
      <Suspense fallback={null}>
        <SearchReader onChange={onSearch} />
      </Suspense>
      {children}
      {progress === false ? null : (
        <RouteProgress
          pending={pending}
          navigation={navigation}
          {...progress}
          // A navigation that never commits (cancelled, failed before commit): the watchdog clears it.
          onTimeout={() => setPending(false)}
        />
      )}
    </PendingContext.Provider>
  );
}

export type TransitionLinkProps = Omit<ComponentProps<LinkComponent>, "ref"> & {
  /** Effect type added to the navigation's transition types (default `"fade"`). */
  effect?: PageEffect;
  ref?: Ref<HTMLAnchorElement>;
};

/** `next/link` plus Neshel transition types and the pending state (PT10). */
export function TransitionLink({
  effect = "fade",
  transitionTypes,
  onNavigate,
  href,
  ref,
  ...props
}: TransitionLinkProps) {
  const pending = useContext(PendingContext);
  return (
    <Link
      {...props}
      ref={ref ?? null}
      href={href}
      transitionTypes={[`neshel-${effect}`, "neshel-forward", ...(transitionTypes ?? [])]}
      onNavigate={(event: { preventDefault(): void }) => {
        let prevented = false;
        onNavigate?.({
          preventDefault() {
            prevented = true;
            event.preventDefault();
          },
        });
        if (!prevented)
          pending?.begin(typeof href === "string" ? href : String(href.pathname ?? ""));
      }}
    />
  );
}
