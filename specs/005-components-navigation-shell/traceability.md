# Traceability — feature 005

Requirement → implementation → verification. Evidence details: [evidence.md](evidence.md).
"Browser" = `scripts/lib/components-browser.mjs` case run by `pnpm check:browser:components` in the
four packed consumers; "unit" = `packages/components/test/*.test.mjs` (jsdom, built dist).

| Requirement | Implementation                                                               | Verification                                                                                             |
| ----------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| FR-001      | `packages/components/package.json`, `src/index.ts` (flat exports)            | `check:pack` components contract; consumers' Node resolution (deep import blocked)                       |
| FR-002      | dependencies/peers in `package.json`                                         | `check:pack` exact dependency/peer/import checks + negative test; prerender leak check                   |
| FR-003      | `src/style-tables.ts` → `styles.css`                                         | unit `styles.test.mjs` (hygiene + negatives, collisions); `check:pack` stylesheet hygiene                |
| FR-004      | `src/internal/responsive.ts`, responsive tables, CLI schema 2                | unit Button responsive; browser `button-responsive-size`, `shell-boundary-sweep` (extend/replace)        |
| FR-005      | Radix Slot in Button/Card/Navbar/Sidebar/MobileMenu; `internal/slot.ts`      | unit asChild tests (link rendering, handler order, refs, errors)                                         |
| FR-006      | `NeshelComponentsError`, `internal/validate.ts`                              | unit error cases (variants, as/asChild, options, breakpoints)                                            |
| FR-007      | `"use client"` modules; mode read after mount (`internal/css-mode.ts`)       | unit SSR markup; browser `hydration-lab`, `hydration-shell` (0 recoverable errors, 0 console errors)     |
| FR-008      | local contexts only (AppShell, MobileMenu, layer registry)                   | consumers render without any Provider                                                                    |
| FR-009      | icon slots; `devWarnOnce` for `iconOnly`                                     | stories; axe `button-name` on every page                                                                 |
| FR-010–012  | `src/button.tsx`                                                             | unit Button tests (type, variants, disabled, loading, asChild errors); browser `button-tokens-and-focus` |
| FR-020      | `src/card.tsx`                                                               | unit Card family test                                                                                    |
| FR-025      | `Badge` in `src/primitives.tsx`                                              | unit Badge test; axe contrast                                                                            |
| FR-026      | `packages/config/src/contract.ts`, regenerated stylesheets                   | config contract test; CLI built-in contrast pins; goldens                                                |
| FR-030      | `Input` in `src/primitives.tsx`                                              | unit Input tests (attributes, aria-invalid, FormData); browser `form-serialisation`                      |
| FR-035      | `Separator`                                                                  | unit Separator test                                                                                      |
| FR-038      | `Skeleton`                                                                   | unit Skeleton test; browser `reduced-motion`                                                             |
| FR-040      | `Label`, `VisuallyHidden`, `Tooltip` (`src/popover.tsx`)                     | unit; browser `shell-desktop-rail` (tooltip on focus)                                                    |
| FR-050      | `src/dialog.tsx`                                                             | unit Dialog open/Escape/controlled; browser `dialog-focus-trap-escape-restore`, `nested-dialog`          |
| FR-055      | `src/alert-dialog.tsx`                                                       | unit AlertDialog; browser `alert-dialog` (initial focus, no outside dismissal, Escape cancels)           |
| FR-058      | `Sheet*` in `src/dialog.tsx`                                                 | unit sides; browser `sheet`                                                                              |
| FR-060      | `Popover*` in `src/popover.tsx`                                              | browser `popover` (Escape, focus return, outside press)                                                  |
| FR-062      | `internal/layer.tsx` (`PortalTheme`, `useLivePortalTheme`)                   | unit theme wrapper; browser `theme-through-portals` (dialog, listbox, popover computed tokens)           |
| FR-063      | `LayerContainerContext`, `guardEscape`, `positionMethod="fixed"`             | browser `select-inside-dialog-layering`                                                                  |
| FR-070      | `Select` in `src/select.tsx`                                                 | unit SSR/labelling/FormData; browser `select-keyboard-typeahead`                                         |
| FR-075      | `MultiSelect`                                                                | unit chips/removal/focus/announcement; browser `multiselect-select-and-remove`                           |
| FR-080      | `src/combobox.tsx`                                                           | unit label cache + FormData; browser `combobox-single-filter`, `combobox-multiple-chips-empty`           |
| FR-090      | `src/navbar.tsx`                                                             | unit Navbar markup; browser `mobile-menu-breakpoint-and-navigation` (hideBelow)                          |
| FR-093      | `NavigationMenu*` in `src/menus.tsx`                                         | unit SSR; browser `navigation-menu`                                                                      |
| FR-096      | `DropdownMenu*` in `src/menus.tsx`                                           | unit keyboard open; browser `dropdown-menu-keyboard`                                                     |
| FR-098      | `src/mobile-menu.tsx`                                                        | unit link closes; browser `mobile-menu-breakpoint-and-navigation`                                        |
| FR-100      | `AppShell` in `src/app-shell.tsx`                                            | unit SSR + controlled/uncontrolled; browser `shell-boundary-sweep`                                       |
| FR-105      | `Sidebar*`                                                                   | unit; browser `shell-desktop-rail`                                                                       |
| FR-106      | mobile sheet host in `Sidebar`                                               | browser `shell-mobile-drawer` (single copy, focus, navigation close, resize close)                       |
| FR-110      | `SidebarTrigger`, `useAppShell`                                              | unit aria-expanded/aria-controls; browser rail/drawer cases                                              |
| FR-120      | `packages/components/test/`                                                  | `pnpm test:packages`                                                                                     |
| FR-121      | `scripts/lib/components-browser.mjs`, `scripts/check-components-browser.mjs` | `pnpm check:browser:components` (local + CI)                                                             |
| FR-122      | axe-core cases in the suite                                                  | `axe-lab/dialog/shell/shell-rail-{light,dark}` × 4 consumers                                             |
| FR-123      | `scripts/lib/consumer-components.mjs`                                        | `pnpm check:consumer` (components-tailwind/plain/extend/replace)                                         |
| FR-124      | negative tests                                                               | unit stylesheet negatives; `tests/pack-checks.test.mjs`; browser `negative-*` cases                      |
| FR-130      | `apps/storybook/src/components/*.stories.tsx`                                | `pnpm build:storybook`; screenshots (evidence)                                                           |
| FR-131      | `docs/components.md`, README, docs updates, changeset                        | review                                                                                                   |
| SC-001      | inventory                                                                    | evidence §Inventory                                                                                      |
| SC-002      | —                                                                            | evidence §Local gates, §CI                                                                               |
| SC-003      | —                                                                            | evidence §Browser                                                                                        |
| SC-004      | —                                                                            | axe cases (no violations)                                                                                |
| SC-005      | —                                                                            | browser `theme-through-portals` (dark and sepia boundaries)                                              |
| SC-006      | —                                                                            | browser `button-responsive-size`, `shell-boundary-sweep` in extend/replace                               |
| SC-007      | `style-constants.ts`                                                         | `components-plain` tree-shaking check with positive marker control                                       |
| SC-008      | —                                                                            | negative controls listed under FR-124                                                                    |
