import "@neshel-ui/animations/layout.css";
import { definePreset } from "@neshel-ui/animations/core";
import { fadeSlide } from "@neshel-ui/animations/entrance";
import {
  AnimatedList,
  AutoHeight,
  Collapse,
  CrossFade,
  LayoutGroup,
  LayoutItem,
  Masonry,
  Presence,
  Reflow,
  TabIndicator,
} from "@neshel-ui/animations/layout";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { type CSSProperties, useState } from "react";

interface Args {
  reducedMotion: "user" | "always" | "never";
}

const meta = {
  title: "Animations (experimental)/Layout & Presence",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Phase 012, private package (`@neshel-ui/animations/layout` + `layout.css`). FLIP measures layout boxes from the offset chain (transforms ignored) once before the change and once in the next read phase, then animates a transform layer that composes with every other effect. `<Presence>` keeps a removed child mounted (inert, hidden from assistive technology) until its exit finishes, with a watchdog. Reduced motion applies changes instantly.",
      },
    },
  },
  args: { reducedMotion: "user" },
  argTypes: { reducedMotion: { control: "inline-radio", options: ["user", "always", "never"] } },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

const tile: CSSProperties = {
  padding: "8px 12px",
  borderRadius: 8,
  background: "var(--neshel-muted, #f1f5f9)",
};
const list: CSSProperties = {
  display: "grid",
  gap: 6,
  padding: 0,
  listStyle: "none",
  maxWidth: 360,
};
const exitPreset = definePreset("story-exit", fadeSlide, { direction: "up", duration: 220 });

function ReorderDemo({ reducedMotion }: Args) {
  const [order, setOrder] = useState(["A", "B", "C", "D"]);
  const [items, setItems] = useState(["One", "Two", "Three"]);
  const [next, setNext] = useState(4);
  const [selected, setSelected] = useState(0);
  return (
    <div
      style={{
        display: "grid",
        gap: 24,
        gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
      }}
    >
      <div>
        <button type="button" onClick={() => setOrder((o) => [...o.slice(1), o[0] as string])}>
          L01 rotate the order
        </button>
        <LayoutGroup>
          <ul style={list}>
            {order.map((item) => (
              <LayoutItem asChild key={item} reducedMotion={reducedMotion}>
                <li style={tile}>{item}</li>
              </LayoutItem>
            ))}
          </ul>
        </LayoutGroup>
      </div>
      <div>
        <button
          type="button"
          onClick={() => {
            setItems((all) => [`Item ${next}`, ...all]);
            setNext((n) => n + 1);
          }}
        >
          L03 add
        </button>{" "}
        <button type="button" onClick={() => setItems((all) => all.slice(0, -1))}>
          Remove last
        </button>
        <AnimatedList style={list} reducedMotion={reducedMotion}>
          {items.map((item) => (
            <li key={item} style={tile}>
              {item}
            </li>
          ))}
        </AnimatedList>
      </div>
      <div>
        <p>L04 shared layout</p>
        <LayoutGroup>
          <div
            style={{
              display: "flex",
              gap: 4,
              padding: 4,
              borderRadius: 999,
              background: "var(--neshel-muted, #f1f5f9)",
            }}
          >
            {["Free", "Pro", "Team"].map((plan, index) => (
              <button
                key={plan}
                type="button"
                aria-pressed={selected === index}
                onClick={() => setSelected(index)}
                style={{
                  position: "relative",
                  flex: 1,
                  border: 0,
                  borderRadius: 999,
                  padding: 8,
                  background: "transparent",
                }}
              >
                {selected === index ? (
                  <LayoutItem
                    layoutId="story-highlight"
                    reducedMotion={reducedMotion}
                    style={{
                      position: "absolute",
                      inset: 0,
                      borderRadius: 999,
                      background: "#fff",
                      boxShadow: "0 1px 4px rgb(0 0 0 / .15)",
                    }}
                  />
                ) : null}
                <span style={{ position: "relative" }}>{plan}</span>
              </button>
            ))}
          </div>
        </LayoutGroup>
      </div>
    </div>
  );
}

function SizeDemo({ reducedMotion }: Args) {
  const [lines, setLines] = useState(1);
  const [open, setOpen] = useState<number | null>(0);
  const [tab, setTab] = useState(0);
  const [slide, setSlide] = useState(0);
  const slides = ["Short.", "A longer slide: the height follows the new content.", "Third slide."];
  return (
    <div
      style={{
        display: "grid",
        gap: 24,
        gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
        alignItems: "start",
      }}
    >
      <div>
        <button type="button" onClick={() => setLines((n) => (n >= 4 ? 1 : n + 1))}>
          L02 add a line
        </button>
        <AutoHeight
          reducedMotion={reducedMotion}
          style={{ border: "1px solid #ccc", borderRadius: 8, padding: "0 12px" }}
        >
          {Array.from({ length: lines }, (_, i) => (
            <p key={i}>Line {i + 1}</p>
          ))}
        </AutoHeight>
      </div>
      <div style={{ border: "1px solid #ccc", borderRadius: 8 }}>
        {["Shipping", "Returns"].map((title, index) => (
          <div key={title}>
            <h4 style={{ margin: 0 }}>
              <button
                type="button"
                aria-expanded={open === index}
                aria-controls={`story-panel-${index}`}
                onClick={() => setOpen(open === index ? null : index)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: 10,
                  border: 0,
                  background: "transparent",
                }}
              >
                L06 {title}
              </button>
            </h4>
            <Collapse
              open={open === index}
              id={`story-panel-${index}`}
              reducedMotion={reducedMotion}
            >
              <p style={{ margin: 0, padding: "0 10px 10px" }}>
                {title} details that open and close smoothly.
              </p>
            </Collapse>
          </div>
        ))}
      </div>
      <div>
        <TabIndicator asChild active={tab} reducedMotion={reducedMotion}>
          <div
            role="tablist"
            aria-label="L07 tabs"
            style={{ display: "flex", gap: 4, borderBottom: "1px solid #ccc", color: "#4f46e5" }}
          >
            {["Overview", "Specs", "Reviews"].map((label, index) => (
              <button
                key={label}
                type="button"
                role="tab"
                aria-selected={tab === index}
                tabIndex={tab === index ? 0 : -1}
                onClick={() => setTab(index)}
                style={{
                  border: 0,
                  padding: "8px 12px",
                  background: "transparent",
                  color: "inherit",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </TabIndicator>
      </div>
      <div>
        <button type="button" onClick={() => setSlide((s) => (s + 1) % slides.length)}>
          L09 next
        </button>
        <CrossFade
          swapKey={slide}
          reducedMotion={reducedMotion}
          style={{ border: "1px solid #ccc", borderRadius: 8, padding: "0 12px" }}
        >
          <p>{slides[slide]}</p>
        </CrossFade>
      </div>
    </div>
  );
}

function ReflowDemo({ reducedMotion }: Args) {
  const [wide, setWide] = useState(true);
  const [shown, setShown] = useState(true);
  return (
    <div style={{ display: "grid", gap: 24 }}>
      <div>
        <button type="button" onClick={() => setWide((w) => !w)}>
          L05 / L10 toggle width
        </button>
        <Reflow
          reducedMotion={reducedMotion}
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${wide ? 3 : 2}, 1fr)`,
            gap: 8,
            maxWidth: wide ? 480 : 260,
          }}
        >
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} style={{ ...tile, textAlign: "center" }}>
              {i + 1}
            </div>
          ))}
        </Reflow>
      </div>
      <Masonry
        minColumnWidth={wide ? 120 : 180}
        gap={10}
        reducedMotion={reducedMotion}
        style={{ maxWidth: 560 }}
      >
        {[60, 110, 80, 140, 70, 100, 90, 130].map((height, i) => (
          <div key={i} style={{ ...tile, height }}>
            {i + 1}
          </div>
        ))}
      </Masonry>
      <div>
        <button type="button" aria-pressed={shown} onClick={() => setShown((s) => !s)}>
          L08 {shown ? "hide" : "show"} card
        </button>
        <div style={{ minHeight: 72 }}>
          <Presence enter={exitPreset} exit={exitPreset}>
            {shown ? (
              <div key="card" style={{ ...tile, padding: 16 }}>
                Exit runs before unmount; re-entry continues from where it is.
              </div>
            ) : null}
          </Presence>
        </div>
      </div>
    </div>
  );
}

export const FlipAndShared: Story = {
  name: "L01 FLIP · L03 list enter/exit · L04 shared layout",
  render: (args) => <ReorderDemo {...args} />,
};

export const Heights: Story = {
  name: "L02 auto-height · L06 accordion · L07 tab indicator · L09 cross-fade",
  render: (args) => <SizeDemo {...args} />,
};

export const ReflowAndPresence: Story = {
  name: "L05 grid reflow · L10 masonry · L08 presence",
  render: (args) => <ReflowDemo {...args} />,
};
