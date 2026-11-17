# @neshel-ui/animations

![Experimental](https://img.shields.io/badge/status-experimental-D9B86A?style=flat-square) ![Not published on npm](https://img.shields.io/badge/npm-unpublished-64748B?style=flat-square&logo=npm&logoColor=white) ![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?style=flat-square&logo=typescript&logoColor=white) ![React 19](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=0D1B39) [![MIT License](https://img.shields.io/github/license/dannysequeira-dev/neshel-ui?style=flat-square&color=D9B86A)](https://github.com/dannysequeira-dev/neshel-ui/blob/main/LICENSE)

Modular, accessible motion primitives and effects for Neshel-UI.

**Status: experimental, private, unpublished (features 008.0–011).** This package is not on npm and its
API may change before the owner approves a first publication. Specification, catalogue and
decisions: [`specs/008-animations/`](../../specs/008-animations/spec.md),
[`specs/009-motion-engine/`](../../specs/009-motion-engine/spec.md),
[`specs/010-animation-effects/`](../../specs/010-animation-effects/spec.md),
[`specs/011-scroll-parallax/`](../../specs/011-scroll-parallax/spec.md), ADRs 0018–0026.

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
  `parallax`, `shine` and the `<Hover>` primitive (catalogue H01–H10).
- `@neshel-ui/animations/entrance` — `fadeIn`, `fadeSlide` (+ `fadeUp/Down/Left/Right`), `scaleIn`,
  `zoomIn`, `blurIn`, `clipReveal` (+ `clipCircle`), `maskWipe`, `rotateIn`, `flipIn` (+ `flipX/Y`),
  `stagger`, `springIn`; `<Reveal>` and `<Stagger>` (E01–E11). No stylesheet needed.
- `@neshel-ui/animations/press` — `pressScale`, `ripple`, `tapBounce`, `burst`, `shake`, `nudge`;
  `<Press>`; decorative `ToggleMorph`, `CheckboxDraw`, `NumberTick`, `ContentSwap` (P01–P10).
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
- `definePreset` / `attachPreset` (`./core`) — presets are values: a definition plus frozen options.
- Stylesheets (opt-in): `@neshel-ui/animations/hover.css` (Tilt3D depth + decor layers),
  `@neshel-ui/animations/press.css` (ripple, burst, toggle, checkbox, swap),
  `@neshel-ui/animations/scroll.css` (sticky scene stage, progress bar, horizontal section, sticky
  stack, parallax frame) or `styles.css` (all three).

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

Entrances play on client mounts and on `replayKey` changes; server-rendered content stays visible and
is not hidden again while hydrating (`appear="client"`). Hover effects follow mouse/pen and keyboard
`:focus-visible` (touch is opt-in). `ToggleMorph` and `CheckboxDraw` are decorative visuals for inside
your native, labelled control. Every effect honours `prefers-reduced-motion` live.

Peer dependency: `react ^19.0.0`. Runtime dependency: `@radix-ui/react-slot`.

## Composition rule

Effects never write managed styles directly: they go through the element's motion host (ADR 0019,
ADR 0022). `transform` layers compose, `opacity` multiplies, other channels have one owner at a time;
original inline styles are restored when effects end. The package stylesheets never declare a
transition or animation on your element (ADR 0025): CSS only renders package-owned layers, so effects
compose with each other and with your own styles (`transition`, `translate`, …). Several effects —
Entrance, Hover, Press, Tilt3D and scroll effects — can share one element through nested `asChild`.

## License

MIT
