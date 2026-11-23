import "@neshel-ui/animations/advanced.css";
import {
  CardFlip,
  CornerRecede,
  type CubeControl,
  CubeRotate,
  Glitch,
  type GlitchControl,
  type GridControl,
  PerspectiveGrid,
  RingCarousel,
  type RingControl,
  TiltShift,
} from "@neshel-ui/animations/advanced";
import { Tilt3D } from "@neshel-ui/animations/hover";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { type CSSProperties, useRef, useState } from "react";

interface Args {
  reducedMotion: "user" | "always" | "never";
}

const meta = {
  title: "Animations (experimental)/Advanced 3D (CSS)",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Phase 016, private package (`@neshel-ui/animations/advanced` + `advanced.css`). CSS 3D on the Motion Host: every consumer style is captured and restored exactly, hidden faces/panels/items are `inert` + `aria-hidden` (never focusable behind the perspective), decorative copies are inert and ID-free, and reduced motion follows the catalogue (fade, static, instant or off). This entry never loads WebGL.",
      },
    },
  },
  args: { reducedMotion: "user" },
  argTypes: { reducedMotion: { control: "inline-radio", options: ["user", "always", "never"] } },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

const card: CSSProperties = { width: 240, height: 160 };
const face = (background: string): CSSProperties => ({
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  boxSizing: "border-box",
  width: "100%",
  height: "100%",
  padding: 16,
  borderRadius: 12,
  background,
  color: "#fff",
});

export const D01CardFlip: Story = {
  render: (args) => {
    const [flipped, setFlipped] = useState(false);
    return (
      <CardFlip
        reducedMotion={args.reducedMotion}
        flipped={flipped}
        onFlippedChange={setFlipped}
        style={card}
        front={
          <div style={face("linear-gradient(135deg,#1e3a8a,#7c3aed)")}>
            <strong>Front</strong>
            <button type="button" data-neshel-flip-toggle>
              Show details
            </button>
          </div>
        }
        back={
          <div style={face("linear-gradient(135deg,#0f766e,#155e75)")}>
            <a href="#details" style={{ color: "#fff" }}>
              A link on the back
            </a>
            <button type="button" data-neshel-flip-toggle>
              Back
            </button>
          </div>
        }
      />
    );
  },
};

export const D02CubeRotation: Story = {
  render: (args) => {
    const cube = useRef<CubeControl | null>(null);
    return (
      <div style={{ display: "grid", gap: 8, justifyItems: "start" }}>
        <CubeRotate controlRef={cube} reducedMotion={args.reducedMotion} style={card}>
          {[210, 280, 340, 30].map((hue, i) => (
            <section key={hue} aria-label={`Panel ${i + 1}`} style={face(`hsl(${hue} 60% 35%)`)}>
              <strong>Panel {i + 1}</strong>
              <button type="button">Action {i + 1}</button>
            </section>
          ))}
        </CubeRotate>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={() => cube.current?.previous()}>
            Previous
          </button>
          <button type="button" onClick={() => cube.current?.next()}>
            Next
          </button>
        </div>
      </div>
    );
  },
};

export const D03RingCarousel: Story = {
  render: (args) => {
    const ring = useRef<RingControl | null>(null);
    return (
      <div style={{ display: "grid", gap: 8, justifyItems: "center" }}>
        <RingCarousel
          label="Featured destinations"
          controlRef={ring}
          reducedMotion={args.reducedMotion}
          style={{ height: 200, width: 520 }}
        >
          {["Lisbon", "Kyoto", "Quito", "Oslo", "Cusco", "Hanoi"].map((city) => (
            <article
              key={city}
              style={{
                ...face("linear-gradient(160deg,#334155,#1e293b)"),
                width: 150,
                height: 120,
              }}
            >
              <strong>{city}</strong>
              <a href={`#${city}`} style={{ color: "#bae6fd" }}>
                Explore
              </a>
            </article>
          ))}
        </RingCarousel>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={() => ring.current?.previous()}>
            Previous
          </button>
          <button type="button" onClick={() => ring.current?.next()}>
            Next
          </button>
        </div>
      </div>
    );
  },
};

export const D05CornerRecedeVsTilt3D: Story = {
  render: (args) => (
    <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
      <figure style={{ margin: 0 }}>
        <CornerRecede reducedMotion={args.reducedMotion} style={card}>
          <div style={face("linear-gradient(135deg,#1e3a8a,#7c3aed)")}>
            <strong>CornerRecede</strong>
            <span>The corner under the pointer folds away.</span>
            <a href="#more" style={{ color: "#fff" }}>
              Read more
            </a>
          </div>
        </CornerRecede>
        <figcaption>Hinged fold: the card plane stays flat.</figcaption>
      </figure>
      <figure style={{ margin: 0 }}>
        <Tilt3D maxTilt={12} reducedMotion={args.reducedMotion} style={card}>
          <div style={face("linear-gradient(135deg,#7c2d12,#be185d)")}>
            <strong>Tilt3D</strong>
            <span>The whole card rotates.</span>
          </div>
        </Tilt3D>
        <figcaption>Rigid tilt for comparison.</figcaption>
      </figure>
      <figure style={{ margin: 0 }}>
        <CornerRecede reverse flap="plain" reducedMotion={args.reducedMotion} style={card}>
          <div style={face("linear-gradient(135deg,#065f46,#0e7490)")}>
            <strong>reverse + plain flap</strong>
            <span>The corner lifts toward you.</span>
          </div>
        </CornerRecede>
        <figcaption>
          <code>reverse</code>; <code>flap="plain"</code> for content that cannot be copied.
        </figcaption>
      </figure>
    </div>
  ),
};

export const D07Glitch: Story = {
  render: (args) => {
    const glitch = useRef<GlitchControl | null>(null);
    return (
      <div style={{ display: "grid", gap: 8, justifyItems: "start" }}>
        <h2 style={{ fontSize: 36, letterSpacing: "0.06em", margin: 0 }}>
          <Glitch controlRef={glitch} reducedMotion={args.reducedMotion}>
            NESHEL SIGNAL
          </Glitch>
        </h2>
        <button type="button" onClick={() => glitch.current?.play()}>
          Play a burst (at most 3 slice changes per second)
        </button>
      </div>
    );
  },
};

export const D09PerspectiveGrid: Story = {
  render: (args) => {
    const grid = useRef<GridControl | null>(null);
    return (
      <div style={{ display: "grid", gap: 8 }}>
        <PerspectiveGrid
          controlRef={grid}
          reducedMotion={args.reducedMotion}
          color="rgb(168 85 247)"
          speed={1.5}
          style={{
            height: 240,
            borderRadius: 12,
            background: "linear-gradient(#0b1020 45%, #1e1b4b)",
            color: "#e9d5ff",
            display: "grid",
            placeItems: "start center",
          }}
        >
          <p style={{ marginTop: 24, fontWeight: 700 }}>Horizon</p>
        </PerspectiveGrid>
        <button type="button" onClick={() => grid.current?.play()}>
          Run again (5 s, finite by default)
        </button>
      </div>
    );
  },
};

export const D11TiltShift: Story = {
  render: (args) => {
    const [focus, setFocus] = useState(0.5);
    return (
      <div style={{ display: "grid", gap: 8, maxWidth: 560 }}>
        <TiltShift
          focus={focus}
          reducedMotion={args.reducedMotion}
          style={{ borderRadius: 12, overflow: "hidden" }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 6,
              padding: 6,
              background: "#0f172a",
            }}
          >
            {Array.from({ length: 16 }, (_, i) => (
              <span
                key={i}
                style={{
                  padding: "18px 8px",
                  borderRadius: 6,
                  background: "linear-gradient(135deg,#0ea5e9,#6366f1)",
                  color: "#fff",
                }}
              >
                Block {i + 1}
              </span>
            ))}
          </div>
        </TiltShift>
        <label>
          Focus{" "}
          <input
            type="range"
            min={10}
            max={90}
            value={Math.round(focus * 100)}
            onChange={(e) => setFocus(Number(e.currentTarget.value) / 100)}
          />
        </label>
      </div>
    );
  },
};
