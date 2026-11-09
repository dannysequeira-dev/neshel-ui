---
"@neshel-ui/components": minor
"@neshel-ui/config": minor
"@neshel-ui/cli": minor
"@neshel-ui/layout": patch
"@neshel-ui/typography": patch
---

Component library, navigation and application shell (feature 005).

`@neshel-ui/components` (first implementation):

- Foundation: `Button` (variants, responsive `size`, `iconOnly`, `fullWidth`, `loading`, `asChild`),
  `Card` family, `Badge`, `Input` (`uiSize`, `invalid`), `Label`, `Separator`, `Skeleton`,
  `VisuallyHidden`.
- Overlays on Radix: `Dialog`, `AlertDialog`, `Sheet` (left/right/top/bottom), `Popover`,
  `Tooltip`; portals copy the trigger's `data-neshel-theme`; focus returns to the opener.
- Selection on Base UI: `Select`, `MultiSelect` (chips, clear-all, announcements) and `Combobox`
  (single or `multiple`, local or external filtering); string values and native form serialisation.
- Navigation: `Navbar` family, `NavigationMenu`, `DropdownMenu`, `MobileMenu`.
- Shell: `AppShell`, `Sidebar` family (icon rail, offcanvas, mobile drawer), `SidebarTrigger`,
  `useAppShell`; the desktop/mobile threshold is a configurable breakpoint decided by CSS.
- Precompiled `styles.css` (no Tailwind or `@source` required) and a schema-2
  `./style-manifest.json`. Runtime dependencies: Radix primitives, `@base-ui/react`,
  `@radix-ui/react-slot`, `tailwind-variants`. Peers: `react`, `react-dom`, `@neshel-ui/config`.

`@neshel-ui/config`: colour roles `success`, `successForeground`, `warning`, `warningForeground`
(25 roles, two new contrast pairs, Tailwind colours); existing configurations stay valid.

`@neshel-ui/cli`: reads style manifest schemas 1 and 2 (keyframes, media-wrapped rules) and
generates the components stylesheet for configured breakpoints.

`@neshel-ui/layout`, `@neshel-ui/typography`: documentation comment of the shared breakpoint
module only (no behaviour change).
