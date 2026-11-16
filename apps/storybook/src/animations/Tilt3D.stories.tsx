import { Tilt3D } from "@neshel-ui/animations";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@neshel-ui/components";
import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = {
  title: "Animations (experimental)/Tilt3D",
  component: Tilt3D,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Experimental, private package (feature 008.0). Tilts toward the pointer with a spring return; keyboard focus inside shows a gentle pose; `prefers-reduced-motion` keeps it flat. No React render per pointer move. `asChild` applies the effect to your own element.",
      },
    },
  },
  args: { maxTilt: 10, perspective: 1000, scale: 1, axis: "both", reverse: false, focusTilt: true },
  argTypes: {
    maxTilt: { control: { type: "range", min: 0, max: 45, step: 1 } },
    perspective: { control: { type: "range", min: 200, max: 3000, step: 50 } },
    scale: { control: { type: "range", min: 0.9, max: 1.2, step: 0.01 } },
    axis: { control: "inline-radio", options: ["both", "x", "y"] },
    reducedMotion: { control: "inline-radio", options: ["user", "always", "never"] },
  },
} satisfies Meta<typeof Tilt3D>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithCard: Story = {
  render: (args) => (
    <div style={{ maxWidth: 360, padding: 32 }}>
      <Tilt3D {...args} asChild>
        <Card>
          <CardHeader>
            <CardTitle>Pro plan</CardTitle>
            <CardDescription>Hover, or Tab to the button, to see the tilt.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button>Choose plan</Button>
          </CardContent>
        </Card>
      </Tilt3D>
    </div>
  ),
};

export const ReducedMotionAlways: Story = {
  args: { reducedMotion: "always" },
  render: WithCard.render,
};
