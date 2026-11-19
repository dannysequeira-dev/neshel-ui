# Plan — Phase 014

## Technical context

React 19.3 (peer `^19.0.0`), TypeScript strict, ESM, `tsc` builds per package, `node:test` against `dist`
with jsdom and a manual `requestAnimationFrame`, Biome, Storybook (React/Vite), Playground lab (Vite), CDP
Chrome check, Playwright engines check, packed-tarball consumer and bundle checks. No new runtime
dependency. Playground dev dependency: `@fontsource-variable/inter` 5.2.8 (already in the lockfile through the
docs app; OFL) for a real variable font.

## Module structure

```
packages/animations/src/
  core/progress-driver.ts     shared ProgressControl (motion value + 009 tween controller, track/drive, reduced policy)
  core/loop.ts                visibility-gated continuous loop (IntersectionObserver + page visibility)
  core/channel.ts             host channel writer (internal exclusive channels with re-grant)
  text/engine/segment.ts      Intl.Segmenter + fallback, scripts (RTL, shaping, spaceless)
  text/engine/split.ts        splitText (accessible copy, visual pieces, runs, lines, revert)
  text/engine/debug.ts        counters
  text/engine/effect.ts       split-effect base (split + driver + host root property)
  text/reveal.ts (T01, T11) typewriter.ts (T02) scramble.ts (T03) sweep.ts (T04) number.ts (T05)
  text/rotate.ts (T06) wave.ts (T07) highlight.ts (T08) mask.ts (T09) axes.ts (T10)
  text/react.tsx text/index.ts text/text.css
  svg/engine/path-data.ts     parser + serializer (exact normal form)
  svg/engine/geometry.ts      JS geometry + measurePath
  svg/engine/morph.ts         compatibility + interpolation
  svg/engine/attributes.ts    attribute ledger (write phase, exact restore)
  svg/engine/debug.ts         counters, support
  svg/draw.ts (S01, S06, S10) morph.ts (S02, S04) motion-path.ts (S03) stops.ts (S05)
  svg/turbulence.ts (S07) logo.ts (S08) dash-flow.ts (S09) svg/react.tsx svg/index.ts svg/svg.css
```

## Slices

| Slice | Content                                                                                                 | Gate                                  |
| ----- | ------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| 014.0 | brief, spec, research, contracts, ADR 0029, plan, tasks, analysis, manual checks                        | documents consistent (analysis.md)    |
| 014.1 | core internals, segmentation, splitter, `useSplitText`, tests (Unicode corpus, restoration, lines, SSR) | unit tests; earlier suites unchanged  |
| 014.2 | T01–T11 engines + React + `text.css` + tests                                                            | unit tests; typecheck; lint           |
| 014.3 | path data, geometry, morph, attribute ledger, tests (valid/invalid corpus)                              | unit tests                            |
| 014.4 | S01–S10 engines + React + `svg.css` + tests                                                             | unit tests                            |
| 014.5 | gallery + suite, CDP/Playwright cases, Storybook, composition tests, packed consumer, budgets, docs, CI | `pnpm check`; browser checks; 3-OS CI |

## Test strategy

- **Unit (jsdom):** manual frames; host style snapshots; child-node identity snapshots; counters (splits,
  observers, reads, scheduler size); Profiler commits; StrictMode; SSR markup; Unicode corpus with the
  segmenter on and off; path corpus (valid, invalid, compatibility pairs); deterministic scramble glyphs.
- **Browser:** in-page suite `runTextSvgSuite()` shared by CDP and Playwright: accessibility tree (CDP
  `Accessibility.getFullAXTree` in Chrome; `aria-hidden`/text checks in all engines), Capsize box height,
  RTL piece order by bounding boxes, native vs JS path length/points, `offset-path` support and placement,
  `color-mix`, masks, real variable font advance widths, reduced motion live, visibility gating, axe.
- **Performance:** split cost of 600 graphemes and 5000 characters (ms), frame deltas with 600 animated
  graphemes, host writes per frame, morph interpolation per frame (µs), turbulence frame cost with/without
  the filter. Reported as local observations.

## Risks

| Risk                                                   | Mitigation                                                          |
| ------------------------------------------------------ | ------------------------------------------------------------------- |
| Bidi/shaping regressions in engines                    | lab checks piece boxes per engine; shaping scripts never char-split |
| `calc()` in `translate`/`opacity` precision per engine | lab compares computed values against the JS formula                 |
| WebKit differences (Playwright build ≠ Safari)         | statuses recorded per engine; Safari unverified                     |
| Budget pressure                                        | new entries only; measured; proposed for owner review               |
| Issue #9 intermittency                                 | observed separately on `main`; no Press changes in this branch      |
