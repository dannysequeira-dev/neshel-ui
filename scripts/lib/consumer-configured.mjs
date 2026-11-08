// The "configured" consumer variant (feature 002 T058): packed @neshel-ui/config + @neshel-ui/cli,
// a typed neshel.config.ts, `neshel generate` through the installed bin, then a Tailwind build
// with the canonical import order. Expectations come from the same fixture configuration that
// check-browser.mjs uses for computed styles.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { checkConsumerCss, checkLayerStatement, declaredTokens } from "./consumer-checks.mjs";
import { pnpm } from "./pnpm.mjs";

/** Shared with scripts/check-browser.mjs (hex only, so computed values are exact). */
export const CONFIGURED_FIXTURE = {
  themes: {
    light: { colors: { primary: "#1d3f73", background: "#fffdf8" } },
    sepia: { extends: "light", colors: { background: "#f4ecd8", foreground: "#2b2118" } },
  },
};

export function configuredVariant({ CONFIG, CLI, BASE_DEV, TAILWIND_DEV, viteConfig }) {
  return {
    title: "Neshel-UI consumer — configured",
    devDependencies: [...BASE_DEV, ...TAILWIND_DEV],
    packages: [CONFIG, CLI],
    files: () => ({
      "neshel.config.ts": `import { defineConfig } from "${CONFIG}";

export default defineConfig(${JSON.stringify({ ...CONFIGURED_FIXTURE, output: "./src/neshel.generated.css" }, null, 2)});
`,
      "vite.config.ts": viteConfig({
        imports:
          'import tailwindcss from "@tailwindcss/vite";\nimport react from "@vitejs/plugin-react";',
        list: "react(), tailwindcss()",
      }),
      // Canonical order (contracts/css.md): Tailwind, Neshel stylesheet, generated file.
      "src/styles.css": `@import "tailwindcss";\n@import "${CONFIG}/tailwind.css";\n@import "./neshel.generated.css";\n`,
      "src/App.tsx": `export function App() {
  return (
    <main className="min-h-screen bg-neshel-background p-10 text-neshel-foreground">
      <button type="button" className="rounded-neshel-md bg-neshel-primary text-neshel-primary-foreground">
        Primary
      </button>
      <section data-neshel-theme="sepia" className="bg-neshel-surface">Sepia</section>
      <div data-neshel-theme="dark" className="scheme-light">Scheme interaction (C9)</div>
    </main>
  );
}
`,
    }),
    prepare: ({ appDir, step }) => {
      const errors = [];
      const run = (args) => {
        try {
          return {
            ok: true,
            output: pnpm(["exec", "neshel", ...args], appDir, { isolated: true }),
          };
        } catch (error) {
          return { ok: false, output: error.message };
        }
      };
      const generated = step("neshel generate (installed bin)", () => run(["generate"]));
      if (!generated.ok) errors.push(`neshel generate failed:\n${generated.output}`);
      const check = step("neshel generate --check --strict", () =>
        run(["generate", "--check", "--strict"]),
      );
      if (!check.ok) errors.push(`neshel generate --check --strict failed:\n${check.output}`);
      return errors;
    },
    check: ({ outputCss, installed, appDir }) => {
      const tailwind = readFileSync(join(installed, "dist", "tailwind.css"), "utf8");
      const generated = readFileSync(join(appDir, "src", "neshel.generated.css"), "utf8");
      const errors = [
        ...checkConsumerCss(outputCss, tailwind, {
          neshelUtilities: [
            { className: "bg-neshel-primary", variable: "--neshel-primary" },
            { className: "bg-neshel-surface", variable: "--neshel-surface" },
          ],
          coreUtilities: ["min-h-screen", "p-10"],
        }),
        ...checkLayerStatement(outputCss),
      ];
      if (!/@layer neshel\.config \{/.test(generated))
        errors.push("generated CSS is not in @layer neshel.config");
      for (const token of declaredTokens(tailwind)) {
        if (!generated.includes(`${token}:`))
          errors.push(`generated CSS lacks ${token} (blocks must be complete)`);
      }
      if (!/@layer neshel\.config\{/.test(outputCss))
        errors.push("built CSS lost the neshel.config layer block");
      if (!/--neshel-primary:#1d3f73/.test(outputCss))
        errors.push("built CSS lacks the configured light primary");
      if (!/\[data-neshel-theme=sepia\]/.test(outputCss))
        errors.push("built CSS lacks the sepia theme");
      return errors;
    },
  };
}
