# Brief — Phase 011: Scroll Engine, Scroll Triggers & Parallax

Owner direction of 2026-11-16, summarised. The original is in Spanish; this summary is authoritative for
the repository.

## Starting point

Phase 010 (Entrance, Hover, Press; ADR 0025) is reviewed, approved and merged into `main` as the squash
commit `70d852b` (PR #7). `@neshel-ui/animations` stays **private** at `0.0.0`.

## Goal

A scroll engine of our own, built on the Phase 009 motion engine, a public ScrollScene API and the **21
catalogue effects** of Scroll Triggers (ST01–ST10) and Scroll & Parallax (SP01–SP11)
(`specs/008-animations/contracts/catalog.md`). Options, variants or placeholders do not count as extra
implementations. SP01, SP05 and SP10 build on the 008.0 ScrollScene prototype.

## Requirements carried by the brief

0. **Authorship.** Neshel-UI belongs to Daniel Sequeira Campos (Danny Sequeira, `dannysequeira-dev`). No
   tool attribution in commits, PRs, docs, code, Storybook, Playground or manifests; Claude Code's
   `attribution` settings blanked in the local (uncommitted) settings; a permanent rule in `CLAUDE.md`.
1. Branch `feature/011-scroll-parallax` from the updated `origin/main` (`70d852b`); roadmap and `CLAUDE.md`
   updated; published packages and versions untouched.
2. Scroll engine: normalised progress 0–1 with explicit coordinates, offsets, direction, velocity and
   bounds; IntersectionObserver activation; native scroll-driven animations where they meet the contract,
   a verified JavaScript fallback otherwise; CSS-sticky pinning; spring smooth scrub; composition with
   Entrance/Hover/Press; viewport and inner containers; SSR, hydration, content visible without
   JavaScript; reduced motion including live changes. **No second scheduler, no second composition
   system; no GSAP/Motion or other engine** without benchmarks and a separate ADR.
3. Geometry cache from the prototype: reads batched in the scheduler's read phase; invalidation on resize,
   fonts/images, content inserted/removed above, layout shifts, compensated size changes; observer
   cleanup; computed-vs-real diagnostics; documented undetectable limits and an explicit refresh. **No
   layout reads per scroll event.**
4. Native SDA verified in Chromium, Firefox and WebKit by behaviour, not only `CSS.supports()`; one
   consistent strategy for the native driver and the fallback.
5. ScrollScene: declarative, composable, `asChild` where it avoids needless wrappers; decisions documented
   before implementation. Scroll motion composes through the Phase 009 layers and arbitration and never
   erases Tilt3D, Hover, Press or Entrance state.
6. UX/a11y: no scroll hijacking (no wheel interception, no blocking, no forced global smooth scrolling, no
   JS pin spacers when sticky works, keyboard scroll and anchor navigation intact, no jumps on mount or
   unmount, minimal CLS). SP04 has a usable vertical alternative (reduced motion especially); interactive
   content stays reachable with visible focus in logical order; reveals never hide content permanently
   (no JS, failed animation, reduced motion); decorative effects static under reduced motion; live
   preference changes honoured.
7. Slices 011.0 (spec & research) → 011.1 (engine) → 011.2 (ST01–ST10, reusing Entrance presets) → 011.3
   (SP01–SP11, migrating the prototypes) → 011.4 (ScrollScene & integration) → 011.5 (gates & PR). Stop only
   for decisions incompatible with existing contracts or a significant new dependency.
8. Distribution: `@neshel-ui/animations/scroll` and an optional family stylesheet; `./core` React-free;
   light root; tree-shakeable subpaths; React 19, strict TS, ESM; Tailwind optional; precompiled CSS;
   SSR/RSC-compatible; 009/010 APIs stable; families never import each other.
9. Playground and Storybook gallery of the 21 effects using the real package exports (sticky multi-layer
   scene, progress-linked parallax, pinned horizontal section, reveals, scroll-synchronised visuals,
   progress, dynamic geometry, simultaneous scenes, compositions with Entrance and Hover, reduced-motion
   alternatives), screenshots/recordings for visual review.
10. Tests: all existing gates plus scroll-specific cases (both directions, fast reversal, enter/leave,
    page start/end, inner containers, resize, insertion above, late content, compensated geometry,
    dynamic content, several scenes, pause/unmount/cleanup, live reduced motion, keyboard, SSR/hydration,
    anchors, property composition, no layout reads on scroll). No relaxed tolerances, no fixed waits.
    Performance with many scenes (CPU, per-frame tasks, idle = no work); measured scroll budgets, existing
    budgets unchanged.
11. Release: package stays private 0.0.0, outside Changesets; no publish, release or tag; public packages
    and release pipeline untouched. Commits, push and a PR are authorised; **no automatic merge**.
12. Deliverables: inventory of the 21 effects, engine architecture and contracts, ScrollScene API, native
    vs fallback comparison, performance and geometry evidence, composition matrix, a11y/reduced-motion
    results, proposed gzip budgets, visual evidence, CI results and PR link, known limits and pending
    verifications.
