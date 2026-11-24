# Plan — Phase 018: Documentation

Spec: [spec.md](spec.md) · Research: [research.md](research.md) · Tasks: [tasks.md](tasks.md) · Evidence:
[evidence.md](evidence.md)

## Technical context

Next.js 16 static export with Fumadocs (ADR 0015), MDX in `apps/docs/content/docs/{en,es}`, generated API data, Node
scripts, `node:test`. No new third-party dependency; `@neshel-ui/animations` is a `workspace:*` dependency of the private
docs app.

## Constitution check

| Principle                 | How the plan complies                                                                       |
| ------------------------- | ------------------------------------------------------------------------------------------- |
| I Integrity               | Status notices; unverified areas named (Safari, devices, screen readers); findings reported |
| II Modular packages       | No package depends on the docs app; no package behaviour changes                            |
| IV Accessibility          | axe on every family page in both schemes; keyboard input test; labelled filter              |
| VI Evidence before claims | Catalogue checked against contract, declarations, runtime definitions and examples          |
| VII Small slices          | 018.0–018.6, separately committed                                                           |
| VIII Safe releases        | No version, changeset, tag or publication; animations stays private 0.0.0 (checked)         |
| IX Cross-platform         | Node-only scripts; CI on three systems                                                      |

## Slices

| Slice | Content                                                                                     |
| ----- | ------------------------------------------------------------------------------------------- |
| 018.0 | Audit, specification, status of 017                                                         |
| 018.1 | API extraction per animations entry; catalogue data; integrity checks and negative controls |
| 018.2 | Public packages: unreleased notices, Phase 017 pages, guides                                |
| 018.3 | Animations: guides, catalogue, references                                                   |
| 018.4 | 157 examples and 15 family pages, EN/ES, option translations                                |
| 018.5 | Site checks in a real browser; findings                                                     |
| 018.6 | Full local gates, PR, CI on the final SHA                                                   |

## Test strategy

| Level                  | What                                                                                              |
| ---------------------- | ------------------------------------------------------------------------------------------------- |
| `pnpm test`            | Negative controls of every integrity rule, without a build                                        |
| `pnpm typecheck`       | The 157 examples against the package sources                                                      |
| `pnpm check:docs`      | Catalogue ↔ contract ↔ declarations ↔ definitions ↔ examples ↔ EN/ES; unreleased; snippets; links |
| `pnpm docs:build`      | Server rendering of every page and example (options are validated during render)                  |
| `pnpm check:docs-site` | Real Chrome: 30 family pages, catalogue filter, search, keyboard input, axe light/dark            |
| One-off (recorded)     | Every example exercised in Chromium, Firefox and WebKit                                           |

## Risks

- **CI time**: the site check grew from about 1 to about 3 minutes; the docs job has a 25-minute limit.
- **Search index**: 5.0 MB uncompressed, loaded when the search opens. Accepted for now; Phase 019 may split it.
- **Static export size** grows with 86 new pages per build (generated references are large HTML).
- **Vercel** builds the docs app from the same workspace command; the `vercel build` CI job covers it.
- **Drift** between the catalogue contract and the code is now a failing check instead of a review duty.
