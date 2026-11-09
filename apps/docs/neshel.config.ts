import inter from "@capsizecss/metrics/inter";
import { defineConfig } from "@neshel-ui/config";

// The documentation site keeps Neshel's default identity and breakpoints. Two named themes show
// application-owned branding in the examples (landing page, theming guide): `evergreen` and
// `aurora`. `neshel generate` (run by dev/build) writes app/neshel.generated.css.
export default defineConfig({
  // The site loads Inter from @fontsource-variable/inter (SIL OFL 1.1), whose family name is
  // "Inter Variable"; its Capsize metrics keep headings and paragraphs precisely trimmed.
  typography: {
    families: {
      body: ["Inter Variable", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      display: ["Inter Variable", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
    },
    metrics: { body: inter, display: inter },
  },
  themes: {
    evergreen: {
      extends: "light",
      colors: {
        background: "#f6f8f4",
        foreground: "#13261c",
        surface: "#ffffff",
        surfaceForeground: "#13261c",
        muted: "#e6ece4",
        mutedForeground: "#435448",
        primary: "#1f5136",
        primaryForeground: "#ffffff",
        secondary: "#dbe7dd",
        secondaryForeground: "#1f5136",
        accent: "#c8702a",
        accentForeground: "#1b0d02",
        border: "#d3ddd3",
        focus: "#1f5136",
      },
    },
    aurora: {
      extends: "dark",
      colors: {
        background: "#120f24",
        foreground: "#efeafd",
        surface: "#1d1838",
        surfaceForeground: "#efeafd",
        muted: "#262046",
        mutedForeground: "#bfb7dc",
        primary: "#b9a6ff",
        primaryForeground: "#160d3b",
        accent: "#5fd4c4",
        accentForeground: "#04211d",
      },
    },
  },
  output: "./app/neshel.generated.css",
});
