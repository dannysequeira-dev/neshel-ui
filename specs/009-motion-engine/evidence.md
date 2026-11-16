# Evidence — Phase 009 (Motion Engine)

Status vocabulary: **implemented**, **verified locally** (named machine), **verified in GitHub
Actions** (named run), **planned**. Nothing was pushed, merged, versioned, tagged or published;
`@neshel-ui/animations` stays `private: true` at `0.0.0`.

Machine: Windows 11 Home 10.0.26300, Node 26.13.0, pnpm 12.16.1, Chrome 157.0.8103.51 (CDP),
Playwright Chromium 158.0.8127.18, Firefox 159.0, WebKit 27.2 (Playwright build, not Safari).
Branch `feature/009-motion-engine`, replayed onto `main` after the PR #4 squash merge `fd3885c`
(backup branch `backup/009-before-sync`).

## Repository synchronisation (owner step 1)

`origin/main` contains feature 008 as **`fd3885c`, a single-parent squash commit** whose tree is
byte-identical to the PR head `937c9a6` (`git diff 937c9a6 fd3885c` empty) — not a merge commit, so
the 008 branch commits are not ancestors of `main`. The two 009 commits were replayed with
`git rebase --onto origin/main 937c9a6` after creating `backup/009-before-sync`; the result's tree is
identical to the backup and `git diff origin/main` touches only Phase 009 files (no 008 duplication).

## Inventory

| Item                                                                                          | Status                                                      |
| --------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Motion host + style ledger (requirement 3.1)                                                  | implemented, verified locally                               |
| Channels compose/multiply/exclusive, arbitration, suspension/resumption, conflict policy      | implemented, verified locally                               |
| `defineEffect`, `createEffectRegistry`, `attachEffect`, `getMotionDebugInfo`                  | implemented, verified locally                               |
| Controllers: `motionValue`, `animateValue`, `bindChannel`, `animateElement` (requirement 3.2) | implemented, verified locally                               |
| Easing, `springEasing`, interpolation, `motionDefaults` (D5)                                  | implemented, verified locally                               |
| React: `useMotionEffect`, `useMotionValue`, `useMotionValueEvent`                             | implemented, verified locally                               |
| Tilt3D as `tilt3D` definition, moved to `./hover` (Q1, no compatibility layer)                | implemented, verified locally                               |
| Engine lab section, `check:browser:animations` (20 cases)                                     | implemented, verified locally                               |
| `check:animations:engines` (Chromium, Firefox, WebKit)                                        | implemented, verified locally                               |
| `check:animations:consumer` (packed tarball, SSR, hydration)                                  | implemented, verified locally                               |
| `check:animations:bundles` (packed tarball vs budgets)                                        | implemented; **3 of 4 budgets exceeded** (decision pending) |
| CI steps (consumer in the main job; three engines in the browsers job)                        | implemented, **not verified** (no push)                     |
| Manual screen-reader review                                                                   | planned before publication (owner Q4)                       |

## Local verification (2026-11-16)

| Gate                               | Command                                                                                                                                                                            | Result                                                                                                                                                                                                                                        |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Full gate                          | `pnpm check`                                                                                                                                                                       | **pass** — repository tests 106/107 (1 pre-existing platform skip); package tests 282/282 (animations 78); `check:pack` 5 public + animations (exports `.`, `./core`, `./hover`, `./styles.css`; module-boundary rules)                       |
| Chrome lab (CDP, real input)       | `pnpm check:browser:animations`                                                                                                                                                    | **pass — 20/20** (14 from 008 + 6 engine cases)                                                                                                                                                                                               |
| Three engines (Playwright)         | `pnpm check:animations:engines`                                                                                                                                                    | **pass — 11/11 in Chromium 158, Firefox 159 and WebKit 27.2**; all report SDA, View Transitions, `linear()` and individual transforms supported, WebGL ready                                                                                  |
| Packed external consumer           | `pnpm check:animations:consumer`                                                                                                                                                   | **pass — 7/7**: SSR markup from the packed package, no motion state in SSR, hydration without recoverable errors, no page errors, Tilt3D attached, custom `defineEffect` from the packed engine applied, real pointer tilts the hydrated card |
| Bundle budgets (packed tarball)    | `pnpm check:animations:bundles`                                                                                                                                                    | **fail** — see below                                                                                                                                                                                                                          |
| Storybook / playground builds      | `pnpm build:storybook`, playground build                                                                                                                                           | pass; generated declarations unchanged                                                                                                                                                                                                        |
| Docs, API data, Changesets, guards | `check:docs`, `docs:api --check`, `changeset status`, `release-guards --tag v0.1.0`                                                                                                | pass; nothing to bump                                                                                                                                                                                                                         |
| Untouched                          | `git diff origin/main -- packages/{config,layout,typography,components,cli,core} .changeset .github/workflows/release.yml scripts/release-guards.mjs scripts/publish-tarballs.mjs` | empty                                                                                                                                                                                                                                         |

### Unit and type coverage (packages/animations, 78 tests + 3 type fixtures)

- **Style ownership (3.1)** — `test/host.test.mjs` (14): capture/restore value **and priority**
  (`!important`), removal when nothing was captured (no residue, host released), inline transform kept
  before the layers, opacity multiplied with the inline opacity, `will-change` union and restoration,
  external changes adopted as baseline with one warning (transform and exclusive), one write per
  property per frame and none when unchanged, arbitration ties/preemption/resumption order,
  all-or-none, policies `error`/`silent`, production default, `commit`.
- **Definitions and lifecycle** — `test/effect.test.mjs` (9): validation and freezing, registries,
  attach/update/pause/resume/destroy restoring styles, conflicting effects resume with their latest
  options in deterministic order, strict mode throws without side effects, a throwing `setup` leaves
  no subscription (bug found and fixed in this phase), live reduced motion through the context, React
  hook SSR/hydration/update/unmount, motion-value hooks without re-render.
- **Controllers (3.2)** — `test/controls.test.mjs` (18): typed `finished` for completed/cancelled/
  interrupted, rejection only on a real error (`failed` is terminal), `play`/`pause`/`reverse`/`seek`/
  `cancel`/`finish` semantics including new runs from settled states, spring velocity kept on
  interruption, reduced motion (immediate completion; live change finishes), `bindChannel` restore,
  WAAPI commit/cancel/interrupt/failure/no-WAAPI paths, easing reference values, `springEasing`,
  defaults, interpolation; and no unhandled rejection from normal outcomes.
- **Tilt3D** — all 008 behaviours (17 tests) unchanged on the engine, now imported from `./hover`.
- **Mutation controls** — dropping the restored priority, disabling the duplicate-write guard,
  making `cancel` reject and removing the WAAPI commit each made the suites fail.

### Findings during implementation

1. **`attachEffect` leak on a throwing `setup`** — the reduced-motion subscription and claim stayed
   registered; fixed with cleanup-and-rethrow; regression test added.
2. **Playwright Chromium/WebKit refuse ES modules from `file://`** — the engine check serves the
   built lab over a local HTTP server (the CDP check keeps `--allow-file-access-from-files`).
3. **Test-order coupling in the lab** — a reduced-motion case left a motion value bound to
   `transform`, which made the engine suite see a live host in Firefox; both browser scripts now
   unbind after that case. The engine itself released the host correctly (verified in Firefox).
4. **Measurement method** — Vite's library mode (used by the repository's `check:bundles` and by this
   check) minifies identifiers but keeps whitespace in ES output; fully minified sizes are listed for
   context only. Budgets are enforced on the repository's method.

### Bundle budgets (owner-approved; packed tarball, React external, gzip -9)

| Entry                                                                    | Budget   | Measured (repo method) | Fully minified (context) | Result |
| ------------------------------------------------------------------------ | -------- | ---------------------- | ------------------------ | ------ |
| core (entire entry)                                                      | 8.00 KiB | **8.53 KiB**           | 7.71 KiB                 | over   |
| registry + host (`defineEffect`, `createEffectRegistry`, `attachEffect`) | 3.00 KiB | **4.45 KiB**           | 3.98 KiB                 | over   |
| hover: `Tilt3D` (incl. Slot)                                             | 7.00 KiB | **8.40 KiB**           | 7.39 KiB                 | over   |
| `composeTransform`                                                       | 0.60 KiB | 0.50 KiB               | 0.38 KiB                 | ok     |
| controllers (`motionValue`, `animateValue`)                              | —        | 3.45 KiB               | 2.96 KiB                 | info   |
| hover: `createTilt3D` (no React)                                         | —        | 6.41 KiB               | 5.73 KiB                 | info   |
| root: React bindings                                                     | —        | 4.26 KiB               | 3.73 KiB                 | info   |

Tree-shaking markers pass for every entry (core and registry entries contain no React, Slot, WAAPI
or easing code; `composeTransform` alone contains no scheduler; the root contains no Tilt3D or Slot).
A conservative optimisation pass (diagnostics moved to `debug.ts`, redundant validation removed,
shorter messages) reduced registry + host from 4.68 to 4.45 KiB and Tilt3D from 8.63 to 8.40 KiB.
Meeting the budgets needs structural changes or a budget/metric decision — **pending owner decision**
(see the report). The check is not wired into CI until then; budgets were not changed.

## Not run / pending

| Check                                   | Why                                                               |
| --------------------------------------- | ----------------------------------------------------------------- |
| GitHub Actions on Linux, Windows, macOS | Requires pushing `feature/009-motion-engine` (not yet authorised) |
| Bundle budgets                          | Over budget; owner decision pending                               |
| Manual screen-reader review             | Owner, before publication (Q4)                                    |
| Real Safari                             | Playwright WebKit is not Safari                                   |
