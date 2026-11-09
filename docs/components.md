# Components guide

`@neshel-ui/components` (feature 005; unpublished, `private: true`) provides accessible React
components for dashboards, back offices and forms: foundation controls, overlays, selection
controls, navigation and a responsive application shell. Contracts:
[components-api](../specs/005-components-navigation-shell/contracts/components-api.md),
[components-css](../specs/005-components-navigation-shell/contracts/components-css.md),
[shell-and-overlays](../specs/005-components-navigation-shell/contracts/shell-and-overlays.md);
decisions: ADR [0012](decisions/0012-headless-primitives.md),
[0013](decisions/0013-components-styling-and-tokens.md),
[0014](decisions/0014-app-shell-responsive-navigation-and-portals.md).

## Installation and styles

Peers: `react` and `react-dom` 19, `@neshel-ui/config` (types). Import one config stylesheet and
the components stylesheet; no Tailwind, `@source` or Provider is required.

```css
/* with Tailwind v4 */
@import "tailwindcss";
@import "@neshel-ui/config/tailwind.css";
@import "@neshel-ui/components/styles.css";

/* without Tailwind */
@import "@neshel-ui/config/tokens.css";
@import "@neshel-ui/components/styles.css";
```

With custom breakpoints (`neshel generate`), import the generated stylesheet **after** the package
stylesheets (or instead of them); it contains the components rules for your breakpoints.

## Inventory

| Family     | Components                                                                                                                     | Engine         |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------ | -------------- |
| Foundation | Button, Card (+ Header, Title, Description, Content, Footer, Action), Badge, Input, Label, Separator, Skeleton, VisuallyHidden | native HTML    |
| Overlays   | Dialog, AlertDialog, Sheet (drawer), Popover, Tooltip                                                                          | Radix          |
| Selection  | Select, MultiSelect, Combobox (single and `multiple`)                                                                          | Base UI        |
| Navigation | Navbar (+ Brand, Nav, Link, Actions), NavigationMenu, DropdownMenu, MobileMenu                                                 | native + Radix |
| Shell      | AppShell (+ Main, Content), Sidebar (+ Header, Content, Footer, Group, Item, Sub, Separator), SidebarTrigger, `useAppShell`    | native + Radix |

Names are flat (`AppShellMain`, `NavbarBrand`): dotted access on client modules fails in React
Server Components. "Modal" and "Drawer" are `Dialog` and `Sheet`.

## Composition rules

- `asChild` renders your element (links, router links) with the component's styles and behaviour;
  exactly one element child; class names join, styles merge, handlers compose (child first), refs
  compose. `as` + `asChild` throws `NeshelComponentsError`.
- Invalid usage throws during render on server and client (e.g. `<Button asChild disabled>`:
  links cannot be disabled).
- Icons are your own React nodes. Icon-only buttons need `aria-label` (development warning).

```tsx
<Button variant="primary" size={{ base: "sm", tablet: "md" }}>Save</Button>
<Button asChild variant="ghost"><Link href="/docs">Documentation</Link></Button>
<Button type="submit" loading={saving}>Save</Button>
```

`loading` keeps focus (`aria-disabled`), ignores clicks and form submission and shows a decorative
spinner; announce progress yourself (e.g. a polite live region).

## Forms

`Input` is a native input (`uiSize` for styling; the native numeric `size` keeps its meaning;
`invalid` sets `aria-invalid`). Selection controls take string values and serialise with `name`:

```tsx
<Label htmlFor="country">Country</Label>
<Select id="country" name="country" options={countries} placeholder="Select a country" />
<MultiSelect id="langs" name="languages" options={languageGroups} />
<Combobox id="city" name="city" items={cities} />
<Combobox id="tech" name="tech" multiple items={technologies} value={tech} onValueChange={setTech} />
```

- Options: `{ value, label, disabled? }`, groups `{ label, options }` (Select) or
  `{ label, items }` (Combobox).
- MultiSelect chips sit beside the trigger (no interactive content inside a button); removals are
  announced and focus moves to the next chip.
- Combobox values are always one of the items. For free text use `<Input list="…">`. For server
  search pass `filter={null}`, update `items` from `onInputValueChange` and set `loading`; selected
  chips keep their labels when results change.
- Escape closes a selection popup and never clears the value (clear button or Backspace on chips).
- Describe errors with `aria-describedby`; `invalid` marks the control.

## Overlays and themes

```tsx
<Dialog>
  <DialogTrigger asChild>
    <Button>Edit profile</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Edit profile</DialogTitle>
      <DialogDescription>Update your account information.</DialogDescription>
    </DialogHeader>
    …
    <DialogFooter>
      <DialogClose asChild>
        <Button variant="outline">Cancel</Button>
      </DialogClose>
    </DialogFooter>
  </DialogContent>
</Dialog>;
```

- Every dialog needs a `DialogTitle` (Radix reports a missing one); pass
  `aria-describedby={undefined}` when there is no description.
- Focus moves in, is trapped, and returns to the trigger (or to the element that opened a
  controlled dialog). Escape closes the innermost layer; a selection popup inside a dialog closes
  first.
- AlertDialog never closes on outside press; Cancel receives focus; Escape cancels.
- **Portals keep nested themes**: content copies the nearest `data-neshel-theme` of its trigger.
  For inline custom-property overrides on arbitrary elements, pass `container` to render the
  portal inside that element.

## Navigation and application shell

```tsx
<AppShell breakpoint="tablet" defaultCollapsed={collapsedFromCookie} onCollapsedChange={save}>
  <Sidebar collapsible="icon">
    <SidebarHeader>
      <Brand />
    </SidebarHeader>
    <SidebarContent>
      <SidebarGroup label="Workspace">
        <SidebarItem asChild active icon={<HomeIcon />}>
          <Link href="/">Dashboard</Link>
        </SidebarItem>
      </SidebarGroup>
    </SidebarContent>
    <SidebarFooter>
      <AccountMenu />
    </SidebarFooter>
  </Sidebar>
  <AppShellMain>
    <Navbar>
      <SidebarTrigger />
      <NavbarBrand>My application</NavbarBrand>
    </Navbar>
    <AppShellContent id="main">…</AppShellContent>
  </AppShellMain>
</AppShell>;
```

- `breakpoint` (default `"lg"`, any configured name, or `"base"` for always-desktop) is applied by
  CSS; the shell reads the resulting mode after hydration, so server and client markup match and
  thresholds follow `neshel generate`. In `replace` mode pass one of your names.
- Desktop: expanded sidebar or icon rail (`collapsible="icon"`, labels stay the accessible names,
  tooltips on hover/focus) or hidden (`"offcanvas"`). Mobile: the sidebar content moves into a
  modal drawer while open (never duplicated); it closes after navigation, on Escape and when the
  viewport becomes desktop. Children remount when they move between the two hosts.
- Persist `collapsed` yourself (cookie → `defaultCollapsed`); the library never reads storage.
- Navbar links: `<NavbarNav hideBelow="md">` with a `<MobileMenu breakpoint="md">` shows exactly
  one of the two. NavigationMenu is for links; DropdownMenu is for commands.

## Accessibility scope (what is verified)

`pnpm check:browser:components` drives packed consumer builds in headless **Chrome** with real
keyboard and pointer input: focus entry, trapping and restoration, Escape layering, alert-dialog
dismissal rules, menu and listbox keyboard navigation, typeahead, multi-selection, chip removal,
combobox filtering, form serialisation, nested-theme portals (computed tokens), shell and mobile
menu transitions at the configured thresholds, reduced motion, SSR hydration, and axe-core with no
violations in light and dark. Automated checks do not prove full accessibility; screen-reader and
Firefox/Safari testing have **not** been performed.
