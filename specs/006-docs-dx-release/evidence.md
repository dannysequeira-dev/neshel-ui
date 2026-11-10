# Evidence — feature 006

States: **implemented** (code exists), **verified locally** (Windows 11, Node 26.13.0, pnpm 12.16.1,
Chrome 156, Playwright 1.65), **verified in CI** (GitHub Actions, named run). Nothing is published;
no guard was lifted; no tag or release was created.

## CI runs

| Run         | Commit    | Jobs                   | Notes                                                                                                           |
| ----------- | --------- | ---------------------- | --------------------------------------------------------------------------------------------------------------- |
| 42563763856 | `055a5df` | 5/5 failed (Typecheck) | Docs app typecheck ran before packages were built; fixed by `tsconfig.typecheck.json`                           |
| 42564331602 | `1ec5342` | 5/5                    | Site, translations, examples                                                                                    |
| 42566411086 | `f526122` | 5/5                    | R1 backdrop fallback, R2 Combobox-in-Popover (CDP suite on three OSes)                                          |
| 42629953416 | `0e53ae3` | cancelled              | superseded by the next push                                                                                     |
| 42630400156 | `3182326` | **13/13**              | validate ×5, docs ×3 OS, next + starters + bundles ×3 OS, browsers (Chromium/Firefox/WebKit) on Linux and macOS |
| 42711217374 | `8f13a20` | **14/14**              | latest before closure (adds the Vercel build job); brand policy approved                                        |
| 42716476478 | `712105a` | 13/14                  | closure docs; docs / macos-latest: Spanish search returned no options (lazy index race)                         |
| 42731164807 | `52b0997` | **14/14**              | **closure run**: the search smoke retypes once when the index arrives late                                      |

The final run for the closure commit is recorded in [traceability.md](traceability.md).

## Website (006.1–006.4)

| Item                                   | Result                                                                                                                                                                                                                                                                        |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Static export                          | `pnpm docs:build`: 163 pages (both locales, examples, search index, sitemap, robots, OG image, 404) — local and CI on three OSes                                                                                                                                              |
| Content                                | 72 pages per locale; 202 API descriptions translated; 0 declared missing translations; 3 proper-name identical titles declared                                                                                                                                                |
| `check:docs`                           | 317 coverage targets (every export of config, layout, typography, components; CLI commands, options, diagnostic codes) documented once per locale; 138 snippets type-checked, 8 `no-check` with reasons; 25 configurations validated with the CLI; links and anchors resolved |
| `check:docs-site`                      | 13/13: languages, canonical + hreflang, language switch keeps the page, theme toggle drives `data-neshel-theme`, Ctrl+K search EN/ES, live preview, three examples, bilingual 404 (status 404), sitemap/robots, axe WCAG 2.x A/AA light and dark on five pages                |
| Accessibility fixes found by the smoke | duplicate `main`, heading order, language switch name not containing its visible text (WCAG 2.5.3), low-contrast syntax colours (high-contrast Shiki themes), duplicate preview region names                                                                                  |
| Best-practice findings left            | Fumadocs table-of-contents outside a landmark (`region`), unnamed scrollable code regions (`landmark-unique`) — upstream theme behaviour, advisory                                                                                                                            |

## Starters and Next.js

| Item              | Result                                                                                                                                                                 |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `check:starters`  | vite-tailwind, vite-css, next-app: deterministic ZIPs (byte-identical twice, exact round trip), installed from tarballs outside the workspace, built — local and CI ×3 |
| `check:next` (R8) | 14/14 — local and CI ×3                                                                                                                                                |

## Browsers and accessibility (R1–R3)

| Item                  | Result                                                                                                                                                                                                                                        |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CDP component suite   | 37 cases × 4 variants + backdrop 6/6 (R1, raw stylesheets, negative control)                                                                                                                                                                  |
| `check:browsers` (R3) | 156/156: 13 flows + 2 axe runs × 4 variants × Chromium 158 / Firefox 159 / WebKit 27.2 — local; CI Linux and macOS                                                                                                                            |
| Accessibility tree    | Identical roles/names across engines ([browsers-report.local.json](evidence/browsers-report.local.json))                                                                                                                                      |
| Defect fixed          | Unnamed selection listboxes (axe `aria-input-field-name` with open popups)                                                                                                                                                                    |
| Finding (accepted)    | Escape within ~50 ms of opening a nested dialog closes both layers in Chromium/WebKit; ≥ 50 ms correct in all engines                                                                                                                         |
| Manual screen reader  | **Owner-reported, 2026-11-09**: NVDA + Firefox on Windows, live docs site, 10/10 steps passed, no issues reported (no transcripts or versions recorded) — [screen-reader-evaluation.md](../../docs/accessibility/screen-reader-evaluation.md) |

## Bundles (R6)

[bundles.local.json](evidence/bundles.local.json); budgets in `scripts/bundle-budgets.json`. Button-only
7.39 KiB gzip without Radix/Base UI; Select 55.2; Combobox 63.3; AppShell + Sidebar 37.1; entire
components library 116.9 (React external). CSS gzip: tokens 0.9, layout 3.6, typography 1.5,
components 5.4 KiB.

## Release candidate (006.6)

| Item               | Result                                                                                                                                                                                                                                               |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `check:pack`       | 5 packages, release metadata enforced                                                                                                                                                                                                                |
| `release:simulate` | five packages → 0.1.0, peers `^0.1.0`, `npm publish --dry-run` ok; inventory: [release-inventory.simulated.json](evidence/release-inventory.simulated.json) (simulated tarballs; final checksums come from the release run)                          |
| Release guards     | refuse `v0.1.0` today (versions 0.0.0, packages private) — verified locally                                                                                                                                                                          |
| npm scope          | 2026-11-08: 404 for the five names and the organisation listing. 2026-11-09: owner confirms the `neshel-ui` organisation exists and personal 2FA is on; organisation listing now 200 (empty), names still 404; org-wide 2FA enforcement not verified |
