# Tasks: Documentation, developer experience and release readiness

Dependency-ordered. `[P]` = can run in parallel with the previous task. Status: `[x]` done,
`[ ]` open. Requirement links in parentheses.

## 006.0 — Architecture and specification

- [x] T001 Repository audit (constitution, roadmap, readiness, releasing, branding, contracts, ADRs, specs 001–005, packages, scripts, CI, Changesets)
- [x] T002 Spikes: Fumadocs static template build; npm registry/scope probes; trusted publishing requirements
- [x] T003 brief.md, spec.md, research.md (R1–R20)
- [x] T004 Contracts: docs-site, docs-content, release
- [x] T005 plan.md, tasks.md
- [x] T006 ADRs 0015 (documentation website), 0016 (cross-browser), 0017 (release pipeline)
- [x] T007 analysis.md; roadmap and release-readiness updated

## 006.1 — Documentation website

- [ ] T010 `apps/docs` scaffold (Next 16, Fumadocs, MDX, static export, base path/site URL) (FR-001, FR-009)
- [ ] T011 Brand assets script, favicon/OG derivation, token-mapped theme, Inter (FR-002, FR-005)
- [ ] T012 i18n (en/es routes, UI dictionary, language switch, fallback notice) (FR-010–FR-012)
- [ ] T013 Search, sidebar, TOC, prev/next, edit links, version info, 404 (FR-003, FR-004, FR-008)
- [ ] T014 SEO: metadata, canonical, hreflang, sitemap, robots, OG (FR-007)
- [ ] T015 Home/landing page (brief §26)

## 006.2 — API documentation

- [ ] T020 extract-api script + generated JSON + freshness check (FR-021)
- [ ] T021 `<ApiTable>`, `<ExportList>`, `<Preview>` MDX components (FR-030)
- [ ] T022 Package overview pages; Layout (7), Typography (4), Components (22), CLI (5) pages EN (FR-020, FR-022, FR-024)
- [ ] T023 Spanish translations of all reference pages (FR-010)
- [ ] T024 check-docs: coverage, translations, links, demos, api-fresh (FR-020, FR-033)

## 006.3 — Installation and customisation

- [ ] T030 Getting Started (14 tutorials) EN/ES with complete sources (FR-023)
- [ ] T031 Guides: theming, breakpoints (phone…wide), typography/Capsize, accessibility, Next.js, overlays/portals (R4/R5), forms, choosing components, troubleshooting (FR-024, FR-025, FR-043)

## 006.4 — Examples and developer experience

- [ ] T040 Demos for every component family; theme preview (FR-030)
- [ ] T041 Examples: dashboard, form, landing with named theme (FR-031)
- [ ] T042 Starters + check-starters + deterministic ZIPs (FR-032)
- [ ] T043 Snippet type-checking and config validation in check-docs (FR-033)

## 006.5 — Compatibility and release hardening

- [ ] T050 R1 backdrop `@supports` fallback + browser test (FR-040)
- [ ] T051 R2 Combobox inside Popover browser tests (FR-041)
- [ ] T052 R3 Playwright cross-browser smoke + axe; CI jobs; SR protocol and evidence (FR-042)
- [ ] T053 R8 isolated Next.js consumer `check:next` (FR-046)
- [ ] T054 R6 bundle measurements and budgets (FR-044)
- [ ] T055 R7 root README, package READMEs (FR-045)
- [ ] T056 R9 Phase 004 limitations assessment; scope status (FR-047)
- [ ] T057 Docs site browser smoke + axe (SC-003)

## 006.6 — Release candidate preparation

- [ ] T060 Package metadata + check-pack manifest rules (FR-050)
- [ ] T061 Changesets repair, fixed group, release:simulate with dry-run publish (FR-051)
- [ ] T062 release.yml, docs-deploy.yml; releasing.md rewrite (FR-052)
- [ ] T063 Release notes draft, brand policy draft, SECURITY/CONTRIBUTING, repo metadata suggestions, docs maintenance (FR-053)
- [ ] T064 CI on three OSes green (SC-010)

## 006.7 — Formal closure

- [ ] T070 evidence.md, traceability.md, release checklist, recommendation (FR-054)
