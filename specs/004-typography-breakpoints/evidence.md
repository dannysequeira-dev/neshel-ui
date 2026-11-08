# Evidence — feature 004

Status vocabulary (feature 001): **implemented**, **verified locally** (named machine),
**verified in GitHub Actions** (named run and commit), **planned**. Nothing here was published.

## Local verification (2026-11-08)

Machine: Windows 11 Home 10.0.26300, PowerShell 7 host with Git Bash, Node 26.13.0, pnpm 12.16.1,
Chrome 156.0.8078.81.

| Gate                                                               | Command                                          | Result                                                                                                                        |
| ------------------------------------------------------------------ | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| Doctor, lint, typecheck, unit, build, package tests, exports, pack | `pnpm check`                                     | pass — repository tests 69/69; package tests 165/165 (config 10, cli 83, layout 52, typography 20); `check:pack` 5/5 packages |
| Component stylesheet drift                                         | `pnpm generate:component-css --check`            | pass (layout, typography)                                                                                                     |
| External consumers (packed tarballs)                               | `pnpm check:consumer --no-build --artifacts …`   | pass — tailwind, plain, configured, configured-extend, configured-replace                                                     |
| Browser computed styles                                            | `pnpm check:browser --consumers …`               | pass — 10 779 assertions, including the consumer boundary sweeps and Capsize geometry                                         |
| Storybook build                                                    | `pnpm --filter @neshel-ui/storybook build`       | pass; screenshots in [visual-verification/](visual-verification/README.md)                                                    |
| Playground build                                                   | `pnpm --filter @neshel-ui/playground-vite build` | pass                                                                                                                          |

### Key measurements

- **SC-001** (Phase 003 parity): all 85 feature 003 layout browser assertions pass unchanged with the
  order-free runtime and custom-property alignment CSS (`layout: shipped CSS`), plus the import
  order cases and the negative control.
- **SC-002** (thresholds): `configured-replace` (plain CSS, generated stylesheet only) and
  `configured-extend` (Tailwind, package stylesheets + generated) switch exactly at each tested
  threshold — 1 px below keeps the previous value, the threshold applies the new one — for Grid
  tracks/gaps, Stack gaps (including `phone` 30rem ordered before `sm`), Flex direction remapping,
  alignment precedence (`alignX` beats `align` across breakpoints), Heading font size/line height,
  Paragraph weight/alignment, and upward inheritance. Tailwind `phone:block` / `wide3:block` and
  Neshel `Box display` switch at the same widths.
- **SC-003** (types): generated declarations type-check in both consumers with `moduleResolution`
  Bundler and NodeNext; `md`/`lg` are rejected in replace mode, unknown names everywhere; the same
  fixtures **fail** without the declarations (negative control). In-repo fixtures: config
  (`BreakpointName` = defaults), layout and typography `type-tests/replace` (mutation-checked).
- **SC-004** (Capsize): CLI equivalence with `@capsizecss/core` 4.1.3 for Inter, Arial, Georgia,
  Roboto Mono and Times New Roman × 10 sizes × 10 leadings — 1 000 comparisons, none above 1e-4 em.
  Browser: with metrics measured from the rendered font (Windows `sans-serif`: cap 0.7150, ascent
  0.9050, descent 0.2100), trimmed boxes start at the first line's cap height and end at the last
  baseline within 1 px (single line, multi-line, `5xl` tight, Caption); untrimmed and truncated
  elements are not trimmed; a +0.1 em metric skew is detected (negative control).
- **SC-006** (size): layout `styles.css` 48 847 bytes raw / 3 874 gzip (≤ 48 KiB); typography
  15 440 / 1 503 (≤ 24 KiB).
- **SC-007** (freshness): second `neshel generate` writes nothing (mtime test); `--check` exits 4 for
  missing/stale stylesheet or declarations and for a stale declarations file after removing
  breakpoints; foreign `.d.ts` files are never removed.
- Hydration: typography jsdom hydration without recoverable errors or `console.error`; all five
  consumer pages hydrate prerendered markup in Chrome with 0 recoverable errors and 0 page errors.

## GitHub Actions

Run [42488883635](https://github.com/dannysequeira-dev/neshel-ui/actions/runs/42488883635) on
`e8a5ca3` — **success, 5/5 jobs**: Node 26 on ubuntu-latest, windows-latest and macos-latest; Node 22
and 24 on ubuntu-latest. Every job ran doctor, lint, tests, typecheck, package build, package tests,
exports, `check:pack`, `check:consumer` (all five variants from tarballs), `check:browser` (theme
matrix, layout cases, consumer boundary sweeps, Capsize geometry with each OS's `sans-serif`), the
Vite playground build, the Storybook build and the generated-declarations freshness step.
The closure commit (documentation only) is verified by the following run, recorded in the final
report.

## Not verified / accepted gaps

- Browsers other than Chrome (Firefox, Safari) — not run.
- Next.js / RSC consumers — feature 006.
- Real web fonts in the browser check: the geometry test measures whatever the OS renders for
  `sans-serif`; Inter itself is not installed on the machines (documented approximation for the
  default metrics without Inter).
- Storybook a11y panel not run interactively; screenshots are illustrative.
