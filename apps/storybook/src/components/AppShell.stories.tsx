import {
  AppShell,
  AppShellContent,
  AppShellMain,
  Navbar,
  NavbarBrand,
  Sidebar,
  type SidebarCollapsible,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarItem,
  SidebarSeparator,
  SidebarSub,
  SidebarTrigger,
} from "@neshel-ui/components";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { ChartIcon, HomeIcon, SettingsIcon, UsersIcon } from "./icons";

const meta = {
  title: "Components/Application shell",
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "AppShell switches between a desktop sidebar (expanded or icon rail) and a mobile drawer at its `breakpoint` (here the custom `tablet` breakpoint). CSS decides the mode, so it follows `neshel generate`; the sidebar content renders once, inline or in the drawer. Links come from your router through `asChild`; `active` sets `aria-current`.",
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function Shell({
  collapsible = "icon",
  controlled = false,
}: {
  collapsible?: SidebarCollapsible;
  controlled?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <AppShell
      breakpoint="tablet"
      {...(controlled ? { collapsed, onCollapsedChange: setCollapsed } : {})}
      style={{ minBlockSize: 480 }}
    >
      <Sidebar collapsible={collapsible}>
        <SidebarHeader>
          <strong>Neshel</strong>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup label="Workspace">
            <SidebarItem asChild active icon={<HomeIcon />}>
              <a href="#dashboard">Dashboard</a>
            </SidebarItem>
            <SidebarItem asChild icon={<ChartIcon />}>
              <a href="#reports">Reports</a>
            </SidebarItem>
            <SidebarSub label="Team" icon={<UsersIcon />}>
              <SidebarItem asChild>
                <a href="#members">Members</a>
              </SidebarItem>
              <SidebarItem asChild>
                <a href="#roles">Roles</a>
              </SidebarItem>
            </SidebarSub>
          </SidebarGroup>
          <SidebarSeparator />
          <SidebarGroup label="System">
            <SidebarItem asChild icon={<SettingsIcon />}>
              <a href="#settings">Settings</a>
            </SidebarItem>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>Signed in as Ana</SidebarFooter>
      </Sidebar>
      <AppShellMain>
        <Navbar>
          <SidebarTrigger />
          <NavbarBrand>Dashboard</NavbarBrand>
        </Navbar>
        <AppShellContent>
          <p>Resize the viewport across the tablet breakpoint (52rem).</p>
          {controlled ? <output>collapsed: {String(collapsed)}</output> : null}
        </AppShellContent>
      </AppShellMain>
    </AppShell>
  );
}

export const IconRail: Story = { render: () => <Shell /> };
export const Offcanvas: Story = { render: () => <Shell collapsible="offcanvas" /> };
export const Controlled: Story = { render: () => <Shell controlled /> };
