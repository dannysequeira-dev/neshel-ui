// pnpm generate:component-css [--check]
// Writes src/style-manifest.json and src/styles.css of @neshel-ui/layout and @neshel-ui/typography
// from their built style tables, rendering the stylesheet with the CLI's shared renderer and the
// default breakpoints (ADR 0010 §3, contracts/generation.md). Requires `pnpm build:packages` first.
// --check compares without writing and exits 1 on drift.
// Workflow: edit src/style-tables.ts -> pnpm build:packages -> pnpm generate:component-css -> build.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
export const COMPONENT_PACKAGES = ["layout", "typography"];
const load = (path) => import(pathToFileURL(path).href);

function requireBuilt(path) {
  if (!existsSync(path)) throw new Error(`${path} is missing; run pnpm build:packages first`);
  return path;
}

/** Render one package's committed files in memory: { manifest, css, files }. */
export async function renderPackage(dirName) {
  const packageDir = join(repoRoot, "packages", dirName);
  const manifestJson = JSON.parse(readFileSync(join(packageDir, "package.json"), "utf8"));
  const tables = await load(requireBuilt(join(packageDir, "dist", "style-tables.js")));
  const { renderPackageStylesheet, manifestProblems } = await load(
    requireBuilt(join(repoRoot, "packages", "cli", "dist", "generate", "components.js")),
  );
  const { defaults } = await load(
    requireBuilt(join(repoRoot, "packages", "config", "dist", "index.js")),
  );
  const manifest = {
    schema: 1,
    package: manifestJson.name,
    version: manifestJson.version,
    layer: "components.neshel",
    ...tables.manifestRules(),
  };
  const problems = manifestProblems(JSON.parse(JSON.stringify(manifest)), manifestJson.name);
  if (problems.length > 0) throw new Error(`${manifestJson.name}: ${problems.join("; ")}`);
  const breakpoints = Object.entries(defaults.breakpoints).map(([name, width]) => ({
    name,
    width,
  }));
  return {
    manifest,
    files: {
      [join(packageDir, "src", "style-manifest.json")]: `${JSON.stringify(manifest, null, 2)}\n`,
      [join(packageDir, "src", "styles.css")]: renderPackageStylesheet(manifest, breakpoints),
    },
  };
}

/** Committed files that differ from the generator output (repo-relative, "/" separators). */
export async function findDrift(packages = COMPONENT_PACKAGES) {
  const drift = [];
  for (const dirName of packages) {
    const { files } = await renderPackage(dirName);
    for (const [path, content] of Object.entries(files)) {
      if (!existsSync(path) || readFileSync(path, "utf8") !== content) {
        drift.push(path.slice(repoRoot.length).split("\\").join("/"));
      }
    }
  }
  return drift;
}

async function main() {
  const packages = COMPONENT_PACKAGES.filter((name) =>
    existsSync(join(repoRoot, "packages", name, "src", "style-tables.ts")),
  );
  if (process.argv.includes("--check")) {
    const drift = await findDrift(packages);
    if (drift.length > 0) {
      console.error(
        `Out of date: ${drift.join(", ")}. Run pnpm build:packages && pnpm generate:component-css.`,
      );
      process.exitCode = 1;
    } else
      console.info(`Component stylesheets and manifests are up to date (${packages.join(", ")}).`);
    return;
  }
  for (const dirName of packages) {
    const { files } = await renderPackage(dirName);
    for (const [path, content] of Object.entries(files)) {
      writeFileSync(path, content);
      console.info(`Wrote ${path.slice(repoRoot.length).split("\\").join("/")}`);
    }
  }
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main().catch((error) => {
    console.error(`generate:component-css failed: ${error.message}`);
    process.exitCode = 1;
  });
}
