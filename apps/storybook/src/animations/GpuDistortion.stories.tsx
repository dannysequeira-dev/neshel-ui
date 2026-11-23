import "@neshel-ui/animations/gpu.css";
import {
  DepthParallax,
  DisplacementHover,
  PageCurl,
  type PageCurlControl,
  Ripple,
  type RippleControl,
} from "@neshel-ui/animations/gpu";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { type CSSProperties, useMemo, useRef } from "react";
import { picture } from "./story-media";

interface Args {
  reducedMotion: "user" | "always" | "never";
}

const meta = {
  title: "Animations (experimental)/Distortion (GPU, optional)",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Phase 016, private package (`@neshel-ui/animations/gpu` + `gpu.css`; ADR 0031). An optional WebGL2 layer without a graphics dependency: lazy contexts within a budget, exact release, context-loss recovery and package-only shaders. The native `<img>` keeps its attributes and stays in the accessibility tree; the decorative canvas covers it only after a successful draw, and the image comes back without WebGL2, on any failure, under reduced motion and on unmount. HTML is never turned into a texture: the page curl's CSS driver turns live HTML as a rigid page.",
      },
    },
  },
  args: { reducedMotion: "user" },
  argTypes: { reducedMotion: { control: "inline-radio", options: ["user", "always", "never"] } },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

const frame: CSSProperties = { width: 360, maxWidth: "100%", borderRadius: 12, overflow: "hidden" };

/** Grayscale depth map (white = near) with the same aspect as `picture()` (640×400). */
function depthMap(): string {
  if (typeof document === "undefined") return "";
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 400;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  const ramp = ctx.createLinearGradient(0, 0, 0, 400);
  ramp.addColorStop(0, "#202020");
  ramp.addColorStop(1, "#808080");
  ctx.fillStyle = ramp;
  ctx.fillRect(0, 0, 640, 400);
  const disc = ctx.createRadialGradient(320, 220, 10, 320, 220, 180);
  disc.addColorStop(0, "#ffffff");
  disc.addColorStop(1, "rgb(255 255 255 / 0)");
  ctx.fillStyle = disc;
  ctx.fillRect(0, 0, 640, 400);
  return canvas.toDataURL("image/png");
}

export const D04PageCurl: Story = {
  render: (args) => {
    const curl = useRef<PageCurlControl | null>(null);
    return (
      <div style={{ display: "grid", gap: 8, justifyItems: "start" }}>
        <PageCurl
          controlRef={curl}
          reducedMotion={args.reducedMotion}
          style={frame}
          front={<img src={picture("Page one", 210, 260)} alt="Page one of the story" />}
          under={
            <article style={{ padding: 16, background: "#f8fafc", color: "#0f172a" }}>
              <h3>Page two</h3>
              <a href="#continue">Continue reading</a>
            </article>
          }
        />
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={() => curl.current?.play()}>
            Turn page
          </button>
          <button type="button" onClick={() => curl.current?.reverse()}>
            Back
          </button>
        </div>
      </div>
    );
  },
};

export const D04PageCurlLiveHtml: Story = {
  name: "D04 Page curl — CSS driver (live HTML, rigid turn)",
  render: (args) => {
    const curl = useRef<PageCurlControl | null>(null);
    return (
      <div style={{ display: "grid", gap: 8, justifyItems: "start" }}>
        <PageCurl
          driver="css"
          controlRef={curl}
          reducedMotion={args.reducedMotion}
          style={{ width: 280 }}
          front={
            <article style={{ padding: 16, background: "#fef3c7", color: "#0f172a" }}>
              <h3>Live page</h3>
              <a href="#link">A real, focusable link</a>
            </article>
          }
          under={
            <article style={{ padding: 16, background: "#f8fafc", color: "#0f172a" }}>
              <h3>Next page</h3>
            </article>
          }
        />
        <button type="button" onClick={() => curl.current?.play()}>
          Turn (rigid, documented as such)
        </button>
      </div>
    );
  },
};

export const D06Ripple: Story = {
  render: (args) => {
    const ripple = useRef<RippleControl | null>(null);
    return (
      <div style={{ display: "grid", gap: 8, justifyItems: "start" }}>
        <Ripple controlRef={ripple} reducedMotion={args.reducedMotion} style={frame}>
          <img src={picture("Ripple", 190, 230)} alt="Grid pattern under water" />
        </Ripple>
        <button type="button" onClick={() => ripple.current?.impact(0.5, 0.5)}>
          Drop at the centre (or press on the image)
        </button>
      </div>
    );
  },
};

export const D08DisplacementHover: Story = {
  render: (args) => (
    <DisplacementHover reducedMotion={args.reducedMotion} style={frame}>
      <img src={picture("Displace", 20, 330)} alt="Warm gradient poster" />
    </DisplacementHover>
  ),
};

export const D10DepthParallax: Story = {
  render: (args) => {
    const depth = useMemo(depthMap, []);
    return (
      <DepthParallax depth={depth} reducedMotion={args.reducedMotion} style={frame}>
        <img src={picture("Depth", 150, 200)} alt="Teal landscape with a raised disc" />
      </DepthParallax>
    );
  },
};
