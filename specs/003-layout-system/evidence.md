# Evidence log — Feature 003

Status vocabulary (constitution VII): **implemented** (code exists) · **verified locally**
(gates passed on a named machine) · **verified in GitHub Actions** (gates passed on native
runners for a named commit) · **planned**.

Local machine for every "verified locally" entry: Windows 11 Home 10.0.26300, Node 26.13.0,
pnpm 12.16.1, Chrome 156.0.8078.81, PowerShell 7 / Git Bash. CI: the five jobs of
`.github/workflows/ci.yml` (Node 26 on Ubuntu, Windows, macOS; Node 22 and 24 on Ubuntu). CI
results were read from the public GitHub REST API (`/actions/runs?head_sha=…`, `/jobs`).

## 003.0 — Specification and planning

- Commits `6c2502b` (dependencies: `tailwind-variants` ^3.3.1, `@radix-ui/react-slot` ^1.5.0,
  `jsdom` ^29.1.1, catalog entries), `ef5420e` (spec, research, contracts, ADR 0008/0009, plan,
  tasks, analysis), `0856eb2` (Biome formatting of the documents).
- `/speckit-analyze`: 0 critical, 1 medium, 3 low findings; remediations applied
  ([analysis.md](analysis.md)).
- Dependency selection evidence: `tailwind-variants` 4.0.1 was 9 days old (major), 3.3.1 chosen;
  `dist/lite.js` imports no `tailwind-merge` (read from the installed package); `jsdom` 30.x
  requires Node ≥ 22.22, 29.1.1 matches the ≥ 22.13 floor.

## 003.1–003.3 — Foundations, primitives, composition, separators, validation

Implemented: `packages/layout/src/` (`style-tables.ts`, `resolve.ts`, `variants.ts`,
`render.tsx`, seven components, `types.ts`, `errors.ts`), generator
`packages/layout/scripts/generate-css.mjs`, committed `src/styles.css`.
Commits `3b026db`, `8990a8a`, `73ac0c9`.

Verified locally:

- Stylesheet: 661 single-class rules, 42 283 bytes raw, 3 584 bytes gzip (budget 48 KiB / 8 KiB).
- `packages/layout/test/` (node:test on `dist`, jsdom for client tests): rendering (15),
  stylesheet (7), composition (9), separators (13), errors/hydration (4) — part of the 116
  package tests.
- Consistency C1/C2: exhaustive sweep (> 1 000 renders) — every emitted class has a rule and
  every rule is reachable; negative control removes `.neshel-md-gap-4` and adds a stray rule,
  both detected.
- Type fixtures `type-tests/valid.tsx` / `invalid.tsx` (31 `@ts-expect-error` lines) pass
  `pnpm typecheck`. Mutation: relaxing the `SpacingProps` union produced 5 × TS2578 "Unused
  '@ts-expect-error'" errors, proving the fixtures detect regressions.
- Hydration (jsdom): `renderToString` → `hydrateRoot` of a tree using all primitives, `asChild`
  and separators: 0 recoverable errors, 0 `console.error` calls, identical markup.
- Server/client parity: the first six error cases throw identical messages through
  `react-dom/server` and `createRoot`.

**Verified in GitHub Actions:** commit `73ac0c9`, run 42480913188 — 5/5 jobs success.

## 003.2 / 003.4 — Browser, packaging and external consumers

Implemented: `scripts/lib/layout-browser.mjs` (18 cases, viewports 360–1600 px),
`setViewport` in `scripts/lib/cdp.mjs`, layout section in `scripts/check-browser.mjs`, layout
contract in `scripts/lib/pack-checks.mjs`, `scripts/lib/consumer-layout.mjs` and the layout
additions to `scripts/check-consumer.mjs`. Commits `602d52d` (pack contract), `df69a06`
(browser), `3656920` (consumers).

Verified locally (final run on the closing tree):

- `pnpm check`: exit 0 — root tests 69 (68 pass, 1 pre-existing skip: POSIX signals on
  Windows), package tests 116/116, `check:pack` 5/5 packages (layout: 74 files, 30.8 KiB,
  publint and attw clean, runtime import and NodeNext/Bundler type resolution).
- `pnpm check:consumer`: tailwind, plain and configured passed. Layout consumers: `tsc` with the
  published `@ts-expect-error` contract, Vite build, `vite build --ssr`, Node prerender from the
  tarball (3 564 / 2 584 bytes of markup), C5 selector check on built CSS (44 838 / 38 561 bytes),
  deep import blocked, no `tailwind-merge`/`@neshel-ui/core` installed.
- `pnpm check:browser --consumers …`: 9 377 computed-style assertions passed, including
  85 layout assertions on the shipped CSS (directions, wrap, gaps, alignment, LTR/RTL,
  `row-reverse`, grid tracks per breakpoint, container constraints, Box display, separator
  placement/orientation/colour in light and dark, scoped `--neshel-spacing`), the import-order
  fixtures (canonical order centres Container; layout-before-Tailwind loses `margin-inline:
  auto` as documented; a Tailwind utility overrides the layout class in both orders), consumer
  pages (hydrated, 0 hydration errors, layout cases and the Tailwind override case). The
  negative control without the layout stylesheet fails as required.
- Negative controls (SC-005), run manually and in unit tests:
  - `check:pack` with `./styles.css` removed from `exports` and `tailwind-merge` added →
    `FAIL @neshel-ui/layout` with "exports must be exactly ., ./styles.css" and the dependency
    error; manifest restored.
  - `dist/styles.css` with `.neshel-md-cols-2` deleted → package tests fail (drift, C1) and
    `check:pack` fails ("differs from packages/layout/src/styles.css"); rebuilt.
  - Unit tests: `tests/pack-checks.test.mjs` (broken exports, leaked deps, `node:` imports,
    dirty/stale stylesheet), `tests/layout-css.test.mjs`, `tests/consumer-layout.test.mjs`
    (missing selectors, lost layer, `@source`, leaks), `tests/layout-browser.test.mjs`.

**Verified in GitHub Actions:** commit `3656920`, run 42481749103 — 5/5 jobs success (includes
`check:consumer` and `check:browser` with layout on Linux, Windows and macOS).

## 003.4 — Storybook

Implemented: `apps/storybook` depends on `@neshel-ui/layout`, imports
`@neshel-ui/layout/styles.css`, theme toolbar decorator (`.storybook/preview.tsx`), a
Storybook-only `sepia` theme, stories for Box, Flex, Stack, Inline, Grid, Center, Container and
Composition (asChild, nesting, themes, application shell). Commits `4cc4746`, `426df69`,
`f31878a`.

Verified locally: `pnpm --filter @neshel-ui/storybook build` succeeds; screenshots in
[visual-verification/](visual-verification/README.md) with 0 page errors. The first capture
revealed a mobile header overflow in the application-shell story, fixed in `f31878a`.

**Verified in GitHub Actions:** commit `f31878a`, run 42482142182 — 5/5 jobs success.

## 003.5 — Documentation and closure

Implemented: `docs/layout.md`, package README, `docs/package-contracts.md`,
`docs/architecture.md`, `docs/roadmap.md`, root README, `CLAUDE.md` phase line, changeset
`.changeset/layout-primitives.md`, ADR 0008/0009 verification sections, this log and
[traceability.md](traceability.md).

The CI result of the closure commit itself is reported to the owner rather than recorded here
(recording it would require another commit).

## Known limitations and accepted risks

- Browser verification covers Chromium-based Chrome only (GitHub-hosted runners and Chrome 156
  locally); Firefox and Safari are untested (risk K1).
- Breakpoints are fixed (K3); vertical writing modes unsupported; `asChild` children that do not
  forward `className`/`ref` lose styles silently (K4); only the canonical import order is
  supported (K6).
- The Storybook a11y addon was not run; accessibility rests on native elements and
  `aria-hidden` decorative separators, asserted in unit tests.
- No Next.js consumer (feature 006).
