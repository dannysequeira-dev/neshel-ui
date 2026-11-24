# Evidence — Phase 018

Status vocabulary (roadmap): **implemented**, **verified locally**, **verified in GitHub Actions**, **planned**. Local
machine: Windows 11, Node 26.13.0, pnpm 12.16.1.

## Baseline

`main` at `f1672cf`; CI run 45463495420, push, attempt 1, 14/14 (read from the GitHub API on 2026-11-24). Before any
change: `docs:api --check` fresh; `check:docs` passing with 156 pages, 345 targets, 146 snippets.

## Local gates (2026-11-24, all exit 0, after the last change to code, examples and pages)

| Gate                                                              | Result                                                                                   |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `pnpm check`                                                      | scripts 127 + 1 skipped (was 117 + 1), packages 854/854                                  |
| `docs:api --check`                                                | fresh (5 public files + 19 animations entries)                                           |
| `check:docs`                                                      | 242 pages, 345 targets, 157 effects, 19 entries, 28 unreleased, 170 snippets, 0 problems |
| `docs:build`                                                      | 257 static pages                                                                         |
| `check:docs-site`                                                 | 18/18 (was 14) in Chrome, about 170 s                                                    |
| Playground and Storybook builds; generated declarations unchanged | pass                                                                                     |
| `check:browser:animations`, `check:animations:consumer`           | pass                                                                                     |
| `check:animations:bundles`, `check:bundles`                       | pass; budgets untouched                                                                  |
| `check:next`, `check:starters`, `release:simulate`                | pass                                                                                     |
| `check:consumer`, `check:browser:components`                      | pass                                                                                     |

Not run locally: `check:browsers`, `check:animations:engines`, `check:animations:routers`, `stress:overlays`,
`check:browser`. The packages change only comments; CI runs all of them.

## Red runs that changed the work

| Run                                | Failure                                                                                 | Action                                                     |
| ---------------------------------- | --------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `check:docs` (first with the rule) | 8 pages documenting 28 exports absent from 0.1.0                                        | Notices; negative control of `unreleased`                  |
| `docs:build`                       | `scrollColorShift: "stops" must be 2–8 CSS colours`: the example and text said `colors` | Fixed; `vocabularyProblems`, `untypedOptionProblems` added |
| `check:docs` (vocabulary)          | `colors`, plus three names of other entries                                             | First fixed; exported names of any entry accepted          |
| `check:docs-site`                  | axe: `scrollable-region-focusable` (SP04), `target-size` (C09), `color-contrast` (T11)  | Examples fixed; P2 and P3 documented                       |
| `pnpm check`                       | Formatting of 2 Markdown tables                                                         | Formatted                                                  |

## Examples

- **Type-check:** 157/157 modules against the package sources.
- **Server rendering:** every live example renders during `docs:build` (its options are validated).
- **Mounting:** 155/155 live examples in both languages without page errors (`check:docs-site`).
- **Exercise (one-off, before the last corrections of B04, B05, C09, D03, M04, SP04 and T11):** every visible button pressed
  and the pointer moved over each example. Chromium and Firefox: 155 examples, 136 presses, no page exception. Two
  presses (G08, C03) timed out because the first button was covered or moving; the same examples answered in the
  targeted run. WebKit: this run stopped at the media page, whose load event waits for a video the preview server
  could not serve in ranges (A10, fixed later; the run was not repeated).
- **Targeted (Chromium, Firefox, WebKit):** P05, P11, G05, G07, G08, G10, G11, ST04–ST08, ST10, SP02, SP03, SP05, SP08,
  C02, C03, T11, B01, B08, B10, D06 and D11 changed as documented; D04, D08 and D10 drew on a WebGL canvas. SP11 was
  confirmed in Chromium. M06 moved in Firefox and WebKit; in Chromium it needs a server with byte ranges.
- **Screenshots** of the 155 examples in Chromium were reviewed; they led to the B04/B05, M04 and D03 corrections.

## Known limitations

- References of the animations entries: names, types and defaults in both languages, descriptions in English.
- The vocabulary check proves that a name exists, not that a sentence is right. Explanations were written from the
  contracts of 009–017 and the declarations; not every sentence was re-tested in a browser.
- Existing public pages were audited by structure, generated data and the findings A1–A11, not re-read line by line.
- PT09 and PT10 have no live example; their behaviour is covered by the Playground and the router consumers.
- The search index is 5.0 MB uncompressed and does not contain the generated references.
- Safari, physical devices, physical GPUs and screen readers: not verified in this phase.
- Package findings P1–P4 ([research.md](research.md)) await an owner decision.

## CI

The run of the commit that contains this file cannot be listed inside it: it is reported in the pull request.
