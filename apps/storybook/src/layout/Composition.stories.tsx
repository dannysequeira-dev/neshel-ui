import { Box, Center, Container, Grid, Inline, Stack } from "@neshel-ui/layout";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { Frame, Tile, tiles } from "./demo";

const meta = {
  title: "Layout/Composition",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Compositions of several primitives: `asChild`, nesting, themes and a realistic application shell. Every style comes from `@neshel-ui/layout/styles.css` plus Tailwind utilities for demo colours.",
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** A component that forwards className and ref, as `asChild` requires (React 19 ref-as-prop). */
function Card({ className, ...props }: ComponentProps<"article">) {
  return (
    <article
      {...props}
      className={`rounded-neshel-lg border border-neshel-border bg-neshel-surface p-4 text-neshel-surface-foreground ${className ?? ""}`}
    />
  );
}

export const AsChild: Story = {
  render: () => (
    <Stack space="6">
      <Stack asChild space="3">
        <section aria-label="Settings">
          <h3 className="font-semibold">Settings (a section, no wrapper)</h3>
          <Tile>Profile</Tile>
          <Tile>Preferences</Tile>
        </section>
      </Stack>
      <Grid asChild columns={{ base: 1, md: 2 }} space="4">
        <Card aria-label="Card grid">
          <Tile>Card slot A</Tile>
          <Tile>Card slot B</Tile>
        </Card>
      </Grid>
      <Inline asChild separator space="3">
        <ul aria-label="Tags">
          <li>Faith</li>
          <li>Hope</li>
          <li>Love</li>
        </ul>
      </Inline>
    </Stack>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "`asChild` applies the layout to the child element (className joined, style merged, refs and handlers composed). With a DOM element child, separators are inserted into its children; a component child with `separator` throws.",
      },
    },
  },
};

export const Nested: Story = {
  render: () => (
    <Stack space="4">
      <Inline justify="between" alignY="center">
        <Tile tone="primary">Header</Tile>
        <Inline space="2">{tiles(2, "Action")}</Inline>
      </Inline>
      <Grid columns={{ base: 1, md: 3 }} space="4">
        <Stack space="2">{tiles(3, "Left")}</Stack>
        <Center style={{ minHeight: 120 }}>
          <Tile tone="accent">Centred</Tile>
        </Center>
        <Stack space="2" separator>
          {tiles(3, "Right")}
        </Stack>
      </Grid>
    </Stack>
  ),
};

function ThemedPanel({ theme }: { theme: string }) {
  return (
    <div
      data-neshel-theme={theme}
      className="rounded-neshel-lg bg-neshel-background p-4 text-neshel-foreground"
    >
      <Stack space="3" separator>
        <strong>{theme}</strong>
        <Inline space="2" separator>
          <span>Gaps</span>
          <span>follow</span>
          <span>tokens</span>
        </Inline>
        <Grid columns={2} space="2">
          {tiles(4)}
        </Grid>
      </Stack>
    </div>
  );
}

export const Themes: Story = {
  render: () => (
    <Grid columns={{ base: 1, md: 3 }} space="4">
      <ThemedPanel theme="light" />
      <ThemedPanel theme="dark" />
      <ThemedPanel theme="sepia" />
    </Grid>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "Separators use `--neshel-border` and gaps use `--neshel-spacing`, so nested `data-neshel-theme` scopes restyle the layout. The custom `sepia` theme (Storybook-only, `@layer neshel.config`) has a warmer border and a larger spacing unit.",
      },
    },
  },
};

export const ApplicationShell: Story = {
  parameters: { layout: "fullscreen" },
  render: () => (
    <Box className="min-h-screen bg-neshel-background text-neshel-foreground">
      <Box as="header" className="border-b border-neshel-border bg-neshel-surface">
        <Container size="xl" gutter={{ base: "4", md: "8" }}>
          <Inline justify="between" alignY="center" style={{ minHeight: 64 }}>
            <Inline space="2" alignY="center">
              <span aria-hidden="true" className="size-6 rounded-neshel-full bg-neshel-primary" />
              <strong>Neshel-UI</strong>
            </Inline>
            <Inline as="nav" aria-label="Main" space="4" separator alignY="center">
              <a href="#dashboard">Dashboard</a>
              <a href="#projects">Projects</a>
              <a href="#settings">Settings</a>
            </Inline>
          </Inline>
        </Container>
      </Box>
      <Container as="main" size="xl" gutter={{ base: "4", md: "8" }} className="py-8">
        <Grid columns={{ base: 1, lg: 4 }} space="6">
          <Box as="aside" display={{ base: "none", lg: "block" }} aria-label="Filters">
            <Stack space="2" separator>
              {tiles(4, "Filter")}
            </Stack>
          </Box>
          <Stack space="6" className="lg:col-span-3">
            <Stack space="1">
              <h1 className="text-2xl font-semibold">Projects</h1>
              <p className="text-sm text-neshel-muted-foreground">
                Rooted in faith. Built with hope.
              </p>
            </Stack>
            <Grid columns={{ base: 1, md: 2, xl: 3 }} space="4">
              {["Atlas", "Beacon", "Cedar", "Dawn", "Ember", "Fern"].map((name) => (
                <Card key={name}>
                  <Stack space="2">
                    <Inline justify="between" alignY="baseline">
                      <strong>{name}</strong>
                      <span className="text-xs text-neshel-muted-foreground">Active</span>
                    </Inline>
                    <p className="text-sm">Layout composed only from primitives.</p>
                  </Stack>
                </Card>
              ))}
            </Grid>
          </Stack>
        </Grid>
      </Container>
      <Box as="footer" className="border-t border-neshel-border">
        <Container gutter="4">
          <Center style={{ minHeight: 56 }}>
            <Frame>
              <span className="text-xs">Neshel-UI — Rooted in faith. Built with hope.</span>
            </Frame>
          </Center>
        </Container>
      </Box>
    </Box>
  ),
};
