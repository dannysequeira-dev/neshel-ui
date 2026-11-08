import type {
  BuiltInThemeInput,
  FontMetrics,
  FontRole,
  NamedThemeInput,
  NeshelConfig,
  ThemeColors,
} from "./types.js";

/** Maps every key of `T` that is not a key of `Shape` to `never`, so it fails to type-check. */
type Strict<T, Shape> = { [K in keyof T]: K extends keyof Shape ? unknown : never };

type ColorsCheck<V> = V extends { readonly colors: infer C }
  ? { colors?: Strict<C, ThemeColors> }
  : unknown;

type ThemeCheck<Name, V> = Name extends "system"
  ? never
  : Name extends "light" | "dark"
    ? Strict<V, BuiltInThemeInput> & { extends?: never } & ColorsCheck<V>
    : Strict<V, NamedThemeInput> & { extends: "light" | "dark" } & ColorsCheck<V>;

type Section<T, Key extends keyof NeshelConfig> = T extends { readonly [P in Key]: infer S }
  ? Strict<S, NonNullable<NeshelConfig[Key]>>
  : unknown;

type TypographyCheck<T> = T extends { readonly typography: infer Ty }
  ? Strict<Ty, NonNullable<NeshelConfig["typography"]>> & {
      families?: Ty extends { readonly families: infer F }
        ? Strict<F, Record<FontRole, unknown>>
        : unknown;
      metrics?: Ty extends { readonly metrics: infer M }
        ? Strict<M, Record<FontRole, unknown>> & {
            [R in keyof M]: Strict<M[R], FontMetrics>;
          }
        : unknown;
      fallbacks?: Ty extends { readonly fallbacks: infer Fb }
        ? Strict<Fb, Record<FontRole, unknown>>
        : unknown;
    }
  : unknown;

/**
 * Compile-time exactness for `defineConfig`: unknown keys at any level, named themes without
 * `extends`, `extends` on `light`/`dark`, and a `system` theme become type errors.
 */
export type ExactConfig<T> = Strict<T, NeshelConfig> & {
  themes?: T extends { readonly themes: infer Th }
    ? { [N in keyof Th]: ThemeCheck<N, Th[N]> }
    : unknown;
  radius?: Section<T, "radius">;
  spacing?: Section<T, "spacing">;
  focus?: Section<T, "focus">;
  typography?: TypographyCheck<T>;
  breakpoints?: Section<T, "breakpoints">;
};

/**
 * Declare a Neshel-UI configuration with type checking and editor completion. Returns its
 * argument unchanged; colour, length and theme-name contents are validated by `neshel validate`.
 */
export function defineConfig<const T extends NeshelConfig>(config: T & ExactConfig<T>): T {
  return config;
}
