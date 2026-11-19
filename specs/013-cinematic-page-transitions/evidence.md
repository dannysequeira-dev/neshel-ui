# Evidence — Phase 013 (Cinematic, Scenes & Page Transitions)

Local machine: Windows 11, Node 26.13.0, pnpm 12.16.1, Chrome 157 (CDP lab), Playwright 1.65.0 (Chromium
158.0.8127.18, Firefox 159.0, WebKit 27.2 — **Playwright's WebKit, not Safari**). Branch
`feature/013-cinematic-page-transitions` from `b7bfe14`. Status words: **verified locally**, **native
verified** / **fallback verified** (support matrix), **unverified**, **pending**. GitHub Actions results are
recorded in PR #13 for each exact head (a commit cannot contain its own CI result). `@neshel-ui/animations` stays private `0.0.0`; no version,
tag, publication or release change; the five public packages and the release workflow are untouched.

## 1 · Research probes

Same-document and cross-document View Transition capabilities, transition lifecycle (abort, duplicate
names, failing update) and Navigation API direction were probed in the three Playwright engines with two
scripts run from the repository root (results: [research.md](research.md) R1–R3). React 19.3.1 exports
`ViewTransition`/`addTransitionType`; Next 16.4.5 `Link`/`router.push` take `transitionTypes`; React Router
8.5.0's data router commits inside `React.startTransition` (read from the installed sources, R4).

## 2 · Inventory — the 20 entries (implemented and verified locally)

| Id   | API (subpath)                                                                        | Unit | CDP lab        | 3 engines    | Story   |
| ---- | ------------------------------------------------------------------------------------ | ---- | -------------- | ------------ | ------- |
| C01  | `createTimeline`, `useTimeline` (`./cinematic`)                                      | ✓    | ✓              | ✓            | ✓       |
| C02  | `createSceneChapters`, `<SceneChapters>`, `<Chapter>`, `<SceneSegment>`              | ✓    | ✓              | ✓            | ✓       |
| C03  | `createCamera`, `<CameraStage>`, `useCamera`                                         | ✓    | ✓ + real Tab   | ✓            | ✓       |
| C04  | `createCover` (split), `<SplitReveal>`                                               | ✓    | ✓              | ✓            | ✓       |
| C05  | `createCover` (curtain, shutter), `<CurtainReveal>`                                  | ✓    | ✓              | ✓            | ✓       |
| C06  | `titleSequence`, `<TitleSequence>`                                                   | ✓    | ✓              | ✓            | ✓       |
| C07  | `createSpotlight`, `<Spotlight>`                                                     | ✓    | ✓              | ✓            | ✓       |
| C08  | `createDepthOfField`, `<DepthOfField>`                                               | ✓    | ✓              | ✓            | ✓       |
| C09  | `createStoryboard`, `<Storyboard>`, `<StoryboardFrame>`                              | ✓    | ✓ + real hover | ✓ + taps     | ✓       |
| C10  | `createLetterbox`, `<Letterbox>`                                                     | ✓    | ✓              | ✓ + taps     | ✓       |
| PT01 | `startPageTransition({ effect: "fade" })`, `<PageTransition>` (`./page-transitions`) | ✓    | ✓              | ✓            | ✓       |
| PT02 | `registerSharedElement`, `<SharedElement>` (FLIP fallback)                           | ✓    | ✓              | ✓            | ✓       |
| PT03 | `effect: "slide"`                                                                    | ✓    | ✓              | ✓            | ✓       |
| PT04 | `trackNavigationDirection`, `useNavigationDirection`                                 | ✓    | ✓              | ✓            | ✓       |
| PT05 | `effect: "scale"`                                                                    | ✓    | ✓              | ✓            | ✓       |
| PT06 | `effect: "wipe"`                                                                     | ✓    | ✓              | ✓            | ✓       |
| PT07 | `createRouteProgress`, `<RouteProgress>`                                             | ✓    | ✓              | ✓            | ✓       |
| PT08 | `<PersistentElement>`, `registerSharedElement(…, { persist })`                       | ✓    | ✓              | ✓            | ✓       |
| PT09 | `page-transitions-mpa.css`, `enableCrossDocumentTransitions`                         | ✓    | —              | ✓ (§5)       | ✓ (doc) |
| PT10 | `useRouteTransition`; `./page-transitions/next`; `./page-transitions/react-router`   | ✓    | —              | routers (§6) | ✓       |

## 3 · Gates run locally (final state of the branch)

| Gate                                  | Result                                                                                                                                                                                        |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm check`                          | **pass** — lint (6 pre-existing warnings), typecheck, root tests 110 (109 pass, 1 pre-existing skip), package tests 588 pass (animations 384), build, exports, `check:pack --with animations` |
| `pnpm check:browser:animations` (CDP) | **125/125** — the 105 earlier cases plus 20 Phase 013 cases, axe included                                                                                                                     |
| `pnpm check:animations:engines`       | **140/140 in Chromium 158, Firefox 159 and WebKit 27.2** (incl. phone context with real taps)                                                                                                 |
| `pnpm check:animations:consumer`      | **28/28** — packed tarball, Vite, SSR, hydration without recoverable errors, Phase 013 components, a native View Transition started by React in Chrome                                        |
| `pnpm check:animations:routers`       | **35/35** — React Router 8.5.0 and Next.js 16.4.5 consumers from the tarball (§6)                                                                                                             |
| `pnpm check:animations:bundles`       | **pass** — every earlier budget unchanged and met; new entries within proposed budgets (§8)                                                                                                   |
| Storybook / Playground builds         | **pass**                                                                                                                                                                                      |
| Three-OS CI on the PR head            | first head `a07a8fc`: run 44412815373, 14/14 at attempt 1; final head: recorded in PR #13                                                                                                     |

## 4 · Browser results and native/fallback statuses

Support observed in the lab (`getViewTransitionSupport`, behavioural): Chromium and WebKit — same-document,
types, classes, cross-document, Navigation API: all **native verified**; Firefox — same-document, types,
classes, Navigation API **native verified**, cross-document **fallback verified** (plain navigation). The
page suite observes native transitions through `document.getAnimations()` on the snapshot pseudo-elements
(shared morph group `neshel-lab-photo`, page snapshots, `neshel-pt-slide-out-back` on back) and the fallback
path by removing `document.startViewTransition` (update at once, FLIP from the old box).

Known issue **K-3** (engine): Playwright WebKit 27.2 on Windows crashed its renderer ("Target crashed") in 1
of 3 full runs, reproduced as 1/6 when `prefers-reduced-motion` emulation was switched right after the
page-transition suite and 0/6 without that suite; a bisection (0/12) was inconclusive. The Phase 013
reduced-motion case therefore runs in a fresh page; the crash is not attributed to package logic (a page
script cannot legitimately crash the renderer) but is recorded, not hidden. Real Safari: **unverified**.

## 5 · Cross-document (PT09)

Real navigation `mpa-a.html → mpa-b.html` over HTTP in each engine: the navigation always completes; the
opt-in starts a cross-document transition on the outgoing page (`pageswap.viewTransition`) in Chromium and
WebKit; Firefox navigates plainly (no `pageswap`/`pagereveal`). Known issue **K-2**: in Playwright Chromium
158 the incoming page revealed the transition in only part of the runs when the documents load module
scripts (batches of 8: 0–8 revealed; the CSS-only opt-in and an empty module 8/8; WebKit 8/8 in every
batch). The cause is not identified; the lab asserts the deterministic facts and records the reveal outcome
(`notes.mpa.revealed`). Back traversals restored from the back/forward cache may not animate (R2).

## 6 · Router integration (PT10)

`check:animations:routers` (Chromium): **React Router 8.5.0** data router in a Vite app (17 checks) and
**Next.js 16.4.5** App Router (`next build` + `next start`, 18 checks): push commits and runs inside a native
View Transition (direction forward — attribute in React Router, transition type in Next, which writes history
after React commits); browser back restores the route, direction **back** from history indexes, no focus move
on traverse; forward traverse detected; a slow route shows the real pending state before the commit and
returns to idle; a failing loader (React Router) shows its error and never leaves the bar active;
`target=_blank` and modified clicks stay native and start no pending state; keyboard activation navigates;
rapid navigation ends on the last route with no names left; no page or hydration errors. Observed: browser
back/forward are **not animated** by either router (they commit without a React transition) — documented in
router-adapters.md. Found and fixed: Next follows a traverse with a same-URL `replaceState`, which overwrote
the direction; the tracker now ignores same-URL replaces. Firefox/WebKit router runs: **unverified** (the
router check runs in Chromium; the engines lab covers the page-transition behaviour itself).

## 7 · Accessibility and reduced motion

axe: no violations on the lab page (CDP) and the effects gallery (engines). Reduced motion live (CDP and the
three engines): instant page effects start **no** View Transition, slide/scale become a short fade (CSS),
depth of field never blurs, the storyboard never autoplays and refuses Play, covers never cover content,
camera and spotlight move without animation, timelines finish at once with their calls fired once. C09: the
rotation control is first, Pause is sticky, hover/focus pause the rotation (real pointer case), the live
region is `off` while rotating and `polite` otherwise. SSR: every component renders visible content; package
layers are `hidden`/`aria-hidden`. Focus after route commits only to `[data-neshel-route-focus]`, never
during a transition, never on traverse. **Pending owner checks**: NVDA/VoiceOver passes of the storyboard and
the router demos, real Safari, real mobile devices.

## 8 · Bundle sizes (packed tarball, gzip) and budget decisions

Owner decisions (review of PR #13, 2026-11-18): the 15 new Phase 013 budgets are approved as declared; the
earlier budgets stay fixed except `entrance: fadeIn definition (no React)` **6656 → 6912 B** for the
scrubbable Entrance `progress` option. Measured after the change: `fadeIn` definition **6.57 KiB (6728 B)
/ 6.75**, `Reveal + fadeUp` 12.05/12.25, Entrance entire 13.97/14.25 (both unchanged budgets, met).

New entries (measured / approved budget, KiB): `createTimeline` 11.57/11.75 · `useTimeline` 11.83/12.00 ·
SceneChapters 15.05/15.25 · CameraStage 8.89/9.25 · Storyboard 9.36/14.00 (after the change below) · cinematic
entire 24.27/25.00 · `startPageTransition` 8.04/8.50 · PageTransition + SharedElement 2.69/2.90 ·
RouteProgress 3.21/3.40 · page-transitions entire 12.43/13.00 · Next adapter 4.57/4.80 · React Router adapter
4.26/4.50 · `cinematic.css` 1.65/1.75 · `page-transitions.css` 1.72/1.80 · `page-transitions-mpa.css`
1.86/1.95 (final values: §13). Tree-shaking markers unchanged.

## 9 · Performance

Stress (lab, 4 overlapping timelines × 24 tracks): one scheduler task per running timeline (2–4 observed,
≤ 4 + host), **0 layout reads** by timelines, idle at rest, styles restored after destroy. Frame deltas
during the run: Chromium mean 16.6 ms / p95 18.1 ms; Firefox 6.9 / 9.0 ms; WebKit 18.3 / 32 ms (headless,
one run each — indicative only). Unit: zero React commits during timeline and cinematic playback (Profiler),
zero tasks at rest, one geometry read per camera/spotlight move (counted), none per frame. No compositor
claim is made.

## 10 · Composition and restoration

Fifteen rows of [composition-matrix-013.md](contracts/composition-matrix-013.md) in
`test/composition-013.test.mjs` (pass). Found and fixed by the matrix and the lab: resumed (previously
suspended) filter and View Transition name claims now re-apply their values; the storyboard track clips
sideways slides; the camera stage no longer widens grid parents; spotlight and cover panels are clipped by
package layers so consumer content is never clipped; the React path of `usePageTransition` no longer leaves
`data-neshel-pt-effect`; the controller never rejects the browser's update callback (Firefox logged it).

## 11 · Issue #9 and #11

#11 stays closed. #9 remains open under observation; nothing in this branch changes Press or ContentSwap.
The CDP lab ran the earlier 105 cases (ContentSwap included) green in every local run of this phase.
Closing #9 still requires three distinct first-attempt clean runs on `main` (incl. Windows/Node 26); the
PR's CI runs are on the feature branch and do not count.

## 12 · Known limitations

K-1 (closed) Entrance is scrubbable since the owner-approved budget (§8, §13). K-2 Chromium cross-document
reveal (§5). K-3 Playwright WebKit renderer crash (§4). K-4 Router back/forward are not animated by Next
16.4.5 or React Router 8.5.0. K-5 React < 19.3 has no `ViewTransition`: boundaries render plain children.
K-6 C02 segments are hidden at their start pose until the scroll source reaches them (visible without JS
and under reduced motion). K-7 Router runs in Chromium only; real Safari, devices and screen readers pending.

## 13 · Owner review of PR #13 (comment 6994532003) — regression-first results

Each case was written as a test first and run against the unmodified head `a07a8fc` (built `dist`), then
fixed minimally and rerun.

| Case                                                            | Test                       | Before (a07a8fc)                                                                                               | Fix                                                                                                    | After                                                    |
| --------------------------------------------------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------- |
| A1 reverse while an awaited call is pending                     | `test/review-013.test.mjs` | **fail** — state `running`, time 100: clock never restarted                                                    | `reverse()` restarts the clock when still running                                                      | pass; stale resolution ignored                           |
| A2 seek while an awaited call is pending                        | same                       | **fail** — state `running`, time 300                                                                           | `seekTo()` restarts the clock when running and not waiting                                             | pass; stale rejection ignored                            |
| B triggered Entrance at t = 0 with the scheduler already active | same                       | **fail** — opacity 1 (shown at the end state, no animation)                                                    | a first render already past the start animates when playing                                            | pass; scrub mode covered too (`timeline-scrub.test.mjs`) |
| C1 pre-existing `data-neshel-pt-direction`                      | same                       | **fail** — left at `forward`                                                                                   | restore the saved value when the attribute still holds the transition's value                          | pass                                                     |
| C2 live tracker changes the direction during a transition       | same                       | pass — **refuted** (the tracker's value was already kept)                                                      | —                                                                                                      | pass                                                     |
| D route progress without commit (unit)                          | same                       | **fail** — no watchdog report, no restart for a new navigation                                                 | `onTimeout` option, `navigation` identity restarts the indicator                                       | pass                                                     |
| D Next adapter, superseded navigation (real Next 16.4.5)        | `check:animations:routers` | **fail** — stayed `pending` 1.6 s after the slow route's time; the next navigation showed no own pending state | a link to the current location clears pending; the watchdog clears it; each navigation has an identity | pass                                                     |
| D React Router 8.5.0 (same scenario)                            | same                       | pass — **refuted** for React Router (its navigation state settles)                                             | —                                                                                                      | pass                                                     |

Scrubbable Entrance (decision 3): `test/timeline-scrub.test.mjs` — progress 0 / intermediate / 1, seek both
ways, no own clock, play/pause/reverse mid-way/seek while running, t = 0 with an active scheduler, live
reduced motion (`fade` / `instant`, switching back restores the pose), composition with Hover lift, Press
scale and Scroll parallax on one element with exact restoration, E11 spring span, explicit `trigger` mode,
invalid inputs. Package tests after the review: 396/396 (animations).

CI on `addd74c` (run 44425908497, attempt 1): 13/14 — `macos-latest / Node 26` failed `check:animations:bundles`:
`cinematic: Storyboard` 14363 B > 14336 B. macOS builds measured larger than Windows in every entry
(e.g. `fadeIn` minified 21718 vs 21028 B; the cause of the platform difference was not investigated). The
approved budget was not raised: the storyboard frame change now uses one 009 tween (`animateValue`) and two pose
writers instead of a whole timeline (same behaviour; unit, CDP and engine cases pass), so Storyboard measures
9.36 KiB. No rerun was used to obtain green.

CI on `c06d711` (run 44465339193, attempt 1): 13/14 — `browsers / macos-latest` failed the new review-D case
“React Router: the next navigation shows its own pending state”, which waited at most 700 ms for the pending
state. Measured locally with diagnostics: React Router showed it 465 ms after the click (Next: 19 ms); the cause
of that latency was not investigated. The case now requires the pending state to appear before the slow route
(900 ms) commits, with a 3 s ceiling, and reports the observed states and timing. No rerun was used.

Final local gates (head after this section's commit): see the PR comment for the exact numbers and CI run.
K-2 and K-3 remain documented as observed, without attributed causes. #9 stays open: feature-branch runs do
not count toward its three clean first-pass runs on `main` (only 44334734060 counted so far).
