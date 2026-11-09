import {
  Button,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  MobileMenu,
  MobileMenuContent,
  MobileMenuLink,
  MobileMenuNav,
  MobileMenuTrigger,
  Navbar,
  NavbarActions,
  NavbarBrand,
  NavbarLink,
  NavbarNav,
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@neshel-ui/components";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

const meta = {
  title: "Components/Navigation",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Navbar is a `<header>` with a `<nav>` of links (`aria-current` for the active page). NavigationMenu shows panels of links (navigation semantics); DropdownMenu is for commands (menu semantics). MobileMenu is a sheet that closes after navigation, on Escape and when the viewport reaches its breakpoint (here the custom `tablet` breakpoint).",
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const ResponsiveNavbar: Story = {
  render: () => (
    <Navbar>
      <NavbarBrand asChild>
        <a href="#home">Neshel-UI</a>
      </NavbarBrand>
      <NavbarNav hideBelow="tablet">
        <NavbarLink href="#home" active>
          Home
        </NavbarLink>
        <NavbarLink href="#docs">Docs</NavbarLink>
        <NavbarLink href="#blog">Blog</NavbarLink>
      </NavbarNav>
      <NavbarActions>
        <Button size="sm">Sign in</Button>
        <MobileMenu breakpoint="tablet">
          <MobileMenuTrigger />
          <MobileMenuContent>
            <MobileMenuNav>
              <MobileMenuLink href="#home" active>
                Home
              </MobileMenuLink>
              <MobileMenuLink href="#docs">Docs</MobileMenuLink>
              <MobileMenuLink href="#blog">Blog</MobileMenuLink>
            </MobileMenuNav>
          </MobileMenuContent>
        </MobileMenu>
      </NavbarActions>
    </Navbar>
  ),
};

export const NavigationMenuPanels: Story = {
  render: () => (
    <NavigationMenu aria-label="Products">
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger>Products</NavigationMenuTrigger>
          <NavigationMenuContent>
            <NavigationMenuLink href="#analytics">
              <strong>Analytics</strong>
              <span>Dashboards and reports</span>
            </NavigationMenuLink>
            <NavigationMenuLink href="#billing">
              <strong>Billing</strong>
              <span>Invoices and plans</span>
            </NavigationMenuLink>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink href="#pricing" active>
            Pricing
          </NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  ),
};

function CommandMenu() {
  const [density, setDensity] = useState("comfortable");
  const [notifications, setNotifications] = useState(true);
  const [last, setLast] = useState("none");
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">Account</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>My account</DropdownMenuLabel>
          <DropdownMenuGroup>
            <DropdownMenuItem onSelect={() => setLast("profile")}>
              Profile <DropdownMenuShortcut>⌘P</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setLast("settings")}>Settings</DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem checked={notifications} onCheckedChange={setNotifications}>
            Notifications
          </DropdownMenuCheckboxItem>
          <DropdownMenuRadioGroup value={density} onValueChange={setDensity}>
            <DropdownMenuRadioItem value="comfortable">Comfortable</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="compact">Compact</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Invite</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem onSelect={() => setLast("email")}>Email</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setLast("link")}>Copy link</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setLast("sign-out")}>
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <output style={{ marginInlineStart: 12 }}>last command: {last}</output>
    </>
  );
}

export const DropdownMenuCommands: Story = { render: () => <CommandMenu /> };
