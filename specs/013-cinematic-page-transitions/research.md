# Research — Phase 013

Probes ran on 2026-11-18 on Windows 11, Node 26, Playwright 1.65.0 (Chromium 158.0.8127.18, Firefox
159.0, WebKit 27.2 — Playwright's WebKit build, **not Safari**). Probe scripts are reproduced in
[evidence.md](evidence.md) §1; results below are observations, not assumptions.

## R1 — Same-document View Transitions: support and lifecycle

| Capability                                                                     | Chromium 158 | Firefox 159  | WebKit 27.2  |
| ------------------------------------------------------------------------------ | ------------ | ------------ | ------------ |
| `document.startViewTransition(callback)`                                       | yes          | yes          | yes          |
| Object form `{ update, types }`; `transition.types`                            | yes          | yes          | yes          |
| `:active-view-transition-type()` selector                                      | yes          | yes          | yes          |
| `view-transition-class`                                                        | yes          | yes          | yes          |
| `view-transition-name: match-element`                                          | yes          | yes          | yes          |
| `document.activeViewTransition`                                                | yes          | yes          | yes          |
| `skipTransition()`                                                             | yes          | yes          | yes          |
| Element-scoped `element.startViewTransition`                                   | yes          | no           | no           |
| A second `startViewTransition` aborts the first (`ready`)                      | AbortError   | AbortError   | AbortError   |
| Duplicate `view-transition-name` → `ready` rejects                             | InvalidState | InvalidState | InvalidState |
| Update callback throws → `updateCallbackDone`/`finished` reject with the error | yes          | yes          | yes          |

Consequences: (a) feature detection must be behavioural per capability (`types`, classes), never by
user agent; (b) only one transition per document — a library must never start a transition while
another is active without deciding which one wins (we skip the older one, which the platform does
anyway, and settle its controller as `interrupted`); (c) duplicate names abort the whole transition, so
names are assigned only for the duration of a transition and checked for uniqueness first; (d) an
update callback error must still leave the DOM in the new state when possible and the controller must
report `failed` (ADR 0023: `finished` rejects only on real errors). Element-scoped transitions are
Chromium-only and not used.

During the update callback the browser **pauses rendering** of the document (old snapshot shown). An
update that waits for slow data would freeze the page; Chromium aborts with a `TimeoutError` after a
few seconds. Our controller therefore bounds the wait (`maxWait`, default 1500 ms) and, when exceeded,
calls `skipTransition()` and lets the navigation finish without animation.

## R2 — Cross-document (MPA) View Transitions

`@view-transition { navigation: auto }` in both same-origin documents, `pageswap`/`pagereveal` events and
`CSSViewTransitionRule`:

| Engine       | `@view-transition` rule | `pageswap`/`pagereveal` | Push navigation animated                      | Traverse (back/forward)                                                                                             |
| ------------ | ----------------------- | ----------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Chromium 158 | yes                     | yes                     | yes (`viewTransition` present on both events) | forward traverse animated; the back traverse in the probe restored from the back/forward cache without a transition |
| WebKit 27.2  | yes                     | yes                     | yes                                           | forward traverse animated; back traverse not animated in the probe                                                  |
| Firefox 159  | no                      | no                      | no (plain navigation)                         | no                                                                                                                  |

`navigation.activation` gives `navigationType` and `from`/`entry` indexes in `pagereveal` (both engines);
`pageswap`'s `activation.entry.index` is `-1` for a push (the entry does not exist yet). Cross-document
transitions are same-origin only and need the opt-in in **both** documents. Fallback: plain navigation
(no JavaScript emulation, no interception — owner requirement 8).

## R3 — Navigation direction

The Navigation API is present in all three engines (`window.navigation`, `currentEntry.index`,
`navigate` event with `navigationType` and `destination.index`). `history.pushState` fires `navigate`
with `navigationType: "push"`; browser back/forward fire `traverse` with `destination.index` below or
above `currentEntry.index`. Direction is therefore decided from the history **entry indexes**, never
from URLs (the same URL can be forward or back). Without the Navigation API the router may provide it
(React Router's browser history stores an `idx` in `history.state`); Next.js exposes the navigation type
only through `instrumentation-client` (`onRouterTransitionStart(url, "push" | "replace" | "traverse")`),
which does not say back vs forward. When nothing reliable is available the direction is `"unknown"` and
direction-aware effects use their neutral variant (PT04 → cross-fade).

## R4 — React and router integration surfaces (installed versions)

- **React 19.3.1** exports `ViewTransition` and `addTransitionType` (verified in
  `react/cjs/react.production.js`). React DOM 19.3.1 starts a document view transition when a
  Transition (`startTransition`, `useDeferredValue`, Suspense reveal) commits and affects a
  `<ViewTransition>` boundary, assigning and clearing `view-transition-name` itself. The package's peer
  range is `^19.0.0`, so the React layer reads `ViewTransition` from the React namespace at runtime and
  renders plain children when it is absent (no animation, navigation unaffected).
- **Next.js 16.4.5** (`apps/docs`): `Link` has `transitionTypes` and `onNavigate`; `router.push/replace`
  accept `{ transitionTypes }`, passed to `React.addTransitionType` inside the navigation transition;
  `useLinkStatus()` returns `{ pending }` for the clicked link; `instrumentation-client`
  `onRouterTransitionStart`. App Router navigations run inside React transitions, so React's own view
  transition integration captures the old DOM and the commit — the **real** moment of the UI change.
- **React Router 8.5.2** (latest on npm on 2026-11-18): APIs are checked against the installed
  version's type declarations in 013.4 before the adapter is written (research note added to
  evidence.md §6); nothing is assumed from earlier majors.

Decision: the React adapters do not call `document.startViewTransition` themselves when React manages
the transition (two callers would abort each other, R1b). They render React `<ViewTransition>`
boundaries with the package's classes and add direction/progress around the router's own navigation
state. The framework-free `startPageTransition` serves vanilla code, synchronous React updates
(`flushSync`) and non-React routers.

## R5 — Timeline model

Options: (a) a timeline of `animateValue` controllers started at offsets; (b) a pure function of time:
one clock on the 009 scheduler computes every track's local progress and renders it through motion
values and the Motion Host. (a) cannot seek, reverse or scrub deterministically (each controller owns a
clock); (b) is seekable, reversible and scroll-scrubbable with one task, and is how the 011 scroll
engine already drives effects (progress → render). Chosen: (b). The timeline reuses `createRunCore`
(one promise per run, rejects only on real errors), the scheduler (`update` phase, clamped deltas),
easing, motion values, the reduced-motion policy and visibility helpers; tracks render through
`getMotionHost` layers/opacity and arbitrated exclusive channels. It has no frame loop of its own.

Edge cases decided by the model (each has a unit test, see tasks T013):

| Case                                              | Behaviour                                                                                       |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Two tracks start at the same instant              | Evaluated in start-time order, ties in insertion order; transforms compose, opacities multiply  |
| A timeline advances while another is cancelled    | Independent tasks; the cancelled one keeps its rendered state until `destroy()` restores styles |
| Reverse mid-way                                   | Same clock runs backwards from the current time; calls fire in descending order                 |
| Seek while running                                | Continues running from the new time; calls between the two times are not fired (opt-in `fire`)  |
| Target element removed from the document          | Its track releases its host contributions (styles restored) and is marked `detached`; no error  |
| Callback mutates the timeline (pause/seek/cancel) | The frame stops processing after the callback; the mutation wins; completion fires at most once |
| Awaited action rejects                            | Timeline `failed`; `finished` rejects with the error; tasks and listeners released              |
| Page hidden                                       | Clock stops (`whenHidden: "pause"`, default) or jumps to the end (`"finish"`)                   |
| Reduced motion switched on while playing          | `finish()`: final state, callbacks in order, `finished` resolves `completed`                    |

## R6 — Driving existing effect definitions from a timeline

Entrance definitions (E01–E09, E11) run their own `animateValue` clock. Two options were built and measured:
(a) an additive Entrance option `progress?: MotionValue` (the definition renders an external progress —
scrubbable) — **+123 B gzip** on `entrance: fadeIn definition` (6605 → 6728 B, approved budget 6656 B);
(b) triggering the definition through its existing public contract (`hold`, `playback`, `continuous`,
`replay`), as the 011 scroll triggers do — **0 B** on Entrance. Chosen: (b), because earlier budgets are not
raised without the owner's approval; (a) is proposed in evidence.md §8. Families still never import each
other: definitions travel as values.

## R7 — Scene chapters without importing `./scroll`

Families never import each other. `<SceneChapters>` accepts any progress source with
`get(): number` and `subscribe(listener): () => void` — exactly the shape of the 011 `ScrollProgress`
returned by `useScrollScene()`/`createScrollProgress()`. Pinning stays CSS sticky (`<ScrollScene>`); the
chapters' timeline is seeked from the source (scrub). Without a source the same timeline plays on its
clock or is controlled by `progress`/`chapter` props, so the scene logic does not depend on scroll.

## R8 — Visual effect costs (C07, C08)

- **C07 spotlight**: a radial gradient whose centre/radius are custom properties repaints the whole
  overlay every frame. Chosen: an oversized package-rendered "lens" with a fixed radial hole, moved and
  scaled by `transform` through its host — no repaint of the gradient per frame (measured in the lab:
  paint counts recorded in evidence.md §8; no compositor claim is made).
- **C08 depth of field**: `filter: blur()` is expensive on large layers. Policy: at most 6 layers, blur
  capped at 12 px, the filter is an exclusive host channel (restored exactly), and reduced motion
  removes blur entirely (content stays sharp — readability first).

## R9 — Storyboard autoplay (C09)

WCAG 2.2.2: moving content that starts automatically, lasts more than 5 s and is shown with other content
needs a mechanism to pause, stop or hide it. Policy: autoplay is opt-in; never under reduced motion;
starts only while the storyboard is at least half visible (IntersectionObserver) and the page is
visible; pauses while hovered or focused (and stays paused once the user pressed Pause); the rotation
control is always rendered first in the tab order; slides use the APG carousel semantics
(`aria-roledescription`), and the live region is `off` while rotating and `polite` when the user
navigates manually (no per-frame announcements).

## R10 — Alternatives rejected

- GSAP Timeline / Motion `animate` sequences: second scheduler and style writer, dependency policy
  (ADR 0020); no benchmark justifies them since the timeline adds no new per-frame work beyond the
  tracks' renders.
- Calling `document.startViewTransition` from React adapters around `router.push`: freezes rendering
  until a commit the adapter cannot observe reliably and competes with React's own transition (R1b, R4).
- Simulating MPA transitions with a client-side fetch-and-swap: forbidden by the brief (an artificial
  SPA) and breaks no-JS navigation.
- Inferring direction from URL depth or string comparison: wrong for repeated URLs and arbitrary routes.
