// Public, browser-safe entry of @neshel-ui/config: types and frozen token-contract data.
// No runtime dependencies, no Node built-ins, no side effects (ADR 0007).
export { colorRoles, contrastPairs, defaults } from "./contract.js";
export type {
  BuiltInThemeInput,
  ColorRole,
  ColorValue,
  ContrastPair,
  ContrastPolicy,
  Defaults,
  FontMetrics,
  FontRole,
  FontStack,
  LengthValue,
  NamedThemeInput,
  NeshelConfig,
  ThemeColors,
} from "./types.js";
