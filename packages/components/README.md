# @neshel-ui/components

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
- Navigation: Navbar, NavigationMenu, DropdownMenu, MobileMenu.
- Shell: AppShell, Sidebar, SidebarTrigger — breakpoint-driven desktop rail and mobile drawer.
- Peers: `react`, `react-dom` (19), `@neshel-ui/config` (types). No Provider, no icon library.

Guide: https://github.com/dannysequeira-dev/neshel-ui/blob/main/docs/components.md

Rooted in faith. Built with hope.
