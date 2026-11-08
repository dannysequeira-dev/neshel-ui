// Negative type fixtures: each `@ts-expect-error` must be needed, or `pnpm typecheck` fails.
import { defineConfig } from "../src/index.js";

// Misspelled role.
// @ts-expect-error unknown colour role "primay"
defineConfig({ themes: { light: { colors: { primay: "#fff" } } } });

// Named theme without a base.
// @ts-expect-error named themes must declare extends
defineConfig({ themes: { sepia: { colors: { background: "#f4ecd8" } } } });

// Base on a built-in theme.
// @ts-expect-error light cannot extend another theme
defineConfig({ themes: { light: { extends: "dark" } } });

// Unknown base.
// @ts-expect-error extends must be "light" or "dark"
defineConfig({ themes: { sepia: { extends: "sepia-base" } } });

// Reserved theme name.
// @ts-expect-error "system" is reserved
defineConfig({ themes: { system: { colors: {} } } });

// Unsupported schema version.
// @ts-expect-error only version 1 exists
defineConfig({ version: 2 });

// Unknown top-level key.
// @ts-expect-error unknown key "colours"
defineConfig({ colours: {} });

// Unknown nested keys.
// @ts-expect-error unknown radius key
defineConfig({ radius: { huge: "2rem" } });
// @ts-expect-error unknown font role
defineConfig({ typography: { families: { heading: "Inter" } } });
defineConfig({
  typography: {
    // @ts-expect-error unknown metrics field
    metrics: { body: { capHeight: 1, ascent: 1, descent: 1, lineGap: 0, unitsPerEm: 1, x: 1 } },
  },
});

// Wrong value types.
// @ts-expect-error colours are strings
defineConfig({ themes: { dark: { colors: { primary: 0x193767 } } } });
// @ts-expect-error contrast is "warn" | "error"
defineConfig({ contrast: "strict" });

// Extra key on a non-literal object.
const external = { themes: { light: { colors: { primary: "#fff" } } }, extra: true };
// @ts-expect-error unknown key "extra" on a reused object
defineConfig(external);
