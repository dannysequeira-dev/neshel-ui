<p align="center">
  <img src="assets/brand/neshel-ui-logo.png" alt="Neshel-UI — a midnight navy rose with delicate gold accents and a light at its center" width="390" />
</p>

<h1 align="center">Neshel-UI</h1>

<p align="center">
  <strong>Rooted in faith. Built with hope.</strong><br />
  A modular React design system built for composition, accessibility, and thoughtful theming.
</p>

<p align="center">
  <a href="#vision">Vision</a> ·
  <a href="#packages">Packages</a> ·
  <a href="#development">Development</a> ·
  <a href="#roadmap">Roadmap</a> ·
  <a href="#contributing">Contributing</a>
</p>

> [!IMPORTANT]
> **Pre-release / foundation in progress.** Neshel-UI is not published to npm yet.
> The workspace and tooling are being established before the first usable UI release.
> Package names and APIs below are design targets, not claims of existing functionality.

## Vision

Neshel-UI aims to make consistent interfaces easier to build without forcing every
application into one visual identity. Install focused packages, configure semantic
tokens, and compose the primitives you actually need.

Its design principles are:

- **Faith, care, and stewardship.** Build with integrity, generosity, and hope.
- **Composition over complexity.** Small primitives with predictable contracts.
- **Application-owned identity.** Semantic colors, themes, typography, and design tokens.
- **Accessibility by default.** Native semantics, clear focus states, and keyboard support.
- **Precise typography.** Real font metrics with Capsize where they add value.
- **Independent adoption.** Published packages must work outside this monorepo.
- **Open-source collaboration.** Reproducible tooling, clear documentation, and transparent decisions.

The project is built around **React**, **TypeScript**, **Tailwind CSS v4**, **Capsize**,
**pnpm workspaces**, and **Storybook**. Tailwind CSS integration is CSS-first, but
consumers should not be forced to use Tailwind just to load the core theme tokens.

## Packages

Neshel-UI is organized as independent packages with one shared design vocabulary.

| Package                 | Planned responsibility                                          | Status     |
| ----------------------- | --------------------------------------------------------------- | ---------- |
| `@neshel-ui/config`     | Semantic tokens, themes, CSS exports, typed configuration       | Foundation |
| `@neshel-ui/layout`     | Box, Stack, Inline, Grid, Center, Container                     | Planned    |
| `@neshel-ui/typography` | Heading, Text, Paragraph, Caption, Capsize integration          | Planned    |
| `@neshel-ui/components` | Accessible Button, Card, Badge, Input, Separator, Skeleton      | Planned    |
| `@neshel-ui/cli`        | Read/validate user configuration and generate deterministic CSS | Planned    |
| `@neshel-ui/core`       | Internal shared utilities, if needed; not publicly published    | Internal   |

The `@neshel-ui` npm scope must be verified before publication. A package install
must not depend on unpublished private workspace packages.

### Intended consumer experience

Once published, consumers should be able to install only the features they need:

```bash
# Example for a future release — not available on npm yet
pnpm add @neshel-ui/config @neshel-ui/layout @neshel-ui/typography
```

```css
/* Planned stylesheet entry points */
@import "tailwindcss";
@import "@neshel-ui/config/styles.css";
@import "@neshel-ui/layout/styles.css";
@import "@neshel-ui/typography/styles.css";
```

Installation alone does **not** inject CSS. Today the `@neshel-ui/config` stylesheet is
verified from its packed tarball in an external React 19 + Vite + Tailwind v4 app
(`pnpm check:consumer`); the remaining packages are still empty and their stylesheets are
placeholders. See [package contracts](docs/package-contracts.md) for tested versus intended
compatibility.

## Development

Contributors are equally supported on **Windows, Linux and macOS**; every command below
runs unchanged in PowerShell 7, Bash and Zsh.

**Requirements**

- **Node.js 26** (primary line, see `.nvmrc`); 22.13 or newer is supported.
- **pnpm 12.16.1**, pinned by `packageManager` (`npm install --global pnpm@12.16.1` or Corepack).
- **Git**. Optional: Python 3.11+ and `uv` for the Spec Kit CLI.

```bash
git clone https://github.com/dannysequeira-dev/neshel-ui.git
cd neshel-ui
pnpm install --frozen-lockfile
pnpm check            # doctor, lint, typecheck, tests, package build, exports, packed artifacts
pnpm check:consumer   # external Vite + Tailwind app built from the packed tarball (needs network)
```

Local previews:

```bash
pnpm dev:playground   # Vite playground
pnpm dev:storybook    # Storybook on port 6006
```

| Command                                  | What it verifies                                                                                  |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `pnpm run doctor`                        | Node version, workspace layout, script portability, case collisions                               |
| `pnpm lint` / `pnpm format`              | Biome check / apply fixes                                                                         |
| `pnpm typecheck` · `pnpm test`           | TypeScript projects · `node:test` suites                                                          |
| `pnpm build:packages`                    | Clean build of every package (ESM, `.d.ts`, maps, CSS)                                            |
| `pnpm check:exports` · `pnpm check:pack` | Export targets in `dist` · real `pnpm pack` tarballs (publint, attw, external import/type checks) |
| `pnpm check:consumer`                    | Packed `@neshel-ui/config` in a generated external React 19 + Vite + Tailwind v4 app              |

Platform guides (Spanish): [Windows setup](docs/SETUP-WINDOWS.es.md) and
[cross-platform policy](docs/CROSS-PLATFORM.es.md). Current verification status, separated
into implemented, locally verified and CI-verified: [Phase 001 evidence](specs/001-foundation/evidence.md).

### Architecture and working agreements

- [Claude Code context](CLAUDE.md)
- [Architecture](docs/architecture.md)
- [Package contracts](docs/package-contracts.md)
- [Theme strategy](docs/theming.md)
- [Typography strategy](docs/typography.md)
- [Spec Kit constitution](.specify/memory/constitution.md)
- [Spec Kit onboarding](.specify/README.md)
- [Architecture decisions](docs/decisions/README.md)
- [Release policy](docs/releasing.md)

Use specification-driven development and keep architecture decisions documented.
A working Storybook or a green workspace build is **not**, by itself, proof that
an npm package is ready for independent consumption.

## Roadmap

| Phase   | Focus                                                          |
| ------- | -------------------------------------------------------------- |
| **001** | Foundation, quality gates, portable tooling, package contracts |
| **002** | Semantic design tokens, themes, CSS generation, configuration  |
| **003** | Composable layout primitives                                   |
| **004** | Metrics-aware typography                                       |
| **005** | Accessible UI components and Storybook                         |
| **006** | External consumers, documentation, npm publishing              |

See [the development roadmap](docs/roadmap.md) for specifications, milestones,
and acceptance gates. Version **0.1.0** is the initial release target, not a
release already available.

## Brand identity

The Neshel-UI emblem is a **navy-blue rose** with restrained golden reflections
and a quiet light at its heart. It represents faith as the foundation and hope
as the reason to keep building.

The original artwork is preserved unchanged in
[`assets/brand/neshel-ui-logo.png`](assets/brand/neshel-ui-logo.png).
Cropped, resized variants for avatars and icons are in
[`assets/brand/`](assets/brand/); see the [brand asset guide](docs/BRANDING.md).

## Contributing

Neshel-UI welcomes thoughtful contributions as the library evolves. Please
start with the [contribution guide](CONTRIBUTING.md),
[code of conduct](CODE_OF_CONDUCT.md), and [security policy](SECURITY.md).

## License

The software project uses the [MIT license](LICENSE). Brand artwork usage
should follow the project's published brand policy when one is established.

---

<p align="center"><em>“May the God of hope fill you with all joy and peace as you trust in him.” — Romans 15:13</em></p>
