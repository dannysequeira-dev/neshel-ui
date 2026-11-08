import { Inline } from "@neshel-ui/layout";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Frame, Tile, tiles } from "./demo";

const meta = {
  title: "Layout/Inline",
  component: Inline,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Horizontal flex layout (`flex-direction: row`). X → `justify-content`, Y → `align-items`; `wrap` enables `flex-wrap`. `separator` cannot be combined with `wrap`.",
      },
    },
  },
  args: { space: "3", children: tiles(4) },
  render: (args) => (
    <Frame>
      <Inline {...args} />
    </Frame>
  ),
} satisfies Meta<typeof Inline>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const IndependentXYSpacing: Story = {
  render: () => (
    <Frame style={{ maxWidth: 420 }}>
      <Inline spaceX="6" spaceY="1" wrap>
        {tiles(12, "Tag")}
      </Inline>
    </Frame>
  ),
};

export const AlignmentAndJustify: Story = {
  render: () => (
    <Inline space="4" alignY="center" justify="between">
      <Tile tone="primary">Neshel-UI</Tile>
      <Inline space="2">
        <Tile>Docs</Tile>
        <Tile>Components</Tile>
      </Inline>
      <Tile tone="accent" style={{ paddingBlock: 16 }}>
        Taller item
      </Tile>
    </Inline>
  ),
};

export const Baseline: Story = {
  render: () => (
    <Inline space="3" alignY="baseline">
      <span className="text-3xl font-semibold">42</span>
      <span className="text-sm text-neshel-muted-foreground">items</span>
    </Inline>
  ),
};

export const Separators: Story = {
  render: () => (
    <div className="grid gap-4">
      <Inline as="nav" aria-label="Breadcrumb" separator space="3" alignY="center">
        <a href="#home">Home</a>
        <a href="#docs">Docs</a>
        <span aria-current="page">Layout</span>
      </Inline>
      <Inline separator={<span aria-hidden="true">·</span>} space="2">
        <span>Rooted in faith</span>
        <span>Built with hope</span>
      </Inline>
    </div>
  ),
};

export const RightToLeft: Story = {
  render: () => (
    <div dir="rtl">
      <Frame>
        <Inline space="2" alignX="start">
          {tiles(3)}
        </Inline>
      </Frame>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Alignment keywords are logical: in RTL, `alignX="start"` is the right edge.',
      },
    },
  },
};
