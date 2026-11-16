# Evidence — feature 008 (008.0)

Status vocabulary (feature 001): **implemented**, **verified locally** (named machine), **verified
in GitHub Actions** (named run and commit), **planned**. Nothing was pushed, merged, versioned,
tagged or published; `@neshel-ui/animations` is `private: true` at `0.0.0`; no existing tag was
touched (`v0.1.0` unchanged).

Machine: Windows 11 Home 10.0.26300, PowerShell 7 host with Git Bash, Node 26.13.0, pnpm 12.16.1,
Chrome 157.0.8103.51 (headless, CDP). Branch `feature/008-animations` from `main` at `9b57a92`;
code commit `9ff8aec`.

## Inventory

| Item                                                  | Status                                       |
| ----------------------------------------------------- | -------------------------------------------- |
| `@neshel-ui/animations` package (private)             | implemented, verified locally                |
| `./core`: scheduler, spring, composer, reduced motion | implemented (experimental), verified locally |
| Tilt3D (component, `asChild`, hook, controller)       | implemented (experimental), verified locally |
| CornerRecede (4 techniques, playground)               | prototype, verified locally (lab)            |
| ScrollScene (playground)                              | prototype, verified locally (lab)            |
| Storybook story Tilt3D                                | implemented, Storybook build passes          |
| `check:pack --with`, `checkAnimationsContract`        | implemented, verified locally                |
| `check:browser:animations`                            | implemented, verified locally                |
| CI steps (pack `--with animations`, lab check)        | implemented, **not verified** (no push)      |
| Catalogue (157 entries), ADRs 0018–0020               | documented (proposals for owner review)      |
| Effects other than Tilt3D, registry, presets, tokens  | planned (009–016)                            |

## Local verification (2026-11-15)

| Gate                                                                | Command                                                                                                                                                                     | Result                                                                                                                                                                                     |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Doctor, lint, typecheck, tests, build, package tests, exports, pack | `pnpm check`                                                                                                                                                                | **pass** — repository tests 106 passed / 107 (1 skipped, platform-specific, pre-existing); package tests 241/241 (animations 37); `check:pack` 5 public packages + `@neshel-ui/animations` |
| Workspace scaffold                                                  | `pnpm check:workspace` (in `doctor`)                                                                                                                                        | pass — 7 packages, 5 intended public, 2 private                                                                                                                                            |
| Animations tarball                                                  | `pnpm check:pack --no-build --with animations`                                                                                                                              | pass — 59 files, 31.0 KiB (with README); publint clean; attw esm-only (4 CJS-only findings ignored, as for every package); runtime import and NodeNext/Bundler types of `.` and `./core`                 |
| Browser lab (real input)                                            | `pnpm build:playground && pnpm check:browser:animations`                                                                                                                    | **pass — 14/14 cases** (list below); notes: WebGL ready, `animation-timeline: view()` supported, View Transitions present (Chrome 157)                                                     |
| Playground build (typecheck + Vite, two pages)                      | `pnpm --filter @neshel-ui/playground-vite build`                                                                                                                            | pass                                                                                                                                                                                       |
| Storybook build                                                     | `pnpm build:storybook`                                                                                                                                                      | pass; `neshel.generated.d.ts` unchanged                                                                                                                                                    |
| Changesets                                                          | `pnpm changeset:status`                                                                                                                                                     | pass — nothing to bump; animations not versioned                                                                                                                                           |
| Release guards                                                      | `node scripts/release-guards.mjs --tag v0.1.0`                                                                                                                              | pass — five public packages unchanged, core private                                                                                                                                        |
| API docs freshness                                                  | `pnpm docs:api --check`                                                                                                                                                     | pass                                                                                                                                                                                       |
| Published packages untouched                                        | `git diff main -- packages/{config,layout,typography,components,cli,core} .changeset .github/workflows/release.yml scripts/release-guards.mjs scripts/publish-tarballs.mjs` | empty                                                                                                                                                                                      |
| Mutation control                                                    | flip a sign and drop one `removeEventListener` in built Tilt3D                                                                                                              | the sign and cleanup tests fail (2 failures), then pass after rebuild                                                                                                                      |

### Browser cases (`check:browser:animations`)

load without errors, cards at rest after hydration · top-right pointer path recedes that corner
(rx, ry > 8° at maxTilt 12) with **zero React commits** · leaving springs back (animated, then
inline `transform` removed) · composition: CSS `translate` lift (`0px -6px`) + JS `transform` tilt
on one element · keyboard: real Tab focus shows the focus pose; next Tab moves the pose to the
`asChild` link and returns the first card to rest · unmount/remount without errors · live
reduced-motion emulation: state `reduced`, no transform on hover, back to `rest` · CornerRecede:
spring-animated amount mid-flight then 1.0, range synced, rigid and flap transformed, flap
`aria-hidden` + `inert`, 64 tiles, corner tile 3D vs far tile flat, WebGL status reported ·
CornerRecede under reduced motion jumps instantly · ScrollScene: progress 0.25 ± 0.02, CSS variable
in sync, stage pinned at top 0, depth ratio front/far ≈ 10, caption opacity follows the 0–0.3
segment and is 1 at 0.5 · resize to 800×600 re-measures and keeps progress consistent · smooth scrub
lags (< 0.8 after 50 ms toward 0.9) then converges (0.9 ± 0.02) · axe: no violations · no page
errors during the run.

### Finding recorded by the browser check

The first run failed "tilt: top-right pointer…" (state `rest`): the receding corner moved the
projected shape away from the pointer and Chrome fired `pointerleave`. Fixed by using the
untransformed box as hit area (research R6, FR-065); the case passes and a jsdom regression test
covers it.

### Bundle measurement (SC-004)

Vite 8 library builds, minified, React external, from the built package
(scratch script, not committed):

| Entry                                                      | min (B) | gzip (B) | Slot | React | rAF scheduler | matchMedia |
| ---------------------------------------------------------- | ------- | -------- | ---- | ----- | ------------- | ---------- |
| `{ Tilt3D }`                                               | 16 623  | 5 954    | yes  | yes   | yes           | yes        |
| `{ useTilt3D }`                                            | 11 253  | 4 077    | no   | yes   | yes           | yes        |
| `{ createTilt3D }`                                         | 10 712  | 3 901    | no   | no    | yes           | yes        |
| core `{ createFrameScheduler, stepSpring, resolveSpring }` | 2 505   | 1 176    | no   | no    | yes           | no         |
| core `{ composeTransform }`                                | 898     | 461      | no   | no    | no            | no         |
| `export *` from the root                                   | 16 687  | 5 975    | yes  | yes   | yes           | yes        |

The core never pulls React or the Slot; `composeTransform` alone pulls no scheduler.

### Visual verification

Screenshots in [visual-verification/](visual-verification/README.md) (Chrome 157, 1280×900).

## Not run / pending

| Check                                                 | Why                                                                                 | Plan                                  |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------- |
| GitHub Actions (Linux, Windows, macOS; Node 22/24/26) | Requires pushing the branch — owner authorisation needed                            | After owner review (T044)             |
| Firefox / WebKit lab runs                             | Harness (ADR 0016) not yet wired for the lab                                        | Phase 009 (T045)                      |
| `pnpm check:consumer` (packed external apps)          | No published package changed; animations is private and has no consumer variant yet | Add an animations consumer in 009/016 |
| `pnpm check:bundles` budgets for animations           | API not approved; measured manually above                                           | Phase 009                             |
| Manual screen-reader pass of the lab                  | Owner task                                                                          | Before publication                    |
| `pnpm check:next`, docs-site checks                   | Not affected by this slice                                                          | —                                     |
