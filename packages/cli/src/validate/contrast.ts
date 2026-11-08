// Contrast checks over resolved themes using the contract's pairs (FR-003, FR-019).
import { type ColorRole, contrastPairs } from "@neshel-ui/config";
import type { ResolvedTheme } from "../resolve.js";
import { contrastRatio, type ParsedColour, parseColour } from "./colour.js";

export interface ContrastResult {
  readonly theme: string;
  readonly foreground: ColorRole;
  readonly background: ColorRole;
  readonly ratio: number;
  readonly minimum: number | null;
  readonly criterion: string;
  readonly passes: boolean;
}

/** Ratio rounded down to two decimals, so a displayed value never overstates contrast. */
export function displayRatio(ratio: number): string {
  return (Math.floor(ratio * 100) / 100).toFixed(2);
}

/**
 * Check every contract pair of one resolved theme. Colours that fail to parse are skipped
 * (they are reported by colour validation).
 */
export function checkThemeContrast(theme: ResolvedTheme): ContrastResult[] {
  const parsed = new Map<ColorRole, ParsedColour>();
  const get = (role: ColorRole) => {
    if (!parsed.has(role)) {
      const result = parseColour(theme.colors[role]);
      if (result.ok) parsed.set(role, result.colour);
    }
    return parsed.get(role);
  };
  const results: ContrastResult[] = [];
  for (const pair of contrastPairs) {
    const foreground = get(pair.foreground);
    const background = get(pair.background);
    if (!foreground || !background) continue;
    const ratio = contrastRatio(foreground, background);
    results.push({
      theme: theme.name,
      foreground: pair.foreground,
      background: pair.background,
      ratio,
      minimum: pair.minimum,
      criterion: pair.criterion,
      passes: pair.minimum === null || ratio >= pair.minimum,
    });
  }
  return results;
}
