# Visual verification — feature 003 (milestone 003.4)

Captured 2026-11-08 on Windows 11 with headless Chrome 156.0.8078.81 through the repository's
CDP client (`scripts/lib/cdp.mjs`), serving `apps/storybook/storybook-static` (built with the
distributed `@neshel-ui/layout/styles.css`) from a temporary local HTTP server. The capture
script is not committed; it is a thin wrapper around `launchBrowser`, `setViewport` and
`screenshot`.

| Screenshot                     | Story / viewport                                      | What it shows                                                                                           |
| ------------------------------ | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `application-shell-light.png`  | Layout/Composition › ApplicationShell, light, 1280 px | Container, header Inline with nav separators, 4-column Grid with aside (Box `display`), card Grid       |
| `application-shell-dark.png`   | Same, dark theme (toolbar)                            | Same layout; separators and borders follow the dark `--neshel-border`                                   |
| `application-shell-mobile.png` | Same, light, 390 px                                   | Responsive collapse: aside hidden (`display: none` below 64rem), single-column cards                    |
| `themes.png`                   | Layout/Composition › Themes, 1280 px                  | Nested light / dark / sepia scopes: separator colour and gaps follow theme tokens (sepia spacing ×1.25) |
| `stack-separators.png`         | Layout/Stack › Separators, 900 px                     | Default separators between items, `li` separators inside a `ul`                                         |

Each page reported 0 uncaught exceptions and 0 `console.error` messages, and rendered the
expected layout elements (20, 20, 20, 10 and 2 `.neshel-stack/.neshel-grid/.neshel-inline`
nodes). Screenshots are illustrative; correctness is asserted by `pnpm check:browser`
(computed styles and geometry), not by these images. The Storybook a11y panel was not run.
