import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  // Relative asset URLs so the built pages also open from the file system (animations browser check).
  base: "./",
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      // Paths relative to the Vite root. `animations.html` hosts the feature 008.0 experiments.
      input: {
        main: "index.html",
        animations: "animations.html",
        // Feature 017: Accordion, Collapsible, Switch, Toast and the nested-dialog scenario.
        components: "components.html",
        // Phase 013 PT09: two same-origin documents for cross-document View Transitions.
        "mpa-a": "mpa-a.html",
        "mpa-b": "mpa-b.html",
      },
    },
  },
});
