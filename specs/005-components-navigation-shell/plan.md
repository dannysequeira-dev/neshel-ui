# Implementation Plan: Component library, navigation and application shell

**Spec**: [spec.md](spec.md) · **Research**: [research.md](research.md) · **Tasks**: [tasks.md](tasks.md)

## Summary

Build `@neshel-ui/components` on the feature 003/004 pipeline (style tables → manifest → CLI
renderer → precompiled CSS), with Radix for overlays/menus/navigation and Base UI for selection,
a CSS-driven responsive shell, theme-preserving portals, and verification from jsdom unit tests,
CDP browser interaction tests with axe, and packed external consumers.

## Technical context

- TypeScript strict, ESM/NodeNext, React 19 peers (`react`, `react-dom`), `"use client"` on
  interactive modules, `tailwind-variants/lite`, `@radix-ui/react-slot`.
- New runtime dependencies (components only): `@base-ui/react` ^1.9.0, `@radix-ui/react-dialog`
  ^1.3.1, `@radix-ui/react-alert-dialog` ^1.2.1, `@radix-ui/react-popover` ^1.3.1,
  `@radix-ui/react-dropdown-menu` ^2.2.1, `@radix-ui/react-navigation-menu` ^1.4.1,
  `@radix-ui/react-tooltip` ^1.4.1. Root dev dependency: `axe-core` ^4.14.0.
- Peer: `@neshel-ui/config` (`workspace:^`, types only).
- Config: four colour roles; CLI: manifest schema 2, components manifest discovery.

## Constitution check

| Principle                | Plan                                                                                       |
| ------------------------ | ------------------------------------------------------------------------------------------ |
| II Modular packages      | components depends on no Neshel runtime package; layout/typography untouched by components |
| III CSS-first            | precompiled CSS, tokens only, no Provider, config at build time                            |
| IV Accessibility         | Radix/Base UI primitives, native semantics, axe + keyboard browser tests                   |
| V Typography/layout      | components do not redefine typography; compatible inside Stack/Inline                      |
| VI Evidence              | unit, browser, axe, packed consumers, negative controls, CI 3 OSes                         |
| VII Spec-driven, minimal | ADRs 0012–0014; mandatory scope only; no aliases                                           |
| VIII Safe releases       | private packages; changeset only; no publish/tag                                           |
| IX Cross-platform        | Node scripts only; CDP harness on three OSes                                               |

## Architecture

```text
packages/components/src
  style-tables.ts ──► manifestRules() ──► style-manifest.json (schema 2) ──► styles.css
  internal/  errors, slot helpers, responsive classes, breakpoint-check (shared copy),
             portal theme (layer context, ThemePortal), use-css-mode, dev warnings
  button card badge input label visually-hidden separator skeleton tooltip
  dialog alert-dialog sheet popover            (Radix)
  select multi-select combobox                 (Base UI)
  navbar navigation-menu dropdown-menu mobile-menu
  app-shell sidebar                            (context + Radix dialog for mobile)
```

## Milestones

1. **005.0** — this specification set, ADRs, analysis.
2. **005.1** — tokens (25 roles), manifest schema 2, components pipeline, foundation components,
   unit tests, pack contract.
3. **005.2** — overlays + theme portals + Tooltip.
4. **005.3** — selection controls + layering rules.
5. **005.4** — Navbar, NavigationMenu, DropdownMenu, MobileMenu.
6. **005.5** — AppShell, Sidebar, SidebarTrigger.
7. **005.6** — Storybook (families, Demo A, Demo B), browser interaction + axe suite.
8. **005.7** — consumers (Tailwind, plain, themes, extend, replace, SSR, forms), negative controls,
   docs, changeset, CI on three OSes, evidence, traceability, closure.

Each milestone ends with lint, typecheck, unit tests and package build green and a Conventional
Commit; pushes after milestones with green local gates.

## Risks

| Risk                                     | Mitigation                                                 |
| ---------------------------------------- | ---------------------------------------------------------- |
| Base UI ↔ Radix layering                 | R12 rules + browser tests (Select in Dialog, Escape order) |
| jsdom gaps (pointer events, layout)      | interaction coverage in Chrome; jsdom for markup/state     |
| CSS size growth in generated stylesheets | budget in contract; measured                               |
| CI time (more consumers)                 | reuse consumer variants; one lab app per variant           |
