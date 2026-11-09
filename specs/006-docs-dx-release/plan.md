# Implementation Plan: Documentation, developer experience and release readiness

**Spec**: [spec.md](spec.md) · **Research**: [research.md](research.md) · **Tasks**: [tasks.md](tasks.md)

## Summary

Add a static, bilingual Fumadocs site (`apps/docs`) whose reference data is extracted from the
packages' declarations and whose examples are real, type-checked modules; add verified starters;
close the release-readiness backlog with new verification (Next.js packed consumer, Playwright
Firefox/WebKit, bundle budgets, backdrop fallback); prepare a dry-run-verified Changesets and
trusted-publishing pipeline; stop at the owner's publication gate.

## Technical context

- New workspace app `apps/docs`: `next` 16.4.5, `fumadocs-core`/`fumadocs-ui` 16.18.3
  (`fumadocs-ui` = `npm:@fumadocs/base-ui`), `fumadocs-mdx` 15.5.2, `@types/mdx`,
  `@tailwindcss/postcss`, `postcss`, `lucide-react` (site chrome icons), `@fontsource-variable/inter`
  (OFL, site only).
- New root dev dependencies: `playwright` 1.65 (cross-browser), `yazl`-free ZIP writer implemented
  with `node:zlib` (no dependency).
- No change to public package runtime dependencies. Package changes limited to the R1 CSS fix and
  manifest metadata.

## Constitution check

| Principle           | Plan                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------ |
| I Integrity         | No invented APIs, adoption numbers, domains or verifications; honest SR/WebKit scope |
| II Modular packages | Docs app is a consumer; no new package dependencies                                  |
| III CSS-first       | Site themed by Neshel tokens; theme via `data-neshel-theme`; config through the CLI  |
| IV Accessibility    | axe on site and consumers in three engines; manual SR protocol                       |
| V Typography/layout | Docs use the real primitives; Inter loaded to match default metrics                  |
| VI Evidence         | `check:docs`, `check:next`, `check:starters`, `check:bundles`, browsers, simulation  |
| VII Spec-driven     | This spec, ADRs 0015–0017                                                            |
| VIII Safe releases  | Guards stay; simulation in a temp copy; workflow never runs on branch pushes         |
| IX Cross-platform   | Node scripts only; docs and Next checks on three OSes                                |

## Architecture

```text
packages/*/dist/index.d.ts ──► scripts/docs/extract-api.mjs ──► apps/docs/generated/api/*.json
                                                                   │
apps/docs/content/docs/{en,es}/**/*.mdx ──► fumadocs-mdx ──► Next static export (out/)
apps/docs/demos/**/*.tsx  ──► <Preview> (live + source)            │
apps/docs/examples/*      ──► /{lang}/examples/*                    ▼
                                                     scripts/check-docs.mjs (coverage, links,
                                                     translations, snippets, api-fresh, config)
                                                     scripts/check-docs-site.mjs (browser smoke)

tests/fixtures/next-consumer ──► scripts/check-next.mjs (tarballs → next build/start → CDP)
starters/* ──► scripts/check-starters.mjs (tarballs, build) + scripts/starters-zip.mjs
consumer builds ──► scripts/check-cross-browser.mjs (Playwright: chromium/firefox/webkit)
consumer builds ──► scripts/check-bundles.mjs (+ scripts/bundle-budgets.json)
repo copy ──► scripts/release-simulate.mjs (guards removed in copy, changeset version, dry-run)
.github/workflows/{ci.yml (+docs, browsers, next jobs), docs-deploy.yml, release.yml}
```

## Milestones

006.0 spec/ADRs → 006.1 site skeleton, brand, i18n, search, SEO → 006.2 API extraction, coverage,
reference pages → 006.3 getting started, guides → 006.4 previews, examples, starters, snippet
checks → 006.5 R1–R9 (backdrop, Combobox-in-Popover, cross-browser, Next, bundles, docs) →
006.6 metadata, changesets, simulation, release workflow, notes → 006.7 evidence, traceability,
checklist, recommendation.

## Risks

| Risk                                       | Mitigation                                                                    |
| ------------------------------------------ | ----------------------------------------------------------------------------- |
| CI time grows (docs, Next, three browsers) | Separate jobs; browsers on Linux/macOS only; caches                           |
| Fumadocs API churn                         | Pinned exact versions; template-derived structure                             |
| Translation drift                          | Parity check, `exports` equality, contributor checklist                       |
| Playwright browser downloads on CI         | `playwright install --with-deps` per job; skip locally if absent (fail in CI) |
| Changesets peer-bump semantics             | Simulation asserts exact `0.1.0`                                              |
