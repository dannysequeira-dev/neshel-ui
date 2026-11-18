/**
 * Transform composition (contracts/composition.md, ADR 0018 §4).
 *
 * Several effects may move the same element. Instead of each effect writing `transform` (last
 * write wins), JavaScript-driven effects contribute *layers* to the element's motion host (host.ts),
 * which writes one composed `transform` per frame through its style ledger. CSS-driven effects use the individual
 * `translate` / `rotate` / `scale` properties, which the browser applies before `transform`, so
 * both kinds coexist without conflicts.
 *
 * Rules (deterministic and independent of layer order):
 * - translations add (px); rotations add per axis (deg); scales multiply (`scale` with `scaleX`/`scaleY`,
 *   Phase 012, additive; written as `scale(x, y)` only when non-uniform);
 * - `perspective` takes the smallest positive value (the strongest perspective wins);
 * - skews add per axis (deg; Phase 011, additive);
 * - output order: perspective, translate3d, rotateX, rotateY, rotateZ, skew, scale (CSS order);
 * - identity parts are omitted; the identity composition is `"none"`.
 * Summing per-axis rotations is exact for one rotating layer and a close approximation for
 * several small rotations (3D rotations do not commute); documented, not hidden.
 */

export interface TransformLayer {
  /** Perspective distance in px (applied first). */
  perspective?: number;
  translateX?: number;
  translateY?: number;
  translateZ?: number;
  /** Degrees. */
  rotateX?: number;
  rotateY?: number;
  rotateZ?: number;
  /** Degrees (Phase 011, SP11). */
  skewX?: number;
  /** Degrees (Phase 011, SP11). */
  skewY?: number;
  /** Uniform scale factor. */
  scale?: number;
  /** Horizontal scale factor (Phase 012, multiplies with `scale`). */
  scaleX?: number;
  /** Vertical scale factor (Phase 012, multiplies with `scale`). */
  scaleY?: number;
}

const EPSILON = 1e-4;
const round = (value: number) => Math.round(value * 1000) / 1000;
const moved = (value: number) => Math.abs(value) > EPSILON;

export function composeTransform(layers: Iterable<TransformLayer>): string {
  let perspective = Number.POSITIVE_INFINITY;
  let tx = 0;
  let ty = 0;
  let tz = 0;
  let rx = 0;
  let ry = 0;
  let rz = 0;
  let kx = 0;
  let ky = 0;
  let sx = 1;
  let sy = 1;
  for (const layer of layers) {
    if (layer.perspective !== undefined && layer.perspective > 0) {
      perspective = Math.min(perspective, layer.perspective);
    }
    tx += layer.translateX ?? 0;
    ty += layer.translateY ?? 0;
    tz += layer.translateZ ?? 0;
    rx += layer.rotateX ?? 0;
    ry += layer.rotateY ?? 0;
    rz += layer.rotateZ ?? 0;
    kx += layer.skewX ?? 0;
    ky += layer.skewY ?? 0;
    const s = layer.scale ?? 1;
    sx *= s * (layer.scaleX ?? 1);
    sy *= s * (layer.scaleY ?? 1);
  }
  const parts: string[] = [];
  if (moved(tx) || moved(ty) || moved(tz)) {
    parts.push(`translate3d(${round(tx)}px, ${round(ty)}px, ${round(tz)}px)`);
  }
  if (moved(rx)) parts.push(`rotateX(${round(rx)}deg)`);
  if (moved(ry)) parts.push(`rotateY(${round(ry)}deg)`);
  if (moved(rz)) parts.push(`rotateZ(${round(rz)}deg)`);
  if (moved(kx) || moved(ky)) parts.push(`skew(${round(kx)}deg, ${round(ky)}deg)`);
  if (moved(sx - sy)) parts.push(`scale(${round(sx)}, ${round(sy)})`);
  else if (moved(sx - 1)) parts.push(`scale(${round(sx)})`);
  if (!parts.length) return "none";
  // Perspective applies first, and only when something moves.
  if (perspective < Number.POSITIVE_INFINITY) parts.unshift(`perspective(${round(perspective)}px)`);
  return parts.join(" ");
}
