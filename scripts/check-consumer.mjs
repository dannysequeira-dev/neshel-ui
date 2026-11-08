// pnpm check:consumer [--no-build] [--keep]
// External consumer smoke test (research R13–R16, FR-021, SC-005): installs the packed
// @neshel-ui/config tarball into a freshly generated React 19 + TypeScript + Vite +
// Tailwind CSS v4 app outside the repository, builds it and asserts the CSS output.
// Network access is needed for the tools; Neshel-UI itself comes only from the tarball.
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join, relative, sep } from "node:path";
import { checkConsumerCss } from "./lib/consumer-checks.mjs";
import { packPackage, pnpm } from "./lib/pnpm.mjs";
import { createTempDir } from "./lib/temp.mjs";
import { listWorkspacePackages, repoRoot } from "./lib/workspace.mjs";

const PACKAGE_UNDER_TEST = "@neshel-ui/config";
// Tool versions are pinned to what the workspace resolved for the Vite playground (R13).
const VERSION_SOURCE = join(repoRoot, "apps", "playground-vite");
const DEPENDENCIES = ["react", "react-dom"];
const DEV_DEPENDENCIES = [
  "@tailwindcss/vite",
  "@types/react",
  "@types/react-dom",
  "@vitejs/plugin-react",
  "tailwindcss",
  "typescript",
  "vite",
];
// Utilities the generated app uses; each must reference its token variable (R14 item 3).
const NESHEL_UTILITIES = [
  { className: "bg-neshel-background", variable: "--neshel-background" },
  { className: "text-neshel-foreground", variable: "--neshel-foreground" },
  { className: "bg-neshel-surface", variable: "--neshel-surface" },
  { className: "border-neshel-border", variable: "--neshel-border" },
  { className: "bg-neshel-primary", variable: "--neshel-primary" },
  { className: "text-neshel-primary-foreground", variable: "--neshel-primary-foreground" },
  { className: "rounded-neshel-base", variable: "--neshel-radius-base" },
  { className: "font-neshel-body", variable: "--neshel-font-body" },
];
const CORE_UTILITIES = ["min-h-screen", "p-10", "rounded-2xl", "font-semibold"];

function workspaceVersion(name) {
  const manifest = join(VERSION_SOURCE, "node_modules", ...name.split("/"), "package.json");
  return JSON.parse(readFileSync(realpathSync(manifest), "utf8")).version;
}

function node(args, cwd) {
  return spawnSync(process.execPath, args, { cwd, encoding: "utf8" });
}

function step(label, action) {
  const started = Date.now();
  const result = action();
  console.info(`  ✓ ${label} (${((Date.now() - started) / 1000).toFixed(1)}s)`);
  return result;
}

function writeApp(appDir, tarballName) {
  const versions = (names) => Object.fromEntries(names.map((n) => [n, workspaceVersion(n)]));
  const files = {
    "package.json": `${JSON.stringify(
      {
        name: "neshel-consumer-smoke",
        private: true,
        type: "module",
        dependencies: {
          [PACKAGE_UNDER_TEST]: `file:./vendor/${tarballName}`,
          ...versions(DEPENDENCIES),
        },
        devDependencies: versions(DEV_DEPENDENCIES),
      },
      null,
      2,
    )}\n`,
    // Mirrors the repository: esbuild (Vite 7) needs its install script.
    "pnpm-workspace.yaml": "allowBuilds:\n  esbuild: true\n",
    "index.html": `<!doctype html>
<html lang="en">
  <head><meta charset="UTF-8" /><title>Neshel-UI consumer smoke test</title></head>
  <body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body>
</html>
`,
    "tsconfig.json": `${JSON.stringify(
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
        include: ["src", "vite.config.ts"],
      },
      null,
      2,
    )}\n`,
    "vite.config.ts": `import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({ plugins: [react(), tailwindcss()] });
`,
    // Documented CSS entry point (docs/theming.md, package-contracts.md).
    "src/styles.css": `@import "tailwindcss";
@import "${PACKAGE_UNDER_TEST}/styles.css";
`,
    // Type-level and runtime resolution of the package's JavaScript entry.
    "src/neshel.ts": `import * as neshelConfig from "${PACKAGE_UNDER_TEST}";

export const neshelConfigModule: typeof neshelConfig = neshelConfig;
`,
    "src/App.tsx": `export function App() {
  return (
    <main className="min-h-screen bg-neshel-background p-10 font-neshel-body text-neshel-foreground">
      <section className="rounded-2xl border border-neshel-border bg-neshel-surface p-10">
        <h1 className="font-semibold">Neshel-UI consumer smoke test</h1>
        <button type="button" className="rounded-neshel-base bg-neshel-primary text-neshel-primary-foreground">
          Primary
        </button>
      </section>
    </main>
  );
}
`,
    "src/main.tsx": `import { StrictMode } from "react";
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
`,
    // Node resolution of the installed package: public entry and CSS resolve, internals do not.
    "encapsulation.mjs": `const result = {};
await import("${PACKAGE_UNDER_TEST}");
result.css = import.meta.resolve("${PACKAGE_UNDER_TEST}/styles.css");
try {
  await import("${PACKAGE_UNDER_TEST}/dist/index.js");
  result.deepImport = "resolved";
} catch (error) {
  result.deepImport = error.code;
}
console.log(JSON.stringify(result));
`,
  };
  for (const [path, contents] of Object.entries(files)) {
    const target = join(appDir, ...path.split("/"));
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, contents);
  }
}

function isInside(child, parent) {
  const rel = relative(parent, child);
  return rel !== "" && !rel.startsWith("..") && !rel.startsWith(sep) && !/^[a-z]:/i.test(rel);
}

async function main() {
  const config = listWorkspacePackages().find((pkg) => pkg.name === PACKAGE_UNDER_TEST);
  if (!config?.intendedPublic)
    throw new Error(`${PACKAGE_UNDER_TEST} is not an intended public package`);

  if (!process.argv.includes("--no-build")) {
    console.info("Building packages (pnpm build:packages)...");
    pnpm(["build:packages"], repoRoot);
  }

  // Outside the repository, with spaces and Unicode in every generated segment.
  const keep = process.argv.includes("--keep");
  const { dir: workDir, dispose } = createTempDir("neshel consumer ñ-", { keep });
  const appDir = join(workDir, "consumer app ñ");
  const errors = [];
  console.info(`External consumer: ${appDir}`);
  try {
    const tarball = step(`pack ${PACKAGE_UNDER_TEST}`, () =>
      packPackage(config.dir, join(workDir, "tarballs")),
    );
    mkdirSync(join(appDir, "vendor"), { recursive: true });
    copyFileSync(tarball, join(appDir, "vendor", basename(tarball)));
    step("generate React 19 + TypeScript + Vite + Tailwind v4 app", () =>
      writeApp(appDir, basename(tarball)),
    );
    // No lockfile exists yet; CI defaults to --frozen-lockfile, so opt out explicitly.
    step("pnpm install (tools from the registry, Neshel-UI from the tarball)", () =>
      pnpm(["install", "--no-frozen-lockfile"], appDir, { isolated: true }),
    );

    const installed = realpathSync(join(appDir, "node_modules", ...PACKAGE_UNDER_TEST.split("/")));
    if (!isInside(installed, realpathSync(appDir)) || isInside(installed, realpathSync(repoRoot))) {
      errors.push(
        `${PACKAGE_UNDER_TEST} resolves to ${installed}, not to a copy inside the consumer`,
      );
    }
    const installedManifest = JSON.parse(readFileSync(join(installed, "package.json"), "utf8"));
    console.info(
      `  · installed ${installedManifest.name}@${installedManifest.version} at ${installed}`,
    );

    const tsc = step("tsc --noEmit (Bundler resolution)", () =>
      node(
        [join(appDir, "node_modules", "typescript", "bin", "tsc"), "-p", "tsconfig.json"],
        appDir,
      ),
    );
    if (tsc.status !== 0)
      errors.push(`TypeScript failed in the consumer:\n${tsc.stdout}${tsc.stderr}`);

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
      const packageCss = readFileSync(join(installed, "dist", "styles.css"), "utf8");
      errors.push(
        ...checkConsumerCss(outputCss, packageCss, {
          neshelUtilities: NESHEL_UTILITIES,
          coreUtilities: CORE_UTILITIES,
        }),
      );
      console.info(
        `  · ${cssFiles.join(", ")}: ${outputCss.length} bytes checked against ${NESHEL_UTILITIES.length} Neshel and ${CORE_UTILITIES.length} core utilities`,
      );
    }

    const encapsulation = node(["encapsulation.mjs"], appDir);
    try {
      const result = JSON.parse(encapsulation.stdout);
      const cssPath = realpathSync(new URL(result.css));
      if (!isInside(cssPath, installed)) {
        errors.push(`${PACKAGE_UNDER_TEST}/styles.css resolved outside the installed package`);
      }
      if (result.deepImport !== "ERR_PACKAGE_PATH_NOT_EXPORTED") {
        errors.push(
          `unexported deep import was not blocked by "exports" (got ${result.deepImport})`,
        );
      }
      console.info(
        "  ✓ Node resolution: public entry and styles.css resolve; dist/ internals blocked",
      );
    } catch {
      errors.push(`Node resolution check failed:\n${encapsulation.stdout}${encapsulation.stderr}`);
    }
  } finally {
    if (keep) console.info(`Kept ${workDir} (--keep).`);
    dispose();
  }

  if (errors.length > 0) {
    for (const error of errors) console.error(`ERROR ${error}`);
    console.error("check:consumer failed.");
    process.exitCode = 1;
  } else {
    console.info(
      `check:consumer passed: ${PACKAGE_UNDER_TEST} works from its tarball in an external app.`,
    );
  }
}

main().catch((error) => {
  console.error(`check:consumer could not complete: ${error.message}`);
  process.exitCode = 1;
});
