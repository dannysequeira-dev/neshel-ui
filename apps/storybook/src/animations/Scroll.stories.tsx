import { fadeUp, stagger } from "@neshel-ui/animations/entrance";
import { Hover, lift } from "@neshel-ui/animations/hover";
import {
  depthParallax,
  directionHeader,
  HorizontalScroll,
  inViewPresets,
  inViewProgress,
  ParallaxImage,
  RevealOnScroll,
  ScrollEffect,
  ScrollLayer,
  ScrollProgressBar,
  ScrollScene,
  StaggerOnScroll,
  StickyStack,
  scrollColorShift,
  scrubTransform,
  stuckState,
  useInView,
  useSectionSpy,
  velocitySkew,
  zoomOnScroll,
} from "@neshel-ui/animations/scroll";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { type CSSProperties, type ReactNode, useRef } from "react";

const meta = {
  title: "Animations (experimental)/Scroll & Parallax",
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Phase 011, private package (`@neshel-ui/animations/scroll` + `scroll.css`). A scroll engine on the motion engine: progress from cached geometry (no layout read per scroll event), IntersectionObserver triggers, CSS-sticky pinning, spring smooth scrub and a verified native scroll-timeline driver for custom properties. No scroll hijacking: the page scrolls natively. Every effect composes with Entrance, Hover, Press and Tilt3D and has a reduced-motion alternative (live).",
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

const tile: CSSProperties = {
  display: "grid",
  placeItems: "center",
  minHeight: 120,
  padding: 16,
  borderRadius: 12,
  background: "var(--neshel-muted, #f1f5f9)",
};
const spacer = (height: string) => <div style={{ height }} aria-hidden="true" />;

function Page({ children }: { children: ReactNode }) {
  return (
    <div style={{ padding: "0 16px", maxWidth: 960, margin: "0 auto" }}>
      <ScrollProgressBar />
      <p style={{ marginTop: 32 }}>Scroll down ↓ (SP03 progress bar at the top of the viewport)</p>
      {children}
      {spacer("60vh")}
    </div>
  );
}

/** ST01–ST03 and ST05: reveals with Entrance presets, modes and the in-view variable. */
export const Triggers: Story = {
  render: () => (
    <Page>
      {spacer("80vh")}
      <div
        style={{
          display: "grid",
          gap: 24,
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
        }}
      >
        <RevealOnScroll preset={fadeUp} style={tile}>
          ST01 once
        </RevealOnScroll>
        <RevealOnScroll preset={fadeUp} mode="repeat" style={tile}>
          ST03 repeat
        </RevealOnScroll>
        <RevealOnScroll preset={fadeUp} mode="reverse" style={tile}>
          ST03 reverse
        </RevealOnScroll>
        <ScrollEffect preset={inViewProgress} style={tile}>
          <span>ST05</span>
          <span
            aria-hidden="true"
            style={{
              display: "block",
              width: "100%",
              height: 6,
              background: "currentColor",
              transformOrigin: "0 50%",
              transform: "scaleX(var(--neshel-view-progress, 1))",
            }}
          />
        </ScrollEffect>
      </div>
      {spacer("40vh")}
      <StaggerOnScroll
        preset={stagger}
        options={{ preset: fadeUp, interval: 80 }}
        style={{ display: "flex", gap: 12 }}
      >
        {["ST02", "staggered", "children", "on enter"].map((label) => (
          <div key={label} style={{ ...tile, minHeight: 60 }}>
            {label}
          </div>
        ))}
      </StaggerOnScroll>
    </Page>
  ),
};

/** ST04 in-view state with the ST10 trigger presets. */
export const InViewState: Story = {
  render: function Render() {
    const half = useRef<HTMLDivElement>(null);
    const full = useRef<HTMLDivElement>(null);
    const halfVisible = useInView(half, "half");
    const fullyVisible = useInView(full, inViewPresets.full);
    return (
      <Page>
        {spacer("80vh")}
        <div ref={half} style={tile}>
          ST04 half preset: {halfVisible ? "in view" : "out of view"}
        </div>
        {spacer("40vh")}
        <div ref={full} style={tile}>
          ST10 full preset: {fullyVisible ? "in view" : "out of view"}
        </div>
      </Page>
    );
  },
};

/** ST06 header, ST07 stuck state and ST08 section spy. */
export const HeaderStuckSpy: Story = {
  render: function Render() {
    const ids = ["one", "two", "three"];
    const active = useSectionSpy(ids);
    return (
      <div>
        <ScrollEffect
          asChild
          preset={directionHeader}
          options={{ offset: 120 }}
          style={{ position: "sticky", top: 0, zIndex: 2 }}
        >
          <header
            style={{
              background: "var(--neshel-background, #fff)",
              borderBottom: "1px solid #e2e8f0",
              padding: 12,
            }}
          >
            <nav aria-label="Sections" style={{ display: "flex", gap: 16 }}>
              {ids.map((id) => (
                <a
                  key={id}
                  href={`#${id}`}
                  aria-current={active === id ? "location" : undefined}
                  style={{ fontWeight: active === id ? 700 : 400 }}
                >
                  {id}
                </a>
              ))}
            </nav>
          </header>
        </ScrollEffect>
        {ids.map((id) => (
          <section key={id} id={id} style={{ minHeight: "120vh", padding: 16 }}>
            <h2>Section {id}</h2>
            {id === "two" ? (
              <div style={{ height: "80vh" }}>
                <ScrollEffect
                  preset={stuckState}
                  style={{ position: "sticky", top: 56, ...tile, minHeight: 0 }}
                >
                  ST07 sticky bar (data-neshel-stuck while pinned)
                </ScrollEffect>
              </div>
            ) : null}
          </section>
        ))}
      </div>
    );
  },
};

/** SP05 pinned scene with SP01 depth layers and SP10 smooth scrub. */
export const PinnedScene: Story = {
  render: () => (
    <Page>
      <ScrollScene length={3} smooth stageClassName="story-stage" style={{ marginTop: 24 }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(#0f172a, #1e293b)",
            borderRadius: 16,
          }}
        />
        {[0.3, 0.9, 1.8].map((depth, index) => (
          <ScrollLayer
            key={depth}
            depth={depth}
            distance={300}
            style={{
              position: "absolute",
              top: "40%",
              left: `${15 + index * 28}%`,
              width: 96,
              height: 96,
              borderRadius: 16,
              background: "rgb(148 163 184 / 0.5)",
              display: "grid",
              placeItems: "center",
              color: "#fff",
            }}
          >
            depth {depth}
          </ScrollLayer>
        ))}
        <p
          style={{
            position: "absolute",
            bottom: "10%",
            width: "100%",
            textAlign: "center",
            color: "#fff",
            opacity: "calc(0.3 + var(--neshel-scene-progress, 0) * 0.7)",
          }}
        >
          Rooted in faith. Built with hope.
        </p>
      </ScrollScene>
    </Page>
  ),
};

/** SP04 horizontal section (vertical with reduced motion; native scroller without JavaScript). */
export const Horizontal: Story = {
  render: () => (
    <Page>
      <HorizontalScroll label="Horizontal cards">
        {Array.from({ length: 6 }, (_, index) => (
          <a
            key={index}
            href={`#card-${index}`}
            style={{ ...tile, width: "min(70vw, 420px)", height: "50vh" }}
          >
            Card {index + 1}
          </a>
        ))}
      </HorizontalScroll>
    </Page>
  ),
};

/** SP02, SP06, SP07, SP08, SP09, SP11. */
export const Parallax: Story = {
  render: () => (
    <Page>
      {spacer("40vh")}
      <ScrollEffect
        preset={scrubTransform}
        options={{
          from: { translateX: -120, rotateZ: -6, opacity: 0.6 },
          to: { translateX: 120, rotateZ: 6, opacity: 1 },
        }}
        style={{ ...tile, maxWidth: 260, margin: "0 auto" }}
      >
        SP02 scrubbed transform
      </ScrollEffect>
      {spacer("30vh")}
      <ParallaxImage amount={40} style={{ height: "45vh", borderRadius: 16 }}>
        <div
          role="img"
          aria-label="Gradient"
          style={{
            height: "100%",
            background: "linear-gradient(#0c4a6e, #0ea5e9 45%, #fde68a 75%, #166534)",
          }}
        />
      </ParallaxImage>
      {spacer("20vh")}
      <ScrollEffect preset={zoomOnScroll} options={{ from: 0.85, to: 1.15 }} style={tile}>
        SP07 zoom on scroll
      </ScrollEffect>
      {spacer("20vh")}
      <ScrollEffect
        preset={scrollColorShift}
        options={{ stops: ["#bae6fd", "#e9d5ff", "#fed7aa"] }}
        style={{ ...tile, minHeight: "30vh", background: "var(--neshel-scroll-color)" }}
      >
        SP08 colour shift
      </ScrollEffect>
      {spacer("20vh")}
      <StickyStack top="2rem" scale={0.05}>
        {["SP09 one", "SP09 two", "SP09 three"].map((label) => (
          <article
            key={label}
            style={{ ...tile, height: "45vh", background: "#1e293b", color: "#f8fafc" }}
          >
            {label}
          </article>
        ))}
      </StickyStack>
      {spacer("20vh")}
      <ScrollEffect
        preset={velocitySkew}
        style={{ fontSize: 32, fontWeight: 700, textAlign: "center" }}
      >
        SP11 velocity skew — scroll fast
      </ScrollEffect>
    </Page>
  ),
};

/** Composition: Entrance (reveal) + Hover (lift) + SP01 parallax on one element. */
export const Composition: Story = {
  render: () => (
    <Page>
      {spacer("80vh")}
      <RevealOnScroll asChild preset={fadeUp}>
        <Hover asChild preset={lift}>
          <ScrollEffect asChild preset={depthParallax} options={{ depth: 0.8, distance: 120 }}>
            <button type="button" style={{ ...tile, margin: "0 auto", border: 0 }}>
              Reveal + lift + parallax (hover me)
            </button>
          </ScrollEffect>
        </Hover>
      </RevealOnScroll>
    </Page>
  ),
};
