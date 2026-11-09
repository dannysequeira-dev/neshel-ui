import { Badge, Input, Label, Separator, Skeleton } from "@neshel-ui/components";
import { Inline, Stack } from "@neshel-ui/layout";
import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = {
  title: "Components/Foundation/Badge, Input, Separator, Skeleton",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Badge is a non-interactive status label (no role). Input is a native input; `uiSize` styles it and the native `size` attribute keeps its meaning; `invalid` sets `aria-invalid`. Separator is semantic unless `decorative`. Skeleton is decorative (`aria-hidden`): mark the loading region with `aria-busy` and announce completion yourself.",
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Badges: Story = {
  render: () => (
    <Inline space="2" alignY="center">
      {(
        ["default", "secondary", "outline", "success", "warning", "destructive", "accent"] as const
      ).map((variant) => (
        <Badge key={variant} variant={variant}>
          {variant}
        </Badge>
      ))}
      <Badge size="sm" variant="success">
        Completed
      </Badge>
    </Inline>
  ),
};

export const Inputs: Story = {
  render: () => (
    <Stack space="4" style={{ maxWidth: 360 }}>
      <Stack space="1.5">
        <Label htmlFor="email" required>
          Email
        </Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="ana@example.com"
          required
        />
      </Stack>
      <Stack space="1.5">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" autoComplete="current-password" />
      </Stack>
      <Stack space="1.5">
        <Label htmlFor="username">Username</Label>
        <Input id="username" invalid aria-describedby="username-error" defaultValue="ana!" />
        <p
          id="username-error"
          style={{ margin: 0, color: "var(--neshel-destructive)", fontSize: "0.875rem" }}
        >
          Use letters and numbers only.
        </p>
      </Stack>
      <Input aria-label="Read only" readOnly defaultValue="Read only" />
      <Input aria-label="Disabled" disabled defaultValue="Disabled" />
      <Inline space="2">
        <Input aria-label="Small" uiSize="sm" placeholder="sm" />
        <Input aria-label="Large" uiSize="lg" placeholder="lg" />
      </Inline>
    </Stack>
  ),
};

export const Separators: Story = {
  render: () => (
    <Stack space="4">
      <p style={{ margin: 0 }}>Above</p>
      <Separator />
      <Inline space="3" alignY="stretch" style={{ height: 24 }}>
        <span>Left</span>
        <Separator orientation="vertical" decorative />
        <span>Right</span>
      </Inline>
    </Stack>
  ),
};

export const Skeletons: Story = {
  render: () => (
    <section aria-busy="true" aria-label="Loading profile">
      <Inline space="3" alignY="center">
        <Skeleton shape="circle" width={48} />
        <Stack space="2" style={{ flex: 1 }}>
          <Skeleton shape="text" width="60%" />
          <Skeleton shape="text" width="40%" />
        </Stack>
      </Inline>
      <Skeleton height={120} style={{ marginTop: 16 }} />
    </section>
  ),
};
