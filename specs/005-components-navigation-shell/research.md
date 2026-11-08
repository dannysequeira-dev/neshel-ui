# Research — feature 005

Decisions R1–R20 answer the open questions of the brief. Each lists the decision, the rationale
and the rejected alternatives. Measurements are recorded in [evidence.md](evidence.md).

## Inputs inspected (2026-11-08)

Registry versions: `@base-ui/react` 1.9.0 (2026-10-09; one package, subpath exports per part,
`sideEffects: false`, dependencies `@floating-ui/react-dom`, `@base-ui/utils`,
`use-sync-external-store`, `@babel/runtime`), Radix `react-dialog` 1.3.1, `react-alert-dialog`
1.2.1, `react-popover` 1.3.1, `react-dropdown-menu` 2.2.1, `react-navigation-menu` 1.4.1,
`react-tooltip` 1.4.1 (2026-10-14; each `sideEffects: false`, sharing `@radix-ui/react-*`
internals with the already-used `react-slot`), `axe-core` 4.14.0 (2026-10-05).

Base UI `Select.Root` supports `multiple`, groups, `items` for label lookup, `name`/`form`/
`required`, `modal`, controlled `open`/`value`. `Combobox.Root` supports single and `multiple`
selection, `items`/`filteredItems`, `filter` (or `null` for external filtering), controlled
`inputValue`, chips (`Chips`, `Chip`, `ChipRemove`), `Clear`, `Empty`, `Status`, `name`,
`required`, `limit`. Radix has no multiple Select and no Combobox.

## Decisions

### R1 — Headless engines (ADR 0012)

| Criterion                   | Radix only                     | Base UI only                   | Radix overlays + Base UI selection (chosen) |
| --------------------------- | ------------------------------ | ------------------------------ | ------------------------------------------- |
| Multiple Select / Combobox  | missing (custom engine needed) | yes                            | yes (Base UI)                               |
| Dialog / menu / nav maturity | high, owner-authorised         | high                           | high (Radix)                                |
| One selection engine        | n/a                            | yes                            | yes                                         |
| Cross-engine layering risk  | none                           | none                           | Escape, outside press, focus trap (R12)     |
| Owner preference (§4, §5)   | partial                        | deviates from §4               | matches the preferred candidate             |
| `asChild` continuity        | native                         | `render` prop (adapter needed) | native for overlays; adapter not exposed    |

Decision: Radix for Dialog, AlertDialog, Sheet (dialog), Popover, DropdownMenu, NavigationMenu
and Tooltip; Base UI for Select, MultiSelect and Combobox. Rationale: it is the owner's preferred
architecture, Radix keeps the accepted `asChild` vocabulary for every trigger, and Base UI is the
only mature engine that covers single and multiple Select and Combobox coherently. The layering
risk is contained by R12 and verified in a browser. Rejected: a custom combobox engine (forbidden
by §5); Radix Select plus a hand-made MultiSelect (two engines for related controls); Base UI for
everything (contradicts the explicit Radix authorisation for overlays and navigation without a
demonstrated need). Radix Collapsible was not needed: SidebarSub is a native disclosure
(`button[aria-expanded]` + list), simpler than a dependency.

### R2 — Package shape and tree-shaking

One `.` entry with flat named exports compiled module-per-file by `tsc`; `sideEffects` lists only
CSS, so bundlers drop unused modules and their Radix/Base UI imports. Per-component subpath
exports were evaluated and rejected for 005: they multiply `exports`, declarations and pack checks
without a measured benefit; SC-007 measures tree-shaking instead. Base UI is imported only from
its subpaths (`@base-ui/react/select`, `/combobox`), never from the root barrel.

### R3 — Flat names, no dot notation

`AppShellMain`, `NavbarBrand`, `SidebarHeader`… instead of `AppShell.Main`. Dotted access on a
`"use client"` module reference throws in React Server Components ("cannot dot into a client
module"), and static properties keep the whole family alive in bundles. The brief marks names as
non-mandatory.

### R4 — No `Modal` / `Drawer` aliases

Aliases duplicate documentation and types without behaviour; `Dialog` and `Sheet` are the
canonical names and the docs mention "modal" and "drawer" as synonyms. Can be added later without
breaking changes.

### R5 — Button loading

`loading` → `aria-disabled="true"`, `data-loading=""`, `onClick` not called and the default
action (form submission) prevented in the click handler, spinner `aria-hidden`, label kept in the
accessibility tree (opacity, not `visibility`) so the width and name stay stable. Not `disabled`:
a disabled button loses focus mid-interaction. Consumers announce progress with their own live
region (documented). With `asChild`, `loading` and `disabled` throw (FR-012).

### R6 — Success and warning roles (ADR 0013)

Badge variants `success` and `warning` need semantic pairs that do not exist in the 21-role
contract. Four roles are added to `@neshel-ui/config` with WCAG 4.5:1 pairs in light and dark;
theme inputs are `Partial<ThemeColors>`, so existing configurations stay valid. Rejected: mapping
"success" to `accent` (gold is the brand accent, not a status) or hard-coded colours
(constitution III).

### R7 — Style pipeline (ADR 0013)

The components package reuses ADR 0008/0010: TypeScript style tables → style manifest → the CLI's
shared renderer → committed `src/styles.css`; `neshel generate` renders it again for configured
breakpoints. Components need `@keyframes`, `prefers-reduced-motion` blocks and state selectors, so
the manifest schema gains version 2 (`rules[].media`, `keyframes`). The CLI reads schema 1 and 2;
Layout and Typography keep schema 1 unchanged. An older CLI rejects schema 2 with exit 5
(`incompatible-manifest`), never rendering it partially.

### R8 — Responsive props in components

Only Button `size` and the breakpoint selectors of AppShell, NavbarNav (`hideBelow`) and
MobileMenu (`breakpoint`) are responsive; other variants stay static (brief §26). The same grammar
and browser warning as Layout/Typography (byte-identical `breakpoint-check.ts`, drift test).

### R9 — Shell mode from CSS (ADR 0014)

The desktop/mobile switch is a responsive class `neshel-<bp>-shell-desktop` on the shell root.
Its rule sets layout custom properties and `--neshel-shell-mode: desktop` (base: `mobile`). After
hydration the shell reads the computed custom property and re-reads it on `resize`; the media
query in CSS is the only threshold, so CSS and JavaScript cannot disagree and the browser never
needs `neshel.config.ts`. Server render and first client render do not depend on the mode. The
same mechanism serves MobileMenu (`--neshel-menu-mode`). Rejected: `matchMedia` with widths in
JavaScript (needs the configured thresholds at runtime; ADR 0010 rejected a runtime registry);
CSS-only drawers (no focus management).

### R10 — Single instance of sidebar content

Desktop: children render in the inline `<aside>`. Mobile and open: children render in a Radix
dialog sheet; the inline `<aside>` is empty and `display: none`. Navigation content is therefore
never present twice. Children remount when moving between the two hosts (documented).

### R11 — Theme inheritance through portals

Overlay roots record their trigger element (composed ref). When content renders, the nearest
`[data-neshel-theme]` ancestor of the trigger — or of `document.activeElement` when no trigger is
known — provides the theme name, copied to `data-neshel-theme` on a `display: contents` wrapper
inside the portal. Theme selectors match attribute values, so the wrapper computes the same tokens
as the boundary; custom properties inherit through `display: contents`. `container` replaces the
portal target for inline custom-property overrides. Rejected: portalling into the theme boundary
(overflow, transforms and stacking contexts of arbitrary application elements).

### R12 — Base UI popups inside Radix layers

Radix content components provide their DOM node through a context; Base UI portals use it as
`container` and `positionMethod="fixed"`, so popups are inside the Radix layer's DOM (focus trap,
outside-press and scroll-lock boundaries include them) without overflow clipping. Radix
`onEscapeKeyDown` ignores Escape when the event target is inside an open Neshel selection popup or
is an expanded combobox, so Escape closes only the innermost layer.

### R13 — Selection components hide Base UI

Public props are Neshel types (`SelectOption`, `SelectOptionGroup`, `ComboboxItem`); Base UI
parts, event details and data attributes are not exported. Change handlers receive plain values.

### R14 — String values

`string | null` (single) and `string[]` (multiple): what forms serialise and what router/query
code stores. Labels come from options; multiple Combobox caches labels of selected values so chips
keep their text when external filtering removes the item.

### R15 — MultiSelect structure

Trigger (Base UI `Select` with `multiple`, listbox stays open while selecting) shows a summary;
chips with remove buttons and a clear-all button are siblings of the trigger, never inside it
(no nested interactive content). Removal announces "<label> removed" in a polite live region and
moves focus to the next chip or to the trigger.

### R16 — Combobox modes

`multiple` switches types and behaviour; chips sit with the input inside `Combobox.Chips`
(an input group, not a button). Free-text entry is out of scope: the value is always one of the
items; documentation points to `<Input list>` for free text.

### R17 — Navigation semantics

Navbar/NavbarNav and Sidebar use links in lists inside `<nav>`; NavigationMenu (Radix) for link
panels; DropdownMenu (Radix menu) only for commands. Active links use `aria-current="page"`.

### R18 — Sidebar rail tooltips

In the collapsed rail, labels are visually hidden but remain the accessible name; a Radix Tooltip
shows the label on hover and focus. The tooltip duplicates the name as a description while open;
accepted and documented.

### R19 — Browser test harness

Interaction tests use the existing CDP client with `Input.dispatchKeyEvent` and
`Input.dispatchMouseEvent` (trusted events) against packed consumer builds, plus axe-core injected
from the workspace. Firefox and WebKit are not covered by this harness (no browser downloads in
CI); not claimed.

### R20 — "use client" and SSR

Modules that use hooks, context or Radix/Base UI start with `"use client"` (preserved by `tsc`);
presentational modules (Button, Card, Badge, Input, Separator, Skeleton, Label, VisuallyHidden)
do not need it. SSR rendering is verified with `renderToString` in unit tests and prerendered
consumer pages hydrated in Chrome.
