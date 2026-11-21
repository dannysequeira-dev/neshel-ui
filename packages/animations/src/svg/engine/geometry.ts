/**
 * Path geometry (Phase 014; contracts/svg-geometry.md §2, research R8). A pure JavaScript geometry of the
 * normal form: lines exact, quadratic/cubic Béziers by adaptive subdivision, arcs through the centre
 * parameterisation (SVG F.6.5–F.6.6, radii scaled up when too small). Lengths are in user units; the jump
 * between subpaths is not part of the length (like `getTotalLength`). Testable without a browser and checked
 * against native `getTotalLength()`/`getPointAtLength()` in the lab.
 */
import { animationsError } from "../../core/errors.js";
import { type PathCommand, parsePathData } from "./path-data.js";

export interface PathPoint {
  x: number;
  y: number;
  /** Tangent direction in degrees. */
  angle: number;
}

export interface PathGeometry {
  readonly length: number;
  readonly subpaths: readonly { start: number; length: number; closed: boolean }[];
  pointAt(distance: number): PathPoint;
  bounds(): { x: number; y: number; width: number; height: number };
}

interface Segment {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  start: number;
  length: number;
}

const FLATNESS = 0.05;
const MAX_DEPTH = 10;

function cubicPoints(
  out: number[],
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
  depth: number,
): void {
  // Distance of the controls from the chord (flatness test).
  const dx = x3 - x0;
  const dy = y3 - y0;
  const d = Math.hypot(dx, dy) || 1;
  const d1 = Math.abs((x1 - x3) * dy - (y1 - y3) * dx) / d;
  const d2 = Math.abs((x2 - x3) * dy - (y2 - y3) * dx) / d;
  const degenerate = Math.hypot(dx, dy) === 0 && (x1 !== x0 || y1 !== y0 || x2 !== x0 || y2 !== y0);
  if ((d1 + d2 <= FLATNESS && !degenerate) || depth >= MAX_DEPTH) {
    out.push(x3, y3);
    return;
  }
  const x01 = (x0 + x1) / 2,
    y01 = (y0 + y1) / 2;
  const x12 = (x1 + x2) / 2,
    y12 = (y1 + y2) / 2;
  const x23 = (x2 + x3) / 2,
    y23 = (y2 + y3) / 2;
  const xa = (x01 + x12) / 2,
    ya = (y01 + y12) / 2;
  const xb = (x12 + x23) / 2,
    yb = (y12 + y23) / 2;
  const xm = (xa + xb) / 2,
    ym = (ya + yb) / 2;
  cubicPoints(out, x0, y0, x01, y01, xa, ya, xm, ym, depth + 1);
  cubicPoints(out, xm, ym, xb, yb, x23, y23, x3, y3, depth + 1);
}

/** Arc end-point → centre parameterisation (SVG 2 Implementation Notes B.2.4–B.2.5). */
export function arcCenter(
  x1: number,
  y1: number,
  rx: number,
  ry: number,
  angle: number,
  large: boolean,
  sweep: boolean,
  x2: number,
  y2: number,
):
  | { cx: number; cy: number; rx: number; ry: number; phi: number; theta: number; delta: number }
  | undefined {
  if (rx === 0 || ry === 0 || (x1 === x2 && y1 === y2)) return undefined;
  const phi = (angle * Math.PI) / 180;
  const cos = Math.cos(phi);
  const sin = Math.sin(phi);
  const dx = (x1 - x2) / 2;
  const dy = (y1 - y2) / 2;
  const x1p = cos * dx + sin * dy;
  const y1p = -sin * dx + cos * dy;
  let rxs = rx * rx;
  let rys = ry * ry;
  const lambda = (x1p * x1p) / rxs + (y1p * y1p) / rys;
  if (lambda > 1) {
    const s = Math.sqrt(lambda);
    rx *= s;
    ry *= s;
    rxs = rx * rx;
    rys = ry * ry;
  }
  const num = rxs * rys - rxs * y1p * y1p - rys * x1p * x1p;
  const den = rxs * y1p * y1p + rys * x1p * x1p;
  let coef = Math.sqrt(Math.max(0, num / den));
  if (large === sweep) coef = -coef;
  const cxp = (coef * rx * y1p) / ry;
  const cyp = (-coef * ry * x1p) / rx;
  const cx = cos * cxp - sin * cyp + (x1 + x2) / 2;
  const cy = sin * cxp + cos * cyp + (y1 + y2) / 2;
  const ang = (ux: number, uy: number, vx: number, vy: number) =>
    Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
  const theta = ang(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
  let delta = ang((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
  if (!sweep && delta > 0) delta -= 2 * Math.PI;
  if (sweep && delta < 0) delta += 2 * Math.PI;
  return { cx, cy, rx, ry, phi, theta, delta };
}

/** Flatten the normal form into subpaths of points. */
function flatten(commands: readonly PathCommand[]): Array<{ points: number[]; closed: boolean }> {
  const subpaths: Array<{ points: number[]; closed: boolean }> = [];
  let current: { points: number[]; closed: boolean } | undefined;
  let cx = 0;
  let cy = 0;
  let sx = 0;
  let sy = 0;
  const ensure = () => {
    if (!current) {
      current = { points: [cx, cy], closed: false };
      subpaths.push(current);
    }
    return current;
  };
  for (const c of commands) {
    switch (c.type) {
      case "M":
        current = { points: [c.x, c.y], closed: false };
        subpaths.push(current);
        cx = sx = c.x;
        cy = sy = c.y;
        break;
      case "L":
        ensure().points.push(c.x, c.y);
        cx = c.x;
        cy = c.y;
        break;
      case "C":
        cubicPoints(ensure().points, cx, cy, c.x1, c.y1, c.x2, c.y2, c.x, c.y, 0);
        cx = c.x;
        cy = c.y;
        break;
      case "Q": {
        // Exact degree elevation to a cubic.
        const x1 = cx + (2 / 3) * (c.x1 - cx);
        const y1 = cy + (2 / 3) * (c.y1 - cy);
        const x2 = c.x + (2 / 3) * (c.x1 - c.x);
        const y2 = c.y + (2 / 3) * (c.y1 - c.y);
        cubicPoints(ensure().points, cx, cy, x1, y1, x2, y2, c.x, c.y, 0);
        cx = c.x;
        cy = c.y;
        break;
      }
      case "A": {
        const points = ensure().points;
        const arc = arcCenter(cx, cy, c.rx, c.ry, c.angle, c.large, c.sweep, c.x, c.y);
        if (!arc) points.push(c.x, c.y);
        else {
          const steps = Math.max(
            4,
            Math.ceil((Math.abs(arc.delta) * Math.max(arc.rx, arc.ry)) / 2),
            Math.ceil(Math.abs(arc.delta) / (Math.PI / 32)),
          );
          const cos = Math.cos(arc.phi);
          const sin = Math.sin(arc.phi);
          for (let i = 1; i <= steps; i++) {
            const t = arc.theta + (arc.delta * i) / steps;
            const ex = arc.rx * Math.cos(t);
            const ey = arc.ry * Math.sin(t);
            points.push(
              i === steps ? c.x : arc.cx + cos * ex - sin * ey,
              i === steps ? c.y : arc.cy + sin * ex + cos * ey,
            );
          }
        }
        cx = c.x;
        cy = c.y;
        break;
      }
      case "Z": {
        const sub = ensure();
        sub.points.push(sx, sy);
        sub.closed = true;
        cx = sx;
        cy = sy;
        current = undefined;
        break;
      }
    }
  }
  return subpaths;
}

/** Geometry of a path (`d` string or parsed commands). */
export function getPathGeometry(path: string | readonly PathCommand[]): PathGeometry {
  const commands = typeof path === "string" ? parsePathData(path) : path;
  if (!Array.isArray(commands))
    throw animationsError("getPathGeometry", "path must be path data or commands.");
  const subs = flatten(commands);
  const segments: Segment[] = [];
  const subpaths: Array<{ start: number; length: number; closed: boolean }> = [];
  let total = 0;
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const sub of subs) {
    const start = total;
    const p = sub.points;
    for (let i = 0; i < p.length; i += 2) {
      const x = p[i] as number;
      const y = p[i + 1] as number;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      if (i === 0) continue;
      const x0 = p[i - 2] as number;
      const y0 = p[i - 1] as number;
      const length = Math.hypot(x - x0, y - y0);
      if (length === 0) continue;
      segments.push({ x0, y0, x1: x, y1: y, start: total, length });
      total += length;
    }
    subpaths.push({ start, length: total - start, closed: sub.closed });
  }
  const first = subs[0]?.points;
  return {
    length: total,
    subpaths,
    pointAt(distance) {
      if (segments.length === 0) return { x: first?.[0] ?? 0, y: first?.[1] ?? 0, angle: 0 };
      const d = Math.min(total, Math.max(0, Number.isFinite(distance) ? distance : 0));
      let lo = 0;
      let hi = segments.length - 1;
      while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        if ((segments[mid] as Segment).start <= d) lo = mid;
        else hi = mid - 1;
      }
      const s = segments[lo] as Segment;
      const t = Math.min(1, (d - s.start) / s.length);
      return {
        x: s.x0 + (s.x1 - s.x0) * t,
        y: s.y0 + (s.y1 - s.y0) * t,
        angle: (Math.atan2(s.y1 - s.y0, s.x1 - s.x0) * 180) / Math.PI,
      };
    },
    bounds() {
      if (!Number.isFinite(minX)) return { x: 0, y: 0, width: 0, height: 0 };
      return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
    },
  };
}

type Geometric = Element & { getTotalLength?: () => number };

const num = (element: Element, name: string) => {
  const value = Number.parseFloat(element.getAttribute(name) ?? "0");
  return Number.isFinite(value) ? value : 0;
};

/** Path data equivalent of a basic shape (for the JS fallback), or `undefined`. */
export function shapeToPathData(element: Element): string | undefined {
  switch (element.localName) {
    case "path":
      return element.getAttribute("d") ?? "";
    case "line":
      return `M${num(element, "x1")} ${num(element, "y1")}L${num(element, "x2")} ${num(element, "y2")}`;
    case "polyline":
    case "polygon": {
      const values = (element.getAttribute("points") ?? "")
        .trim()
        .split(/[\s,]+/)
        .map(Number)
        .filter(Number.isFinite);
      if (values.length < 2) return "";
      let d = `M${values[0]} ${values[1]}`;
      for (let i = 2; i + 1 < values.length; i += 2) d += `L${values[i]} ${values[i + 1]}`;
      return element.localName === "polygon" ? `${d}Z` : d;
    }
    case "circle":
    case "ellipse": {
      const cx = num(element, "cx");
      const cy = num(element, "cy");
      const rx = element.localName === "circle" ? num(element, "r") : num(element, "rx");
      const ry = element.localName === "circle" ? rx : num(element, "ry");
      // Starts at 3 o'clock, clockwise (SVG 2 pathLength/dash origin of circle/ellipse).
      return `M${cx + rx} ${cy}A${rx} ${ry} 0 0 1 ${cx - rx} ${cy}A${rx} ${ry} 0 0 1 ${cx + rx} ${cy}Z`;
    }
    case "rect": {
      const x = num(element, "x");
      const y = num(element, "y");
      const w = num(element, "width");
      const h = num(element, "height");
      return `M${x} ${y}H${x + w}V${y + h}H${x}Z`;
    }
    default:
      return undefined;
  }
}

/** Length in user units: native `getTotalLength()` when available and finite, else the JS geometry. */
export function measurePath(element: Element): number {
  const native = (element as Geometric).getTotalLength;
  if (typeof native === "function") {
    try {
      const length = native.call(element);
      if (Number.isFinite(length)) return length;
    } catch {
      // Detached or non-rendered geometry in some engines: fall back to the JS geometry.
    }
  }
  const d = shapeToPathData(element);
  if (d === undefined)
    throw animationsError("measurePath", `<${element.localName}> is not an SVG geometry element.`);
  return d.trim() === "" ? 0 : getPathGeometry(d).length;
}

/** The dash unit of an element: its `pathLength` attribute when set, else its measured length. */
export function dashLength(element: Element): number {
  const attr = element.getAttribute("pathLength");
  const value = attr === null ? Number.NaN : Number.parseFloat(attr);
  return Number.isFinite(value) && value > 0 ? value : measurePath(element);
}
