# Next.js external consumer

The Next.js App Router consumer is not a workspace app: workspace links would hide packaging problems.
Feature 006 implements it as `pnpm check:next` (scripts/check-next.mjs), which copies
`starters/next-app` outside the repository, overlays `tests/fixtures/next-consumer`, installs the
**packed** tarballs, runs `neshel generate` + `next build` + `next start`, and verifies SSR,
hydration, client interaction, portals with nested themes, custom breakpoints, CSS order and
Capsize trimming in Chrome.
