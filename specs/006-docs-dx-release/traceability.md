# Traceability — feature 006

Brief § → requirement → implementation → verification. Evidence details: [evidence.md](evidence.md).

**Owner closure (2026-11-09): PASS.** Latest CI before closure: run 42711217374 (`8f13a20`, 14/14).
Implementation closure commit `3d86273`: CI run 42632460159, 13/13 jobs green (validate ×5, docs ×3 OS, Next.js +
starters + bundle budgets + release rehearsal ×3 OS, Chromium/Firefox/WebKit on Linux and macOS).
Previous: 42631486037 (`df96f64`, 13/13), 42630400156 (`3182326`, 13/13).

## Success criteria

| SC     | Criterion                                                                         | Result                                                                                                                                                                   |
| ------ | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| SC-001 | `docs:build` on Linux, Windows, macOS                                             | **Met** — CI docs ×3 (run 42630400156)                                                                                                                                   |
| SC-002 | `check:docs` all green (coverage 100 % ×2 locales, links, snippets, translations) | **Met** — local and CI ×3                                                                                                                                                |
| SC-003 | Exported site smoke + axe light/dark                                              | **Met** for WCAG 2.x A/AA (13/13); best-practice advisories from the Fumadocs theme recorded                                                                             |
| SC-004 | `check:next` on three OSes                                                        | **Met** — 14/14, CI ×3                                                                                                                                                   |
| SC-005 | Chromium, Firefox, WebKit smoke on CI                                             | **Met** — 156/156, Linux and macOS                                                                                                                                       |
| SC-006 | `check:starters` builds three starters and ZIPs                                   | **Met** — CI ×3                                                                                                                                                          |
| SC-007 | `check:bundles` within budgets; Button-only free of Radix/Base UI                 | **Met** — CI ×3                                                                                                                                                          |
| SC-008 | `release:simulate` five `0.1.0` tarballs pass `npm publish --dry-run`             | **Met** — local; CI integration job from `df96f64`                                                                                                                       |
| SC-009 | R1–R9 statuses backed by evidence                                                 | **Met** — [release-readiness.md](../../docs/release-readiness.md): R1, R2, R4–R8 met; R3 partially met (manual screen reader pending); R9 assessed, scope ownership open |
| SC-010 | Existing gates green                                                              | **Met** — validate ×5 in every run since `1ec5342`                                                                                                                       |

## Brief sections

| §     | Requirement                                                                         | Implementation                                                                                                                             | Verification                                                      |
| ----- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| 3, 26 | Brand preserved                                                                     | Static imports of the canonical PNG; icons = approved crops (byte-identical test); OG composed, not redrawn; tokens drive the site palette | `tests/brand-assets.test.mjs`; visual review                      |
| 4–5   | Next.js + Fumadocs site, search, nav, TOC, themes, SEO, 404, configurable base URL  | `apps/docs` (ADR 0015)                                                                                                                     | `check:docs-site`, CI docs ×3                                     |
| 5     | Deployment target and instructions                                                  | Vercel (`apps/docs/vercel.json`, `site-url.mjs`, docs/deployment.md); preview artefact per CI run                                          | Workflow reviewed; deployment **not executed** (owner)            |
| 6     | English + Spanish, page-preserving switch, missing-translation policy               | `[lang]` routes, ES content, UI strings, `translations.json`, parity checks                                                                | `check:docs` translations; site smoke                             |
| 7     | Every export documented; coverage check                                             | `exports` frontmatter, `<ApiTable>` from `docs:api`                                                                                        | `check:docs` coverage (317 targets)                               |
| 8     | Getting Started tutorials with complete files                                       | 12 pages EN/ES                                                                                                                             | snippet type-checking                                             |
| 9–14  | Config, breakpoints (phone…wide), layout, typography, components + comparisons, CLI | reference pages + 9 guides                                                                                                                 | `check:docs`; CLI facts checked against source (severities, help) |
| 15–16 | Live previews; dashboard, form, landing                                             | 48 demos; `/{lang}/examples/*`                                                                                                             | typecheck; site smoke                                             |
| 17    | Starters, deterministic ZIPs, no dead download links                                | `starters/*`, `check:starters`; links gated by `release.published`                                                                         | CI ×3                                                             |
| 18    | Docs code verification                                                              | `check:docs` (imports, props via tsc, links, translations, configs, coverage)                                                              | CI                                                                |
| 19    | R1–R9                                                                               | see release-readiness                                                                                                                      | —                                                                 |
| 20    | Packed Next.js consumer                                                             | `check:next`                                                                                                                               | CI ×3                                                             |
| 21    | Chromium/Firefox/WebKit, axe, SR evaluation                                         | `check:browsers` (ADR 0016); SR protocol                                                                                                   | CI Linux/macOS; manual SR owner-reported 10/10 (NVDA + Firefox)   |
| 22    | Package audit, no leaks, tree shaking                                               | metadata rule in `check:pack`; existing leak/allowlist checks; `check:bundles`                                                             | CI                                                                |
| 23    | Versioning transition without lifting guards                                        | fixed group, repaired changesets, `release:simulate`                                                                                       | local + CI                                                        |
| 24–25 | Secure publishing pipeline, manual gate                                             | `release.yml` (tag + environment + OIDC), guards, idempotent publish                                                                       | guard tests; not executed                                         |
| 27    | Open-source presentation                                                            | README, package READMEs, SECURITY, CONTRIBUTING, brand policy (owner-approved), release notes draft, repo metadata suggestions             | review                                                            |
| 28    | Documentation maintenance                                                           | "Contributing to the documentation" page (EN/ES), CONTRIBUTING, CI docs job                                                                | —                                                                 |

## Deviations from the plan

- Brand assets are imported statically by Next (byte-identical by construction) instead of a copy
  script; icons are committed copies guarded by a hash test.
- The site's axe gate covers WCAG 2.x A/AA rules; best-practice advisories caused by the Fumadocs
  theme (table of contents outside a landmark, unnamed scrollable code regions) are recorded, not
  gated.
- Two package changes beyond the R1 fix were required by findings: selection listbox names (axe) and
  a `supports` field in style manifests (needed by the R1 fallback). Both are in the changeset.

## Release checklist (owner gate)

- [x] Manual screen-reader session — NVDA + Firefox, 10/10, owner-reported (2026-11-09)
- [x] npm organisation `neshel-ui` exists; owner's personal 2FA on (owner-confirmed, 2026-11-09)
- [ ] Organisation-wide 2FA enforcement for members (not verified)
- [x] Brand policy reviewed and approved (owner, 2026-11-09)
- [ ] GitHub environment `npm-release` with required reviewers and tag rule
- [ ] Release PR: remove `private`, `changeset version`, review changelogs, green CI
- [ ] Bootstrap credential chosen (short-lived granular token secret, or manual publish)
- [ ] Tag `v0.1.0` pushed; environment approved; registry verification green
- [ ] Trusted publishers configured; tokens disallowed; bootstrap token revoked
- [x] Vercel project imported and production deployed: https://neshel-ui.vercel.app (verified 14/14, 2026-11-09)
- [ ] `release.published = true` only after the npm publication is verified
- [ ] Repository metadata applied (optional)

## Recommendation

**PASS (closed 2026-11-09).** All development, documentation, verification and release-preparation
work of the brief is implemented and verified on three operating systems, with nothing published and
every guard intact. The two former conditions are satisfied: the manual screen-reader evaluation (R3)
was performed and reported by the owner (NVDA + Firefox, 10/10, no issues), and the owner confirmed
the `neshel-ui` npm organisation (R9). The remaining unchecked items above are feature 007
publication steps and require explicit owner authorisation.
