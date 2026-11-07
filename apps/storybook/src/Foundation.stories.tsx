import type { Meta, StoryObj } from "@storybook/react-vite";

function Foundation() {
  return (
    <section className="rounded-2xl border border-neshel-border bg-neshel-background p-8 text-neshel-foreground">
      <span className="text-sm font-semibold text-neshel-primary">Neshel-UI</span>
      <h1 className="mt-2 text-2xl font-semibold">Foundation baseline</h1>
      <p className="mt-3 max-w-md text-sm">
        Storybook is wired. Package stories will be implemented with the feature slices.
      </p>
    </section>
  );
}

const meta = {
  title: "Foundations/Welcome",
  component: Foundation,
} satisfies Meta<typeof Foundation>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
