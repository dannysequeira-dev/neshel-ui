/**
 * Path morph policy (Phase 014; contracts/svg-geometry.md §3, research R9). Both paths are parsed into the
 * exact normal form; `normalize: "exact"` (default) requires the same command sequence, `"cubic"` first
 * promotes `L` and `Q` to `C` (exact degree elevation — geometry unchanged). No resampling, insertion,
 * reordering or reversal. Arc flags must match. Incompatible pairs are reported (never interpolated blindly).
 */
import { animationsError } from "../../core/errors.js";
import { mix } from "../../core/interpolate.js";
import { type PathCommand, parsePathData, serializePathData } from "./path-data.js";

export interface MorphOptions {
  /** `"exact"` (default) or `"cubic"` (lines and quadratics promoted to cubics). */
  normalize?: "exact" | "cubic";
  /** Output decimals 0–6 (default 3). */
  precision?: number;
}

export type MorphCompatibility =
  | { compatible: true }
  | { compatible: false; reason: string; index: number };

/** Promote L and Q to C (exact), keeping M, A, Z. */
export function promoteToCubic(commands: readonly PathCommand[]): PathCommand[] {
  const out: PathCommand[] = [];
  let cx = 0;
  let cy = 0;
  let sx = 0;
  let sy = 0;
  for (const c of commands) {
    if (c.type === "L") {
      out.push({
        type: "C",
        x1: mix(cx, c.x, 1 / 3),
        y1: mix(cy, c.y, 1 / 3),
        x2: mix(cx, c.x, 2 / 3),
        y2: mix(cy, c.y, 2 / 3),
        x: c.x,
        y: c.y,
      });
    } else if (c.type === "Q") {
      out.push({
        type: "C",
        x1: cx + (2 / 3) * (c.x1 - cx),
        y1: cy + (2 / 3) * (c.y1 - cy),
        x2: c.x + (2 / 3) * (c.x1 - c.x),
        y2: c.y + (2 / 3) * (c.y1 - c.y),
        x: c.x,
        y: c.y,
      });
    } else out.push(c);
    if (c.type === "M") {
      sx = c.x;
      sy = c.y;
    }
    if (c.type === "Z") {
      cx = sx;
      cy = sy;
    } else {
      cx = c.x;
      cy = c.y;
    }
  }
  return out;
}

function prepare(d: string, normalize: "exact" | "cubic"): PathCommand[] {
  const commands = parsePathData(d);
  return normalize === "cubic" ? promoteToCubic(commands) : commands;
}

function compare(a: readonly PathCommand[], b: readonly PathCommand[]): MorphCompatibility {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const x = a[i] as PathCommand;
    const y = b[i] as PathCommand;
    if (x.type !== y.type)
      return { compatible: false, reason: `command ${i}: ${x.type} vs ${y.type}`, index: i };
    if (x.type === "A" && y.type === "A" && (x.large !== y.large || x.sweep !== y.sweep)) {
      return { compatible: false, reason: `command ${i}: arc flags differ`, index: i };
    }
  }
  if (a.length !== b.length) {
    return {
      compatible: false,
      reason: `command count differs (${a.length} vs ${b.length})`,
      index: n,
    };
  }
  if (a.length === 0) return { compatible: false, reason: "empty path", index: 0 };
  return { compatible: true };
}

function resolve(options: MorphOptions | undefined): {
  normalize: "exact" | "cubic";
  precision: number;
} {
  const normalize = options?.normalize ?? "exact";
  if (normalize !== "exact" && normalize !== "cubic") {
    throw animationsError("interpolatePath", `invalid normalize ${JSON.stringify(normalize)}.`);
  }
  const precision = options?.precision ?? 3;
  if (!Number.isInteger(precision) || precision < 0 || precision > 6) {
    throw animationsError("interpolatePath", "precision must be an integer from 0 to 6.");
  }
  return { normalize, precision };
}

/** Whether two paths can be morphed under the policy (parse errors propagate). */
export function getPathMorphCompatibility(
  from: string,
  to: string,
  options?: MorphOptions,
): MorphCompatibility {
  const { normalize } = resolve(options);
  return compare(prepare(from, normalize), prepare(to, normalize));
}

function lerp(a: PathCommand, b: PathCommand, t: number): PathCommand {
  switch (a.type) {
    case "M":
    case "L": {
      const o = b as typeof a;
      return { type: a.type, x: mix(a.x, o.x, t), y: mix(a.y, o.y, t) };
    }
    case "C": {
      const o = b as typeof a;
      return {
        type: "C",
        x1: mix(a.x1, o.x1, t),
        y1: mix(a.y1, o.y1, t),
        x2: mix(a.x2, o.x2, t),
        y2: mix(a.y2, o.y2, t),
        x: mix(a.x, o.x, t),
        y: mix(a.y, o.y, t),
      };
    }
    case "Q": {
      const o = b as typeof a;
      return {
        type: "Q",
        x1: mix(a.x1, o.x1, t),
        y1: mix(a.y1, o.y1, t),
        x: mix(a.x, o.x, t),
        y: mix(a.y, o.y, t),
      };
    }
    case "A": {
      const o = b as typeof a;
      return {
        type: "A",
        rx: mix(a.rx, o.rx, t),
        ry: mix(a.ry, o.ry, t),
        angle: mix(a.angle, o.angle, t),
        large: a.large,
        sweep: a.sweep,
        x: mix(a.x, o.x, t),
        y: mix(a.y, o.y, t),
      };
    }
    default:
      return a;
  }
}

/** Compiled interpolation between compatible commands. */
export function interpolateCommands(
  a: readonly PathCommand[],
  b: readonly PathCommand[],
  precision = 3,
): (t: number) => string {
  const check = compare(a, b);
  if (!check.compatible)
    throw animationsError("interpolatePath", `incompatible paths — ${check.reason}.`);
  const start = serializePathData(a, precision);
  const end = serializePathData(b, precision);
  return (t) => {
    const p = Math.min(1, Math.max(0, Number.isFinite(t) ? t : 0));
    if (p === 0) return start;
    if (p === 1) return end;
    return serializePathData(
      a.map((c, i) => lerp(c, b[i] as PathCommand, p)),
      precision,
    );
  };
}

/** `t ↦ d` between two compatible paths; throws `NeshelAnimationsError` naming the first mismatch. */
export function interpolatePath(
  from: string,
  to: string,
  options?: MorphOptions,
): (t: number) => string {
  const { normalize, precision } = resolve(options);
  return interpolateCommands(prepare(from, normalize), prepare(to, normalize), precision);
}

export function prepareMorphCommands(d: string, normalize: "exact" | "cubic"): PathCommand[] {
  return prepare(d, normalize);
}

export function lerpCommands(
  a: readonly PathCommand[],
  b: readonly PathCommand[],
  t: number,
): PathCommand[] {
  return a.map((c, i) => lerp(c, b[i] as PathCommand, t));
}
