// Feature 018: the documentation guards fail when they should (negative controls), without a build.
import assert from "node:assert/strict";
import test from "node:test";
import { unreleasedProblems } from "../scripts/check-docs.mjs";
import {
  CATALOGUE_SIZE,
  catalogueContentProblems,
  catalogueProblems,
  contractEntries,
  effectSections,
  entryVocabulary,
  exampleProblems,
  honestyProblems,
  loadCatalogue,
  untypedOptionProblems,
} from "../scripts/docs/catalogue.mjs";
import { API_PACKAGES } from "../scripts/docs/extract-api.mjs";
import { parseRange } from "../scripts/lib/static-server.mjs";

const clone = (value) => JSON.parse(JSON.stringify(value));
const catalogue = loadCatalogue();
const contract = contractEntries();
/** An API that exports whatever the catalogue names. */
const api = new Map();
const stylesheets = new Set();
for (const effect of catalogue.effects) {
  if (!api.has(effect.entry)) api.set(effect.entry, new Set());
  for (const name of [...effect.api, effect.options, effect.definition])
    if (name) api.get(effect.entry).add(name);
  if (effect.css) stylesheets.add(effect.css);
}
const context = { contract, api, stylesheets };

test("the catalogue matches the 157-entry contract", () => {
  assert.equal(contract.size, CATALOGUE_SIZE);
  assert.deepEqual(catalogueProblems(catalogue, context), []);
  assert.deepEqual(exampleProblems(catalogue), []);
});

test("a missing, duplicated or unknown effect is reported", () => {
  const missing = clone(catalogue);
  missing.effects.pop();
  assert.match(catalogueProblems(missing, context).join(), /expected 157.*D11/);
  const duplicated = clone(catalogue);
  duplicated.effects[1].id = "E01";
  assert.match(catalogueProblems(duplicated, context).join(), /duplicated ids/);
});

test("an invented export, stylesheet, entry or reduced behaviour is reported", () => {
  const invented = clone(catalogue);
  invented.effects[0].api.push("sparkle");
  invented.effects[1].css = "magic.css";
  invented.effects[2].entry = "nowhere";
  invented.effects[3].reduced = "off";
  const problems = catalogueProblems(invented, context).join("\n");
  for (const expected of [/sparkle/, /magic\.css/, /nowhere/, /E04 reduced/])
    assert.match(problems, expected);
});

test("F06 is generic enter and exit motion and no effect claims the Components toast API", () => {
  const f06 = catalogue.effects.find((effect) => effect.id === "F06");
  assert.deepEqual(f06.api, ["EnterExit", "createEnterExit"]);
  for (const effect of catalogue.effects)
    for (const name of effect.api) assert.ok(!/toast/i.test(name), `${effect.id} ${name}`);
});

test("an undocumented effect, a thin section or a wrong heading is reported", () => {
  const body = "## E01 · Wrong name [#e01]\n\nToo short.\n\n## E02 · X [#nope]\n";
  assert.equal(effectSections(body).length, 2);
  const problems = catalogueContentProblems(catalogue, [
    { locale: "en", rel: "animations/effects/entrance.mdx", body },
  ]).join("\n");
  for (const expected of [
    /E01 is "Fade in", not "Wrong name"/,
    /E01 lacks <Effect/,
    /E01 needs an explanation/,
    /E02 anchor/,
    /E03 is not documented in en/,
    /E01 is not documented in es/,
  ])
    assert.match(problems, expected);
});

test("untyped options must be checked with satisfies", () => {
  const read = (code) => (id) => (id === "SP08" ? code : "");
  const bad = "<ScrollEffect options={{ colors: [] }} />";
  const good = "<ScrollEffect options={{ stops: [] } satisfies ScrollColorShiftOptions} />";
  assert.equal(untypedOptionProblems(catalogue, read(bad)).length, 1);
  assert.equal(untypedOptionProblems(catalogue, read(good)).length, 0);
});

test("the vocabulary of an entry contains names, members and literals", () => {
  const words = entryVocabulary([
    { name: "Thing", props: [{ name: "mode", type: '"fast" | "slow"' }] },
  ]);
  assert.deepEqual([...words].sort(), ["Thing", "fast", "mode", "slow"]);
});

test("a page that offers the private package as installable is reported", () => {
  const page = (body) => [{ locale: "en", rel: "x.mdx", body }];
  assert.equal(honestyProblems(page("pnpm add @neshel-ui/animations")).length, 1);
  assert.equal(
    honestyProblems(page('<PackageInstall packages={["@neshel-ui/animations"]} />')).length,
    1,
  );
  assert.equal(honestyProblems(page("It cannot be installed: `@neshel-ui/animations`.")).length, 0);
});

test("unreleased API must be marked, published API must not, removed API is reported", () => {
  const exportsOf = (names) => Object.fromEntries(API_PACKAGES.map((p) => [p, names[p] ?? []]));
  const published = { version: "0.1.0", exports: exportsOf({ components: ["Button", "Gone"] }) };
  const current = Object.fromEntries(
    API_PACKAGES.map((p) => [
      p,
      { exports: p === "components" ? [{ name: "Button" }, { name: "Switch" }] : [] },
    ]),
  );
  const page = (names, body) => ({
    locale: "en",
    rel: "p.mdx",
    data: { package: "components", exports: names },
    body,
  });
  const run = (...pages) => unreleasedProblems(pages, current, published).problems.join("\n");
  assert.match(run(page(["Switch"], "")), /not in 0\.1\.0; add <Unreleased/);
  assert.match(run(page(["Button"], "<Unreleased />")), /everything is published/);
  assert.match(run(page(["Switch"], "<Unreleased />")), /components:Gone was published/);
});

test("the preview server answers byte ranges", () => {
  assert.deepEqual(parseRange("bytes=0-9", 100), { start: 0, end: 9 });
  assert.deepEqual(parseRange("bytes=90-", 100), { start: 90, end: 99 });
  assert.deepEqual(parseRange("bytes=-10", 100), { start: 90, end: 99 });
  assert.equal(parseRange("bytes=100-", 100), "unsatisfiable");
  assert.equal(parseRange(undefined, 100), undefined);
});
