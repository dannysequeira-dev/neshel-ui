import { Center } from "@neshel-ui/layout";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Frame, Tile } from "./demo";

const meta = {
  title: "Layout/Center",
  component: Center,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Flex container centred on both axes by default. X → `justify-content`, Y → `align-items`; overrides replace the default per axis.",
      },
    },
  },
  args: { children: <Tile tone="primary">Centred</Tile> },
  render: (args) => (
    <Frame style={{ height: 200, display: "flex" }}>
      <Center {...args} style={{ flex: 1 }} />
    </Frame>
  ),
} satisfies Meta<typeof Center>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const OverrideX: Story = { args: { alignX: "start" } };
export const OverrideY: Story = { args: { alignY: "end" } };
export const ResponsiveOverride: Story = { args: { alignY: { base: "center", md: "start" } } };
