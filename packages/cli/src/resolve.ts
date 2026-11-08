// Resolves a (validated) configuration against the contract defaults into complete themes.
import {
  type ColorRole,
  colorRoles,
  defaults,
  type FontRole,
  type FontStack,
  type NamedThemeInput,
  type NeshelConfig,
  type ThemeColors,
} from "@neshel-ui/config";
import { type ResolvedBreakpoints, resolveBreakpoints } from "./breakpoints.js";
import { effectiveMetrics, fontRoles, type ResolvedFont, resolveFont } from "./fonts.js";
import { normaliseColour } from "./validate/colour.js";

export { fontRoles } from "./fonts.js";

export type BaseThemeName = "light" | "dark";

export interface ResolvedTheme {
  readonly name: string;
  readonly kind: "built-in" | "named";
  readonly base: BaseThemeName;
  readonly colorScheme: "light" | "dark";
  readonly colors: Readonly<Record<ColorRole, string>>;
}

export interface ResolvedConfig {
  /** light, dark, then named themes sorted by code point. */
  readonly themes: readonly ResolvedTheme[];
  readonly radius: Readonly<Record<"base" | "sm" | "md" | "lg" | "xl" | "full", string>>;
  readonly spacing: { readonly unit: string };
  readonly fonts: Readonly<Record<FontRole, string>>;
  /** Font roles with Capsize constants and fallback faces (feature 004). */
  readonly typography: Readonly<Record<FontRole, ResolvedFont>>;
  readonly focus: { readonly width: string; readonly offset: string };
  /** Present only when the configuration declares `breakpoints`. */
  readonly breakpoints?: ResolvedBreakpoints;
}
const IDENTIFIER = /^-?[A-Za-z_][A-Za-z0-9_-]*$/;

/** Serialise a font stack: arrays are joined; names that are not identifiers are quoted. */
export function serialiseFontStack(stack: FontStack): string {
  if (typeof stack === "string") return stack.trim();
  return stack
    .map((name) => name.trim())
    .map((name) =>
      IDENTIFIER.test(name) ? name : `"${name.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`,
    )
    .join(", ");
}

/** Code-point comparison (locale-independent, deterministic). */
export function compareCodePoints(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function mergeColours(
  base: Readonly<Record<ColorRole, string>>,
  overrides: Partial<ThemeColors> | undefined,
): Record<ColorRole, string> {
  const result = {} as Record<ColorRole, string>;
  for (const role of colorRoles) {
    const value = overrides?.[role];
    result[role] = value === undefined ? base[role] : normaliseColour(value);
  }
  return result;
}

function isNamedTheme(value: unknown): value is NamedThemeInput {
  return typeof value === "object" && value !== null && "extends" in value;
}

/** Resolve a configuration that already passed validation. */
export function resolveConfig(config: NeshelConfig): ResolvedConfig {
  const themesInput = config.themes ?? {};
  const light = mergeColours(defaults.themes.light, themesInput.light?.colors);
  const dark = mergeColours(defaults.themes.dark, themesInput.dark?.colors);
  const bases: Record<BaseThemeName, Record<ColorRole, string>> = { light, dark };

  const themes: ResolvedTheme[] = [
    { name: "light", kind: "built-in", base: "light", colorScheme: "light", colors: light },
    { name: "dark", kind: "built-in", base: "dark", colorScheme: "dark", colors: dark },
  ];
  const names = Object.keys(themesInput)
    .filter((name) => name !== "light" && name !== "dark")
    .sort(compareCodePoints);
  for (const name of names) {
    const input = themesInput[name];
    if (!isNamedTheme(input)) continue; // rejected by validation
    themes.push({
      name,
      kind: "named",
      base: input.extends,
      colorScheme: input.extends,
      colors: mergeColours(bases[input.extends], input.colors),
    });
  }

  const radius = config.radius ?? {};
  const base = radius.base ?? defaults.radius.base;
  const derived = (factor: string) => `calc(var(--neshel-radius-base) * ${factor})`;
  const families = config.typography?.families ?? {};
  const fonts = {} as Record<FontRole, string>;
  const typography = {} as Record<FontRole, ResolvedFont>;
  for (const role of fontRoles) {
    const stack = serialiseFontStack(families[role] ?? defaults.typography.families[role]);
    const metrics = effectiveMetrics(role, families, config.typography?.metrics);
    typography[role] = resolveFont(role, stack, metrics, config.typography?.fallbacks?.[role]);
    fonts[role] = typography[role].stack;
  }

  return {
    themes,
    radius: {
      base,
      sm: radius.sm ?? derived("0.5"),
      md: radius.md ?? "var(--neshel-radius-base)",
      lg: radius.lg ?? derived("1.5"),
      xl: radius.xl ?? derived("2"),
      full: "9999px",
    },
    spacing: { unit: config.spacing?.unit ?? defaults.spacing.unit },
    fonts,
    typography,
    focus: {
      width: config.focus?.width ?? defaults.focus.width,
      offset: config.focus?.offset ?? defaults.focus.offset,
    },
    ...(config.breakpoints ? { breakpoints: resolveBreakpoints(config.breakpoints) } : {}),
  };
}
