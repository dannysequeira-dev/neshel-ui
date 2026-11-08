// Font metrics → Capsize constants and fallback font faces (feature 004, research S1/R10–R13,
// contracts/typography-css.md §1). Pure apart from calling @capsizecss/core.
import { createFontStack } from "@capsizecss/core";
import { defaults, type FontMetrics, type FontRole } from "@neshel-ui/config";
import { type Diagnostic, describeValue } from "./diagnostics.js";

export const fontRoles: readonly FontRole[] = ["body", "display", "mono"];

/** Cap height ÷ units-per-em of the reference font (Inter); tokens are sized for it (R10). */
export const REFERENCE_CAP_HEIGHT = 1490 / 2048;

const NUMERIC_KEYS = ["capHeight", "ascent", "descent", "lineGap", "unitsPerEm"] as const;
const OPTIONAL_NUMERIC = ["xHeight", "xWidthAvg"] as const;
const STRING_KEYS = ["familyName", "fullName", "postscriptName", "category"] as const;
export const METRIC_KEYS: readonly string[] = [
  ...NUMERIC_KEYS,
  ...OPTIONAL_NUMERIC,
  ...STRING_KEYS,
  "subsets",
];

export interface FontConstants {
  readonly scale: number;
  readonly capTrim: number;
  readonly baselineTrim: number;
  readonly trim: 0 | 1;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Round to 6 decimals; `-0` becomes `0`. */
export function round6(value: number): number {
  const rounded = Math.round(value * 1e6) / 1e6;
  return Object.is(rounded, -0) ? 0 : rounded;
}

/** Shortest decimal representation without exponent (inputs are small, rounded numbers). */
export function formatNumber(value: number): string {
  return String(round6(value));
}

/** Diagnostics for one metrics object at `path` (Capsize format). */
export function validateMetrics(value: unknown, path: string): Diagnostic[] {
  const out: Diagnostic[] = [];
  if (!isRecord(value)) {
    out.push({
      severity: "error",
      code: "invalid-type",
      path,
      message: `Expected a font metrics object; received ${describeValue(value)}.`,
    });
    return out;
  }
  for (const key of Object.keys(value)) {
    if (!METRIC_KEYS.includes(key)) {
      out.push({
        severity: "error",
        code: "unknown-key",
        path: `${path}.${key}`,
        message: `Unknown key "${key}". Allowed: ${METRIC_KEYS.join(", ")}.`,
      });
    }
  }
  const number = (key: string, required: boolean, positive: boolean) => {
    const item = value[key];
    if (item === undefined && !required) return;
    if (typeof item !== "number" || !Number.isFinite(item) || (positive && item <= 0)) {
      out.push({
        severity: "error",
        code: "invalid-metrics",
        path: `${path}.${key}`,
        message: `Expected a finite number${positive ? " greater than 0" : ""}; received ${describeValue(item)}.`,
      });
    }
  };
  number("capHeight", true, true);
  number("ascent", true, false);
  number("descent", true, false);
  number("lineGap", true, false);
  number("unitsPerEm", true, true);
  for (const key of OPTIONAL_NUMERIC) number(key, false, true);
  for (const key of STRING_KEYS) {
    const item = value[key];
    if (
      item !== undefined &&
      (typeof item !== "string" || item.trim() === "" || /[;{}"\\]/.test(item))
    ) {
      out.push({
        severity: "error",
        code: "invalid-metrics",
        path: `${path}.${key}`,
        message: `Expected a non-empty name without ; { } " or \\; received ${describeValue(item)}.`,
      });
    }
  }
  if (value.subsets !== undefined && !isRecord(value.subsets)) {
    out.push({
      severity: "error",
      code: "invalid-metrics",
      path: `${path}.subsets`,
      message: `Expected an object; received ${describeValue(value.subsets)}.`,
    });
  }
  return out;
}

/** Capsize constants of a font (S1); without metrics: scale 1, no trimming. */
export function fontConstants(metrics: FontMetrics | undefined): FontConstants {
  if (!metrics) return { scale: 1, capTrim: 0, baselineTrim: 0, trim: 0 };
  const em = metrics.unitsPerEm;
  const cap = metrics.capHeight / em;
  const ascent = metrics.ascent / em;
  const descent = Math.abs(metrics.descent) / em;
  return {
    scale: round6(REFERENCE_CAP_HEIGHT / cap),
    capTrim: round6((ascent - descent) / 2 - cap),
    baselineTrim: round6((descent - ascent) / 2),
    trim: 1,
  };
}

/** First family of a serialised stack without quotes (`"Source Sans 3", serif` → `Source Sans 3`). */
export function firstFamily(stack: string): string {
  const first = stack.split(",")[0]?.trim() ?? "";
  return first.replace(/^["']|["']$/g, "");
}

export interface ResolvedFont {
  readonly role: FontRole;
  /** Final `font-family` value, including Capsize fallback families. */
  readonly stack: string;
  readonly metrics?: FontMetrics;
  readonly constants: FontConstants;
  /** Capsize `@font-face` rules (CSS text), empty without fallbacks. */
  readonly fontFaces: string;
}

/**
 * Effective metrics of a role: configured metrics; else the default metrics when the family is
 * the default one; else none (a custom family must bring its own metrics).
 */
export function effectiveMetrics(
  role: FontRole,
  families: Partial<Record<FontRole, unknown>> | undefined,
  metrics: Partial<Record<FontRole, FontMetrics>> | undefined,
): FontMetrics | undefined {
  if (metrics?.[role]) return metrics[role];
  if (families?.[role] !== undefined) return undefined;
  return defaults.typography.metrics[role];
}

/** Resolve one role: constants plus optional Capsize fallback stack. */
export function resolveFont(
  role: FontRole,
  stack: string,
  metrics: FontMetrics | undefined,
  fallbacks: readonly FontMetrics[] | undefined,
): ResolvedFont {
  const constants = fontConstants(metrics);
  if (!metrics || !fallbacks || fallbacks.length === 0) {
    return { role, stack, metrics, constants, fontFaces: "" };
  }
  const familyName = metrics.familyName ?? firstFamily(stack);
  const primary = {
    familyName,
    ascent: metrics.ascent,
    descent: metrics.descent,
    lineGap: metrics.lineGap,
    unitsPerEm: metrics.unitsPerEm,
    xWidthAvg: metrics.xWidthAvg ?? 0,
    ...(metrics.subsets ? { subsets: metrics.subsets as never } : {}),
  };
  const others = fallbacks.map((fallback) => ({
    familyName: fallback.familyName ?? "",
    ...(fallback.fullName ? { fullName: fallback.fullName } : {}),
    ...(fallback.postscriptName ? { postscriptName: fallback.postscriptName } : {}),
    ascent: fallback.ascent,
    descent: fallback.descent,
    lineGap: fallback.lineGap,
    unitsPerEm: fallback.unitsPerEm,
    xWidthAvg: fallback.xWidthAvg ?? 0,
    ...(fallback.subsets ? { subsets: fallback.subsets as never } : {}),
  }));
  const result = createFontStack([primary, ...others], { fontFaceFormat: "styleObject" });
  const names = result.fontFaces.map((face) => String(face["@font-face"].fontFamily));
  const rest = stack
    .split(",")
    .slice(1)
    .map((part) => part.trim())
    .filter(Boolean);
  const first = stack.split(",")[0]?.trim() ?? familyName;
  const fontFaces = result.fontFaces
    .map(({ "@font-face": face }) => {
      const lines = Object.entries(face)
        .map(
          ([property, value]) =>
            `  ${property.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}: ${value};`,
        )
        .join("\n");
      return `@font-face {\n${lines}\n}`;
    })
    .join("\n\n");
  return { role, stack: [first, ...names, ...rest].join(", "), metrics, constants, fontFaces };
}

/** Problems with fallbacks for a role whose effective metrics are `primary`. */
export function validateFallbacks(value: unknown, path: string, primary: unknown): Diagnostic[] {
  const out: Diagnostic[] = [];
  if (!Array.isArray(value)) {
    out.push({
      severity: "error",
      code: "invalid-fallbacks",
      path,
      message: `Expected an array of font metrics; received ${describeValue(value)}.`,
    });
    return out;
  }
  if (value.length > 0 && (!isRecord(primary) || typeof primary.xWidthAvg !== "number")) {
    out.push({
      severity: "error",
      code: "invalid-fallbacks",
      path,
      message:
        "Fallback fonts need the role's primary metrics with xWidthAvg (Capsize metrics from @capsizecss/metrics include it).",
    });
  }
  value.forEach((entry, index) => {
    const entryPath = `${path}.${index}`;
    const problems = validateMetrics(entry, entryPath);
    out.push(...problems);
    if (problems.length > 0 || !isRecord(entry)) return;
    if (typeof entry.familyName !== "string" || typeof entry.xWidthAvg !== "number") {
      out.push({
        severity: "error",
        code: "invalid-fallbacks",
        path: entryPath,
        message:
          "Fallback metrics need familyName and xWidthAvg (used for local() and size-adjust).",
      });
    }
  });
  return out;
}
