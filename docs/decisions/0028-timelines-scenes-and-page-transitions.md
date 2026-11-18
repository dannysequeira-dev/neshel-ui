# ADR 0028 — Timelines, scenes and page transitions

- Status: **Proposed** (2026-11-18) — awaiting the owner's review of the Phase 013 PR; implementation and
  verification status in [specs/013 evidence](../../specs/013-cinematic-page-transitions/evidence.md)
- Date: 2026-11-18
- Feature: [013](../../specs/013-cinematic-page-transitions/spec.md); research R1–R10; contracts
  [timeline-engine.md](../../specs/013-cinematic-page-transitions/contracts/timeline-engine.md),
  [cinematic-api.md](../../specs/013-cinematic-page-transitions/contracts/cinematic-api.md),
  [page-transitions.md](../../specs/013-cinematic-page-transitions/contracts/page-transitions.md),
  [router-adapters.md](../../specs/013-cinematic-page-transitions/contracts/router-adapters.md)

## Context

Phase 013 adds sequencing (timelines, chapters, storyboards, cinematic layers) and navigation transitions.
Both are classic places where a second engine appears: a timeline library with its own clock, or a page
transition layer that intercepts links and freezes rendering. The 009–012 engine already has one
scheduler, one run/promise model (ADR 0023), one style authority (the Motion Host, ADR 0022) and the
rule that families never import each other (ADR 0025). Browsers now ship same-document View Transitions in
Chromium, Firefox and WebKit, cross-document transitions in Chromium and WebKit, and React 19.3 integrates
view transitions into its commit (research R1–R4).

## Decision

1. **Two new families, two subpaths.** `./cinematic` (family `cinematic`; timeline engine + C02–C10) and
   `./page-transitions` (family `page`; View Transition controller, names, direction, route progress, MPA
   helper, React bindings), each with opt-in stylesheets. Router adapters are separate subpaths
   (`./page-transitions/next`, `./page-transitions/react-router`) importing their routers as optional peer
   dependencies; nothing else imports a router.
2. **The timeline is a sequencer, not an engine.** A timeline is a pure function of time rendered by one
   `update` task of the 009 scheduler while running; tracks render through motion values and Motion Hosts;
   run state and `finished` reuse `createRunCore`. No frame loop, no style writes outside the host.
3. **Coordinating existing definitions as values.** Effect tracks trigger Entrance definitions through their
   existing public contract (`hold`/`playback` of ADR 0026 §7, `continuous`, `replay`): Entrance and its
   approved budgets are unchanged; scrubbable motion uses pose and value tracks. A scrubbable `progress` option
   (+123 B on the `fadeIn` definition) is proposed to the owner, not adopted. Scroll progress sources reach
   scene chapters as values (`{ get, subscribe }`), so `./cinematic` never imports `./scroll`.
4. **R-1 and View Transitions.** Page-transition CSS animates only `::view-transition-*` pseudo-elements —
   browser-generated snapshots, not the consumer's elements — keyed on `neshel-pt-*` classes; R-1 holds.
   `view-transition-name`/`view-transition-class` are written through the Motion Host as internal exclusive
   channels (not animated: excluded from `will-change`), only during a transition, unique, and restored.
5. **Native first, never blocking.** The controller uses `document.startViewTransition` when the
   behavioural capability check passes and motion is allowed, bounds the rendering freeze (`maxWait`), and
   otherwise runs the update directly. One transition per document: a newer one interrupts the older.
6. **React integration through React's own view transitions.** When React exports `ViewTransition`
   (19.3+), the React layer renders `<ViewTransition>` boundaries with package classes and lets React start
   the transition at the real commit; adapters add direction (Navigation API tracker), progress (the
   router's real pending state) and focus-after-commit. Adapters never call `preventDefault` and never
   intercept history events.
7. **Direction from history indexes.** The Navigation API's entry indexes decide forward/back; routers may
   supply a direction; otherwise `unknown` and a neutral effect. URLs are never compared.
8. **No dependency.** No GSAP, Motion, `next-view-transitions` or router runtime in the core (ADR 0020).

## Consequences

- One scheduler, one style authority and one promise model for every Phase 013 effect; cinematic effects
  compose with Entrance, Hover, Press, Scroll, Gestures and Layout on the same element.
- Page transitions depend on browser support; unsupported paths are documented fallbacks, not emulations.
  Firefox has no cross-document transitions (plain navigation).
- Consumers on React < 19.3 get navigation without React-integrated view transitions; the framework-free
  controller still works for synchronous updates.
- Two optional peer dependencies (`next`, `react-router`) appear in the private package's manifest; the
  release PR (owner-approved) decides how they are published.
- New bundle budgets are proposed from measurements; earlier budgets change only with approval.

## Alternatives rejected

- GSAP Timeline / Motion sequences (second scheduler and writer; ADR 0020).
- Starting `document.startViewTransition` around `router.push` in adapters (freezes rendering until an
  unobservable commit; competes with React's transition, research R1/R4).
- Client-side fetch-and-swap to emulate MPA transitions (artificial SPA, breaks no-JS navigation).
- Direction from URL depth (wrong for repeated or arbitrary routes).
- Putting the timeline in `./core` (grows the approved core budget for consumers who never sequence).
