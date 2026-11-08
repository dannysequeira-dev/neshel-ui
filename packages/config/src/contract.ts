// Token contract data (specs/002-config-and-tokens/contracts/tokens.md). Pure, frozen data:
// no imports at runtime, no side effects beyond freezing the module's own objects.
import type { ContrastPair, Defaults } from "./types.js";

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object") {
    for (const nested of Object.values(value)) deepFreeze(nested);
    Object.freeze(value);
  }
  return value;
}

/** The 25 semantic colour roles in canonical (emission) order. */
export const colorRoles = /* @__PURE__ */ Object.freeze([
  "background",
  "foreground",
  "surface",
  "surfaceForeground",
  "muted",
  "mutedForeground",
  "primary",
  "primaryForeground",
  "secondary",
  "secondaryForeground",
  "accent",
  "accentForeground",
  "destructive",
  "destructiveForeground",
  "success",
  "successForeground",
  "warning",
  "warningForeground",
  "selected",
  "selectedForeground",
  "disabled",
  "disabledForeground",
  "border",
  "input",
  "focus",
] as const);

/** Foreground/background pairs and their WCAG 2.1 thresholds. */
export const contrastPairs: readonly ContrastPair[] = /* @__PURE__ */ deepFreeze([
  { foreground: "foreground", background: "background", minimum: 4.5, criterion: "1.4.3" },
  { foreground: "surfaceForeground", background: "surface", minimum: 4.5, criterion: "1.4.3" },
  { foreground: "mutedForeground", background: "muted", minimum: 4.5, criterion: "1.4.3" },
  { foreground: "mutedForeground", background: "background", minimum: 4.5, criterion: "1.4.3" },
  { foreground: "mutedForeground", background: "surface", minimum: 4.5, criterion: "1.4.3" },
  { foreground: "primaryForeground", background: "primary", minimum: 4.5, criterion: "1.4.3" },
  { foreground: "primary", background: "background", minimum: 4.5, criterion: "1.4.3" },
  { foreground: "primary", background: "surface", minimum: 4.5, criterion: "1.4.3" },
  { foreground: "secondaryForeground", background: "secondary", minimum: 4.5, criterion: "1.4.3" },
  { foreground: "accentForeground", background: "accent", minimum: 4.5, criterion: "1.4.3" },
  {
    foreground: "destructiveForeground",
    background: "destructive",
    minimum: 4.5,
    criterion: "1.4.3",
  },
  { foreground: "destructive", background: "background", minimum: 4.5, criterion: "1.4.3" },
  { foreground: "destructive", background: "surface", minimum: 4.5, criterion: "1.4.3" },
  { foreground: "successForeground", background: "success", minimum: 4.5, criterion: "1.4.3" },
  { foreground: "warningForeground", background: "warning", minimum: 4.5, criterion: "1.4.3" },
  { foreground: "selectedForeground", background: "selected", minimum: 4.5, criterion: "1.4.3" },
  { foreground: "focus", background: "background", minimum: 3, criterion: "1.4.11" },
  { foreground: "focus", background: "surface", minimum: 3, criterion: "1.4.11" },
  { foreground: "input", background: "background", minimum: 3, criterion: "1.4.11" },
  { foreground: "input", background: "surface", minimum: 3, criterion: "1.4.11" },
  { foreground: "disabledForeground", background: "disabled", minimum: null, criterion: "exempt" },
]);

const sans = ["Inter", "ui-sans-serif", "system-ui", "sans-serif"] as const;
const inter = {
  familyName: "Inter",
  capHeight: 1490,
  ascent: 1984,
  descent: -494,
  lineGap: 0,
  unitsPerEm: 2048,
  xHeight: 1118,
  xWidthAvg: 978,
} as const;

/** Built-in defaults: the Neshel navy / ivory / gold themes and non-colour tokens. */
export const defaults: Defaults = /* @__PURE__ */ deepFreeze({
  themes: {
    light: {
      background: "#fbf9f6",
      foreground: "#0d1b33",
      surface: "#ffffff",
      surfaceForeground: "#0d1b33",
      muted: "#efeae4",
      mutedForeground: "#4a5468",
      primary: "#193767",
      primaryForeground: "#ffffff",
      secondary: "#e4e9f2",
      secondaryForeground: "#193767",
      accent: "#c49a59",
      accentForeground: "#071936",
      destructive: "#b42318",
      destructiveForeground: "#ffffff",
      success: "#1d6b3e",
      successForeground: "#ffffff",
      warning: "#f2c14e",
      warningForeground: "#2b1d00",
      selected: "#dbe4f3",
      selectedForeground: "#0d2347",
      disabled: "#ece8e3",
      disabledForeground: "#8a8f99",
      border: "#e2dcd3",
      input: "#7d8494",
      focus: "#8f6d3f",
    },
    dark: {
      background: "#040d1d",
      foreground: "#f3eee6",
      surface: "#0d2347",
      surfaceForeground: "#f3eee6",
      muted: "#122b55",
      mutedForeground: "#b4bccb",
      primary: "#9fb8e6",
      primaryForeground: "#071936",
      secondary: "#193767",
      secondaryForeground: "#f3eee6",
      accent: "#d9b56f",
      accentForeground: "#071936",
      destructive: "#f97066",
      destructiveForeground: "#1a0503",
      success: "#6fd09a",
      successForeground: "#04170b",
      warning: "#f2c35b",
      warningForeground: "#231800",
      selected: "#244679",
      selectedForeground: "#ffffff",
      disabled: "#13274a",
      disabledForeground: "#6b7891",
      border: "#1f3966",
      input: "#6f82a6",
      focus: "#e0bf7a",
    },
  },
  radius: { base: "0.75rem" },
  spacing: { unit: "0.25rem" },
  typography: {
    families: {
      body: sans,
      display: sans,
      mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
    },
    // Inter Regular, from @capsizecss/metrics 4.4.0 (checked by the CLI test suite).
    metrics: { body: inter, display: inter },
  },
  breakpoints: { sm: "40rem", md: "48rem", lg: "64rem", xl: "80rem", "2xl": "96rem" },
  focus: { width: "2px", offset: "2px" },
});
