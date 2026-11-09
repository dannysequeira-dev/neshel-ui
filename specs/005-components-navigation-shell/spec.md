# Feature Specification: Component library, navigation and application shell

**Feature Branch**: `main` (spec directory `specs/005-components-navigation-shell`; no feature branch)

**Created**: 2026-11-08

**Status**: Implemented — milestones 005.0–005.7 complete; CI-verified in run 42543517738 (5/5).
Evidence: [evidence.md](evidence.md), [traceability.md](traceability.md). Closed pending owner
review. No package is published.

**Input**: Owner brief "Neshel-UI — Phase 005: Complete Component Library, Navigation &
Application Shell" (2026-11-08), summarised in [brief.md](brief.md). The brief is authoritative
and pre-authorises autonomous execution of all milestones.

Companion documents: [research.md](research.md) (spikes and decisions R1–R20),
[plan.md](plan.md), [tasks.md](tasks.md), [analysis.md](analysis.md), contracts
[components-api.md](contracts/components-api.md), [components-css.md](contracts/components-css.md),
[shell-and-overlays.md](contracts/shell-and-overlays.md); ADRs
[0012](../../docs/decisions/0012-headless-primitives.md),
[0013](../../docs/decisions/0013-components-styling-and-tokens.md) and
[0014](../../docs/decisions/0014-app-shell-responsive-navigation-and-portals.md).

## Problem

`@neshel-ui/components` is an empty placeholder. Applications cannot build dashboards, back
offices, navigation-heavy applications or advanced forms with Neshel-UI: there are no buttons,
form controls, overlays, menus, selection controls or application shell.

## Goals

1. Foundation components (Button, Card, Badge, Input, Separator, Skeleton) plus the supporting
   Label, VisuallyHidden and Tooltip.
2. Overlays (Dialog, AlertDialog, Sheet, Popover) whose themes survive portals.
3. Selection controls (Select, MultiSelect, single and multiple Combobox) with native form
   serialisation, built on one headless selection engine.
4. Navigation (Navbar, NavigationMenu, DropdownMenu, MobileMenu) and a responsive application
   shell (AppShell, Sidebar, SidebarTrigger) that follows the configured breakpoints without a
   Provider at the application level.
5. One precompiled stylesheet, usable with and without Tailwind, that follows custom breakpoints
   through the existing generator; evidence from unit, browser, accessibility and packed
   external-consumer tests on three operating systems.

## Non-goals

DatePicker, DataTable, Toast, rich-text editing, charts, virtualised lists, drag gestures on
sheets, free-text autocomplete, a form-state library, data fetching, routing, an icon library,
a Next.js consumer (feature 006), publishing, tags, releases, removing `private`, Phase 006.

## Clarifications

### Session 2026-11-08 — owner brief and agent decisions

The brief answers the scope questions. Remaining ambiguities were resolved within its rules
(§38: "choose the simplest coherent solution… document the decision"):

- Q: Which headless engines? → A: Radix for dialogs, sheets, popovers, menus, navigation menu and
  tooltips; Base UI for Select, MultiSelect and Combobox (single and multiple) — one selection
  engine (R1, ADR 0012).
- Q: Dot-notation compound components (`AppShell.Main`, `Navbar.Brand`)? → A: Flat named exports
  (`AppShellMain`, `NavbarBrand`). Property access on client references fails in React Server
  Components and defeats tree-shaking (R3).
- Q: Badge `success`/`warning` without colour roles? → A: Four new semantic roles `success`,
  `successForeground`, `warning`, `warningForeground` in `@neshel-ui/config` with contrast pairs;
  partial theme inputs keep working (R6, ADR 0013).
- Q: Which breakpoint does the shell use? → A: An explicit `breakpoint` prop (default `"lg"`); the
  CSS media query is the single source of truth and JavaScript reads the resulting mode from a
  custom property after hydration (R9, ADR 0014).
- Q: How do portals inherit nested themes? → A: Each overlay copies the nearest
  `data-neshel-theme` value of its trigger (or of the focused element when it opened) onto a
  `display: contents` wrapper inside the portal; an explicit `container` prop overrides (R11).
- Q: Modal and Drawer names? → A: `Dialog` and `Sheet` are the components; no duplicate `Modal`
  or `Drawer` aliases (the brief allows but does not require them) (R4).
- Q: Value type of selection controls? → A: Strings (`string | null`, `string[]`), the type HTML
  forms serialise; options are `{ value, label, disabled? }` with optional groups (R14).
- Q: Loading buttons? → A: `loading` keeps focus (`aria-disabled`, not `disabled`), suppresses
  activation and form submission, shows a decorative spinner and keeps the accessible name (R5).

## User scenarios

1. **Dashboard developer** (P1): composes `AppShell` + `Sidebar` + `Navbar` + `SidebarTrigger`;
   desktop shows an expanded sidebar that collapses to an icon rail; mobile shows a drawer that
   closes after navigation; routing links come from the application via `asChild`.
2. **Form developer** (P1): builds a form with `Input`, `Select`, `MultiSelect` and `Combobox`,
   controlled or uncontrolled; `FormData` contains the selected values; invalid fields expose
   `aria-invalid` and descriptions.
3. **Product designer** (P2): applies named and nested themes; dialogs, menus and selection
   popups opened inside a themed region use that region's tokens.
4. **Keyboard and screen-reader user** (P1): operates every control with the keyboard, sees a
   visible focus indicator, hears names, states and dialog titles; focus returns to the trigger
   when an overlay closes.
5. **Tailwind-free consumer** (P2): imports `@neshel-ui/components/styles.css` without Tailwind
   and gets identical behaviour.

## Requirements

### Shared contracts

- **FR-001** `@neshel-ui/components` exports every component and prop type from `.` as flat
  named exports, plus `./styles.css` and `./style-manifest.json`; ESM only, `.d.ts`, source maps,
  `sideEffects: ["**/*.css"]`, `private: true`.
- **FR-002** React and React DOM are peer dependencies (`^19.0.0`); `@neshel-ui/config` is a
  type-only peer (breakpoint registry). Runtime dependencies are limited to the Radix packages,
  `@base-ui/react`, `@radix-ui/react-slot` and `tailwind-variants`; no dependency on
  `@neshel-ui/layout`, `@neshel-ui/typography` or `@neshel-ui/core`.
- **FR-003** Styles use only `neshel-*` classes and semantic tokens (`var(--neshel-*)`); no colour
  literals, no Tailwind utilities, no resets, no `@source`, layer `components.neshel`.
- **FR-004** Static variants map to static classes; responsive variants (Button `size`, AppShell
  and Navbar/MobileMenu breakpoints) emit one class per written key and are rendered by the
  shared CLI renderer for default and configured breakpoints.
- **FR-005** `asChild` (Radix Slot) on components that render one semantic element and benefit
  from composition (Button, Card, CardTitle, NavbarBrand, NavbarLink, SidebarItem, MobileMenuLink,
  NavigationMenuLink, DropdownMenuItem, triggers and closes); refs, className/style merging and
  handler composition follow ADR 0009; `as` + `asChild` and invalid children throw
  `NeshelComponentsError`.
- **FR-006** Invalid props that would produce inaccessible or ambiguous markup throw
  `NeshelComponentsError` during render on server and client.
- **FR-007** Every component renders on the server without browser globals; interactive modules
  carry `"use client"`; markup is deterministic between server and client (no hydration errors).
- **FR-008** No application-level Provider is required; local contexts only where coordinated
  behaviour needs one (AppShell, overlay roots, Sidebar).
- **FR-009** Icons are consumer-provided React nodes; icon-only controls require an accessible
  name (Button `iconOnly` warns in development without one).

### Foundation

- **FR-010** Button: native `<button>` with `type="button"` by default; variants `primary`,
  `secondary`, `outline`, `ghost`, `destructive`, `link`; sizes `sm`, `md`, `lg` (responsive);
  `iconOnly`, `fullWidth`; native `disabled`; ref; native attributes and handlers.
- **FR-011** Button `loading`: `aria-disabled="true"`, `data-loading`, activation and submission
  suppressed, focus kept, decorative spinner, accessible name unchanged.
- **FR-012** Button `asChild`: renders the child (e.g. a link) without `type`; `disabled` or
  `loading` with `asChild` throws (links cannot be disabled).
- **FR-020** Card, CardHeader, CardTitle (`as` h1–h6, p, div; default h3), CardDescription,
  CardContent, CardFooter, CardAction: independent, context-free, non-interactive; Card supports
  `as` (div, section, article, aside, li) and `asChild`; variants `default`, `outline`, `muted`.
- **FR-025** Badge: `<span>` with variants `default`, `secondary`, `outline`, `success`, `warning`,
  `destructive`, `accent` and sizes `sm`, `md`; no role, no interactivity.
- **FR-026** Config gains colour roles `success`, `successForeground`, `warning`,
  `warningForeground` (defaults for light and dark, contrast pairs ≥ 4.5:1, Tailwind theme
  colours); existing configurations remain valid.
- **FR-030** Input: native `<input>`; controlled and uncontrolled; all native types and
  attributes (including numeric `size`); styling size through `uiSize`; `invalid` sets
  `aria-invalid` unless provided; ref to the input; works with `FormData` and form libraries.
- **FR-035** Separator: `orientation` horizontal/vertical; semantic by default
  (`role="separator"`, `aria-orientation` when vertical), `decorative` → `role="none"`; uses
  `var(--neshel-border)` like the layout separators; correct in flex containers.
- **FR-038** Skeleton: shapes `rectangle`, `circle`, `text`; `width`/`height`; `aria-hidden`;
  CSS pulse disabled under `prefers-reduced-motion`; documentation of `aria-busy` on regions.
- **FR-040** Supporting: Label (native `<label>`), VisuallyHidden, Tooltip (Radix; hover and
  focus; no Provider required).

### Overlays

- **FR-050** Dialog, DialogTrigger, DialogContent, DialogHeader, DialogFooter, DialogTitle,
  DialogDescription, DialogClose, DialogBody: controlled/uncontrolled, focus trap and restoration,
  Escape, overlay, portal, nested dialogs, scroll lock, sizes, optional close button with an
  accessible label, reduced motion.
- **FR-055** AlertDialog family: explicit Cancel and Action, initial focus on Cancel, no dismissal
  by outside press; Escape cancels.
- **FR-058** Sheet family with `side` left/right/top/bottom on the dialog engine; no drag gestures.
- **FR-060** Popover family: anchored, collision-aware, controlled/uncontrolled, Escape and
  outside press dismissal, portal.
- **FR-062** Overlays, menus, tooltips and selection popups render inside a wrapper that carries
  the theme of their trigger's nearest `data-neshel-theme` boundary; `container` overrides the
  portal target. Verified by computed styles in a browser.
- **FR-063** Selection popups opened inside a Neshel overlay render inside that overlay's
  content, and Escape inside an open selection popup closes only the popup.

### Selection

- **FR-070** Select: single string value (controlled/uncontrolled), placeholder, options, groups,
  disabled options, `required`, `invalid`, `disabled`, `readOnly`, `name`/`form` serialisation,
  labelling by `id` + `<Label htmlFor>` or ARIA, keyboard navigation and typeahead, portal.
- **FR-075** MultiSelect: string array; keyboard selection in a listbox that stays open; removable
  chips outside the trigger (no nested interactive content), clear-all, live announcement of
  removals, empty presentation, serialisation of every value, `required`/`invalid`.
- **FR-080** Combobox: searchable single and multiple (`multiple`) selection constrained to the
  items; local filtering by default, external filtering (`filter={null}` + `onInputValueChange`)
  and loading/empty states; controlled `inputValue`; clear button; chips with removal in
  multiple mode; selected values persist when the filtered items change; serialisation.

### Navigation

- **FR-090** Navbar (`<header>`), NavbarBrand, NavbarNav (`<nav>` + list, `hideBelow`
  breakpoint), NavbarLink (`aria-current="page"` when `active`), NavbarActions.
- **FR-093** NavigationMenu family (Radix navigation menu): links and disclosure panels of links,
  `aria-current` for the active link, keyboard navigation; not a command menu.
- **FR-096** DropdownMenu family (Radix menu): items, checkbox and radio items, labels, groups,
  separators, shortcuts, submenus, destructive items; command semantics only.
- **FR-098** MobileMenu, MobileMenuTrigger, MobileMenuContent, MobileMenuLink: a sheet-based
  navigation menu; controlled/uncontrolled; closes on link activation, Escape and when the
  viewport reaches its `breakpoint`; the trigger is hidden at and above the breakpoint.

### Application shell

- **FR-100** AppShell, AppShellMain, AppShellContent (`<main>`): grid layout; `breakpoint` selects
  the desktop threshold (default `lg`, any configured name or `base`); state `collapsed` and
  `mobileOpen`, each controlled or uncontrolled; no localStorage; no hydration mismatch.
- **FR-105** Sidebar (`<aside>`), SidebarHeader, SidebarContent (`<nav>`), SidebarFooter,
  SidebarGroup (labelled list), SidebarItem (icon, `active` → `aria-current`, `asChild` links,
  tooltip in the icon rail), SidebarSub (nested disclosure), SidebarSeparator;
  `collapsible` `icon` (rail), `offcanvas` (hidden) or `none`.
- **FR-106** In the mobile mode the sidebar's content renders only inside a modal sheet while open
  (never duplicated focusable content); the sheet closes on link activation, Escape and when the
  viewport becomes desktop.
- **FR-110** SidebarTrigger toggles the rail (desktop) or the drawer (mobile) and exposes
  `aria-expanded`, `aria-controls` and an accessible name.

### Verification

- **FR-120** Unit tests for semantics, variants, responsive classes, refs, `asChild`, errors,
  forms, controlled/uncontrolled state and keyboard behaviour that jsdom can express.
- **FR-121** Browser tests in Chrome with real input events for every interaction listed in brief
  §31, computed styles for themes and breakpoints, and SSR hydration without recoverable errors.
- **FR-122** axe-core checks on the integrated consumer pages (scope documented).
- **FR-123** Packed consumers: Tailwind v4, plain CSS, custom named/nested themes, custom
  breakpoints `extend` and `replace`, SSR + hydration, native forms and overlays.
- **FR-124** Negative controls: broken stylesheet, missing export and removed accessibility
  attribute are detected by the verification scripts.
- **FR-130** Storybook stories for every family, plus Demo A (responsive dashboard) and Demo B
  (advanced form), using the package exports and stylesheet.
- **FR-131** Documentation: `docs/components.md`, package README, contracts, changeset.

## Success criteria

- **SC-001** Every mandatory component exists, is exported, typed and documented (inventory in
  evidence).
- **SC-002** `pnpm check` and `pnpm check:consumer` pass locally; CI passes 5/5 jobs on Linux,
  Windows and macOS.
- **SC-003** Browser interaction suite passes in Chrome on three OSes with zero hydration errors.
- **SC-004** axe reports no violations on the consumer pages in light and dark themes.
- **SC-005** Overlays opened inside a nested named theme compute that theme's token values.
- **SC-006** Custom breakpoints: the shell and Button responsive sizes switch exactly at the
  configured thresholds (1 px below / at) in `extend` and `replace` consumers.
- **SC-007** A consumer importing only `Button` does not bundle Radix or Base UI code.
- **SC-008** Negative controls fail the checks they target.

## Assumptions and risks

- Base UI 1.9 and Radix 2026.10 releases are stable; their internal data attributes are styling
  hooks covered by tests, not public Neshel API.
- Cross-engine layering (Base UI inside Radix overlays) relies on R12; regressions are caught by
  browser tests.
- Phase 004 limitations (brief §37) remain tracked in evidence; Firefox/WebKit are not tested
  unless stated.
