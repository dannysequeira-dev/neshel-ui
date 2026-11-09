# ADR 0015 — Official documentation website

- Status: **Accepted** (2026-11-08, within the owner's Phase 006 brief)
- Date: 2026-11-08
- Feature: [006](../../specs/006-docs-dx-release/spec.md); normative detail in
  [contracts/docs-site.md](../../specs/006-docs-dx-release/contracts/docs-site.md) and
  [contracts/docs-content.md](../../specs/006-docs-dx-release/contracts/docs-content.md)

## Context

Consumers need a discoverable, bilingual, searchable website that documents every public export
accurately and stays correct as the API evolves. The owner prefers Next.js App Router + Fumadocs.
There is no production domain and paid services should be avoided.

## Decision

1. `apps/docs`: Next.js 16 App Router, Fumadocs 16 (`fumadocs-ui` Base UI flavour), MDX,
   static export. A private workspace consumer of the public packages; nothing depends on it.
2. Hosting: static files on **Vercel** (owner decision 2026-11-09, amending the original GitHub
   Pages recommendation; see [deployment.md](../deployment.md)). The origin comes from
   `NESHEL_DOCS_SITE_URL` or Vercel's system variables (`site-url.mjs`); `NESHEL_DOCS_SITE_URL` and
   `NESHEL_DOCS_BASE_PATH` configure origin and base path; no domain is assumed. Without a site URL
   the build is `noindex`.
3. i18n: `/en` and `/es` path prefixes (`parser: "dir"`), English fallback with a visible notice and
   a declared-exceptions file; target zero fallbacks.
4. Facts come from code: props/types/defaults are extracted from the packages' declarations into
   committed JSON; previews and examples are type-checked modules whose own source is displayed;
   fenced snippets are type-checked.
5. Brand: Fumadocs colour variables are mapped to Neshel tokens; approved raster assets copied
   unchanged; derived icons only resize/composite approved crops.

## Consequences

- One more workspace app and a heavier dependency tree for contributors (docs only).
- The site exercises Next.js App Router with the workspace packages; independent packed-artifact
  verification remains `check:next`.
- Static export precludes middleware (locale negotiation happens on the root page).

## Alternatives

Storybook-only documentation; Docusaurus; Astro Starlight; Nextra; a hosted CMS — rejected for
lack of RSC/App Router coverage, weaker i18n/search fit, or cost (research R1).

## Verification

`pnpm docs:build`, `pnpm check:docs`, the exported-site browser smoke with axe, docs CI job on
Linux, Windows and macOS.
