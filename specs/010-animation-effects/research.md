# Research — Phase 010: Animation Effects & Presets

Decisions R1–R11. "Observed" = verified in this repository (unit tests, the animations lab in Chromium,
Firefox and WebKit, the packed consumer); "reported" = public documentation, re-checked by the lab where
it decides behaviour. Builds on 008 research R0–R14, 009 research R1–R12 and ADRs 0018–0024.

## R1 — What Phase 009 gives every effect

Definitions (`defineEffect`), explicit registries, the per-element motion host (style ledger: capture /
restore value and priority, transform composition, opacity multiplication, exclusive arbitration with
suspension and resumption, one write per property per frame), motion values with springs and tweens,
the WAAPI driver, easing/interpolation, motion defaults, live reduced motion and the React attachment
lifecycle. Missing for 30 effects: (1) a preset concept, (2) a rule for how CSS participates without
bypassing ownership, (3) shared interaction plumbing (hover, focus-visible, press, pointer box), (4)
React primitives that compose several effects on one element. Everything below is built from 009 parts.

## R2 — Can catalogue "CSS" entrances (keyframes on the element) compose? — No

Three facts of the CSS cascade decide it (observed in the lab spike cases `spike: …`, three engines):

1. **Animations override inline styles.** A keyframe animation of `transform` on an element whose Tilt3D
   layer is in the inline `transform` replaces the tilt for the whole run (the animation origin sits
   above the inline style in the cascade). The same holds for `opacity`, which the host multiplies.
2. **Individual transform properties are single-owner.** Keyframes on `translate`/`scale`/`rotate`
   compose with `transform`, but a fade-slide entrance (`translate`) and a lift (`translate`), or a
   scale-in (`scale`) and a press (`scale`), fight for one property.
3. **`transition` and `animation` are single properties.** A package rule declaring `transition:
   translate …` on the consumer's element is silently replaced by the consumer's own
   `transition: background-color …` (unlayered author CSS beats the package layer — ADR 0008), so the
   effect stops animating without any error; the engine cannot see or arbitrate it.

Decision (ADR 0025 §2, rule **R-1**): *CSS never declares a transition or an animation on the consumer's
element.* Properties of the consumer's element are animated only by the engine through the motion host.
Entrances therefore run as one progress tween (or spring) rendered through the host: a `transform` layer
(composes with Tilt3D, hover and press layers), an `opacity` contribution (multiplies) and, for blur /
clip / mask, one exclusive channel. Cost: one style write per animated element per frame for ≤ 500 ms on
mount (measured negligible next to React's mount; no layout read). Benefits beyond composition:
interruption and replay, exact restoration, live reduced motion, hydration awareness (R6).

## R3 — Where CSS remains the right driver

CSS is kept where the package owns the render target, so nothing can collide with consumer styles:

- **Pseudo-element layers** of the host (`::before` decor layer, `::after` ring layer): the consumer does
  not style them through our tokens; their visuals are computed by CSS from namespaced custom properties
  the engine writes (`--neshel-lift-progress`, `--neshel-spotlight-x`, …). Inherited custom properties are
  resolved on the host, so the pseudo-element follows without its own inline style (observed).
- **Package-rendered elements** (toggle thumb, checkbox SVG, content-swap slots): CSS transitions keyed on
  `data-state` and engine tokens.
- **Infinite decorative rotation** of the border sweep: CSS keyframes on the `::after` layer animating a
  registered `--neshel-sweep-angle` (`@property`, the only registration); paused unless active and not
  reduced. Without `@property` support the ring is static (graceful).

This is the **CSS-token driver** announced by ADR 0023: rules select `[data-neshel-fx~="<token>"]`, and an
effect adds its token only while the host granted its claims (setup ran) — so a suspended effect's CSS
never runs (ADR 0025 §3).

## R4 — Composable decor on two pseudo-elements

Six hover visuals want a layer; an element has two pseudo-elements. Comma-separated CSS lists compose
inside one layer: `box-shadow: var(--neshel-lift-shadow), var(--neshel-glow-ring), var(--neshel-glow-halo)`
and `background-image: var(--neshel-spotlight-image), var(--neshel-shine-image), var(--neshel-underline-image)`,
each defaulting to a transparent value. So lift, glow, spotlight, shine and underline **share** the
`::before` decor layer and compose (token `decor`, reference-counted). The border sweep needs a masked
ring that would clip the others, so it takes `::after` exclusively through the sentinel exclusive channel
`--neshel-layer-after` (arbitrated like any other channel; future `::after` users conflict visibly).
Decor values are declared on every decor host, so a nested host never inherits an ancestor's state.

Driving decor values from the engine (not CSS `:hover` transitions) keeps one timing source with the
transform parts (lift translate and shadow move together), honours touch opt-in and the `reducedMotion`
option live, and avoids transition lists on a shared layer fighting with per-frame values.

## R5 — Interaction plumbing (hover, focus, press)

- Hover activation = an accepted pointer inside the element's box (mouse and pen by default; touch
  opt-in) or keyboard `:focus-visible` inside. The box is measured once on enter and the pointer followed
  on `window` until it leaves the box — the Tilt3D technique (008 R6) that prevents enter/leave
  oscillation when the element moves under the pointer (lift, magnetic). Extracted as an internal core
  module (`trackPointer`, `watchHover`); Tilt3D keeps its own copy unchanged (no regression risk).
- Press = primary pointer button down on the element (released anywhere) or Space/Enter held while the
  element itself is focused; disabled elements (`:disabled`, `aria-disabled="true"`) never press.
  Listeners are passive observers (no `preventDefault`, no propagation changes).
- Pointer-follow springs: an internal **spring rig** advances several springs in one scheduler task and
  stops at rest (generalises Tilt3D's loop; uses the 008 integrator). One-shot motions (entrances, shake,
  nudge, shine, number tick, checkbox) use 009 `motionValue` + `animateValue`.

## R6 — SSR, hydration and "visible without JavaScript"

Entrance effects write nothing on the server; content is visible in server markup and without
JavaScript. When `<Reveal>` hydrates server markup, replaying the entrance would hide content the user
has already seen (visible → hidden → fade in). `useSyncExternalStore` with a server snapshot tells a
hydrating first render from a client-only mount; `appear="client"` (default) plays only on client mounts
(route changes, conditional rendering), `"always"` also after hydration, `"never"` only on `replayKey`.
Attachment runs in a layout effect so a client-rendered element gets its start pose in the first write
phase (before paint). A hidden page, reduced motion "instant" or a destroyed run ends in the final,
visible state; delays are bounded (`delay ≤ 5 s`, stagger total ≤ `maxStagger`, default 900 ms).
First-paint CSS entrances for server-rendered content (no JavaScript at all) are a Phase 011 topic
together with intersection triggers.

## R7 — WAAPI for owned transient layers

Ripple and burst create short-lived, package-owned elements (aria-hidden, inert, no pointer events)
inside the host and animate them with WAAPI (compositor-friendly, no per-frame JS), removing them on
finish. They never touch the host's styles; the host only needs `position: relative`, given by the
stylesheet with zero specificity. Without WAAPI (jsdom, very old engines) no layer is created.

## R8 — Presets as values

A preset is a frozen `{ name, effect, options }` built by `definePreset(name, effect, options)`
(validated by `effect.resolve`). Presets are imported values (tree-shakeable, typed, no string
registry); `createEffectRegistry` still provides string lookup when an application wants it. Primitives
accept a definition or a preset (`<Reveal preset={fadeUp}>`, `<Hover preset={[lift, glow]}>`). Named
presets in 010: `fadeUp/Down/Left/Right`, `clipCircle`, `flipX/Y`.

## R9 — Public surface: primitives, not 30 wrappers

Per-effect components would add 30 public names with no behaviour beyond `asChild` + options. Instead:
`<Reveal>` and `<Stagger>` (entrance), `<Hover>` (hover), `<Press>` (press and microinteractions) accept
presets, compose several presets on one element (`preset={[lift, glow]}`) and nest with `asChild` across
families (Slot merges refs/classes/handlers). Components exist only where the package renders its own DOM:
`ToggleMorph`, `CheckboxDraw`, `NumberTick`, `ContentSwap` (and Tilt3D from 008). Imperative use is
`attachEffect` / `attachPreset` from `./core`.

## R10 — Accessibility of feedback effects

Shake warns in development when the element has no error semantics (`aria-invalid`, `aria-errormessage`,
`role="alert"`); the error must be conveyed by text/ARIA. NumberTick renders an aria-hidden counting copy
written outside React and a visually hidden final value (optional polite live region updated once per
change). ContentSwap uses `hidden` for the inactive content (correct without CSS/JS), transitions with
`@starting-style` + `transition-behavior: allow-discrete` (reported baseline 2024; instant swap
elsewhere) and an optional polite live region. Nudge repeats at most three times (≤ 4 plays) and stops on
hidden pages (WCAG 2.2.2). Toggle and checkbox visuals are aria-hidden inside the native, labelled control.

## R11 — Bundle strategy

Family subpaths keep imports modular; every definition is a `/* @__PURE__ */` top-level value and the
package `sideEffects` stays CSS-only, so an unused effect costs nothing. Effects that claim exclusive
channels need the arbiter (`attachEffect`); the family primitives always use it (≈ 1 KiB gzip). Tilt3D's
arbiter-free path and its budgets are unchanged. Budgets for new entries are proposed from measurements
of the packed tarball (evidence.md), never by raising the 009 core budgets.
