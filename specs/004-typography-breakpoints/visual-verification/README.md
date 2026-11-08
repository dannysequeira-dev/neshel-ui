# Visual verification — feature 004 (milestone 004.4)

Captured 2026-11-08 on Windows 11 with headless Chrome 156.0.8078.81 through the repository's
CDP client (`scripts/lib/cdp.mjs`), serving `apps/storybook/storybook-static` from a temporary
local HTTP server. Storybook imports the distributed `@neshel-ui/layout/styles.css`,
`@neshel-ui/typography/styles.css` and the `neshel generate` output of its own
`neshel.config.ts` (extend mode: `phone` 30rem, `tablet` 52rem, `tailwind: true`). The capture
script is not committed (a thin wrapper around `launchBrowser`, `setViewport` and `screenshot`).

| Screenshot                         | Story / theme / viewport                                  | What it shows                                                                         |
| ---------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `welcome-desktop-light.png`        | Custom breakpoints › Welcome, light, 1280 px              | Owner example: active breakpoints up to `lg`, 3-column Grid, `3xl` heading            |
| `welcome-mobile-dark.png`          | Same, dark, 390 px                                        | Below `phone`: one column, `xl` heading, dark tokens                                  |
| `tailwind-and-neshel-900.png`      | Custom breakpoints › Tailwind and Neshel together, 900 px | `tablet` (52rem = 832 px) active: Neshel Grid and Tailwind `tablet:grid-cols-4` agree |
| `capsize-trimmed-vs-untrimmed.png` | Capsize › Trimmed versus untrimmed, 1280 px               | Outlined boxes: trimmed (cap height → baseline) versus untrimmed line boxes           |
| `capsize-precise-gaps-sepia.png`   | Capsize › Precise gaps, sepia, 1280 px                    | Heading/paragraph in a Stack, caption beside a heading in an Inline, custom theme     |
| `multilingual.png`                 | Text, Paragraph and Caption › Unicode and accents, 900 px | Accented Latin, Japanese, Thai and Arabic (RTL) text, not clipped by trimming         |
| `heading-levels-system.png`        | Heading › Level defaults, system theme, 1280 px           | `h1`–`h6` default sizes                                                               |

Each page reported 0 uncaught exceptions and 0 `console.error` messages and rendered the
expected typography elements (3, 3, 2, 6, 4, 5 and 6 `.neshel-typography` nodes).

Limitation visible in the Capsize screenshots: the default metrics are Inter's, but Inter is not
installed on the capture machine, so Chrome renders the next family in the default stack and the
trims are approximate (off by the cap-height difference). Exact trimming is asserted by
`pnpm check:browser` with metrics measured from the rendered font (SC-004), and consumers get exact
results by configuring the metrics (and Capsize fallbacks) of the fonts they load. Screenshots are
illustrative; correctness is asserted by the automated checks. The Storybook a11y panel was not run
interactively.
