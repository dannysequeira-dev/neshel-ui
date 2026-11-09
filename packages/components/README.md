# @neshel-ui/components

Accessible React components, navigation and a responsive application shell for Neshel-UI.

**Status:** pre-release, **not published to npm**. Implemented in feature 005 and verified from the
packed tarball in external React 19 + Vite apps (with and without Tailwind, custom themes, custom
breakpoints in `extend` and `replace` mode, SSR and hydration) and in headless Chrome with real
keyboard and pointer input plus axe-core.

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
