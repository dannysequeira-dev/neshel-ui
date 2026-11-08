import { Stack } from "@neshel-ui/layout";
import { Caption, Heading } from "@neshel-ui/typography";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Frame } from "../layout/demo";

const meta = {
  title: "Typography/Heading",
  component: Heading,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Semantic heading (`h1`–`h6`, default `h2`). `as` chooses the level for the document outline; `size` chooses the visual scale and never changes the level. Trimmed with Capsize to the cap height and baseline.",
      },
    },
  },
  args: { as: "h2", children: "Rooted in faith. Built with hope." },
} satisfies Meta<typeof Heading>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Static: Story = {
  args: {
    as: "h1",
    size: "2xl",
    weight: "bold",
    tone: "primary",
    children: "Welcome to Neshel-UI",
  },
};

export const LevelDefaults: Story = {
  render: () => (
    <Stack space="6">
      {(["h1", "h2", "h3", "h4", "h5", "h6"] as const).map((level) => (
        <Heading key={level} as={level}>
          {level.toUpperCase()} — default size for this level
        </Heading>
      ))}
    </Stack>
  ),
};

export const SemanticsIndependentOfSize: Story = {
  name: "Semantics independent of size",
  render: () => (
    <Stack space="6">
      <Heading as="h2" size="5xl">
        A visually large h2
      </Heading>
      <Heading as="h1" size="lg">
        A visually small h1
      </Heading>
      <Caption>
        Screen readers announce the real levels (2 and 1); the outline is unchanged.
      </Caption>
    </Stack>
  ),
};

export const Responsive: Story = {
  name: "Responsive (custom breakpoints)",
  render: () => (
    <Frame>
      <Heading
        as="h1"
        size={{ base: "lg", phone: "xl", tablet: "3xl", lg: "4xl", "2xl": "5xl" }}
        weight={{ base: "medium", tablet: "bold" }}
        align={{ base: "center", lg: "start" }}
      >
        Resize the viewport: phone 30rem, tablet 52rem (configured), lg 64rem, 2xl 96rem
      </Heading>
    </Frame>
  ),
};

export const WeightsAndTones: Story = {
  render: () => (
    <Stack space="4">
      {(["light", "regular", "medium", "semibold", "bold"] as const).map((weight) => (
        <Heading key={weight} as="h3" size="2xl" weight={weight}>
          Weight {weight}
        </Heading>
      ))}
      {(["default", "muted", "primary", "destructive"] as const).map((tone) => (
        <Heading key={tone} as="h3" size="xl" tone={tone}>
          Tone {tone}
        </Heading>
      ))}
    </Stack>
  ),
};

export const BalancedWrap: Story = {
  render: () => (
    <Frame style={{ width: 360 }}>
      <Heading as="h2" size="3xl" wrap="balance">
        Beautiful typography begins with precision and patience
      </Heading>
    </Frame>
  ),
};
