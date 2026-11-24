# Documentation coverage — before (`f1672cf`) and after

State: **complete** (API, examples, behaviour, accessibility and limits where applicable), **partial**, **missing**,
**outdated**, **duplicated**. Counts are per language unless stated.

## Totals

| Measure                                  | Before     | After      |
| ---------------------------------------- | ---------- | ---------- |
| Website pages (EN + ES)                  | 156        | 242        |
| Public coverage targets documented       | 345/345    | 345/345    |
| Public exports marked as not in 0.1.0    | 0/28       | 28/28      |
| Animations effects documented            | 0/157      | 157/157    |
| Animations examples (live + source only) | 0          | 155 + 2    |
| Animations exports in references         | 0/883      | 883/883    |
| Import paths with a reference            | 0/19       | 19/19      |
| Live previews of public components       | 52 modules | 56 modules |
| Type-checked MDX snippets (EN + ES)      | 146        | 170        |
| Spanish option texts for effect pages    | 0          | 565        |

## Public packages

| Area                                           | Before   | After    | Change                                                   |
| ---------------------------------------------- | -------- | -------- | -------------------------------------------------------- |
| Config (index, tokens, themes, type, bp)       | complete | complete | Contract count corrected (25 roles)                      |
| Layout (7 components, recipes, shared rules)   | complete | complete | —                                                        |
| Typography (4 components, shared props)        | complete | complete | —                                                        |
| CLI (index, validate, generate, codes, CI)     | complete | complete | —                                                        |
| Components 0.1.0 (22 pages; headings and data) | complete | complete | —                                                        |
| Accordion, Collapsible, Switch                 | partial  | complete | Notice, example, composition, limits, mistakes           |
| Toast / Toaster                                | partial  | complete | Notice, queue example, lifetime, motion contract, limits |
| Components catalogue page                      | outdated | complete | Four families added                                      |
| Nested overlays                                | partial  | complete | Escape rules, 0.1.0 notice, toasts                       |
| Choosing components, forms, accessibility      | partial  | complete | Accordion/Collapsible, Switch/checkbox, Toast/Dialog     |
| Release status, introduction                   | outdated | complete | Main vs 0.1.0; animations status                         |
| Home install label                             | outdated | complete | —                                                        |
| Contributing to the docs                       | partial  | complete | New rules                                                |

No duplicated export documentation was found (the `coverage` check already forbids it).

## Animations

| Area                                          | Before                     | After                              |
| --------------------------------------------- | -------------------------- | ---------------------------------- |
| Status and honesty (private, not on npm)      | README only                | complete                           |
| Catalogue (search, filter)                    | specification only         | complete                           |
| Families E H P G ST SP C PT L T S M B F D     | missing (15)               | complete                           |
| Engine, definitions, scheduler, springs       | README paragraph           | complete                           |
| Composition, channels, conflicts              | specification only         | complete                           |
| React bindings                                | README list                | complete                           |
| Controllers, timelines, progress sources      | specification only         | complete                           |
| Accessibility and reduced motion              | specification only         | complete                           |
| Performance, GPU budget                       | specification only         | complete                           |
| SSR, stylesheets, support matrix              | README paragraph           | complete                           |
| Router adapters, cross-document transitions   | specification only         | complete                           |
| Complete API reference                        | missing                    | complete (descriptions in English) |
| Storybook (API of each entry used in a story) | 154/157 (ST04, ST10, PT10) | 156/157 (PT10: router consumers)   |
| Playground                                    | 155/157 (ST10, PT10)       | unchanged                          |
