"use client";
import {
  AppShell,
  AppShellContent,
  AppShellMain,
  Navbar,
  NavbarBrand,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarItem,
  SidebarSeparator,
  SidebarSub,
  SidebarTrigger,
} from "@neshel-ui/components";
import { Stack } from "@neshel-ui/layout";
import { Paragraph, Text } from "@neshel-ui/typography";
import { BarChart3, Home, Settings, Users } from "lucide-react";
import { useState } from "react";

/**
 * Desktop from md (expanded sidebar or icon rail); below md the sidebar becomes a drawer.
 * Here the collapsed state is controlled; persist it yourself (for example in a cookie).
 */
export default function AppShellBasic() {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <AppShell
      breakpoint="md"
      collapsed={collapsed}
      onCollapsedChange={setCollapsed}
      className="min-h-[420px] overflow-hidden rounded-lg border border-[var(--neshel-border)]"
    >
      <Sidebar collapsible="icon" className="!h-auto">
        <SidebarHeader>
          <Text weight="semibold">Acme</Text>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup label="Workspace">
            <SidebarItem asChild active icon={<Home aria-hidden="true" />}>
              <a href="#dashboard">Dashboard</a>
            </SidebarItem>
            <SidebarItem asChild icon={<BarChart3 aria-hidden="true" />}>
              <a href="#reports">Reports</a>
            </SidebarItem>
            <SidebarSub label="Team" icon={<Users aria-hidden="true" />}>
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
            <SidebarItem asChild icon={<Settings aria-hidden="true" />}>
              <a href="#settings">Settings</a>
            </SidebarItem>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <Text size="sm" tone="muted">
            Signed in as Ana
          </Text>
        </SidebarFooter>
      </Sidebar>
      <AppShellMain>
        <Navbar>
          <SidebarTrigger />
          <NavbarBrand>Dashboard</NavbarBrand>
        </Navbar>
        <AppShellContent>
          <Stack space="3">
            <Paragraph>Use the trigger to collapse the sidebar into an icon rail.</Paragraph>
            <Text tone="muted" size="sm">
              collapsed: {String(collapsed)}
            </Text>
          </Stack>
        </AppShellContent>
      </AppShellMain>
    </AppShell>
  );
}
