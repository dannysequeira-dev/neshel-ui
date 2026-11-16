# Contract — composing several animations on one element

**Status:** transform composer **implemented and verified** (008.0); channel metadata and conflict
diagnostics **planned** (009). Decision record: [ADR 0019](../../../docs/decisions/0019-motion-composition-and-property-ownership.md).

## §1 Channels and owners

A _channel_ is a style property animated on an element. Each channel has exactly one owner per
element at a time.

| Channel                        | Owner                                                 | Combination rule                                                     | Status                                     |
| ------------------------------ | ----------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------ |
| `transform`                    | the element's **transform composer** (JS effects)     | layers combined (§2)                                                 | implemented                                |
| `translate`, `rotate`, `scale` | **CSS-driven** effects (presets, `:hover`, keyframes) | one effect per property; the browser applies them before `transform` | convention, browser-verified (lift + tilt) |
| `opacity`                      | opacity composer (JS) or one CSS effect               | multiplicative                                                       | planned 009                                |
| `filter`, `clip-path`, `mask`  | one effect                                            | exclusive; conflicts warned in dev                                   | planned 009                                |
| custom properties `--neshel-*` | the effect that declares them                         | namespaced per effect                                                | implemented (ScrollScene prototype)        |

Order applied by the browser (CSS Transforms 2): `translate` → `rotate` → `scale` → `transform`.
Hence a CSS lift on `translate` and a JS tilt in `transform` coexist (verified in Chrome).

## §2 Transform layers

```ts
interface TransformLayer {
  perspective?;
  translateX?;
  translateY?;
  translateZ?;
  rotateX?;
  rotateY?;
  rotateZ?;
  scale?;
}
```

- translations add (px); rotations add per axis (deg); scales multiply;
- `perspective` = smallest positive value among layers;
- output order `perspective() translate3d() rotateX() rotateY() rotateZ() scale()`, identity parts
  omitted, identity → `"none"`; result independent of layer order;
- per-axis rotation sums are exact for one rotating layer and approximate for several (3D rotations
  do not commute) — effects that need exact compound rotations must own a wrapper element.

## §3 Composer lifecycle

- `getTransformComposer(element)` returns the one composer of that element (weakly held).
- `set(key, layer)` / `delete(key)` schedule one write in the next write phase; repeated calls in a
  frame coalesce.
- While at least one non-identity layer exists the composer owns inline `transform` and sets
  `will-change: transform`; at identity it removes both, restoring the element's own CSS.
- If an inline `transform` it does not own is present, it warns once in development.

## §4 Structures (wrappers, layers, surfaces)

When composition on one element is not enough, the effect declares a structure in the catalogue:

| Code | Structure               | When                                                                                |
| ---- | ----------------------- | ----------------------------------------------------------------------------------- |
| `W`  | wrapper element         | perspective origin, clipping, overflow, a static hit area, exact compound rotations |
| `L`  | duplicated inert layers | folds, flips, glare copies; copies are `aria-hidden` and `inert`                    |
| `S`  | split DOM               | per-character/word/line motion; one accessible copy of the text                     |
| `C`  | canvas/WebGL surface    | real deformation, particles; decorative, accessible content stays in the DOM        |
| `G`  | group                   | stagger/orchestration over children                                                 |

## §5 Priorities and conflicts (planned 009)

Effects register `{ id, channels, priority }` with the registry. Two effects claiming an exclusive
channel on one element produce a development warning naming both; for composable channels, the
priority orders layers only where order matters (e.g. future matrix layers). No silent last-write
wins.

## §6 Timelines and orchestration (planned 012)

A timeline owns its targets' channels for its duration through the same composers; scrubbing writes
values for a progress, never appends layers.
