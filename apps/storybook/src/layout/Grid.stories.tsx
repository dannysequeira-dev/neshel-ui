import { Grid } from "@neshel-ui/layout";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Frame, Tile, tiles } from "./demo";

const meta = {
  title: "Layout/Grid",
  component: Grid,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "CSS Grid with 1–12 equal columns (`repeat(n, minmax(0, 1fr))`). X → `justify-items`, Y → `align-items`.",
      },
    },
  },
  args: { columns: 3, space: "4", children: tiles(6) },
  render: (args) => (
    <Frame>
      <Grid {...args} />
    </Frame>
  ),
} satisfies Meta<typeof Grid>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Responsive: Story = {
  args: { columns: { base: 1, md: 2, lg: 4 }, space: { base: "2", md: "4" }, children: tiles(8) },
};

export const IndependentXYSpacing: Story = {
  render: () => (
    <Frame>
      <Grid columns={3} spaceX="8" spaceY="2">
        {tiles(6)}
      </Grid>
    </Frame>
  ),
};

export const ItemAlignment: Story = {
  render: () => (
    <Frame>
      <Grid columns={3} space="4" alignX="center" alignY="end">
        <Tile>Short</Tile>
        <Tile style={{ paddingBlock: 32 }}>Tall</Tile>
        <Tile>Short</Tile>
      </Grid>
    </Frame>
  ),
};
