# @neshel-ui/components

## 0.1.0

### Minor Changes

- 452c3b2: Component library, navigation and application shell (feature 005).

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
- df96f64: Release-candidate hardening (feature 006).

  `@neshel-ui/components`:

  - The modal backdrop now dims in browsers without CSS `light-dark()`: a feature-query fallback uses
    the foreground in light contexts and the background for the dark theme and for `system` under a
    dark preference. Named dark themes in those browsers can set `--neshel-overlay-backdrop`.
  - Select, MultiSelect and Combobox listboxes get an accessible name from their control (its
    `aria-labelledby`, `aria-label` or `<label>` text).
  - JSDoc for previously undocumented props (defaults now visible in editors);
    `MobileMenuContentProps.side` documents its `"left"` default.

  `@neshel-ui/cli`: style manifests (schema 2) accept an optional `supports` condition, rendered as
  `@supports` (nested with `media` when both are present).

  All packages: release metadata (keywords, homepage, bugs, repository directory, author) and README
  updates.

### Patch Changes

- Updated dependencies [452c3b2]
- Updated dependencies [8994aee]
- Updated dependencies [df96f64]
- Updated dependencies [e8a5ca3]
  - @neshel-ui/config@0.1.0
