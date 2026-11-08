# Contract — `@neshel-ui/config` JavaScript API

Status: **approved for implementation** (ADR 0007 Accepted, 2026-11-07); not implemented.

## Entry point

`@neshel-ui/config` exposes one JavaScript entry (`.`) plus the stylesheets
([css.md](css.md)). There is **no engine subpath**: validation, colour processing and CSS
generation are private to `@neshel-ui/cli` (amendment C).

| Export          | Kind     | Purpose                                               |
| --------------- | -------- | ----------------------------------------------------- |
| `defineConfig`  | function | Identity helper that types `neshel.config.ts`         |
| `colorRoles`    | data     | Canonical ordered tuple of the 21 colour roles        |
| `contrastPairs` | data     | Pairs and thresholds of [tokens.md](tokens.md)        |
| `defaults`      | data     | Built-in light/dark palettes and non-colour defaults  |
| types           | types    | `NeshelConfig`, `ColorRole`, `ThemeColors`, … (below) |

Constraints (FR-014, SC-006): no runtime dependencies, no `node:` imports, no top-level side
effects; each export is independently tree-shakeable, so a bundle importing only `defineConfig`
contains no contract data (< 1 kB minified). Data objects are deeply frozen.

## Compatibility and versioning policy

- Everything exported from `.` and every CSS variable, selector, layer name and Tailwind utility
  of [css.md](css.md)/[tokens.md](tokens.md) is **public API** under semver.
- While 0.x: breaking changes only in a minor release, each with a changeset entry and, when it
  touches tokens or cascade, an ADR update. Additive changes (new roles, new optional config keys)
  are minor; fixes are patch.
- Colour **values** of the default palette may change in a minor release (visual change, not an
  API break) provided all contrast pairs still pass; documented in the changeset.
- `@neshel-ui/cli` has no programmatic API; its contract is the command line
  ([cli.md](cli.md)) and the generated CSS structure. Its internal modules are not importable
  (not in `exports`).
- `@neshel-ui/cli` declares `@neshel-ui/config` as a **peer dependency** with a caret range of
  the same minor (`workspace:^` → `^0.x.y` on pack), so the CLI and the user's config file resolve
  the same copy of the token contract. Releasing both together is required while 0.x.

## Types

```ts
export const colorRoles: readonly [
  "background", "foreground", "surface", "surfaceForeground", "muted", "mutedForeground",
  "primary", "primaryForeground", "secondary", "secondaryForeground", "accent", "accentForeground",
  "destructive", "destructiveForeground", "selected", "selectedForeground",
  "disabled", "disabledForeground", "border", "input", "focus",
];
export type ColorRole = (typeof colorRoles)[number];

/** #rgb, #rgba, #rrggbb, #rrggbbaa, rgb(), rgba(), hsl(), hsla() or oklch(). Checked by the CLI. */
export type ColorValue = string;
/** "0", or a number followed by rem | em | px. Checked by the CLI. */
export type LengthValue = string;
/** Family name or ordered fallback stack; names with spaces are quoted on output. */
export type FontStack = string | readonly string[];
export type FontRole = "body" | "display" | "mono";
export type ThemeColors = { readonly [R in ColorRole]: ColorValue };

export interface BuiltInThemeInput {
  readonly colors?: Partial<ThemeColors>;
  readonly extends?: never;
}
export interface NamedThemeInput {
  /** The built-in base this theme starts from; also determines its color-scheme. */
  readonly extends: "light" | "dark";
  readonly colors?: Partial<ThemeColors>;
}

export interface FontMetrics {
  // Reserved for feature 004 (Capsize-compatible names). Validated for shape; no CSS in 0.x.
  readonly capHeight: number;
  readonly ascent: number;
  readonly descent: number;
  readonly lineGap: number;
  readonly unitsPerEm: number;
  readonly xHeight?: number;
}

export type ContrastPolicy = "warn" | "error";

export interface NeshelConfig {
  /** Configuration schema version; defaults to 1. Other values are rejected. */
  readonly version?: 1;
  readonly themes?: {
    readonly light?: BuiltInThemeInput;
    readonly dark?: BuiltInThemeInput;
    readonly system?: never;
    /** Named themes: lower-case kebab-case, 1–32 chars, unique by construction (object keys). */
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
  /** Custom-theme contrast diagnostics. `--strict` on the CLI always means "error". */
  readonly contrast?: ContrastPolicy;
  /** Output file relative to the config file's directory. Default "./neshel.generated.css". */
  readonly output?: string;
}

/** Returns its argument unchanged; exists for type checking and editor completion. */
export function defineConfig<const T extends NeshelConfig>(config: T & ExactConfig<T>): T;
```

`ExactConfig<T>` is an internal helper type that turns unknown keys (e.g. `primay`) into type
errors and requires named themes to declare `extends` while forbidding it on `light`/`dark`.
TypeScript cannot check string contents (colours, lengths, theme-name pattern); the CLI does.
The precise helper is finalised with type fixtures in 002.3 (T030–T032); the public signature
above does not change.

```ts
export interface ContrastPair {
  readonly foreground: ColorRole;
  readonly background: ColorRole;
  /** Minimum ratio, or null for documented exemptions (disabled pair). */
  readonly minimum: 4.5 | 3 | null;
  readonly criterion: "1.4.3" | "1.4.11" | "exempt";
}
export const contrastPairs: readonly ContrastPair[];

export interface Defaults {
  readonly themes: { readonly light: ThemeColors; readonly dark: ThemeColors };
  readonly radius: { readonly base: LengthValue };          // scale derived unless overridden
  readonly spacing: { readonly unit: LengthValue };
  readonly typography: { readonly families: Readonly<Record<FontRole, readonly string[]>> };
  readonly focus: { readonly width: LengthValue; readonly offset: LengthValue };
}
export const defaults: Defaults;
```

## Example `neshel.config.ts`

```ts
import { defineConfig } from "@neshel-ui/config";

export default defineConfig({
  version: 1,
  themes: {
    light: {
      colors: {
        primary: "#1d3f73",
        accent: "oklch(0.74 0.11 80)",
        accentForeground: "#071936",
      },
    },
    dark: {
      colors: { primary: "#a9c2ee" },
    },
    sepia: {
      extends: "light",
      colors: { background: "#f4ecd8", surface: "#fbf6ea", foreground: "#2b2118" },
    },
  },
  radius: { base: "0.5rem" },
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

## Resolution order (performed by the CLI)

1. Start from `defaults`.
2. Apply `themes.light` / `themes.dark` overrides role by role.
3. Named themes: copy the **resolved** base (`extends`, after step 2), then apply overrides.
   Bases are only `light`/`dark`; named themes cannot be bases (no chains).
4. Radius: explicit `sm/md/lg/xl` win; otherwise derived from `base` via `calc()`.
5. Font stacks: arrays joined with `, `, names containing spaces or non-identifier characters
   wrapped in double quotes; strings used as written.
6. Result: a complete `ResolvedConfig` (every role of every theme). Named themes are sorted by name.
