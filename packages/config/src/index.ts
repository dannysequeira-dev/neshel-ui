// Public, browser-safe entry of @neshel-ui/config: types and frozen token-contract data.
// No runtime dependencies, no Node built-ins, no side effects (ADR 0007).
import type { DefaultBreakpointName } from "./types.js";

export { colorRoles, contrastPairs, defaults } from "./contract.js";
export { defineConfig, type ExactConfig } from "./define-config.js";
export type {
  BreakpointsInput,
  BreakpointWidth,
  BuiltInThemeInput,
  ColorRole,
  ColorValue,
  ContrastPair,
  ContrastPolicy,
  DefaultBreakpointName,
  Defaults,
  FontMetrics,
  FontRole,
  FontStack,
  LengthValue,
  NamedThemeInput,
  NeshelConfig,
  ThemeColors,
} from "./types.js";

/**
 * Registry of the application's breakpoint names (ADR 0010). Empty by default; the declarations
 * written by `neshel generate` augment it with `names`:
 *
 * ```ts
 * declare module "@neshel-ui/config" {
 *   interface BreakpointRegistry { readonly names: "tablet" | "desktop" }
 * }
 * ```
 *
 * Declared here (not re-exported) so module augmentation targets the package entry directly.
 */
// biome-ignore lint/suspicious/noEmptyInterface: augmented by generated declarations
export interface BreakpointRegistry {}

/**
 * Breakpoint names accepted by responsive props (besides `base`): the configured names when the
 * generated declarations are part of the program, otherwise the defaults `sm md lg xl 2xl`.
 * The conditional type replaces the whole union, so `replace` mode removes the default names.
 */
export type BreakpointName = BreakpointRegistry extends {
  readonly names: infer Names extends string;
}
  ? Names
  : DefaultBreakpointName;
