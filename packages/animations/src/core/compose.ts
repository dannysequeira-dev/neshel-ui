/**
 * Transform composition (contracts/composition.md, ADR 0018 §4).
 *
 * Several effects may move the same element. Instead of each effect writing `transform` (last
 * write wins), JavaScript-driven effects contribute *layers* to the element's composer, which
 * writes one composed `transform` in the write phase. CSS-driven effects use the individual
 * `translate` / `rotate` / `scale` properties, which the browser applies before `transform`, so
 * both kinds coexist without conflicts.
 *
 * Rules (deterministic and independent of layer order):
 * - translations add (px); rotations add per axis (deg); scales multiply;
 * - `perspective` takes the smallest positive value (the strongest perspective wins);
 * - output order: perspective, translate3d, rotateX, rotateY, rotateZ, scale;
 * - identity parts are omitted; the identity composition is `"none"`.
 * Summing per-axis rotations is exact for one rotating layer and a close approximation for
 * several small rotations (3D rotations do not commute); documented, not hidden.
 */
import { type FrameScheduler, getFrameScheduler } from "./scheduler.js";

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
  /** Uniform scale factor. */
  scale?: number;
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
  let scale = 1;
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
    scale *= layer.scale ?? 1;
  }
  if (![tx, ty, tz, rx, ry, rz, scale - 1].some(moved)) return "none";
  const parts: string[] = [];
  if (Number.isFinite(perspective)) parts.push(`perspective(${round(perspective)}px)`);
  if (moved(tx) || moved(ty) || moved(tz)) {
    parts.push(`translate3d(${round(tx)}px, ${round(ty)}px, ${round(tz)}px)`);
  }
  if (moved(rx)) parts.push(`rotateX(${round(rx)}deg)`);
  if (moved(ry)) parts.push(`rotateY(${round(ry)}deg)`);
  if (moved(rz)) parts.push(`rotateZ(${round(rz)}deg)`);
  if (moved(scale - 1)) parts.push(`scale(${round(scale)})`);
  return parts.join(" ");
}

export interface TransformComposer {
  /** Add or replace the layer owned by `key`; the style write happens in the next write phase. */
  set(key: symbol, layer: TransformLayer): void;
  /** Remove the layer owned by `key`. */
  delete(key: symbol): void;
  /** Number of active layers. */
  readonly size: number;
}

/** Anything with an inline style declaration (an `HTMLElement` or `SVGElement`). */
export type StyledElement = { readonly style: CSSStyleDeclaration };

const composers = new WeakMap<object, TransformComposer>();

/**
 * The single composer of `element` (one per element, held weakly). It owns
 * `element.style.transform` and `will-change` while at least one layer is active; with no layer
 * left both inline properties are removed, so the element's own stylesheet transform applies again.
 */
export function getTransformComposer(
  element: StyledElement,
  scheduler: FrameScheduler = getFrameScheduler(),
): TransformComposer {
  const existing = composers.get(element);
  if (existing) return existing;
  const layers = new Map<symbol, TransformLayer>();
  let scheduled = false;
  let owns = false;

  const write = () => {
    scheduled = false;
    const value = composeTransform(layers.values());
    if (value === "none") {
      if (owns) {
        element.style.removeProperty("transform");
        element.style.removeProperty("will-change");
        owns = false;
      }
    } else {
      if (!owns && element.style.transform !== "") {
        devWarnOnce(
          "composer-inline-transform",
          "an element animated by a JavaScript effect already has an inline `transform`; the effect replaces it while active. Move that transform to a wrapper element or use the individual `translate`/`rotate`/`scale` properties.",
        );
      }
      element.style.transform = value;
      element.style.willChange = "transform";
      owns = true;
    }
  };
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    scheduler.schedule(write, "write");
  };

  const composer: TransformComposer = {
    set(key, layer) {
      layers.set(key, layer);
      schedule();
    },
    delete(key) {
      if (!layers.delete(key)) return;
      schedule();
    },
    get size() {
      return layers.size;
    },
  };
  composers.set(element, composer);
  return composer;
}

const warned = new Set<string>();
function devWarnOnce(key: string, message: string): void {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process
    ?.env;
  if (env?.NODE_ENV === "production" || warned.has(key)) return;
  warned.add(key);
  console.warn(`[@neshel-ui/animations] ${message}`);
}
