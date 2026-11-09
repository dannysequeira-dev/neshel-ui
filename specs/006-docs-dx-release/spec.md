# Feature Specification: Official documentation, developer experience and release readiness

**Feature Branch**: `main` (spec directory `specs/006-docs-dx-release`; no feature branch)

**Created**: 2026-11-08

**Status**: **Complete — CONDITIONAL PASS recommended** (milestones 006.0–006.7). Awaiting the owner's
review. No package is published, no guard lifted, no tag or release created. Evidence:
[evidence.md](evidence.md), [traceability.md](traceability.md).

**Input**: Owner brief "Neshel-UI — Phase 006: Official Documentation, Developer Experience &
Release Readiness" (2026-11-08), summarised in [brief.md](brief.md). The brief is authoritative
and pre-authorises autonomous execution of milestones 006.0–006.7.

Companion documents: [research.md](research.md) (R1–R20), [plan.md](plan.md),
[tasks.md](tasks.md), [analysis.md](analysis.md), contracts
[docs-site.md](contracts/docs-site.md), [docs-content.md](contracts/docs-content.md),
[release.md](contracts/release.md); ADRs
[0015](../../docs/decisions/0015-documentation-website.md),
[0016](../../docs/decisions/0016-cross-browser-verification.md),
[0017](../../docs/decisions/0017-release-and-publishing-pipeline.md).

## Problem

The five intended public packages are implemented and verified, but a consumer cannot discover,
learn or install them: documentation is spread over repository Markdown written for maintainers,
the root README predates the components, there is no website, no Spanish documentation, no
starters, no Next.js evidence, Chrome is the only tested browser, nine pre-publication requirements
(R1–R9) are open, and there is no reviewed publishing pipeline.

## Goals

1. An official, branded, bilingual (English/Spanish) documentation website in `apps/docs` built
   with Next.js App Router and Fumadocs, deployable as static files to a free host.
2. Documentation of every public export, generated from the TypeScript declarations where it is
   factual (props, types, defaults), with a coverage check.
3. Tutorials, guides, live previews, three application examples and verified starters.
4. Release hardening: R1–R9 closed or explicitly assessed with evidence; isolated Next.js
   consumer; Chromium, Firefox and WebKit coverage; bundle budgets; package metadata audit.
5. A release candidate for `0.1.0`: versioning transition simulated, trusted-publishing workflow
   prepared, release notes drafted, and an exact list of owner actions — without publishing.

## Non-goals

Publishing to npm, removing `private: true`, tags, GitHub Releases, DNS or domain changes, npm
organisation settings, new components or public API changes not required by a release blocker,
`neshel init` implementation, a paid CMS or search service, a hosted playground/sandbox service,
documentation versioning beyond "0.1.x (current)", languages other than English and Spanish.

## Clarifications

### Session 2026-11-08 — owner brief and agent decisions

The brief answers the scope questions; remaining ambiguities were resolved under its rules:

- Q: Phase 006 vs Phase 007 authority? → A: Phase 006 builds and dry-runs the pipeline; executing a
  publication, tags and releases stay with the owner-authorised publication milestone (roadmap row
  007 renamed "First publication (owner-authorised)").
- Q: Deployment target? → A: static export on **Vercel** (owner decision 2026-11-09, replacing
  the initial GitHub Pages choice); importing the project is an owner action (R2 amendment).
- Q: Missing translations? → A: English fallback with a visible notice, declared in
  `translations.json`; release-candidate target zero fallbacks (R3).
- Q: Download ZIPs before packages exist on npm? → A: generated and verified, linked only after
  publication (R9).
- Q: Which browsers count as "WebKit"? → A: Playwright WebKit on Linux and macOS CI runners;
  it is not Safari, and the evidence says so (R11).
- Q: Can screen-reader verification be automated? → A: no; documented manual protocol plus
  accessibility-tree evidence, honest status (R12).
- Q: Versioning model? → A: Changesets with a `fixed` group of the five packages in 0.x (R15).

## User scenarios

- **US1 (P1) New consumer**: finds the site, follows Getting Started, installs (tarball today,
  npm after release), renders a Button, Stack, Heading/Paragraph and a Dialog in a fresh app.
- **US2 (P1) Integrator**: looks up any public export and finds purpose, import, props/types and
  defaults generated from the declarations, accessibility and keyboard behaviour.
- **US3 (P1) Spanish-speaking developer**: reads the same pages in Spanish and switches language
  without losing the page.
- **US4 (P2) Brand owner**: changes colours, fonts and breakpoints of an application through
  `neshel.config.ts` without adopting Neshel's navy/gold identity.
- **US5 (P2) Next.js developer**: uses the packages in an App Router app with Server Components.
- **US6 (P1) Owner/release manager**: reviews a release candidate with evidence and executes a
  documented, secure publication when ready.

## Functional requirements

### Website (006.1)

- **FR-001** `apps/docs`: Next.js App Router + Fumadocs + MDX, TypeScript strict, static export,
  workspace package (`private: true`), no new runtime dependency in any published package.
- **FR-002** Brand: canonical logo unchanged (raster PNG, never presented as SVG), derived favicon
  and OG images from approved assets only, Neshel tokens drive the site's colours in light and dark;
  tagline present; calm, non-decorative technical pages.
- **FR-003** Navigation: home page, documentation landing, sidebar, TOC, previous/next, breadcrumb,
  responsive mobile navigation, keyboard-accessible, skip link.
- **FR-004** Search: static, per locale, no paid service.
- **FR-005** Themes: light/dark/system toggle synchronised with `data-neshel-theme`.
- **FR-006** Code: syntax highlighting (light/dark), copy buttons, file titles.
- **FR-007** SEO: per-page title/description, canonical URLs, Open Graph/Twitter metadata, OG
  image, `sitemap.xml`, `robots.txt` (`noindex` unless a public site URL is configured), `hreflang`
  alternates, useful 404 page with navigation.
- **FR-008** Repository links: GitHub link, edit-this-page link per page, version and release
  status from a single source (`apps/docs/lib/release.ts`, versions read from package manifests).
- **FR-009** Configurable `NESHEL_DOCS_SITE_URL` and `NESHEL_DOCS_BASE_PATH`; documented
  deployment target, costs, preview and production steps.

### Internationalisation

- **FR-010** English and Spanish with mirrored content; real translations of all pages, UI strings
  and metadata; search in both languages.
- **FR-011** Language switch preserving the page when a translation exists.
- **FR-012** Missing-translation behaviour documented and visible; translation parity check;
  contributor workflow for documentation updates.

### Documentation content (006.2–006.3)

- **FR-020** Every public export of `config`, `layout`, `typography`, `components`, `cli` (bin)
  documented on exactly one page (or an explicitly identified section), per locale; coverage check.
- **FR-021** Props, types and defaults generated from declarations (R5), never hand-copied.
- **FR-022** Component pages follow the 16-point content model of [docs-content.md](contracts/docs-content.md).
- **FR-023** Getting Started tutorials (brief §8) with complete, type-checked source files;
  npm instructions marked "after publication"; tarball instructions; consumer vs maintainer split;
  peer dependency table.
- **FR-024** Configuration/theming (brief §9), custom breakpoints with the `phone … wide`
  end-to-end example (brief §10), Layout (§11) with recipes, Typography (§12), Components (§13)
  including the comparisons, CLI reference (§14) without invented commands.
- **FR-025** Known limitations from R4, R5 and Phase 004 documented on the relevant pages.

### Examples and DX (006.4)

- **FR-030** Live previews built from real modules importing `@neshel-ui/*`, with the same file's
  source shown; theme preview in light and dark.
- **FR-031** Dashboard, advanced form and landing page examples (brief §16) with source.
- **FR-032** Starters (`vite-tailwind`, `vite-css`, `next-app`) without workspace aliases,
  verified outside the monorepo from tarballs; deterministic ZIPs verified; download links gated on
  publication.
- **FR-033** Documentation verification (brief §18): imports/exports, props (type-check), snippets,
  internal links and anchors, translations, example configuration (`neshel validate`), coverage;
  omissions reported.

### Release hardening (006.5)

- **FR-040** R1 backdrop fallback fixed and verified in a browser (R13).
- **FR-041** R2 Combobox inside Popover browser tests (focus, Escape, selection, dismissal, nested).
- **FR-042** R3 Chromium/Firefox/WebKit smoke flows (Dialog, Select, MultiSelect, Combobox,
  Popover, nested overlays, mobile navigation, Sidebar, theme inheritance) with axe; screen-reader
  protocol and honest evidence.
- **FR-043** R4 Sidebar remounting and R5 portal `container` documented (guide + component pages).
- **FR-044** R6 per-family bundle measurements and budgets enforced; Button-only tree-shaking kept.
- **FR-045** R7 root README, package READMEs and installation docs current.
- **FR-046** R8 isolated Next.js App Router consumer from tarballs (R10).
- **FR-047** R9 Phase 004 limitations assessed one by one; npm scope status recorded.

### Release candidate (006.6–006.7)

- **FR-050** Package metadata complete and enforced by `check:pack` (R18); no leaks (tests, fixtures,
  fonts, credentials, internal paths); `core` not required.
- **FR-051** Changesets: corrected files, `fixed` group, simulation to `0.1.0` with dry-run publish
  (R15); versioning policy for breaking/minor/patch documented.
- **FR-052** `release.yml` per R16, never triggered by ordinary pushes; owner setup documented.
- **FR-053** Open-source files: README, CONTRIBUTING, Code of Conduct, SECURITY, brand asset policy
  draft (owner review), release notes draft, repository metadata suggestions, documentation
  maintenance process.
- **FR-054** Evidence, traceability, release checklist and a PASS / CONDITIONAL PASS / FAIL
  recommendation; stop before the publication gate.

## Success criteria

- **SC-001** `pnpm docs:build` produces a static site on Linux, Windows and macOS CI.
- **SC-002** `pnpm check:docs` passes: 100 % export coverage in both locales, zero broken internal
  links/anchors, zero failing snippets, zero undeclared translation fallbacks.
- **SC-003** The exported site passes a browser smoke (navigation, search, theme, language switch)
  and axe without violations on representative pages in light and dark.
- **SC-004** `pnpm check:next` passes on three OSes: build, SSR, hydration without errors, client
  interaction, portals/themes, breakpoints, typography.
- **SC-005** The cross-browser smoke passes in Chromium, Firefox and WebKit on CI.
- **SC-006** `pnpm check:starters` builds the three starters and their ZIPs from tarballs.
- **SC-007** `pnpm check:bundles` passes within budgets; Button-only bundle free of Radix/Base UI.
- **SC-008** `pnpm release:simulate` yields five `0.1.0` tarballs that pass `npm publish --dry-run`.
- **SC-009** R1–R9 each have a status backed by evidence in `docs/release-readiness.md`.
- **SC-010** All existing gates stay green (no weakened gate).
