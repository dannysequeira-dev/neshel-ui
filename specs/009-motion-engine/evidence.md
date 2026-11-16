# Evidence — Phase 009 (Motion Engine)

Status vocabulary: **implemented**, **verified locally** (named machine), **verified in GitHub
Actions** (named run), **planned**. **Current status: verified in GitHub Actions — CI run
`43891329593`, 14/14 jobs, on commit `ceb71b6` (PR #6, branch pushed with owner authorisation);
awaiting the owner's merge.** The documentation-only commit `79cedf4` then failed 13/14 (run
`43936536735`, WebKit on Linux, ScrollScene prototype); the cause, the fixes to the playground
prototype and the lab checks, and their verification are in
[CI follow-up](#ci-follow-up-2026-11-16-stale-scrollscene-geometry-and-fixed-waits); the CI run of
that follow-up is reported on PR #6. Nothing was merged, versioned, tagged or published;
`@neshel-ui/animations` stays `private: true` at `0.0.0`. Sections below are dated; earlier stages
are kept as history where marked.

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

| Item                                                                                          | Status                                                                |
| --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Motion host + style ledger (requirement 3.1)                                                  | implemented, verified locally and in CI (run 43891329593)             |
| Channels compose/multiply/exclusive, arbitration, suspension/resumption, conflict policy      | implemented, verified locally and in CI (run 43891329593)             |
| `defineEffect`, `createEffectRegistry`, `attachEffect`, `getMotionDebugInfo`                  | implemented, verified locally and in CI (run 43891329593)             |
| Controllers: `motionValue`, `animateValue`, `bindChannel`, `animateElement` (requirement 3.2) | implemented, verified locally and in CI (run 43891329593)             |
| Easing, `springEasing`, interpolation, `motionDefaults` (D5)                                  | implemented, verified locally and in CI (run 43891329593)             |
| React: `useMotionEffect`, `useMotionValue`, `useMotionValueEvent`                             | implemented, verified locally and in CI (run 43891329593)             |
| Tilt3D as `tilt3D` definition, moved to `./hover` (Q1, no compatibility layer)                | implemented, verified locally and in CI (run 43891329593)             |
| Engine lab section, `check:browser:animations` (20 cases)                                     | implemented, verified locally and in CI (run 43891329593)             |
| `check:animations:engines` (Chromium, Firefox, WebKit)                                        | implemented, verified locally and in CI (run 43891329593)             |
| `check:animations:consumer` (packed tarball, SSR, hydration)                                  | implemented, verified locally and in CI (run 43891329593)             |
| `check:animations:bundles` (packed tarball vs budgets)                                        | implemented; **all budgets pass** locally and in CI (run 43891329593) |
| CI steps (consumer + bundles in the main job; three engines in the browsers job)              | implemented, verified in CI (run 43891329593)                         |
| Manual screen-reader review                                                                   | planned before publication (owner Q4)                                 |

## Local verification (2026-11-16, final head `ceb71b6`)

| Gate                               | Command                                                                                                                                                                            | Result                                                                                                                                                                                                                                        |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Full gate                          | `pnpm check`                                                                                                                                                                       | **pass** — repository tests 106/107 (1 pre-existing platform skip); package tests 286/286 (animations 82); `check:pack` 5 public + animations (exports `.`, `./core`, `./hover`, `./styles.css`; module-boundary rules)                       |
| Chrome lab (CDP, real input)       | `pnpm check:browser:animations`                                                                                                                                                    | **pass — 20/20** (14 from 008 + 6 engine cases)                                                                                                                                                                                               |
| Three engines (Playwright)         | `pnpm check:animations:engines`                                                                                                                                                    | **pass — 11/11 in Chromium 158, Firefox 159 and WebKit 27.2**; all report SDA, View Transitions, `linear()` and individual transforms supported, WebGL ready                                                                                  |
| Packed external consumer           | `pnpm check:animations:consumer`                                                                                                                                                   | **pass — 7/7**: SSR markup from the packed package, no motion state in SSR, hydration without recoverable errors, no page errors, Tilt3D attached, custom `defineEffect` from the packed engine applied, real pointer tilts the hydrated card |
| Bundle budgets (packed tarball)    | `pnpm check:animations:bundles`                                                                                                                                                    | **pass** — definitive budgets and tree-shaking markers (see below)                                                                                                                                                                            |
| Storybook / playground builds      | `pnpm build:storybook`, playground build                                                                                                                                           | pass; generated declarations unchanged                                                                                                                                                                                                        |
| Docs, API data, Changesets, guards | `check:docs`, `docs:api --check`, `changeset status`, `release-guards --tag v0.1.0`                                                                                                | pass; nothing to bump                                                                                                                                                                                                                         |
| Untouched                          | `git diff origin/main -- packages/{config,layout,typography,components,cli,core} .changeset .github/workflows/release.yml scripts/release-guards.mjs scripts/publish-tarballs.mjs` | empty                                                                                                                                                                                                                                         |

### Unit and type coverage (packages/animations, 82 tests + 3 type fixtures)

- **Style ownership (3.1)** — `test/host.test.mjs` (14): capture/restore value **and priority**
  (`!important`), removal when nothing was captured (no residue, host released), inline transform kept
  before the layers, opacity multiplied with the inline opacity, `will-change` union and restoration,
  external changes adopted as baseline with one warning (transform and exclusive), one write per
  property per frame and none when unchanged, arbitration ties/preemption/resumption order,
  all-or-none, policies `error`/`silent`, production default, `commit`.
- **Definitions and lifecycle** — `test/effect.test.mjs` (11): validation and freezing, registries,
  attach/update/pause/resume/destroy restoring styles, conflicting effects resume with their latest
  options in deterministic order, strict mode throws without side effects, a throwing `setup` leaves
  no subscription (bug found and fixed in this phase), live reduced motion through the context, React
  hook SSR/hydration/update/unmount, motion-value hooks without re-render, the arbiter-free path
  rejecting exclusive definitions, and a failing resumed `setup()` contained (review fix 2).
- **Controllers (3.2)** — `test/controls.test.mjs` (20): typed `finished` for completed/cancelled/
  interrupted, rejection only on a real error (`failed` is terminal), `play`/`pause`/`reverse`/`seek`/
  `cancel`/`finish` semantics including new runs from settled states, spring velocity kept on
  interruption, reduced motion (immediate completion; live change finishes), `bindChannel` restore,
  WAAPI commit/cancel/interrupt/failure/no-WAAPI paths, easing reference values, `springEasing`,
  defaults, interpolation; no unhandled rejection from normal outcomes; suspended `finish()` and live
  reduced motion for WAAPI (review fixes 1 and 3).
- **Tilt3D** — all 008 behaviours (16 tests) unchanged on the engine, now imported from `./hover`.
- **Core and contract** — `test/core.test.mjs` (11), `test/contract.test.mjs` (10).
- **Mutation controls** — dropping the restored priority, disabling the duplicate-write guard,
  making `cancel` reject and removing the WAAPI commit each made the suites fail.

### Findings during implementation (history)

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

### Bundle optimisation (owner decision 2026-11-16: option B, then A) — history; current sizes below

Method unchanged: packed tarball, Vite library build (the repository's `check:bundles` method),
React external, gzip -9. Changes, none of which removes a feature, contract or accessibility behaviour:

1. **Arbitration decoupled** — `host.ts` keeps the style ledger and composable channels;
   `arbiter.ts` holds exclusive-channel arbitration and the conflict policy; `attach.ts` holds the
   lifecycle, which receives the arbiter. `attachEffect`/`useMotionEffect` pass it; Tilt3D (only
   `transform`) attaches without it, so its bundles no longer contain arbitration code (verified by a
   tree-shaking marker). Attaching a definition with exclusive channels without the arbiter throws.
2. **Development diagnostics separated** — conflict and external-change warnings are guarded by
   `process.env.NODE_ENV`, so application production builds drop them (verified by a production
   build marker; `warn` behaves like `silent` in production, `error` still throws).
3. **Diagnostics module** — `getMotionDebugInfo` lives in `debug.ts`, outside other bundles.
4. **Redundancy removed** — duplicated channel validation in the host; shorter messages that still
   name both effects, the channel and the element.

| Entry                                     | Before (dbd935f) | After        | Change              | Provisional max | **Definitive budget** |
| ----------------------------------------- | ---------------- | ------------ | ------------------- | --------------- | --------------------- |
| core (entire entry)                       | 8.51 KiB         | 8.69 KiB     | +0.18               | 9.50 KiB        | **9.50 KiB**          |
| registry + host                           | 4.68 KiB         | 4.60 KiB     | −0.08               | 5.00 KiB        | **5.00 KiB**          |
| hover: Tilt3D (incl. Slot)                | 8.63 KiB         | **7.99 KiB** | **−0.64**           | 9.50 KiB        | **8.75 KiB**          |
| hover: createTilt3D (no React)            | 6.65 KiB         | **5.98 KiB** | **−0.67**           | —               | **6.60 KiB**          |
| controllers (motionValue, animateValue)   | 3.45 KiB         | 3.45 KiB     | 0                   | —               | **3.80 KiB**          |
| root: React bindings                      | 4.57 KiB         | 4.43 KiB     | −0.14               | —               | **4.90 KiB**          |
| composeTransform                          | 0.50 KiB         | 0.50 KiB     | 0                   | 0.60 KiB        | **0.60 KiB**          |
| registry + host, production define (info) | —                | 4.40 KiB     | dev strings removed | —               | not budgeted          |

Definitive budgets = measurement + ~10 % headroom (the convention of `scripts/bundle-budgets.json`),
never above the provisional maxima; entries that were informational are now budgeted to catch
regressions. Core grows slightly because splitting into modules adds cross-module property accesses;
its definitive budget still keeps ~9 % headroom. `pnpm check:animations:bundles` passes and runs in CI.

## Synchronisation with `main` (2026-11-16, owner request)

`origin/main` `89665bf` (PR #5, README badges) was merged into the branch as `a77814f` (merge commit,
no conflicts; the only shared file, `packages/animations/README.md`, kept both the badges and the
Phase 009 text). Backup `backup/009-before-main-merge`. Local `main` was fast-forwarded to
`89665bf`; `pnpm changeset:status` then passes with nothing to bump — the earlier failure came only
from the stale local `main` (no changeset was added).

## GitHub Actions (PR #6)

| Run             | Head          | Result                   | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| --------------- | ------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 43878431209     | `5e59ce9`     | failure (13/14 jobs)     | Only `browsers / ubuntu-latest`, WebKit: the lab case "WAAPI" read `getAnimations()` after two frames and saw 0 because the slow runner had already finished the 300 ms animation (it then completed and committed correctly). Timing assumption in the lab, not a product defect: the count is now read synchronously after `element.animate()`. Chromium and Firefox passed every case on Linux; all three engines passed on macOS; the main job (including `check:animations:consumer` and `check:animations:bundles`) passed on Linux, Windows and macOS. |
| 43882551375     | `c33191f`     | success (14/14 jobs)     | Head after the WAAPI count fix; reviewed by the owner, who then requested the three lifecycle fixes below.                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| **43891329593** | **`ceb71b6`** | **success (14/14 jobs)** | **Final code head.** Linux, Windows and macOS (Node 26) and Linux Node 22/24: `pnpm check` (package tests 286/286), `check:pack --with animations`, `check:browser:animations` 20/20, `check:animations:consumer`, `check:animations:bundles`; browsers job on Linux and macOS: `check:animations:engines` in Chromium, Firefox and WebKit; docs, Next + starters, Vercel build.                                                                                                                                                                              |

| 43936536735 | `79cedf4` | failure (13/14 jobs; job re-run: same result) | Documentation-only commit (no code change from `ceb71b6`). Only `browsers / ubuntu-latest`, WebKit: "scene: progress follows scroll with the stage pinned" → `{"progress":1,"top":0}`. Stale geometry in the ScrollScene prototype, see [CI follow-up](#ci-follow-up-2026-11-16-stale-scrollscene-geometry-and-fixed-waits). |

Runs 43878431209 and 43936536735 are kept as history (lab and prototype defects, fixed). The run of
the follow-up commit is reported on PR #6.

## Owner review of PR #6 (2026-11-16): three lifecycle defects (resolved in `ceb71b6`)

All three hypotheses from the static review were **confirmed** by regression tests written first and
run against `c33191f` (they failed), then fixed:

| #   | Defect (reproduced)                                                   | Failing evidence on `c33191f`                                                                                                 | Fix                                                                                                                                                                                                                   | Regression test                                                                                                                                              |
| --- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | `finish()` on a suspended WAAPI controller committed its end keyframe | the owner's `filter` became `invert(1)` instead of `grayscale(1)`, and the owner's restoration baseline was overwritten       | `complete()` commits only when the controller owns the channel; otherwise it settles `interrupted` and releases the waiting claim                                                                                     | `controls.test.mjs` "finish() on a suspended controller…"                                                                                                    |
| 2   | A resumed `setup()` that throws escaped through `resumeWaiting()`     | the error was thrown from the **owner's** `destroy()`; the failing claim stayed granted and later waiting claims were skipped | `attach.ts` catches resumption failures: releases claim, contributions and subscription, state `failed`, `reportError`; `arbiter.ts` also guards every grant callback and skips records changed by nested resumptions | `effect.test.mjs` "resumed setup() that throws…" (no claim/listener/style leak, error reported once, next waiting effect gets the channel, element reusable) |
| 3   | `animateElement()` checked `prefers-reduced-motion` only at start     | a live switch to `reduce` left the run active (test timed out)                                                                | live subscription while running/paused finishes the run (`completed`, end state committed); removed on settle                                                                                                         | `controls.test.mjs` "a live switch to reduced motion…" (also initial preference and no listener leak)                                                        |

Current sizes, after the fixes (budgets unchanged, **all pass**, locally and in CI run 43891329593): core 8.69 → 8.80 KiB (budget 9.50),
registry + host 4.60 → 4.68 (5.00), Tilt3D 7.99 → 8.00 (8.75), createTilt3D 5.98 → 6.01 (6.60),
controllers 3.45 → 3.47 (3.80), root bindings 4.43 → 4.50 (4.90), composeTransform 0.50 (0.60).
Local re-verification: `pnpm check` (package tests 286/286), `check:animations:bundles`,
`check:browser:animations` 20/20, `check:animations:engines` (Chromium, Firefox, WebKit),
`check:animations:consumer`; untouched packages/Changesets/release workflow re-checked.

Contracts updated: controllers §1 (suspended controllers) and §4 (live reduced motion),
effect-definition §3 (resumption failures, state `failed`), channels-and-arbitration §3 rule 5;
ADR 0022 §8 and ADR 0023 §5.

## CI follow-up (2026-11-16): stale ScrollScene geometry and fixed waits

Owner authorisation (2026-11-16): fix the ScrollScene playground prototype and the browser lab
checks; no change to `@neshel-ui/animations`, its API or budgets, the five published packages,
Changesets or `release.yml`. None of those changed: `git diff ceb71b6 -- packages .changeset
.github` is empty.

### Failures observed

| Where                        | Run                     | Case                                                                                                 | Result                                                                                           |
| ---------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| PR #6, `79cedf4` (docs only) | 43936536735, job re-run | WebKit on Linux (`check:animations:engines`): "scene: progress follows scroll with the stage pinned" | `{"progress":1,"top":0}` twice: stage pinned, progress wrong                                     |
| `main`, `fd3885c`            | 43810901141             | macOS (`check:browser:animations`): "reduced motion (live change)"                                   | "did not leave reduced state" 100 ms after `prefers-reduced-motion` went back to `no-preference` |
| `main`, `89665bf`            | 43813368226             | same                                                                                                 | same                                                                                             |

The macOS case passed in PR runs 43805520902, 43891329593 and 43936536735 under the same conditions
(Chrome 157, `systemPrefersReducedMotion: true`). **`main` stays red on that case until PR #6 is
merged**: these fixes are on the branch only.

### 1. ScrollScene: stale geometry (reproduced, fixed)

The prototype re-measured its geometry only when its own section, or the viewport, changed size. If
content above the scene moves it without resizing it, `top` stays stale: the stage remains pinned
(CSS sticky), but the progress is computed against the old position.

**Reproduced first**, locally in all three engines (lab built from `ceb71b6`): after measurement, a
spacer above the scene grows by 600 px, then the page scrolls to the scene's real 50 %:

| Engine       | Progress | Real (live layout) | Stage top |
| ------------ | -------- | ------------------ | --------- |
| Chromium 158 | 0.8447   | 0.5003             | 0         |
| Firefox 159  | 0.8444   | 0.5000             | 0         |
| WebKit 27.2  | 0.8441   | 0.4997             | 0         |

The CI failure has the same signature (pinned stage, progress too high). What moved the content on the
Linux WebKit runner is not identified, because the old check printed only progress and stage top.
Failure messages now include the cached and live geometry.

**Fix** (`apps/playground-vite/src/animations/scroll-scene.tsx`): the cache is invalidated by a
`ResizeObserver` on the section, on the document element and on every element preceding the section
in flow along its ancestor chain, by a `MutationObserver` on the ancestors' child lists (which
re-collects the observed elements), and by viewport resize. Every signal requests one coalesced
measurement in the scheduler's read phase, and scroll still never reads layout. All observers and
listeners are removed on unmount, and a pending measurement is cancelled. Known limit: a margin
change on a preceding element, or an ancestor padding change compensated elsewhere, resizes no
observed box and is not detected. The engine was not changed.

**Observing only `document.documentElement` is not enough**, and the tests show it. With only the
section and the document element observed, the compensated case (content above grows while content
below shrinks by the same amount, document height unchanged) **failed in Chromium and WebKit**: for
example progress 0.834 against a real 0.500 in Chromium. Firefox passed it.

**Regression tests** (`scripts/lib/animations-lab.mjs`, run by both `check:browser:animations` and
`check:animations:engines`). Each case first checks that its mutation really moves the scene by the
intended amount, without resizing the section. It then requires that the published progress, and
`--scene-progress`, equal the progress implied by the live layout (within 1e-3), that the scroll
reached its target, and that the stage stays pinned:

- content above grows (the document grows);
- compensated shift (the document height is unchanged);
- an element inserted above, then removed.

| Prototype                       | Result of the three cases                                                         |
| ------------------------------- | --------------------------------------------------------------------------------- |
| Original (`ceb71b6`)            | **fail in every engine (9 of 9)**, e.g. WebKit cached `top` 1272.6 vs live 1692.5 |
| Section + document element only | compensated case fails in Chromium and WebKit                                     |
| Fixed                           | pass in Chromium, Firefox, WebKit and the CDP Chrome lab                          |

### 2. Lab checks: conditions instead of fixed waits

Every fixed sleep followed by an assertion was replaced with a condition polled in the page. The
default ceiling is 5000 ms, and a condition returns as soon as it holds. On timeout the check fails
with the state that did not satisfy it. Tolerances were not widened; the scene's tolerance went from
±0.02 on the nominal progress to ±0.001 against the live layout.

- **Reduced motion** (CDP and Playwright): wait until Tilt3D is `reduced`, then until it is back at
  `rest` with the media query no longer matching. Diagnostics include `matchMedia().matches`.
- **ScrollScene** (both): progress consistent with the scroll position, scroll at its target, stage
  pinned. The same applies after a viewport resize and after the smooth scrub converges.
- **Directly related waits:** tilt pointer, return, composition and focus poses, unmount/remount,
  corner settling and lab readiness now use conditions.
- **Kept on purpose:** 16 ms input pacing between pointer moves, and three "must not happen yet"
  checks, which are now bounded by frame counts instead of milliseconds:
  - the return is not a snap (2 frames);
  - no transform while reduced (10 frames);
  - the smooth scrub lags (3 frames; the spring delta is clamped to 1/15 s per frame).

**Reduced-motion race: not reproduced locally.** Attempts that did not reproduce it:

- Chrome CPU throttling at 1×, 20× and 50× (10 rounds each: the state was `rest` at 100 ms every time);
- a main thread kept busy for 150 ms and 400 ms when the preference changed;
- the previous script under 6× and 20× throttling (passed).

The only evidence is the two CI logs. The fix waits for the observable condition. If the controller
never leaves the reduced state, the check still fails, now with the media-query state.

**Slow-execution runs (new scripts):** `check:browser:animations --cpu-throttle 6` and `--cpu-throttle
20` passed 23/23, and `check:animations:engines --engine chromium --cpu-throttle 6` passed. CPU
throttling slows the page's JavaScript, not frame production, so slow CI runners remain the real test.

### Local verification of the follow-up (Windows 11, same machine)

- `pnpm check`: pass (repository tests 107, 0 failures; package tests 286/286; `check:pack` 5 public
  - animations).
- `check:browser:animations`: **23/23** (20 + three geometry-invalidation cases).
- `check:animations:engines`: **14/14 in Chromium 158, Firefox 159 and WebKit 27.2** (11 + three
  geometry-invalidation cases). WebKit was then run three more times: pass each time.
- `check:animations:consumer`: pass. `check:animations:bundles`: pass, with unchanged sizes (core
  8.80, registry + host 4.69, Tilt3D 8.00 KiB).

## Not run / pending

| Check                       | Why                             |
| --------------------------- | ------------------------------- |
| Manual screen-reader review | Owner, before publication (Q4)  |
| Real Safari                 | Playwright WebKit is not Safari |
