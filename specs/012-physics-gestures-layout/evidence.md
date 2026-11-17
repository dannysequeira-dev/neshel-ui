# Evidence — Phase 012

Status vocabulary: **implemented**, **verified locally** (named machine), **verified in GitHub Actions**
(named commit and run), **planned**. Nothing here is claimed before it ran.

## 0 · Environment

Windows 11 Home (10.0.26300), Node 26.13.0, pnpm 12.16.1; Playwright Chromium 158.0.8127.18, Firefox 159.0,
WebKit 27.2.

## 1 · Baseline (before any Phase 012 change, `804badb`)

`pnpm build:packages` and `node scripts/check-animations-bundles.mjs`: every animations budget met
(e.g. `composeTransform` 0.54/0.60 KiB, `press.css` 1.48/1.60 KiB, `entrance: fadeIn definition`
6.38/6.50 KiB, `styles.css` 3.73/4.00 KiB).

## 2–12

Filled as slices complete.
