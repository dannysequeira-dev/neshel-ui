import { defineConfig } from "@neshel-ui/config";

// Storybook demonstrates custom breakpoints in extend mode: the defaults (sm, md, lg, xl, 2xl)
// plus `phone` (30rem) and `tablet` (52rem), synchronised with Tailwind. `neshel generate` (run by
// the dev/build scripts) writes src/neshel.generated.css (gitignored, imported after the package
// stylesheets) and src/neshel.generated.d.ts (committed so type checking works before a build).
export default defineConfig({
  breakpoints: {
    mode: "extend",
    values: { phone: "30rem", tablet: "52rem" },
    tailwind: true,
  },
  output: "./src/neshel.generated.css",
  types: "./src/neshel.generated.d.ts",
});
