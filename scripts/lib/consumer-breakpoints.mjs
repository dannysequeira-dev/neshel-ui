// Configured consumers with custom breakpoints (feature 004 FR-051, SC-002, SC-003): packed
// config + cli + layout + typography, `neshel generate` through the installed bin (stylesheet and
// declarations), TypeScript in Bundler and NodeNext resolution with negative fixtures, a Vite build,
// SSR prerender and browser hydration.
//   configured-extend : Tailwind v4, extend mode, `tailwind: true`, package stylesheets + generated
//   configured-replace: plain CSS, replace mode, generated stylesheet instead of package stylesheets
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  BREAKPOINT_CASES,
  breakpointCasesTsx,
  EXTEND_BREAKPOINTS,
  REPLACE_BREAKPOINTS,
} from "./breakpoint-cases.mjs";
import { stylesheetClasses } from "./layout-css.mjs";
import { pnpm } from "./pnpm.mjs";

export const TYPOGRAPHY = "@neshel-ui/typography";

const tsconfig = (overrides) =>
  `${JSON.stringify(
    {
      compilerOptions: {
        target: "ES2022",
        lib: ["ES2022", "DOM", "DOM.Iterable"],
        module: "ESNext",
        moduleResolution: "Bundler",
        jsx: "react-jsx",
        strict: true,
        noEmit: true,
        skipLibCheck: true,
        types: ["vite/client"],
        ...overrides.compilerOptions,
      },
      include: overrides.include,
    },
    null,
    2,
  )}\n`;

/** The owner's Phase 004 example, adapted to the replace-mode names. */
const welcomeTsx = (layout, typography) => `import { Grid, Stack } from "${layout}";
import { Heading, Paragraph, Text } from "${typography}";

export function Welcome() {
  return (
    <Stack space={{ base: "3", tablet: "6" }} data-welcome="">
      <Heading as="h1" size={{ base: "xl", tablet: "3xl", wide: "5xl" }} weight="bold">
        Welcome to Neshel-UI
      </Heading>
      <Paragraph size="base" tone="muted">
        Rooted in faith. Built with hope.
      </Paragraph>
      <Grid columns={{ base: 1, tablet: 2, desktop: 3 }} space="4">
        <Text>Layout</Text>
        <Text>Typography</Text>
        <Text>Components</Text>
      </Grid>
    </Stack>
  );
}
`;

/** Type fixtures: configured names accepted, obsolete/unknown names rejected. */
function typeFixtureTsx({ layout, typography, mode }) {
  const obsolete =
    mode === "replace"
      ? `// @ts-expect-error "md" is not configured in replace mode
export const obsolete = <Stack space={{ base: "2", md: "4" }} />;
// @ts-expect-error "lg" is not configured in replace mode
export const obsoleteHeading = <Heading size={{ base: "lg", lg: "xl" }} />;
`
      : `export const defaults = <Stack space={{ base: "2", sm: "3", md: "4", "2xl": "8" }} />;
`;
  const custom = mode === "replace" ? "tablet" : "phone";
  return `import type { BreakpointName } from "@neshel-ui/config";
import { Grid, Stack } from "${layout}";
import { Heading } from "${typography}";

export const names: BreakpointName[] = [${(mode === "replace" ? Object.keys(REPLACE_BREAKPOINTS) : ["phone", "sm", "md", "lg", "xl", "2xl", "wide3"]).map((n) => JSON.stringify(n)).join(", ")}];
export const custom = <Grid columns={{ base: 1, ${custom}: 2 }} />;
export const heading = <Heading size={{ base: "lg", ${custom}: "2xl" }} />;
${obsolete}// @ts-expect-error unknown breakpoint name
export const typo = <Grid columns={{ base: 1, tablett: 2 }} />;
`;
}

const appTsx = `import { BreakpointCases } from "./breakpoint-cases";
import { Welcome } from "./welcome";

export function App() {
  return (
    <main>
      <Welcome />
      <BreakpointCases />
    </main>
  );
}
`;

/** Prerender (Node SSR from the tarballs) + generic checks; mirrors consumer-layout.mjs. */
const prerenderMjs = `import { readFileSync, writeFileSync } from "node:fs";
const { render } = await import("./dist-server/entry-server.js");
const html = render();
const page = readFileSync("dist/index.html", "utf8");
writeFileSync("dist/index.html", page.replace('<div id="root"></div>', '<div id="root">' + html + "</div>"));
console.log(JSON.stringify({ ssrBytes: html.length, cases: (html.match(/data-bp-case=/g) ?? []).length, windowDefined: typeof window !== "undefined" }));
`;

function variant({ mode, tailwind, CONFIG, CLI, LAYOUT, BASE_DEV, TAILWIND_DEV, viteConfig }) {
  const breakpoints = mode === "replace" ? REPLACE_BREAKPOINTS : EXTEND_BREAKPOINTS;
  const config = {
    breakpoints: { mode, values: breakpoints, ...(tailwind ? { tailwind: true } : {}) },
    output: "./src/neshel.generated.css",
    types: "./src/neshel.generated.d.ts",
  };
  const cases = BREAKPOINT_CASES[mode];
  const stylesheet = tailwind
    ? // Package stylesheets first, generated file after them (contracts/breakpoints.md §5).
      `@import "tailwindcss";\n@import "${CONFIG}/tailwind.css";\n@import "${LAYOUT}/styles.css";\n@import "${TYPOGRAPHY}/styles.css";\n@import "./neshel.generated.css";\n`
    : // The generated file replaces the package stylesheets.
      `@import "${CONFIG}/tokens.css";\n@import "./neshel.generated.css";\n\nbody { margin: 0; }\n`;
  return {
    title: `Neshel-UI consumer — ${mode} breakpoints`,
    devDependencies: [...BASE_DEV, ...(tailwind ? TAILWIND_DEV : [])],
    packages: [CONFIG, CLI, LAYOUT, TYPOGRAPHY],
    breakpointCases: cases,
    files: () => ({
      "neshel.config.ts": `import { defineConfig } from "${CONFIG}";\n\nexport default defineConfig(${JSON.stringify(config, null, 2)});\n`,
      "tsconfig.json": tsconfig({ include: ["src", "vite.config.ts", "neshel.config.ts"] }),
      "tsconfig.nodenext.json": tsconfig({
        compilerOptions: { module: "NodeNext", moduleResolution: "NodeNext", types: [] },
        include: ["src/type-fixture.tsx", "src/neshel.generated.d.ts"],
      }),
      // Negative control: without the generated declarations the same fixture must fail.
      "tsconfig.no-declarations.json": tsconfig({
        compilerOptions: { module: "NodeNext", moduleResolution: "NodeNext", types: [] },
        include: ["src/type-fixture.tsx"],
      }),
      "vite.config.ts": viteConfig(
        tailwind
          ? {
              imports:
                'import tailwindcss from "@tailwindcss/vite";\nimport react from "@vitejs/plugin-react";',
              list: "react(), tailwindcss()",
            }
          : { imports: 'import react from "@vitejs/plugin-react";', list: "react()" },
      ),
      "src/styles.css": stylesheet,
      "src/App.tsx": appTsx,
      "src/welcome.tsx": welcomeTsx(LAYOUT, TYPOGRAPHY).replace(
        mode === "extend" ? /tablet|wide|desktop/g : /$^/,
        (name) => ({ tablet: "md", wide: '"2xl"', desktop: "lg" })[name] ?? name,
      ),
      "src/breakpoint-cases.tsx": breakpointCasesTsx(cases, {
        layout: LAYOUT,
        typography: TYPOGRAPHY,
      }),
      "src/type-fixture.tsx": typeFixtureTsx({ layout: LAYOUT, typography: TYPOGRAPHY, mode }),
      "src/entry-server.tsx": `import { StrictMode } from "react";
import { renderToString } from "react-dom/server";
import { App } from "./App";

export function render() {
  return renderToString(<StrictMode><App /></StrictMode>);
}
`,
      "prerender.mjs": prerenderMjs,
    }),
    prepare: ({ appDir, node, step }) => {
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
      const generated = step("neshel generate (stylesheet + declarations)", () =>
        run(["generate"]),
      );
      if (!generated.ok) errors.push(`neshel generate failed:\n${generated.output}`);
      const check = step("neshel generate --check", () => run(["generate", "--check"]));
      if (!check.ok) errors.push(`neshel generate --check failed:\n${check.output}`);
      const tsc = join(appDir, "node_modules", "typescript", "bin", "tsc");
      const nodenext = step("tsc --noEmit (NodeNext resolution, generated declarations)", () =>
        node([tsc, "-p", "tsconfig.nodenext.json"], appDir),
      );
      if (nodenext.status !== 0) {
        errors.push(`NodeNext type check failed:\n${nodenext.stdout}${nodenext.stderr}`);
      }
      const negative = step("negative control: type check without the declarations fails", () =>
        node([tsc, "-p", "tsconfig.no-declarations.json"], appDir),
      );
      if (negative.status === 0) {
        errors.push("type check passed without the generated declarations (fixture is vacuous)");
      } else if (!/TS2353|TS2578|TS2322/.test(negative.stdout)) {
        errors.push(`negative control failed for an unexpected reason:\n${negative.stdout}`);
      }
      return errors;
    },
    postBuild: ({ appDir, node, step }) => {
      const vite = join(appDir, "node_modules", "vite", "bin", "vite.js");
      const ssr = step("vite build --ssr (server entry)", () =>
        node([vite, "build", "--ssr", "src/entry-server.tsx", "--outDir", "dist-server"], appDir),
      );
      if (ssr.status !== 0) return [`SSR build failed:\n${ssr.stdout}${ssr.stderr}`];
      const run = step("prerender from the tarballs", () => node(["prerender.mjs"], appDir));
      try {
        const result = JSON.parse(run.stdout.trim().split("\n").at(-1));
        const errors = [];
        if (result.cases !== cases.length)
          errors.push(`SSR rendered ${result.cases} cases, expected ${cases.length}`);
        if (result.windowDefined) errors.push("prerender ran with a window global");
        console.info(`  · SSR: ${result.ssrBytes} bytes prerendered`);
        return errors;
      } catch {
        return [`prerender failed:\n${run.stdout}${run.stderr}`];
      }
    },
    check: ({ outputCss, appDir }) => {
      const errors = [];
      const generated = readFileSync(join(appDir, "src", "neshel.generated.css"), "utf8");
      const declarations = readFileSync(join(appDir, "src", "neshel.generated.d.ts"), "utf8");
      const names =
        mode === "replace"
          ? Object.keys(breakpoints)
          : ["phone", "sm", "md", "lg", "xl", "2xl", "wide3"];
      if (
        !declarations.includes(
          `readonly names: ${names.map((n) => JSON.stringify(n)).join(" | ")};`,
        )
      ) {
        errors.push(`declarations do not list ${names.join(", ")}`);
      }
      for (const pkg of [LAYOUT, TYPOGRAPHY]) {
        if (!generated.includes(`/* ${pkg} `))
          errors.push(`generated CSS lacks the ${pkg} section`);
      }
      const built = new Set(stylesheetClasses(outputCss));
      const expectClasses =
        mode === "replace"
          ? [
              "neshel-tablet-cols-2",
              "neshel-desktop-gap-6",
              "neshel-wide-text-size-5xl",
              "neshel-phoneXL-align-start",
            ]
          : [
              "neshel-phone-gap-4",
              "neshel-sm-gap-5",
              "neshel-wide3-d-block",
              "neshel-phone-text-size-2xl",
            ];
      for (const name of expectClasses) {
        if (!built.has(name)) errors.push(`built CSS lacks .${name}`);
      }
      if (
        mode === "replace" &&
        [...built].some((name) => /^neshel-(sm|md|lg|xl|2xl)-/.test(name))
      ) {
        errors.push("replace mode: built CSS still contains default-breakpoint classes");
      }
      if (!/--neshel-breakpoints:\s*"/.test(outputCss))
        errors.push("built CSS lacks --neshel-breakpoints");
      if (tailwind) {
        if (!/\.phone\\:block/.test(outputCss))
          errors.push("Tailwind did not generate phone:block");
        if (!/\.wide3\\:block/.test(outputCss))
          errors.push("Tailwind did not generate wide3:block");
        if (!/@media \(width>=30rem\)/.test(outputCss))
          errors.push("Tailwind phone variant is not 30rem");
      }
      if (/@source\b/.test(outputCss)) errors.push("built CSS contains @source");
      return errors;
    },
  };
}

export function breakpointVariants(context) {
  return {
    "configured-extend": variant({ ...context, mode: "extend", tailwind: true }),
    "configured-replace": variant({ ...context, mode: "replace", tailwind: false }),
  };
}
