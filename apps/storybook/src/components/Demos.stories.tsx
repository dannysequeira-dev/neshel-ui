import {
  AppShell,
  AppShellContent,
  AppShellMain,
  Badge,
  Button,
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Combobox,
  Dialog,
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
  MultiSelect,
  Navbar,
  NavbarActions,
  NavbarBrand,
  Select,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarItem,
  SidebarTrigger,
} from "@neshel-ui/components";
import { Grid, Inline, Stack } from "@neshel-ui/layout";
import { Heading, Text } from "@neshel-ui/typography";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { type FormEvent, useState } from "react";
import { ChartIcon, HomeIcon, PlusIcon, SettingsIcon, UsersIcon } from "./icons";

const meta = {
  title: "Demos",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

// ---------------------------------------------------------------------------------------------
// Demo A — responsive dashboard
// ---------------------------------------------------------------------------------------------

const projects = [
  { name: "Website redesign", status: "success", label: "Completed" },
  { name: "Mobile app", status: "warning", label: "Pending" },
  { name: "Data migration", status: "destructive", label: "Blocked" },
] as const;

function UserMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          Ana Sánchez
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Signed in as ana@example.com</DropdownMenuLabel>
        <DropdownMenuItem>Profile</DropdownMenuItem>
        <DropdownMenuItem>Preferences</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive">Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function NewProjectDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size={{ base: "sm", tablet: "md" }}>
          <PlusIcon /> New project
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New project</DialogTitle>
          <DialogDescription>Projects group tasks, people and reports.</DialogDescription>
        </DialogHeader>
        <Stack space="2">
          <Label htmlFor="project-name">Name</Label>
          <Input id="project-name" placeholder="Quarterly planning" />
        </Stack>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <DialogClose asChild>
            <Button>Create</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export const DemoADashboard: Story = {
  name: "Demo A — Responsive dashboard",
  render: () => (
    <AppShell breakpoint="tablet">
      <Sidebar>
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
            <SidebarItem asChild icon={<UsersIcon />}>
              <a href="#team">Team</a>
            </SidebarItem>
          </SidebarGroup>
          <SidebarGroup label="System">
            <SidebarItem asChild icon={<SettingsIcon />}>
              <a href="#settings">Settings</a>
            </SidebarItem>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <Text size="sm" tone="muted">
            Rooted in faith. Built with hope.
          </Text>
        </SidebarFooter>
      </Sidebar>
      <AppShellMain>
        <Navbar sticky>
          <SidebarTrigger />
          <NavbarBrand>Dashboard</NavbarBrand>
          <NavbarActions>
            <UserMenu />
          </NavbarActions>
        </Navbar>
        <AppShellContent id="main">
          <Stack space="6">
            <Inline space="4" alignY="center" justify="between">
              <Heading as="h1" size={{ base: "xl", tablet: "2xl" }}>
                Overview
              </Heading>
              <NewProjectDialog />
            </Inline>
            <Grid columns={{ base: 1, tablet: 3 }} space="4">
              {[
                ["Active projects", "12"],
                ["Open tasks", "48"],
                ["Team members", "9"],
              ].map(([title, value]) => (
                <Card key={title}>
                  <CardHeader>
                    <CardDescription>{title}</CardDescription>
                    <CardTitle as="p" style={{ fontSize: "1.75rem" }}>
                      {value}
                    </CardTitle>
                  </CardHeader>
                </Card>
              ))}
            </Grid>
            <Card>
              <CardHeader>
                <CardTitle as="h2">Projects</CardTitle>
                <CardDescription>Status of the current quarter.</CardDescription>
                <CardAction>
                  <Button variant="link" asChild>
                    <a href="#all-projects">View all</a>
                  </Button>
                </CardAction>
              </CardHeader>
              <CardContent>
                <Stack as="ul" space="3" style={{ margin: 0, padding: 0, listStyle: "none" }}>
                  {projects.map((project) => (
                    <Inline as="li" key={project.name} space="3" justify="between" alignY="center">
                      <Text>{project.name}</Text>
                      <Badge variant={project.status}>{project.label}</Badge>
                    </Inline>
                  ))}
                </Stack>
              </CardContent>
              <CardFooter>
                <Text size="sm" tone="muted">
                  Updated a few minutes ago.
                </Text>
              </CardFooter>
            </Card>
          </Stack>
        </AppShellContent>
      </AppShellMain>
    </AppShell>
  ),
};

// ---------------------------------------------------------------------------------------------
// Demo B — advanced form
// ---------------------------------------------------------------------------------------------

const countries = [
  { value: "cr", label: "Costa Rica" },
  { value: "es", label: "Spain" },
  { value: "jp", label: "Japan" },
  { value: "mx", label: "Mexico" },
];
const roles = [
  { value: "dev", label: "Developer" },
  { value: "design", label: "Designer" },
  { value: "pm", label: "Product manager" },
];
const skills = [
  {
    label: "Frontend",
    items: [
      { value: "react", label: "React" },
      { value: "css", label: "CSS" },
    ],
  },
  {
    label: "Backend",
    items: [
      { value: "node", label: "Node.js" },
      { value: "sql", label: "SQL" },
    ],
  },
];
const languages = [
  { value: "es", label: "Spanish" },
  { value: "en", label: "English" },
  { value: "pt", label: "Portuguese" },
];

type Errors = Partial<Record<"name" | "email" | "country" | "skills", string>>;

const errorStyle = { margin: 0, color: "var(--neshel-destructive)", fontSize: "0.875rem" };

function AdvancedForm() {
  const [skillValue, setSkillValue] = useState<string[]>([]); // controlled
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState("");

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const next: Errors = {};
    if (!String(data.get("name") ?? "").trim()) next.name = "Enter your name.";
    if (!/^\S+@\S+\.\S+$/.test(String(data.get("email") ?? "")))
      next.email = "Enter a valid email.";
    if (!data.get("country")) next.country = "Choose a country.";
    if (skillValue.length === 0) next.skills = "Choose at least one skill.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setResult(JSON.stringify([...data.entries()], null, 2));
    }, 800);
  };

  return (
    <Card style={{ maxWidth: 560, margin: 24 }}>
      <CardHeader>
        <CardTitle as="h1">Join the team</CardTitle>
        <CardDescription>All fields marked * are required.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} noValidate>
          <Stack space="4">
            <Stack space="1.5">
              <Label htmlFor="f-name" required>
                Name
              </Label>
              <Input
                id="f-name"
                name="name"
                autoComplete="name"
                invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? "f-name-error" : undefined}
              />
              {errors.name ? (
                <p id="f-name-error" style={errorStyle}>
                  {errors.name}
                </p>
              ) : null}
            </Stack>
            <Stack space="1.5">
              <Label htmlFor="f-email" required>
                Email
              </Label>
              <Input
                id="f-email"
                name="email"
                type="email"
                autoComplete="email"
                invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? "f-email-error" : undefined}
              />
              {errors.email ? (
                <p id="f-email-error" style={errorStyle}>
                  {errors.email}
                </p>
              ) : null}
            </Stack>
            <Stack space="1.5">
              <Label htmlFor="f-country" required>
                Country (uncontrolled Select)
              </Label>
              <Select
                id="f-country"
                name="country"
                options={countries}
                placeholder="Select a country"
                invalid={Boolean(errors.country)}
                aria-describedby={errors.country ? "f-country-error" : undefined}
              />
              {errors.country ? (
                <p id="f-country-error" style={errorStyle}>
                  {errors.country}
                </p>
              ) : null}
            </Stack>
            <Stack space="1.5">
              <Label htmlFor="f-role">Role (searchable)</Label>
              <Combobox id="f-role" name="role" items={roles} placeholder="Search a role" />
            </Stack>
            <Stack space="1.5">
              <Label htmlFor="f-skills" required>
                Skills (controlled, multiple)
              </Label>
              <Combobox
                id="f-skills"
                name="skills"
                multiple
                items={skills}
                value={skillValue}
                onValueChange={setSkillValue}
                placeholder="Search skills"
                invalid={Boolean(errors.skills)}
                aria-describedby={errors.skills ? "f-skills-error" : undefined}
              />
              {errors.skills ? (
                <p id="f-skills-error" style={errorStyle}>
                  {errors.skills}
                </p>
              ) : null}
            </Stack>
            <Stack space="1.5">
              <Label htmlFor="f-languages">Languages</Label>
              <MultiSelect
                id="f-languages"
                name="languages"
                options={languages}
                placeholder="Select languages"
              />
            </Stack>
            <Inline space="3">
              <Button type="submit" loading={submitting}>
                Submit application
              </Button>
              <Button type="reset" variant="outline" onClick={() => setSkillValue([])}>
                Reset
              </Button>
            </Inline>
          </Stack>
        </form>
      </CardContent>
      {result ? (
        <CardFooter>
          <output
            aria-live="polite"
            style={{ whiteSpace: "pre", fontFamily: "var(--neshel-font-mono)" }}
          >
            {result}
          </output>
        </CardFooter>
      ) : null}
    </Card>
  );
}

export const DemoBAdvancedForm: Story = {
  name: "Demo B — Advanced form",
  render: () => <AdvancedForm />,
};
