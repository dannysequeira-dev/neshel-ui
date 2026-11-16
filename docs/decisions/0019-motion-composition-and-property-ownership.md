# ADR 0019 — Motion composition and property ownership

- Status: **Proposed** (2026-11-15, Phase 008.0); transform composer implemented and verified,
  channel registry planned for 009
- Date: 2026-11-15
- Feature: [008](../../specs/008-animations/spec.md); research R5;
  [contracts/composition.md](../../specs/008-animations/contracts/composition.md)

## Context

Effects from different families routinely target the same element (a hover lift, a pointer tilt and
a scroll parallax on one card). If each writes `transform`, the last write wins and effects break
each other. Summing per-effect CSS variables in one stylesheet `transform` needs a closed list of
effects and makes every frame restyle the subtree (inherited custom properties).

## Decision

1. **Channels with single owners.** Each animated property on an element has one owner at a time.
2. **CSS-driven effects use the individual transform properties** (`translate`, `rotate`, `scale`);
   the browser applies them before `transform` (CSS Transforms 2), so they compose with JS effects
   without coordination.
3. **JS-driven effects never write `transform` directly.** They contribute layers to the element's
   single **transform composer** (`getTransformComposer`, one per element, weakly held), which
   combines layers (translations/rotations add, scales multiply, strongest perspective, fixed order)
   and writes one `transform` per frame in the scheduler's write phase. At identity it removes the
   inline `transform` and `will-change`.
4. **Exclusive channels** (`filter`, `clip-path`, `mask`) have one effect; a second claimant is a
   development warning once the registry exists (009). `opacity` gets a multiplicative composer when
   a second JS opacity effect appears.
5. **Structures** when one element is not enough are declared per effect: wrapper (`W`), inert
   duplicated layers (`L`), accessible split text (`S`), decorative canvas (`C`), group (`G`).
6. A consumer's own inline `transform` on an animated element is replaced while the effect is active
   (one development warning); consumers move it to a wrapper or to the individual properties.

## Consequences

- Deterministic, order-independent composition; removing one effect restores the others.
- Per-axis rotation sums are exact for one rotating layer and approximate for several (3D rotations
  do not commute); effects needing exact compound rotations own a wrapper.
- Every JS effect depends on the composer contract; the registry (009) adds metadata, not a new
  mechanism.

## Alternatives

- Last-write-wins `transform` (status quo of most snippets): conflicts.
- Matrix multiplication of arbitrary layer matrices: exact but order-dependent and heavier; may be
  added for advanced layers if a phase needs it.
- Per-effect CSS variables summed in CSS: closed set, subtree restyles each frame.

## Verification

`test/core.test.mjs` (rules, one write per frame, restoration, warning), `test/tilt.test.mjs`
(Tilt3D + another layer), browser case "CSS translate lift + JS transform tilt on one element"
(Chrome 157). Evidence: [008 evidence](../../specs/008-animations/evidence.md).
