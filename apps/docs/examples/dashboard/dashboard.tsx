"use client";
import {
  AppShell,
  AppShellContent,
  AppShellMain,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  Label,
  Navbar,
  NavbarActions,
  NavbarBrand,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarItem,
  SidebarTrigger,
} from "@neshel-ui/components";
import { Grid, Inline, Stack } from "@neshel-ui/layout";
import { Caption, Heading, Paragraph, Text } from "@neshel-ui/typography";
import { BarChart3, FolderKanban, Home, Plus, Settings, Users } from "lucide-react";
import { useState } from "react";
import { type Project, projects, stats } from "./data";

/** A responsive dashboard: sidebar (rail on desktop, drawer below lg), KPIs, projects, dialog. */
export function Dashboard() {
  const [items, setItems] = useState<Project[]>(projects);
  const [open, setOpen] = useState(false);

  return (
    <AppShell breakpoint="lg" className="min-h-[640px]">
      <Sidebar collapsible="icon" mobileTitle="Workspace navigation">
        <SidebarHeader>
          <Text weight="bold">Acme Studio</Text>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup label="Workspace">
            <SidebarItem asChild active icon={<Home aria-hidden="true" />}>
              <a href="#overview">Overview</a>
            </SidebarItem>
            <SidebarItem asChild icon={<FolderKanban aria-hidden="true" />}>
              <a href="#projects">Projects</a>
            </SidebarItem>
            <SidebarItem asChild icon={<BarChart3 aria-hidden="true" />}>
              <a href="#reports">Reports</a>
            </SidebarItem>
            <SidebarItem asChild icon={<Users aria-hidden="true" />}>
              <a href="#team">Team</a>
            </SidebarItem>
          </SidebarGroup>
          <SidebarGroup label="Account">
            <SidebarItem asChild icon={<Settings aria-hidden="true" />}>
              <a href="#settings">Settings</a>
            </SidebarItem>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <Caption>Plan: Team</Caption>
        </SidebarFooter>
      </Sidebar>

      <AppShellMain>
        <Navbar>
          <SidebarTrigger />
          <NavbarBrand>Overview</NavbarBrand>
          <NavbarActions>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  Ana Rojas
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Signed in as ana@example.com</DropdownMenuLabel>
                <DropdownMenuItem>Profile</DropdownMenuItem>
                <DropdownMenuItem>Billing</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive">Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </NavbarActions>
        </Navbar>

        <AppShellContent id="overview">
          <Stack space="8">
            <Inline space="4" justify="between" align="center" wrap>
              <Stack space="2">
                <Heading as="h1" size="2xl">
                  Good morning, Ana
                </Heading>
                <Paragraph tone="muted">
                  Here is what happened in your workspace this week.
                </Paragraph>
              </Stack>
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus aria-hidden="true" />
                    New project
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      const data = new FormData(event.currentTarget);
                      const name = String(data.get("name") ?? "").trim();
                      if (!name) return;
                      setItems((current) => [
                        { id: String(Date.now()), name, owner: "Ana Rojas", status: "Planning" },
                        ...current,
                      ]);
                      setOpen(false);
                    }}
                  >
                    <DialogHeader>
                      <DialogTitle>New project</DialogTitle>
                      <DialogDescription>Projects group tasks, files and people.</DialogDescription>
                    </DialogHeader>
                    <DialogBody>
                      <Stack space="2">
                        <Label htmlFor="project-name" required>
                          Project name
                        </Label>
                        <Input id="project-name" name="name" required autoComplete="off" />
                      </Stack>
                    </DialogBody>
                    <DialogFooter>
                      <DialogClose asChild>
                        <Button variant="outline">Cancel</Button>
                      </DialogClose>
                      <Button type="submit">Create</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </Inline>

            <Grid columns={{ base: 1, sm: 2, xl: 4 }} space="4">
              {stats.map((stat) => (
                <Card key={stat.label} padding="sm">
                  <CardHeader>
                    <CardDescription>{stat.label}</CardDescription>
                    <CardTitle as="p">
                      <Text size="2xl" weight="bold">
                        {stat.value}
                      </Text>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Caption tone={stat.trend.startsWith("-") ? "destructive" : "default"}>
                      {stat.trend} vs last week
                    </Caption>
                  </CardContent>
                </Card>
              ))}
            </Grid>

            <Card id="projects">
              <CardHeader>
                <CardTitle as="h2">Projects</CardTitle>
                <CardDescription>{items.length} active projects</CardDescription>
              </CardHeader>
              <CardContent>
                <Stack as="ul" space="3" separator>
                  {items.map((project) => (
                    <li key={project.id}>
                      <Inline space="3" justify="between" align="center" wrap>
                        <Stack space="1">
                          <Text weight="medium">{project.name}</Text>
                          <Caption as="span">Owner: {project.owner}</Caption>
                        </Stack>
                        <Badge
                          variant={
                            project.status === "At risk"
                              ? "warning"
                              : project.status === "Done"
                                ? "success"
                                : "secondary"
                          }
                        >
                          {project.status}
                        </Badge>
                      </Inline>
                    </li>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </AppShellContent>
      </AppShellMain>
    </AppShell>
  );
}
