# Contract — documentation integrity (feature 018)

Extends [docs-content.md](../../006-docs-dx-release/contracts/docs-content.md). Implementation:
`scripts/docs/catalogue.mjs`, `scripts/check-docs.mjs`, `scripts/check-docs-site.mjs`; negative controls:
`tests/docs-catalogue.test.mjs`.

## Catalogue data (`apps/docs/animations/catalog.json`)

`{ id, name: { en, es }, entry, api[], options?, css?, definition?, cost, reduced, demo? }`. `demo: "source"` marks an
entry without a live example.

| Rule                                                                                                              | Check                       |
| ----------------------------------------------------------------------------------------------------------------- | --------------------------- |
| Exactly the 157 ids of `specs/008-animations/contracts/catalog.md`, without duplicates                            | `catalogueProblems`         |
| `reduced` equals the contract                                                                                     | `catalogueProblems`         |
| `entry`, `api`, `options`, `definition` and `css` exist in the built package                                      | `catalogueProblems`         |
| The exported effect definition declares the same reduced behaviour (`n/a` ↔ `off`)                                | `definitionProblems`        |
| One section per language, in its family page, with the catalogue name, anchor, `<Effect>`, its API and ≥ 20 words | `catalogueContentProblems`  |
| Identifiers cited in a section exist in its entry (or are a listed platform name)                                 | `vocabularyProblems`        |
| One example file per entry that imports the entry and its stylesheet and uses its API; registry equals catalogue  | `exampleProblems`           |
| Untyped options in examples carry `satisfies …Options`                                                            | `untypedOptionProblems`     |
| Option descriptions shown on the pages have Spanish text; no obsolete entries                                     | `optionTranslationProblems` |
| No page offers to install the private package; the manifest is still private 0.0.0                                | `honestyProblems`, manifest |
| One `<EntryReference>` per import path and language                                                               | `checkCatalogue`            |

## Unreleased API (`apps/docs/published-api.json`)

A page that documents an export missing from the last release contains `<Unreleased />`; a page without such exports
must not. An export of the last release that no longer exists is an error. The file changes only with a release.

## Site (`pnpm check:docs-site`)

Every family page in both languages has every anchor, mounts every live example and raises no page error; the catalogue
lists 157 rows and filters; the search finds an effect; a gesture example answers the keyboard; axe finds no WCAG A/AA
violation on the family pages (English in light, Spanish in dark), the catalogue and representative pages.

## Limits

The vocabulary rule proves that a name exists, not that the sentence about it is right. `<details>` content is in the
page but closed references are outside the search index.
