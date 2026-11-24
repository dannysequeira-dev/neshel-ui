# Feature Specification: Documentation (Phase 018)

**Feature Branch**: `feature/018-documentation` (from `origin/main` `f1672cf`, the PR #18 squash merge; main CI run
45463495420 14/14 on attempt 1)

**Created**: 2026-11-24

**Status**: Implemented; awaiting CI on the PR and owner review. What was verified, where and when:
[evidence.md](evidence.md).

**Input**: owner brief of 2026-11-24 (Phase 018).

Companion documents: [research.md](research.md) (audit and decisions), [plan.md](plan.md), [tasks.md](tasks.md),
[evidence.md](evidence.md), [coverage.md](coverage.md) (matrix before/after) and the contract
[contracts/documentation-integrity.md](contracts/documentation-integrity.md).

## Problem

1. `@neshel-ui/animations` has 157 effects in 19 import paths and **no** page on the website.
2. The website documents `main` but says that everything is published as 0.1.0. Phase 017 added 28 public exports that
   npm does not have, without any notice.
3. Phase 017 pages are short (no limitations, mistakes or composition) and the Components catalogue, the choosing and
   forms guides and the overlay rules do not mention them.
4. Nothing checks that prose names real options; only API tables and snippets are verified.

## User scenarios

- **US1 (P1)** A developer finds an effect by name, id, API or family, sees it run, copies the code and knows its
  options, reduced-motion behaviour and cost, in English or Spanish.
- **US2 (P1)** A developer installing 0.1.0 can tell which documented API their version does not have.
- **US3 (P1)** A developer understands how effects share an element, how to control and sequence them, and how to use
  the engine without React.
- **US4 (P2)** A developer uses Toast, Accordion, Collapsible, Switch and nested overlays without reading the source.
- **US5 (P2)** A maintainer who changes the API, an option, an effect or a translation gets a failing check.

## Requirements

- **FR-001** Every one of the 157 catalogue entries has one section per language in its family page: explanation, import
  path, real API, options, example, stylesheet, performance and reduced motion.
- **FR-002** Each entry has one example module; the code shown is the module that runs. Entries that need two documents
  or a router (PT09, PT10) show type-checked source only and say so.
- **FR-003** A catalogue page lists all entries, filterable by text (ignoring accents) and by family; it works without
  JavaScript as a complete list.
- **FR-004** Guides: overview, composition, engine, React, controllers and timelines, accessibility, performance, and
  SSR/styles/support.
- **FR-005** Every import path has a generated reference of all its exports.
- **FR-006** Animations pages state that the package is experimental, private and not installable. No page offers to
  install it. F06 is generic enter/exit; Toast/Toaster belong to Components.
- **FR-007** Pages with API missing from 0.1.0 carry a notice; other pages must not.
- **FR-008** Components pages of Phase 017 cover composition, lifetime, limitations and common mistakes, with examples.
- **FR-009** Documentation integrity is enforced by `pnpm check:docs`, `pnpm check:docs-site` and `pnpm test`
  ([contract](contracts/documentation-integrity.md)).
- **FR-010** No visual redesign, no new runtime dependency, no package behaviour change, no version, tag, changeset or
  publication.

## Success criteria

| Id     | Measure                                                                                                                                   |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| SC-001 | 157/157 entries documented in EN and ES; 157/157 examples type-checked; 155/155 live examples mount without page errors in both languages |
| SC-002 | 883/883 exports of the 19 animations entries in generated references                                                                      |
| SC-003 | 345/345 public coverage targets still documented once per language                                                                        |
| SC-004 | 28/28 unreleased exports marked                                                                                                           |
| SC-005 | 0 broken internal links or anchors; 0 missing translations                                                                                |
| SC-006 | axe-core: 0 violations on the 15 family pages, catalogue and representative pages, light and dark                                         |
| SC-007 | Every integrity rule has a negative control in `tests/docs-catalogue.test.mjs` or a recorded red run                                      |
| SC-008 | CI 14/14 on the first attempt of the final PR SHA                                                                                         |

## Out of scope

Visual identity and navigation redesign (Phase 019); fixing package behaviour found while documenting
([research.md](research.md), findings); publication of any package; manual checks on Safari, devices and screen readers.
