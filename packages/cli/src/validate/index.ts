// Validation pipeline: structure → colours → contrast (contracts/cli.md). Pure; no I/O.
import type { ColorRole, ContrastPolicy, NeshelConfig } from "@neshel-ui/config";
import { type Diagnostic, hasErrors, sortDiagnostics } from "../diagnostics.js";
import { type ResolvedConfig, resolveConfig } from "../resolve.js";
import { parseColour } from "./colour.js";
import { checkThemeContrast, displayRatio } from "./contrast.js";
import { validateStructure } from "./structure.js";

export interface ValidationOptions {
  /** `--strict`: contrast failures are errors regardless of the configuration. */
  readonly strict?: boolean;
}

export interface ValidationResult {
  readonly ok: boolean;
  readonly diagnostics: readonly Diagnostic[];
  readonly config?: ResolvedConfig;
  readonly policy: ContrastPolicy;
}

/** Effective contrast policy: `--strict` › config `contrast` › "warn" (FR-020). */
export function effectivePolicy(config: unknown, strict = false): ContrastPolicy {
  if (strict) return "error";
  const declared = (config as { contrast?: unknown } | null)?.contrast;
  return declared === "error" ? "error" : "warn";
}

function colourDiagnostics(config: Record<string, unknown>, structural: readonly Diagnostic[]) {
  const diagnostics: Diagnostic[] = [];
  const failed = new Set(structural.map((d) => d.path));
  const themes = (config.themes ?? {}) as Record<string, { colors?: Record<string, unknown> }>;
  for (const [name, theme] of Object.entries(themes)) {
    for (const [role, value] of Object.entries(theme?.colors ?? {})) {
      const path = `themes.${name}.colors.${role}`;
      if (typeof value !== "string" || failed.has(path)) continue;
      const result = parseColour(value);
      if (!result.ok) {
        diagnostics.push({
          severity: "error",
          code: result.problem,
          path,
          message:
            result.problem === "unsupported-color-syntax"
              ? `Expected #hex, rgb(), hsl() or oklch(); received ${JSON.stringify(value)}.`
              : `Could not parse ${JSON.stringify(value)} as a colour.`,
        });
        continue;
      }
      if (!result.colour.opaque && (role as ColorRole) !== "border") {
        diagnostics.push({
          severity: "error",
          code: "alpha-not-allowed",
          path,
          message: `Only "border" may be translucent; ${JSON.stringify(value)} has alpha below 1.`,
        });
      }
      if (!result.colour.inSrgbGamut) {
        diagnostics.push({
          severity: "warning",
          code: "out-of-gamut",
          path,
          message: "Outside the sRGB gamut; contrast is computed after CSS gamut mapping.",
        });
      }
    }
  }
  return diagnostics;
}

/** Validate an unknown configuration value and, when valid, resolve it. */
export function validateConfig(input: unknown, options: ValidationOptions = {}): ValidationResult {
  const policy = effectivePolicy(input, options.strict);
  const structural = validateStructure(input);
  if (hasErrors(structural) && (typeof input !== "object" || input === null)) {
    return { ok: false, diagnostics: sortDiagnostics(structural), policy };
  }
  const diagnostics = [
    ...structural,
    ...colourDiagnostics(input as Record<string, unknown>, structural),
  ];
  if (hasErrors(diagnostics))
    return { ok: false, diagnostics: sortDiagnostics(diagnostics), policy };

  const config = input as NeshelConfig;
  const resolved = resolveConfig(config);
  const themesInput = config.themes ?? {};
  for (const theme of resolved.themes) {
    // Unchanged built-in themes are covered by the package's own tests (FR-003).
    const customised = theme.kind === "named" || themesInput[theme.name]?.colors !== undefined;
    if (!customised) continue;
    for (const result of checkThemeContrast(theme)) {
      if (result.passes || result.minimum === null) continue;
      diagnostics.push({
        severity: policy === "error" ? "error" : "warning",
        code: "contrast",
        path: `themes.${theme.name}`,
        message: `${result.foreground} on ${result.background} is ${displayRatio(result.ratio)}:1; minimum ${result.minimum}:1 (WCAG ${result.criterion}).`,
      });
    }
  }
  const sorted = sortDiagnostics(diagnostics);
  return hasErrors(sorted)
    ? { ok: false, diagnostics: sorted, policy }
    : { ok: true, diagnostics: sorted, config: resolved, policy };
}
