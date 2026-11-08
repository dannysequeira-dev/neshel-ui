# Visual verification — feature 002 (milestone 002.2)

Captured 2026-11-07 on Windows 11 with headless Chrome 156.0.8078.81 through the repository's
CDP client (`scripts/lib/cdp.mjs`), serving `apps/storybook/storybook-static` and
`apps/playground-vite/dist` from a temporary local HTTP server. Values in `report.json`.

| Screenshot                           | What it shows                                                                                                                                       |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `storybook-light-contrast-pairs.png` | "Foundations/Tokens" contrast pairs in the light theme                                                                                              |
| `storybook-dark-palette.png`         | All 21 colour roles with their dark values                                                                                                          |
| `storybook-theme-precedence.png`     | `system` root, nested `dark`, nested `light` inside dark (computed: dark surface `rgb(13, 35, 71)`, light surface inside dark `rgb(255, 255, 255)`) |
| `playground-no-attribute.png`        | No `data-neshel-theme`: light background `rgb(251, 249, 246)`                                                                                       |
| `playground-dark.png`                | After choosing "dark": `data-neshel-theme="dark"`, background `rgb(4, 13, 29)`                                                                      |

No uncaught exceptions or `console.error` messages were reported on any page. The Storybook
a11y addon panel was **not** run in this capture (it requires the interactive UI); automated
contrast enforcement is the CLI test suite (`builtin-contrast.test.mjs`).
