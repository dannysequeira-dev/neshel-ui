# Contract — Router adapters (PT10)

**Status: planned in 013.0; implementation status in [../evidence.md](../evidence.md).**

## 1. Router-independent contract (in `./page-transitions`)

```ts
useRouteTransition(input: {
  location: string;            // committed location key (pathname + search, or a router key)
  pending: boolean;            // the router's real navigation state (not a click)
  failed?: boolean;            // the router reported a failed navigation
  type?: "push" | "replace" | "traverse" | "unknown"; // when the router knows it
  focus?: "auto" | "none";     // after a committed push/replace: focus [data-neshel-route-focus] (default "auto")
  progress?: RouteProgressOptions | false;
}): { direction: NavigationDirection; progressRef: Ref<HTMLDivElement> }
```

Rules: (1) the transition is coordinated with the commit — the location change observed in a layout
effect after React committed the new route, never the click; (2) `pending` drives PT07 (start/done/
fail/cancel; the watchdog covers routers that never settle); (3) focus moves only after a committed
push/replace, never during a transition, never on traverse (the browser and router restore position),
and only to an element the application marked; (4) the adapter never calls `preventDefault` on links and
never intercepts `navigate`/`popstate`: modified clicks, new tabs, downloads, external links and
back/forward keep their native behaviour; (5) direction comes from the PT04 tracker (Navigation API) or
the router's own information; otherwise `unknown`.

React without a router: the application owns the state change and calls `usePageTransition().start(() =>
setView(next), { direction })`, which runs the update in a React transition (React's view transition
captures the commit) or a flushed update inside `startPageTransition`.

## 2. Next.js App Router — `@neshel-ui/animations/page-transitions/next`

Verified against `next@16.4.5` + React 19.3.1 (research R4). Optional peer dependency `next` (≥ 16.4);
nothing in `./page-transitions` or the root imports it.

- `<NextPageTransitions focus? progress? effect?>` — client component for the root layout: tracks
  `usePathname()` + `useSearchParams()` as the committed location, renders `<RouteProgress>`, runs the
  direction tracker and focus rule. `useSearchParams` requires a Suspense boundary in Next for static
  rendering; the component wraps its own reader in `<Suspense fallback={null}>`.
- `<TransitionLink>` — `next/link` with `transitionTypes` (`neshel-<effect>`, `neshel-<direction>`) added
  for React's view transition, and `onNavigate` marking the navigation pending (Next calls `onNavigate`
  only for client-side navigations — not for modified clicks, new tabs or external URLs, so those stay
  native). Pending ends when the new location commits; the watchdog ends navigations that never commit.
- Back/forward: Next handles them in a transition; direction from the Navigation API tracker.

## 3. React Router — `@neshel-ui/animations/page-transitions/react-router`

Verified against the installed `react-router` major (8.x on 2026-11-18) before it is written: hook
names, the navigation state shape and whether navigations run inside React transitions are read from the
installed type declarations and observed in a real consumer (evidence.md §6). Optional peer dependency
`react-router`. Planned surface: `<RouterPageTransitions focus? progress?>` using `useLocation()` (commit)
and the data-router navigation state (`useNavigation()`) for pending/failed, and `<TransitionLink>`
forwarding to the router's `Link`.

## 4. Verification

Real consumers built from the packed tarball outside the workspace (`check:animations:routers`): a Next
16.4.5 App Router app (`next build` + `next start`) and a Vite React Router app, exercised in Chromium
(push, back, forward, modified click opening a new tab untouched, external link untouched, a navigation
whose loader fails, a slow navigation showing PT07, rapid navigation interrupting a transition, focus
after commit, no hydration errors).
