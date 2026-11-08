// Positive type fixtures: every configuration here must compile (checked by `pnpm typecheck`).
import { defineConfig, type NeshelConfig } from "../src/index.js";

export const contractExample = defineConfig({
  version: 1,
  themes: {
    light: {
      colors: {
        primary: "#1d3f73",
        accent: "oklch(0.74 0.11 80)",
        accentForeground: "#071936",
      },
    },
    dark: { colors: { primary: "#a9c2ee" } },
    sepia: {
      extends: "light",
      colors: { background: "#f4ecd8", surface: "#fbf6ea", foreground: "#2b2118" },
    },
  },
  radius: { base: "0.5rem", lg: "1rem" },
  spacing: { unit: "0.25rem" },
  typography: {
    families: {
      body: ["Source Sans 3", "ui-sans-serif", "system-ui", "sans-serif"],
      display: "Fraunces, Georgia, serif",
    },
    metrics: {
      body: { capHeight: 700, ascent: 1000, descent: -250, lineGap: 0, unitsPerEm: 1000 },
    },
  },
  focus: { width: "3px", offset: "2px" },
  contrast: "error",
  output: "./src/styles/neshel.generated.css",
});

// The return type preserves the literal input.
export const preserved: "#1d3f73" = contractExample.themes.light.colors.primary;

export const empty = defineConfig({});

const reused = { themes: { night: { extends: "dark" } } } as const;
export const fromConstant = defineConfig(reused);

export const typed: NeshelConfig = { contrast: "warn" };
export const fromAnnotated = defineConfig(typed);

const stack: readonly string[] = ["Inter", "sans-serif"];
export const readonlyStack = defineConfig({ typography: { families: { mono: stack } } });
