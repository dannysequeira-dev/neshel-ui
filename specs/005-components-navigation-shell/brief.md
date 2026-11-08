# Owner brief — Phase 005 (summary)

Source: "Neshel-UI — Phase 005: Complete Component Library, Navigation & Application Shell", the
first and only Phase 005 brief from the project owner (2026-11-08). This file summarises it for
traceability; section numbers (§) match the brief. The brief is authoritative.

## Authorisation (§38)

- Autonomous specification, architecture, implementation, tests, documentation, Conventional
  Commits, fast-forward pushes to `origin/main`, CI inspection and fixes; justified dependencies;
  refactoring of approved package internals; public APIs within Phase 005 scope. No routine
  approval between milestones.
- Forbidden: force-push, rewriting remote history, `Co-Authored-By` trailers, npm publish, GitHub
  releases, tags without explicit approval, removing `private: true`, starting Phase 006,
  unrelated features, weakening quality gates, claiming PASS with missing mandatory functionality.

## Mandatory scope (§2)

| Family     | Components                                                                                         |
| ---------- | -------------------------------------------------------------------------------------------------- |
| Foundation | Button, Card, Badge, Input, Separator, Skeleton                                                    |
| Navigation | Navbar, NavigationMenu, DropdownMenu, Sidebar, ResponsiveMenu/MobileMenu, AppShell, SidebarTrigger |
| Overlays   | Dialog/Modal, AlertDialog, Sheet/Drawer, Popover                                                   |
| Selection  | Select (single), MultiSelect, Combobox (single), Combobox (multiple)                               |
| Supporting | Tooltip, Label, VisuallyHidden, ScrollArea — when justified                                        |

Out of scope: DatePicker, DataTable, Toast, rich text, charts, virtualisation without
justification, drag gestures, fetch libraries.

## Principles (§3, §25–§29)

Composable, accessible by default, native semantics, responsive without a Provider, semantic
tokens (light, dark, system, named, nested themes), SSR-safe, typed, router-agnostic,
tree-shakeable, usable without Tailwind; `tailwind-variants/lite`; existing `asChild` contract;
no forced icon library; `@neshel-ui/components/styles.css` precompiled with no `@source`.

## Headless primitives (§4, §5)

Radix authorised for Dialog, AlertDialog, Popover, DropdownMenu, NavigationMenu, Collapsible,
Tooltip and other justified patterns, but only where semantics match. Base UI to be evaluated for
Select, MultiSelect and Combobox (preferred candidate: Radix for overlays/navigation, Base UI for
selection) with one coherent selection engine; decision in an ADR; no custom combobox engine;
public APIs must not leak library details.

## Component requirements (§6–§24)

Detailed per component in the brief: Button (§6), Card (§7), Badge (§8), Input (§9), Separator
(§10), Skeleton (§11), AppShell (§12), Sidebar (§13), Navbar/NavigationMenu (§14),
MobileMenu (§15), breakpoints (§16), Dialog (§17), AlertDialog (§18), Sheet (§19), Popover (§20),
theme inheritance through portals (§21, critical), Select (§22), MultiSelect (§23), Combobox (§24).
They are reproduced as functional requirements in [spec.md](spec.md).

## Verification (§30–§34)

Unit/component tests; real-browser interaction tests (dialogs, focus, Escape, menus, selection,
sidebar, mobile menu, responsive transitions, nested theme portals, SSR/hydration) with computed
styles; axe plus focused interaction tests (scope documented; Firefox/WebKit only if actually
run); packed external consumers: React + Tailwind v4, React without Tailwind, custom themes,
custom breakpoints extend and replace, SSR/hydration, native forms and overlays; negative tests
for broken CSS, exports and accessibility; Storybook for every family plus Demo A (responsive
dashboard) and Demo B (advanced form) built from distributable exports.

## Workflow and milestones (§35, §36)

Spec Kit flow (clarify → plan → tasks → analyze → implement → evidence → CI → closure).
Milestones 005.0 specification, 005.1 foundation, 005.2 overlays, 005.3 selection,
005.4 navigation, 005.5 application shell, 005.6 integration and accessibility, 005.7
distribution and closure; the sequence may change when dependencies justify it.

## Known Phase 004 limitations to keep tracking (§37)

Unknown well-formed breakpoints warn instead of throwing; incomplete Flex runtime validation for
some custom responsive directions; approximate trimming when metrics do not match the loaded font;
custom breakpoint consumers must import the generated CSS correctly; browser verification mainly
on Chrome; Layout CSS close to its size budget.

## Final report (§39)

Inventory, APIs, Radix/Base UI decisions, dependency and size impact, AppShell architecture,
mobile navigation, overlay accessibility, selection behaviour, theme/breakpoint integration, test
results, CI runs and final commit, traceability, limitations, and a PASS / CONDITIONAL PASS / FAIL
recommendation. Stop before Phase 006; publish nothing.
