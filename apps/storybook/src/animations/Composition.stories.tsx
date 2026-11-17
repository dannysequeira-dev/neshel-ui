import "@neshel-ui/animations/styles.css";
import { fadeUp, Reveal } from "@neshel-ui/animations/entrance";
import { glow, Hover, lift, Tilt3D } from "@neshel-ui/animations/hover";
import { Press, pressScale, ripple } from "@neshel-ui/animations/press";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@neshel-ui/components";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

const meta = {
  title: "Animations (experimental)/Composition",
  parameters: {
    docs: {
      description: {
        component:
          "Entrance + Hover (lift, glow) + Press (scale, ripple) + Tilt3D on ONE element through nested `asChild`. Every effect writes through the element's motion host: transform layers compose, opacity multiplies, decor lives on package-owned layers; destroying any effect leaves the others exact.",
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function EveryFamily() {
  const [key, setKey] = useState(0);
  return (
    <div style={{ display: "grid", gap: 16, maxWidth: 360 }}>
      <div>
        <Button variant="outline" onClick={() => setKey((value) => value + 1)}>
          Replay entrance
        </Button>
      </div>
      <Reveal preset={fadeUp} replayKey={key} asChild>
        <Hover preset={[lift, glow]} asChild>
          <Press preset={[pressScale, ripple]} asChild>
            <Tilt3D asChild maxTilt={8}>
              <Card tabIndex={0} aria-label="Pro plan">
                <CardHeader>
                  <CardTitle>Pro plan</CardTitle>
                  <CardDescription>Hover, press or Tab here.</CardDescription>
                </CardHeader>
                <CardContent>Entrance · lift · glow · press · ripple · tilt</CardContent>
              </Card>
            </Tilt3D>
          </Press>
        </Hover>
      </Reveal>
    </div>
  );
}

export const EveryFamilyOnOneCard: Story = { render: () => <EveryFamily /> };
