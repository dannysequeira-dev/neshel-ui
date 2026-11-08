import { Box, Container, Grid, Inline, Stack } from "@neshel-ui/layout";
import { Caption, Heading, Paragraph, Text } from "@neshel-ui/typography";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Tile, tiles } from "../layout/demo";

const meta = {
  title: "Typography/Custom breakpoints and layout",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Storybook's `neshel.config.ts` extends the defaults with `phone` (30rem) and `tablet` (52rem), synchronised with Tailwind (`tailwind: true`). Layout and typography props accept the configured names with type checking; Tailwind utilities (`phone:`, `tablet:`) switch at the same widths. Resize the canvas or use the viewport toolbar.",
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const ActiveBreakpoint = () => (
  <Inline space="2" alignY="center" wrap>
    <Text size="sm" tone="muted">
      Active:
    </Text>
    <Tile tone="muted">base</Tile>
    <Box display={{ base: "none", phone: "block" }}>
      <Tile tone="primary">phone ≥ 30rem</Tile>
    </Box>
    <Box display={{ base: "none", sm: "block" }}>
      <Tile tone="primary">sm ≥ 40rem</Tile>
    </Box>
    <Box display={{ base: "none", md: "block" }}>
      <Tile tone="primary">md ≥ 48rem</Tile>
    </Box>
    <Box display={{ base: "none", tablet: "block" }}>
      <Tile tone="accent">tablet ≥ 52rem</Tile>
    </Box>
    <Box display={{ base: "none", lg: "block" }}>
      <Tile tone="primary">lg ≥ 64rem</Tile>
    </Box>
  </Inline>
);

export const Welcome: Story = {
  name: "Welcome (owner example)",
  render: () => (
    <Container size="lg">
      <Stack space={{ base: "3", tablet: "6" }}>
        <ActiveBreakpoint />
        <Heading as="h1" size={{ base: "xl", tablet: "3xl", "2xl": "5xl" }} weight="bold">
          Welcome to Neshel-UI
        </Heading>
        <Paragraph size="base" tone="muted">
          Rooted in faith. Built with hope.
        </Paragraph>
        <Grid columns={{ base: 1, tablet: 2, lg: 3 }} space="4">
          <Tile>Layout</Tile>
          <Tile>Typography</Tile>
          <Tile>Components</Tile>
        </Grid>
      </Stack>
    </Container>
  ),
};

export const TailwindAndNeshelTogether: Story = {
  render: () => (
    <Stack space="4">
      <ActiveBreakpoint />
      <Grid columns={{ base: 1, phone: 2, tablet: 4 }} space={{ base: "2", tablet: "4" }}>
        {tiles(4, "Neshel")}
      </Grid>
      <div className="grid grid-cols-1 gap-2 phone:grid-cols-2 tablet:grid-cols-4 tablet:gap-4">
        {tiles(4, "Tailwind")}
      </div>
      <Caption>Both grids change at exactly the same thresholds (one configuration).</Caption>
    </Stack>
  ),
};

export const InheritanceUpwards: Story = {
  render: () => (
    <Stack space="4">
      <Paragraph size={{ base: "sm", phone: "lg" }}>
        Written at base and phone only: the phone value applies at every wider breakpoint.
      </Paragraph>
      <Inline space={{ base: "1", tablet: "6" }}>{tiles(3)}</Inline>
    </Stack>
  ),
};
