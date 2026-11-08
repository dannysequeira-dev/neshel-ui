import type { colorRoles } from "./contract.js";

/** Default breakpoint names, ascending: sm 40rem, md 48rem, lg 64rem, xl 80rem, 2xl 96rem. */
export type DefaultBreakpointName = "sm" | "md" | "lg" | "xl" | "2xl";

/** One of the 25 semantic colour roles, in canonical order (see `colorRoles`). */
export type ColorRole = (typeof colorRoles)[number];

/**
 * A CSS colour: `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`, `rgb()`, `rgba()`, `hsl()`, `hsla()`
 * or `oklch()`. Only `border` may be translucent. Checked by the `neshel` CLI, not by types.
 */
export type ColorValue = string;

/** A CSS length: `"0"`, or a number followed by `rem`, `em` or `px` (e.g. `"0.75rem"`). */
export type LengthValue = string;

/** A font family name or an ordered fallback stack. Names with spaces are quoted on output. */
export type FontStack = string | readonly string[];

/** Font roles exposed as `--neshel-font-<role>`. */
export type FontRole = "body" | "display" | "mono";

/** A complete colour map for one theme. */
export type ThemeColors = { readonly [R in ColorRole]: ColorValue };

/** Overrides for a built-in theme (`light` or `dark`). */
export interface BuiltInThemeInput {
  readonly colors?: Partial<ThemeColors>;
  readonly extends?: never;
}

/** A named theme that starts from a built-in base. */
export interface NamedThemeInput {
  /** Built-in base; also determines the theme's `color-scheme`. */
  readonly extends: "light" | "dark";
  readonly colors?: Partial<ThemeColors>;
}

/**
 * Font metrics in Capsize's format (objects from `@capsizecss/metrics` can be passed directly).
 * Used by `neshel generate` for cap-height sizing and trimming (feature 004).
 */
export interface FontMetrics {
  readonly capHeight: number;
  readonly ascent: number;
  readonly descent: number;
  readonly lineGap: number;
  readonly unitsPerEm: number;
  readonly xHeight?: number;
  /** Average character width; required for fallback font generation. */
  readonly xWidthAvg?: number;
  /** Family name; required for fallback fonts (the primary role uses its first family). */
  readonly familyName?: string;
  readonly fullName?: string;
  readonly postscriptName?: string;
  readonly category?: string;
  readonly subsets?: Readonly<Record<string, { readonly xWidthAvg: number }>>;
}

/** A breakpoint threshold in `rem`, e.g. `"48rem"`. Checked by the `neshel` CLI. */
export type BreakpointWidth = `${number}rem`;

/** Consumer-defined responsive breakpoints (feature 004, contracts/breakpoints.md). */
export interface BreakpointsInput {
  /** `extend` keeps the defaults (sm, md, lg, xl, 2xl) and adds names; `replace` uses only `values`. */
  readonly mode?: "extend" | "replace";
  /** Name → `min-width` threshold. Names: lower camelCase (`phoneXL`); widths: distinct `rem`. */
  readonly values: { readonly [name: string]: BreakpointWidth };
  /** Also emit Tailwind CSS v4 `@theme` breakpoints in the generated stylesheet. */
  readonly tailwind?: boolean;
}

/** How contrast failures of custom themes are reported. `neshel --strict` always means "error". */
export type ContrastPolicy = "warn" | "error";

/** The `neshel.config.ts` schema, version 1. */
export interface NeshelConfig {
  /** Configuration schema version; defaults to 1. Other values are rejected. */
  readonly version?: 1;
  readonly themes?: {
    readonly light?: BuiltInThemeInput;
    readonly dark?: BuiltInThemeInput;
    readonly system?: never;
    /** Named themes: lower-case kebab-case, 1–32 characters, `extends` required. */
    readonly [name: string]: BuiltInThemeInput | NamedThemeInput | undefined;
  };
  readonly radius?: {
    readonly base?: LengthValue;
    readonly sm?: LengthValue;
    readonly md?: LengthValue;
    readonly lg?: LengthValue;
    readonly xl?: LengthValue;
  };
  readonly spacing?: { readonly unit?: LengthValue };
  readonly typography?: {
    readonly families?: Partial<Record<FontRole, FontStack>>;
    /** Metrics of each role's primary font (Capsize format). */
    readonly metrics?: Partial<Record<FontRole, FontMetrics>>;
    /** Metrics of local fallback fonts, adjusted to the primary font with Capsize. */
    readonly fallbacks?: Partial<Record<FontRole, readonly FontMetrics[]>>;
  };
  /** Custom responsive breakpoints shared by layout and typography. */
  readonly breakpoints?: BreakpointsInput;
  readonly focus?: { readonly width?: LengthValue; readonly offset?: LengthValue };
  /** Custom-theme contrast diagnostics; defaults to "warn". */
  readonly contrast?: ContrastPolicy;
  /** Output file relative to the config file's directory. Default `"./neshel.generated.css"`. */
  readonly output?: string;
  /**
   * Generated TypeScript declarations (written when `breakpoints` is set), relative to the config
   * file's directory. Default `"./neshel.generated.d.ts"`.
   */
  readonly types?: string;
}

/** A foreground/background pair whose contrast is checked. */
export interface ContrastPair {
  readonly foreground: ColorRole;
  readonly background: ColorRole;
  /** Minimum WCAG 2.1 ratio, or `null` for a documented exemption. */
  readonly minimum: 4.5 | 3 | null;
  readonly criterion: "1.4.3" | "1.4.11" | "exempt";
}

/** Built-in default values of the token contract. */
export interface Defaults {
  readonly themes: { readonly light: ThemeColors; readonly dark: ThemeColors };
  readonly radius: { readonly base: LengthValue };
  readonly spacing: { readonly unit: LengthValue };
  readonly typography: {
    readonly families: { readonly [F in FontRole]: readonly string[] };
    /** Default metrics (Inter for body and display; none for mono). */
    readonly metrics: Partial<Record<FontRole, FontMetrics>>;
  };
  /** Default breakpoints (Tailwind CSS v4 defaults). */
  readonly breakpoints: { readonly [B in DefaultBreakpointName]: BreakpointWidth };
  readonly focus: { readonly width: LengthValue; readonly offset: LengthValue };
}
