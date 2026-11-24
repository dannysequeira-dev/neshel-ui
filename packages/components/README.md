# @neshel-ui/components

[![@neshel-ui/components npm version](https://img.shields.io/npm/v/@neshel-ui/components?style=flat-square&logo=npm&label=npm)](https://www.npmjs.com/package/@neshel-ui/components) [![@neshel-ui/components monthly downloads](https://img.shields.io/npm/dm/@neshel-ui/components?style=flat-square&logo=npm&label=downloads%2Fmonth)](https://www.npmjs.com/package/@neshel-ui/components)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?style=flat-square&logo=typescript&logoColor=white) ![React 19](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=0D1B39) [![MIT License](https://img.shields.io/github/license/dannysequeira-dev/neshel-ui?style=flat-square&color=D9B86A)](https://github.com/dannysequeira-dev/neshel-ui/blob/main/LICENSE)

Accessible React components, navigation and a responsive application shell for Neshel-UI.

**Status:** 0.1.0, the first public release (pre-1.0: breaking changes bump the minor version and are called out in the [changelog](./CHANGELOG.md)). Verified from the packed tarball in external applications on Linux, Windows and macOS. Documentation (English and Spanish): https://neshel-ui.vercel.app

```sh
pnpm add @neshel-ui/components @neshel-ui/config react react-dom
```

```css
@import "@neshel-ui/config/tokens.css"; /* or tailwind.css after @import "tailwindcss" */
@import "@neshel-ui/components/styles.css";
```

```tsx
import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
  Select,
} from "@neshel-ui/components";

<Dialog>
  <DialogTrigger asChild>
    <Button>Edit profile</Button>
  </DialogTrigger>
  <DialogContent aria-describedby={undefined}>
    <DialogTitle>Edit profile</DialogTitle>
    <Select aria-label="Country" name="country" options={[{ value: "cr", label: "Costa Rica" }]} />
  </DialogContent>
</Dialog>;
```

- Foundation: Button, Card, Badge, Input, Label, Separator, Skeleton, VisuallyHidden.
- Overlays (Radix): Dialog, AlertDialog, Sheet, Popover, Tooltip — themes survive portals.
- Selection (Base UI): Select, MultiSelect, Combobox (single and multiple) — string values, forms.
- Not in 0.1.0 yet — disclosure and forms (Base UI): Accordion (single/multiple, headings, arrow keys), Collapsible, Switch
  (`role="switch"`, native forms, reset).
- Not in 0.1.0 yet — feedback: `createToaster()` + `<Toaster>` — a framework-free store (no provider), one announcement per toast,
  timers paused on hover/focus/hidden page, F8 and Escape. Nested overlays close one layer per Escape.
- Navigation: Navbar, NavigationMenu, DropdownMenu, MobileMenu.
- Shell: AppShell, Sidebar, SidebarTrigger — breakpoint-driven desktop rail and mobile drawer.
- Peers: `react`, `react-dom` (19), `@neshel-ui/config` (types). No Provider, no icon library.

Guide: https://github.com/dannysequeira-dev/neshel-ui/blob/main/docs/components.md

Rooted in faith. Built with hope.
