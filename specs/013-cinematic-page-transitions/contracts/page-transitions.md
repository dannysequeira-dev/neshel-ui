# Contract — Page transitions (PT01–PT09)

**Status: implemented and verified locally ([evidence](../evidence.md)); CI pending.** Subpath
`@neshel-ui/animations/page-transitions` (family `page`); opt-in stylesheets
`@neshel-ui/animations/page-transitions.css` (effects on View Transition pseudo-elements, route progress
bar) and `@neshel-ui/animations/page-transitions-mpa.css` (the cross-document opt-in, PT09). Router
adapters: [router-adapters.md](router-adapters.md). Support per engine: [support-matrix-013.md](support-matrix-013.md).

## 1. Principles

1. **Native first, progressive.** Effects are CSS animations of the browser's View Transition
   pseudo-elements (`::view-transition-group/old/new`), keyed on `view-transition-class` values
   `neshel-pt-<effect>`. The pseudo-elements are browser-generated snapshots, not the consumer's elements,
   so rule R-1 holds (ADR 0028 §4).
2. **Navigation never waits for an effect.** Without the API, under reduced motion with an `instant`
   behaviour, on a hidden page or after a failure, the update runs immediately and completely; focus,
   scroll, content and state are whatever the update produced.
3. **One transition per document.** A new transition skips the active one (the platform does the same,
   research R1); the skipped controller settles `interrupted`, never `failed`.
4. **Names exist only during a transition**, are unique (checked before the capture), are written
   through the Motion Host (`view-transition-name`, `view-transition-class` as internal exclusive
   channels, excluded from `will-change`) and restored exactly afterwards.

## 2. Engine API (framework-free)

```ts
getViewTransitionSupport(): ViewTransitionSupport  // { sameDocument, types, classes, crossDocument, navigationApi }; all false on the server
startPageTransition(update: () => void | Promise<void>, options?: PageTransitionOptions): PageTransition

interface PageTransitionOptions {
  effect?: PageEffect;                 // "fade" (PT01, default) | "slide" (PT03) | "scale" (PT05) | "wipe" (PT06) | "none"
  direction?: NavigationDirection | "auto"; // "forward" | "back" | "replace" | "unknown"; "auto" = current tracker value
  scope?: Element;                     // element whose content changes (default: the document root)
  types?: readonly string[];           // extra View Transition types
  reducedMotion?: ReducedMotion;
  maxWait?: number;                    // ms the update may hold rendering (default 1500, 0–10000)
  fallback?: "none" | "flip";          // shared elements without the API: FLIP (core/flip.ts) or nothing
}

interface PageTransition {
  readonly native: boolean;
  readonly state: "pending" | "updating" | "animating" | "completed" | "skipped" | "interrupted" | "failed";
  readonly updated: Promise<void>;       // the DOM update ran (rejects if it threw)
  readonly finished: Promise<PageTransitionResult>; // { status: "completed" | "skipped" | "interrupted", native, direction }
  skip(): void;
}
```

Effects and reduced behaviour (catalogue): PT01 fade → instant · PT03 slide → fade · PT04 direction →
fade · PT05 scale → fade · PT06 wipe → instant · PT02/PT08 shared/persistent → instant · PT09 → instant.
`fade` under reduced motion keeps a short opacity cross-fade; `instant` runs the update without a
transition.

Lifecycle: write `view-transition-class` on the scope (and `view-transition-name: neshel-page` when the
scope is not the root) and the shared names of the old elements → `document.startViewTransition({ update,
types })` (`types` only when supported; `data-neshel-pt-effect`/`data-neshel-pt-direction` on `<html>`
always, for engines without type selectors and for the React path) → inside the update: run the caller's
update, then move shared names from old to new elements (old names cleared first, so a kept-alive old
element never duplicates a name) → `finished` → release every name/class and restore the `<html>`
attributes. `maxWait` exceeded → `skipTransition()`; the update keeps running and its result is kept.

## 3. Shared and persistent elements (PT02, PT08)

```ts
registerSharedElement(element: Element, name: string, options?: { persist?: boolean }): () => void
```

Names: `[a-z][a-z0-9-]*` (validated; prefixed `neshel-` internally to avoid colliding with the
application's own names). Per transition, for each name: exactly one connected old element and one
connected new element morph (PT02: `neshel-pt-morph`, size and position animated by the group); only an
old one → it fades out; only a new one → it fades in; more than one connected element with the same
name → the first registered keeps it, the others are skipped and a development warning names them (the
transition itself never aborts on our names). `persist: true` (PT08) marks an element that stays mounted
across the update (`neshel-pt-persist`: no group motion, no cross-fade — it appears static above the
changing page; its DOM and state are untouched because it is the same element). Without the API and
`fallback: "flip"`, old boxes are measured before the update and new ones after it (offset chain), and
the new element is FLIP-animated from the old box with the 012 animator through its host.

## 4. Direction (PT04)

```ts
trackNavigationDirection(options?: { onChange?(d: NavigationDirection, type: NavigationType): void }): DirectionTracker
// { readonly direction; readonly type: "push" | "replace" | "traverse" | "reload" | "unknown"; set(d); destroy() }
```

With the Navigation API: `navigate` events → `push` → forward, `replace` → replace, `traverse` →
`destination.index < currentEntry.index ? back : forward`, `reload` → replace. The tracker writes
`data-neshel-pt-direction` on `<html>` synchronously in the `navigate` event (before any router updates the
DOM), so CSS and React's own view transitions see it. Without the API: routers may call `set(d)`; otherwise
`unknown` → the neutral variant. URLs are never compared. One tracker per page (reference-counted).

## 5. Route progress (PT07)

```ts
createRouteProgress(element: HTMLElement, { delay = 120, minVisible = 300, timeout = 15000, announce = false, labels }): RouteProgress
// { readonly state: "idle" | "pending" | "complete" | "failed"; start(); done(); fail(); cancel(); destroy() }
```

Package-rendered `div.neshel-route-progress` with `role="progressbar"`, an accessible name, no
`aria-valuenow` (indeterminate — never a fake percentage); `hidden` while idle. `start()` shows it after
`delay` (fast navigations never flash); `done()` completes (fills, fades out, back to idle after
`minVisible`); `fail()` shows the failed state briefly then idle; `cancel()` goes idle at once; `timeout`
cancels a navigation that never settles (development warning). Optional one-shot status announcement
(`announce`) in a visually hidden `role="status"` — never per frame. Reduced motion (`reduced`): no
indeterminate sweep; a static bar.

## 6. Cross-document (PT09)

`page-transitions-mpa.css` contains `@view-transition { navigation: auto; }` inside
`@media (prefers-reduced-motion: no-preference)` plus the effect rules; both same-origin documents must
include it. `enableCrossDocumentTransitions({ effect, shared })` (optional) listens to `pageswap` and
`pagereveal` to add `types`/attributes for effect and direction (from `navigation.activation` indexes)
and to assign shared names on both sides. Engines without support navigate normally (research R2); no
interception, no fetch-and-swap.

## 7. React (`"use client"`)

- `<PageTransition effect? asChild?>` — boundary around route content: React `<ViewTransition>` (when the
  installed React exports it) with `default`/`enter`/`exit` classes `neshel-pt-<effect>`; plain children
  otherwise.
- `<SharedElement name asChild?>` — React `<ViewTransition name share="neshel-pt-morph">`; registers the
  element for the framework-free controller too.
- `<PersistentElement name asChild?>` — `neshel-pt-persist`.
- `<RouteProgress pending failed? …>` — controlled PT07 bar.
- `useNavigationDirection()` — the tracker's direction (state updated only on navigation).
- `usePageTransition()` → `start(update, options)`: inside `startTransition` + `addTransitionType` when
  React manages view transitions, else `startPageTransition(() => flushSync(update))`.
