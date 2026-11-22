import "@neshel-ui/animations/media.css";
import { motionValue } from "@neshel-ui/animations/core";
import {
  BlurUpImage,
  CompareSlider,
  Crossfade,
  Duotone,
  HoverPan,
  KenBurns,
  Lightbox,
  LoadReveal,
  PixelDissolve,
  type ProgressControl,
  useVideoScrub,
} from "@neshel-ui/animations/media";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { type CSSProperties, useMemo, useRef, useState } from "react";
import scrubMp4 from "../../../playground-vite/src/animations/media/scrub.mp4";
import scrubWebm from "../../../playground-vite/src/animations/media/scrub.webm";
import { picture } from "./story-media";

interface Args {
  reducedMotion: "user" | "always" | "never";
}

const meta = {
  title: "Animations (experimental)/Images & Media",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Phase 015, private package (`@neshel-ui/animations/media` + `media.css`). Native media semantics first: `alt`, `srcset`, `sizes`, `loading`, `decoding` and dimensions are never written; an image is only hidden while it is still loading and is always revealed on load, error, timeout, reduced motion or unmount. The comparison slider is a native range input, the lightbox a native modal `<dialog>`, video scrubbing coalesces seeks and never plays, and the pixel dissolve paints real cells on a decorative Canvas 2D surface (fade fallback).",
      },
    },
  },
  args: { reducedMotion: "user" },
  argTypes: { reducedMotion: { control: "inline-radio", options: ["user", "always", "never"] } },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

const frame: CSSProperties = { width: 360, height: 220, borderRadius: 12 };
const fluid: CSSProperties = { maxWidth: "100%", height: "auto" };

export const M01KenBurns: Story = {
  render: (args) => {
    const control = useRef<ProgressControl | null>(null);
    return (
      <div style={{ display: "grid", gap: 8, justifyItems: "start" }}>
        <KenBurns
          controlRef={control}
          reducedMotion={args.reducedMotion}
          repeat={2}
          to={{ scale: 1.25, x: 0.6, y: -0.4 }}
          style={frame}
        >
          <img src={picture("Ken Burns", 210, 260)} alt="Blue gradient landscape" />
        </KenBurns>
        <button type="button" onClick={() => control.current?.play()}>
          Replay
        </button>
      </div>
    );
  },
};

export const M02BlurUp: Story = {
  render: (args) => {
    const [src, setSrc] = useState<string | undefined>(undefined);
    return (
      <div style={{ display: "grid", gap: 8, justifyItems: "start" }}>
        <BlurUpImage
          key={src ? "loaded" : "waiting"}
          src={src}
          alt="Warm gradient"
          width={360}
          height={225}
          placeholder={picture("", 20, 330, 16, 10)}
          reducedMotion={args.reducedMotion}
        />
        <button type="button" onClick={() => setSrc(picture("Loaded", 20, 330))}>
          Load the full image
        </button>
      </div>
    );
  },
};

export const M03RevealOnLoad: Story = {
  render: (args) => {
    const [src, setSrc] = useState<string | undefined>(undefined);
    return (
      <div style={{ display: "grid", gap: 8, justifyItems: "start" }}>
        <LoadReveal key={src ? "a" : "b"} shape="circle" reducedMotion={args.reducedMotion}>
          <img src={src} alt="Green gradient" width={360} height={225} style={fluid} />
        </LoadReveal>
        <button type="button" onClick={() => setSrc(picture("Revealed", 120, 180))}>
          Load
        </button>
      </div>
    );
  },
};

export const M04CompareSlider: Story = {
  render: () => (
    <CompareSlider
      label="Compare the edit"
      before={<img src={picture("Before", 210, 260)} alt="Before: cool tones" />}
      after={<img src={picture("After", 20, 330)} alt="After: warm tones" />}
      jumps={{ before: "Show before", after: "Show after" }}
      style={frame}
    />
  ),
};

export const M05Duotone: Story = {
  render: (args) => {
    const control = useRef<ProgressControl | null>(null);
    return (
      <div style={{ display: "grid", gap: 8, justifyItems: "start" }}>
        <Duotone controlRef={control} trigger="manual" reducedMotion={args.reducedMotion}>
          <img
            src={picture("Duotone", 120, 200)}
            alt="Gradient in duotone"
            width={360}
            height={225}
          />
        </Duotone>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={() => control.current?.play()}>
            Duotone
          </button>
          <button type="button" onClick={() => control.current?.reverse()}>
            Original
          </button>
        </div>
      </div>
    );
  },
};

export const M06VideoScrub: Story = {
  render: (args) => {
    const video = useRef<HTMLVideoElement | null>(null);
    const progress = useMemo(() => motionValue(0), []);
    useVideoScrub(video, { progress, reducedMotion: args.reducedMotion });
    return (
      <div style={{ display: "grid", gap: 8, justifyItems: "start" }}>
        <video ref={video} muted playsInline preload="auto" width={360} height={204}>
          <source src={scrubWebm} type="video/webm" />
          <source src={scrubMp4} type="video/mp4" />
        </video>
        <label>
          Scrub position{" "}
          <input
            type="range"
            min={0}
            max={100}
            defaultValue={0}
            onInput={(e) => progress.set(Number((e.target as HTMLInputElement).value) / 100)}
          />
        </label>
        <small>
          Any 0–1 source works (e.g. a ScrollProgress); seeks are coalesced, the video never plays.
        </small>
      </div>
    );
  },
};

export const M07Lightbox: Story = {
  render: (args) => (
    <Lightbox
      label="Enlarged gradient"
      reducedMotion={args.reducedMotion}
      thumbnail={
        <img
          src={picture("Open", 280, 330)}
          alt="Open the violet gradient"
          width={180}
          height={112}
        />
      }
    >
      <img src={picture("Large", 280, 330, 1200, 750)} alt="Violet gradient, enlarged" />
    </Lightbox>
  ),
};

export const M08Crossfade: Story = {
  render: (args) => {
    const [index, setIndex] = useState(0);
    return (
      <div style={{ display: "grid", gap: 8, justifyItems: "start" }}>
        <Crossfade index={index} reducedMotion={args.reducedMotion} style={frame}>
          <img src={picture("One", 210, 260)} alt="Slide one" />
          <img src={picture("Two", 20, 330)} alt="Slide two" />
          <img src={picture("Three", 120, 180)} alt="Slide three" />
        </Crossfade>
        <button type="button" onClick={() => setIndex((i) => (i + 1) % 3)}>
          Next slide
        </button>
      </div>
    );
  },
};

export const M09PixelDissolve: Story = {
  render: (args) => {
    const [index, setIndex] = useState(0);
    return (
      <div style={{ display: "grid", gap: 8, justifyItems: "start" }}>
        <PixelDissolve index={index} cell={14} reducedMotion={args.reducedMotion} style={frame}>
          <img src={picture("Dissolve A", 210, 260)} alt="First gradient" />
          <img src={picture("Dissolve B", 20, 330)} alt="Second gradient" />
        </PixelDissolve>
        <button type="button" onClick={() => setIndex((i) => 1 - i)}>
          Dissolve
        </button>
      </div>
    );
  },
};

export const M10HoverPan: Story = {
  render: (args) => (
    <HoverPan
      keyboard
      label="Pan the gradient detail (arrow keys)"
      reducedMotion={args.reducedMotion}
      style={frame}
    >
      <img src={picture("Pan", 30, 300, 1200, 750)} alt="Gradient detail" />
    </HoverPan>
  ),
};
