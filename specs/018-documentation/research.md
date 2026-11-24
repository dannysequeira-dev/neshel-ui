# Research — Phase 018: audit and decisions

Sources: the repository at `f1672cf`, the built packages, `git show v0.1.0:…`, the specifications 008–017. Matrix:
[coverage.md](coverage.md).

## Audit findings

| #   | Finding                                                                                                                                                                                       | Resolution                                                 |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| A1  | 0 website pages, 0 generated API data and 0 checks for animations (883 exports, 19 entries)                                                                                                   | Documented; data generated; checks added                   |
| A2  | 28 exports on main are not in 0.1.0 (Accordion 10, Collapsible 6, Switch 2, Toast 10) and were documented as published                                                                        | `<Unreleased />`, `published-api.json`, check `unreleased` |
| A3  | `components/index` catalogue omitted Accordion, Collapsible, Switch and Toast and under-reported Base UI                                                                                      | Corrected, EN/ES                                           |
| A4  | Phase 017 pages lacked composition, limitations and mistakes; choosing/forms/accessibility guides ignored them                                                                                | Extended, 4 new examples                                   |
| A5  | The overlay guide did not state the nested Escape rules of 017, nor that 0.1.0 can close two dialogs with very fast input (K-15)                                                              | Section "Nested layers" with the 0.1.0 notice              |
| A6  | The home page label said "Install (after the 0.1.0 publication)"                                                                                                                              | "Install" / "Instalación"                                  |
| A7  | `docs/package-contracts.md` said 21 colour roles; the package exports 25                                                                                                                      | Corrected                                                  |
| A8  | `CLAUDE.md` and `docs/roadmap.md` still presented 017 as current                                                                                                                              | Updated; decisions untouched                               |
| A9  | `check:docs` does not understand explicit heading ids (`[#id]`)                                                                                                                               | Supported                                                  |
| A10 | The preview server had no byte ranges: Chromium cannot seek a video without them                                                                                                              | `parseRange` in `scripts/lib/static-server.mjs`, tested    |
| A11 | JSDoc of the entrance options exposed phase numbers and contract paths to readers                                                                                                             | Comments reworded (7 lines, no code change)                |
| A12 | The API of 154/157 entries appears in Storybook (not ST04, ST10, PT10) and of 155/157 in the Playground (not ST10, PT10); PT10 has real router consumers; the four 017 components are in both | Story added for ST04/ST10                                  |

Links: 0 broken before and after (`check:docs` links). EN/ES: page sets, exports, previews and tables were already equal;
the wording of every existing Spanish sentence was
not re-read; only the pages touched by A2–A6 were.

## Findings in the packages (documented, not changed)

Behaviour changes are not authorised in this phase. Each is stated on its page and needs an owner decision.

| #   | Finding                                                                                                                                             | Evidence                                                                          |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| P1  | `Particles`/`Starfield` size their canvas from the container's **content** box but place it over the **padding** box: padding stretches the drawing | Chromium: buffer 519×28, canvas box 615×124 with 48 px padding                    |
| P2  | `<HorizontalScroll layout="scroll">`: the native scroller is not focusable when its items are not                                                   | axe `scrollable-region-focusable`                                                 |
| P3  | `<Storyboard>` controls fall below 24 px when the application resets button padding (Tailwind preflight)                                            | axe `target-size`                                                                 |
| P4  | `<ScrollEffect>`, `<RevealOnScroll>` and `<StaggerOnScroll>` accept untyped `options`; an unknown key is not a compile error                        | An invented option of an early draft passed the type checker and failed the build |

Pre-existing, unrelated: the static export requests Next.js segment prefetch files (`__next.$d$lang…txt`) that the local
preview server answers with 404, on the home page too. Navigation works. Not investigated.

## Decisions

- **R1 Family pages, not 157 pages.** One page per family keeps shared context (what starts, stops and restores) next to
  the effects; explicit anchors (`#e01`), the catalogue and the search give direct access.
- **R2 Facts in data, explanations in MDX.** `apps/docs/animations/catalog.json` holds what a machine can verify;
  MDX holds what a person must read, so the search index contains it.
- **R3 One module per example**, lazily loaded, so the other pages do not download the animations code.
- **R4 The documentation app depends on the private package with `workspace:*`**, like the Playground and Storybook.
  Nothing published depends on it. The lockfile records the link; no version changed.
- **R5 Generated references** for complete API, with `<details>` per export; explanations are not generated.
- **R6 Spanish.** Prose, names, facts and the 565 option descriptions of the effect pages are translated. The full
  references (1,165 unique descriptions) keep the source English with `lang="en"` and a visible note: they are generated
  from a private package whose API may still change.
- **R7 Published API as data.** The export names of tag `v0.1.0` are stored once; a release updates the file.
- **R8 Biome override** for `apps/docs/{demos,components}/animations`: plain `<img>` is the documented API, and
  scrollable regions need `tabIndex` (axe requires it). No other rule changes.
- **R9 Clip instead of scroll** in the animation preview frame (`overflow: clip`): a scroll container would capture
  `position: sticky`. Existing previews are unchanged.
