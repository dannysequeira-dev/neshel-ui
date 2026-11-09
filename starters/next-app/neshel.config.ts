import { defineConfig } from "@neshel-ui/config";

// Custom breakpoints (replace mode) and a named theme. `neshel generate` (run by dev/build) writes
// app/neshel.generated.css and neshel.generated.d.ts.
export default defineConfig({
  breakpoints: {
    mode: "replace",
    values: {
      phone: "30rem",
      phoneXL: "40rem",
      tablet: "48rem",
      laptop: "64rem",
      desktop: "80rem",
      wide: "96rem",
    },
    tailwind: true,
  },
  themes: {
    harbor: {
      extends: "dark",
      colors: {
        background: "#06202b",
        foreground: "#e6f4f7",
        surface: "#0c3140",
        surfaceForeground: "#e6f4f7",
        primary: "#7fd4e8",
        primaryForeground: "#04212b",
        accent: "#f2b880",
        accentForeground: "#2a1605",
      },
    },
  },
  output: "./app/neshel.generated.css",
  types: "./neshel.generated.d.ts",
});
