# ADR 0012 — Headless primitives: Radix for overlays and navigation, Base UI for selection

- Status: **Accepted** (2026-11-08, within the owner's Phase 005 brief); implemented and
  CI-verified in feature 005 (run 42543517738, 5/5 jobs; details in the feature evidence)
- Date: 2026-11-08
- Feature: [005](../../specs/005-components-navigation-shell/spec.md); evaluation in
  [research.md](../../specs/005-components-navigation-shell/research.md) R1, R12, R13

## Context

Phase 005 needs dialogs, sheets, popovers, command menus, navigation menus, tooltips, single and
multiple Select, and single and multiple Combobox. The constitution (IV) forbids inventing complex
interaction patterns, and the brief (§4–§5) authorises Radix, asks to evaluate Base UI for
selection, prefers one coherent selection engine and forbids a custom combobox engine. Radix
offers no multiple Select and no Combobox.

## Decision

1. **Radix Primitives** (`react-dialog`, `react-alert-dialog`, `react-popover`,
   `react-dropdown-menu`, `react-navigation-menu`, `react-tooltip`, and the existing `react-slot`)
   implement Dialog, AlertDialog, Sheet, Popover, DropdownMenu, NavigationMenu and Tooltip.
2. **Base UI** (`@base-ui/react`, imported only from its `select` and `combobox` subpaths)
   implements Select, MultiSelect and Combobox (single and multiple) — one selection engine.
3. **Neshel APIs hide the engines**: Neshel prop types, string values, no re-exported parts,
   event details or data attributes. Radix props are forwarded where the Neshel part is a thin
   styled wrapper (documented per part).
4. **Layering rules** for Base UI inside Radix layers: Base UI popups portal into the Radix
   content element with fixed positioning, and Radix layers ignore Escape that belongs to an open
   selection popup (contract shell-and-overlays.md).
5. Native HTML where it suffices: SidebarSub is a native disclosure; Input, Label, Separator and
   Navbar links need no primitive.

## Consequences

- Two headless dependencies with different styling hooks (`data-state` vs `data-open`/
  `data-starting-style`); the stylesheet covers both, guarded by browser tests.
- Cross-engine behaviour (focus trap, outside press, Escape, scroll lock) depends on R12 and is a
  tracked risk with browser regression tests.
- Dependency footprint: six Radix packages sharing internals with `react-slot`, plus Base UI and
  Floating UI. Tree-shaking keeps them out of bundles that do not use the components (SC-007).

## Alternatives considered

- Radix only: needs a hand-made multiple Select and Combobox — rejected by §5.
- Base UI only: coherent, but contradicts the explicit Radix authorisation for overlays and
  navigation without a demonstrated need; would also replace the `asChild` vocabulary with
  `render` props.
- Downshift / React Aria for selection: a third interaction model next to Radix; React Aria's
  hooks are heavier to theme; not requested by the owner.
