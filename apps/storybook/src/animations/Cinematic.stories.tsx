import "@neshel-ui/animations/cinematic.css";
import "@neshel-ui/animations/scroll.css";
import {
  CameraStage,
  Chapter,
  CurtainReveal,
  DepthOfField,
  Letterbox,
  SceneChapters,
  SceneSegment,
  SplitReveal,
  Spotlight,
  Storyboard,
  StoryboardFrame,
  TitleSequence,
  useCamera,
  useTimeline,
} from "@neshel-ui/animations/cinematic";
import { fadeLeft, fadeUp } from "@neshel-ui/animations/entrance";
import { ScrollScene, useScrollScene } from "@neshel-ui/animations/scroll";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { type CSSProperties, useRef, useState } from "react";

interface Args {
  reducedMotion: "user" | "always" | "never";
}

const meta = {
  title: "Animations (experimental)/Cinematic & Scenes",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Phase 013, private package (`@neshel-ui/animations/cinematic` + `cinematic.css`). The timeline (C01) is a pure function of time on the shared 009 scheduler; every effect renders through the Motion Host, so it composes with Entrance, Hover, Press, Scroll, Gestures and Layout. Server markup is the visible content; package layers (covers, lens, bars) are `aria-hidden` and only shown by JavaScript. Autoplay is opt-in and pausable (WCAG 2.2.2); reduced motion shows end states or short fades.",
      },
    },
  },
  args: { reducedMotion: "user" },
  argTypes: { reducedMotion: { control: "inline-radio", options: ["user", "always", "never"] } },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

const panel: CSSProperties = {
  minHeight: 120,
  padding: 16,
  borderRadius: 12,
  background: "var(--neshel-muted, #f1f5f9)",
};
const row: CSSProperties = { display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 };
const box: CSSProperties = { width: 36, height: 20, borderRadius: 4, background: "#6366f1" };

function TimelineDemo({ reducedMotion }: Args) {
  const boxes = useRef<Array<HTMLDivElement | null>>([]);
  const timeline = useTimeline(
    (tl) => {
      const [a, b, c] = boxes.current;
      if (!a || !b || !c) return;
      tl.add({ target: a, to: { x: 200 }, duration: 700 });
      tl.label("overlap", "-=300");
      tl.add({ target: b, to: { x: 200, rotate: 180 }, duration: 700 }, "overlap");
      tl.add({ target: c, from: { opacity: 0.2 }, to: { x: 200 }, duration: 500 }, "<+=150");
    },
    [reducedMotion],
    { reducedMotion },
  );
  return (
    <div>
      <div style={{ display: "grid", gap: 8 }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={box}
            ref={(node) => {
              boxes.current[i] = node;
            }}
          />
        ))}
      </div>
      <div style={row}>
        <button type="button" onClick={() => timeline.play()}>
          Play
        </button>
        <button type="button" onClick={() => timeline.pause()}>
          Pause
        </button>
        <button type="button" onClick={() => timeline.reverse()}>
          Reverse
        </button>
        <button type="button" onClick={() => timeline.seek(0.5)}>
          Seek 50%
        </button>
      </div>
    </div>
  );
}

function Chapters() {
  const scene = useScrollScene();
  return (
    <SceneChapters source={scene} style={{ display: "grid", gap: 16, padding: 32 }}>
      <Chapter id="story-intro">
        <SceneSegment effect={fadeUp} options={{ distance: 40 }}>
          <h3>Chapter 1 — Arrival</h3>
        </SceneSegment>
      </Chapter>
      <Chapter id="story-middle" weight={2}>
        <SceneSegment from={{ x: -120, opacity: 0 }} span={[0, 0.6]}>
          <p>Chapter 2 — scrubbed by the scroll scene (CSS sticky pin, no hijacking)</p>
        </SceneSegment>
      </Chapter>
      <Chapter id="story-end">
        <SceneSegment from={{ scale: 0.6, opacity: 0 }}>
          <p>Chapter 3 — home</p>
        </SceneSegment>
      </Chapter>
    </SceneChapters>
  );
}

function CameraDemo({ reducedMotion }: Args) {
  const camera = useCamera();
  const cards = useRef<Array<HTMLButtonElement | null>>([]);
  return (
    <div>
      <CameraStage
        label="Map"
        camera={camera}
        minZoom={0.25}
        reducedMotion={reducedMotion}
        style={{ height: 260, border: "1px solid #cbd5e1", borderRadius: 12 }}
      >
        <div
          style={{ display: "grid", gridTemplateColumns: "repeat(3, 320px)", gap: 40, padding: 40 }}
        >
          {["North", "East", "South", "West", "Harbour", "Summit"].map((name, i) => (
            <button
              type="button"
              key={name}
              style={{
                height: 200,
                borderRadius: 12,
                border: "2px solid #4f46e5",
                background: "#fff",
              }}
              ref={(node) => {
                cards.current[i] = node;
              }}
            >
              {name}
            </button>
          ))}
        </div>
      </CameraStage>
      <div style={row}>
        {["North", "Harbour", "Summit"].map((name) => {
          const index = ["North", "East", "South", "West", "Harbour", "Summit"].indexOf(name);
          return (
            <button
              type="button"
              key={name}
              onClick={() => {
                const card = cards.current[index];
                if (card) void camera.to({ focus: card });
              }}
            >
              Focus {name}
            </button>
          );
        })}
        <button type="button" onClick={() => void camera.to({ x: 560, y: 300, zoom: 0.3 })}>
          Overview
        </button>
      </div>
    </div>
  );
}

function RevealsDemo({ reducedMotion }: Args) {
  const [split, setSplit] = useState(false);
  const [curtain, setCurtain] = useState(false);
  const [shutter, setShutter] = useState(false);
  const [boxed, setBoxed] = useState(false);
  return (
    <div
      style={{
        display: "grid",
        gap: 16,
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
      }}
    >
      <div>
        <SplitReveal open={split} reducedMotion={reducedMotion} style={panel}>
          <p>C04 split-screen reveal</p>
        </SplitReveal>
        <button type="button" onClick={() => setSplit(!split)}>
          {split ? "Close" : "Open"}
        </button>
      </div>
      <div>
        <CurtainReveal open={curtain} reducedMotion={reducedMotion} style={panel}>
          <p>C05 curtain</p>
        </CurtainReveal>
        <button type="button" onClick={() => setCurtain(!curtain)}>
          Curtain
        </button>
      </div>
      <div>
        <CurtainReveal open={shutter} pattern="shutter" reducedMotion={reducedMotion} style={panel}>
          <p>C05 shutter</p>
        </CurtainReveal>
        <button type="button" onClick={() => setShutter(!shutter)}>
          Shutter
        </button>
      </div>
      <div>
        <Letterbox active={boxed} reducedMotion={reducedMotion} style={{ ...panel, height: 160 }}>
          <p>C10 letterbox</p>
        </Letterbox>
        <button type="button" onClick={() => setBoxed(!boxed)}>
          Cinema bars
        </button>
      </div>
    </div>
  );
}

function FocusDemo({ reducedMotion }: Args) {
  const [lit, setLit] = useState<number | null>(null);
  const [depth, setDepth] = useState(-1);
  const [run, setRun] = useState(0);
  const items = useRef<Array<HTMLLIElement | null>>([]);
  return (
    <div style={{ display: "grid", gap: 24 }}>
      <div>
        <TitleSequence
          effect={fadeLeft}
          interval={140}
          replay={run}
          appear="manual"
          reducedMotion={reducedMotion}
          background={
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(135deg,#e0e7ff,#fce7f3)",
              }}
            />
          }
          style={{ ...panel, background: "transparent" }}
        >
          <h3>Rooted in faith</h3>
          <p>Built with hope</p>
        </TitleSequence>
        <button type="button" onClick={() => setRun((n) => n + 1)}>
          C06 play title
        </button>
      </div>
      <div>
        <Spotlight
          target={lit === null ? null : items.current[lit]}
          radius={60}
          reducedMotion={reducedMotion}
          style={panel}
        >
          <ul
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 24,
              listStyle: "none",
              padding: 16,
              margin: 0,
            }}
          >
            {["Plan", "Build", "Ship"].map((item, i) => (
              <li
                key={item}
                ref={(node) => {
                  items.current[i] = node;
                }}
              >
                {item}
              </li>
            ))}
          </ul>
        </Spotlight>
        <div style={row}>
          {[0, 1, 2].map((i) => (
            <button type="button" key={i} onClick={() => setLit(i)}>
              C07 light {i + 1}
            </button>
          ))}
          <button type="button" onClick={() => setLit(null)}>
            Clear
          </button>
        </div>
      </div>
      <div>
        <DepthOfField
          focus={depth}
          reducedMotion={reducedMotion}
          style={{ display: "grid", gap: 6 }}
        >
          <div style={panel}>Foreground</div>
          <div style={panel}>Subject</div>
          <div style={panel}>Background</div>
        </DepthOfField>
        <div style={row}>
          {[0, 1, 2].map((i) => (
            <button type="button" key={i} onClick={() => setDepth(i)}>
              C08 focus {i + 1}
            </button>
          ))}
          <button type="button" onClick={() => setDepth(-1)}>
            All sharp
          </button>
        </div>
      </div>
    </div>
  );
}

export const Timeline: Story = {
  name: "C01 timeline sequencer (labels, overlaps, pause, reverse, seek)",
  render: (args) => <TimelineDemo {...args} />,
};

export const SceneChaptersStory: Story = {
  name: "C02 scene chapters (scrubbed by a scroll scene)",
  render: () => (
    <div>
      <p>
        Scroll inside the preview: the scene is pinned with CSS sticky; chapters follow its
        progress.
      </p>
      <ScrollScene length={3} driver="js">
        <Chapters />
      </ScrollScene>
      <div style={{ height: "60vh" }} />
    </div>
  ),
};

export const Camera: Story = {
  name: "C03 camera pan/zoom (Tab into the cards to follow focus)",
  render: (args) => <CameraDemo {...args} />,
};

export const Reveals: Story = {
  name: "C04 split · C05 curtain/shutter · C10 letterbox",
  render: (args) => <RevealsDemo {...args} />,
};

export const Focus: Story = {
  name: "C06 title sequence · C07 spotlight · C08 depth of field",
  render: (args) => <FocusDemo {...args} />,
};

export const StoryboardStory: Story = {
  name: "C09 autoplay storyboard (pause / stop controls)",
  render: ({ reducedMotion }) => (
    <Storyboard
      label="Day"
      autoplay
      interval={3000}
      transition="slide"
      reducedMotion={reducedMotion}
    >
      <StoryboardFrame label="Sunrise">
        <p style={panel}>1 — Sunrise</p>
      </StoryboardFrame>
      <StoryboardFrame label="Noon">
        <p style={panel}>2 — Noon</p>
      </StoryboardFrame>
      <StoryboardFrame label="Dusk">
        <p style={panel}>3 — Dusk</p>
      </StoryboardFrame>
    </Storyboard>
  ),
};
