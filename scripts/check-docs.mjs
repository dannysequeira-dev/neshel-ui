// pnpm check:docs [--only <check>]... — documentation verification (feature 006, contracts/docs-content.md).
// Checks: api-fresh, coverage, translations, links, demos, snippets, config. Requires built packages.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, relative, sep } from "node:path";
import { API_PACKAGES, extractAll } from "./docs/extract-api.mjs";
import { repoRoot } from "./lib/workspace.mjs";

const require = createRequire(import.meta.url);
const docsRoot = join(repoRoot, "apps", "docs");
const contentRoot = join(docsRoot, "content", "docs");
const LOCALES = ["en", "es"];
const toPosix = (path) => path.split(sep).join("/");

// ---------------------------------------------------------------------------------------------
// Content model
// ---------------------------------------------------------------------------------------------

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

/** Minimal YAML frontmatter reader for the keys this site uses. */
export function parseFrontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return { data: {}, body: text, bodyOffset: 0 };
  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z_]+):\s*(.*)$/);
    if (!kv) continue;
    const [, key, raw] = kv;
    let value = raw.trim();
    if (value.startsWith("[") && value.endsWith("]")) {
      value = value
        .slice(1, -1)
        .split(",")
        .map((item) => item.trim().replace(/^["']|["']$/g, ""))
        .filter(Boolean);
    } else value = value.replace(/^["']|["']$/g, "");
    data[key] = value;
  }
  const bodyOffset = match[0].split("\n").length - 1;
  return { data, body: text.slice(match[0].length), bodyOffset };
}

export function loadPages() {
  const pages = [];
  for (const locale of LOCALES) {
    for (const file of walk(join(contentRoot, locale)).filter((f) => f.endsWith(".mdx"))) {
      const rel = toPosix(relative(join(contentRoot, locale), file));
      const text = readFileSync(file, "utf8").replace(/\r\n/g, "\n");
      const { data, body, bodyOffset } = parseFrontmatter(text);
      const slug = rel.replace(/\.mdx$/, "").replace(/(^|\/)index$/, "");
      pages.push({ locale, rel, file, slug, data, body, bodyOffset });
    }
  }
  return pages;
}

const pageUrl = (locale, slug) => `/${locale}/docs/${slug ? `${slug}/` : ""}`;

/** github-slugger compatible heading slug (lowercase, letters/digits/space/hyphen kept). */
export function slugify(text) {
  return text
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/`/g, "")
    .replace(/[^\p{L}\p{N}\s_-]/gu, "")
    .trim()
    .replace(/\s/g, "-");
}

function headingSlugs(body) {
  const counts = new Map();
  const slugs = new Set();
  let inFence = false;
  for (const line of body.split("\n")) {
    if (/^\s*```/.test(line)) inFence = !inFence;
    if (inFence) continue;
    const heading = line.match(/^#{2,6}\s+(.+?)\s*#*$/);
    if (!heading) continue;
    const base = slugify(heading[1].replace(/\[([^\]]+)\]\([^)]+\)/g, "$1"));
    const n = counts.get(base) ?? 0;
    counts.set(base, n + 1);
    slugs.add(n === 0 ? base : `${base}-${n}`);
  }
  return slugs;
}

/** Body without fenced blocks and inline code (so examples of MDX syntax are not executed). */
export function prose(body) {
  return body.replace(/^\s*```[\s\S]*?^\s*```/gm, "").replace(/`[^`\n]*`/g, "");
}

// ---------------------------------------------------------------------------------------------
// Checks
// ---------------------------------------------------------------------------------------------

function checkApiFresh(problems) {
  const all = extractAll();
  for (const [pkg, data] of Object.entries(all)) {
    const file = join(docsRoot, "generated", "api", `${pkg}.json`);
    const expected = `${JSON.stringify(data, null, 2)}\n`;
    const actual = existsSync(file) ? readFileSync(file, "utf8").replace(/\r\n/g, "\n") : "";
    if (actual !== expected)
      problems.push(`api-fresh: generated/api/${pkg}.json is stale (run pnpm docs:api)`);
  }
  return all;
}

/** Coverage targets: every package export, CLI commands, options and diagnostic codes. */
export function coverageTargets(api) {
  const targets = {};
  for (const pkg of API_PACKAGES) targets[pkg] = api[pkg].exports.map((item) => item.name);
  targets.cli = [
    ...api.cli.commands.map((command) => `neshel ${command}`),
    ...api.cli.options,
    ...api.cli.diagnostics,
  ];
  return targets;
}

function checkCoverage(problems, pages, api) {
  const targets = coverageTargets(api);
  for (const locale of LOCALES) {
    for (const [pkg, names] of Object.entries(targets)) {
      const documented = new Map();
      for (const page of pages.filter((p) => p.locale === locale && p.data.package === pkg)) {
        for (const name of page.data.exports ?? []) {
          if (documented.has(name)) {
            problems.push(
              `coverage: ${locale}/${page.rel} documents ${pkg}:${name}, already documented in ${documented.get(name)}`,
            );
          }
          documented.set(name, page.rel);
          if (!names.includes(name))
            problems.push(
              `coverage: ${locale}/${page.rel} lists ${pkg}:${name}, which is not exported`,
            );
        }
      }
      for (const name of names) {
        if (!documented.has(name))
          problems.push(`coverage: ${pkg}:${name} is not documented in ${locale}`);
      }
    }
  }
  return targets;
}

function checkTranslations(problems, pages) {
  const exceptionsFile = join(docsRoot, "translations.json");
  const exceptions = existsSync(exceptionsFile)
    ? JSON.parse(readFileSync(exceptionsFile, "utf8"))
    : { missing: {} };
  const byKey = (locale) =>
    new Map(pages.filter((p) => p.locale === locale).map((p) => [p.rel, p]));
  const en = byKey("en");
  const es = byKey("es");
  const fallbacks = [];
  for (const [rel, page] of en) {
    const other = es.get(rel);
    if (!other) {
      if (exceptions.missing?.[rel]) fallbacks.push(rel);
      else
        problems.push(
          `translations: es/${rel} is missing (declare it in apps/docs/translations.json with a reason)`,
        );
      continue;
    }
    const a = JSON.stringify(page.data.exports ?? []);
    const b = JSON.stringify(other.data.exports ?? []);
    if (a !== b) problems.push(`translations: exports differ between en/${rel} and es/${rel}`);
    if ((page.data.package ?? "") !== (other.data.package ?? ""))
      problems.push(`translations: package differs for ${rel}`);
    const previews = (body) =>
      [...prose(body).matchAll(/<Preview\s+demo="([^"]+)"/g)].map((m) => m[1]).join(",");
    if (previews(page.body) !== previews(other.body))
      problems.push(`translations: previews differ between en/${rel} and es/${rel}`);
    const tables = (body) =>
      [...prose(body).matchAll(/<ApiTable\s+package="([^"]+)"\s+name="([^"]+)"/g)]
        .map((m) => `${m[1]}:${m[2]}`)
        .join(",");
    if (tables(page.body) !== tables(other.body))
      problems.push(`translations: API tables differ between en/${rel} and es/${rel}`);
    if (
      !other.data.title ||
      (other.data.title === page.data.title &&
        !/^\S+$/.test(page.data.title) &&
        !exceptions.identicalTitles?.[rel])
    ) {
      problems.push(
        `translations: es/${rel} title is missing or identical to English ("${page.data.title}")`,
      );
    }
  }
  for (const rel of es.keys())
    if (!en.has(rel)) problems.push(`translations: es/${rel} has no English source`);
  for (const rel of Object.keys(exceptions.missing ?? {})) {
    if (es.has(rel)) problems.push(`translations: ${rel} is declared missing but es/${rel} exists`);
  }
  for (const meta of walk(join(contentRoot, "en")).filter((f) => f.endsWith("meta.json"))) {
    const rel = toPosix(relative(join(contentRoot, "en"), meta));
    const esMeta = join(contentRoot, "es", rel);
    if (!existsSync(esMeta)) {
      problems.push(`translations: es/${rel} is missing`);
      continue;
    }
    const pagesOf = (file) =>
      JSON.stringify(
        (JSON.parse(readFileSync(file, "utf8")).pages ?? []).map((p) =>
          /^---.*---$/.test(p) ? "---" : p,
        ),
      );
    if (pagesOf(meta) !== pagesOf(esMeta))
      problems.push(`translations: page order differs in ${rel}`);
  }
  // Site dictionary parity (also enforced by TypeScript) and API description translations.
  const apiEs = JSON.parse(readFileSync(join(docsRoot, "i18n", "api.es.json"), "utf8"));
  const descriptions = new Set();
  for (const pkg of API_PACKAGES) {
    const data = JSON.parse(
      readFileSync(join(docsRoot, "generated", "api", `${pkg}.json`), "utf8"),
    );
    for (const item of data.exports) {
      if (item.description) descriptions.add(item.description);
      if (Array.isArray(item.props))
        for (const prop of item.props) if (prop.description) descriptions.add(prop.description);
    }
  }
  const untranslated = [...descriptions].filter((text) => !apiEs[text]);
  if (untranslated.length) {
    problems.push(
      `translations: ${untranslated.length} API descriptions lack a Spanish translation in apps/docs/i18n/api.es.json (run node scripts/check-docs.mjs --list-untranslated)`,
    );
  }
  const unused = Object.keys(apiEs).filter((text) => !descriptions.has(text));
  if (unused.length)
    problems.push(`translations: ${unused.length} obsolete entries in i18n/api.es.json`);
  return { fallbacks, untranslated };
}

function checkLinks(problems, pages) {
  const routes = new Map();
  for (const page of pages) routes.set(pageUrl(page.locale, page.slug), headingSlugs(page.body));
  for (const locale of LOCALES) {
    routes.set(`/${locale}/`, new Set());
    for (const slug of ["dashboard", "form", "landing"])
      routes.set(`/${locale}/examples/${slug}/`, new Set());
  }
  for (const page of pages) {
    let inFence = false;
    page.body.split("\n").forEach((line, index) => {
      if (/^\s*```/.test(line)) inFence = !inFence;
      if (inFence) return;
      const stripped = line.replace(/`[^`]*`/g, "");
      for (const match of stripped.matchAll(/\]\(([^)\s]+)(?:\s+"[^"]*")?\)|href="([^"]+)"/g)) {
        const target = match[1] ?? match[2];
        if (/^(https?:|mailto:)/.test(target)) continue;
        const where = `${page.locale}/${page.rel}:${page.bodyOffset + index + 1}`;
        let [path, anchor] = target.split("#");
        if (!path) path = pageUrl(page.locale, page.slug);
        else if (!path.startsWith("/")) {
          problems.push(
            `links: ${where} uses a relative link "${target}"; use /${page.locale}/docs/… paths`,
          );
          continue;
        }
        if (!path.endsWith("/")) path = `${path}/`;
        const slugs = routes.get(path);
        if (!slugs) {
          problems.push(`links: ${where} links to missing page ${target}`);
          continue;
        }
        if (path.split("/")[1] !== page.locale)
          problems.push(`links: ${where} links across locales (${target})`);
        if (anchor && !slugs.has(anchor) && !anchor.startsWith("api-"))
          problems.push(`links: ${where} links to missing anchor ${target}`);
      }
    });
  }
}

/** YAML pitfalls the simple reader would accept but the MDX loader rejects, and required keys. */
function checkFrontmatter(problems, pages) {
  for (const page of pages) {
    const head = readFileSync(page.file, "utf8").match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? "";
    for (const line of head.split(/\r?\n/)) {
      const value = line.match(/^[A-Za-z_]+:\s*(.*)$/)?.[1] ?? "";
      if (/: /.test(value) && !/^["'[]/.test(value)) {
        problems.push(
          `frontmatter: ${page.locale}/${page.rel} has an unquoted value with ": " (${line.trim()})`,
        );
      }
    }
    if (!page.data.title || !page.data.description) {
      problems.push(`frontmatter: ${page.locale}/${page.rel} needs a title and a description`);
    }
  }
}

function checkDemos(problems, pages) {
  const registry = readFileSync(join(docsRoot, "demos", "registry.ts"), "utf8");
  const entries = new Map(
    [...registry.matchAll(/"([a-z0-9/-]+)":\s*([A-Za-z0-9_]+)/g)].map((m) => [m[1], m[2]]),
  );
  for (const [name] of entries) {
    if (!existsSync(join(docsRoot, "demos", `${name}.tsx`)))
      problems.push(`demos: registry entry ${name} has no file demos/${name}.tsx`);
  }
  const used = new Set();
  for (const page of pages) {
    for (const match of prose(page.body).matchAll(/<Preview\s+demo="([^"]+)"/g)) {
      used.add(match[1]);
      if (!entries.has(match[1]))
        problems.push(`demos: ${page.locale}/${page.rel} uses unknown demo "${match[1]}"`);
    }
  }
  for (const name of entries.keys())
    if (!used.has(name)) problems.push(`demos: ${name} is registered but never previewed`);
}

/** Fenced code blocks of a page with their info strings and line numbers. */
export function codeBlocks(page) {
  const blocks = [];
  const lines = page.body.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const open = lines[i].match(/^(\s*)```(\w+)?(.*)$/);
    if (!open) continue;
    const indent = open[1].length;
    const body = [];
    let j = i + 1;
    for (; j < lines.length && !/^\s*```\s*$/.test(lines[j]); j++)
      body.push(lines[j].slice(indent));
    blocks.push({
      lang: open[2] ?? "",
      meta: open[3].trim(),
      code: body.join("\n"),
      line: page.bodyOffset + i + 1,
    });
    i = j;
  }
  return blocks;
}

function checkSnippets(problems, pages, api) {
  const ts = require(require.resolve("typescript", { paths: [docsRoot] }));
  const dir = join(docsRoot, ".snippets");
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const valueExports = {};
  for (const pkg of API_PACKAGES) {
    valueExports[pkg] = api[pkg].exports
      .filter((item) => ["component", "function", "class", "const"].includes(item.kind))
      .map((item) => item.name);
  }
  const fragmentHeader = [
    `import * as React from "react";`,
    ...API_PACKAGES.filter((pkg) => pkg !== "config").map(
      (pkg) => `import { ${valueExports[pkg].join(", ")} } from "@neshel-ui/${pkg}";`,
    ),
    `void React;`,
  ].join("\n");
  const files = new Map();
  const skipped = [];
  const configs = [];
  let index = 0;
  for (const page of pages) {
    for (const block of codeBlocks(page)) {
      const where = `${page.locale}/${page.rel}:${block.line}`;
      if (block.lang === "json") {
        try {
          JSON.parse(block.code);
        } catch (error) {
          problems.push(`snippets: ${where} invalid JSON (${error.message})`);
        }
        continue;
      }
      if (!["ts", "tsx"].includes(block.lang)) continue;
      if (/\bno-check\b/.test(block.meta)) {
        const reason = block.meta.match(/no-check="([^"]+)"/);
        if (!reason) problems.push(`snippets: ${where} no-check needs a reason: no-check="…"`);
        skipped.push(`${where} (${reason ? reason[1] : "no reason"})`);
        continue;
      }
      index++;
      const isConfig = /title="[^"]*neshel\.config\.ts"/.test(block.meta);
      if (isConfig) configs.push({ where, code: block.code });
      const fragment = /\bfragment\b/.test(block.meta);
      const title = block.meta.match(/title="([^"]+\.(?:tsx?|mts))"/)?.[1];
      const pageDir = `${page.locale}-${page.rel.replace(/[/.]/g, "_")}`;
      let name =
        title && !fragment
          ? join(pageDir, title)
          : `s${String(index).padStart(4, "0")}.${block.lang === "tsx" || fragment ? "tsx" : "ts"}`;
      // Two blocks with the same title on a page (alternative versions of one file): keep both.
      if (files.has(join(dir, name))) name = name.replace(/(\.\w+)$/, `.${index}$1`);
      mkdirSync(dirname(join(dir, name)), { recursive: true });
      const code = fragment
        ? `${fragmentHeader}\nexport function Snippet() {\n  return (\n    <>\n${block.code}\n    </>\n  );\n}\n`
        : /^\s*(import|export)\s/m.test(block.code)
          ? `${block.code}\n`
          : `${block.code}\nexport {};\n`;
      const offset = fragment ? fragmentHeader.split("\n").length + 4 : 0;
      writeFileSync(join(dir, name), code);
      files.set(join(dir, name), { where, offset, line: block.line });
    }
  }
  if (files.size) {
    const configPath = join(docsRoot, "tsconfig.json");
    const parsed = ts.getParsedCommandLineOfConfigFile(
      configPath,
      {},
      { ...ts.sys, onUnRecoverableConfigFileDiagnostic: () => {} },
    );
    const options = { ...parsed.options, noEmit: true, incremental: false, noUnusedLocals: false };
    const roots = [...files.keys(), join(docsRoot, "neshel.generated.d.ts")].filter(existsSync);
    const program = ts.createProgram(roots, options);
    for (const diagnostic of ts.getPreEmitDiagnostics(program)) {
      const fileName = diagnostic.file?.fileName ? join(diagnostic.file.fileName) : undefined;
      const info = fileName
        ? [...files.entries()].find(([path]) => toPosix(path) === toPosix(fileName))?.[1]
        : undefined;
      if (!info) continue;
      const { line } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start ?? 0);
      const snippetLine = info.line + 1 + line - info.offset;
      problems.push(
        `snippets: ${info.where.replace(/:\d+$/, "")}:${snippetLine} ${ts.flattenDiagnosticMessageText(diagnostic.messageText, " ")}`,
      );
    }
  }
  return { checked: files.size, skipped, configs };
}

function checkConfigs(problems, snippetConfigs) {
  const bin = join(repoRoot, "packages", "cli", "dist", "bin.js");
  const targets = [join(docsRoot, "neshel.config.ts")];
  const startersDir = join(repoRoot, "starters");
  if (existsSync(startersDir)) {
    for (const entry of readdirSync(startersDir)) {
      const config = join(startersDir, entry, "neshel.config.ts");
      if (existsSync(config)) targets.push(config);
    }
  }
  snippetConfigs.forEach((snippet, i) => {
    const dir = join(docsRoot, ".snippets", `config-${i}`);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "neshel.config.ts"), snippet.code);
    targets.push(join(dir, "neshel.config.ts"));
    snippet.file = join(dir, "neshel.config.ts");
  });
  for (const config of targets) {
    const result = spawnSync(
      process.execPath,
      [bin, "validate", "--config", relative(dirname(config), config)],
      {
        cwd: dirname(config),
        encoding: "utf8",
      },
    );
    if (result.status !== 0) {
      const snippet = snippetConfigs.find((s) => s.file === config);
      const where = snippet ? snippet.where : toPosix(relative(repoRoot, config));
      problems.push(
        `config: ${where} fails neshel validate (exit ${result.status}): ${(result.stderr || result.stdout).trim().split("\n").slice(-3).join(" | ")}`,
      );
    }
  }
  return targets.length;
}

// ---------------------------------------------------------------------------------------------

function main() {
  const only = process.argv.flatMap((arg, i) => (process.argv[i - 1] === "--only" ? [arg] : []));
  const run = (name) => only.length === 0 || only.includes(name);
  const problems = [];
  const pages = loadPages();
  if (process.argv.includes("--list-untranslated")) {
    const { untranslated } = checkTranslations([], pages);
    console.info(JSON.stringify(Object.fromEntries(untranslated.map((t) => [t, ""])), null, 2));
    return;
  }
  const api = checkApiFresh(run("api-fresh") ? problems : []);
  const summary = { pages: pages.length };
  if (run("coverage")) {
    const targets = checkCoverage(problems, pages, api);
    summary.coverageTargets = Object.values(targets).reduce((n, list) => n + list.length, 0);
  }
  if (run("translations")) summary.translations = checkTranslations(problems, pages).fallbacks;
  if (run("links")) {
    checkLinks(problems, pages);
    checkFrontmatter(problems, pages);
  }
  if (run("demos")) checkDemos(problems, pages);
  let configs = [];
  if (run("snippets")) {
    const result = checkSnippets(problems, pages, api);
    summary.snippetsChecked = result.checked;
    summary.snippetsSkipped = result.skipped;
    configs = result.configs;
  }
  if (run("config")) summary.configsValidated = checkConfigs(problems, configs);
  console.info(`check:docs ${JSON.stringify(summary)}`);
  if (problems.length) {
    for (const problem of problems) {
      console.error(`  ✗ ${problem}`);
      if (process.env.GITHUB_ACTIONS === "true")
        console.info(`::error title=check:docs::${problem}`);
    }
    console.error(`check:docs: ${problems.length} problem(s)`);
    process.exitCode = 1;
  } else console.info("check:docs: all checks passed");
}

if (process.argv[1] && toPosix(process.argv[1]).endsWith("scripts/check-docs.mjs")) main();
