// node packages/layout/scripts/generate-css.mjs [--check]
// Writes packages/layout/src/styles.css from the built style tables (ADR 0008, R15). Requires
// `pnpm build:packages` (or the package build) first. --check compares without writing and exits 1
// on drift. Workflow: edit src/style-tables.ts -> build -> generate -> build.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

const packageRoot = fileURLToPath(new URL("..", import.meta.url));
const tablesModule = new URL("../dist/style-tables.js", import.meta.url);
const target = new URL("../src/styles.css", import.meta.url);

export const HEADER = "@neshel-ui/layout styles. Generated from style tables; do not edit.";
export const LAYER = "components.neshel";

/** Escape a class name for use in a selector (only `.` occurs in table tokens). */
export function escapeClass(name) {
  return name.replace(/[^a-zA-Z0-9_-]/g, (char) => `\\${char}`);
}

const rule = (name, declarations, indent) =>
  `${indent}.${escapeClass(name)} { ${declarations.map(([p, v]) => `${p}: ${v};`).join(" ")} }`;

/** Render the stylesheet from a tables module (pure; tested). */
export function renderCss(tables) {
  const { baseClasses, breakpoints, breakpointMinWidth, propertyKeys, propertyTables } = tables;
  const lines = [`/* ${HEADER} */`, "", `@layer ${LAYER} {`];
  for (const { name, declarations } of baseClasses) lines.push(rule(name, declarations, "  "));
  for (const bp of breakpoints) {
    const indent = bp === "base" ? "  " : "    ";
    if (bp !== "base") lines.push("", `  @media (min-width: ${breakpointMinWidth[bp]}) {`);
    else lines.push("");
    for (const key of propertyKeys) {
      const table = propertyTables[key];
      const tokens = bp === "base" ? table.values : { ...table.values, ...table.resets };
      for (const [token, value] of Object.entries(tokens)) {
        const name = tables.propertyClassName(bp, key, token);
        lines.push(rule(name, [[table.property, value]], indent));
      }
    }
    if (bp !== "base") lines.push("  }");
  }
  lines.push("}", "");
  return lines.join("\n");
}

export async function loadTables() {
  if (!existsSync(fileURLToPath(tablesModule))) {
    throw new Error(`${packageRoot}dist/style-tables.js is missing; build @neshel-ui/layout first`);
  }
  return import(pathToFileURL(fileURLToPath(tablesModule)).href);
}

/** Returns [] when src/styles.css equals the generator output, else a description. */
export async function findDrift() {
  const expected = renderCss(await loadTables());
  const actual = existsSync(fileURLToPath(target)) ? readFileSync(target, "utf8") : "";
  return actual === expected ? [] : ["packages/layout/src/styles.css differs from the generator"];
}

const invokedDirectly = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (invokedDirectly) {
  if (process.argv.includes("--check")) {
    const drift = await findDrift();
    if (drift.length) {
      console.error(`${drift.join("\n")}; run pnpm generate:layout-css`);
      process.exitCode = 1;
    } else console.info("packages/layout/src/styles.css is up to date.");
  } else {
    writeFileSync(target, renderCss(await loadTables()));
    console.info("Wrote packages/layout/src/styles.css");
  }
}
