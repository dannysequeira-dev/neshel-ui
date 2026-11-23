# @neshel-ui/animations

![Experimental](https://img.shields.io/badge/status-experimental-D9B86A?style=flat-square) ![Not published on npm](https://img.shields.io/badge/npm-unpublished-64748B?style=flat-square&logo=npm&logoColor=white) ![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?style=flat-square&logo=typescript&logoColor=white) ![React 19](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=0D1B39) [![MIT License](https://img.shields.io/github/license/dannysequeira-dev/neshel-ui?style=flat-square&color=D9B86A)](https://github.com/dannysequeira-dev/neshel-ui/blob/main/LICENSE)

Modular, accessible motion primitives and effects for Neshel-UI.

**Status: experimental, private, unpublished (features 008.0–016; the 157-entry catalogue is implemented — this does not authorise a publication).** This package is not on npm and its
API may change before the owner approves a first publication. Specification, catalogue and
decisions: [`specs/008-animations/`](../../specs/008-animations/spec.md),
[`specs/009-motion-engine/`](../../specs/009-motion-engine/spec.md),
[`specs/010-animation-effects/`](../../specs/010-animation-effects/spec.md),
[`specs/011-scroll-parallax/`](../../specs/011-scroll-parallax/spec.md),
[`specs/012-physics-gestures-layout/`](../../specs/012-physics-gestures-layout/spec.md),
[`specs/013-cinematic-page-transitions/`](../../specs/013-cinematic-page-transitions/spec.md),
[`specs/014-typography-svg-paths/`](../../specs/014-typography-svg-paths/spec.md),
[`specs/015-media-ambient-feedback/`](../../specs/015-media-ambient-feedback/spec.md),
[`specs/016-advanced-3d-distortion/`](../../specs/016-advanced-3d-distortion/spec.md), ADRs 0018–0031.

## What exists today

- `@neshel-ui/animations/core` — the framework-free motion engine: frame scheduler, springs, easing
  (`cubicBezier`, presets, `springEasing`), `motionDefaults`; effect definitions (`defineEffect`),
  explicit registries, `attachEffect`; a per-element motion host that owns managed inline styles
  (captures and restores original values and priorities, composes `transform`, multiplies `opacity`,
  arbitrates exclusive channels by priority with suspension and resumption, warns on conflicts in
  development); controllers (`animateValue`, `animateElement` for WAAPI, `bindChannel`) whose
  `finished` resolves `completed` / `cancelled` / `interrupted` and rejects only on real errors.
- `@neshel-ui/animations` — React bindings: `useMotionEffect`, `useMotionValue`, `useMotionValueEvent`.
- `@neshel-ui/animations/hover` — `Tilt3D`, `useTilt3D`, `createTilt3D`, `tilt3D` (inward by default,
  `reverse` inverts; keyboard focus pose; live reduced motion; `asChild`; SSR-safe).
  Phase 010 adds `lift`, `glow`, `magnetic`, `spotlight`, `borderSweep`, `underline`, `mediaZoom`,
  `parallax`, `shine` and the `<Hover>` primitive (catalogue H01–H10); Phase 012 adds the decorative
  `cursorFollower` / `<CursorFollower>` (H11).
- `@neshel-ui/animations/entrance` — `fadeIn`, `fadeSlide` (+ `fadeUp/Down/Left/Right`), `scaleIn`,
  `zoomIn`, `blurIn`, `clipReveal` (+ `clipCircle`), `maskWipe`, `rotateIn`, `flipIn` (+ `flipX/Y`),
  `stagger`, `springIn`; `<Reveal>` and `<Stagger>` (E01–E11). No stylesheet needed.
- `@neshel-ui/animations/press` — `pressScale`, `ripple`, `tapBounce`, `burst`, `shake`, `nudge`;
  `<Press>`; decorative `ToggleMorph`, `CheckboxDraw`, `NumberTick`, `ContentSwap` (P01–P10); Phase 012
  adds `longPress` / `<LongPress>` (P11: hold to activate, keyboard hold, never two actions).
- `@neshel-ui/animations/scroll` — the scroll engine (`createScrollProgress` with CSS named ranges,
  viewport or inner containers, spring `smooth`; `observeInView`, `createScrollTrigger`,
  `createSectionSpy`, `inViewPresets`, `refreshScroll`, `getScrollDebugInfo`) and the Scroll Triggers
  (ST01–ST10: `revealOnEnter`, `staggerOnEnter`, modes, callbacks, `inViewProgress`, `directionHeader`,
  `stuckState`, section spy, `lazyEffect`, trigger presets) and Scroll & Parallax effects (SP01–SP11:
  `depthParallax`, `scrubTransform`, `scrollProgress`, `<HorizontalScroll>`, `pinnedScene`,
  `imageParallax`, `zoomOnScroll`, `scrollColorShift`, `stickyStack`, smooth scrub, `velocitySkew`);
  React: `<ScrollScene>`, `<ScrollLayer>`, `<ScrollEffect>`, `<RevealOnScroll>`, `<StaggerOnScroll>`,
  `<ScrollProgressBar>`, `<StickyStack>`, `<ParallaxImage>`, `useScrollProgress`, `useScrollScene`,
  `useInView`, `useScrollTrigger`, `useSectionSpy`.
- `@neshel-ui/animations/gestures` (Phase 012) — a pointer session per element (capture, several
  pointers, scroll compensation, competing gestures, composed `touch-action`), `createGesture`,
  physics primitives (`createVelocityTracker`, `stepDecay`, `projectDecay`, `rubberband`,
  `nearestSnap`), `createGestureControls`, and G01–G11: `drag`, `dragSnap`, `swipeDismiss`,
  `pullToRefresh`, `springFollow`, `elasticEdge`, `fling`, `pinchZoom`, `rotateGesture`, `reorder`,
  `squashStretch`; React: `<Gesture>`, `<SwipeDismiss>`, `<PullToRefresh>`, `<ElasticScroll>`,
  `<PinchZoom>`, `<Reorder>`/`<ReorderItem>`/`<ReorderHandle>`, `useReorderItem`,
  `useGestureControls`, `useSpringFollow`.
- `@neshel-ui/animations/layout` (Phase 012) — FLIP on layout boxes (`createLayoutGroup`, `measureBox`),
  reflow observers, height drivers, the presence state machine (`createPresence`) and L01–L10:
  `flipMove`, `autoHeight`, `listItem`, `sharedLayout`, `gridReflow`, `collapse`, `tabIndicator`,
  `crossFade`, `masonry`; React: `<LayoutGroup>`, `<LayoutItem>`, `useLayoutItem`, `useLayoutGroup`,
  `<AutoHeight>`, `<AnimatedList>`, `<Reflow>`, `<Collapse>`, `<TabIndicator>`, `<Presence>`,
  `usePresence`, `useIsPresent`, `<CrossFade>`, `<Masonry>`.
- `@neshel-ui/animations/cinematic` (Phase 013) — the timeline engine `createTimeline` (C01: labels,
  overlaps, pause, reverse, seek, retarget, explicit repeat, awaited calls; one task of the shared scheduler,
  renders only through motion hosts) and C02–C10: `createSceneChapters`, `createCamera`, `createCover`
  (split, curtain, shutter), `titleSequence`, `createSpotlight`, `createDepthOfField`,
  `createStoryboard`, `createLetterbox`; React: `useTimeline`, `<SceneChapters>`, `<Chapter>`,
  `<SceneSegment>`, `<CameraStage>`, `useCamera`, `<SplitReveal>`, `<CurtainReveal>`, `<TitleSequence>`,
  `<Spotlight>`, `<DepthOfField>`, `<Storyboard>`, `<StoryboardFrame>`, `<Letterbox>`.
- `@neshel-ui/animations/page-transitions` (Phase 013) — native View Transitions first:
  `startPageTransition` (PT01 fade, PT03 slide, PT05 scale, PT06 wipe; fallback runs the update at once),
  `registerSharedElement` (PT02 morph, PT08 persistent; FLIP fallback), `trackNavigationDirection` (PT04,
  Navigation API indexes), `createRouteProgress` (PT07), `enableCrossDocumentTransitions` (PT09); React:
  `<PageTransition>`, `<SharedElement>`, `<PersistentElement>`, `<RouteProgress>`, `usePageTransition`,
  `useNavigationDirection`, `useRouteTransition`. Router adapters (PT10, optional peers):
  `@neshel-ui/animations/page-transitions/next` (`<NextPageTransitions>`, `<TransitionLink>`; next ≥ 16.4) and
  `@neshel-ui/animations/page-transitions/react-router` (`<RouterPageTransitions>`; react-router ≥ 8).
- `@neshel-ui/animations/text` (Phase 014) — the accessible splitter `splitText` (Unicode grapheme clusters
  and words through `Intl.Segmenter`, bidi runs, shaping-script words kept whole, lines regrouped only on
  resize/font changes; ONE accessible copy: the original nodes in a visually hidden span, the visual pieces
  `aria-hidden`; links, controls and editable content are never split) and T01–T11:
  `createTextReveal`, `createTypewriter`, `createScramble`, `createGradientSweep`, `createNumberRoll`
  (`Intl.NumberFormat` parts, any decimal numbering system), `createRotatingWords`, `createTextWave`,
  `createHighlighter`, `createTextMask`, `createFontAxes` (registered axes through high-level properties,
  custom axes merged with the consumer's `font-variation-settings`), `createLineReveal` (any 0–1 progress
  source, e.g. a `ScrollProgress`); React: `<TextReveal>`, `<Typewriter>`, `<ScrambleText>`,
  `<GradientText>`, `<NumberRoll>`, `<RotatingWords>`, `<WaveText>`, `<Highlight>`, `<TextMask>`,
  `<FontAxes>`, `<LineReveal>`, `useSplitText`. Every effect has `track()` (a `createTimeline` value track)
  and `drive(source)`.
- `@neshel-ui/animations/svg` (Phase 014) — pure path utilities (`parsePathData` exact normal form,
  `getPathGeometry`, `measurePath`, `getPathMorphCompatibility`, `interpolatePath` — strict morph policy,
  no resampling) and S01–S10: `createPathDraw`, `createPathMorph`, `createMotionPath` (native
  `offset-path`, JS fallback), `createIconMorph` + `menuCloseShapes`, `createGradientStops`,
  `createChartDraw`, `createTurbulence`, `createLogoReveal`, `createDashFlow`, `createCheckmark`; React
  hooks (`usePathDraw`, `usePathMorph`, `useMotionPath`, …) and `<PathDraw>`, `<MorphIcon>`,
  `<SuccessCheck>`. Consumer dash styles and `d` attributes are restored exactly.
- `@neshel-ui/animations/media` (Phase 015) — M01–M10 with native media semantics (`alt`, `srcset`,
  `sizes`, `loading`, `decoding`, dimensions are never written): `createKenBurns`/`<KenBurns>` (bounded camera),
  `createBlurUp`/`<BlurUpImage>` and `createLoadReveal`/`<LoadReveal>` (an image is hidden only while it is still
  loading and is always revealed on load, error, timeout, reduced motion or unmount; `watchImage` never misses a
  past `load`), `createCompareSlider`/`<CompareSlider>` (a native range input; tap, drag, keyboard),
  `createDuotone`/`<Duotone>` (SVG filter through the `filter` channel), `createVideoScrub`/`useVideoScrub` (one
  seek in flight, newest target wins, never plays), `createLightboxZoom`/`<Lightbox>` (native modal `<dialog>`,
  FLIP zoom, focus restore, reference-counted scroll lock), `createCrossfade`/`<Crossfade>`,
  `createPixelDissolve`/`<PixelDissolve>` (real block dissolve on a Canvas 2D surface, fade fallback) and
  `createHoverPan`/`<HoverPan>` (optional keyboard panning).
- `@neshel-ui/animations/ambient` (Phase 015) — B01–B10, decorative only (`aria-hidden`, no hit testing):
  `GradientShift`, `Aurora`, `Grain`, `Particles`, `Starfield`, `GridPattern`, `MeshGradient`,
  `FloatingShapes`, `PointerGlow`, `Waves` (and `create*` engines). They move only on screen, on a visible page,
  without reduced motion and while the page switch (`ambientMotion`, `<AmbientMotionToggle>`) allows it; 5 s of
  motion by default, `duration: Infinity` explicit (WCAG 2.2.2). CSS layers animate transforms with soft radial
  gradients (no `filter: blur`); particles/stars use a bounded Canvas 2D surface (ADR 0030).
- `@neshel-ui/animations/feedback` (Phase 015) — F01–F10, semantics first: `Spinner`, `DotsPulse`,
  `ProgressBar`, `ProgressRing` (ARIA progressbars; a value only when known), `SkeletonShimmer` and `<Shimmer>`
  (hidden from assistive technology; works on the Components `Skeleton`), `SuccessMark` (never announces),
  F06 `createEnterExit`/`<EnterExit>` (enter/exit motion for a list another component owns — e.g. a Components
  `<Toaster motion="none">`; the notification store moved to `@neshel-ui/components` in feature 017), `createLoadingButton`/`<LoadingButton>` (same element, name and focus; no double activation;
  use it on a Components `Button` without its `loading` prop), `createOptimisticPulse`/`<OptimisticPulse>`
  (pending ≠ confirmed; failure rolls back) and `<PendingText>`.
- `@neshel-ui/animations/advanced` (Phase 016) — D01, D02, D03, D05, D07, D09, D11 on CSS 3D and the Motion Host:
  `CardFlip` (hidden face inert; focus follows the visible face; `seek`/`drive`/`track`), `CubeRotate` (one
  interactive panel; faces never project outside the panel box), `RingCarousel` (only the front item focusable;
  carousel/slide semantics; keyboard and drag), `CornerRecede` (the corner under the pointer folds away like paper;
  `reverse` lifts it; an inert, ID-free flap exists only while folded; `flap="plain"` for content that cannot be
  copied), `Glitch` (text once; at most 3 slice changes per second; off under reduced motion), `PerspectiveGrid`
  (decorative, finite by default) and `TiltShift` (at most two `backdrop-filter` bands per side; tint fallback).
  Never loads WebGL.
- `@neshel-ui/animations/gpu` (Phase 016, optional; ADR 0031) — a minimal WebGL2 layer without a graphics
  dependency (`configureGpu`, `getGpuSupport`, `getGpuDebugInfo`: lazy contexts within a budget, exact release,
  context-loss recovery, package-only shaders) and D04 `PageCurl` (real mesh curl of a raster page; `driver="css"`
  turns live HTML as a rigid page), D06 `Ripple`, D08 `DisplacementHover` and D10 `DepthParallax` (an explicit depth
  map is required — depth is never estimated). The native `<img>` stays in the DOM and the accessibility tree and
  is shown again without WebGL2, on failure, under reduced motion and on unmount. Images and maps must be CORS-clean.
- `definePreset` / `attachPreset` (`./core`) — presets are values: a definition plus frozen options.
- Stylesheets (opt-in): `@neshel-ui/animations/hover.css` (Tilt3D depth + decor layers),
  `@neshel-ui/animations/press.css` (ripple, burst, toggle, checkbox, swap),
  `@neshel-ui/animations/scroll.css` (sticky scene stage, progress bar, horizontal section, sticky
  stack, parallax frame) or `styles.css` (all three); `@neshel-ui/animations/gestures.css` (built-in
  controls, pull indicator, reorder states) and `@neshel-ui/animations/layout.css` (collapse panel,
  tab indicator, cross-fade stack, masonry grid) are separate opt-in files, as are
  `@neshel-ui/animations/cinematic.css` (camera stage, cover panels, spotlight lens, storyboard, letterbox),
  `@neshel-ui/animations/page-transitions.css` (View Transition effects, route progress) and
  `@neshel-ui/animations/page-transitions-mpa.css` (the same plus the cross-document opt-in),
  `@neshel-ui/animations/text.css` (per-piece math of the text effects; without it text is visible and
  static), `@neshel-ui/animations/svg.css` (package-rendered icons and checkmark),
  `@neshel-ui/animations/media.css` (frames, compare slider, lightbox dialog, slide stack),
  `@neshel-ui/animations/ambient.css` (decorative layers, paused unless the engine marks them running),
  `@neshel-ui/animations/feedback.css` (indicators, token layers), `@neshel-ui/animations/advanced.css`
  (flip/cube/ring stacking, glitch blending, floor loop) and `@neshel-ui/animations/gpu.css` (GPU frames, page stack).

```tsx
import { Tilt3D } from "@neshel-ui/animations/hover";
import "@neshel-ui/animations/styles.css"; // optional

<Tilt3D maxTilt={10} asChild>
  <a href="/pricing" className="card">
    Pricing
  </a>
</Tilt3D>;
```

```tsx
import { Reveal, fadeUp } from "@neshel-ui/animations/entrance";
import { Hover, glow, lift } from "@neshel-ui/animations/hover";
import { Press, pressScale, ripple } from "@neshel-ui/animations/press";
import "@neshel-ui/animations/styles.css"; // decor layers, ripple, toggle… (plain CSS; Tailwind optional)

<Reveal preset={fadeUp} asChild>
  <Hover preset={[lift, glow]} asChild>
    <Press preset={[pressScale, ripple]} asChild>
      <button type="button" className="card">
        Choose plan
      </button>
    </Press>
  </Hover>
</Reveal>;
```

```tsx
import { fadeUp } from "@neshel-ui/animations/entrance";
import { RevealOnScroll, ScrollLayer, ScrollScene } from "@neshel-ui/animations/scroll";
import "@neshel-ui/animations/scroll.css";

<ScrollScene length={3} smooth>
  <ScrollLayer depth={0.4}>Background</ScrollLayer>
  <ScrollLayer depth={1.6}>Foreground</ScrollLayer>
</ScrollScene>;

<RevealOnScroll preset={fadeUp} mode="once">
  <h2>Revealed when it enters the viewport</h2>
</RevealOnScroll>;
```

Scroll effects never hijack scrolling: listeners are passive, pinning is CSS `position: sticky`, and the
engine only follows the native scroll position, reading layout only when geometry changes (never per
scroll event). Without JavaScript the markup is fully visible (the horizontal section is a native
horizontal scroller); with reduced motion decorative scroll motion stops and the horizontal section is
laid out vertically.

```tsx
import { Reorder, ReorderHandle, ReorderItem } from "@neshel-ui/animations/gestures";
import "@neshel-ui/animations/gestures.css";

// The order is yours: the package asks, React re-renders, items settle (FLIP).
<Reorder onReorder={(from, to) => setItems((all) => move(all, from, to))}>
  {items.map((item, index) => (
    <ReorderItem key={item.id} index={index} label={item.name}>
      <ReorderHandle /> {item.name}
    </ReorderItem>
  ))}
</Reorder>;
```

Gestures that do something always have a keyboard path and a single-pointer, non-drag alternative
(buttons through `useGestureControls()`, move up/down, dismiss and refresh buttons, zoom buttons);
`touch-action` is set only on the area of a gesture, and pinch-zoom keeps one-finger page scrolling at
scale 1. Layout animations read layout boxes once before a change and once in the next read phase
(never per frame); `<Presence>` keeps removed children mounted — inert and hidden from assistive
technology — only until their exit ends (a watchdog removes them if an animation never completes).
`<AutoHeight>` expects a wrapper that sizes to its content (not stretched by a grid or flex parent);
give each `<PullToRefresh>` / `<ElasticScroll>` region a unique accessible name.

Entrances play on client mounts and on `replayKey` changes; server-rendered content stays visible and
is not hidden again while hydrating (`appear="client"`). Hover effects follow mouse/pen and keyboard
`:focus-visible` (touch is opt-in). `ToggleMorph` and `CheckboxDraw` are decorative visuals for inside
your native, labelled control. Every effect honours `prefers-reduced-motion` live.

```tsx
import {
  PageTransition,
  SharedElement,
  usePageTransition,
} from "@neshel-ui/animations/page-transitions";
import "@neshel-ui/animations/page-transitions.css";

const transition = usePageTransition();
// React 19.3+ starts the document's View Transition at the real commit; elsewhere the update just runs.
transition.start(() => setPage("detail"), { effect: "slide", direction: "forward" });
<PageTransition effect="slide">
  <SharedElement name="photo">
    <img src={photo} alt={title} />
  </SharedElement>
</PageTransition>;
```

Page transitions never block a navigation: without the API, under reduced motion (instant effects), on a
hidden page or after a failure the update simply runs; names exist only during a transition and are
restored. Cinematic effects keep server-rendered content visible (covers, lenses and bars are package
layers shown only by JavaScript), the storyboard's autoplay is opt-in and pausable (WCAG 2.2.2), and
timelines drive Entrance definitions through their `progress` option (seek, scrub, reverse) or trigger
them with their own clock (`mode: "trigger"`).

Peer dependencies: `react ^19.0.0`; optional `next >=16.4.0` and `react-router >=8.0.0` (only for their
adapter subpaths). Runtime dependency: `@radix-ui/react-slot`.

## Composition rule

Effects never write managed styles directly: they go through the element's motion host (ADR 0019,
ADR 0022). `transform` layers compose, `opacity` multiplies, other channels have one owner at a time;
original inline styles are restored when effects end. The package stylesheets never declare a
transition or animation on your element (ADR 0025): CSS only renders package-owned layers, so effects
compose with each other and with your own styles (`transition`, `translate`, …). Several effects —
Entrance, Hover, Press, Tilt3D, scroll, gesture and layout effects — can share one element through
nested `asChild`.

## License

MIT
