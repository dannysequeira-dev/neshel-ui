// Breakpoint validation and resolution (feature 004, contracts/breakpoints.md, research R2).
// Pure: no I/O. Validation reports every problem; resolution assumes validated input.
import { defaults } from "@neshel-ui/config";
import { type Diagnostic, describeValue } from "./diagnostics.js";

export const NAME = /^[a-z][A-Za-z0-9]*$/;
export const MAX_NAME_LENGTH = 24;
export const MAX_BREAKPOINTS = 12;
export const MAX_WIDTH_REM = 320;
const WIDTH = /^(?:0|[1-9]\d*)(?:\.\d{1,4})?rem$/;

/** Names that would be ambiguous in class names, unsafe as object keys, or clash with Tailwind. */
export const RESERVED_NAMES: readonly string[] = [
  "base",
  // first segment of every responsive class key (layout and typography)
  "align",
  "cols",
  "d",
  "dir",
  "fw",
  "gap",
  "justify",
  "mw",
  "pi",
  "text",
  // JavaScript prototype members
  "constructor",
  "hasOwnProperty",
  "prototype",
  "toString",
  "valueOf",
  // Tailwind CSS v4 built-in variants
  "active",
  "contrast",
  "dark",
  "disabled",
  "even",
  "first",
  "focus",
  "forced",
  "group",
  "has",
  "hover",
  "inert",
  "landscape",
  "last",
  "ltr",
  "max",
  "min",
  "motion",
  "not",
  "odd",
  "open",
  "peer",
  "portrait",
  "print",
  "rtl",
  "starting",
  "visited",
];

export interface ResolvedBreakpoint {
  readonly name: string;
  /** Width as written, e.g. "48rem". */
  readonly width: string;
  readonly rem: number;
  readonly source: "default" | "config";
}

export interface ResolvedBreakpoints {
  readonly mode: "extend" | "replace";
  /** Ascending by width; `base` is implicit and not listed. */
  readonly list: readonly ResolvedBreakpoint[];
  readonly tailwind: boolean;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const defaultBreakpoints: readonly ResolvedBreakpoint[] = Object.entries(
  defaults.breakpoints,
).map(([name, width]) => ({ name, width, rem: Number.parseFloat(width), source: "default" }));

/** Structural and semantic diagnostics for `breakpoints` (the value is known to be present). */
export function validateBreakpoints(value: unknown): Diagnostic[] {
  const out: Diagnostic[] = [];
  const error = (code: Diagnostic["code"], path: string, message: string) =>
    out.push({ severity: "error", code, path, message });
  if (!isRecord(value)) {
    error("invalid-type", "breakpoints", `Expected an object; received ${describeValue(value)}.`);
    return out;
  }
  for (const key of Object.keys(value)) {
    if (!["mode", "values", "tailwind"].includes(key)) {
      error(
        "unknown-key",
        `breakpoints.${key}`,
        `Unknown key "${key}". Allowed: mode, values, tailwind.`,
      );
    }
  }
  const mode = value.mode ?? "extend";
  if (mode !== "extend" && mode !== "replace") {
    error(
      "invalid-type",
      "breakpoints.mode",
      `Expected "extend" or "replace"; received ${describeValue(value.mode)}.`,
    );
  }
  if (value.tailwind !== undefined && typeof value.tailwind !== "boolean") {
    error(
      "invalid-type",
      "breakpoints.tailwind",
      `Expected a boolean; received ${describeValue(value.tailwind)}.`,
    );
  }
  if (!isRecord(value.values)) {
    error(
      "invalid-type",
      "breakpoints.values",
      `Expected an object of name → rem width; received ${describeValue(value.values)}.`,
    );
    return out;
  }
  const entries = Object.entries(value.values);
  if (mode === "replace" && entries.length === 0) {
    error(
      "empty-breakpoints",
      "breakpoints.values",
      '"replace" mode needs at least one breakpoint.',
    );
  }

  const effective: Array<{ name: string; rem: number; path: string; source: string }> = [];
  if (mode === "extend") {
    for (const bp of defaultBreakpoints) {
      effective.push({ name: bp.name, rem: bp.rem, path: "", source: "default" });
    }
  }
  const defaultNames = defaultBreakpoints.map((bp) => bp.name);
  for (const [name, width] of entries) {
    const path = `breakpoints.values.${name}`;
    let nameOk = true;
    if (!NAME.test(name) || name.length > MAX_NAME_LENGTH) {
      nameOk = false;
      error(
        "invalid-breakpoint-name",
        path,
        `Breakpoint names start with a lower-case letter and contain only letters and digits (camelCase), at most ${MAX_NAME_LENGTH} characters; received ${describeValue(name)}.`,
      );
    } else if (RESERVED_NAMES.includes(name)) {
      nameOk = false;
      error(
        "reserved-breakpoint-name",
        path,
        `"${name}" is reserved (${name === "base" ? "the implicit baseline key" : "it would clash with Neshel class names, JavaScript objects or Tailwind variants"}).`,
      );
    } else if (mode === "extend" && defaultNames.includes(name)) {
      nameOk = false;
      error(
        "breakpoint-redefined",
        path,
        `"${name}" is a default breakpoint; "extend" mode cannot redefine it. Use mode: "replace" to define your own set.`,
      );
    }
    if (typeof width !== "string" || !WIDTH.test(width)) {
      error(
        "invalid-breakpoint-width",
        path,
        `Expected a rem width such as "48rem" (at most 4 decimals); received ${describeValue(width)}.`,
      );
      continue;
    }
    const rem = Number.parseFloat(width);
    if (rem <= 0 || rem > MAX_WIDTH_REM) {
      error(
        "invalid-breakpoint-width",
        path,
        `Widths must be greater than 0 and at most ${MAX_WIDTH_REM}rem; received ${describeValue(width)}.`,
      );
      continue;
    }
    if (nameOk) effective.push({ name, rem, path, source: "config" });
  }

  const seenNames = new Map<string, string>();
  const seenWidths = new Map<number, string>();
  for (const bp of effective) {
    const folded = bp.name.toLowerCase();
    const label = (name: string, source: string) =>
      source === "default" ? `default breakpoint "${name}"` : `"${name}"`;
    const nameClash = seenNames.get(folded);
    if (nameClash !== undefined && bp.source === "config") {
      error(
        "duplicate-breakpoint-name",
        bp.path,
        `"${bp.name}" differs only by letter case from ${nameClash}; class names may match case-insensitively.`,
      );
    } else seenNames.set(folded, label(bp.name, bp.source));
    const widthClash = seenWidths.get(bp.rem);
    if (widthClash !== undefined && bp.source === "config") {
      error(
        "duplicate-breakpoint-width",
        bp.path,
        `${bp.rem}rem is already used by ${widthClash}; equal widths are ambiguous.`,
      );
    } else seenWidths.set(bp.rem, label(bp.name, bp.source));
  }
  if (effective.length > MAX_BREAKPOINTS) {
    error(
      "too-many-breakpoints",
      "breakpoints.values",
      `${effective.length} effective breakpoints; at most ${MAX_BREAKPOINTS} are supported.`,
    );
  }
  const declared = effective.filter((bp) => bp.source === "config");
  const ascending = declared.every(
    (bp, index) => index === 0 || (declared[index - 1]?.rem ?? 0) <= bp.rem,
  );
  if (!ascending) {
    out.push({
      severity: "warning",
      code: "breakpoint-order",
      path: "breakpoints.values",
      message: `Declared out of width order; output is sorted: ${[...declared]
        .sort((a, b) => a.rem - b.rem)
        .map((bp) => bp.name)
        .join(" < ")}.`,
    });
  }
  return out;
}

/** Effective breakpoints of a validated `breakpoints` value, ascending by width. */
export function resolveBreakpoints(input: {
  readonly mode?: "extend" | "replace";
  readonly values: Readonly<Record<string, string>>;
  readonly tailwind?: boolean;
}): ResolvedBreakpoints {
  const mode = input.mode ?? "extend";
  const configured: ResolvedBreakpoint[] = Object.entries(input.values).map(([name, width]) => ({
    name,
    width,
    rem: Number.parseFloat(width),
    source: "config",
  }));
  const list = [...(mode === "extend" ? defaultBreakpoints : []), ...configured].sort(
    (a, b) => a.rem - b.rem,
  );
  return { mode, list, tailwind: input.tailwind === true };
}
