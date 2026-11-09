# Contract — documentation website (`apps/docs`)

Normative for feature 006. Decisions: research R1–R4, R19; [ADR 0015](../../../docs/decisions/0015-documentation-website.md).

## Package

- `@neshel-ui/docs`, `private: true`, workspace app. Depends on the public packages with
  `workspace:*` (the site is a consumer; independent packed verification is `check:next` /
  `check:consumer`). Never imported by a package.
- Scripts: `dev`, `build` (`neshel generate && next build`, static export to `out/`), `typecheck`.
  Root scripts: `docs:dev`, `docs:build`, `docs:preview`, `docs:api`, `check:docs`.

## Build inputs

| Variable                | Default | Effect                                                                                                                                         |
| ----------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `NESHEL_DOCS_SITE_URL`  | unset   | Explicit origin (custom domain). Unset → Vercel production domain, else preview URL, else none (`site-url.mjs`). Only production is indexable. |
| `NESHEL_DOCS_BASE_PATH` | `""`    | Next `basePath`; **empty on Vercel** (domain root).                                                                                            |

## Routes

| Route                                       | Content                                                      |
| ------------------------------------------- | ------------------------------------------------------------ |
| `/`                                         | Language chooser, redirects to `/en/` (meta refresh + links) |
| `/{lang}/`                                  | Branded home (landing page)                                  |
| `/{lang}/docs/[[...slug]]`                  | Documentation (Fumadocs layout, sidebar, TOC, prev/next)     |
| `/{lang}/examples/{dashboard,form,landing}` | Full-page examples with source                               |
| `/api/search`                               | Static Orama index (both locales)                            |
| `/sitemap.xml`, `/robots.txt`               | Generated from the page list and `NESHEL_DOCS_SITE_URL`      |
| `404`                                       | Not-found page with links to home, docs and search           |

`{lang}` ∈ `en`, `es`. Every page has `hreflang` alternates for available translations.

## Theme

`next-themes` (through Fumadocs `RootProvider`) with `attribute: ["class", "data-neshel-theme"]`,
values `light`/`dark`, `enableSystem`. Fumadocs colour variables map to Neshel tokens.

## Accessibility

Skip link to the content, landmarks from Fumadocs layouts, visible focus, keyboard search
(`Ctrl/⌘ K`), language switch as links (`hreflang`), previews keyboard operable, axe clean
(SC-003).

## Brand assets

`scripts/docs/brand-assets.mjs` copies approved files from `assets/brand/` into
`apps/docs/public/brand/` (byte-identical, verified by hash) and derives `favicon` /
`apple-touch-icon` / OG image only by resizing/compositing the approved mark and logo. No
generated or redrawn artwork.
