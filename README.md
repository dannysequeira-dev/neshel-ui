<p align="center">
  <img src="assets/brand/neshel-ui-logo.png" alt="Neshel-UI — a midnight navy rose with delicate gold accents and a light at its center" width="390" />
</p>

<h1 align="center">Neshel-UI</h1>

<p align="center">
  <strong>Rooted in faith. Built with hope.</strong><br />
  A modular, accessible and themeable React design system.
</p>

<p align="center">
  <a href="https://github.com/dannysequeira-dev/neshel-ui/actions/workflows/ci.yml"><img alt="CI status on main" src="https://github.com/dannysequeira-dev/neshel-ui/actions/workflows/ci.yml/badge.svg?branch=main" /></a>
  <a href="https://www.npmjs.com/org/neshel-ui"><img alt="Five published npm packages" src="https://img.shields.io/badge/npm-5%20packages%20published-368469?style=flat-square&amp;logo=npm&amp;logoColor=white" /></a>
  <a href="https://github.com/dannysequeira-dev/neshel-ui/tree/main/packages/animations"><img alt="Animations experimental and unpublished" src="https://img.shields.io/badge/animations-experimental%20%7C%20unpublished-D9B86A?style=flat-square" /></a>
  <a href="https://github.com/dannysequeira-dev/neshel-ui/blob/main/LICENSE"><img alt="MIT license" src="https://img.shields.io/github/license/dannysequeira-dev/neshel-ui?style=flat-square&amp;color=D9B86A" /></a>
</p>

<p align="center">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-strict-3178C6?style=flat-square&amp;logo=typescript&amp;logoColor=white" />
  <img alt="React 19" src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&amp;logo=react&amp;logoColor=0D1B39" />
  <img alt="Tailwind CSS v4 optional" src="https://img.shields.io/badge/Tailwind_CSS-v4%20optional-06B6D4?style=flat-square&amp;logo=tailwindcss&amp;logoColor=white" />
  <img alt="pnpm workspaces monorepo" src="https://img.shields.io/badge/monorepo-pnpm%20workspaces-F69220?style=flat-square&amp;logo=pnpm&amp;logoColor=white" />
  <img alt="ESM only" src="https://img.shields.io/badge/modules-ESM%20only-243B63?style=flat-square" />
  <a href="https://neshel-ui.vercel.app"><img alt="English and Spanish docs" src="https://img.shields.io/badge/docs-EN%20%7C%20ES-D9B86A?style=flat-square" /></a>
</p>

<p align="center">
  <a href="#showcase">Showcase</a> ·
  <a href="#packages">Packages</a> ·
  <a href="#quick-start">Quick start</a> ·
  <a href="#documentation">Documentation</a> ·
  <a href="#development">Development</a> ·
  <a href="#project-status">Status</a> ·
  <a href="#contributing">Contributing</a>
</p>

> [!NOTE]
> **0.1.0 is on npm.** The five packages are published with
> [npm provenance](https://docs.npmjs.com/generating-provenance-statements) from the tagged release
> workflow. Release evidence: [specs/007-first-publication/evidence.md](specs/007-first-publication/evidence.md).

Neshel-UI gives React applications **semantic design tokens**, **layout primitives**,
**metrics-aware typography**, **accessible components** and a **build-time CLI** — as independent
packages you install only when you need them. It is CSS-first (Tailwind CSS v4 optional, plain CSS
supported), needs no runtime provider for theming, and works in React Server Components.

The navy, ivory and gold appearance is Neshel's default; your application owns its identity through
`neshel.config.ts`.

## Showcase

A preview of the **published design-system components** in a real Storybook application, captured
during the project's [browser visual verification](specs/005-components-navigation-shell/visual-verification/README.md).
These are screenshots of working examples, not design mockups.

| Responsive dashboard · light theme | Same interface · dark theme |
| :---: | :---: |
| ![Responsive dashboard built with Neshel-UI: light theme, navigation sidebar, project cards and status badges](specs/005-components-navigation-shell/visual-verification/demo-a-desktop-light.png) | ![The same Neshel-UI dashboard in dark theme with navy surfaces and accessible status badges](specs/005-components-navigation-shell/visual-verification/demo-a-desktop-dark.png) |

More examples: [mobile navigation](specs/005-components-navigation-shell/visual-verification/demo-a-mobile-drawer.png) ·
[form controls](specs/005-components-navigation-shell/visual-verification/demo-b-form.png) ·
[metrics-aware typography](specs/004-typography-breakpoints/visual-verification/capsize-trimmed-vs-untrimmed.png).

**Try the components:** [interactive documentation](https://neshel-ui.vercel.app/en/docs/components/) ·
[downloadable starters](https://neshel-ui.vercel.app/en/docs/examples/starters/).

## Packages

| Package                                        | npm release                                                                                                                  | What it gives you                                                                     |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| [`@neshel-ui/config`](packages/config)         | ![npm version](https://img.shields.io/npm/v/@neshel-ui/config?style=flat-square&logo=npm&label=npm)                          | Tokens as CSS custom properties; light, dark, system and named themes; `defineConfig` |
| [`@neshel-ui/layout`](packages/layout)         | ![npm version](https://img.shields.io/npm/v/@neshel-ui/layout?style=flat-square&logo=npm&label=npm)                          | `Box`, `Flex`, `Stack`, `Inline`, `Grid`, `Center`, `Container`                       |
| [`@neshel-ui/typography`](packages/typography) | ![npm version](https://img.shields.io/npm/v/@neshel-ui/typography?style=flat-square&logo=npm&label=npm)                      | `Heading`, `Text`, `Paragraph`, `Caption` with Capsize trimming                       |
| [`@neshel-ui/components`](packages/components) | ![npm version](https://img.shields.io/npm/v/@neshel-ui/components?style=flat-square&logo=npm&label=npm)                      | Buttons, cards, form controls, overlays, selection, navigation, application shell     |
| [`@neshel-ui/cli`](packages/cli)               | ![npm version](https://img.shields.io/npm/v/@neshel-ui/cli?style=flat-square&logo=npm&label=npm)                             | `neshel validate` and `neshel generate` for themes, fonts and custom breakpoints      |
| [`@neshel-ui/animations`](packages/animations) | ![Experimental / unpublished](https://img.shields.io/badge/status-experimental%20%2F%20unpublished-D9B86A?style=flat-square) | Motion engine and Tilt3D prototype; **private, not on npm**                           |

Package version badges report individual npm releases; download badges in each public package README are also per package. Animations remains private until its release criteria are met.

Peer dependencies: `react` and `react-dom` 19. ESM only, TypeScript declarations included.

## Quick start

```bash
pnpm add @neshel-ui/config @neshel-ui/layout @neshel-ui/typography @neshel-ui/components
pnpm add -D @neshel-ui/cli   # optional: custom themes, fonts and breakpoints
```

npm and Yarn work the same way. Ready-to-run starters (Vite + Tailwind, Vite + plain CSS, Next.js)
can be downloaded from the [starters page](https://neshel-ui.vercel.app/en/docs/examples/starters/).
To try unreleased changes, install packed tarballs from a clone
([installation guide](https://neshel-ui.vercel.app/en/docs/getting-started/installation/)).

```css
/* your global CSS — with Tailwind v4 (or import @neshel-ui/config/tokens.css without it) */
@import "tailwindcss";
@import "@neshel-ui/config/tailwind.css";
@import "@neshel-ui/layout/styles.css";
@import "@neshel-ui/typography/styles.css";
@import "@neshel-ui/components/styles.css";
```

```tsx
import { Button } from "@neshel-ui/components";
import { Stack } from "@neshel-ui/layout";
import { Heading, Paragraph } from "@neshel-ui/typography";

export function Welcome() {
  return (
    <Stack space="4" alignX="start">
      <Heading as="h1">Welcome</Heading>
      <Paragraph tone="muted">Rooted in faith. Built with hope.</Paragraph>
      <Button>Get started</Button>
    </Stack>
  );
}
```

Ready-made projects: [`starters/`](starters) (Vite + Tailwind, Vite + plain CSS, Next.js App Router).

## Documentation

The official documentation website (English and Spanish) lives in [`apps/docs`](apps/docs): getting
started tutorials, guides, the complete component catalogue with live previews and API tables
generated from the TypeScript declarations, the CLI reference and application examples.

```bash
pnpm docs:dev       # http://localhost:3000
pnpm docs:build     # static export to apps/docs/out
pnpm docs:preview   # serve the export
```

Live: **https://neshel-ui.vercel.app** (Vercel, deployed from `main`; see [docs/deployment.md](docs/deployment.md)). Maintainer
and contract documentation stays in [`docs/`](docs) and [`specs/`](specs).

## Development

Contributors are equally supported on **Windows, Linux and macOS**; every command runs unchanged in
PowerShell 7, Bash and Zsh. Requirements: **Node.js 26** (22.13+ supported), **pnpm 12.16.1**
(pinned by `packageManager`), Git.

```bash
git clone https://github.com/dannysequeira-dev/neshel-ui.git
cd neshel-ui
pnpm install --frozen-lockfile
pnpm check
```

| Command                                           | What it verifies                                                                                 |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `pnpm check`                                      | doctor, lint, typecheck, tests, package build, exports, packed artefacts                         |
| `pnpm check:consumer`                             | packed tarballs in external React 19 + Vite apps (Tailwind, plain CSS, themes, breakpoints, SSR) |
| `pnpm check:browser` / `check:browser:components` | computed styles; real keyboard/pointer interaction and axe in Chrome                             |
| `pnpm check:browsers`                             | Chromium, Firefox and WebKit smoke flows (Playwright)                                            |
| `pnpm check:next`                                 | isolated Next.js App Router app from packed packages (SSR, hydration, portals)                   |
| `pnpm check:starters` · `check:bundles`           | starters from deterministic ZIPs · per-family bundle budgets                                     |
| `pnpm check:docs` · `check:docs-site`             | documentation coverage, translations, links, snippets · exported site smoke with axe             |
| `pnpm release:simulate`                           | the 0.1.0 versioning transition and `npm publish --dry-run`, in a temporary copy                 |

Working agreements: [constitution](.specify/memory/constitution.md), [architecture](docs/architecture.md),
[package contracts](docs/package-contracts.md), [decisions](docs/decisions/README.md),
[cross-platform policy (Spanish)](docs/CROSS-PLATFORM.es.md), [contributing](CONTRIBUTING.md).

## Project status

| Phase   | Focus                                                                | Status               |
| ------- | -------------------------------------------------------------------- | -------------------- |
| 001–005 | Foundation, tokens and CLI, layout, typography, components and shell | Done                 |
| 006     | Documentation website, developer experience, release candidate       | Done                 |
| 007     | First npm publication: 0.1.0                                         | Done                 |
| 008–009 | Animations foundation, motion engine, scheduler and drivers             | Implemented on `main`; private, experimental |
| 010–011 | Entrance, hover, press, scroll and parallax effects                    | Implemented on `main`; private, experimental |
| 012–013 | Physics, gestures, layout, cinematic scenes and page transitions       | Implemented on `main`; private, experimental |

**Animations are not part of the published 0.1.0 release.** Phases 008–013 are merged into
`main` for review and development, but `@neshel-ui/animations` remains `private: true` at
`0.0.0`, and its APIs are experimental. See [Phase 013 evidence](specs/013-cinematic-page-transitions/evidence.md).

Release readiness: [docs/release-readiness.md](docs/release-readiness.md). Publication evidence for
0.1.0 (tag `v0.1.0`, provenance, integrity, clean installation):
[specs/007-first-publication/evidence.md](specs/007-first-publication/evidence.md).

## Brand identity

The emblem is a **navy-blue rose** with restrained golden reflections and a quiet light at its
heart, representing faith as the foundation and hope as the reason to keep building. The original
artwork is preserved unchanged in [`assets/brand/`](assets/brand) — see the
[brand asset guide](docs/BRANDING.md) and the [brand usage policy](docs/BRAND-POLICY.md).

## Contributing

Thoughtful contributions are welcome: read the [contribution guide](CONTRIBUTING.md),
[code of conduct](CODE_OF_CONDUCT.md) and [security policy](SECURITY.md).

## License

The software is released under the [MIT license](LICENSE). The MIT license does not grant rights to
the Neshel-UI name or logo; see the [brand usage policy](docs/BRAND-POLICY.md).

---

<p align="center"><em>“May the God of hope fill you with all joy and peace as you trust in him.” — Romans 15:13</em></p>
