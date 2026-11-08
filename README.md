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

Installation alone does **not** inject CSS. The final import contract will be
verified using external, packed-package consumers before release.

## Development

This is a **pnpm monorepo** intended for contributors using **Windows, Linux,
or macOS**. Check the repository's `.nvmrc` and `package.json` for the pinned
Node.js and pnpm versions instead of assuming your globally installed versions.

```bash
# Run from the repository root
pnpm install
pnpm run doctor
pnpm typecheck
pnpm test
pnpm build:packages
pnpm check:exports
```

For local previews (as the scaffold supports them):

```bash
pnpm dev:playground
# Or, in another terminal:
pnpm dev:storybook
```

Read the [cross-platform setup guide](docs/CROSS-PLATFORM.es.md) before changing
portable scripts, CI workflows, or development requirements.

### Architecture and working agreements

- [Claude Code context](CLAUDE.md)
- [Architecture](docs/architecture.md)
- [Package contracts](docs/package-contracts.md)
- [Theme strategy](docs/theming.md)
- [Typography strategy](docs/typography.md)
- [Spec Kit constitution](.specify/memory/constitution.md)
- [First Claude prompt](docs/CLAUDE-FIRST-PROMPT.md)
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
