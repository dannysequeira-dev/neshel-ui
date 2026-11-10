# Neshel-UI 0.1.0 — release notes (final, for the GitHub Release of `v0.1.0`)

> Drafted in feature 006; updated in feature 007 after the packages were published and verified
> (2026-11-10). Everything below the line is the GitHub Release body. The owner creates the GitHub
> Release from the existing tag `v0.1.0` (never moved or recreated). Per-package changelogs:
> `packages/*/CHANGELOG.md`.

---

**Neshel-UI — Rooted in faith. Built with hope.** The first public release of a modular, accessible
and themeable React design system, now on npm.

```bash
pnpm add @neshel-ui/config @neshel-ui/layout @neshel-ui/typography @neshel-ui/components
pnpm add -D @neshel-ui/cli
```

Documentation: https://neshel-ui.vercel.app · Starters (ZIP downloads):
https://neshel-ui.vercel.app/en/docs/examples/starters/

## Packages

| Package                 | Version | Highlights                                                                                                                                                                                                               |
| ----------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `@neshel-ui/config`     | 0.1.0   | 25 semantic colour roles with contrast pairs; light, dark, system and named themes via `data-neshel-theme`; `tokens.css` and `tailwind.css`; typed `defineConfig`                                                        |
| `@neshel-ui/layout`     | 0.1.0   | Box, Flex, Stack, Inline, Grid, Center, Container; token spacing; logical alignment; responsive values; `as`/`asChild`; separators                                                                                       |
| `@neshel-ui/typography` | 0.1.0   | Heading, Text, Paragraph, Caption; semantics independent of size; Capsize trimming from real font metrics                                                                                                                |
| `@neshel-ui/components` | 0.1.0   | Button, Card, Badge, Input, Label, Separator, Skeleton, VisuallyHidden; Dialog, AlertDialog, Sheet, Popover, Tooltip; Select, MultiSelect, Combobox; Navbar, NavigationMenu, DropdownMenu, MobileMenu; AppShell, Sidebar |
| `@neshel-ui/cli`        | 0.1.0   | `neshel validate` / `neshel generate`: themes, contrast diagnostics, font metrics and fallbacks, custom breakpoints with generated CSS and TypeScript declarations                                                       |

## Highlights

- **CSS-first, provider-free theming.** Precompiled CSS in cascade layers; Tailwind CSS v4 optional.
- **Your identity, not ours.** Navy and gold are only defaults; colours, fonts, radii and breakpoints
  are configured in `neshel.config.ts` and checked for contrast.
- **Server-friendly.** Presentational components are server-compatible; interactive modules carry
  `"use client"`. Verified in an isolated Next.js 16 App Router app built from the packed packages.
- **Accessible by default**, verified with real keyboard and pointer input in Chrome and with smoke
  flows in Chromium, Firefox and WebKit, plus axe-core.
- **Bilingual documentation** (English and Spanish) with live previews and API tables generated from
  the TypeScript declarations; three starters (Vite + Tailwind, Vite + CSS, Next.js).

## Requirements

React and React DOM 19 (peer dependencies). ESM only. The CLI requires Node.js 22.13 or later.

## Known limitations

- Manual screen-reader testing: NVDA + Firefox on Windows (owner-reported, 10/10); VoiceOver,
  Narrator and JAWS not evaluated.
- Safari is not separately automated (WebKit is).
- Unknown well-formed breakpoint keys warn in the browser instead of throwing.
- Capsize trimming is exact only when the configured metrics match the rendered font.
- Sidebar children remount between the desktop sidebar and the mobile drawer.
- Inline custom properties do not cross portals; pass `container`.
- In browsers without CSS `light-dark()`, named dark themes need `--neshel-overlay-backdrop`.

## Integrity

Published from tag `v0.1.0` (commit `9a3d4de`) by GitHub Actions release run
[42843343125](https://github.com/dannysequeira-dev/neshel-ui/actions/runs/42843343125) (attempt 2)
with a short-lived bootstrap token. Each package carries a signed SLSA v1 provenance statement that
names this repository, `.github/workflows/release.yml`, the tag and the commit; verify it with
`npm audit signatures` (npm 11 or later). `@neshel-ui/core` is internal and not published.

| Package                 | SHA-512 integrity (registry = release artefact)                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------- |
| `@neshel-ui/config`     | `sha512-1zOxUJowCzMX11iCFEcml2mxSTQljzNUI6usBpoQXMOcoDgpJw9AdlH27+EEui84scrJODkd2U99SUiyI+Uvug==` |
| `@neshel-ui/layout`     | `sha512-x43qk2kU2lwuuEh07KMex1SXyBn4Wck/l7fprcDqdvCYx/X4h67Wh5GH8ItVjBA6mfQiQgwITF2T1hkLFXa80A==` |
| `@neshel-ui/typography` | `sha512-M+fDnnrRsPdHr4axdvSQGBGiLQAG1g/WB/xqBbIuiJF4JcC+VlcArd7tPJ2Qabg+qCaKMq78uVDMdopTsABxIw==` |
| `@neshel-ui/components` | `sha512-umW8ZBddZzmXTO6QuuDAb+z6vZw1xoMcVaT2vnH0lwDmDcKkvhclmLGC2QhfVHppBkgc5wE9aLqAldHK+MzM2w==` |
| `@neshel-ui/cli`        | `sha512-iq7wzL0YBD7qNg90r/xL+S/UcCs80YXxQscYVYuN5zMjkuaOpuvoO8/m/6E+fPIYzfNQ9TN2gti4PAdqQgEN9g==` |

The workflow run shows as failed: its post-publication check reported a false negative (npm warnings
were compared with the version); this is fixed for later releases (#2). The packages were verified
independently: registry versions, provenance, integrity, a clean external installation and the three
starters installed from npm. Later releases publish through npm trusted publishing (OIDC).
