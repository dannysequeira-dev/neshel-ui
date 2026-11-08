import { defineConfig } from "@neshel-ui/config";

// Demonstrates the configured mode: `neshel generate` (run by the dev/build scripts) writes
// src/neshel.generated.css, imported after the Neshel stylesheet in src/styles.css.
export default defineConfig({
  themes: {
    sepia: {
      extends: "light",
      colors: {
        background: "#f4ecd8",
        surface: "#fbf6ea",
        foreground: "#2b2118",
        surfaceForeground: "#2b2118",
        muted: "#ebe0c8",
        mutedForeground: "#5a4a35",
      },
    },
  },
  contrast: "error",
  output: "./src/neshel.generated.css",
});
