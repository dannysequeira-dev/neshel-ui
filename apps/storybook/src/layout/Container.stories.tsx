import { Container } from "@neshel-ui/layout";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Tile } from "./demo";

const meta = {
  title: "Layout/Container",
  component: Container,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Width-constrained block (`width: 100%`, `margin-inline: auto`). `size` sets `max-width` (sm 40rem … 2xl 96rem, `full` = none; default `xl`); `gutter` sets inline padding.",
      },
    },
  },
  args: { size: "md", gutter: "4", children: <Tile>Constrained content</Tile> },
  render: (args) => (
    <div className="bg-neshel-muted py-4">
      <Container {...args} className="bg-neshel-surface" />
    </div>
  ),
} satisfies Meta<typeof Container>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Responsive: Story = {
  args: { size: { base: "full", lg: "lg" }, gutter: { base: "4", md: "8" } },
};
