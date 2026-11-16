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
      input: { main: "index.html", animations: "animations.html" },
    },
  },
});
