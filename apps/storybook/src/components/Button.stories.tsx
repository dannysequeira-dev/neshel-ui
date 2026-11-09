import { Button } from "@neshel-ui/components";
import { Inline, Stack } from "@neshel-ui/layout";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { PlusIcon, TrashIcon } from "./icons";

const meta = {
  title: "Components/Foundation/Button",
  component: Button,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          'Native `<button type="button">` by default. `asChild` renders a link or router link with button styles (links are never disabled). `loading` keeps focus (`aria-disabled`), ignores activation and form submission and shows a decorative spinner; announce progress with your own live region. Icon-only buttons need `aria-label`.',
      },
    },
  },
  args: { children: "Continue" },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Variants: Story = {
  render: () => (
    <Inline space="3" alignY="center">
      {(["primary", "secondary", "outline", "ghost", "destructive", "link"] as const).map(
        (variant) => (
          <Button key={variant} variant={variant}>
            {variant}
          </Button>
        ),
      )}
    </Inline>
  ),
};

export const Sizes: Story = {
  render: () => (
    <Inline space="3" alignY="center">
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
    </Inline>
  ),
};

/** Uses this Storybook's custom breakpoints (`phone`, `tablet`, from neshel.config.ts). */
export const ResponsiveSize: Story = {
  args: { size: { base: "sm", tablet: "lg" }, children: "Resize the viewport" },
};

export const States: Story = {
  render: () => (
    <Inline space="3" alignY="center">
      <Button disabled>Disabled</Button>
      <Button loading>Saving</Button>
      <Button variant="outline" loading>
        Loading outline
      </Button>
    </Inline>
  ),
};

export const WithIcons: Story = {
  render: () => (
    <Inline space="3" alignY="center">
      <Button>
        <PlusIcon /> New project
      </Button>
      <Button iconOnly aria-label="Add item" variant="outline">
        <PlusIcon />
      </Button>
      <Button iconOnly aria-label="Delete item" variant="destructive" size="sm">
        <TrashIcon />
      </Button>
    </Inline>
  ),
};

export const AsChildLink: Story = {
  render: () => (
    <Stack space="3">
      <Button asChild variant="ghost">
        <a href="#documentation">Documentation</a>
      </Button>
      <Button asChild fullWidth>
        <a href="#start">Full-width link</a>
      </Button>
    </Stack>
  ),
};
