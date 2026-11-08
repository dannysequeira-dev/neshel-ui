import { Stack } from "@neshel-ui/layout";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Frame, Tile, tiles } from "./demo";

const meta = {
  title: "Layout/Stack",
  component: Stack,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Vertical flex layout (`flex-direction: column`). `space` → `gap`, `spaceX` → `column-gap`, `spaceY` → `row-gap`; X → `align-items`, Y → `justify-content`; `justify` distributes the main axis. `space` cannot be combined with `spaceX`/`spaceY`.",
      },
    },
  },
  args: { space: "4", children: tiles(3) },
  render: (args) => (
    <Frame>
      <Stack {...args} />
    </Frame>
  ),
} satisfies Meta<typeof Stack>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Spacing: Story = {
  render: () => (
    <div className="grid gap-6 sm:grid-cols-3">
      {(["1", "4", "8"] as const).map((space) => (
        <Frame key={space}>
          <p className="mb-2 text-xs text-neshel-muted-foreground">space="{space}"</p>
          <Stack space={space}>{tiles(3)}</Stack>
        </Frame>
      ))}
    </div>
  ),
};

export const Alignment: Story = {
  render: () => (
    <div className="grid gap-6 sm:grid-cols-4">
      {(["start", "center", "end", "stretch"] as const).map((alignX) => (
        <Frame key={alignX}>
          <p className="mb-2 text-xs text-neshel-muted-foreground">alignX="{alignX}"</p>
          <Stack space="2" alignX={alignX}>
            <Tile>Short</Tile>
            <Tile>A longer item</Tile>
          </Stack>
        </Frame>
      ))}
    </div>
  ),
};

export const Justification: Story = {
  render: () => (
    <div className="grid gap-6 sm:grid-cols-3">
      {(["between", "around", "end"] as const).map((justify) => (
        <Frame key={justify} style={{ height: 220, display: "flex" }}>
          <Stack space="2" justify={justify} style={{ flex: 1 }}>
            <Tile>justify="{justify}"</Tile>
            <Tile>Item</Tile>
          </Stack>
        </Frame>
      ))}
    </div>
  ),
};

export const Responsive: Story = {
  render: () => (
    <Frame>
      <Stack spaceY={{ base: "2", md: "6", lg: "10" }} alignX={{ base: "start", lg: "center" }}>
        {tiles(3)}
      </Stack>
    </Frame>
  ),
  parameters: {
    docs: {
      description: {
        story: "Resize the canvas: gaps grow at 48rem and 64rem; items centre from 64rem.",
      },
    },
  },
};

export const Separators: Story = {
  render: () => (
    <div className="grid gap-6 sm:grid-cols-2">
      <Frame>
        <Stack separator space="3">
          {tiles(3)}
        </Stack>
      </Frame>
      <Frame>
        <Stack as="ul" separator space="2" aria-label="Settings sections">
          <li>Profile</li>
          <li>Preferences</li>
          <li>Notifications</li>
        </Stack>
      </Frame>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "The default separator is decorative (`aria-hidden`), uses `--neshel-border` and renders as an `li` inside lists. Spacing applies on both sides of each separator.",
      },
    },
  },
};
