// The only module that imports colorjs.io (ADR 0007). Only sRGB, HSL and OKLCH are registered,
// and a syntax allowlist runs first because Color.js also accepts named colours.
import {
  ColorSpace,
  contrastWCAG21,
  HSL,
  inGamut,
  OKLCH,
  type PlainColorObject,
  parse,
  sRGB,
  to,
  toGamut,
} from "colorjs.io/fn";

ColorSpace.register(sRGB);
ColorSpace.register(HSL);
ColorSpace.register(OKLCH);

const HEX = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const FUNCTION = /^(?:rgba?|hsla?|oklch)\(\s*[^()]*\)$/i;

export type ColourProblem = "unsupported-color-syntax" | "invalid-color";

export interface ParsedColour {
  readonly authored: string;
  readonly opaque: boolean;
  readonly inSrgbGamut: boolean;
  /** Gamut-mapped sRGB colour used for contrast. */
  readonly srgb: PlainColorObject;
}

export type ColourResult =
  | { readonly ok: true; readonly colour: ParsedColour }
  | { readonly ok: false; readonly problem: ColourProblem };

/** Whether a string uses one of the accepted colour syntaxes (before parsing). */
export function isAllowedSyntax(value: string): boolean {
  const trimmed = value.trim();
  return HEX.test(trimmed) || (FUNCTION.test(trimmed) && !/\bfrom\b/i.test(trimmed));
}

/** Parse an authored colour string. */
export function parseColour(value: string): ColourResult {
  if (!isAllowedSyntax(value)) return { ok: false, problem: "unsupported-color-syntax" };
  let parsed: ReturnType<typeof parse>;
  try {
    parsed = parse(value.trim());
  } catch {
    return { ok: false, problem: "invalid-color" };
  }
  const srgb = to(parsed, "srgb");
  if (srgb.coords.some((coord) => !Number.isFinite(coord))) {
    return { ok: false, problem: "invalid-color" };
  }
  const alpha = parsed.alpha;
  return {
    ok: true,
    colour: {
      authored: value.trim(),
      opaque: typeof alpha === "number" && alpha >= 1,
      inSrgbGamut: inGamut(srgb),
      srgb: toGamut(srgb, { method: "css" }),
    },
  };
}

/** WCAG 2.1 contrast ratio between two parsed colours. */
export function contrastRatio(a: ParsedColour, b: ParsedColour): number {
  return contrastWCAG21(a.srgb, b.srgb);
}

/** Normalised emitted form: trimmed, hex lower-cased; functions kept as authored. */
export function normaliseColour(value: string): string {
  const trimmed = value.trim();
  return trimmed.startsWith("#") ? trimmed.toLowerCase() : trimmed;
}
