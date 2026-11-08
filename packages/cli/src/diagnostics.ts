// Diagnostics shared by validation and commands (data-model.md "Diagnostic").
import { compareCodePoints } from "./resolve.js";

export type Severity = "error" | "warning" | "info";

export type DiagnosticCode =
  | "unknown-key"
  | "invalid-type"
  | "invalid-version"
  | "invalid-theme-name"
  | "reserved-theme"
  | "missing-base"
  | "invalid-base"
  | "unexpected-base"
  | "invalid-length"
  | "invalid-font-stack"
  | "invalid-output"
  | "invalid-metrics"
  | "unsupported-color-syntax"
  | "invalid-color"
  | "alpha-not-allowed"
  | "out-of-gamut"
  | "contrast"
  | "reserved"
  | "invalid-breakpoint-name"
  | "reserved-breakpoint-name"
  | "duplicate-breakpoint-name"
  | "breakpoint-redefined"
  | "invalid-breakpoint-width"
  | "duplicate-breakpoint-width"
  | "too-many-breakpoints"
  | "empty-breakpoints"
  | "breakpoint-order"
  | "invalid-types-output"
  | "missing-metrics"
  | "invalid-fallbacks"
  | "no-component-packages";

export interface Diagnostic {
  readonly severity: Severity;
  readonly code: DiagnosticCode;
  /** Dotted configuration path; "" for the file itself. */
  readonly path: string;
  readonly message: string;
}

/** Sort by path (code-point order), then code — deterministic across platforms and locales. */
export function sortDiagnostics(diagnostics: readonly Diagnostic[]): Diagnostic[] {
  return [...diagnostics].sort(
    (a, b) => compareCodePoints(a.path, b.path) || compareCodePoints(a.code, b.code),
  );
}

export const hasErrors = (diagnostics: readonly Diagnostic[]) =>
  diagnostics.some((diagnostic) => diagnostic.severity === "error");

/** Short, single-line representation of a received value for messages. */
export function describeValue(value: unknown): string {
  if (typeof value === "string") {
    const text = JSON.stringify(value);
    return text.length > 62 ? `${text.slice(0, 59)}…"` : text;
  }
  if (value === null) return "null";
  if (Array.isArray(value)) return "an array";
  if (typeof value === "object") return "an object";
  if (typeof value === "function") return "a function";
  return String(value);
}

/** Levenshtein distance (small inputs only). */
export function editDistance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i++) {
    let previous = row[0] ?? 0;
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const current = row[j] ?? 0;
      row[j] = Math.min(
        (row[j] ?? 0) + 1,
        (row[j - 1] ?? 0) + 1,
        previous + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      previous = current;
    }
  }
  return row[b.length] ?? 0;
}

/** Closest candidate within edit distance 2, preferring the smallest distance then code point. */
export function suggest(input: string, candidates: readonly string[]): string | undefined {
  let best: { candidate: string; distance: number } | undefined;
  for (const candidate of [...candidates].sort(compareCodePoints)) {
    const distance = editDistance(input.toLowerCase(), candidate.toLowerCase());
    if (distance <= 2 && (!best || distance < best.distance)) best = { candidate, distance };
  }
  return best?.candidate;
}

const ANSI = { error: "\u001b[31m", warning: "\u001b[33m", info: "\u001b[36m", reset: "\u001b[0m" };

/** Aligned text lines: `severity  path  code  message`. */
export function formatDiagnostics(
  diagnostics: readonly Diagnostic[],
  { color = false }: { color?: boolean } = {},
): string[] {
  const pathWidth = Math.max(0, ...diagnostics.map((d) => (d.path || "(config)").length));
  const codeWidth = Math.max(0, ...diagnostics.map((d) => d.code.length));
  return diagnostics.map((d) => {
    const severity = d.severity.padEnd(7);
    const label = color ? `${ANSI[d.severity]}${severity}${ANSI.reset}` : severity;
    return `${label} ${(d.path || "(config)").padEnd(pathWidth)}  ${d.code.padEnd(codeWidth)}  ${d.message}`;
  });
}
