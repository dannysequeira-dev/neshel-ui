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

- [x] T010 config: four status colour roles, contrast pairs, defaults, regenerated stylesheets, goldens (FR-026)
- [x] T011 cli: manifest schema 2 (validation, keyframes, media blocks), components manifest discovery (FR-004)
- [x] T012 components: package manifest, internal helpers (errors, slot, responsive, breakpoint-check copy + drift test)
- [x] T013 components: style tables, manifest, generator integration, drift/consistency tests (FR-003)
- [x] T014 Button with loading, iconOnly, responsive size, asChild rules (FR-010–FR-012)
- [x] T015 [P] Card family, Badge, Input, Label, VisuallyHidden, Separator, Skeleton (FR-020–FR-040)
- [x] T016 Unit tests: semantics, variants, refs, asChild, errors, forms, SSR (FR-120)
- [x] T017 check-pack components contract (exports, deps, imports, stylesheet equality) (FR-001, FR-002)

## 005.2 — Overlays

- [x] T020 Portal theme layer (trigger registry, theme wrapper, container context, Escape guard) (FR-062, FR-063)
- [x] T021 Dialog family (FR-050)
- [x] T022 [P] AlertDialog family (FR-055)
- [x] T023 [P] Sheet family (FR-058)
- [x] T024 [P] Popover family, Tooltip (FR-060, FR-040)
- [x] T025 Unit tests (jsdom): open/close, controlled, focus entry, titles, theme wrapper

## 005.3 — Selection

- [x] T030 Select (FR-070)
- [x] T031 MultiSelect with chips, clear-all, live region (FR-075)
- [x] T032 Combobox single and multiple, external filtering, label cache (FR-080)
- [x] T033 Unit tests: markup, form serialisation, controlled values

## 005.4 — Navigation

- [x] T040 Navbar family with hideBelow (FR-090)
- [x] T041 NavigationMenu family (FR-093)
- [x] T042 DropdownMenu family (FR-096)
- [x] T043 MobileMenu family with CSS mode (FR-098)
- [x] T044 Unit tests

## 005.5 — Application shell

- [x] T050 CSS mode hook and AppShell state (FR-100)
- [x] T051 Sidebar family, rail, tooltips, SidebarSub, mobile sheet host (FR-105, FR-106)
- [x] T052 SidebarTrigger, useAppShell (FR-110)
- [x] T053 Unit tests: SSR markup, state, controlled/uncontrolled, errors

## 005.6 — Integration and accessibility

- [x] T060 Storybook: stories for every family, theme and breakpoint stories (FR-130)
- [x] T061 Demo A responsive dashboard; Demo B advanced form (FR-130)
- [x] T062 Components lab for consumers (scenario pages, SSR entry)
- [x] T063 Browser interaction suite (CDP real input) for brief §31 (FR-121)
- [x] T064 axe-core checks light/dark (FR-122)

## 005.7 — Distribution and closure

- [x] T070 check:consumer component variants: Tailwind, plain, configured themes, extend, replace (FR-123)
- [x] T071 Tree-shaking measurement (SC-007), CSS/bundle size report
- [x] T072 Negative controls: broken CSS, missing export, removed a11y attribute (FR-124)
- [x] T073 Docs: components.md, package README, architecture, package-contracts, theming, roadmap, CLAUDE.md (FR-131)
- [x] T074 Changeset
- [ ] T075 CI green on three OSes; evidence.md; traceability.md; closure
