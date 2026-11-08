// pnpm generate:tokens [--check]
// Writes packages/config/src/{tokens,tailwind}.css from the contract `defaults`, using the
// CLI's private generator (ADR 0007 §7). Requires `pnpm build:packages` first. --check compares
// without writing and exits 1 on drift. Workflow: edit packages/config/src/contract.ts ->
// pnpm build:packages -> pnpm generate:tokens -> pnpm build:packages.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const cliDist = join(repoRoot, "packages", "cli", "dist");
const configSrc = join(repoRoot, "packages", "config", "src");
export const SHIPPED_HEADER =
  "@neshel-ui/config default tokens. Generated from defaults; do not edit.";

/** Render the shipped stylesheets in memory: { "tokens.css": string, "tailwind.css": string }. */
export async function renderDefaultCss() {
  const resolveModule = join(cliDist, "resolve.js");
  if (!existsSync(resolveModule)) {
    throw new Error("packages/cli/dist is missing; run pnpm build:packages first");
  }
  const { resolveConfig } = await import(pathToFileURL(resolveModule).href);
  const { generateCss } = await import(pathToFileURL(join(cliDist, "generate", "css.js")).href);
  const resolved = resolveConfig({});
  return {
    "tokens.css": generateCss(resolved, { layer: "defaults", header: SHIPPED_HEADER }),
    "tailwind.css": generateCss(resolved, {
      layer: "defaults",
      tailwind: true,
      header: SHIPPED_HEADER,
    }),
  };
}

/** Files whose committed content differs from the generator output. */
export async function findDrift() {
  const rendered = await renderDefaultCss();
  return Object.entries(rendered)
    .filter(([file, css]) => {
      const path = join(configSrc, file);
      return !existsSync(path) || readFileSync(path, "utf8") !== css;
    })
    .map(([file]) => file);
}

async function main() {
  if (process.argv.includes("--check")) {
    const drift = await findDrift();
    if (drift.length > 0) {
      console.error(
        `Out of date: ${drift.join(", ")}. Run pnpm build:packages && pnpm generate:tokens.`,
      );
      process.exitCode = 1;
    } else console.info("Shipped token stylesheets match the generator output.");
    return;
  }
  for (const [file, css] of Object.entries(await renderDefaultCss())) {
    writeFileSync(join(configSrc, file), css);
    console.info(`Wrote packages/config/src/${file}`);
  }
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main().catch((error) => {
    console.error(`generate:tokens failed: ${error.message}`);
    process.exitCode = 1;
  });
}
