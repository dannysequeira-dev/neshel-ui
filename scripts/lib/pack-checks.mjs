// Pure validators for packed npm artifacts (ADR 0004 §5, data-model "PackedArtifact").
// Every function takes the packed manifest and/or a Map of package-relative POSIX paths to
// file contents and returns a list of actionable error strings. No I/O happens here.
import { posix } from "node:path";
import { checkLayoutStylesheet } from "./layout-css.mjs";

const RUNTIME_FIELDS = ["dependencies", "optionalDependencies", "peerDependencies"];
const ALL_DEP_FIELDS = [...RUNTIME_FIELDS, "devDependencies"];
const LOCAL_PROTOCOLS = ["workspace:", "file:", "link:", "portal:", "catalog:"];
const JS_EXTENSION = /\.(?:m?js)$/;
const DTS_EXTENSION = /\.d\.(?:m?ts)$/;

/** Normalize a manifest path ("./dist/a.js") to a package-relative POSIX path ("dist/a.js"). */
export function normalizeTarget(target) {
  return posix.normalize(target.replaceAll("\\", "/")).replace(/^\.\//, "");
}

/** Flatten a (possibly nested, conditional) exports field into { subpath, conditions, target }. */
export function exportEntries(exportsField) {
  if (exportsField === undefined || exportsField === null) return [];
  const isSubpathMap =
    typeof exportsField === "object" &&
    !Array.isArray(exportsField) &&
    Object.keys(exportsField).some((key) => key.startsWith("."));
  const subpaths = isSubpathMap ? Object.entries(exportsField) : [[".", exportsField]];
  const entries = [];
  const walk = (subpath, value, conditions) => {
    if (typeof value === "string") entries.push({ subpath, conditions, target: value });
    else if (Array.isArray(value)) for (const item of value) walk(subpath, item, conditions);
    else if (value && typeof value === "object") {
      for (const [condition, nested] of Object.entries(value)) {
        walk(subpath, nested, [...conditions, condition]);
      }
    }
  };
  for (const [subpath, value] of subpaths) walk(subpath, value, []);
  return entries;
}

/** Dependency specs must be publishable and must not reference internal workspace packages. */
export function checkDependencySpecs(manifest, internalNames = []) {
  const errors = [];
  const internal = new Set(internalNames);
  for (const fieldName of ALL_DEP_FIELDS) {
    for (const [name, spec] of Object.entries(manifest[fieldName] ?? {})) {
      const protocol = LOCAL_PROTOCOLS.find((prefix) => String(spec).startsWith(prefix));
      if (protocol) {
        errors.push(
          `${fieldName}.${name} is "${spec}": the "${protocol}" protocol is not resolvable outside this workspace`,
        );
      }
      if (RUNTIME_FIELDS.includes(fieldName) && internal.has(name)) {
        errors.push(
          `${fieldName}.${name}: ${name} is internal and unpublished; inline the code or follow ADR 0002`,
        );
      }
    }
  }
  return errors;
}

/** Every file referenced by exports, bin, main/module/types must exist in the tarball. */
export function checkTargets(manifest, files) {
  const errors = [];
  const require = (label, target) => {
    if (target.includes("*")) {
      errors.push(`${label} uses a wildcard (${target}); check:pack cannot verify pattern exports`);
    } else if (!files.has(normalizeTarget(target))) {
      errors.push(`${label} -> ${target} is missing from the tarball`);
    }
  };
  for (const { subpath, conditions, target } of exportEntries(manifest.exports)) {
    require(`exports["${subpath}"]${conditions.map((c) => `.${c}`).join("")}`, target);
  }
  for (const fieldName of ["main", "module", "types", "typings"]) {
    if (typeof manifest[fieldName] === "string") require(fieldName, manifest[fieldName]);
  }
  const bins =
    typeof manifest.bin === "string" ? { [manifest.name]: manifest.bin } : (manifest.bin ?? {});
  for (const [command, target] of Object.entries(bins)) {
    const path = normalizeTarget(target);
    if (!files.has(path)) {
      errors.push(`bin.${command} -> ${target} is missing from the tarball`);
    } else if (!files.get(path).toString("utf8").startsWith("#!")) {
      errors.push(`bin.${command} -> ${target} has no shebang line`);
    }
  }
  return errors;
}

/** Each exported JavaScript subpath must expose a `types` condition pointing at a .d.ts file. */
export function checkDeclarations(manifest) {
  const errors = [];
  const bySubpath = new Map();
  for (const entry of exportEntries(manifest.exports)) {
    const list = bySubpath.get(entry.subpath) ?? [];
    list.push(entry);
    bySubpath.set(entry.subpath, list);
  }
  for (const [subpath, entries] of bySubpath) {
    if (!entries.some(({ target }) => JS_EXTENSION.test(target))) continue;
    const types = entries.find(({ conditions }) => conditions.includes("types"));
    if (!types) {
      errors.push(`exports["${subpath}"] exposes JavaScript without a "types" condition`);
    } else if (!DTS_EXTENSION.test(types.target)) {
      errors.push(`exports["${subpath}"].types -> ${types.target} is not a declaration file`);
    } else if (entries[0] !== types) {
      errors.push(`exports["${subpath}"]: "types" must be the first condition`);
    }
  }
  return errors;
}

/** sourceMappingURL comments and every map `sources` entry must resolve inside the tarball. */
export function checkSourceMaps(files) {
  const errors = [];
  for (const [path, contents] of files) {
    if (JS_EXTENSION.test(path) || DTS_EXTENSION.test(path)) {
      const match = /\/\/# sourceMappingURL=(\S+)\s*$/.exec(contents.toString("utf8"));
      if (match && !match[1].startsWith("data:")) {
        const mapPath = posix.join(posix.dirname(path), decodeURIComponent(match[1]));
        if (!files.has(mapPath)) errors.push(`${path} references missing source map ${mapPath}`);
      }
    }
    if (!path.endsWith(".map")) continue;
    let map;
    try {
      map = JSON.parse(contents.toString("utf8"));
    } catch {
      errors.push(`${path} is not valid JSON`);
      continue;
    }
    const sources = Array.isArray(map.sources) ? map.sources : [];
    if (sources.length === 0) errors.push(`${path} lists no sources`);
    for (const source of sources) {
      if (/^[a-z]+:/i.test(source)) {
        errors.push(`${path} source "${source}" is an absolute URL, not a packaged file`);
        continue;
      }
      const resolved = posix.normalize(
        posix.join(posix.dirname(path), map.sourceRoot ?? "", decodeURIComponent(source)),
      );
      if (resolved.startsWith("../") || !files.has(resolved)) {
        errors.push(`${path} source "${source}" resolves to ${resolved}, which is not packaged`);
      }
    }
  }
  return errors;
}

/** Translate an npm `sideEffects` glob into a RegExp (patterns without "/" match basenames). */
function sideEffectsMatcher(pattern) {
  const normalized = normalizeTarget(pattern);
  let source = "";
  for (let index = 0; index < normalized.length; index++) {
    const char = normalized[index];
    if (char === "*" && normalized[index + 1] === "*") {
      source += normalized[index + 2] === "/" ? "(?:.*/)?" : ".*";
      index += normalized[index + 2] === "/" ? 2 : 1;
    } else if (char === "*") source += "[^/]*";
    else source += char.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
  }
  const regex = new RegExp(`^${source}$`);
  return (path) => regex.test(normalized.includes("/") ? path : posix.basename(path));
}

/** Exported stylesheets must be declared as side effects so bundlers keep CSS imports. */
export function checkSideEffects(manifest) {
  const errors = [];
  const css = exportEntries(manifest.exports)
    .map(({ target }) => normalizeTarget(target))
    .filter((target) => target.endsWith(".css"));
  if (css.length === 0 || manifest.sideEffects === true || manifest.sideEffects === undefined) {
    return errors;
  }
  const patterns = Array.isArray(manifest.sideEffects) ? manifest.sideEffects : [];
  const matchers = patterns.map(sideEffectsMatcher);
  for (const target of css) {
    if (!matchers.some((matches) => matches(target))) {
      errors.push(`${target} is exported but not covered by "sideEffects"; bundlers may drop it`);
    }
  }
  return errors;
}

/** Keep tarballs intentional: no tests, stories, build configs or incremental build state. */
export function checkUnexpectedFiles(files) {
  const errors = [];
  for (const path of files.keys()) {
    const base = posix.basename(path);
    if (
      /\.(?:test|spec|stories)\.[cm]?[jt]sx?$/.test(base) ||
      /^tsconfig.*\.json$/.test(base) ||
      base.endsWith(".tsbuildinfo") ||
      base.startsWith(".")
    ) {
      errors.push(`${path} should not be published`);
    }
  }
  return errors;
}

const LIFECYCLE_SCRIPTS = ["preinstall", "install", "postinstall", "prepare"];

/** Installing a package must never run code (feature 002 FR-023: explicit generation only). */
export function checkLifecycleScripts(manifest) {
  return LIFECYCLE_SCRIPTS.filter((name) => manifest.scripts?.[name] !== undefined).map(
    (name) =>
      `scripts.${name} runs on install; packages must not declare install lifecycle scripts`,
  );
}

/** Public workspace packages may be peers only as caret ranges (packed from `workspace:^`). */
export function checkPublicPeers(manifest, publicNames = []) {
  const errors = [];
  const publicSet = new Set(publicNames);
  for (const [name, spec] of Object.entries(manifest.peerDependencies ?? {})) {
    if (publicSet.has(name) && !/^\^\d+\.\d+\.\d+/.test(String(spec))) {
      errors.push(`peerDependencies.${name} is "${spec}"; expected a caret range (workspace:^)`);
    }
  }
  return errors;
}

/** Bare (non-relative) import specifiers of an ES module source, including `node:` built-ins. */
/** Bare specifiers the layout and typography runtimes may import (FR-070/FR-071, feature 004). */
export const LAYOUT_ALLOWED_IMPORTS = [
  "react",
  "react/jsx-runtime",
  "@radix-ui/react-slot",
  "tailwind-variants/lite",
];
export const COMPONENT_PACKAGES = ["@neshel-ui/layout", "@neshel-ui/typography"];
const FONT_FILE = /\.(?:woff2?|ttf|otf|eot)$/i;

/**
 * Contract of the React component packages (ADR 0008/0009/0010/0011): exact exports
 * (`.`, `./styles.css`, `./style-manifest.json`) and dependencies, React and config peers,
 * browser-safe imports only, a hygienic layered stylesheet and a schema-1 style manifest identical
 * to the committed sources, and no font files (FR-046).
 */
export function checkComponentContract(manifest, files, { sourceCss, sourceManifest } = {}) {
  const errors = [];
  if (!sameKeys(manifest.exports, [".", "./styles.css", "./style-manifest.json"])) {
    errors.push("exports must be exactly ., ./styles.css, ./style-manifest.json");
  }
  if (!sameKeys(manifest.dependencies, ["@radix-ui/react-slot", "tailwind-variants"])) {
    errors.push(
      `dependencies must be exactly @radix-ui/react-slot and tailwind-variants; found ${Object.keys(manifest.dependencies ?? {}).join(", ") || "none"}`,
    );
  }
  if (!sameKeys(manifest.peerDependencies, ["@neshel-ui/config", "react"])) {
    errors.push("peerDependencies must be exactly @neshel-ui/config and react");
  }
  for (const [path, contents] of files) {
    if (FONT_FILE.test(path)) errors.push(`${path}: font files must not be published (FR-046)`);
    if (!/^dist\/.*\.js$/.test(path)) continue;
    for (const specifier of bareImports(contents.toString("utf8"))) {
      if (!LAYOUT_ALLOWED_IMPORTS.includes(specifier)) {
        errors.push(
          `${path} imports "${specifier}"; allowed: ${LAYOUT_ALLOWED_IMPORTS.join(", ")}`,
        );
      }
    }
  }
  const stylesheet = files.get("dist/styles.css")?.toString("utf8");
  if (!stylesheet) {
    errors.push("dist/styles.css is missing");
  } else {
    errors.push(...checkLayoutStylesheet(stylesheet).map((error) => `dist/styles.css: ${error}`));
    if (sourceCss !== undefined && stylesheet !== sourceCss) {
      errors.push("dist/styles.css differs from src/styles.css (stale build?)");
    }
  }
  const styleManifest = files.get("dist/style-manifest.json")?.toString("utf8");
  if (!styleManifest) {
    errors.push("dist/style-manifest.json is missing");
  } else {
    let parsed;
    try {
      parsed = JSON.parse(styleManifest);
    } catch {
      errors.push("dist/style-manifest.json is not valid JSON");
    }
    if (parsed) {
      if (parsed.schema !== 1) errors.push("dist/style-manifest.json: schema must be 1");
      if (parsed.package !== manifest.name || parsed.version !== manifest.version) {
        errors.push(
          `dist/style-manifest.json describes ${parsed.package}@${parsed.version}, not ${manifest.name}@${manifest.version}`,
        );
      }
    }
    if (sourceManifest !== undefined && styleManifest !== sourceManifest) {
      errors.push("dist/style-manifest.json differs from src/style-manifest.json (stale build?)");
    }
  }
  return errors;
}

/** @deprecated feature 003 name; kept for existing tests. */
export function checkLayoutContract(manifest, files, context = {}) {
  return checkComponentContract(manifest, files, {
    sourceCss: context.sourceCss ?? context.layoutSourceCss,
    sourceManifest: context.sourceManifest,
  });
}

export function bareImports(source) {
  const specifiers = [...source.matchAll(/(?:\bfrom\s*|\bimport\s*\(?\s*)["']([^"']+)["']/g)].map(
    (match) => match[1],
  );
  return specifiers.filter((specifier) => !/^\.\.?\//.test(specifier));
}

const sameKeys = (object, expected) =>
  JSON.stringify(Object.keys(object ?? {}).sort()) === JSON.stringify([...expected].sort());

/**
 * Package-specific contracts of feature 002 (ADR 0006/0007): exact `config` exports, a
 * dependency-free browser-safe entry, the styles.css alias, and the exact `cli` dependency set.
 */
export function checkPackageContract(manifest, files, context = {}) {
  const errors = [];
  if (COMPONENT_PACKAGES.includes(manifest.name))
    errors.push(...checkComponentContract(manifest, files, context));
  if (manifest.name === "@neshel-ui/config") {
    const expected = [".", "./tokens.css", "./tailwind.css", "./styles.css"];
    if (!sameKeys(manifest.exports, expected)) {
      errors.push(`exports must be exactly ${expected.join(", ")}`);
    }
    for (const field of ["dependencies", "peerDependencies", "optionalDependencies"]) {
      if (Object.keys(manifest[field] ?? {}).length > 0) {
        errors.push(`${field} must be empty: @neshel-ui/config has no runtime dependencies`);
      }
    }
    for (const [path, contents] of files) {
      if (!/^dist\/.*\.js$/.test(path)) continue;
      for (const specifier of bareImports(contents.toString("utf8"))) {
        errors.push(
          `${path} imports "${specifier}"; the browser-safe entry may import only relative modules`,
        );
      }
    }
    const styles = files.get("dist/styles.css");
    const tailwind = files.get("dist/tailwind.css");
    if (!styles || !tailwind || !styles.equals(tailwind)) {
      errors.push("dist/styles.css must be byte-identical to dist/tailwind.css (0.x alias)");
    }
  }
  if (manifest.name === "@neshel-ui/cli") {
    if (!sameKeys(manifest.dependencies, ["@capsizecss/core", "colorjs.io", "jiti"])) {
      errors.push(
        `dependencies must be exactly @capsizecss/core, colorjs.io and jiti; found ${Object.keys(manifest.dependencies ?? {}).join(", ") || "none"}`,
      );
    }
    if (!manifest.peerDependencies?.["@neshel-ui/config"]) {
      errors.push("peerDependencies must include @neshel-ui/config (token contract)");
    }
  }
  return errors;
}
