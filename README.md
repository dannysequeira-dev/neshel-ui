# Neshel-UI

**Rooted in faith. Built with hope.**

Neshel-UI is an upcoming **modular, accessible, themeable React design system**.
It is built around a CSS-first foundation (Tailwind CSS v4), semantic design tokens,
precise typography (Capsize), composable layouts, and independently consumable npm packages.

> **Project status: foundation scaffold / not yet published.** The ZIP contains a working
> repository layout and development configuration, not a complete component library.
> Every package is currently marked `private: true` as a release safety measure.

## Philosophy

- **God first, people first:** Work with care, integrity, stewardship, and hope.
- **Composable:** Small focused primitives; accessible interactions rather than large wrappers.
- **Configurable:** Consumers own themes; components rely on semantic tokens.
- **Modular:** Install only the package you need, without hidden package coupling.
- **Typography matters:** Use real font metrics and accurate visual alignment.
- **Public by design:** Stable exports, clear documentation, MIT licensing, and reproducible builds.

## Planned npm packages

| Package                 | Purpose                                          | Current status        |
| ----------------------- | ------------------------------------------------ | --------------------- |
| `@neshel-ui/config`     | Semantic tokens, CSS themes, typed configuration | Baseline CSS only     |
| `@neshel-ui/layout`     | Box, Stack, Inline, Grid, Center, Container      | Empty module          |
| `@neshel-ui/typography` | Heading, Text, Paragraph, Caption + Capsize      | Empty module          |
| `@neshel-ui/components` | Button, Card, Badge, Input, Separator, Skeleton  | Empty module          |
| `@neshel-ui/cli`        | Validate config; generate static CSS             | Placeholder CLI       |
| `@neshel-ui/core`       | Private utilities, types and shared contracts    | Empty internal module |

The `@neshel-ui` npm scope is **proposed, not verified or reserved**.

## Developer quick start (Windows, Linux and macOS)

Requirements: Node.js 22.13+; pnpm **12.16.1**; Git; optional Claude Code and Spec Kit CLI.

```bash
# From the repository root, in PowerShell, Bash or Zsh
pnpm install
pnpm run doctor
pnpm build:packages
pnpm test
pnpm dev:playground
# or in a second terminal:
pnpm dev:storybook
```

On the first install, commit the generated `pnpm-lock.yaml`. CI will thereafter
use a frozen lockfile. For setup and native CI on all three systems, see
[`docs/CROSS-PLATFORM.es.md`](docs/CROSS-PLATFORM.es.md).
For Windows-specific initial extraction, see
[`docs/SETUP-WINDOWS.es.md`](docs/SETUP-WINDOWS.es.md).

## Planned consumer experience (not yet released)

```powershell
pnpm add @neshel-ui/config @neshel-ui/layout
```

```css
/* Consumer app/global.css */
@import "tailwindcss";
@import "@neshel-ui/config/styles.css";
@import "@neshel-ui/layout/styles.css";
```

A future `neshel.config.ts` will be supported by `@neshel-ui/cli` for
advanced custom colors, font metrics, and static CSS generation. The default
CSS-only mode will not require the CLI. **npm installation by itself does not inject CSS.**

## For Claude Code

Start by reading [`CLAUDE.md`](CLAUDE.md),
[`docs/CLAUDE-FIRST-PROMPT.md`](docs/CLAUDE-FIRST-PROMPT.md),
[`docs/architecture.md`](docs/architecture.md), and
[`.specify/memory/constitution.md`](.specify/memory/constitution.md).

Spec Kit's official scripts / Claude commands are installed separately with
`pnpm run spec-kit:init` on Windows, Linux and macOS after installing the official `specify` CLI.
The ZIP already includes the constitution and first feature specification, but
**does not claim to include the official Spec Kit command distribution**.

## Documentation

- [Vision and non-goals](docs/vision.md)
- [Architecture and dependencies](docs/architecture.md)
- [Public package contracts](docs/package-contracts.md)
- [Theme and token design](docs/theming.md)
- [Capsize / typography design](docs/typography.md)
- [Roadmap and acceptance gates](docs/roadmap.md)
- [Windows, Linux and macOS setup + CI (Spanish)](docs/CROSS-PLATFORM.es.md)
- [Windows setup and GitHub instructions (Spanish)](docs/SETUP-WINDOWS.es.md)
- [Working with Claude and Spec Kit](docs/CLAUDE-FIRST-PROMPT.md)
- [Release and npm publication checklist](docs/releasing.md)
- [Decision records](docs/decisions/0001-architecture.md)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md), [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md),
and [SECURITY.md](SECURITY.md).

## License

MIT, see [LICENSE](LICENSE).

> Romans 15:13 — the God of hope.
