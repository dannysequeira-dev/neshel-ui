import type { PresetInput } from "@neshel-ui/animations/core";
import {
  blurIn,
  clipCircle,
  clipReveal,
  type EntranceOptions,
  fadeDown,
  fadeIn,
  fadeLeft,
  fadeRight,
  fadeUp,
  flipX,
  flipY,
  maskWipe,
  Reveal,
  rotateIn,
  Stagger,
  scaleIn,
  springIn,
  zoomIn,
} from "@neshel-ui/animations/entrance";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@neshel-ui/components";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

const PRESETS: Record<string, PresetInput<EntranceOptions, unknown>> = {
  "E01 fadeIn": fadeIn,
  "E02 fadeUp": fadeUp,
  "E02 fadeDown": fadeDown,
  "E02 fadeLeft": fadeLeft,
  "E02 fadeRight": fadeRight,
  "E03 scaleIn": scaleIn,
  "E04 zoomIn": zoomIn,
  "E05 blurIn": blurIn,
  "E06 clipReveal": clipReveal,
  "E06 clipCircle": clipCircle,
  "E07 maskWipe": maskWipe,
  "E08 rotateIn": rotateIn,
  "E09 flipX": flipX,
  "E09 flipY": flipY,
  "E11 springIn": springIn,
};

interface Args {
  preset: keyof typeof PRESETS;
  duration: number;
  delay: number;
  reducedMotion: "user" | "always" | "never";
}

const meta = {
  title: "Animations (experimental)/Entrance & Reveal",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          'Phase 010, private package. `<Reveal preset={…}>` plays an entrance when it mounts on the client or when `replayKey` changes; content is visible without JavaScript and is not hidden again while hydrating server markup (`appear="client"`). Entrances render through the motion host (transform layer + opacity contribution), so they compose with Tilt3D, hover and press effects. No stylesheet needed.',
      },
    },
  },
  args: { preset: "E02 fadeUp", duration: 320, delay: 0, reducedMotion: "user" },
  argTypes: {
    preset: { control: "select", options: Object.keys(PRESETS) },
    duration: { control: { type: "range", min: 0, max: 2000, step: 20 } },
    delay: { control: { type: "range", min: 0, max: 2000, step: 20 } },
    reducedMotion: { control: "inline-radio", options: ["user", "always", "never"] },
  },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

function Replayable({ children }: { children: (key: number) => React.ReactNode }) {
  const [key, setKey] = useState(0);
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div>
        <Button onClick={() => setKey((value) => value + 1)}>Replay</Button>
      </div>
      {children(key)}
    </div>
  );
}

export const Playground: Story = {
  render: ({ preset, duration, delay, reducedMotion }) => (
    <Replayable>
      {(key) => (
        <Reveal
          preset={PRESETS[preset] ?? fadeUp}
          options={{ duration, delay, reducedMotion }}
          replayKey={key}
          asChild
        >
          <Card style={{ maxWidth: 360 }}>
            <CardHeader>
              <CardTitle>{preset}</CardTitle>
            </CardHeader>
            <CardContent>Visible without JavaScript; animated on client mounts.</CardContent>
          </Card>
        </Reveal>
      )}
    </Replayable>
  ),
};

export const Gallery: Story = {
  render: ({ reducedMotion }) => (
    <Replayable>
      {(key) => (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(10rem, 1fr))",
            gap: 16,
          }}
        >
          {Object.entries(PRESETS).map(([name, preset]) => (
            <Reveal key={name} preset={preset} options={{ reducedMotion }} replayKey={key} asChild>
              <Card>
                <CardContent style={{ paddingTop: 16 }}>{name}</CardContent>
              </Card>
            </Reveal>
          ))}
        </div>
      )}
    </Replayable>
  ),
};

export const StaggeredChildren: Story = {
  name: "E10 Stagger",
  render: ({ reducedMotion }) => (
    <Replayable>
      {(key) => (
        <Stagger preset={fadeUp} interval={70} reducedMotion={reducedMotion} replayKey={key}>
          {["Plan", "Build", "Ship", "Learn"].map((label) => (
            <Card key={label} style={{ marginBottom: 8, maxWidth: 320 }}>
              <CardContent style={{ paddingTop: 16 }}>{label}</CardContent>
            </Card>
          ))}
        </Stagger>
      )}
    </Replayable>
  ),
};

export const ReducedMotion: Story = {
  args: { reducedMotion: "always" },
  parameters: {
    docs: {
      description: {
        story:
          '`reducedMotion: "always"`: fade entrances only fade (no movement, blur, clip or mask); instant entrances (fade, clip, mask) show the content at once.',
      },
    },
  },
  render: Gallery.render,
};
