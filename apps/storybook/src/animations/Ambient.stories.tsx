import "@neshel-ui/animations/ambient.css";
import {
  AmbientMotionToggle,
  Aurora,
  FloatingShapes,
  GradientShift,
  Grain,
  GridPattern,
  MeshGradient,
  Particles,
  PointerGlow,
  Starfield,
  Waves,
} from "@neshel-ui/animations/ambient";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { CSSProperties, ReactNode } from "react";

interface Args {
  reducedMotion: "user" | "always" | "never";
  infinite: boolean;
}

const meta = {
  title: "Animations (experimental)/Background & Ambient",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Phase 015, private package (`@neshel-ui/animations/ambient` + `ambient.css`). Decorative only: layers and canvases are `aria-hidden`, never intercept the pointer and sit behind the content. They move only while on screen, on a visible page, without reduced motion and while the page toggle allows it; finite by default (5 s of motion) — `duration: Infinity` is explicit and pairs with `<AmbientMotionToggle>` (WCAG 2.2.2). CSS layers use soft radial gradients and transforms (no `filter: blur`); particles and stars use a bounded Canvas 2D surface.",
      },
    },
  },
  args: { reducedMotion: "user", infinite: false },
  argTypes: {
    reducedMotion: { control: "inline-radio", options: ["user", "always", "never"] },
    infinite: { control: "boolean", description: "duration: Infinity (with the page toggle)" },
  },
  decorators: [
    (Story) => (
      <div style={{ display: "grid", gap: 12 }}>
        <div>
          <AmbientMotionToggle />
        </div>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

const box = (extra: CSSProperties = {}): CSSProperties => ({
  height: 220,
  borderRadius: 16,
  overflow: "hidden",
  padding: 24,
  display: "grid",
  alignContent: "end",
  ...extra,
});
const options = (args: Args) => ({
  reducedMotion: args.reducedMotion,
  duration: args.infinite ? Number.POSITIVE_INFINITY : 5000,
});
const Copy = ({ title, children }: { title: string; children?: ReactNode }) => (
  <div>
    <h3 style={{ margin: 0 }}>{title}</h3>
    {children ?? <p style={{ margin: "4px 0 0" }}>Content stays above and fully interactive.</p>}
  </div>
);

export const B01GradientShift: Story = {
  render: (args) => (
    <GradientShift {...options(args)} style={box({ color: "#fff" })}>
      <Copy title="Gradient shift" />
    </GradientShift>
  ),
};
export const B02Aurora: Story = {
  render: (args) => (
    <Aurora {...options(args)} style={box({ background: "#0b1020", color: "#fff" })}>
      <Copy title="Aurora" />
    </Aurora>
  ),
};
export const B03Grain: Story = {
  render: (args) => (
    <Grain {...options(args)} jitter style={box({ background: "#e8e1d6" })}>
      <Copy title="Grain">
        <p style={{ margin: "4px 0 0" }}>
          One shared static texture; optional stepped jitter (≤ 8 Hz).
        </p>
      </Copy>
    </Grain>
  ),
};
export const B04Particles: Story = {
  render: (args) => (
    <Particles
      {...options(args)}
      links
      density={14}
      style={box({ background: "#0b1020", color: "#cbd5ff" })}
    >
      <Copy title="Particles" />
    </Particles>
  ),
};
export const B05Starfield: Story = {
  render: (args) => (
    <Starfield {...options(args)} style={box({ background: "#020617", color: "#fff" })}>
      <Copy title="Starfield" />
    </Starfield>
  ),
};
export const B06GridPattern: Story = {
  render: (args) => (
    <GridPattern {...options(args)} pattern="dots" style={box()}>
      <Copy title="Animated dots" />
    </GridPattern>
  ),
};
export const B07MeshGradient: Story = {
  render: (args) => (
    <MeshGradient {...options(args)} style={box({ color: "#fff" })}>
      <Copy title="Mesh gradient" />
    </MeshGradient>
  ),
};
export const B08FloatingShapes: Story = {
  render: (args) => (
    <FloatingShapes
      {...options(args)}
      style={box({
        display: "flex",
        gap: 32,
        alignItems: "center",
        fontSize: 40,
        color: "#6d5dfc",
      })}
    >
      <span aria-hidden="true">●</span>
      <span aria-hidden="true">▲</span>
      <span aria-hidden="true">■</span>
      <span aria-hidden="true">◆</span>
    </FloatingShapes>
  ),
};
export const B09PointerGlow: Story = {
  render: (args) => (
    <PointerGlow
      reducedMotion={args.reducedMotion}
      style={box({ background: "#111827", color: "#fff" })}
    >
      <Copy title="Pointer glow">
        <p style={{ margin: "4px 0 0" }}>
          Move a mouse or pen over the card (touch scrolls the page).
        </p>
      </Copy>
    </PointerGlow>
  ),
};
export const B10Waves: Story = {
  render: (args) => (
    <Waves {...options(args)} style={box({ color: "#2563eb" })}>
      <Copy title="Waves" />
    </Waves>
  ),
};
