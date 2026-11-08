import { Box } from "@neshel-ui/layout";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Tile } from "./demo";

const meta = {
  title: "Layout/Box",
  component: Box,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Neutral polymorphic element: renders a `div` (block) by default and adds no CSS unless `display` is set. Use `as` or `asChild` for semantics.",
      },
    },
  },
  args: { children: <Tile>Box content</Tile> },
} satisfies Meta<typeof Box>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Semantic: Story = { args: { as: "aside", "aria-label": "Note" } };
export const ResponsiveDisplay: Story = {
  args: {
    display: { base: "none", md: "block" },
    children: <Tile tone="accent">Visible from 48rem</Tile>,
  },
};
