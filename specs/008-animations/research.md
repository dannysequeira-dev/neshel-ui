# Research — feature 008 (008.0)

Decisions R1–R14 for the animation system. Each records the question, the options, the decision
and how it was (or will be) verified. "Observed" means measured in this repository on the machine
named in [evidence.md](evidence.md); "reported" means public documentation that this repository has
not verified and must re-check at adoption time.

## R0 — Constraints found in the repository

| Constraint (source)                                                                  | Consequence for animations                                                                                     |
| ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| `core` is private; no public package may depend on it (ADR 0002, `check:pack`)       | The motion engine lives inside `@neshel-ui/animations` (`./core` subpath), not in `@neshel-ui/core`.           |
| ESM only, NodeNext, `.js` extensions, types first, packed-artifact checks (ADR 0004) | Same build (`tsc` + `copy-css`) and the same tarball validators; added `check:pack --with animations`.         |
| CSS distributed precompiled in `@layer components.neshel`, no resets (ADR 0008)      | `./styles.css` with `.neshel-*` selectors only; effects work without it.                                       |
| No dynamically concatenated Tailwind classes (CLAUDE.md, constitution III)           | Presets ship as precompiled classes/keyframes and CSS custom properties, never generated utility names.        |
| `asChild` via Radix Slot, React 19 ref-as-prop, closed `as` lists (ADR 0009)         | Tilt3D supports `asChild`; `@radix-ui/react-slot` is the only runtime dependency, as in layout/typography.     |
| No provider for basic theming; `data-neshel-theme` (ADR 0006)                        | No `<MotionProvider>` required; global motion policy via the reduced-motion preference and per-effect options. |
| Interactive modules carry `"use client"`; presentational ones are server-safe (005)  | Every React module of the package is `"use client"`; `./core` has no directive and no React import.            |
| Reduced motion already honoured by components CSS (feature 005)                      | Same rule for every effect, plus a JS policy (`user` / `always` / `never`).                                    |
| Fixed Changesets group of five; release guards list five packages (ADR 0017)         | `animations` stays private (`privatePackages.version: false`); no change to `.changeset/config.json`.          |
| Three-OS CI, Chrome deep suites, three-engine smoke flows (ADR 0003, 0016)           | Browser checks use the existing CDP client; Firefox/WebKit verification of animations is pending (009).        |
| Vision: "animation framework" was explicitly _not MVP_ (docs/vision.md)              | 0.1.0 is unaffected; animations is a new, separately gated package (ADR 0018).                                 |

## R1 — Build a motion engine or adopt one?

Options considered (facts are _reported_, not verified here):

- **Motion** (`motion`, formerly Framer Motion; MIT). Hybrid engine (WAAPI where possible, JS
  otherwise), springs, layout/FLIP, gestures, scroll, React bindings. Mature; React API centred on
  `motion.*` components and a provider-free mini `animate`.
- **GSAP** (free for commercial use since 2025 under its own "standard" licence, not OSI open
  source; restrictions on competing visual-builder products). Excellent timelines and ScrollTrigger.
- **anime.js v4** (MIT). Modular timelines, springs, scroll observer, draggable.
- **Lenis** (MIT). Smooth scrolling only (scroll-jacking concerns, see R8).
- **Three.js / OGL** (MIT). WebGL rendering for the graphics driver only.
- **Native platform**: CSS transitions/keyframes, individual transform properties, `@property`,
  `linear()` easing, Web Animations API, scroll-driven animations, View Transitions.

Decision (ADR 0020): **build a small own core** (scheduler, springs, composer, policy) and lean on
the platform first. Reasons: (1) the library must compose effects from many families on one
element with predictable ownership (R5) — third-party engines each own `transform` their own way;
(2) bundle cost must scale with use (a Tilt3D-only bundle is 5.9 KiB gzip including the Slot,
observed, [evidence](evidence.md)); (3) SSR/RSC rules and the reduced-motion policy must be
uniform; (4) GSAP's licence is incompatible with making it a dependency of an MIT design system.
Adoption of a third-party engine for a _specific_ capability (e.g. layout projection, gestures)
stays open but requires the R13 comparative benchmark, an MIT/Apache licence and an ADR.

## R2 — Platform capabilities and browser support

Observed on Chrome 157 (this machine): `CSS.supports("animation-timeline: view()")` true,
`document.startViewTransition` present, WebGL available in headless mode. Reported (MDN/caniuse,
to re-verify in 009 with the three-engine harness of ADR 0016): individual transform properties,
`@property`, `linear()` easing and the Web Animations API are available in all current engines;
same-document View Transitions are available in current Chromium, Safari and Firefox releases;
CSS scroll-driven animations are available in Chromium and recent Safari, and Firefox support must
be checked before relying on it. Rule: every SDA/VT effect has a JS or non-animated fallback, and
claims of support are recorded per engine only after a browser check runs (constitution VI).

## R3 — Drivers and the driver ladder

Drivers in order of preference: **CSS** (declarative, off-main-thread for `transform`/`opacity`,
SSR-friendly) → **WAAPI** (programmatic control: pause, reverse, finish promises; still compositor
friendly) → **JS** (core scheduler; needed for pointer/physics/scroll-velocity input) → **GPU**
(canvas/WebGL; only in an optional entry). An effect uses the cheapest driver that renders it
correctly and declares it in the catalogue. Interruption and reversal: CSS transitions reverse
naturally; WAAPI via `reverse()`/`cancel()`; JS via springs that retarget with current velocity
(implemented: Tilt3D retargets mid-flight without snapping, unit- and browser-tested).

## R4 — Springs in CSS

A spring with known parameters can be sampled into a CSS `linear()` easing with a matching duration,
so declarative entrances (E11) keep spring character with zero JS. Planned as `springEasing()` in
009 (core); not implemented in 008.0 to keep the slice minimal. Retargeting a running CSS spring is
not possible; interruptible springs stay in the JS driver.

## R5 — Composition: who owns `transform`?

Problem: hover lift + tilt + scroll parallax on one element all want `transform`; the last writer
wins. Options: (a) every effect writes `transform` (conflicts); (b) per-effect CSS variables summed in
one stylesheet `transform` (closed set, grows with every effect, inherited custom properties
invalidate the whole subtree); (c) a per-element JS composer for JS effects plus CSS individual
properties (`translate`, `rotate`, `scale`) for CSS effects, which the browser applies before
`transform` by specification.

Decision (ADR 0019): **(c)**. Implemented: `getTransformComposer(element)` (one per element, held
weakly) collects layers, sums translations/rotations, multiplies scales, picks the strongest
perspective, and writes one `transform` per frame in the write phase; inline `transform` and
`will-change` are removed when no layer remains. Verified: composition unit tests and the browser
case "CSS translate lift + JS transform tilt on one element". Known limit: per-axis rotation sums are
exact for one rotating layer, approximate for several (3D rotations do not commute) — documented.

## R6 — Tilt3D design (experiment A)

- No React state: pointer events record a target; one frame task advances three springs; the
  composer writes `transform`. Verified: zero React commits across 50 pointer moves (jsdom Profiler)
  and across a real pointer path in Chrome.
- Measurement: the untransformed size (`offsetWidth/offsetHeight`) and the bounding-box centre,
  measured once per hover and again only after scroll/resize, so the tilt never feeds back into the
  measurement.
- **Hit area (found by the browser check)**: with the default "press away" direction the region under
  the pointer recedes, the projected shape moves away from the pointer and Chrome fires
  `pointerleave` although the pointer is still over the card's layout box — the classic enter/leave
  oscillation of tilt effects. The first browser run failed exactly there. Fix: the hit area is the
  untransformed box; while hovering, the controller follows `pointermove` on `window` until the
  pointer leaves that box (window listeners exist only during hover). No wrapper element needed, so
  `asChild` keeps a single-element model. Regression tests: jsdom "hit area" test and the browser
  "top-right corner" case.
- Touch is opt-in (a finger moving over a card usually means scrolling).
- Keyboard: the effect never handles keys; `:focus-visible` inside the element shows a gentle fixed
  pose (35 % of `maxTilt`) so keyboard users get an equivalent affordance; focus outlines are never
  removed.
- Reduced motion: `"user"` (default) follows the media query live; `"always"`/`"never"` override.
  With reduced motion the element stays flat and no frame is scheduled.
- Default direction "press away" (the pointed region recedes) with `reverse` for "toward".

## R7 — CornerRecede techniques (experiment B)

All four techniques are implemented in the lab and driven by the same amount (core spring or the
range input). Screenshots: [visual-verification/](visual-verification/README.md).

| Technique       | Geometry                                                               | DOM cost                                | Content                              | Visual result (observed)                                  | Limits                                                                                           |
| --------------- | ---------------------------------------------------------------------- | --------------------------------------- | ------------------------------------ | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 1 · Rigid plane | `rotate3d(4,3,0,θ)` about the bottom-left corner — one rigid rotation  | 1 node, compositor only                 | Live, accessible, focusable          | Corner recedes, but the whole card tilts                  | No deformation at all; the far edges move too                                                    |
| 2 · Hinged fold | Base clipped without the corner + flap rotated about a straight crease | 2 copies (flap `aria-hidden` + `inert`) | Live in the base; flap is a copy     | Convincing paper fold; exact for paper (piecewise planar) | Straight crease only; duplicate content; hairline seam at rest fixed by collapsing the fold to 0 |
| 3 · Segmented   | 8×8 tiles pushed back by a static depth field                          | 64 layers                               | Decorative background only           | Stepped approximation of a curve; visible joints          | N² copies for live content; joints/cracks; no smooth surface                                     |
| 4 · WebGL mesh  | 32×24 subdivided plane, per-vertex displacement in a vertex shader     | 1 canvas + GPU context                  | Raster texture only (not accessible) | Smooth, real curvature                                    | Live DOM cannot be a texture; needs an accessible DOM equivalent; context limits                 |

Conclusion: only technique 4 deforms geometry, and only pixels. Techniques 1–3 are rigid planes and
must never be described as deformation. Recommendation for the D05 effect: hinged fold (2) for live
content, WebGL mesh (4) for images in the optional graphics entry (015); segmented (3) rejected.

## R8 — ScrollScene design (experiment C)

- **Pinning**: `position: sticky` stage inside a tall section — no JS pin spacer, no layout jumps,
  works with SSR and without JS. Verified: stage top stays at 0 px during the scene.
- **Progress**: computed from cached geometry (`top`, `distance = sectionHeight − viewportHeight`)
  and `scrollY` once per frame in the update phase; **no layout read per scroll event**. Re-measured
  in the read phase by a `ResizeObserver` and on viewport resize. Verified: progress matches scroll
  within 0.02 before and after a viewport resize.
- **Output**: one `--scene-progress` custom property per frame; layers and timeline segments derive
  in CSS (`translateY`, `scale`, `opacity` with `min()/max()` segments). Trade-off: an inherited
  custom property restyles the stage subtree each frame — fine for a small scene; large scenes should
  write per-layer transforms (planned option in 010).
- **Scrub**: direct (progress = scroll) or smoothed by a spring that lags then converges. Verified
  in the browser. Smooth scrub is disabled under reduced motion.
- **Timelines**: segments are pure functions of progress (fade in 0–0.3, hold, fade out 0.7–1), so
  scrubbing backwards is exact. A sequencer with labels/overlaps is the C01 primitive (012).
- **Native SDA**: `animation-timeline: view()` demo under `@supports` and
  `prefers-reduced-motion: no-preference`; content stays visible when unsupported.
- **Rejected**: scroll-jacking/smooth-scroll libraries by default (they replace native scrolling,
  break expectations of keyboard/assistive users and fight the browser); possible as an opt-in
  adapter later.

## R9 — API levels

| Level         | Shape                                                                    | 008.0 status                         |
| ------------- | ------------------------------------------------------------------------ | ------------------------------------ |
| Declarative   | `<Tilt3D maxTilt={10}>…</Tilt3D>`, `asChild`; presets by name (009)      | Tilt3D implemented                   |
| Compositional | Several effects on one element through the composer and channel metadata | Composer implemented; registry 009   |
| Programmatic  | `useTilt3D(ref, options)`, `createTilt3D(element)` controller; `./core`  | Implemented for Tilt3D; core exposed |

## R10 — Entry points

Evaluated the proposed `.`, `/hover`, `/scroll`, `/core`, `/cinematic`, `/boot`. Criterion (same as
feature 005 research R2): a subpath must buy something tree-shaking cannot — a different runtime
(framework-free, inline script), an optional heavy capability, or an isolation boundary. Decision
for 008.0: implement `.` and `./core` (+ `./styles.css`). Proposal for later phases (contracts/
entry-points.md): keep families in `.` (tree-shaken, budgets enforced by bundle checks), add
`./gpu` (015, WebGL) and possibly `./boot` (tiny inline script for pre-hydration entrance states);
`/hover`, `/scroll`, `/cinematic` are not justified unless bundle checks show leakage. Pending
owner decision D3.

## R11 — SSR, RSC and hydration

Server markup never depends on motion state: Tilt3D renders the element with one class; state
attributes and styles appear only after mount. No module reads `window`, `document` or
`matchMedia` at import time (tested by importing in plain Node). Verified: SSR markup tests and a
`hydrateRoot` test with zero recoverable errors; the Chrome lab hydrates without console errors.
Entrance effects that start hidden (E, ST) must not hide server-rendered content when JavaScript
fails: planned rule "hidden only under `@media (scripting: enabled)` plus a boot flag with timeout"
(D4).

## R12 — CSS distribution and tokens

`./styles.css` (opt-in) holds only `.neshel-*` rules in `@layer components.neshel`. Motion tokens
(durations, easings, distances) are planned for `config` as CSS custom properties in 009 (they must
pass the token contract of ADR 0006 and stay theme-independent); until then effects take options.
Presets will be precompiled classes, never runtime-generated utilities.

## R13 — Performance budgets and comparative benchmark

Observed gzip sizes (minified, React external, Vite 8): Tilt3D 5.95 KiB (includes Slot), useTilt3D
4.08 KiB, createTilt3D 3.90 KiB, core scheduler + spring 1.18 KiB, `composeTransform` 0.46 KiB.
Plan (009): add `animations` entries to `check:bundles` with budgets once the package API is
approved; benchmark Tilt3D and one entrance/scroll effect against Motion (and anime.js) for bundle
size, main-thread time per frame under a 4× CPU throttle, and long-task count, before any engine
dependency is accepted (ADR 0020).

## R14 — Testing strategy

Unit (`node:test` on the built output): core scheduler phases, cancellation, clamped delta, error
isolation; spring convergence and frame-rate independence; composition rules and ownership; Tilt3D
SSR, hydration, signs, options, re-render count, touch, focus, reduced motion (live), disabled,
cleanup of every listener and frame, hit area, composition with another layer. Type fixtures
(positive and `@ts-expect-error`). Contract: manifest, exports, dependency graph, `"use client"`,
import-time purity, stylesheet hygiene; the same contract runs on the packed tarball
(`check:pack --with animations`). Browser (`check:browser:animations`, CDP, real input): 14 cases
including axe. Pending: Firefox/WebKit runs, three-OS CI run, packed external consumer app, manual
screen-reader pass of the lab.
