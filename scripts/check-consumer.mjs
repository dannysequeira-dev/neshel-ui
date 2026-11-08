// pnpm check:consumer [--no-build] [--keep] [--variant <tailwind|plain|configured>]... [--artifacts <dir>]
// External consumer smoke tests (feature 001 R13–R16; feature 002 FR-029): packs the Neshel
// packages, installs the tarballs into freshly generated React 19 + TypeScript + Vite apps
// outside the repository (path with spaces and Unicode), builds them and asserts the CSS.
// Variants: tailwind (tailwind.css + Tailwind v4), plain (tokens.css, no Tailwind),
// configured (packed CLI generates CSS from neshel.config.ts). --artifacts copies each built
// dist/ to <dir>/<variant>/ for the browser check. Network access is needed for the tools.
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { checkConsumerCss, checkLayerStatement, checkPlainCss } from "./lib/consumer-checks.mjs";
import { configuredVariant } from "./lib/consumer-configured.mjs";
import { packPackage, pnpm } from "./lib/pnpm.mjs";
import { createTempDir } from "./lib/temp.mjs";
import { listWorkspacePackages, repoRoot } from "./lib/workspace.mjs";

const CONFIG = "@neshel-ui/config";
const CLI = "@neshel-ui/cli";
// Tool versions are pinned to what the workspace resolved for the Vite playground (R13).
const VERSION_SOURCE = join(repoRoot, "apps", "playground-vite");
const REACT = ["react", "react-dom"];
const BASE_DEV = ["@types/react", "@types/react-dom", "@vitejs/plugin-react", "typescript", "vite"];
const TAILWIND_DEV = ["@tailwindcss/vite", "tailwindcss"];

// Utilities the Tailwind app uses; each must reference its token variable (R14 item 3).
export const NESHEL_UTILITIES = [
  { className: "bg-neshel-background", variable: "--neshel-background" },
  { className: "text-neshel-foreground", variable: "--neshel-foreground" },
  { className: "bg-neshel-surface", variable: "--neshel-surface" },
  { className: "text-neshel-surface-foreground", variable: "--neshel-surface-foreground" },
  { className: "border-neshel-border", variable: "--neshel-border" },
  { className: "bg-neshel-muted", variable: "--neshel-muted" },
  { className: "text-neshel-muted-foreground", variable: "--neshel-muted-foreground" },
  { className: "bg-neshel-primary", variable: "--neshel-primary" },
  { className: "text-neshel-primary-foreground", variable: "--neshel-primary-foreground" },
  { className: "bg-neshel-accent", variable: "--neshel-accent" },
  { className: "text-neshel-accent-foreground", variable: "--neshel-accent-foreground" },
  { className: "bg-neshel-destructive", variable: "--neshel-destructive" },
  { className: "border-neshel-input", variable: "--neshel-input" },
  { className: "outline-neshel-focus", variable: "--neshel-focus" },
  { className: "rounded-neshel-base", variable: "--neshel-radius-base" },
  { className: "rounded-neshel-md", variable: "--neshel-radius-md" },
  { className: "rounded-neshel-full", variable: "--neshel-radius-full" },
  { className: "font-neshel-body", variable: "--neshel-font-body" },
  { className: "font-neshel-mono", variable: "--neshel-font-mono" },
];
const CORE_UTILITIES = ["min-h-screen", "p-10", "rounded-2xl", "font-semibold"];

function workspaceVersion(name) {
  const manifest = join(VERSION_SOURCE, "node_modules", ...name.split("/"), "package.json");
  return JSON.parse(readFileSync(realpathSync(manifest), "utf8")).version;
}
const versions = (names) => Object.fromEntries(names.map((n) => [n, workspaceVersion(n)]));

function node(args, cwd) {
  return spawnSync(process.execPath, args, { cwd, encoding: "utf8" });
}

function step(label, action) {
  const started = Date.now();
  const result = action();
  console.info(`  ✓ ${label} (${((Date.now() - started) / 1000).toFixed(1)}s)`);
  return result;
}

function writeFiles(appDir, files) {
  for (const [path, contents] of Object.entries(files)) {
    const target = join(appDir, ...path.split("/"));
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, contents);
  }
}

const tsconfig = `${JSON.stringify(
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
    },
    include: ["src", "vite.config.ts", "neshel.config.ts"],
  },
  null,
  2,
)}\n`;

const mainTsx = `import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { neshelConfigModule } from "./neshel";
import "./styles.css";

void neshelConfigModule;
const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
`;

/** Files shared by every variant; `vite.config.ts` and CSS/App differ per variant. */
function baseFiles(title) {
  return {
    // Mirrors the repository; a no-op with Vite 8, needed if a Vite 7 toolchain is pinned.
    "pnpm-workspace.yaml": "allowBuilds:\n  esbuild: true\n",
    "index.html": `<!doctype html>
<html lang="en">
  <head><meta charset="UTF-8" /><title>${title}</title></head>
  <body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body>
</html>
`,
    "tsconfig.json": tsconfig,
    // Type-level and runtime resolution of the package's JavaScript entry.
    "src/neshel.ts": `import * as neshelConfig from "${CONFIG}";

export const neshelConfigModule: typeof neshelConfig = neshelConfig;
`,
    "src/main.tsx": mainTsx,
    // Node resolution of the installed package: public entries and CSS resolve, internals do not.
    "encapsulation.mjs": `import { readFileSync } from "node:fs";
const result = {};
await import("${CONFIG}");
for (const css of ["tokens.css", "tailwind.css", "styles.css"]) {
  result[css] = import.meta.resolve("${CONFIG}/" + css);
}
result.aliasIdentical =
  readFileSync(new URL(result["styles.css"]), "utf8") === readFileSync(new URL(result["tailwind.css"]), "utf8");
try {
  await import("${CONFIG}/dist/index.js");
  result.deepImport = "resolved";
} catch (error) {
  result.deepImport = error.code;
}
console.log(JSON.stringify(result));
`,
  };
}

const viteConfig = (plugins) => `${plugins.imports}
import { defineConfig } from "vite";

// base "./" lets the browser check open dist/index.html from the file system.
export default defineConfig({ base: "./", plugins: [${plugins.list}] });
`;

const allVariants = {
  tailwind: {
    title: "Neshel-UI consumer — Tailwind",
    devDependencies: [...BASE_DEV, ...TAILWIND_DEV],
    packages: [CONFIG],
    files: () => ({
      "vite.config.ts": viteConfig({
        imports:
          'import tailwindcss from "@tailwindcss/vite";\nimport react from "@vitejs/plugin-react";',
        list: "react(), tailwindcss()",
      }),
      "src/styles.css": `@import "tailwindcss";\n@import "${CONFIG}/tailwind.css";\n`,
      "src/App.tsx": `export function App() {
  return (
    <main className="min-h-screen bg-neshel-background p-10 font-neshel-body text-neshel-foreground">
      <section className="rounded-2xl border border-neshel-border bg-neshel-surface p-10 text-neshel-surface-foreground">
        <h1 className="font-semibold">Neshel-UI consumer smoke test</h1>
        <p className="bg-neshel-muted text-neshel-muted-foreground">Muted</p>
        <button type="button" className="rounded-neshel-base bg-neshel-primary text-neshel-primary-foreground outline-neshel-focus">
          Primary
        </button>
        <span className="rounded-neshel-full bg-neshel-accent text-neshel-accent-foreground">Accent</span>
        <span className="rounded-neshel-md bg-neshel-destructive">Danger</span>
        <input aria-label="Name" className="border border-neshel-input" />
        <code className="font-neshel-mono">code</code>
        <div data-neshel-theme="dark" className="scheme-light">Scheme interaction (C9)</div>
      </section>
    </main>
  );
}
`,
    }),
    check: ({ outputCss, installed }) => [
      ...checkConsumerCss(
        outputCss,
        readFileSync(join(installed, "dist", "tailwind.css"), "utf8"),
        {
          neshelUtilities: NESHEL_UTILITIES,
          coreUtilities: CORE_UTILITIES,
        },
      ),
      ...checkLayerStatement(outputCss),
    ],
  },
  plain: {
    title: "Neshel-UI consumer — plain CSS",
    devDependencies: BASE_DEV,
    packages: [CONFIG],
    files: () => ({
      "vite.config.ts": viteConfig({
        imports: 'import react from "@vitejs/plugin-react";',
        list: "react()",
      }),
      "src/styles.css": `@import "${CONFIG}/tokens.css";

.card {
  background: var(--neshel-surface);
  color: var(--neshel-surface-foreground);
  border: 1px solid var(--neshel-border);
  border-radius: var(--neshel-radius-lg);
}
`,
      "src/App.tsx": `export function App() {
  return <section className="card">Neshel-UI plain CSS consumer</section>;
}
`,
      // SC-006: a bundle importing only defineConfig must stay tiny and carry no contract data.
      "size-entry.ts": `import { defineConfig } from "${CONFIG}";

export const config = defineConfig({ themes: { light: { colors: { primary: "#1d3f73" } } } });
`,
      "bundle-size.mjs": `import { build } from "vite";
const [result] = [].concat(
  await build({
    configFile: false,
    logLevel: "silent",
    build: {
      write: false,
      minify: true,
      lib: { entry: "size-entry.ts", formats: ["es"], fileName: "size" },
    },
  }),
);
const code = result.output.filter((chunk) => chunk.type === "chunk").map((chunk) => chunk.code).join("");
console.log(JSON.stringify({ bytes: Buffer.byteLength(code), code }));
`,
    }),
    check: ({ outputCss, installed, buildLog, appDir }) => {
      const errors = checkPlainCss(
        outputCss,
        readFileSync(join(installed, "dist", "tokens.css"), "utf8"),
      );
      if (/unknown at[- ]rule/i.test(buildLog)) {
        errors.push(`the build reported an unknown at-rule:\n${buildLog}`);
      }
      const size = node(["bundle-size.mjs"], appDir);
      try {
        const { bytes, code } = JSON.parse(size.stdout);
        if (bytes >= 1024) errors.push(`defineConfig-only bundle is ${bytes} bytes (limit < 1024)`);
        for (const marker of ["#fbf9f6", "surfaceForeground", "1.4.11"]) {
          if (code.includes(marker))
            errors.push(`defineConfig-only bundle contains contract data (${marker})`);
        }
        console.info(`  · defineConfig-only bundle: ${bytes} bytes minified`);
      } catch {
        errors.push(`bundle-size measurement failed:\n${size.stdout}${size.stderr}`);
      }
      return errors;
    },
  },
  configured: configuredVariant({ CONFIG, CLI, BASE_DEV, TAILWIND_DEV, viteConfig }),
};
/** Variants available in this checkout (a variant module may return undefined). */
export const variants = Object.fromEntries(
  Object.entries(allVariants).filter(([, variant]) => variant !== undefined),
);

function isInside(child, parent) {
  const rel = relative(parent, child);
  return rel !== "" && !rel.startsWith("..") && !rel.startsWith(sep) && !/^[a-z]:/i.test(rel);
}

function parseArgs(argv) {
  const selected = [];
  let artifacts;
  for (let index = 0; index < argv.length; index++) {
    if (argv[index] === "--variant") selected.push(argv[++index]);
    else if (argv[index] === "--artifacts") artifacts = resolve(argv[++index]);
  }
  for (const name of selected) {
    if (!variants[name]) throw new Error(`unknown variant "${name}"`);
  }
  return { selected: selected.length ? selected : Object.keys(variants), artifacts };
}

function runVariant(name, { workDir, tarballs, artifacts }) {
  const variant = variants[name];
  const appDir = join(workDir, `consumer ${name} ñ`);
  const errors = [];
  console.info(`\n[${name}] ${appDir}`);
  mkdirSync(join(appDir, "vendor"), { recursive: true });
  const dependencies = { ...versions(REACT) };
  for (const pkg of variant.packages) {
    const tarball = tarballs.get(pkg);
    copyFileSync(tarball, join(appDir, "vendor", basename(tarball)));
    dependencies[pkg] = `file:./vendor/${basename(tarball)}`;
  }
  writeFiles(appDir, {
    "package.json": `${JSON.stringify(
      {
        name: `neshel-consumer-${name}`,
        private: true,
        type: "module",
        dependencies,
        devDependencies: versions(variant.devDependencies),
      },
      null,
      2,
    )}\n`,
    ...baseFiles(variant.title),
    ...variant.files(),
  });
  // No lockfile exists yet; CI defaults to --frozen-lockfile, so opt out explicitly.
  step("pnpm install (tools from the registry, Neshel-UI from tarballs)", () =>
    pnpm(["install", "--no-frozen-lockfile"], appDir, { isolated: true }),
  );

  const installed = realpathSync(join(appDir, "node_modules", ...CONFIG.split("/")));
  if (!isInside(installed, realpathSync(appDir)) || isInside(installed, realpathSync(repoRoot))) {
    errors.push(`${CONFIG} resolves to ${installed}, not to a copy inside the consumer`);
  }
  if (variant.prepare) errors.push(...variant.prepare({ appDir, node, step }));

  const tsc = step("tsc --noEmit (Bundler resolution)", () =>
    node([join(appDir, "node_modules", "typescript", "bin", "tsc"), "-p", "tsconfig.json"], appDir),
  );
  if (tsc.status !== 0) errors.push(`TypeScript failed:\n${tsc.stdout}${tsc.stderr}`);

  const build = step("vite build", () =>
    node([join(appDir, "node_modules", "vite", "bin", "vite.js"), "build"], appDir),
  );
  if (build.status !== 0) {
    errors.push(`Vite build failed:\n${build.stdout}${build.stderr}`);
  } else {
    const assets = join(appDir, "dist", "assets");
    const cssFiles = readdirSync(assets).filter((file) => file.endsWith(".css"));
    if (cssFiles.length === 0) errors.push("Vite emitted no CSS asset");
    const outputCss = cssFiles.map((file) => readFileSync(join(assets, file), "utf8")).join("\n");
    errors.push(
      ...variant.check({
        outputCss,
        installed,
        appDir,
        buildLog: `${build.stdout}${build.stderr}`,
      }),
    );
    console.info(`  · ${cssFiles.join(", ")}: ${outputCss.length} bytes checked`);
    if (artifacts) {
      cpSync(join(appDir, "dist"), join(artifacts, name), { recursive: true });
      console.info(`  · copied dist/ to ${join(artifacts, name)}`);
    }
  }

  const encapsulation = node(["encapsulation.mjs"], appDir);
  try {
    const result = JSON.parse(encapsulation.stdout);
    for (const css of ["tokens.css", "tailwind.css", "styles.css"]) {
      if (!isInside(realpathSync(new URL(result[css])), installed)) {
        errors.push(`${CONFIG}/${css} resolved outside the installed package`);
      }
    }
    if (!result.aliasIdentical) errors.push("styles.css is not identical to tailwind.css");
    if (result.deepImport !== "ERR_PACKAGE_PATH_NOT_EXPORTED") {
      errors.push(`unexported deep import was not blocked by "exports" (got ${result.deepImport})`);
    }
    console.info("  ✓ Node resolution: entries and stylesheets resolve; dist/ internals blocked");
  } catch {
    errors.push(`Node resolution check failed:\n${encapsulation.stdout}${encapsulation.stderr}`);
  }
  return errors;
}

async function main() {
  const { selected, artifacts } = parseArgs(process.argv.slice(2));
  const packages = new Map(listWorkspacePackages().map((pkg) => [pkg.name, pkg]));
  if (!process.argv.includes("--no-build")) {
    console.info("Building packages (pnpm build:packages)...");
    pnpm(["build:packages"], repoRoot);
  }
  if (artifacts) mkdirSync(artifacts, { recursive: true });

  const keep = process.argv.includes("--keep");
  const { dir: workDir, dispose } = createTempDir("neshel consumer ñ-", { keep });
  const failures = [];
  try {
    const needed = new Set(selected.flatMap((name) => variants[name].packages));
    const tarballs = new Map();
    for (const name of needed) {
      const pkg = packages.get(name);
      if (!pkg?.intendedPublic) throw new Error(`${name} is not an intended public package`);
      tarballs.set(
        name,
        step(`pack ${name}`, () => packPackage(pkg.dir, join(workDir, "tarballs", pkg.dirName))),
      );
    }
    for (const name of selected) {
      const errors = runVariant(name, { workDir, tarballs, artifacts });
      if (errors.length) failures.push(...errors.map((error) => `[${name}] ${error}`));
      else console.info(`  ✓ variant ${name} passed`);
    }
  } finally {
    if (keep) console.info(`Kept ${workDir} (--keep).`);
    dispose();
  }

  if (failures.length > 0) {
    for (const error of failures) console.error(`ERROR ${error}`);
    console.error("check:consumer failed.");
    process.exitCode = 1;
  } else {
    console.info(`\ncheck:consumer passed: ${selected.join(", ")}.`);
  }
}

const invokedDirectly =
  existsSync(process.argv[1] ?? "") &&
  realpathSync(process.argv[1]) === realpathSync(new URL(import.meta.url));
if (invokedDirectly) {
  main().catch((error) => {
    console.error(`check:consumer could not complete: ${error.message}`);
    process.exitCode = 1;
  });
}
