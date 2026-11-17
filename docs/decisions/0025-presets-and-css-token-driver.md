# ADR 0025 — Presets, the CSS-token driver and effect composition rules

- Status: **Accepted** (owner approval 2026-11-17, review of PR #7; implemented and verified in
  Phase 010 — [evidence](../../specs/010-animation-effects/evidence.md))
- Date: 2026-11-16
- Feature: [010](../../specs/010-animation-effects/spec.md); research R2–R9;
  contracts [presets.md](../../specs/010-animation-effects/contracts/presets.md),
  [drivers-and-css.md](../../specs/010-animation-effects/contracts/drivers-and-css.md),
  [composition-matrix.md](../../specs/010-animation-effects/contracts/composition-matrix.md)

## Context

The catalogue lists most Entrance, Hover and Press entries with a CSS driver. Phase 009 built a motion
host that owns managed inline styles and arbitrates channels, and ADR 0023 deferred "the CSS-class driver"
to presets (010). Research R2 shows that CSS keyframes or transitions declared on the consumer's element
cannot compose: animations override the host's inline values, individual transform properties are
single-owner, and `transition`/`animation` declarations are silently replaced by the consumer's own.

## Decision

1. **Presets are values.** `definePreset(name, effect, options)` returns a frozen, validated option set;
   `attachPreset(element, preset, overrides?, config?)` attaches through `attachEffect`. No string
   registry is implied; `createEffectRegistry` remains the explicit lookup.
2. **Rule R-1 — the consumer's element is animated only by the engine.** No package stylesheet declares a
   transition or an animation whose subject may be the consumer's element (enforced by a contract test).
   Every animated property of the consumer's element is a host channel: `transform` layers, the `opacity`
   product, exclusive channels (`filter`, `clip-path`, `mask`, individual transforms) or namespaced
   `--neshel-<effect>-*` custom properties.
3. **CSS-token driver.** CSS animates and renders only package-owned targets: the host's `::before` decor
   layer (shared, composable lists of shadows and backgrounds), its `::after` ring layer (exclusive via the
   sentinel channel `--neshel-layer-after`), and elements the package renders (toggle, checkbox, swap
   slots). Rules select `[data-neshel-fx~="<token>"]` (plus `-active` / `-reduced` variants); an effect adds
   its token in `setup` and removes it in `destroy`, so CSS of an effect that lost arbitration never
   runs. Tokens are reference-counted per element.
4. **WAAPI on owned transient layers** (ripple, burst): created and removed by the effect, aria-hidden and
   inert, never touching the host's styles.
5. **Primitives over wrappers.** `<Reveal>`, `<Stagger>`, `<Hover>`, `<Press>` accept a definition or a
   preset (or a list for hover/press) and nest with `asChild`; components only where the package renders
   DOM. Attachment in a layout effect; hydration-aware entrances (`appear`).

## Consequences

- Every pair of Phase 010 effects composes on one element (composition matrix); the only conflicts are
  genuine exclusive ones (`filter`, `clip-path`, `mask`, `::after`, same effect twice on an exclusive
  property), resolved by 009 arbitration with development warnings.
- Catalogue drivers change for most CSS rows (entrances → engine tween; decor → engine values + CSS
  render); documented per entry in contracts/effects-010.md. The catalogue keeps the ids.
- Decor needs the opt-in family stylesheet and gives the host `position: relative` (zero specificity).
- Per-frame main-thread writes during short transitions instead of compositor-only CSS transitions on the
  host; bounded and measured.

## Alternatives

- CSS keyframes/transitions on the host with documentation "don't set your own transition": silent
  failures, no arbitration (rejected, R2).
- Registered custom properties composed into `translate`/`scale` by one package rule: still needs a
  `transition`/`animation` on the host (same collision) and loses compositor acceleration anyway.
- Injected persistent layer elements for every decor effect: heavier DOM changes inside React-managed
  elements; pseudo-elements suffice except for transient particles.
- A global string preset registry: breaks tree-shaking and SSR isolation (ADR 0021).

## Verification

Unit tests (composition and restoration on one element for every family pair, token lifecycle, slot
arbitration), the contract test for R-1, the lab in Chromium/Firefox/WebKit (spike cases for R2, real
input), the packed external consumer (SSR + hydration), bundle measurements.
