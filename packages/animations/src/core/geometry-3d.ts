/**
 * 3D geometry helpers (Phase 016, internal; research R5–R9, ADR 0031). Pure functions shared by `./advanced` (card
 * flip, cube, ring, hinged fold) and `./gpu` (cylinder page curl, mirrored by the D04 vertex shader). Transforms are
 * returned as Motion Host layers (`TransformLayer`), whose composed order is translate → rotate: a rotation about an
 * axis at depth `−d` (`translateZ(−d) rotateY(θ) translateZ(d)`) is the layer `translate(d·sinθ, 0, d·(cosθ − 1))`
 * + `rotateY(θ)`, so every face/item transform goes through the host and composes with other effects.
 */
import type { TransformLayer } from "./compose.js";

const RAD = Math.PI / 180;
const round = (n: number) => Math.round(n * 1000) / 1000;

export type Axis3D = "x" | "y";

/** Layer of a plane rotated by `deg` about an axis parallel to x or y located `depth` px behind it. */
export function orbitLayer(axis: Axis3D, deg: number, depth: number): TransformLayer {
  const r = deg * RAD;
  if (axis === "y") {
    return {
      translateX: round(depth * Math.sin(r)),
      translateZ: round(depth * (Math.cos(r) - 1)),
      rotateY: round(deg),
    };
  }
  // rotateX(φ) maps (0, 0, d) to (0, −d·sinφ, d·cosφ).
  return {
    translateY: round(-depth * Math.sin(r)),
    translateZ: round(depth * (Math.cos(r) - 1)),
    rotateX: round(deg),
  };
}

/** Ring radius that keeps `count` items of `size` px separated by `gap` px on a circle. */
export function ringRadius(size: number, count: number, gap: number): number {
  if (count < 3) return Math.max(0, size / 2 + gap);
  return (size / 2 + gap / 2) / Math.tan(Math.PI / count);
}

/** Angle (deg) of item `index` relative to the viewer for a ring rotated by `angle` deg. */
export function ringRelative(index: number, count: number, angle: number): number {
  const step = 360 / count;
  let rel = index * step - angle;
  rel = ((((rel + 180) % 360) + 360) % 360) - 180;
  return rel;
}

/** Target angle for `index` closest to `current` (shortest path; targets accumulate past 360°). */
export function shortestRingTarget(current: number, index: number, count: number): number {
  const step = 360 / count;
  const base = index * step;
  const turns = Math.round((current - base) / 360);
  return base + turns * 360;
}

export type Corner = "top-left" | "top-right" | "bottom-left" | "bottom-right";
export const CORNERS: readonly Corner[] = ["top-left", "top-right", "bottom-left", "bottom-right"];

/** Horizontal/vertical signs of a corner (+1 right/bottom, −1 left/top). */
export function cornerSigns(corner: Corner): { sx: 1 | -1; sy: 1 | -1 } {
  return {
    sx: corner.endsWith("right") ? 1 : -1,
    sy: corner.startsWith("bottom") ? 1 : -1,
  };
}

/** The corner of the quadrant that contains a normalised pointer position (−1…1). */
export function cornerOf(x: number, y: number): Corner {
  return `${y > 0 ? "bottom" : "top"}-${x > 0 ? "right" : "left"}` as Corner;
}

export interface FoldGeometry {
  /** `clip-path` of the base (the surface without the corner triangle). */
  base: string;
  /** `clip-path` of the flap (the corner triangle, overlapping the crease by `overlap` px). */
  flap: string;
  /** `transform-origin` of the flap (a point on the crease). */
  origin: string;
  /** `rotate3d()` of the flap for `amount` 0–1. */
  transform: string;
}

/**
 * Hinged fold of a `w`×`h` box at `corner` (008 R7 technique 2): the crease runs from `leg` px along the top/bottom
 * edge to `leg` px along the left/right edge. The flap rotates about the crease by `angle` deg × `amount`; with
 * `recede` the corner moves away from the viewer (negative z), otherwise toward it. Derivation: for a corner with
 * signs (sx, sy), axis a = (sx, −sy, 0)/√2 and the corner offset v = (sx·leg, 0, 0) from the origin, Rodrigues gives
 * z = sx·sy·leg/√2 · sin θ, so θ = −sx·sy·angle recedes.
 */
export function foldGeometry(
  corner: Corner,
  w: number,
  h: number,
  leg: number,
  angle: number,
  amount: number,
  recede: boolean,
  overlap = 0.75,
): FoldGeometry {
  const { sx, sy } = cornerSigns(corner);
  const cx = sx > 0 ? w : 0;
  const cy = sy > 0 ? h : 0;
  const p = (x: number, y: number) => `${round(x)}px ${round(y)}px`;
  const p1 = { x: cx - sx * leg, y: cy }; // on the horizontal edge
  const p2 = { x: cx, y: cy - sy * leg }; // on the vertical edge
  // Base polygon: the rectangle clockwise from top-left, the corner replaced by the crease.
  const rect: Record<Corner, [number, number]> = {
    "top-left": [0, 0],
    "top-right": [w, 0],
    "bottom-right": [w, h],
    "bottom-left": [0, h],
  };
  const order: Corner[] = ["top-left", "top-right", "bottom-right", "bottom-left"];
  const points: string[] = [];
  for (const c of order) {
    if (c !== corner) {
      points.push(p(rect[c][0], rect[c][1]));
      continue;
    }
    // Clockwise: entering the corner along the horizontal edge for top corners, along the vertical edge for
    // bottom corners.
    const clockwiseFirst = corner === "top-right" || corner === "bottom-left" ? [p1, p2] : [p2, p1];
    for (const q of clockwiseFirst) points.push(p(q.x, q.y));
  }
  const e = leg + overlap;
  const f1 = { x: cx - sx * e, y: cy };
  const f2 = { x: cx, y: cy - sy * e };
  const theta = (recede ? -1 : 1) * sx * sy * angle * amount;
  return {
    base: `polygon(${points.join(", ")})`,
    flap: `polygon(${p(f1.x, f1.y)}, ${p(cx, cy)}, ${p(f2.x, f2.y)})`,
    origin: `${round(p1.x)}px ${round(p1.y)}px`,
    transform: `rotate3d(${sx}, ${-sy}, 0, ${round(theta)}deg)`,
  };
}

/** Depth (px, negative = away) of the corner point after the fold (tests and diagnostics). */
export function foldCornerDepth(
  corner: Corner,
  leg: number,
  angle: number,
  amount: number,
  recede: boolean,
): number {
  const { sx, sy } = cornerSigns(corner);
  const theta = (recede ? -1 : 1) * sx * sy * angle * amount * RAD;
  return round(((sx * sy * leg) / Math.SQRT2) * Math.sin(theta));
}

/** Start corner → unit direction pointing into the page (D04). */
export function curlDirection(corner: Corner, w: number, h: number): { x: number; y: number } {
  const { sx, sy } = cornerSigns(corner);
  const len = Math.hypot(w, h) || 1;
  return { x: (-sx * w) / len, y: (-sy * h) / len };
}

/**
 * Cylinder page curl of point (x, y) (D04, research R8; mirrored by the vertex shader). `s` is the distance of the
 * fold line from the start corner along `dir`; `r` the cylinder radius. Returns the displaced point, its height and
 * the z component of its normal (front side). Continuous in position and slope at both seams.
 */
export function curlPoint(
  x: number,
  y: number,
  corner: { x: number; y: number },
  dir: { x: number; y: number },
  s: number,
  r: number,
): { x: number; y: number; z: number; nz: number } {
  const u = (x - corner.x) * dir.x + (y - corner.y) * dir.y;
  const t = s - u;
  if (t <= 0) return { x, y, z: 0, nz: 1 };
  let u2: number;
  let z: number;
  let nz: number;
  if (t < Math.PI * r) {
    const th = t / r;
    u2 = s - r * Math.sin(th);
    z = r * (1 - Math.cos(th));
    nz = Math.cos(th);
  } else {
    u2 = s + (t - Math.PI * r);
    z = 2 * r;
    nz = -1;
  }
  return { x: x + dir.x * (u2 - u), y: y + dir.y * (u2 - u), z, nz };
}
