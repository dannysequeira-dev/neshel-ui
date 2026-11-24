# Tasks — Phase 018

Legend: `[x]` done and verified locally; `[~]` done, awaiting CI; `[ ]` open. Evidence: [evidence.md](evidence.md).

## 018.0 Audit and specification

- [x] T001 Read CLAUDE.md, AGENTS.md, constitution, roadmap, 017 evidence; contracts 009–017 of the documented APIs
- [x] T002 Branch from `f1672cf`; verify main CI 45463495420 (14/14, attempt 1)
- [x] T003 Compare `main` with `v0.1.0`; extract the 883 animations exports; coverage matrix
- [x] T004 Specification, research, plan, contract; status of 017 in CLAUDE.md and roadmap

## 018.1 Data and integrity

- [x] T010 `docs:api` extracts the 19 animations entries from the manifest
- [x] T011 `catalog.json` (157) checked against contract, declarations and runtime definitions
- [x] T012 Content, vocabulary, example, honesty, option-translation and unreleased checks
- [x] T013 Negative controls (`tests/docs-catalogue.test.mjs`)

## 018.2 Public packages

- [x] T020 Unreleased notices; release status; introduction; home label
- [x] T021 Accordion, Collapsible, Switch, Toast: 4 examples, composition, lifetime, limits, mistakes
- [x] T022 Nested overlays, choosing components, forms, accessibility, components catalogue, contributing

## 018.3–018.4 Animations

- [x] T030 Overview, catalogue, composition, engine, React, controllers, accessibility, performance, SSR/support
- [x] T031 15 family pages, EN/ES; 157 example modules
- [x] T032 19 reference pages, EN/ES; 565 option texts in Spanish
- [x] T033 Story for ST04/ST10

## 018.5–018.6 Verification

- [x] T040 `check:docs-site`: families, catalogue, search, keyboard, axe
- [x] T041 Examples exercised in Chromium, Firefox and WebKit; screenshots reviewed
- [x] T042 Local gates
- [~] T043 PR and CI 14/14 first attempt on the final SHA
- [ ] T044 Owner review (never merged by us)
