# Implementation Plan — Phase 011

## Technical context

TypeScript strict, ESM, React 19 (peer), Radix Slot (existing dependency), no new runtime dependency.
Tests: `node:test` on the built dist with jsdom (geometry stubbed per test) + the headless-Chrome lab and
Playwright Chromium/Firefox/WebKit for real layout. Constitution: SSR-safe, accessible, modular,
cross-platform scripts only.

## Structure

```
packages/animations/src/scroll/
  engine/source.ts       scroll sources (listener, position, velocity, direction)
  engine/geometry.ts     offset-chain measurement, ranges, shared observers, invalidation
  engine/progress.ts     createScrollProgress (lazy, smoothing, diagnose)
  engine/native.ts       native custom-property driver + behavioural check
  engine/in-view.ts      IntersectionObserver pool, presets, createScrollTrigger, section spy
  engine/debug.ts        counters
  triggers.ts            ST01–ST07, ST09 definitions
  parallax.ts            SP01–SP03, SP05–SP09, SP11 definitions (SP10 = engine smoothing)
  react/*.tsx            ScrollEffect, RevealOnScroll, StaggerOnScroll, ScrollScene, ScrollLayer,
                         ScrollProgressBar, HorizontalScroll (SP04), StickyStack, ParallaxImage, hooks
  scroll.css             package-owned layout layers (no animation on consumer elements)
  index.ts               ./scroll entry
```

## Slices

1. 011.0 — docs (this folder, ADR 0026). Commit.
2. 011.1 — engine + unit tests (sources, ranges, invalidation, laziness, velocity, native selection,
   in-view pool, trigger state machine, debug counters). Commit.
3. 011.2 — ST01–ST10 (+ Entrance `hold`/`direction`, tests incl. 010 suites unchanged). Commit.
4. 011.3 — SP01–SP11 (+ compose skew), prototype migration. Commit.
5. 011.4 — React API, scroll.css, exports/budgets entries, Playground gallery (replaces the prototype),
   lab checks (three engines), Storybook stories, packed consumer pages. Commit(s).
6. 011.5 — full gates, visual review, evidence, push, PR (no merge).

## Risks

- jsdom has no layout: unit tests stub `offsetTop`/`clientHeight`/`scrollY`; real layout is verified in
  the lab (both are required for SC-002/SC-003).
- WebKit in Playwright is not Safari: recorded as pending real-Safari verification.
- Bundle size of `./scroll` (many effects): per-effect budgets measured; tree-shaking verified.
