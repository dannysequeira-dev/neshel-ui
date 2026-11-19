# Brief — Phase 013: Cinematic, Scenes & Page Transitions

Owner direction of 2026-11-18 (Spanish original in the conversation; this is a faithful English summary).
`main` verified at `b7bfe141ffd42d74adcb8abcfbff84a617184342` (PR #12 merged; #11 closed, #9 under
observation).

## Scope — exactly 20 entries

Cinematic & Scenes: C01 timeline sequencer (labels, overlaps) · C02 scene chapters (pin + segments) ·
C03 camera pan/zoom over a large canvas · C04 split-screen reveal · C05 curtain/shutter open · C06 title
sequence (staggered text + background) · C07 spotlight/vignette focus · C08 depth-of-field blur sequence ·
C09 autoplay storyboard with pause/stop · C10 letterbox transition.

Page Transitions: PT01 cross-fade · PT02 shared-element morph · PT03 slide/push · PT04 direction by
navigation (forward/back) · PT05 scale-through · PT06 curtain wipe · PT07 route progress bar · PT08
persistent element across routes · PT09 cross-document (MPA) View Transitions · PT10 router adapters
(Next.js App Router, React).

## Requirements (condensed)

1. **Timeline engine (C01)** — typed, reusable, framework-free where possible: sequencing, labels,
   relative offsets/overlaps, parallel and serial composition, durations and easing, pause/resume,
   reverse, seek, cancel/destroy, interruption and retargeting, explicit repetition, deterministic
   start/update/complete callbacks, live reduced motion. Reuse the 009 scheduler, controllers, motion
   values and Motion Host — **no second scheduler, no second animation engine**. Investigate simultaneous
   starts, cancel while another advances, reverse mid-way, seek while active, disappearing elements,
   callbacks that mutate the timeline, failing promises, hidden pages, reduced motion during playback. No
   orphan tasks, no duplicate completion callbacks.
2. **Scene chapters (C02)** on ScrollScene/the 011 scroll engine; CSS sticky pinning; no scroll
   hijacking; the scene's temporal logic must also work without scroll.
3. **C03–C10** reuse existing tools: camera transforms over scalable DOM (no WebGL); layered reveals
   that never overwrite the consumer's transforms; title sequences on Entrance + stagger (no text
   splitter — that is 014); visual effects with clear performance, isolation and restoration policies;
   a user-controllable storyboard (pause/stop/hide, autoplay policy, visibility, reduced motion);
   letterbox with exact style restoration. Each effect: real API, tests, a working demo.
4. **Page transitions** — native View Transitions first, progressive enhancement; verify
   `startViewTransition`, lifecycle/promises/cancellation, pseudo-elements, `view-transition-name`
   assignment/cleanup, shared elements and unique names, DOM coordination, interruptions and fast
   navigation, SPA vs MPA, real per-browser feature detection, fallbacks. **Never block a functional
   navigation** because an effect is unavailable; keep navigation, content, focus and state.
5. **PT02/PT08** reuse FLIP/Presence/Layout knowledge; stable identities, no collisions, cleanup on
   cancel/finish, missing source or target handled, different sizes; no second FLIP system.
6. **PT04** distinguishes forward/back verifiably, including browser history; never from the URL alone;
   document what happens when the router gives too little information.
7. **PT07** accessible pending/complete/failed indication; no fake percentages; indeterminate,
   completion and cancellation; never left active after a failed or interrupted navigation.
8. **PT09** real cross-document capabilities (opt-in, origin, compatibility); native vs fallback
   explicitly separated; no simulated MPA transitions.
9. **PT10** router-independent contract first, then optional adapters: Next.js App Router, modern React
   Router, React without a router. Coordinate with the **real** UI change and navigation state; a click
   is not a completed navigation. Do not alter external links, new tabs, keyboard navigation or
   back/forward. Router dependencies never in the core or the root bundle. Test against real framework
   versions; never invent router APIs.
10. **Architecture** — evaluate `./cinematic` and `./page-transitions`; justify in the spec/ADR; light
    root; React-free `./core`; decoupled families; shared internals; real tree-shaking; Motion Host as
    style authority; one frame-planning source; no GSAP/Motion without benchmark and approval; keep the
    PR #12 fixes (single host lifecycle, scroll holds under reduced motion).
11. **Accessibility** — WCAG 2.2.2 and 2.3.3, keyboard, focus after route transitions, scroll and
    anchors, content accessible during and after transitions, SSR/hydration/no-JS, live reduced motion.
    No vestibular autoplay under reduced motion; no per-frame `aria-live`; never steal focus during a
    transition; visuals are never a condition for content.
12. **Performance** — zero React renders per frame, zero per-frame layout reads (justified exceptions
    measured), no thrashing, idle scheduler, cancellable timelines, full release on unmount, hidden-page
    pausing, SSR without early browser access; measure multi-track and overlapping timelines; no
    compositor claims without measurement.
13. **Composition matrix** (≥ 13 rows listed in the brief) with exact style and attribute restoration.
14. **Slices** 013.0 spec & research → 013.1 timeline → 013.2 cinematic → 013.3 page-transition
    foundation → 013.4 router integration → 013.5 galleries & gates.
15. **Quality** — `pnpm check`, unit/integration, CDP lab keeping ≥ 105 existing cases, three engines,
    mobile emulation, packed consumer, SSR/hydration, SPA and MPA navigation where supported, Storybook
    and Playground builds, axe and reproducible manual tests, stress tests, real-tarball gzip budgets
    (new budgets proposed, earlier ones not raised without approval), three-OS CI on Node 22/24/26.
    Playwright WebKit is not Safari.
16. **Issue #9** — observe three distinct first-attempt clean runs on `main` (incl. Windows/Node 26)
    before closing; never close automatically or rerun until green; no unrelated Press changes here.
17. **Publication** — animations stays private 0.0.0; no npm, tags, releases, version bumps; outside the
    fixed group; the five public packages and the release pipeline unchanged.
18. **Authority** — commits, push and the Phase 013 PR are authorised after the gates; **no merge**.
