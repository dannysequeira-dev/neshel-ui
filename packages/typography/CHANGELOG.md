# @neshel-ui/typography

## 0.1.0

### Minor Changes

- e8a5ca3: Typography system and custom responsive breakpoints (feature 004).

  `@neshel-ui/typography` (new): `Heading`, `Text`, `Paragraph` and `Caption` with semantic elements
  independent of visual size, static and responsive `size`, `weight`, `align` and `leading`,
  contrast-paired tones, `measure`, `wrap`, `truncate`, `as`/`asChild`, React 19 refs and
  `NeshelTypographyError`. Capsize trimming driven by font metric tokens and cap-height-normalised
  sizes. Precompiled `styles.css`; no Tailwind or `@source` needed.

  Custom breakpoints:

  - `@neshel-ui/config`: `breakpoints` (`extend`/`replace`, `tailwind`) and `types` options,
    `BreakpointRegistry`/`BreakpointName` types, `defaults.breakpoints`; Capsize-format font metrics,
    `typography.fallbacks`, default Inter metrics and font metric tokens in `tokens.css`/`tailwind.css`.
  - `@neshel-ui/cli`: breakpoint and font-metric validation; `neshel generate` writes complete layout
    and typography stylesheets for the configured breakpoints, Tailwind `@theme` breakpoints, Capsize
    fallback `@font-face` rules and a TypeScript declarations file (`--types`); `--check` covers every
    output. New runtime dependency `@capsizecss/core`.
  - `@neshel-ui/layout`: responsive props accept the configured names. **Changed (pre-1.0):**
    alignment classes are now custom-property classes (`neshel-md-align-x-center`; `ai`/`jc`/`ji`
    classes removed), each written breakpoint key emits one class, Center and Container no longer
    emit default classes, and an unknown well-formed breakpoint key logs a browser warning instead
    of throwing (malformed keys still throw). Computed styles are unchanged. New peer dependency
    `@neshel-ui/config` (types only) and a `./style-manifest.json` export used by the CLI.

### Patch Changes

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
- Updated dependencies [452c3b2]
- Updated dependencies [8994aee]
- Updated dependencies [df96f64]
- Updated dependencies [e8a5ca3]
  - @neshel-ui/config@0.1.0
