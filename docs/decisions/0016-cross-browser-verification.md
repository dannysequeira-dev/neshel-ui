# ADR 0016 — Cross-browser verification with Playwright

- Status: **Accepted** (2026-11-08, within the owner's Phase 006 brief)
- Date: 2026-11-08
- Feature: [006](../../specs/006-docs-dx-release/spec.md) (release requirement R3)

## Context

Browser verification so far drives Chrome through a small in-repo CDP harness. Firefox no longer
supports CDP and WebKit never did. The release backlog requires Firefox and WebKit coverage.

## Decision

1. Add `playwright` (library) as a root dev dependency for Chromium, Firefox and WebKit smoke flows
   (`pnpm check:browsers`) against the packed component consumers, served over HTTP by a Node
   static server.
2. Keep the CDP harness as the deep Chrome suite (no rewrite of verified tests).
3. CI: Linux and macOS jobs run all three engines (`playwright install --with-deps`); Windows keeps
   the Chrome suite. Locally the check skips when browsers are not installed; on CI it fails.
4. Evidence names the engine and version; Playwright WebKit is reported as WebKit, never as Safari.

## Consequences

Browser downloads in CI (~300 MB, cached by Playwright per job); one more dependency for
contributors (dev only).

## Alternatives

WebDriver BiDi through a hand-written client (large effort); Selenium (heavier); cloud browser
grids (paid, credentials).

## Verification

`pnpm check:browsers --consumers <dir>` green on the CI jobs above, with a negative control.
