import "@neshel-ui/animations/hover.css";
import {
  borderSweep,
  glow,
  Hover,
  lift,
  magnetic,
  mediaZoom,
  parallax,
  shine,
  spotlight,
  Tilt3D,
  underline,
} from "@neshel-ui/animations/hover";
import { Button, Card, CardContent } from "@neshel-ui/components";
import type { Meta, StoryObj } from "@storybook/react-vite";

interface Args {
  reducedMotion: "user" | "always" | "never";
  touch: boolean;
}

const meta = {
  title: "Animations (experimental)/Hover & Pointer",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Phase 010, private package. `<Hover preset={lift}>` or `<Hover preset={[lift, glow]}>` on a `<div>` or, with `asChild`, your own element. Effects react to mouse/pen (touch opt-in) and to keyboard `:focus-visible`; decor (shadow, glow, spotlight, underline, shine, ring) renders on the package's own `::before`/`::after` layers from `@neshel-ui/animations/hover.css`, never through transitions on your element. Tab through the gallery to see the keyboard states.",
      },
    },
  },
  args: { reducedMotion: "user", touch: false },
  argTypes: { reducedMotion: { control: "inline-radio", options: ["user", "always", "never"] } },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(11rem, 1fr))",
  gap: 20,
};
const tile = { minHeight: 96, display: "grid", placeItems: "center", padding: 16 } as const;
const MEDIA = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200"><rect width="320" height="200" fill="#1e3a8a"/><circle cx="230" cy="70" r="40" fill="#fde68a"/></svg>',
)}`;

export const Gallery: Story = {
  render: ({ reducedMotion, touch }) => {
    const o = {
      reducedMotion,
      pointerTypes: touch ? (["mouse", "pen", "touch"] as const) : undefined,
    };
    return (
      <div style={grid}>
        <Hover preset={lift} options={o} asChild>
          <Card style={tile}>H01 lift</Card>
        </Hover>
        <Hover preset={glow} options={o} asChild>
          <Button>H02 glow</Button>
        </Hover>
        <Tilt3D asChild reducedMotion={reducedMotion}>
          <Card style={tile}>H03 Tilt3D</Card>
        </Tilt3D>
        <Hover preset={magnetic} options={o} asChild>
          <Button variant="secondary">H04 magnetic</Button>
        </Hover>
        <Hover preset={spotlight} options={{ ...o, intensity: 0.4 }} asChild>
          <Card style={{ ...tile, background: "#111827", color: "#f9fafb" }}>H05 spotlight</Card>
        </Hover>
        <Hover preset={borderSweep} options={o} asChild>
          <Card style={tile}>H06 border sweep</Card>
        </Hover>
        <Card style={tile}>
          <Hover preset={underline} options={o} asChild>
            <a href="#underline">H07 underline grow</a>
          </Hover>
        </Card>
        <Hover preset={mediaZoom} options={o} asChild>
          <Card style={{ padding: 0 }}>
            <img src={MEDIA} alt="Night sky" style={{ display: "block", width: "100%" }} />
          </Card>
        </Hover>
        <Hover preset={parallax} options={o} asChild>
          <Card style={{ ...tile, position: "relative", overflow: "hidden" }}>
            <span
              data-neshel-depth="0.4"
              style={{
                position: "absolute",
                inset: "25%",
                borderRadius: "50%",
                background: "rgb(99 102 241 / 0.3)",
              }}
            />
            <span data-neshel-depth="1" style={{ position: "relative", fontWeight: 600 }}>
              H09 parallax
            </span>
          </Card>
        </Hover>
        <Hover preset={shine} options={o} asChild>
          <Button>H10 shine</Button>
        </Hover>
      </div>
    );
  },
};

export const Composed: Story = {
  name: "Lift + glow + spotlight + Tilt3D (one element)",
  render: ({ reducedMotion }) => (
    <Hover preset={[lift, glow, spotlight]} asChild>
      <Tilt3D asChild maxTilt={8} reducedMotion={reducedMotion}>
        <Card style={{ ...tile, maxWidth: 320, minHeight: 160 }}>
          <CardContent>Every layer composes through the motion host.</CardContent>
        </Card>
      </Tilt3D>
    </Hover>
  ),
};

export const ReducedMotion: Story = {
  args: { reducedMotion: "always" },
  parameters: {
    docs: {
      description: {
        story:
          '`reducedMotion: "always"`: lift keeps its shadow without moving; glow, spotlight (centred) and the ring appear statically; magnetic, parallax and shine are off; Tilt3D stays flat.',
      },
    },
  },
  render: Gallery.render,
};
