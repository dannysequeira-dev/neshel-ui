# Contract — documentation content and verification

Normative for feature 006. Decisions: research R3, R5–R9.

## Information architecture (per locale)

```text
docs/
  index                       What Neshel-UI is, status, packages
  getting-started/            requirements, installation, typescript, css, first-button, stack,
                              typography, dialog, responsive-layout, cli, tokens, deploy
  guides/                     theming, custom-breakpoints, typography-and-capsize, accessibility,
                              nextjs, overlays-and-portals, forms, choosing-components,
                              troubleshooting
  packages/                   config, layout, typography, components, cli (overview pages)
  layout/                     box, flex, stack, inline, grid, center, container, recipes
  typography/                 heading, text, paragraph, caption
  components/                 button, card, badge, input, label, separator, skeleton,
                              visually-hidden, dialog, alert-dialog, sheet, popover, tooltip,
                              select, multi-select, combobox, navbar, navigation-menu,
                              dropdown-menu, mobile-menu, app-shell, sidebar
  cli/                        overview, validate, generate, errors, ci
  examples/ starters/         index pages linking to the example routes and starters
  project/                    release status, roadmap, contributing to docs, brand, changelog
```

## Frontmatter

```yaml
title: Button
description: One sentence.
package: components # reference pages only
exports: [Button, ButtonProps, ButtonSize, ButtonVariant]
```

## Component page model (brief §7)

Sections in this order (omitted only when not applicable, with the reason in one sentence):
Purpose · Import · Usage (minimal) · Preview · API (generated `<ApiTable>`) · Variants ·
Responsive props · Controlled and uncontrolled · Composition and `asChild` · Accessibility ·
Keyboard · Styling and theming · Limitations · Common mistakes · Examples/related.

## MDX components available to content

`<Preview demo="components/button-variants" />` (live demo + source of the same file),
`<ApiTable package="components" name="ButtonProps" />`, `<ExportList package="…" />`,
`<PackageInstall packages={[…]} />` (pnpm/npm/yarn tabs), Fumadocs `Callout`, `Tabs`, `Steps`,
`Cards`.

## Snippet rules

- `tsx`/`ts` fenced blocks are complete modules and are type-checked.
- `tsx fragment` blocks are JSX expressions/statements wrapped automatically.
- `tsx no-check title="reason"` blocks are excluded and reported (e.g. intentionally invalid code
  in "Common mistakes").
- `css`, `bash`, `jsonc`, `text` are not executed; `json` must parse.

## Checks (`pnpm check:docs`)

| Check        | Fails when                                                                                                                                               |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| api-fresh    | `generated/api/*.json` differs from a fresh extraction                                                                                                   |
| coverage     | an export is undocumented, duplicated, or listed but not exported (per locale)                                                                           |
| translations | an EN page lacks an ES page (or vice versa) without a `translations.json` entry; frontmatter `exports` differ between locales; UI dictionary keys differ |
| links        | an internal link or anchor does not resolve                                                                                                              |
| snippets     | a checked snippet fails `tsc`                                                                                                                            |
| demos        | a `<Preview demo>` file does not exist                                                                                                                   |
| config       | example `neshel.config.ts` files fail `neshel validate`                                                                                                  |
