import { defineConfig } from "@neshel-ui/config";

// Your application's identity. Edit the colours, then run `npm run dev` (it runs `neshel generate`).
// Remove this file and the generated import in src/index.css to use Neshel's default theme.
export default defineConfig({
  radius: { base: "0.625rem" },
  themes: {
    light: { colors: { primary: "#1d4ed8", primaryForeground: "#ffffff", focus: "#1d4ed8" } },
    dark: { colors: { primary: "#93b4ff", primaryForeground: "#0b1736", focus: "#93b4ff" } },
  },
  output: "./src/neshel.generated.css",
});
