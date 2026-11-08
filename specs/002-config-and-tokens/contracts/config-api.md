# Contract — `defineConfig()` and the configuration engine (proposed)

Status: **proposed**, not implemented. Recorded as ADR 0007 (Proposed).

## Entry points

| Import                     | Audience                           | Runtime content                       | Constraints                                                              |
| -------------------------- | ---------------------------------- | ------------------------------------- | ------------------------------------------------------------------------ |
| `@neshel-ui/config`        | `neshel.config.ts` authors         | `defineConfig` (identity) + types     | no deps, no `node:`, no side effects, < 1 kB                             |
| `@neshel-ui/config/engine` | `@neshel-ui/cli`, advanced tooling | validate, resolve, contrast, generate | pure functions, no I/O, no `node:`, no deps; **experimental** during 0.x |

The engine lives in `config` (the package that owns tokens, constitution II) so the shipped
stylesheets and consumer output come from the same code, and `cli` depends on `config`, never
the reverse.

## `.` — public types and `defineConfig`

```ts
/** CSS colour: #rgb, #rrggbb, rgb(), hsl() or oklch(). Alpha only for `border`. */
export type ColorValue = string;
/** CSS length: "0", or a number with rem | em | px (e.g. "0.75rem"). */
export type LengthValue = string;
/** A font family name or an ordered fallback stack. Names with spaces are quoted on output. */
export type FontStack = string | readonly string[];

export type ColorRole =
  | "background"
  | "foreground"
  | "surface"
  | "surfaceForeground"
  | "muted"
  | "mutedForeground"
  | "primary"
  | "primaryForeground"
  | "secondary"
  | "secondaryForeground"
  | "accent"
  | "accentForeground"
  | "destructive"
  | "destructiveForeground"
  | "selected"
  | "selectedForeground"
  | "disabled"
  | "disabledForeground"
  | "border"
  | "input"
  | "focus";

export type ThemeColors = Readonly<Record<ColorRole, ColorValue>>;

export interface BuiltInThemeInput {
  /** Overrides on top of the built-in theme of the same name. */
  readonly colors?: Partial<ThemeColors>;
}

export interface NamedThemeInput {
  /** Built-in theme this one starts from; also sets its color-scheme. */
  readonly extends: "light" | "dark";
  readonly colors?: Partial<ThemeColors>;
}

/** Lower-case kebab-case; "light", "dark" and "system" are reserved. */
export type ThemeName = string;

export interface FontMetrics {
  // Reserved for feature 004 (Capsize). Validated for shape, produces no CSS in 0.x.
  readonly capHeight: number;
  readonly ascent: number;
  readonly descent: number;
  readonly lineGap: number;
  readonly unitsPerEm: number;
  readonly xHeight?: number;
}

export type FontRole = "body" | "display" | "mono";

export interface NeshelConfig {
  /** Configuration schema version. Defaults to 1; any other value is rejected. */
  readonly version?: 1;
  readonly themes?: {
    readonly light?: BuiltInThemeInput;
    readonly dark?: BuiltInThemeInput;
  } & { readonly [name: ThemeName]: BuiltInThemeInput | NamedThemeInput | undefined }; // ⚑ Q5
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
  /** Custom-theme contrast diagnostics: "warn" (default) or "error". */
  readonly contrast?: "warn" | "error";
  /** Output file, relative to the config file. Default "./neshel.generated.css". */
  readonly output?: string;
}

/** Identity function that provides type checking and editor completion. */
export function defineConfig<const T extends NeshelConfig>(config: T & NoExtraKeys<T>): T;
```

`NoExtraKeys` (internal helper type) turns misspelled keys such as `primay` into type errors
even when the object is not a fresh literal. TypeScript cannot validate colour/length string
contents; those are runtime (CLI) errors. The exact typing of mixed built-in / named themes
is refined in `/speckit-plan` with type-level fixtures.

## Example `neshel.config.ts`

```ts
import { defineConfig } from "@neshel-ui/config";

export default defineConfig({
  version: 1,
  themes: {
    light: {
      colors: {
        primary: "#1d3f73",
        primaryForeground: "#ffffff",
        accent: "oklch(0.74 0.11 80)",
        accentForeground: "#071936",
      },
    },
    dark: {
      colors: {
        background: "#040d1d",
        primary: "#a9c2ee",
      },
    },
    // ⚑ Q5: named themes, selected with data-neshel-theme="sepia"
    sepia: {
      extends: "light",
      colors: { background: "#f4ecd8", surface: "#fbf6ea", foreground: "#2b2118" },
    },
  },
  radius: { base: "0.5rem" },
  spacing: { unit: "0.25rem" },
  typography: {
    families: {
      body: ["Source Sans 3", "ui-sans-serif", "system-ui", "sans-serif"],
      display: ["Fraunces", "Georgia", "serif"],
    },
  },
  focus: { width: "3px" },
  contrast: "error",
  output: "./src/styles/neshel.generated.css",
});
```

## Resolution order

1. Built-in defaults (light, dark, non-colour tokens).
2. `themes.light` / `themes.dark` overrides, role by role.
3. Named themes: resolved `extends` theme (after step 2), then their overrides.
4. Radius: explicit scale values win; otherwise derived from `base`.
5. The result is a complete `ResolvedConfig` (every role, every theme).

## `./engine` — functions (experimental in 0.x)

```ts
export type Severity = "error" | "warning" | "info";
export interface Diagnostic {
  readonly severity: Severity;
  readonly code: string;     // e.g. "invalid-color", "unknown-key", "contrast"
  readonly path: string;     // e.g. "themes.dark.colors.primary"
  readonly message: string;  // human-readable, includes received and expected values
}

export interface ValidationResult {
  readonly ok: boolean;                 // no error-severity diagnostics
  readonly config?: ResolvedConfig;     // present when ok
  readonly diagnostics: readonly Diagnostic[];
}

export function validateConfig(input: unknown, options?: { contrast?: "warn" | "error" }): ValidationResult;
export function resolveConfig(config: NeshelConfig): ResolvedConfig; // throws on invalid input
export function checkContrast(config: ResolvedConfig): readonly ContrastResult[];
export function generateCss(config: ResolvedConfig, options: {
  layer: "defaults" | "config";
  tailwind?: boolean;                   // append @theme inline (shipped tailwind.css)
  header?: string;                      // stable, no timestamps
}): string;
export const defaultConfig: ResolvedConfig;
export const contrastPairs: readonly ContrastPair[];
```

Validation never throws on bad input; it reports all diagnostics in one pass, sorted by path.

## Diagnostic message format

```text
error   themes.dark.colors.primary   invalid-color   Expected a colour (#rgb, #rrggbb, rgb(), hsl(), oklch()); received "navy".
error   themes.light.colors.primay   unknown-key     Unknown key "primay". Did you mean "primary"?
error   radius.base                  invalid-length  Expected a length such as "0.75rem" (rem, em, px or 0); received 12.
warning themes.light                 contrast        accentForeground on accent is 3.12:1; minimum 4.5:1 for text (WCAG 1.4.3).
info    typography.metrics           reserved        Font metrics are reserved for feature 004 and produce no CSS yet.
```
