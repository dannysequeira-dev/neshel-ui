# Contract — application shell, mobile navigation, overlays and portals

## Shell layout (CSS)

```text
.neshel-app-shell            display:grid; grid-template-columns: minmax(0,1fr)    (mobile)
  --neshel-shell-mode: mobile; --neshel-shell-sidebar-display: none
.neshel-<bp>-shell-desktop   grid-template-columns: auto minmax(0,1fr)            (desktop)
  --neshel-shell-mode: desktop; --neshel-shell-sidebar-display: flex
.neshel-app-shell > .neshel-sidebar   display: var(--neshel-shell-sidebar-display)
.neshel-sidebar                        position: sticky; top: 0; block-size: 100dvh; overflow-y: auto
.neshel-sidebar[data-collapsed][data-collapsible="icon"]       inline-size: var(--neshel-sidebar-rail-width)
.neshel-sidebar[data-collapsed][data-collapsible="offcanvas"]  display: none
```

`breakpoint="base"` makes the shell always desktop. Unknown breakpoint names warn in the browser
(ADR 0010) and leave the shell in mobile mode.

## Shell state

| State        | Owner    | Values                         | Default | Source of change                                    |
| ------------ | -------- | ------------------------------ | ------- | --------------------------------------------------- |
| `mode`       | AppShell | `undefined` (SSR, before mount), `"desktop"`, `"mobile"` | — | computed `--neshel-shell-mode`, re-read on `resize` |
| `collapsed`  | AppShell | boolean, controlled/uncontrolled | false | SidebarTrigger (desktop), `useAppShell().setCollapsed` |
| `mobileOpen` | AppShell | boolean, controlled/uncontrolled | false | SidebarTrigger (mobile), Escape, overlay press, link activation, mode → desktop |

- Markup on the server and on the first client render does not depend on `mode`; the trigger's
  `aria-expanded` uses `!collapsed` until the mode is known.
- When `mode` becomes `"desktop"` while `mobileOpen` is true, the shell requests
  `onMobileOpenChange(false)`.
- Persistence: applications persist `collapsed` themselves (e.g. a cookie read on the server and
  passed as `defaultCollapsed`); the library never reads storage during render.

## Sidebar rendering

| Context                    | Inline `<aside>`                         | Sheet (Radix dialog, side left)           |
| -------------------------- | ---------------------------------------- | ----------------------------------------- |
| No AppShell                | children, expanded unless `collapsed`    | —                                         |
| `mode` undefined / desktop | children; `data-collapsed` per state     | —                                         |
| `mode` mobile, closed      | empty, hidden by CSS                     | —                                         |
| `mode` mobile, open        | empty, hidden by CSS                     | children; title = `mobileTitle` (hidden)  |

Activating a link (`a[href]`, primary button, no modifier keys, not prevented) inside the sheet
closes it. Focus moves into the sheet on open and returns to the trigger on close.

## SidebarTrigger

`<button type="button" aria-controls={sidebarId|sheetId} aria-expanded={desktop ? !collapsed :
mobileOpen} data-mode>`; click toggles the state of the current mode. Accessible name from `label`
(visually hidden text) unless children provide one.

## MobileMenu

Responsive class `neshel-<bp>-menu-desktop` on the trigger sets `display: none` and
`--neshel-menu-mode: desktop` at and above `breakpoint`; the menu closes when the mode becomes
desktop. Content renders in a sheet only while open; links close it after activation.
`NavbarNav hideBelow` uses the complementary class so desktop links and the mobile menu are never
visible together.

## Overlay layering

- Every Neshel overlay content (Dialog, AlertDialog, Sheet, Popover, DropdownMenu, NavigationMenu
  panels inline, Tooltip, Select/MultiSelect/Combobox popups) renders through a portal into
  `container ?? document.body`, wrapped in `<div data-neshel-portal style="display:contents"
  data-neshel-theme={theme}>` when a theme boundary exists.
- `theme` = `closest("[data-neshel-theme]")` of the trigger element registered by the root, else
  of `document.activeElement` captured when the content mounts; none → no attribute (inherits the
  document).
- Radix content components (Dialog, AlertDialog, Sheet, Popover) publish their content element as
  the selection portal container; Base UI positioners use `positionMethod="fixed"` there.
- Escape: a Radix layer ignores Escape whose target is inside `[data-neshel-selection-popup]` or is
  `[role="combobox"][aria-expanded="true"]`; the selection control closes itself.
- z-index: overlays `var(--neshel-z-overlay, 50)`, popovers/menus/selection/tooltip
  `var(--neshel-z-popover, 60)`.
