// Feature 017 (CI audit, research R6): CI typechecks before it builds the packages, so a workspace
// project that maps Neshel packages to their sources through tsconfig `paths` must map every
// `@neshel-ui/*` entry it imports. A missing mapping resolved to an unbuilt dist/ and failed CI once
// per new Animations subpath (TS2307 in runs 44092856532, 44193970348, 44401270564, 44590484219,
// 45038066392). This guard reports it locally, from the sources, before any build.
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = /\.(?:[cm]?[jt]sx?)$/;
const IMPORT = /(?:from\s+|import\s*\(\s*|import\s+)["'](@neshel-ui\/[^"']+)["']/g;

function readJson(file) {
  // tsconfig files may carry comments and trailing commas.
  const source = readFileSync(file, "utf8");
  let text = "";
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (char === '"') {
      let end = i + 1;
      while (end < source.length && source[end] !== '"') end += source[end] === "\\" ? 2 : 1;
      text += source.slice(i, end + 1);
      i = end;
    } else if (char === "/" && source[i + 1] === "/") {
      while (i < source.length && source[i] !== "\n") i++;
      text += "\n";
    } else if (char === "/" && source[i + 1] === "*") {
      i = source.indexOf("*/", i + 2) + 1;
    } else text += char;
  }
  return JSON.parse(text.replace(/,(\s*[}\]])/g, "$1"));
}

function* walk(dir) {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    if (["node_modules", "dist", ".next", "storybook-static", "out"].includes(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) yield* walk(full);
    else if (SOURCE.test(name)) yield full;
  }
}

/** Projects whose tsconfig.json maps at least one Neshel package through `paths`. */
function mappedProjects() {
  const projects = [];
  for (const group of ["apps", "packages"]) {
    for (const name of readdirSync(join(root, group))) {
      const file = join(root, group, name, "tsconfig.json");
      if (!existsSync(file)) continue;
      const paths = readJson(file).compilerOptions?.paths ?? {};
      if (Object.keys(paths).some((key) => key.startsWith("@neshel-ui/")))
        projects.push({ dir: join(root, group, name), file, paths, name: `${group}/${name}` });
    }
  }
  return projects;
}

/** The package that owns a specifier, when it is a workspace package. */
function ownPackage(specifier) {
  const name = specifier.split("/").slice(0, 2).join("/");
  for (const group of ["packages"]) {
    for (const dir of readdirSync(join(root, group))) {
      const file = join(root, group, dir, "package.json");
      if (existsSync(file) && JSON.parse(readFileSync(file, "utf8")).name === name)
        return join(root, group, dir);
    }
  }
  return undefined;
}

test("every @neshel-ui import of a path-mapped project has a source mapping", () => {
  const projects = mappedProjects();
  assert.ok(projects.length > 0, "no project maps Neshel packages through paths");
  const missing = [];
  for (const project of projects) {
    const imports = new Set();
    for (const file of walk(project.dir)) {
      for (const [, specifier] of readFileSync(file, "utf8").matchAll(IMPORT)) {
        if (/\.(css|json)$/.test(specifier)) continue;
        imports.add(specifier);
      }
    }
    const selfName = existsSync(join(project.dir, "package.json"))
      ? JSON.parse(readFileSync(join(project.dir, "package.json"), "utf8")).name
      : undefined;
    for (const specifier of imports) {
      if (selfName && specifier.startsWith(selfName)) continue;
      if (!ownPackage(specifier)) continue;
      if (!project.paths[specifier]) missing.push(`${project.name}: ${specifier}`);
    }
  }
  assert.deepEqual(missing, [], `add tsconfig "paths" entries for:\n${missing.join("\n")}`);
});

test("every source mapping points at an existing file", () => {
  const broken = [];
  for (const project of mappedProjects()) {
    for (const [key, targets] of Object.entries(project.paths)) {
      if (!key.startsWith("@neshel-ui/")) continue;
      for (const target of targets) {
        const file = resolve(project.dir, target);
        if (!existsSync(file)) broken.push(`${project.name}: ${key} -> ${relative(root, file)}`);
      }
    }
  }
  assert.deepEqual(broken, []);
});
