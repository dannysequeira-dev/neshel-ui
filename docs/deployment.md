# Documentation deployment — Vercel

**Decision (owner, 2026-11-09):** the official documentation website (`apps/docs`) is hosted on
**Vercel**, not GitHub Pages. The static export architecture is unchanged (ADR 0015, amended): Vercel
serves `apps/docs/out` as static files. Status: **deployed** — production: **https://neshel-ui.vercel.app** (Vercel project created by the owner on
2026-11-09, production branch `main`; first successful production deployment from commit
`31d58e8`). Preview and branch URLs are protected by Vercel Authentication and sent with
`X-Robots-Tag: noindex`.

## How the build works on Vercel

`apps/docs/vercel.json` (committed) defines everything that must not drift:

| Setting          | Value                                                                             | Why                                                                                                         |
| ---------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Framework        | `nextjs`                                                                          | Vercel's Next.js support serves the static export (`output: "export"`) itself                               |
| Install command  | `npm install --global pnpm@12.16.1 && cd ../.. && pnpm install --frozen-lockfile` | Install the whole pnpm workspace from the repository root with the pinned pnpm and the committed lockfile   |
| Build command    | `cd ../.. && pnpm build:packages && pnpm --filter @neshel-ui/docs build`          | Build every Neshel-UI package first (the site consumes their `dist`), then `neshel generate` + `next build` |
| Output directory | `out`                                                                             | Next.js static export                                                                                       |
| Trailing slash   | `true`                                                                            | Matches `trailingSlash: true` in `next.config.mjs` (`/en/docs` → `/en/docs/`)                               |

Base path: **empty** (`NESHEL_DOCS_BASE_PATH` unset) — the site is served at the domain root.

### Public URL — never invented

`apps/docs/site-url.mjs` resolves the origin used for canonical URLs, `hreflang`, Open Graph images,
the sitemap and robots:

1. `NESHEL_DOCS_SITE_URL` if set (use it only for a custom domain the owner has configured);
2. production deployments: `https://$VERCEL_PROJECT_PRODUCTION_URL` — the project's real production
   domain, injected by Vercel;
3. preview deployments: `https://$VERCEL_URL` — that deployment's own URL;
4. local and CI builds: none (`http://localhost:3000` placeholders).

Only production builds are indexable; previews and local builds render
`<meta name="robots" content="noindex, nofollow">` and `Disallow: /`.

`release.published` in `apps/docs/lib/release.ts` is **true** since 0.1.0 was verified on npm
(feature 007): the site shows npm install instructions, and its build writes the starter ZIPs to
`public/downloads/` (`check-starters --no-build`), linked from the starters page.

## Owner actions in the Vercel Dashboard

These require the owner's Vercel account (nothing here can be done from the repository):

1. **Add New… → Project → Import Git Repository** → `dannysequeira-dev/neshel-ui` (install the
   Vercel GitHub app for that repository if asked).
2. **Configure Project**
   - Project name: your choice (it determines the default `*.vercel.app` domain).
   - **Root Directory:** `apps/docs` → enable **"Include files outside of the Root Directory in the
     Build Step"** (needed for the workspace packages; it is the default for monorepos).
   - Framework Preset: **Next.js** (vercel.json sets it; leave the build, install and output
     overrides **off** so `vercel.json` applies).
   - Environment Variables: **none required.** Do not set `NESHEL_DOCS_BASE_PATH`. Set
     `NESHEL_DOCS_SITE_URL` only later, for a custom domain.
3. **Settings → General → Node.js Version:** **26.x**. `apps/docs/package.json` declares
   `"engines": { "node": "26.x" }`, which Vercel honours; if your account does not offer 26.x yet,
   the build fails with a clear message — then choose **24.x** and remove the `engines` field (the
   repository supports Node ≥ 22.13 and CI tests 22, 24 and 26).
4. **Settings → Git:** Production Branch **`main`**. Preview deployments for pull requests are on
   by default with the Git integration (keep "Automatically expose System Environment Variables"
   enabled — the build reads `VERCEL_ENV`, `VERCEL_URL` and `VERCEL_PROJECT_PRODUCTION_URL`).
5. **Deploy.** When the first production deployment is ready, open its domain and check: `/` goes to
   `/en/`, `/es/docs/` renders Spanish, search (Ctrl+K) works, a page source shows the production
   domain in `<link rel="canonical">`, `/sitemap.xml` and `/robots.txt` use it, and an unknown URL
   shows the bilingual 404.
6. Optional: **Settings → Deployment Protection** — Vercel Authentication on previews is fine (it does
   not affect production).
7. Optional, later: a custom domain (**Settings → Domains**) — this involves DNS and is an owner
   decision; then set `NESHEL_DOCS_SITE_URL` to it for the Production environment and redeploy.

The production URL is recorded in the README, the repository metadata suggestions and the release
status page.

## Verification performed

| Check                                                                                                                                                                                                          | Where                                                               |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Simulated production build (`VERCEL_ENV=production`, domain under the reserved `.invalid` TLD) — 14/14 site checks: canonical, `hreflang`, `og:image`, sitemap and robots use the production origin; indexable | local (`pnpm check:docs-site --expect-origin … --expect-indexable`) |
| Simulated preview build — origin = `VERCEL_URL`, `noindex`, `Disallow: /`, assets at the root                                                                                                                  | local                                                               |
| `vercel build --prod` with `apps/docs/vercel.json` (Vercel CLI 65.12.1, no account, no deployment) and the same smoke on `.vercel/output/static`                                                               | CI job `vercel build (local, no deployment)` on Linux               |

| **Live production** https://neshel-ui.vercel.app: `pnpm check:docs-site --url https://neshel-ui.vercel.app --expect-origin https://neshel-ui.vercel.app --expect-indexable` — 14/14 (languages, canonical/hreflang/og:image/sitemap/robots on the production origin, language switch, theme, Ctrl+K search EN/ES, live preview, examples, 404 with status 404, axe WCAG A/AA light and dark); `/en/docs` → 308 → `/en/docs/`; 156 sitemap URLs | owner's Vercel project, verified 2026-11-09 |

Deployment lesson: a dashboard _Output Directory_ of `out` made Vercel's Next.js builder look for
`routes-manifest.json` in the export folder; `vercel.json` now pins `.next`.

`vercel build` could not run on the Windows maintainer machine (the CLI needs symbolic-link
permission for its builder cache); the CI job covers it.
