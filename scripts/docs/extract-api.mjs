// pnpm docs:api [--check]
// Extracts the public API of the documented packages from their built declarations (dist/index.d.ts)
// into apps/docs/generated/api/<package>.json (feature 006, research R5). The website renders props,
// types and defaults from this data; --check fails when the committed JSON is stale.
// Requires `pnpm build:packages`.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, relative, sep } from "node:path";
import { repoRoot } from "../lib/workspace.mjs";

const require = createRequire(import.meta.url);
const ts = require("typescript");

export const API_PACKAGES = ["config", "layout", "typography", "components"];
const OUT_DIR = join(repoRoot, "apps", "docs", "generated", "api");

const toPosix = (path) => path.split(sep).join("/");
const isNeshelFile = (fileName) => {
  const rel = toPosix(relative(repoRoot, fileName));
  return rel.startsWith("packages/") && !rel.includes("node_modules/");
};

/** Origin label of an inherited property (for the "extends" summary). */
function originOf(fileName) {
  const posix = toPosix(fileName);
  const match = posix.match(/node_modules\/((?:@[^/]+\/)?[^/]+)\//g);
  if (!match) return "unknown";
  const last = match[match.length - 1].replace(/^node_modules\//, "").replace(/\/$/, "");
  if (last === "@types/react") return "React DOM attributes";
  return last;
}

/** Default value parsed from the JSDoc text: "(default `x`)", "default: `x`" or @default. */
function parseDefault(text, tags) {
  const tag = tags.find((t) => t.name === "default" || t.name === "defaultValue");
  if (tag) return ts.displayPartsToString(tag.text).replace(/^`|`$/g, "").trim() || undefined;
  const match =
    text.match(/\(default(?:s to)?:? `([^`]+)`/i) ??
    text.match(/\(default(?:s to)?:? ("[^"]*"|true|false|-?\d[\w.]*)\)/i) ??
    text.match(/\bdefault:? `([^`]+)`/i);
  return match ? match[1] : undefined;
}

const clean = (text) => text.replace(/\r\n/g, "\n").trim();

function declarationTypeText(decl, checker, symbol) {
  if (decl && (ts.isPropertySignature(decl) || ts.isPropertyDeclaration(decl)) && decl.type) {
    return decl.type.getText().replace(/\s+/g, " ");
  }
  if (decl && ts.isMethodSignature(decl)) {
    const params = decl.parameters.map((p) => p.getText()).join(", ");
    return `(${params}) => ${decl.type ? decl.type.getText() : "void"}`.replace(/\s+/g, " ");
  }
  const type = checker.getTypeOfSymbolAtLocation(symbol, decl);
  return checker.typeToString(type, undefined, ts.TypeFormatFlags.NoTruncation);
}

function propertiesOf(type, checker) {
  const members = type.isUnion() ? type.types : [type];
  /** @type {Map<string, any>} */
  const props = new Map();
  const inherited = new Set();
  for (const member of members) {
    for (const symbol of checker.getPropertiesOfType(checker.getApparentType(member))) {
      const decls = symbol.getDeclarations() ?? [];
      const own = decls.find((d) => isNeshelFile(d.getSourceFile().fileName));
      if (!own) {
        for (const d of decls) inherited.add(originOf(d.getSourceFile().fileName));
        continue;
      }
      const text = clean(ts.displayPartsToString(symbol.getDocumentationComment(checker)));
      const tags = symbol.getJsDocTags(checker);
      const typeText = declarationTypeText(own, checker, symbol);
      const existing = props.get(symbol.name);
      if (existing) {
        if (!existing.types.includes(typeText)) existing.types.push(typeText);
        existing.variants = (existing.variants ?? 1) + 1;
        continue;
      }
      props.set(symbol.name, {
        name: symbol.name,
        types: [typeText],
        optional: (symbol.flags & ts.SymbolFlags.Optional) !== 0,
        description: text,
        default: parseDefault(text, tags),
        deprecated: tags.some((t) => t.name === "deprecated") || undefined,
      });
    }
  }
  const list = [...props.values()].map((prop) => {
    const { variants, types, ...rest } = prop;
    const meaningful = types.filter((t) => t !== "never");
    const merged = meaningful.length ? meaningful : types;
    rest.type =
      merged.length === 2 && merged.includes("true") && merged.includes("false")
        ? "boolean"
        : merged.join(" | ");
    const ordered = { name: rest.name, type: rest.type, ...rest };
    return members.length > 1 && (variants ?? 1) !== members.length
      ? { ...ordered, variantOnly: true }
      : ordered;
  });
  list.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  return { props: list, inherits: [...inherited].sort() };
}

function isClientModule(decl) {
  const dts = decl.getSourceFile().fileName;
  const js = dts.replace(/\.d\.ts$/, ".js");
  if (!existsSync(js)) return undefined;
  return /^\s*["']use client["']/.test(readFileSync(js, "utf8"));
}

export function extractPackage(pkg) {
  const entry = join(repoRoot, "packages", pkg, "dist", "index.d.ts");
  if (!existsSync(entry)) throw new Error(`${pkg}: ${entry} not found — run pnpm build:packages`);
  const program = ts.createProgram([entry], {
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    target: ts.ScriptTarget.ES2022,
    jsx: ts.JsxEmit.ReactJSX,
    strict: true,
    skipLibCheck: true,
    noEmit: true,
  });
  const checker = program.getTypeChecker();
  const source = program.getSourceFile(entry);
  const moduleSymbol = checker.getSymbolAtLocation(source);
  const exports = [];
  for (const exported of checker.getExportsOfModule(moduleSymbol)) {
    const symbol =
      exported.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exported) : exported;
    const decl = symbol.getDeclarations()?.[0];
    const description = clean(ts.displayPartsToString(symbol.getDocumentationComment(checker)));
    const file = decl
      ? toPosix(relative(join(repoRoot, "packages", pkg, "dist"), decl.getSourceFile().fileName))
      : undefined;
    const item = { name: exported.name, description, module: file?.replace(/\.d\.ts$/, "") };
    if (symbol.flags & ts.SymbolFlags.Function) {
      const signature = checker.getSignaturesOfType(
        checker.getTypeOfSymbolAtLocation(symbol, decl),
        ts.SignatureKind.Call,
      )[0];
      const param = signature?.getParameters()[0];
      const paramDecl = param?.getDeclarations()?.[0];
      const paramType =
        paramDecl && ts.isParameter(paramDecl) && paramDecl.type
          ? paramDecl.type.getText()
          : undefined;
      const isComponent = /^[A-Z]/.test(exported.name);
      Object.assign(item, {
        kind: isComponent ? "component" : "function",
        signature: signature
          ? checker.signatureToString(signature, undefined, ts.TypeFormatFlags.NoTruncation)
          : undefined,
        props: isComponent ? paramType : undefined,
        client: isComponent ? isClientModule(decl) : undefined,
      });
    } else if (symbol.flags & ts.SymbolFlags.Class) {
      Object.assign(item, { kind: "class" });
    } else if (symbol.flags & ts.SymbolFlags.Variable) {
      const type = checker.getTypeOfSymbolAtLocation(symbol, decl);
      const callable = checker.getSignaturesOfType(type, ts.SignatureKind.Call).length > 0;
      Object.assign(item, {
        kind: callable && /^[A-Z]/.test(exported.name) ? "component" : "const",
        type: callable
          ? undefined
          : checker.typeToString(type, undefined, ts.TypeFormatFlags.NoTruncation),
        client: callable ? isClientModule(decl) : undefined,
      });
    } else if (symbol.flags & (ts.SymbolFlags.Interface | ts.SymbolFlags.TypeAlias)) {
      const type = checker.getDeclaredTypeOfSymbol(symbol);
      const isInterface = (symbol.flags & ts.SymbolFlags.Interface) !== 0;
      const objectLike =
        isInterface ||
        (type.isUnion() &&
          type.types.every((t) => t.flags & (ts.TypeFlags.Object | ts.TypeFlags.Intersection))) ||
        type.isIntersection() ||
        (type.flags & ts.TypeFlags.Object) !== 0;
      const text =
        decl && ts.isTypeAliasDeclaration(decl)
          ? decl.type.getText().replace(/\s+/g, " ")
          : undefined;
      Object.assign(item, { kind: isInterface ? "interface" : "type" });
      if (/Props$|Options$|Item$|Group$|State$|Config$/.test(exported.name) && objectLike) {
        Object.assign(item, propertiesOf(type, checker));
        if (text && !isInterface) item.definition = text.length <= 240 ? text : undefined;
      } else {
        item.definition =
          text ?? checker.typeToString(type, undefined, ts.TypeFormatFlags.NoTruncation);
        if (objectLike && !text?.includes("=>")) {
          const extracted = propertiesOf(type, checker);
          if (extracted.props.length) Object.assign(item, extracted);
        }
      }
    } else {
      Object.assign(item, { kind: "other" });
    }
    exports.push(JSON.parse(JSON.stringify(item)));
  }
  exports.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  const manifest = JSON.parse(
    readFileSync(join(repoRoot, "packages", pkg, "package.json"), "utf8"),
  );
  return { package: manifest.name, exports };
}

/** CLI surface: commands and options from `neshel --help`, diagnostic codes from the source. */
export function extractCli() {
  const bin = join(repoRoot, "packages", "cli", "dist", "bin.js");
  if (!existsSync(bin)) throw new Error("cli: dist/bin.js not found — run pnpm build:packages");
  const help = execFileSync(process.execPath, [bin, "--help"], { encoding: "utf8" }).replace(
    /\r\n/g,
    "\n",
  );
  const commands = [...help.matchAll(/^ {2}(validate|generate) {2,}(.+)$/gm)].map((m) => m[1]);
  const options = [...new Set([...help.matchAll(/^ {2}(--[a-z]+)/gm)].map((m) => m[1]))].sort();
  const diagnosticsSource = readFileSync(
    join(repoRoot, "packages", "cli", "src", "diagnostics.ts"),
    "utf8",
  );
  const union = diagnosticsSource.match(/export type DiagnosticCode =([\s\S]*?);/);
  const diagnostics = union ? [...union[1].matchAll(/"([a-z-]+)"/g)].map((m) => m[1]).sort() : [];
  const exitCodes = [0, 1, 2, 3, 4, 5];
  return {
    package: "@neshel-ui/cli",
    bin: "neshel",
    help,
    commands,
    options,
    exitCodes,
    diagnostics,
  };
}

export function extractAll() {
  const result = {};
  for (const pkg of API_PACKAGES) result[pkg] = extractPackage(pkg);
  result.cli = extractCli();
  return result;
}

const serialise = (data) => `${JSON.stringify(data, null, 2)}\n`;

function main() {
  const check = process.argv.includes("--check");
  const all = extractAll();
  const stale = [];
  mkdirSync(OUT_DIR, { recursive: true });
  for (const [pkg, data] of Object.entries(all)) {
    const file = join(OUT_DIR, `${pkg}.json`);
    const content = serialise(data);
    const current = existsSync(file)
      ? readFileSync(file, "utf8").replace(/\r\n/g, "\n")
      : undefined;
    if (current === content) continue;
    if (check) stale.push(toPosix(relative(repoRoot, file)));
    else {
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, content);
      console.info(`docs:api wrote ${toPosix(relative(repoRoot, file))}`);
    }
  }
  if (stale.length) {
    console.error(
      `docs:api: stale generated API data (run pnpm docs:api):\n  ${stale.join("\n  ")}`,
    );
    process.exitCode = 1;
  } else if (check) console.info("docs:api: generated API data is fresh");
}

if (process.argv[1] && toPosix(process.argv[1]).endsWith("scripts/docs/extract-api.mjs")) main();
