import { Flex } from "@neshel-ui/layout";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Frame, Tile, tiles } from "./demo";

const meta = {
  title: "Layout/Flex",
  component: Flex,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Configurable flex container. Alignment follows the active (responsive) `direction`: rows map X → `justify-content`, columns map X → `align-items`. A property vacated by a direction change resets to `normal`.",
      },
    },
  },
  args: { space: "3", direction: "row", children: tiles(3) },
  render: (args) => (
    <Frame>
      <Flex {...args} />
    </Frame>
  ),
} satisfies Meta<typeof Flex>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const ResponsiveDirection: Story = {
  args: { direction: { base: "column", md: "row" }, alignX: "center" },
  parameters: {
    docs: { description: { story: "Column below 48rem, row from 48rem; X stays centred." } },
  },
};

export const Reverse: Story = {
  args: { direction: "row-reverse", alignX: "start" },
};

export const Wrapping: Story = {
  render: () => (
    <Frame style={{ maxWidth: 360 }}>
      <Flex wrap spaceX="4" spaceY="2">
        {tiles(10)}
      </Flex>
    </Frame>
  ),
};

export const Distribution: Story = {
  render: () => (
    <div className="grid gap-3">
      {(["start", "center", "end", "between", "around", "evenly"] as const).map((justify) => (
        <Frame key={justify}>
          <Flex justify={justify} space="2">
            <Tile tone="muted">{justify}</Tile>
            <Tile>B</Tile>
            <Tile>C</Tile>
          </Flex>
        </Frame>
      ))}
    </div>
  ),
};
