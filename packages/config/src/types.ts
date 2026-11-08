import type { colorRoles } from "./contract.js";

/** One of the 21 semantic colour roles, in canonical order (see `colorRoles`). */
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

/** Reserved for feature 004 (Capsize-compatible names). Validated for shape; produces no CSS. */
export interface FontMetrics {
  readonly capHeight: number;
  readonly ascent: number;
  readonly descent: number;
  readonly lineGap: number;
  readonly unitsPerEm: number;
  readonly xHeight?: number;
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
    /** Reserved for feature 004. */
    readonly metrics?: Partial<Record<FontRole, FontMetrics>>;
  };
  readonly focus?: { readonly width?: LengthValue; readonly offset?: LengthValue };
  /** Custom-theme contrast diagnostics; defaults to "warn". */
  readonly contrast?: ContrastPolicy;
  /** Output file relative to the config file's directory. Default `"./neshel.generated.css"`. */
  readonly output?: string;
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
  readonly typography: { readonly families: { readonly [F in FontRole]: readonly string[] } };
  readonly focus: { readonly width: LengthValue; readonly offset: LengthValue };
}
