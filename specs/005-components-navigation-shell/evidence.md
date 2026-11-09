# Evidence — feature 005

Status vocabulary (feature 001): **implemented**, **verified locally** (named machine),
**verified in GitHub Actions** (named run and commit), **planned**. Nothing here was published;
every package keeps `private: true`; no tag or release was created.

## Inventory (SC-001)

| Family     | Components (all exported from `@neshel-ui/components`)                                                                                                                                                                                                                                                                | Status                |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| Foundation | Button, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, CardAction, Badge, Input, Label, Separator, Skeleton, VisuallyHidden                                                                                                                                                                   | implemented, verified |
| Overlays   | Dialog (+Trigger, Content, Header, Body, Footer, Title, Description, Close), AlertDialog (+Trigger, Content, Header, Footer, Title, Description, Cancel, Action), Sheet (+Trigger, Content, Header, Body, Footer, Title, Description, Close), Popover (+Trigger, Anchor, Content, Close), Tooltip (+Trigger, Content) | implemented, verified |
| Selection  | Select, MultiSelect, Combobox (single and `multiple`)                                                                                                                                                                                                                                                                 | implemented, verified |
| Navigation | Navbar, NavbarBrand, NavbarNav, NavbarLink, NavbarActions, NavigationMenu (+List, Item, Trigger, Content, Link), DropdownMenu (+Trigger, Content, Item, CheckboxItem, RadioGroup, RadioItem, Label, Group, Separator, Shortcut, Sub, SubTrigger, SubContent), MobileMenu (+Trigger, Content, Nav, Link)               | implemented, verified |
| Shell      | AppShell, AppShellMain, AppShellContent, Sidebar, SidebarHeader, SidebarContent, SidebarFooter, SidebarGroup, SidebarItem, SidebarSub, SidebarSeparator, SidebarTrigger, `useAppShell`                                                                                                                                | implemented, verified |
| Errors     | `NeshelComponentsError`                                                                                                                                                                                                                                                                                               | implemented, verified |

## Local verification (2026-11-08/09)

Machine: Windows 11 Home 10.0.26300, PowerShell 7 host with Git Bash, Node 26.13.0, pnpm 12.16.1,
Chrome 156.0.8078.81.

| Gate                                                               | Command                                        | Result                                                                                                                                                                   |
| ------------------------------------------------------------------ | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Doctor, lint, typecheck, unit, build, package tests, exports, pack | `pnpm check`                                   | pass — repository tests 71 passed / 72 (1 skipped, platform-specific); package tests 202/202 (config, cli, layout, typography, components 35); `check:pack` 5/5 packages |
| Component stylesheet drift                                         | `pnpm generate:component-css --check`          | pass (layout, typography, components)                                                                                                                                    |
| External consumers (packed tarballs)                               | `pnpm check:consumer --no-build --artifacts …` | pass — 9 variants: tailwind, plain, configured, configured-extend, configured-replace, components-tailwind/plain/extend/replace                                          |
| Browser computed styles (features 002–004)                         | `pnpm check:browser --consumers …`             | pass — 12 711 assertions                                                                                                                                                 |
| Browser interaction + axe (feature 005)                            | `pnpm check:browser:components --consumers …`  | pass — 132 cases (33 × 4 consumers), twice consecutively after the option-click stabilisation                                                                            |
| Storybook build                                                    | `pnpm build:storybook`                         | pass; screenshots in [visual-verification/](visual-verification/README.md)                                                                                               |

### Browser cases (FR-121, FR-122; each in Tailwind, plain, extend and replace consumers)

hydration (lab and shell, 0 recoverable errors, 0 console errors) · button tokens, default type,
focus-visible ring, loading state · Button responsive size 1 px below / at the configured threshold ·
dialog focus entry, Tab trapping (8 presses), scroll lock, Escape, focus restoration · Select inside
Dialog (popup rendered inside the dialog, option chosen, first Escape closes only the listbox,
second closes the dialog) · nested dialogs (Escape closes the inner one, focus returns to its
trigger) · AlertDialog (initial focus on Cancel, outside press ignored, Escape cancels without the
action, Action runs) · Popover (Escape + focus return, outside press) · Sheet (right edge, Escape,
focus return) · DropdownMenu (Enter opens, first item focused, ArrowDown, Enter runs the command,
focus returns) · NavigationMenu (Enter opens panel, `aria-current`, Escape) · Select keyboard +
typeahead · MultiSelect (`aria-multiselectable`, listbox stays open, chips, removal announced,
focus to next chip) · Combobox single filtering · Combobox multiple chips, empty state, Escape never
clears the selection · native form serialisation of all controls · nested theme through portals
(dialog, selection listbox and popover compute the boundary's `--neshel-surface`) · MobileMenu and
NavbarNav at the threshold, close after navigation, auto-close when the viewport reaches the
breakpoint · reduced motion (dialog and skeleton animations `none`) · shell desktop (256 px sidebar,
56 px rail, `aria-expanded`, labels stay accessible names, content not overlapped, rail tooltip on
focus) · shell boundary sweep (mobile at threshold − 1 px, desktop at threshold) · shell mobile
drawer (inline aside hidden, single copy of links, focus into drawer, close on navigation with
focus back to the trigger, Escape, auto-close on resize to desktop) · axe-core 4.14.0 with zero
violations: lab, open dialog, shell and rail, in light and dark (`system` + emulated scheme) ·
negative controls (axe reports an unnamed button; removing the components CSS breaks the shell).

Thresholds exercised: default consumers `lg` 64rem (shell) / `md` 48rem (button); extend
consumer `tablet` 52rem / `phone` 30rem with a named `sepia` theme; replace consumer `desktop`
60rem / `tablet` 45rem, generated stylesheet instead of the package stylesheet, `sepia` theme.

### Defects found by the browser suite and fixed

1. Modal layers opened without a Radix trigger (mobile sidebar drawer) left focus on `body` after
   closing → `useFocusReturn` restores the trigger or the opener.
2. Base UI Combobox cleared the whole selection on Escape when the popup was closed → prevented
   (research R16, documented).
3. Reduced-motion overrides lost to `[data-state]` animation selectors → selectors aligned.
4. A Button-only bundle evaluated the whole style table (57 KiB) → side-effect-free
   `style-constants.ts` (25 KiB, no Radix/Base UI code).
5. Option clicks during the popup opening transition were flaky on slower machines → the suite
   waits for the popup to settle.

### Key measurements

- `@neshel-ui/components/styles.css`: 43 433 bytes raw, ~5.5 KiB gzip (budget 64 KiB / 10 KiB).
- Packed tarball: 125 files, 112.5 KiB.
- Tree-shaking (SC-007, Vite 8, minified, React external): Button-only bundle 25 073 bytes with no
  Radix / Base UI / Floating UI markers; full library 448 820 bytes (positive marker control: all
  five markers present).
- Consumer CSS (built): Tailwind 50 KB, plain 43 KB, extend 63 KB (package + generated), replace
  47 KB (generated only).
- Runtime dependencies: `@base-ui/react` 1.9.0, `@radix-ui/react-dialog` 1.3.1, `-alert-dialog`
  1.2.1, `-popover` 1.3.1, `-dropdown-menu` 2.2.1, `-navigation-menu` 1.4.1, `-tooltip` 1.4.1,
  `-slot` 1.5.0, `tailwind-variants` 3.3.1. Dev: `axe-core` 4.14.0.

## GitHub Actions

| Run         | Commit    | Result                                                                                                                                                                      |
| ----------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 42537947736 | `1e69f42` | failure — Typecheck (components needed the config source mapping before the build)                                                                                          |
| 42539109031 | `16da027` | failure — Windows and macOS pass; Linux × 3 fail the components browser step; cause: option clicks during the popup transition (fixed in `55a3ed1`)                         |
| 42542011929 | `53e2549` | failure — Lint (unformatted traceability table)                                                                                                                             |
| 42543517738 | `55a3ed1` | **success — 5/5 jobs** (Node 26 on Linux, Windows, macOS; Node 22 and 24 on Linux), including `check:consumer` (9 variants), `check:browser` and `check:browser:components` |

## Phase 004 limitations (brief §37) — status

| Limitation                                                          | Status in 005                                                                                    |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Unknown well-formed breakpoints warn instead of throwing            | unchanged; components use the same rule (an unknown shell breakpoint warns and stays mobile)     |
| Incomplete Flex runtime validation for some custom directions       | unchanged (layout untouched)                                                                     |
| Approximate trimming when metrics differ from the loaded font       | unchanged                                                                                        |
| Custom-breakpoint consumers must import the generated CSS correctly | unchanged; documented for components (generated after or instead of package stylesheets), tested |
| Browser verification mainly on Chrome                               | unchanged — feature 005 interaction tests are Chrome-only                                        |
| Layout CSS close to its size budget                                 | unchanged (layout CSS not modified)                                                              |

## Accepted limitations and risks (feature 005)

- Chrome only: Firefox and WebKit were **not** tested; no screen-reader testing was performed.
  axe-core finds a subset of WCAG issues.
- Cross-engine layering (Base UI inside Radix) relies on R12; covered for Select in Dialog and
  themed dialogs, not for every combination (e.g. Combobox inside Popover is untested).
- Before hydration the SidebarTrigger assumes desktop state for `aria-expanded`; layout is correct
  from the first paint because CSS decides it.
- Sidebar children remount when moving between the inline aside and the mobile drawer.
- Portals copy `data-neshel-theme` only; inline custom-property overrides need `container`.
- Rail tooltips repeat the item name as a description while open.
- Browser floor: `color-mix()` (2023) and `light-dark()` (2024) for the overlay backdrop; older
  browsers get a transparent backdrop.
- Base UI keeps a Select popup mounted (hidden) after its first opening; tests and styles account
  for it.
- The `@neshel-ui` npm scope remains unverified; nothing is published.
