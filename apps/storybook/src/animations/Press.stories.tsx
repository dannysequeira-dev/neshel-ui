import "@neshel-ui/animations/press.css";
import {
  burst,
  CheckboxDraw,
  ContentSwap,
  NumberTick,
  nudge,
  Press,
  pressScale,
  ripple,
  shake,
  ToggleMorph,
  tapBounce,
} from "@neshel-ui/animations/press";
import { Button } from "@neshel-ui/components";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

interface Args {
  reducedMotion: "user" | "always" | "never";
}

const meta = {
  title: "Animations (experimental)/Press & Microinteractions",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Phase 010, private package. `<Press preset={pressScale}>`, `<Press preset={[pressScale, ripple]}>` or triggered effects (`burst`, `shake`, `nudge`) with `options={{ trigger }}`. `ToggleMorph` and `CheckboxDraw` are decorative visuals inside native controls, which keep state and semantics; `NumberTick` keeps one accessible value; `ContentSwap` hides the inactive content. Shake is never the only error signal. Needs `@neshel-ui/animations/press.css` for ripple, burst, toggle, checkbox and swap.",
      },
    },
  },
  args: { reducedMotion: "user" },
  argTypes: { reducedMotion: { control: "inline-radio", options: ["user", "always", "never"] } },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

const row = { display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center" } as const;

function Microinteractions({ reducedMotion }: Args) {
  const [on, setOn] = useState(false);
  const [checked, setChecked] = useState(false);
  const [likes, setLikes] = useState(0);
  const [errors, setErrors] = useState(0);
  const [bell, setBell] = useState(0);
  const [count, setCount] = useState(1200);
  const [copied, setCopied] = useState(false);
  return (
    <div style={{ display: "grid", gap: 24 }}>
      <div style={row}>
        <Press preset={pressScale} options={{ reducedMotion }} asChild>
          <Button>P01 press scale</Button>
        </Press>
        <Press preset={ripple} options={{ reducedMotion }} asChild>
          <Button variant="secondary">P02 ripple</Button>
        </Press>
        <Press preset={tapBounce} options={{ reducedMotion }} asChild>
          <Button variant="outline">P03 tap bounce</Button>
        </Press>
      </div>
      <div style={row}>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          onClick={() => setOn((v) => !v)}
          style={{
            display: "inline-flex",
            gap: 8,
            alignItems: "center",
            background: "none",
            border: 0,
            font: "inherit",
            color: "inherit",
          }}
        >
          <ToggleMorph checked={on} reducedMotion={reducedMotion} /> P04 notifications
        </button>
        <label style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
          <input
            type="checkbox"
            checked={checked}
            onChange={(event) => setChecked(event.target.checked)}
            style={{ position: "absolute", opacity: 0, width: 1, height: 1 }}
          />
          <CheckboxDraw checked={checked} reducedMotion={reducedMotion} /> P05 I agree
        </label>
      </div>
      <div style={row}>
        <Press preset={burst} options={{ trigger: likes, reducedMotion }} asChild>
          <Button aria-pressed={likes % 2 === 1} onClick={() => setLikes((v) => v + 1)}>
            P06 like ({likes})
          </Button>
        </Press>
        <Press preset={nudge} options={{ trigger: bell, repeat: 1, reducedMotion }} asChild>
          <Button variant="secondary" onClick={() => setBell((v) => v + 1)}>
            P08 nudge
          </Button>
        </Press>
      </div>
      <form
        style={row}
        onSubmit={(event) => {
          event.preventDefault();
          setErrors((v) => v + 1);
        }}
      >
        <Press preset={shake} options={{ trigger: errors, reducedMotion }} asChild>
          <input
            aria-label="Code"
            aria-invalid={errors > 0}
            aria-describedby="code-error"
            defaultValue="1234"
          />
        </Press>
        <Button type="submit">P07 verify</Button>
        <span id="code-error" role="alert">
          {errors > 0 ? "That code is not valid." : ""}
        </span>
      </form>
      <div style={row}>
        <NumberTick
          value={count}
          reducedMotion={reducedMotion}
          live="polite"
          style={{ fontSize: 28, fontVariantNumeric: "tabular-nums" }}
        />
        <Button variant="outline" onClick={() => setCount((v) => v + 250)}>
          P09 +250
        </Button>
        <Button
          onClick={() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          <ContentSwap active={copied} confirm="Copied ✓" reducedMotion={reducedMotion}>
            P10 copy link
          </ContentSwap>
        </Button>
      </div>
    </div>
  );
}

export const Gallery: Story = { render: (args) => <Microinteractions {...args} /> };

export const ReducedMotion: Story = {
  args: { reducedMotion: "always" },
  parameters: {
    docs: {
      description: {
        story:
          '`reducedMotion: "always"`: press scale keeps half the amplitude without spring; ripple only fades; shake keeps a third of the amplitude; tap bounce, nudge and burst are off; toggle, checkbox and number tick change instantly; content swap only fades.',
      },
    },
  },
  render: (args) => <Microinteractions {...args} />,
};
