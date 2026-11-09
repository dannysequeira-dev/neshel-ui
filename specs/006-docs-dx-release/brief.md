# Owner brief — Phase 006 (summary)

Source: "Neshel-UI — Phase 006: Official Documentation, Developer Experience & Release Readiness",
the first and only Phase 006 brief from the project owner (2026-11-08). This file summarises it for
traceability; section numbers (§) match the brief. The brief is authoritative.

## Goal

Turn the implemented design system into a professionally documented, discoverable, independently
consumable open-source product, ready for its first npm release (`0.1.0`), and stop at a manual
publication gate.

## Authorisation (§30) and the release gate (§25)

- Autonomous: specifications, the documentation website, dependencies, documentation, examples
  and starters, package defect fixes that block release readiness, browser coverage, documentation
  checks, release workflows, safe publication simulations (dry runs), Conventional Commits,
  fast-forward pushes to `origin/main`, CI monitoring and repair. No routine approval between
  milestones.
- Forbidden without explicit owner authorisation: removing `private: true`, npm publication,
  release tags, GitHub Releases, official domain/DNS changes, npm organisation security settings,
  force-push, rewriting pushed history, `Co-Authored-By` trailers, weakening quality gates,
  replacing the brand, inventing APIs, silently skipping translations, claiming deployment or
  publication without verification. A green CI is not an authorisation to publish.
- The roadmap separation of Phase 006 (documentation/readiness) and Phase 007 (publishing) is kept:
  Phase 006 prepares and tests the pipeline; executing it belongs to the owner-authorised milestone.

## Scope

| §     | Area                          | Summary                                                                                                                                                                                           |
| ----- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3, 26 | Brand                         | Midnight/navy, ivory, restrained gold; canonical logo unchanged (raster, not SVG); derived crops only from approved assets; calm, premium, not decorative.                                        |
| 4–5   | Website                       | Next.js App Router + Fumadocs + MDX in `apps/docs`; search, sidebar, TOC, prev/next, mobile nav, dark/light, copyable highlighted code, previews, keyboard, SEO/OG/sitemap/robots/canonical, 404. |
| 5     | Deployment                    | Configurable base URL; no invented domain; documented target with cost; preview and production instructions; no unnecessary paid services.                                                        |
| 6     | i18n                          | English (canonical) and Spanish with real translations; page-preserving language switch; documented missing-translation behaviour; consistency checks.                                            |
| 7     | Completeness                  | Every public export discoverable, sourced from declarations; 16-point content model per component family; export-to-docs coverage check.                                                          |
| 8     | Getting Started               | 14 tutorials with complete source; npm vs tarball installation; consumer vs maintainer instructions; peer dependencies.                                                                           |
| 9–14  | Reference                     | Config/theming, custom breakpoints (phone…wide end-to-end), Layout, Typography, the complete Components catalog and comparisons, CLI reference (no invented commands; `init` only as a proposal). |
| 15–16 | Previews and examples         | Live previews with real imports; dashboard, advanced form, landing page examples with source.                                                                                                     |
| 17    | Starters                      | Evaluate Vite+Tailwind, Vite+CSS, Next.js starters; deterministic, verified ZIPs if offered; never advertise a missing download.                                                                  |
| 18    | Docs verification             | Imports, exports, props, TypeScript, links, translations, snippets, configuration, coverage.                                                                                                      |
| 19    | Release backlog               | Close R1–R9 of `docs/release-readiness.md` with evidence.                                                                                                                                         |
| 20    | Next.js                       | Isolated App Router consumer from packed packages: RSC, client boundaries, `"use client"`, SSR, hydration, CSS order, themes, portals, breakpoints, Capsize, production.                          |
| 21    | Browsers and a11y             | Chromium, Firefox, WebKit flows; axe kept; practical screen-reader evaluation documented honestly.                                                                                                |
| 22–24 | Package quality and releasing | Metadata audit, package graph, artifact leaks, tree shaking; Changesets transition to `0.1.0` without lifting guards; trusted publishing with OIDC and provenance; safe order.                    |
| 27–28 | Open source and maintenance   | README, package READMEs, contributing, security, brand asset policy (owner review), release notes draft, repo metadata suggestions, OG images; documentation maintenance process.                 |

## Milestones (§29)

006.0 architecture and specification · 006.1 website · 006.2 API documentation · 006.3
installation and customisation · 006.4 examples and DX · 006.5 compatibility and release hardening
· 006.6 release candidate · 006.7 formal closure and launch handoff (stop at the publication gate).

## Completion report (§31)

Twenty items, ending with a PASS / CONDITIONAL PASS / FAIL recommendation.
