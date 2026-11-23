# Evidence — Phase 016 (Advanced 3D & Distortion)

Local machine: Windows 11, Node 26.13.0, pnpm 12.16.1; Playwright Chromium 158.0.8127.18, Firefox 159.0, WebKit 27.2
(Playwright WebKit, not Safari); headless Chrome for the CDP check. Headless WebGL: SwiftShader in Chromium, an ANGLE
renderer in Firefox, a masked renderer in WebKit — **no physical-GPU, Safari, VoiceOver or device result is claimed**.

## 1. State recovery

- Base `origin/main` = `da79b4a` (PR #16 squash). Post-merge CI run **45079243865**: attempt 1 failed only in
  `browsers / macos-latest` — Components `nested-overlays-escape-order` timed out with both dialogs closed (the
  documented ~50 ms nested-layer registration limitation on a loaded runner; Phase 015 changed no Components file or
  that check); the failed job was re-run: **attempt 2 success, 14/14**.
- Branch `feature/016-advanced-3d-distortion` from `origin/main` (upstream unset). CLAUDE.md and the roadmap record
  Phase 015 merged and Phase 016 current.

## 2. Status of D01–D11

| Id  | Status      | Main behaviour verified in real engines (CDP Chrome + Playwright Chromium/Firefox/WebKit)                                                                                                                                                                                                         |
| --- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D01 | implemented | `preserve-3d` + `backface-visibility` computed; hidden face inert; in-face toggle (click, real Space in CDP, real Enter in Playwright) flips; focus lands on the visible face; interruption without a jump                                                                                        |
| D02 | implemented | two 3D faces mid-transition, faces inside the panel box, one interactive panel, focus moved to the incoming panel                                                                                                                                                                                 |
| D03 | implemented | only the front item non-inert; real arrow/Home keys; live region "Slide n of N"; shortest-path retarget; front item not smaller than back items                                                                                                                                                   |
| D04 | implemented | **real mesh deformation** (WebGL2 pixel probes: the start corner becomes transparent while the far corner stays painted); native image covered only after the draw; page underneath exposed only after the turn; CSS driver = rigid turn of live HTML (separate case)                             |
| D05 | implemented | real mouse: corner under the pointer folds, corner switch through flat, return on leave; continuous crease (base and flap polygons share the crease within 1 px); recede direction; inert ID-free flap; live link focusable while folded; CornerRecede vs Tilt3D (fold never transforms the card) |
| D06 | implemented | pixels displaced under waves (probes), clock stops after dissipation                                                                                                                                                                                                                              |
| D07 | implemented | two decorative layers per burst, ≤ 3 slice changes/s measured, text once, layers removed                                                                                                                                                                                                          |
| D08 | implemented | displaced pixels proportional to the amount (probes)                                                                                                                                                                                                                                              |
| D09 | implemented | decorative clipped layer, loop running while visible, never hit-tested                                                                                                                                                                                                                            |
| D10 | implemented | pose moves near pixels against far ones from the explicit depth map (probes); image semantics kept                                                                                                                                                                                                |
| D11 | implemented | `backdrop-filter` bands in all three engines (`mode: "backdrop"`), masks follow the focus, content receives events                                                                                                                                                                                |

Fallback rows (separate, never counted as the main effect): no WebGL2 and a failed shader keep the native image
(simulated with `configureGpu({ simulate })`); context loss shows the image and restore draws again.

## 3. GPU architecture and decision

ADR [0031](../../docs/decisions/0031-advanced-3d-and-optional-webgl2-surfaces.md) (**Proposed**): WebGL2 through a
minimal own layer in the optional `./gpu` entry; no graphics dependency; ADR 0030 unchanged. Research R2 (spike
`pnpm bench:animations:spike-016`, `data/spike-016-local.json`) and R19 (post-implementation).

## 4. Driver comparison (summary of research R2)

WebGL2 available in all three engines; WebGPU unavailable in all three headless engines; live-context ceiling 16 in
Chromium and WebKit (24 kept in Firefox). JS submission ≤ 0.15 ms/frame for meshes up to 128×96 and the three fragment
shaders (≤ 0.4 ms at 4× CPU); a Canvas 2D one-axis curl costs 3.6–5.5 ms/frame in Firefox; CSS cannot deform. Library
sizes (min+gz, minimal imports): OGL 14.02, twgl 21.50, regl 27.94, Three 129.63, Pixi 233.00 KiB.

## 5. APIs and subpaths

`./advanced` (+ `advanced.css`): `createCardFlip`/`CardFlip`, `createCubeRotate`/`CubeRotate`,
`createRingCarousel`/`RingCarousel`, `createCornerRecede`/`CornerRecede`, `createGlitch`/`Glitch`,
`createPerspectiveGrid`/`PerspectiveGrid`, `createTiltShift`/`TiltShift`, `getAdvancedDebugInfo`.
`./gpu` (+ `gpu.css`): `configureGpu`, `getGpuSupport`, `getGpuDebugInfo`, `createPageCurl`/`PageCurl`,
`createRipple`/`Ripple`, `createDisplacementHover`/`DisplacementHover`, `createDepthParallax`/`DepthParallax`.
`./core` public exports unchanged (new internals: `geometry-3d`, `attributes`, `visibility-gate`); `host.ts` change:
structural 3D channels are no longer listed in `will-change`. Contracts: [advanced-api.md](contracts/advanced-api.md),
[gpu-api.md](contracts/gpu-api.md) (with implementation notes).

## 6. Compatibility and fallbacks

[support-matrix-016.md](contracts/support-matrix-016.md). Observed: `preserve-3d`, `backface-visibility`,
`backdrop-filter`, `mask-image` and WebGL2 available in Playwright Chromium, Firefox and WebKit and in headless Chrome.

## 7. Geometry and deformation tests

Unit (`test/advanced.test.mjs`): orbit layer equals `translateZ(−d) rotate translateZ(d)` on both axes; ring radius,
relative angles, shortest-path targets; hinged-fold polygons per corner, 0.75 px crease overlap, recede/lift depth
sign for all four corners; cylinder curl continuous at both seams and flipped on top after the half turn; cube orbit
scaled by `1/(sin θ + cos θ)`. Browser: crease continuity, mesh pixels, face boxes.

## 8–9. Accessibility, focus, keyboard and reduced motion

[accessibility-016.md](contracts/accessibility-016.md). Verified: hidden faces/panels/items `inert` + `aria-hidden`;
focus moved out of content that turns away; carousel semantics and live region; flap and glitch layers inert, ID-free,
unselectable; canvases `aria-hidden` + `role="presentation"`; axe without violations on the whole lab page (Chrome).
Reduced motion live (CDP emulation and a fresh Playwright page per engine): flip `fade`, no glitch layers, floor
`reduced` and paused, ripple off with the image shown, depth parallax static, page curl instant.

## 10. Performance and GPU resources

`pnpm bench:animations:advanced` (`data/bench-advanced-local.json`, `data/bench-advanced-chromium-4x-local.json`;
observations, never gates). GPU entries keep the baseline frame interval in all three engines and at 4× CPU in
Chromium, including six surfaces at once (one long task at creation at 4× CPU). CSS costs: moving the D11 focus with
four bands 20.4/27.8 ms (Firefox), 23.0/31 ms (WebKit), 21.6/33.4 ms (Chromium 4×); two D09 floors 11.8/13.9 ms in
Firefox (baseline 7). Context restore 14–29 ms. Off-screen: one initial draw, then none. Mount/unmount × 20: resources
return to the gallery's own; WebKit dropped one context (recovered on the next request — K-11).

## 11. Integration with Timeline, Gestures and Scroll

Composition matrix 14/14 (`test/composition-016.test.mjs`): CardFlip and PageCurl on C01 timeline tracks (exact
angles/progress, no own clock), CardFlip/CubeRotate driven by progress sources (ScrollProgress-compatible), the ring's
drag on the 012 pointer session, CornerRecede with Tilt3D/Hover/Press and an external `clip-path`, one GPU draw task
for several surfaces, mid-animation destroy, StrictMode.

## 12. Visual evidence

The Playground gallery (`apps/playground-vite`, section "Advanced 3D & distortion (Phase 016)") and Storybook stories
are the visual record; browser checks assert the visual facts through computed styles, polygons and WebGL pixel probes
(no screenshot baselines were added).

## 13. Storybook and Playground

Storybook: `Animations (experimental)/Advanced 3D (CSS)` (7 stories) and `Distortion (GPU, optional)` (5 stories);
`pnpm build:storybook` passes. Playground: gallery + suite + bench; `pnpm build:playground` passes.

## 14. Bundle budgets (measured and PROPOSED)

From the packed tarball (`data/bundles-016.json`), budget = measured × 1.1 rounded up to 64 B, **proposed for owner
review**; no earlier budget changed:

| Entry                                                             | gzip                    | proposed                |
| ----------------------------------------------------------------- | ----------------------- | ----------------------- |
| css: advanced.css / gpu.css                                       | 1083 / 445 B            | 1216 / 512 B            |
| advanced: createCardFlip / createCubeRotate / createRingCarousel  | 7873 / 9845 / 9753 B    | 8704 / 10880 / 10752 B  |
| advanced: createCornerRecede / createGlitch / grid + tilt-shift   | 9549 / 4928 / 5910 B    | 10560 / 5440 / 6528 B   |
| advanced: CardFlip + CornerRecede / entire entry                  | 12126 / 22790 B         | 13376 / 25088 B         |
| gpu: configureGpu + getGpuSupport                                 | 2455 B                  | 2752 B                  |
| gpu: createRipple / createDisplacementHover / createDepthParallax | 12708 / 13231 / 13146 B | 14016 / 14592 / 14464 B |
| gpu: createPageCurl / PageCurl + Ripple / entire entry            | 16323 / 19257 / 22963 B | 17984 / 21184 / 25280 B |

Tree-shaking markers: no `./advanced` bundle contains WebGL or GPU code; no `./gpu` bundle contains the CSS family;
neither bundles an earlier family.

## 15. SSR and hydration

Plain-Node import of `./advanced` and `./gpu` (contract test); SSR markup tests (no engine output on the server);
packed consumer: SSR renders static content only and hydration works (flip, ring semantics, floor, overlay, GPU canvas
over a kept image) without page errors.

## 16. External consumers

`pnpm check:animations:consumer` passed (35 checks, packed tarball, Vite build, SSR, hydration, interaction);
`pnpm check:animations:routers` passed (React Router 8.5.0, Next.js 16.4.5).

## 17. Quality gates (local)

| Gate                                                                                                     | Result                                                                                                    |
| -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `pnpm check` (doctor, lint, typecheck, root tests, build, package tests, exports, pack incl. animations) | pass — 801 package tests (animations **597** = 544 earlier + 53 new), root 109 pass + 1 pre-existing skip |
| `pnpm check:browser:animations` (CDP)                                                                    | **196/196** (175 earlier + 21 new)                                                                        |
| `pnpm check:animations:engines`                                                                          | **204** per engine in Chromium, Firefox and WebKit (183 earlier + 21 new)                                 |
| `pnpm check:animations:bundles`                                                                          | pass (earlier budgets unchanged; new ones proposed)                                                       |
| consumer, routers, Storybook build, Playground build                                                     | pass                                                                                                      |
| Three-OS CI                                                                                              | see §19                                                                                                   |

## 18. Regressions and defects fixed

1. Seek fallback timer (§17 of the brief): not stored, outlived destroy, and a stale timer could settle a later cycle —
   tests first (2/3 failing), fixed (`961ad72`).
2. Map/depth URL validation rejected long `data:` URLs (broke the lab) — scheme allowlist + test.
3. Cube: a late settlement promise could close a newer transition — settlement bound to its transition.
4. Cube: incoming panel still `visibility: hidden` when taking focus; faces projected up to √2 outside the box — fixed.
5. Ring: `role="group"` on `<article>` (axe) — generic elements only.
6. PageCurl did not request its GPU page after reduced motion ended — fixed.
7. `drawNow()` refused to draw before the first visibility observation — explicit draws are forced.
8. Controlled `CardFlip` could undo a newer toggle (WebKit) — intent reporting (`onToggle`, `target`) + regression test.
9. Contexts dropped by the browser were never replaced (WebKit churn) — recreated on the next request after 1 s + test.

## 19. Known limitations

- K-2, K-3 (Phase 013), K-5 (Phase 014) and K-6–K-9 (Phase 015) unchanged.
- **K-10** Moving the D11 focus with four bands and running two D09 floors are the expensive cases (§10); static
  tilt-shift and one floor stay near the baseline. Prefer `bands: 1` for an animated focus.
- **K-11** Playwright WebKit dropped one WebGL context during a 20× mount/unmount churn; the manager replaces it on the
  next request (the effect shows the native image meanwhile). Real Safari unverified.
- **K-12** All GPU figures are headless (software or masked renderers); physical GPUs, mobile GPUs and real context
  loss (driver reset) are manual checks.
- **K-13** D05 `flap: "clone"` copies content: styles that depend on ancestry (`.root > .surface`), media pixels
  (video/canvas become placeholders) and shadow DOM state are not reproduced — use `flap: "plain"`.
- **K-14** Consumer CSS that flattens 3D (`overflow: hidden`, `opacity < 1`, filters on the ring root) breaks D03 depth
  sorting; the z-index backup keeps the front item on top.
- **K-15** Main CI flake: Components `nested-overlays-escape-order` (pre-existing limitation, attempt 2 green; not
  touched by this phase).
- Manual checks pending: [manual-checks.md](manual-checks.md).

## 20. Three-OS CI and PR

PR [#17](https://github.com/dannysequeira-dev/neshel-ui/pull/17) (not merged; owner review).

| Run             | Head      | Result            | Notes                                                                                                                                                                                     |
| --------------- | --------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 45094936303     | `df80046` | failure (12/14)   | only the GPU rows, where WebGL2 was unavailable: headless Chrome on macOS (CDP) and Playwright Firefox on Ubuntu                                                                          |
| 45097063452     | `5b83d1b` | failure (13/14)   | CDP opts in to SwiftShader (`launchBrowser({ webgl: true })`): macOS green; Firefox on Ubuntu still without WebGL2                                                                        |
| 45101418861     | `72797db` | failure (12/14)   | Mesa software GL on Linux had no effect on headless Firefox (reverted); macOS failed only on the known Components nested-overlay flake (K-15)                                             |
| **45104021295** | `76edc2f` | **success 14/14** | CDP 196/196 on Windows, macOS, Ubuntu (Node 22, 24, 26 jobs); Playwright Chromium/Firefox/WebKit on macOS and Ubuntu; the 6 GPU rows of Firefox on Ubuntu are reported **SKIPPED** (K-16) |

Where the GPU main rows actually ran and passed: CDP Chrome (SwiftShader) on Windows, macOS and Ubuntu; Playwright
Chromium and WebKit on Ubuntu; Playwright Chromium, Firefox and WebKit on macOS (CI) and on Windows (local).

- **K-16** Playwright Firefox on GPU-less Linux runners exposes no WebGL2 (forced WebGL and Mesa did not help). Only
  there, GPU rows report `SKIPPED (no WebGL2 on this runner)` — never a pass; everywhere else a missing WebGL2 fails.
