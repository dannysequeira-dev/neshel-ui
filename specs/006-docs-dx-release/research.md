# Research — feature 006 (documentation, DX and release readiness)

Decisions R1–R20, taken in milestone 006.0 (2026-11-08) after a repository audit and spikes.
Versions were read from the npm registry on that date; spikes ran on Windows 11, Node 26.13.0,
pnpm 12.16.1.

## R1 — Documentation framework

**Decision:** Next.js 16.4.5 App Router + Fumadocs 16.18.3 (`fumadocs-core`, `fumadocs-ui`) +
`fumadocs-mdx` 15.5.2, in `apps/docs`, TypeScript strict, Tailwind CSS 4.3 through
`@tailwindcss/postcss`. `fumadocs-ui` is installed as `npm:@fumadocs/base-ui@16.18.3`, exactly as
the official `create-fumadocs-app@16.2.32` template does (its Base UI flavour; our components already
ship Base UI).

**Spike:** `create-fumadocs-app --template +next+fuma-docs-mdx+static --pm pnpm --search orama`
built a static export on Windows (12 static routes, 2.6 s page generation). The template's
`next/font/google` fetches fonts at build time; it is not used (R4).

**Alternatives:** Storybook-only (already exists, not a documentation site), Docusaurus/Astro
Starlight (not React Server Components, would not exercise the App Router integration), Nextra
(smaller i18n/search story). Fumadocs was the owner's preferred option and fits.

## R2 — Rendering, hosting and base URL

**Decision:** fully static export (`output: "export"`). Public base URL and base path are build
inputs: `NESHEL_DOCS_SITE_URL` (canonical/OG/sitemap origin, default `http://localhost:3000` and
`noindex` while unset) and `NESHEL_DOCS_BASE_PATH` (e.g. `/neshel-ui` for a GitHub Pages project
site). No production domain is invented.

**Recommended target:** GitHub Pages through GitHub Actions — free for public repositories, no
server, no extra account, artefacts built by the same CI. Preview: every CI run uploads the static
site as an artefact; locally `pnpm docs:build && pnpm docs:preview` serves it. Production
deployment (a `workflow_dispatch` job) requires the owner to enable Pages (Settings → Pages →
Source: GitHub Actions). Alternatives documented with costs: Cloudflare Pages and Netlify (free
static tiers, need an external account), Vercel Hobby (free but non-commercial terms; preview
deployments per PR). Static export rules out middleware, so i18n uses path prefixes (R3).

**Amendment (owner decision, 2026-11-09):** the documentation is hosted on **Vercel** (native Git
integration: production from `main`, previews for pull requests), not GitHub Pages. The static export
is kept; `apps/docs/vercel.json` installs the workspace with pnpm 12.16.1, builds the packages, then
the site, and serves `out`. The origin is resolved from `NESHEL_DOCS_SITE_URL` or Vercel's
`VERCEL_PROJECT_PRODUCTION_URL` / `VERCEL_URL` (never invented); base path empty. The GitHub Pages
workflow was removed. Guide: [docs/deployment.md](../../docs/deployment.md).

## R3 — Internationalisation

**Decision:** `defineI18n({ languages: ["en", "es"], defaultLanguage: "en", parser: "dir",
hideLocale: "never", fallbackLanguage: "en" })`. Routes `/{lang}/…`; content mirrored under
`content/docs/en` and `content/docs/es`. The root `/` is a static language chooser that redirects to
`/en/` (meta refresh + link). The language switch maps the current slug to the other locale.

**Missing translations:** the loader falls back to English; such a page renders a visible
"not translated yet" notice (`lang` attribute set to `en` on the content), is listed in the
translation report, and `check:docs` fails unless the page is declared in
`apps/docs/translations.json` with a reason. The release candidate target is **zero** fallbacks.
UI strings come from Fumadocs' translation API plus a Neshel dictionary checked for key parity.

**Search:** Orama static index per locale (`english`, `spanish` stemmers) built at export time.

## R4 — Styling and brand on the website

**Decision:** Fumadocs' Tailwind preset with its colour variables (`--color-fd-*`) mapped to Neshel
semantic tokens (`var(--neshel-background)`, …), so the site is navy/ivory/gold through the same
tokens consumers use. Neshel stylesheets are imported in the canonical order. The site loads Inter
from `@fontsource-variable/inter` (SIL OFL 1.1, bundled by the docs build only; never part of a
published package), which matches the default Capsize metrics. Brand images are copied, not
modified, from `assets/brand/` by a build script; the favicon and OG image derive from the approved
mark crops (resize/compose only, ivory background kept). The canonical logo is shown as the PNG it
is.

**Theme sync:** Fumadocs uses `next-themes`; it is configured with `attribute: ["class",
"data-neshel-theme"]`, so one toggle drives Fumadocs (`.dark`) and Neshel (`data-neshel-theme`).

## R5 — API reference source of truth

**Decision:** `scripts/docs/extract-api.mjs` uses the TypeScript compiler API (already a dev
dependency) on each package's built `dist/index.d.ts`, enumerating every export (value/type) and,
for props interfaces, the properties **declared in Neshel sources** (inherited DOM/Radix
attributes are summarised as "extends …"), their types, JSDoc and defaults parsed from
`(default \`x\`)`in the JSDoc. Output:`apps/docs/generated/api/<package>.json`, committed and
verified fresh by `check:docs`. Pages render it with a server-side `<ApiTable />`— no hand-copied
props tables.`fumadocs-typescript` was considered; our own extractor gives deterministic,
diffable JSON and control over inherited members.

## R6 — Export-to-documentation coverage

Each reference page lists the exports it documents in frontmatter (`exports: [Button,
ButtonProps, …]`, `package: components`). `check:docs` fails when an export of a public package is
undocumented, documented twice, or listed but not exported, in either language.

## R7 — Verified snippets and previews

- Previews are real modules in `apps/docs/demos/**` that import from `@neshel-ui/*`; the page shows
  the running component and the **same file's** source (read at build time), so displayed code is
  the executed code and is covered by `tsc`.
- Fenced `tsx`/`ts` blocks in MDX are extracted by `check:docs` and type-checked in a generated
  program with the workspace packages. Blocks marked `fragment` are wrapped in a component with all
  public names imported; blocks marked `no-check` must carry a reason in the block title and are
  reported. CSS, shell and JSON blocks are syntax-only (JSON parsed).
- Internal links are resolved against the generated route list (both locales); anchors are checked
  against heading slugs.

## R8 — Examples

Dashboard, advanced form and landing page are full routes (`/{lang}/examples/…`) built from
`apps/docs/examples/*` modules (client components only where state is needed), with source tabs.
The landing example uses a named theme generated by the docs app's own `neshel.config.ts`.

## R9 — Starters and downloads

**Decision:** three starters in `starters/` (`vite-tailwind`, `vite-css`, `next-app`) depending on
`^0.1.0` registry ranges (no `workspace:` or `catalog:`). `pnpm check:starters` copies each to a
temporary directory outside the workspace, overrides the Neshel dependencies with freshly packed
tarballs, installs, type-checks and builds. `pnpm starters:zip` writes deterministic ZIP archives
(sorted entries, fixed timestamps, LF) that the same check unpacks and builds. The website links the
ZIPs only when `release.published` (single source `apps/docs/lib/release.ts`) is true; before
publication it shows clone + tarball instructions. No download link to a non-installable artefact is
advertised.

## R10 — Isolated Next.js consumer

`pnpm check:next` generates a Next.js 16 App Router app outside the workspace from
`tests/fixtures/next-consumer`, installs packed tarballs, runs `neshel generate` (custom breakpoints
`phone … wide` in `replace` mode, a named theme, Capsize fallbacks), `next build`, `next start`, and
drives it in headless Chrome (CDP harness) to check SSR markup, hydration without warnings, client
interaction, portals with nested themes, CSS order, breakpoints and typography trimming. A
server-component page imports presentational components without `"use client"`. The packed modules'
`"use client"` directives are asserted present.

## R11 — Cross-browser verification

**Decision:** Playwright 1.65 (`playwright` library, not the test runner) as a root dev dependency
for Chromium, Firefox and WebKit smoke flows against the packed component consumers, served by a
small Node static server (WebKit and Firefox restrict `file://` module loading). The existing CDP
harness stays the deep Chrome suite. CI: a `browsers` job on `ubuntu-latest` (all three engines,
`playwright install --with-deps`) and on `macos-latest` (all three; WebKit closest to Safari).
Windows CI keeps the Chrome suite (WebKit on Windows is not representative of Safari).

## R12 — Screen-reader evaluation

Automated checks cannot establish screen-reader behaviour. Deliverables: a documented manual
protocol (NVDA + Firefox on Windows, VoiceOver + Safari on macOS, Narrator + Edge), accessibility-
tree snapshots of key flows captured by the browser suite as supporting evidence, and an evidence
entry stating exactly what was and was not tested by a human. R3 is closed only for the parts
actually executed.

## R13 — Overlay backdrop without `light-dark()` (release requirement R1)

The backdrop is `var(--neshel-overlay-backdrop, light-dark(…))`. In browsers without
`light-dark()` the declaration is valid at parse time (it contains `var()`) but invalid at
computed-value time, so it becomes `unset` → **transparent** (no dimming). A plain earlier
declaration cannot rescue it. **Fix:** an `@supports not (color: light-dark(Canvas, CanvasText))`
block that sets the backdrop from `color-mix()` of the foreground (light contexts) and, for
`data-neshel-theme="dark"` and `system` under `prefers-color-scheme: dark`, of the background.
Named dark-based themes in those browsers get the light-context mix (a visible but light scrim,
because their foreground is light); documented with the remedy (set `--neshel-overlay-backdrop`
for that theme). Verified
in a browser by loading a copy of the stylesheet in which `light-dark` is renamed, which reproduces
both the invalid declaration and the `@supports not` branch.

## R14 — Bundle budgets (release requirement R6)

`pnpm check:bundles` builds one Vite (Rolldown) production entry per public component family from
the packed tarballs, records minified and gzip sizes in a report, and compares gzip sizes with
`scripts/bundle-budgets.json` (measured value + ~10 % headroom, rounded). It also asserts the
Button-only bundle contains no Radix/Base UI code (existing tree-shaking proof).

## R15 — Versioning and the private-guard transition

Findings: `privatePackages.version: false` makes Changesets ignore the five packages while they are
private; two existing changeset files have corrupted frontmatter (a Markdown formatter turned the
YAML block into a Setext heading); Changesets bumps dependents of a changed **peer** dependency with
a major release by default, which would push 0.x packages to 1.0.0.

**Decision:** a `fixed` Changesets group for the five public packages during 0.x (one version
line; peers `workspace:^` become `^0.1.0`), corrected changeset files, and
`pnpm release:simulate`, which copies the repository to a temporary directory, removes the guards
**in the copy only**, runs `changeset version`, verifies every public package becomes exactly
`0.1.0` with matching peer ranges, packs, and runs `npm publish --dry-run` per tarball. The real
transition is a single owner-approved release PR (remove `private`, `changeset version`, review).
Version source: `package.json` versions written by Changesets only.

## R16 — Publishing pipeline

npm Trusted Publishing (OIDC) requires npm CLI ≥ 11.5.1 and Node ≥ 22.14, `id-token: write`, a
GitHub-hosted runner, and a `repository.url` matching the repository; provenance is automatic for
public repositories. A trusted publisher can only be configured on an **existing** package, and a
new configuration must be used within 2 days. Therefore:

- `release.yml`: triggered by a pushed tag `v<version>` (the owner's tag-driven plan) and
  `workflow_dispatch` (dry run), environment `npm-release` with required reviewers, least privilege
  (`contents: read`, `id-token: write` only in the publish job), builds and validates, packs the five
  tarballs once, and publishes **those tarballs** with npm in dependency order (`config` first, then
  `layout`, `typography`, `components`, `cli`), skipping versions already published (idempotent
  re-run), then verifies installation from the registry.
- Bootstrap of 0.1.0 (owner decision): (a) a granular, short-lived (≤ 7 days) automation token
  limited to the five packages, stored as an environment secret, used once by the same workflow
  with `--provenance`, then revoked; or (b) a manual local `npm publish` of the CI-built tarballs
  with 2FA (no provenance for 0.1.0). Afterwards: configure trusted publishers for each package,
  "require 2FA and disallow tokens", delete the token.

## R17 — npm scope (release requirement R9)

Anonymous registry queries on 2026-11-08: `@neshel-ui/{config,layout,typography,components,cli}`
→ 404 (no published package), `/-/org/neshel-ui/package` → 404. A 404 does not prove that the scope
is unowned or that it can be claimed: organisation ownership requires the owner to create (or
confirm) the `neshel-ui` npm organisation while signed in. Recorded as an owner action.

## R18 — Package metadata

Add `repository` (with `directory`), `homepage`, `bugs`, `keywords`, `author`, `engines` (React
packages: none beyond peers; `cli` keeps Node ≥ 22.13), `funding` omitted. Validated by
`check:pack` (new manifest rules) so a missing field fails CI.

## R19 — Documentation CI

New CI job `docs` on Linux, Windows and macOS: build packages, `pnpm docs:api --check`,
`pnpm check:docs`, `pnpm docs:build`, browser smoke of the exported site (navigation, search, theme
toggle, language switch, axe on representative pages). The Linux job uploads the static site as the
preview artefact.

## R20 — `neshel init`

Not implemented. A proposal (scaffolding `neshel.config.ts`, CSS imports and scripts) is recorded in
the CLI documentation as "proposed, not implemented"; it requires its own scope decision.
