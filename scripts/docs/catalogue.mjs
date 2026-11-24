// Integrity of the animations catalogue (feature 018): apps/docs/animations/catalog.json against the
// built package, the 157-entry specification contract, the examples and the MDX pages of both languages.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { repoRoot } from "../lib/workspace.mjs";
import { animationEntries } from "./extract-api.mjs";

export const CATALOGUE_SIZE = 157;
const docsRoot = join(repoRoot, "apps", "docs");
const packageRoot = join(repoRoot, "packages", "animations");

export function loadCatalogue() {
  return JSON.parse(readFileSync(join(docsRoot, "animations", "catalog.json"), "utf8"));
}

/** `id → reduced` of the specification contract (specs/008-animations/contracts/catalog.md). */
export function contractEntries(
  text = readFileSync(join(repoRoot, "specs", "008-animations", "contracts", "catalog.md"), "utf8"),
) {
  const entries = new Map();
  for (const line of text.replace(/\r\n/g, "\n").split("\n")) {
    const cells = line.split("|").map((cell) => cell.trim());
    const id = cells[1]?.match(/^(?:E|H|P|G|ST|SP|C|PT|L|T|S|M|B|F|D)\d{2}$/)?.[0];
    if (!id || cells.length < 8) continue;
    entries.set(id, cells[5].replace(/[¹²³⁴⁵⁶⁷⁸⁹]/g, ""));
  }
  return entries;
}

export const familyOf = (id) => id.replace(/\d+$/, "");

/** Pure checks of the catalogue data; `api` maps entry → Set of export names. */
export function catalogueProblems(catalogue, { contract, api, stylesheets }) {
  const problems = [];
  const ids = catalogue.effects.map((effect) => effect.id);
  if (ids.length !== CATALOGUE_SIZE)
    problems.push(`catalogue: ${ids.length} entries, expected ${CATALOGUE_SIZE}`);
  if (new Set(ids).size !== ids.length) problems.push("catalogue: duplicated ids");
  for (const id of contract.keys())
    if (!ids.includes(id)) problems.push(`catalogue: ${id} is in the contract but not catalogued`);
  const prefixes = new Set(catalogue.families.map((family) => family.prefix));
  for (const effect of catalogue.effects) {
    const { id } = effect;
    const reduced = contract.get(id);
    if (reduced === undefined) problems.push(`catalogue: ${id} is not in the contract`);
    else if (reduced !== effect.reduced)
      problems.push(`catalogue: ${id} reduced "${effect.reduced}", contract says "${reduced}"`);
    if (!prefixes.has(familyOf(id))) problems.push(`catalogue: ${id} has no family`);
    if (!effect.name?.en || !effect.name?.es) problems.push(`catalogue: ${id} needs both names`);
    const exported = api.get(effect.entry);
    if (!exported) {
      problems.push(`catalogue: ${id} entry "${effect.entry}" is not a package subpath`);
      continue;
    }
    if (!effect.api.length) problems.push(`catalogue: ${id} lists no API`);
    for (const name of [...effect.api, effect.options, effect.definition].filter(Boolean))
      if (!exported.has(name))
        problems.push(`catalogue: ${id} names ${name}, not exported by ${effect.entry}`);
    if (effect.css && !stylesheets.has(effect.css))
      problems.push(`catalogue: ${id} stylesheet ${effect.css} is not exported`);
  }
  return problems;
}

/** Effect sections of a page body: `## E01 · Fade in [#e01]` up to the next `## ` heading. */
export function effectSections(body) {
  const pattern = /^## ([A-Z]{1,2}\d{2}) · (.+?) \[#([a-z0-9]+)\]$/gm;
  return [...body.matchAll(pattern)].map((match) => {
    const rest = body.slice(match.index + match[0].length);
    const next = rest.search(/^## /m);
    return {
      id: match[1],
      name: match[2],
      anchor: match[3],
      body: next === -1 ? rest : rest.slice(0, next),
    };
  });
}

const countWords = (text) =>
  text
    .replace(/```[\s\S]*?```/g, "")
    .replace(/<[^>]+>/g, "")
    .split(/\s+/)
    .filter(Boolean).length;

/** Every effect once per language, in its family page, with prose, its API and its example. */
export function catalogueContentProblems(catalogue, pages) {
  const problems = [];
  for (const locale of ["en", "es"]) {
    const seen = new Map();
    for (const page of pages.filter((p) => p.locale === locale)) {
      for (const section of effectSections(page.body)) {
        const where = `${locale}/${page.rel} ${section.id}`;
        const effect = catalogue.effects.find((item) => item.id === section.id);
        if (!effect) {
          problems.push(`catalogue: ${where} documents an unknown id`);
          continue;
        }
        if (seen.has(section.id)) problems.push(`catalogue: ${where} is documented twice`);
        seen.set(section.id, page.rel);
        const family = catalogue.families.find((item) => item.prefix === familyOf(section.id));
        if (page.rel !== `animations/effects/${family.slug}.mdx`)
          problems.push(`catalogue: ${where} belongs to animations/effects/${family.slug}.mdx`);
        if (section.anchor !== section.id.toLowerCase())
          problems.push(`catalogue: ${where} anchor must be #${section.id.toLowerCase()}`);
        if (section.name !== effect.name[locale])
          problems.push(`catalogue: ${where} is "${effect.name[locale]}", not "${section.name}"`);
        if (!section.body.includes(`<Effect id="${section.id}" />`))
          problems.push(`catalogue: ${where} lacks <Effect id="${section.id}" />`);
        if (countWords(section.body) < 20)
          problems.push(`catalogue: ${where} needs an explanation of at least 20 words`);
        if (!effect.api.some((name) => new RegExp(`\`<?${name}\\b`).test(section.body)))
          problems.push(`catalogue: ${where} never names its API (${effect.api.join(", ")})`);
      }
    }
    for (const effect of catalogue.effects)
      if (!seen.has(effect.id))
        problems.push(`catalogue: ${effect.id} is not documented in ${locale}`);
  }
  return problems;
}

/** Platform names an explanation may cite besides the API of its entry. */
const PLATFORM = new Set(
  [
    "asChild key tabIndex role alert status switch progressbar title label dialog mark id",
    "opacity transform filter mask sticky clip hidden auto scroll play backdrop-filter offset-path",
    "width height rotate scale translate left right center d true false Infinity none",
  ]
    .join(" ")
    .split(" "),
);

/** Names, members and string literals of one entry's declarations. */
export function entryVocabulary(exports) {
  const words = new Set();
  const text = (value) => {
    for (const match of String(value ?? "").matchAll(/[A-Za-z][\w-]*/g)) words.add(match[0]);
  };
  for (const item of exports) {
    words.add(item.name);
    text(item.signature);
    text(item.type);
    text(item.definition);
    if (typeof item.props === "string") text(item.props);
    else
      for (const prop of item.props ?? []) {
        words.add(prop.name);
        text(prop.type);
        text(prop.default);
      }
  }
  return words;
}

/**
 * Identifiers cited in the prose of an effect must exist in its entry. Some primitives take untyped
 * options (`<ScrollEffect>`), so the type checker alone cannot catch an invented option.
 */
export function vocabularyProblems(catalogue, pages, api) {
  const problems = [];
  const shared = entryVocabulary(api["animations/core"].exports);
  for (const { slug } of animationEntries())
    for (const item of api[`animations/${slug}`].exports) shared.add(item.name);
  for (const page of pages)
    for (const section of effectSections(page.body)) {
      const effect = catalogue.effects.find((item) => item.id === section.id);
      if (!effect) continue;
      const slug = effect.entry.replaceAll("/", "-");
      const words = entryVocabulary(api[`animations/${slug}`].exports);
      if (slug.startsWith("page-transitions-"))
        for (const word of entryVocabulary(api["animations/page-transitions"].exports))
          words.add(word);
      for (const [, code] of section.body.matchAll(/`([^`\n]+)`/g)) {
        // Bare identifiers, calls, components and quoted values; CSS, ARIA and data-* text is free.
        const token = code.match(/^(?:<\/?)?"?([A-Za-z][\w]*)"?(?:\(.*\)|>)?$/)?.[1];
        if (token && !words.has(token) && !shared.has(token) && !PLATFORM.has(token))
          problems.push(
            `catalogue: ${page.locale}/${page.rel} ${section.id} cites \`${code}\`, not in ${effect.entry}`,
          );
      }
    }
  return problems;
}

/**
 * `<ScrollEffect>`, `<RevealOnScroll>` and `<StaggerOnScroll>` accept untyped options: their examples
 * must state the interface with `satisfies`, so that the type checker rejects invented options.
 */
export function untypedOptionProblems(catalogue, read) {
  const problems = [];
  for (const effect of catalogue.effects) {
    const code = read(effect.id);
    if (!/<(?:ScrollEffect|RevealOnScroll|StaggerOnScroll)\b/.test(code)) continue;
    for (const match of code.matchAll(/options=\{/g))
      if (!/^options=\{\s*\{[\s\S]*?\}\s*satisfies \w+Options\s*\}/.test(code.slice(match.index)))
        problems.push(`catalogue: example ${effect.id} needs options={{ … } satisfies …Options}`);
  }
  return problems;
}

/** Example files, registry keys and the API each example really uses. */
export function exampleProblems(catalogue) {
  const problems = [];
  const dir = join(docsRoot, "demos", "animations");
  const registry = readFileSync(join(dir, "registry.ts"), "utf8");
  const registered = new Set(
    [...registry.matchAll(/^ {2}([A-Z]{1,2}\d{2}): lazy/gm)].map((match) => match[1]),
  );
  for (const effect of catalogue.effects) {
    const name = `${effect.id.toLowerCase()}.tsx`;
    const live = effect.demo !== "source";
    if (live !== registered.has(effect.id))
      problems.push(`catalogue: ${effect.id} registry entry ${live ? "missing" : "unexpected"}`);
    if (!existsSync(join(dir, name))) {
      problems.push(`catalogue: ${effect.id} has no example (demos/animations/${name})`);
      continue;
    }
    const code = readFileSync(join(dir, name), "utf8");
    if (!code.includes(`"@neshel-ui/animations/${effect.entry}"`))
      problems.push(`catalogue: example ${effect.id} does not import from ${effect.entry}`);
    if (!effect.api.some((api) => new RegExp(`\\b${api}\\b`).test(code)))
      problems.push(`catalogue: example ${effect.id} uses none of ${effect.api.join(", ")}`);
    if (effect.css && !code.includes(`"@neshel-ui/animations/${effect.css}"`))
      problems.push(`catalogue: example ${effect.id} does not import ${effect.css}`);
  }
  for (const id of registered)
    if (!catalogue.effects.some((effect) => effect.id === id))
      problems.push(`catalogue: registry has unknown id ${id}`);
  return problems;
}

/** Definitions exported by the built package must agree with the documented reduced behaviour. */
export async function definitionProblems(catalogue) {
  const problems = [];
  for (const effect of catalogue.effects.filter((item) => item.definition)) {
    const entry = animationEntries().find((item) => item.entry === effect.entry);
    const file = join(packageRoot, "dist", entry.types.replace(/\.d\.ts$/, ".js"));
    const definition = (await import(pathToFileURL(file).href))[effect.definition];
    // "n/a" entries do not animate; their definitions carry "off".
    const expected = effect.reduced === "n/a" ? "off" : effect.reduced;
    if (typeof definition?.setup !== "function")
      problems.push(`catalogue: ${effect.id} ${effect.definition} is not an effect definition`);
    else if (definition.reducedMotion !== expected)
      problems.push(
        `catalogue: ${effect.id} reduced "${effect.reduced}", the package says "${definition.reducedMotion}"`,
      );
  }
  return problems;
}

/** The pages never offer the private package as installable from npm. */
export function honestyProblems(pages) {
  const problems = [];
  for (const page of pages) {
    if (/\b(?:pnpm add|npm (?:install|i)|yarn add)\b[^\n`]*@neshel-ui\/animations/.test(page.body))
      problems.push(`catalogue: ${page.locale}/${page.rel} shows an npm install of animations`);
    if (/<PackageInstall[^>]*@neshel-ui\/animations/.test(page.body))
      problems.push(`catalogue: ${page.locale}/${page.rel} offers animations as installable`);
  }
  return problems;
}

/** Descriptions shown on the effect pages (their options interface) need a Spanish text. */
export function optionTranslationProblems(catalogue, api, spanish) {
  const shown = new Set();
  for (const effect of catalogue.effects.filter((item) => item.options)) {
    const item = api[`animations/${effect.entry.replaceAll("/", "-")}`].exports.find(
      (candidate) => candidate.name === effect.options,
    );
    for (const { description } of [item, ...(item.props ?? [])])
      if (description) shown.add(description);
  }
  const missing = [...shown].filter((text) => !spanish[text]);
  const obsolete = Object.keys(spanish).filter((text) => !shown.has(text));
  return [
    ...missing.map((text) => `catalogue: no Spanish text for option "${text}"`),
    ...obsolete.map((text) => `catalogue: obsolete Spanish option text "${text}"`),
  ];
}

export async function checkCatalogue(problems, pages, api) {
  const catalogue = loadCatalogue();
  const entries = animationEntries();
  const manifest = JSON.parse(readFileSync(join(packageRoot, "package.json"), "utf8"));
  const stylesheets = new Set(
    Object.keys(manifest.exports)
      .filter((key) => key.endsWith(".css"))
      .map((key) => key.slice(2)),
  );
  const apiNames = new Map(
    entries.map(({ entry, slug }) => [
      entry,
      new Set(api[`animations/${slug}`].exports.map((item) => item.name)),
    ]),
  );
  problems.push(
    ...catalogueProblems(catalogue, { contract: contractEntries(), api: apiNames, stylesheets }),
    ...catalogueContentProblems(catalogue, pages),
    ...exampleProblems(catalogue),
    ...vocabularyProblems(catalogue, pages, api),
    ...untypedOptionProblems(catalogue, (id) =>
      readFileSync(join(docsRoot, "demos", "animations", `${id.toLowerCase()}.tsx`), "utf8"),
    ),
    ...(await definitionProblems(catalogue)),
    ...honestyProblems(pages),
    ...optionTranslationProblems(
      catalogue,
      api,
      JSON.parse(readFileSync(join(docsRoot, "i18n", "api.animations.es.json"), "utf8")),
    ),
  );
  if (manifest.private !== true || manifest.version !== "0.0.0")
    problems.push("catalogue: @neshel-ui/animations is no longer private 0.0.0; update its pages");
  // Every subpath has exactly one generated reference per language.
  for (const locale of ["en", "es"])
    for (const { entry } of entries) {
      const marker = `<EntryReference entry="${entry}" />`;
      const count = pages.filter((p) => p.locale === locale && p.body.includes(marker)).length;
      if (count !== 1)
        problems.push(`catalogue: ${locale} has ${count} references for "${entry}", expected 1`);
    }
  return { effects: catalogue.effects.length, entries: entries.length };
}
