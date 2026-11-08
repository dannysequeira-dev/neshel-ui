# Tasks: Component library, navigation and application shell

Dependency-ordered. `[P]` = can run in parallel with the previous task. Status: `[x]` done,
`[ ]` open. Requirement links in parentheses.

## 005.0 — Specification and architecture

- [x] T001 Reconstruct context (constitution, ADRs 0001–0011, docs, specs 002–004, packages, scripts)
- [x] T002 Inspect Radix and Base UI releases and APIs (research inputs)
- [x] T003 brief.md, spec.md, research.md (R1–R20)
- [x] T004 Contracts: components-api, components-css, shell-and-overlays
- [x] T005 plan.md, tasks.md, checklists/requirements.md
- [x] T006 ADRs 0012 (headless primitives), 0013 (styling and tokens), 0014 (shell and portals)
- [x] T007 Consistency analysis (analysis.md); resolve critical/high findings

## 005.1 — Foundation

- [ ] T010 config: four status colour roles, contrast pairs, defaults, regenerated stylesheets, goldens (FR-026)
- [ ] T011 cli: manifest schema 2 (validation, keyframes, media blocks), components manifest discovery (FR-004)
- [ ] T012 components: package manifest, internal helpers (errors, slot, responsive, breakpoint-check copy + drift test)
- [ ] T013 components: style tables, manifest, generator integration, drift/consistency tests (FR-003)
- [ ] T014 Button with loading, iconOnly, responsive size, asChild rules (FR-010–FR-012)
- [ ] T015 [P] Card family, Badge, Input, Label, VisuallyHidden, Separator, Skeleton (FR-020–FR-040)
- [ ] T016 Unit tests: semantics, variants, refs, asChild, errors, forms, SSR (FR-120)
- [ ] T017 check-pack components contract (exports, deps, imports, stylesheet equality) (FR-001, FR-002)

## 005.2 — Overlays

- [ ] T020 Portal theme layer (trigger registry, theme wrapper, container context, Escape guard) (FR-062, FR-063)
- [ ] T021 Dialog family (FR-050)
- [ ] T022 [P] AlertDialog family (FR-055)
- [ ] T023 [P] Sheet family (FR-058)
- [ ] T024 [P] Popover family, Tooltip (FR-060, FR-040)
- [ ] T025 Unit tests (jsdom): open/close, controlled, focus entry, titles, theme wrapper

## 005.3 — Selection

- [ ] T030 Select (FR-070)
- [ ] T031 MultiSelect with chips, clear-all, live region (FR-075)
- [ ] T032 Combobox single and multiple, external filtering, label cache (FR-080)
- [ ] T033 Unit tests: markup, form serialisation, controlled values

## 005.4 — Navigation

- [ ] T040 Navbar family with hideBelow (FR-090)
- [ ] T041 NavigationMenu family (FR-093)
- [ ] T042 DropdownMenu family (FR-096)
- [ ] T043 MobileMenu family with CSS mode (FR-098)
- [ ] T044 Unit tests

## 005.5 — Application shell

- [ ] T050 CSS mode hook and AppShell state (FR-100)
- [ ] T051 Sidebar family, rail, tooltips, SidebarSub, mobile sheet host (FR-105, FR-106)
- [ ] T052 SidebarTrigger, useAppShell (FR-110)
- [ ] T053 Unit tests: SSR markup, state, controlled/uncontrolled, errors

## 005.6 — Integration and accessibility

- [ ] T060 Storybook: stories for every family, theme and breakpoint stories (FR-130)
- [ ] T061 Demo A responsive dashboard; Demo B advanced form (FR-130)
- [ ] T062 Components lab for consumers (scenario pages, SSR entry)
- [ ] T063 Browser interaction suite (CDP real input) for brief §31 (FR-121)
- [ ] T064 axe-core checks light/dark (FR-122)

## 005.7 — Distribution and closure

- [ ] T070 check:consumer component variants: Tailwind, plain, configured themes, extend, replace (FR-123)
- [ ] T071 Tree-shaking measurement (SC-007), CSS/bundle size report
- [ ] T072 Negative controls: broken CSS, missing export, removed a11y attribute (FR-124)
- [ ] T073 Docs: components.md, package README, architecture, package-contracts, theming, roadmap, CLAUDE.md (FR-131)
- [ ] T074 Changeset
- [ ] T075 CI green on three OSes; evidence.md; traceability.md; closure
