# Contract — playground prototypes (experiments B and C)

**Status: prototypes, verified in the lab; APIs NOT approved** (FR-080). Code:
`apps/playground-vite/src/animations/`; page `apps/playground-vite/animations.html`
(`pnpm dev:playground`, then open `/animations.html`). Findings: [research.md](../research.md) R7–R8.

## B · CornerRecede (catalogue D05)

One amount `0..1` drives four techniques; the core spring animates it (`Animate` button) or the
range input sets it directly. Reduced motion jumps without animation.

| Technique   | Implementation                                                                                                                      | Real deformation?                                    |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Rigid plane | `transform-origin: 0 100%; transform: rotate3d(4, 3, 0, amount·38deg)`                                                              | No (rigid)                                           |
| Hinged fold | base `clip-path` without the corner + flap `rotate3d(1,1,0, amount·80deg)` about the crease; flap is an `aria-hidden`, `inert` copy | Piecewise planar (exact fold for paper), not a curve |
| Segmented   | 8×8 tiles with a static depth field, `translateZ(amount·z)`                                                                         | No (stepped planes)                                  |
| WebGL mesh  | 32×24 plane, vertex-shader displacement, canvas texture                                                                             | **Yes**, raster only                                 |

A future `CornerRecede` API (015) would expose the fold technique for live content
(`<CornerRecede corner="top-right" size={96} amount={…}>`, structure `L`) and the mesh technique
for media in the GPU entry. Not approved.

## C · ScrollScene (catalogue SP01/SP05/SP10)

```text
<section style="height: 300vh">            ← scroll distance = height − viewport
  <div class="stage" style="position: sticky; top: 0; height: 100vh">   ← pinning (CSS)
    layers: transform from var(--scene-progress) × depth
    caption: opacity segments of var(--scene-progress)
```

Engine: cached geometry (measured in the read phase on mount, `ResizeObserver` and resize);
progress in the update phase from `scrollY`; one `--scene-progress` write per frame; optional spring
smoothing. A future API (010) could be:

```tsx
<ScrollScene height="300vh" smooth>
  <ScrollSceneLayer depth={0.5}>…</ScrollSceneLayer>
</ScrollScene>;
// + useScrollProgress(ref) and a core scroll-progress source
```

Not approved. Open questions for 010: per-layer writes vs one inherited custom property for large
scenes; nested scroll containers; horizontal scenes; integration with native scroll-driven
animations where supported (choose SDA automatically, JS as fallback).
