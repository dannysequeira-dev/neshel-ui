/**
 * SVG path data (Phase 014; contracts/svg-geometry.md §1, research R8–R9). SVG 2 grammar — absolute and
 * relative commands, implicit repetition, compact numbers (`1.5.5`, `-1-2`, `1e-3`) and packed arc flags —
 * parsed into the EXACT normal form: absolute coordinates, `H`/`V` → `L`, `S` → `C`, `T` → `Q` (reflected
 * controls). The geometry is unchanged; only the spelling is. Invalid data fails with the character offset.
 */
import { animationsError } from "../../core/errors.js";

export type PathCommand =
  | { type: "M" | "L"; x: number; y: number }
  | { type: "C"; x1: number; y1: number; x2: number; y2: number; x: number; y: number }
  | { type: "Q"; x1: number; y1: number; x: number; y: number }
  | {
      type: "A";
      rx: number;
      ry: number;
      angle: number;
      large: boolean;
      sweep: boolean;
      x: number;
      y: number;
    }
  | { type: "Z" };

const ARITY: Record<string, number> = {
  M: 2,
  L: 2,
  H: 1,
  V: 1,
  C: 6,
  S: 4,
  Q: 4,
  T: 2,
  A: 7,
  Z: 0,
};
const NUMBER = /[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/y;
const SPACE = /[\s,]*/y;

function fail(message: string, offset: number): never {
  throw animationsError("parsePathData", `${message} at offset ${offset}.`);
}

/** Parse path data into the exact normal form (contracts/svg-geometry.md §1). */
export function parsePathData(d: string): PathCommand[] {
  if (typeof d !== "string") throw animationsError("parsePathData", "path data must be a string.");
  const out: PathCommand[] = [];
  let i = 0;
  const skip = () => {
    SPACE.lastIndex = i;
    SPACE.exec(d);
    i = SPACE.lastIndex;
  };
  const number = (): number => {
    skip();
    NUMBER.lastIndex = i;
    const match = NUMBER.exec(d);
    if (!match) fail("expected a number", i);
    const value = Number(match[0]);
    if (!Number.isFinite(value)) fail(`non-finite number ${match[0]}`, i);
    i = NUMBER.lastIndex;
    return value;
  };
  const flag = (): boolean => {
    skip();
    const char = d[i];
    if (char !== "0" && char !== "1") fail("expected an arc flag (0 or 1)", i);
    i++;
    return char === "1";
  };
  let cx = 0;
  let cy = 0;
  let sx = 0;
  let sy = 0;
  let lastC: [number, number] | undefined; // last cubic control (for S)
  let lastQ: [number, number] | undefined; // last quadratic control (for T)
  let command = "";
  skip();
  if (i < d.length && !/[Mm]/.test(d[i] as string)) fail("path data must start with a move", i);
  while (true) {
    skip();
    if (i >= d.length) break;
    const char = d[i] as string;
    if (/[A-Za-z]/.test(char)) {
      if (!(char.toUpperCase() in ARITY)) fail(`unknown command "${char}"`, i);
      command = char;
      i++;
    } else if (!command) fail("expected a command", i);
    else if (command === "Z" || command === "z") fail("unexpected number after Z", i);
    const upper = command.toUpperCase();
    const relative = command !== upper && out.length > 0;
    const ox = relative ? cx : 0;
    const oy = relative ? cy : 0;
    let nextC: [number, number] | undefined;
    let nextQ: [number, number] | undefined;
    switch (upper) {
      case "M": {
        const x = number() + ox;
        const y = number() + oy;
        out.push({ type: "M", x, y });
        cx = sx = x;
        cy = sy = y;
        // Implicit repetition after a move is a line.
        command = command === "m" ? "l" : "L";
        break;
      }
      case "L": {
        const x = number() + ox;
        const y = number() + oy;
        out.push({ type: "L", x, y });
        cx = x;
        cy = y;
        break;
      }
      case "H": {
        const x = number() + ox;
        out.push({ type: "L", x, y: cy });
        cx = x;
        break;
      }
      case "V": {
        const y = number() + oy;
        out.push({ type: "L", x: cx, y });
        cy = y;
        break;
      }
      case "C": {
        const x1 = number() + ox;
        const y1 = number() + oy;
        const x2 = number() + ox;
        const y2 = number() + oy;
        const x = number() + ox;
        const y = number() + oy;
        out.push({ type: "C", x1, y1, x2, y2, x, y });
        nextC = [x2, y2];
        cx = x;
        cy = y;
        break;
      }
      case "S": {
        const x1 = lastC ? 2 * cx - lastC[0] : cx;
        const y1 = lastC ? 2 * cy - lastC[1] : cy;
        const x2 = number() + ox;
        const y2 = number() + oy;
        const x = number() + ox;
        const y = number() + oy;
        out.push({ type: "C", x1, y1, x2, y2, x, y });
        nextC = [x2, y2];
        cx = x;
        cy = y;
        break;
      }
      case "Q": {
        const x1 = number() + ox;
        const y1 = number() + oy;
        const x = number() + ox;
        const y = number() + oy;
        out.push({ type: "Q", x1, y1, x, y });
        nextQ = [x1, y1];
        cx = x;
        cy = y;
        break;
      }
      case "T": {
        const x1 = lastQ ? 2 * cx - lastQ[0] : cx;
        const y1 = lastQ ? 2 * cy - lastQ[1] : cy;
        const x = number() + ox;
        const y = number() + oy;
        out.push({ type: "Q", x1, y1, x, y });
        nextQ = [x1, y1];
        cx = x;
        cy = y;
        break;
      }
      case "A": {
        const rx = Math.abs(number());
        const ry = Math.abs(number());
        const angle = number();
        const large = flag();
        const sweep = flag();
        const x = number() + ox;
        const y = number() + oy;
        out.push({ type: "A", rx, ry, angle, large, sweep, x, y });
        cx = x;
        cy = y;
        break;
      }
      case "Z": {
        out.push({ type: "Z" });
        cx = sx;
        cy = sy;
        break;
      }
    }
    lastC = nextC;
    lastQ = nextQ;
  }
  return out;
}

const fmt = (value: number, precision: number) => {
  const factor = 10 ** precision;
  const rounded = Math.round(value * factor) / factor;
  return String(Object.is(rounded, -0) ? 0 : rounded);
};

/** Serialise commands (absolute) rounded to `precision` decimals (0–6, default 3). */
export function serializePathData(commands: readonly PathCommand[], precision = 3): string {
  if (!Number.isInteger(precision) || precision < 0 || precision > 6) {
    throw animationsError("serializePathData", "precision must be an integer from 0 to 6.");
  }
  const n = (value: number) => fmt(value, precision);
  return commands
    .map((c) => {
      switch (c.type) {
        case "M":
        case "L":
          return `${c.type}${n(c.x)} ${n(c.y)}`;
        case "C":
          return `C${n(c.x1)} ${n(c.y1)} ${n(c.x2)} ${n(c.y2)} ${n(c.x)} ${n(c.y)}`;
        case "Q":
          return `Q${n(c.x1)} ${n(c.y1)} ${n(c.x)} ${n(c.y)}`;
        case "A":
          return `A${n(c.rx)} ${n(c.ry)} ${n(c.angle)} ${c.large ? 1 : 0} ${c.sweep ? 1 : 0} ${n(c.x)} ${n(c.y)}`;
        default:
          return "Z";
      }
    })
    .join("");
}
