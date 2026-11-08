# Contract — `@neshel-ui/components` public API

Normative for feature 005. Types are exported from `@neshel-ui/components` with the same names
plus a `Props` suffix (`ButtonProps`, `DialogContentProps`, …). All components accept `className`
and native attributes of their element unless stated; refs use React 19 ref-as-prop. "Radix props"
means the corresponding Radix primitive's documented props are forwarded unchanged (state,
`onOpenChange`, positioning, `onEscapeKeyDown`, …).

## Conventions

| Topic      | Rule                                                                                                                             |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Exports    | Flat names only (R3). `NeshelComponentsError` for invalid usage (thrown during render).                                          |
| `asChild`  | Exactly one non-Fragment element child; class joined, style merged (child wins), handlers composed (child first), refs composed. |
| `as`       | Closed element lists; `as` + `asChild` throws.                                                                                   |
| Responsive | `Responsive<T> = T \| { base?: T; [breakpoint]?: T }` with configured names (ADR 0010).                                          |
| Portals    | Overlay contents accept `container?: HTMLElement \| null`; default `document.body` with theme wrapper.                           |
| State      | Every stateful component offers `x` / `defaultX` / `onXChange`.                                                                  |

## Foundation

```ts
type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "destructive" | "link";
type ButtonSize = "sm" | "md" | "lg";
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant; // "primary"
  size?: Responsive<ButtonSize>; // "md"
  iconOnly?: boolean; // square; needs aria-label / aria-labelledby (dev warning)
  fullWidth?: boolean;
  loading?: boolean; // aria-disabled + data-loading; no activation/submission
  asChild?: boolean; // disabled/loading + asChild throws
}
```

Card: `Card` (`as`: div | section | article | aside | li; `asChild`; `variant`: default | outline |
muted; `padding`: sm | md | lg), `CardHeader`, `CardTitle` (`as`: h1–h6 | p | div, default h3;
`asChild`), `CardDescription` (p), `CardContent`, `CardFooter`, `CardAction` (div, end of header).

Badge: `variant`: default | secondary | outline | success | warning | destructive | accent;
`size`: sm | md. `<span>`; no `asChild`, no role.

Input: `InputHTMLAttributes<HTMLInputElement>` + `uiSize?: "sm" | "md" | "lg"`,
`invalid?: boolean` (sets `aria-invalid="true"` unless `aria-invalid` is given). Native `size`
remains the numeric attribute.

Label: `LabelHTMLAttributes<HTMLLabelElement>` + `required?: boolean` (decorative "*",
`aria-hidden`). VisuallyHidden: `<span>` with `asChild`.

Separator: `orientation?: "horizontal" | "vertical"` (horizontal), `decorative?: boolean` (false).
Semantic → `role="separator"` (+ `aria-orientation="vertical"`); decorative → `role="none"`.

Skeleton: `shape?: "rectangle" | "circle" | "text"`, `width?: number | string`,
`height?: number | string` (numbers are px); always `aria-hidden="true"`.

Tooltip: `Tooltip` (Radix root props + `delayDuration`), `TooltipTrigger` (`asChild`),
`TooltipContent` (`side`, `align`, `sideOffset`, `container`). Provider included per tooltip.

## Overlays

| Family      | Parts                                                                                                                                                                                       |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dialog      | `Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogBody`, `DialogFooter`, `DialogTitle`, `DialogDescription`, `DialogClose`                                                 |
| AlertDialog | `AlertDialog`, `AlertDialogTrigger`, `AlertDialogContent`, `AlertDialogHeader`, `AlertDialogFooter`, `AlertDialogTitle`, `AlertDialogDescription`, `AlertDialogCancel`, `AlertDialogAction` |
| Sheet       | `Sheet`, `SheetTrigger`, `SheetContent`, `SheetHeader`, `SheetBody`, `SheetFooter`, `SheetTitle`, `SheetDescription`, `SheetClose`                                                          |
| Popover     | `Popover`, `PopoverTrigger`, `PopoverAnchor`, `PopoverContent`, `PopoverClose`                                                                                                              |

- `DialogContent`: Radix content props + `size?: "sm" | "md" | "lg" | "xl" | "full"` (md),
  `showClose?: boolean` (true), `closeLabel?: string` ("Close"), `container`.
- `AlertDialogAction` / `AlertDialogCancel`: Button `variant` and `size` (Action default
  `primary`, Cancel default `outline`); `asChild`.
- `SheetContent`: `side?: "left" | "right" | "top" | "bottom"` (right), `size?: "sm" | "md" | "lg"`,
  `showClose`, `closeLabel`, `container`.
- `PopoverContent`: Radix props (`side`, `align`, `sideOffset` = 6, collision props), `container`.
- Triggers and closes support `asChild`; Radix warns when a dialog has no title (kept).

## Selection

```ts
interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}
interface SelectOptionGroup {
  label: string;
  options: readonly SelectOption[];
}
type SelectOptions = readonly (SelectOption | SelectOptionGroup)[];

interface SelectFieldProps {
  // shared by Select, MultiSelect, Combobox
  id?: string;
  name?: string;
  form?: string;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  invalid?: boolean;
  placeholder?: string;
  uiSize?: "sm" | "md" | "lg";
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?(open: boolean): void;
  container?: HTMLElement | null;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  className?: string;
}
interface SelectProps extends SelectFieldProps {
  options: SelectOptions;
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?(value: string | null): void;
  ref?: Ref<HTMLButtonElement>;
}
interface MultiSelectProps extends SelectFieldProps {
  options: SelectOptions;
  value?: readonly string[];
  defaultValue?: readonly string[];
  onValueChange?(value: string[]): void;
  chips?: boolean; // true
  clearable?: boolean; // true
  clearLabel?: string; // "Clear selection"
  removeLabel?(label: string): string; // label => `Remove ${label}`
  removedMessage?(label: string): string; // label => `${label} removed`
  summary?(count: number): string; // n => `${n} selected`
  ref?: Ref<HTMLButtonElement>;
}
type ComboboxItem = SelectOption;
type ComboboxProps = SelectFieldProps & {
  items: readonly (ComboboxItem | { label: string; items: readonly ComboboxItem[] })[];
  inputValue?: string;
  defaultInputValue?: string;
  onInputValueChange?(value: string): void;
  filter?: ((item: ComboboxItem, query: string) => boolean) | null; // null = external filtering
  emptyMessage?: ReactNode; // "No results"
  loading?: boolean;
  loadingMessage?: ReactNode; // "Loading…"
  clearable?: boolean;
  clearLabel?: string;
  ref?: Ref<HTMLInputElement>;
} & (
    | {
        multiple?: false;
        value?: string | null;
        defaultValue?: string | null;
        onValueChange?(v: string | null): void;
      }
    | {
        multiple: true;
        value?: readonly string[];
        defaultValue?: readonly string[];
        onValueChange?(v: string[]): void;
        removeLabel?(label: string): string;
      }
  );
```

Labelling: pass `id` and render `<Label htmlFor={id}>`, or `aria-label`/`aria-labelledby`.
Serialisation: `name` produces one form entry per selected value.

## Navigation

- `Navbar` (`<header>`; `sticky?: boolean`), `NavbarBrand` (div; `asChild`), `NavbarNav`
  (`<nav>` + `<ul>`; `aria-label` default "Main"; `hideBelow?: Breakpoint`), `NavbarLink`
  (`<li>` + child via `asChild` or `<a>`; `active` → `aria-current="page"`), `NavbarActions`.
- `NavigationMenu` (Radix root; renders `<nav>`; `aria-label`), `NavigationMenuList`,
  `NavigationMenuItem`, `NavigationMenuTrigger`, `NavigationMenuContent`, `NavigationMenuLink`
  (`active` → `aria-current="page"`; `asChild`).
- `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent` (`container`), `DropdownMenuItem`
  (`variant?: "default" | "destructive"`, `inset`), `DropdownMenuCheckboxItem`,
  `DropdownMenuRadioGroup`, `DropdownMenuRadioItem`, `DropdownMenuLabel`, `DropdownMenuGroup`,
  `DropdownMenuSeparator`, `DropdownMenuShortcut`, `DropdownMenuSub`, `DropdownMenuSubTrigger`,
  `DropdownMenuSubContent`.
- `MobileMenu` (`open`/`defaultOpen`/`onOpenChange`, `breakpoint?: Breakpoint` = "md"),
  `MobileMenuTrigger` (button; default icon + `label` "Open menu"), `MobileMenuContent` (sheet;
  `side` = "left", `title` = "Menu", `titleHidden` = true, `container`), `MobileMenuLink`
  (`active`, `asChild`).

## Application shell

- `AppShell`: `breakpoint?: Breakpoint` ("lg"); `collapsed` / `defaultCollapsed` (false) /
  `onCollapsedChange`; `mobileOpen` / `defaultMobileOpen` (false) / `onMobileOpenChange`.
- `AppShellMain` (div), `AppShellContent` (`<main>`; `id` for skip links).
- `Sidebar` (`<aside>`): `collapsible?: "icon" | "offcanvas" | "none"` ("icon"), `aria-label`
  ("Sidebar"), `mobileTitle` ("Navigation"); outside an AppShell it renders statically expanded.
- `SidebarHeader`, `SidebarContent` (`<nav>`, `aria-label` "Main navigation"), `SidebarFooter`,
  `SidebarGroup` (`label?: ReactNode`; list labelled by the label), `SidebarItem` (`icon`,
  `active`, `tooltip`, `asChild`; default `<button type="button">`), `SidebarSub` (`label`, `icon`,
  `open`/`defaultOpen`/`onOpenChange`; nested `SidebarItem`s), `SidebarSeparator`.
- `SidebarTrigger` (button; `label` = "Toggle sidebar"; custom children replace the icon).
- `useAppShell()` returns `{ mode, collapsed, setCollapsed, mobileOpen, setMobileOpen, toggle }`
  for custom triggers (throws outside an AppShell).
