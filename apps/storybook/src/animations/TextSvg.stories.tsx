import "@neshel-ui/animations/text.css";
import "@neshel-ui/animations/svg.css";
import { motionValue } from "@neshel-ui/animations/core";
import {
  createPathMorph,
  MorphIcon,
  menuCloseShapes,
  type PathMorphControl,
  SuccessCheck,
  useChartDraw,
  useDashFlow,
  useGradientStops,
  useLogoReveal,
  useMotionPath,
  usePathDraw,
  useTurbulence,
} from "@neshel-ui/animations/svg";
import {
  FontAxes,
  GradientText,
  Highlight,
  LineReveal,
  NumberRoll,
  RotatingWords,
  ScrambleText,
  TextMask,
  TextReveal,
  Typewriter,
  WaveText,
} from "@neshel-ui/animations/text";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from "react";

interface Args {
  reducedMotion: "user" | "always" | "never";
}

const meta = {
  title: "Animations (experimental)/Typography & SVG",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Phase 014, private package (`@neshel-ui/animations/text` + `text.css`, `@neshel-ui/animations/svg` + `svg.css`). Split text keeps ONE accessible copy (the original nodes in a visually hidden span; the visual pieces are `aria-hidden`), handles grapheme clusters, bidi runs and shaping scripts, and never splits links or controls. Each effect writes one value per frame through the Motion Host; SVG effects restore the consumer's dash styles and `d` exactly. Continuous effects are finite by default and pausable; reduced motion shows end states.",
      },
    },
  },
  args: { reducedMotion: "user" },
  argTypes: { reducedMotion: { control: "inline-radio", options: ["user", "always", "never"] } },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

const panel: CSSProperties = {
  padding: 16,
  borderRadius: 12,
  background: "var(--neshel-muted, #f1f5f9)",
  display: "grid",
  gap: 12,
};
const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 3,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function Replay({ children }: { children: (key: number) => ReactNode }) {
  const [key, setKey] = useState(0);
  return (
    <div style={panel}>
      {children(key)}
      <button type="button" onClick={() => setKey((n) => n + 1)} style={{ justifySelf: "start" }}>
        Replay
      </button>
    </div>
  );
}

export const T01SplitReveal: Story = {
  name: "T01 Split reveal (chars / words / lines)",
  render: ({ reducedMotion }) => (
    <Replay>
      {(k) => (
        <>
          <TextReveal
            key={`c${k}`}
            as="h2"
            split="chars"
            trigger="mount"
            reducedMotion={reducedMotion}
          >
            Rooted in faith 👨‍👩‍👧‍👦
          </TextReveal>
          <TextReveal
            key={`w${k}`}
            as="p"
            variant="blur"
            trigger="mount"
            reducedMotion={reducedMotion}
          >
            Built with hope — שלום עולם — مرحبا بالعالم
          </TextReveal>
          <TextReveal
            key={`l${k}`}
            as="p"
            split="lines"
            trigger="mount"
            reducedMotion={reducedMotion}
            style={{ maxWidth: "40ch" }}
          >
            Lines are measured once and regrouped only when the width or the fonts change, never on
            every frame.
          </TextReveal>
        </>
      )}
    </Replay>
  ),
};

export const T02Typewriter: Story = {
  name: "T02 Typewriter",
  render: ({ reducedMotion }) => (
    <Replay>
      {(k) => (
        <Typewriter key={k} speed={30} trigger="mount" caret="always" reducedMotion={reducedMotion}>
          The whole sentence is accessible from the first frame.
        </Typewriter>
      )}
    </Replay>
  ),
};

export const T03Scramble: Story = {
  name: "T03 Scramble / decode",
  render: ({ reducedMotion }) => (
    <Replay>
      {(k) => (
        <ScrambleText key={k} trigger="mount" seed={3} reducedMotion={reducedMotion}>
          DETERMINISTIC DECODE
        </ScrambleText>
      )}
    </Replay>
  ),
};

export const T04GradientSweep: Story = {
  name: "T04 Gradient sweep text",
  render: ({ reducedMotion }) => (
    <Replay>
      {(k) => (
        <p style={{ fontSize: 32, fontWeight: 700 }}>
          <GradientText key={k} trigger="mount" reducedMotion={reducedMotion}>
            Gradient sweep
          </GradientText>
        </p>
      )}
    </Replay>
  ),
};

export const T05NumberRoll: Story = {
  name: "T05 Number roll (localised)",
  render: ({ reducedMotion }) => {
    const [value, setValue] = useState(1234.56);
    return (
      <div style={panel}>
        <p style={{ fontSize: 28 }}>
          <NumberRoll
            value={value}
            locale="de-DE"
            format={{ style: "currency", currency: "EUR" }}
            reducedMotion={reducedMotion}
          />
        </p>
        <p style={{ fontSize: 28 }}>
          <NumberRoll value={Math.round(value)} locale="ar-EG" reducedMotion={reducedMotion} />
        </p>
        <p style={{ fontSize: 28 }}>
          <NumberRoll
            value={Math.round(value)}
            locale="hi-IN"
            format={{ numberingSystem: "deva" } as Intl.NumberFormatOptions}
            reducedMotion={reducedMotion}
          />
        </p>
        <button
          type="button"
          onClick={() => setValue((v) => Math.round((v * 1.37 - 211) * 100) / 100)}
          style={{ justifySelf: "start" }}
        >
          Change value
        </button>
      </div>
    );
  },
};

export const T06RotatingWords: Story = {
  name: "T06 Rotating words",
  render: ({ reducedMotion }) => {
    const [paused, setPaused] = useState(false);
    return (
      <div style={panel}>
        <p>
          We build{" "}
          <RotatingWords
            words={["fast", "accessible", "precise"]}
            repeat={2}
            paused={paused}
            reducedMotion={reducedMotion}
          />{" "}
          interfaces.
        </p>
        <button
          type="button"
          aria-pressed={paused}
          onClick={() => setPaused((p) => !p)}
          style={{ justifySelf: "start" }}
        >
          {paused ? "Play" : "Pause"}
        </button>
      </div>
    );
  },
};

export const T07KineticWave: Story = {
  name: "T07 Kinetic wave",
  render: ({ reducedMotion }) => (
    <Replay>
      {(k) => (
        <WaveText key={k} style={{ fontSize: 28 }} reducedMotion={reducedMotion}>
          Gentle wave
        </WaveText>
      )}
    </Replay>
  ),
};

export const T08Highlighter: Story = {
  name: "T08 Highlighter draw",
  render: ({ reducedMotion }) => (
    <Replay>
      {(k) => (
        <p style={{ maxWidth: "36ch" }}>
          The band sits{" "}
          <Highlight key={k} trigger="mount" reducedMotion={reducedMotion}>
            behind the glyphs and across line breaks, never over the text
          </Highlight>
          .
        </p>
      )}
    </Replay>
  ),
};

export const T09TextMask: Story = {
  name: "T09 Text mask reveal",
  render: ({ reducedMotion }) => (
    <Replay>
      {(k) => (
        <TextMask
          key={k}
          as="p"
          trigger="mount"
          reducedMotion={reducedMotion}
          style={{ maxWidth: "36ch", fontSize: 22 }}
        >
          Each line rises inside its own clipped line box.
        </TextMask>
      )}
    </Replay>
  ),
};

export const T10FontAxes: Story = {
  name: "T10 Variable-font axes",
  render: ({ reducedMotion }) => {
    const [active, setActive] = useState(false);
    return (
      <div style={panel}>
        <p style={{ fontSize: 32 }}>
          <FontAxes
            from={{ wght: 300 }}
            to={{ wght: 800 }}
            active={active}
            reducedMotion={reducedMotion}
          >
            Variable weight
          </FontAxes>
        </p>
        <button
          type="button"
          aria-pressed={active}
          onClick={() => setActive((a) => !a)}
          style={{ justifySelf: "start" }}
        >
          Toggle
        </button>
        <small>Uses the page's font; a static font jumps between its available weights.</small>
      </div>
    );
  },
};

export const T11LineReveal: Story = {
  name: "T11 Line-by-line reveal (progress source)",
  render: ({ reducedMotion }) => {
    const [source] = useState(() => motionValue(0.3));
    return (
      <div style={panel}>
        <label>
          Progress (stands in for a ScrollProgress){" "}
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            defaultValue={0.3}
            onChange={(e) => source.set(Number(e.target.value))}
          />
        </label>
        <LineReveal source={source} reducedMotion={reducedMotion} style={{ maxWidth: "36ch" }}>
          The text family receives scroll progress as a value and never imports the scroll family.
        </LineReveal>
      </div>
    );
  },
};

function SvgPanel({ children, onPlay }: { children: ReactNode; onPlay: () => void }) {
  return (
    <div style={panel}>
      {children}
      <button type="button" onClick={onPlay} style={{ justifySelf: "start" }}>
        Play
      </button>
    </div>
  );
}

export const S01PathDraw: Story = {
  name: "S01 Path draw",
  render: ({ reducedMotion }) => {
    const ref = useRef<SVGPathElement | null>(null);
    const draw = usePathDraw(ref, { trigger: "mount", reducedMotion });
    return (
      <SvgPanel
        onPlay={() => {
          draw.current?.seek(0);
          draw.current?.play();
        }}
      >
        <svg viewBox="0 0 100 60" width={240} aria-hidden="true">
          <path ref={ref} d="M5 50 Q 25 0, 50 30 T 95 10" style={stroke} />
        </svg>
      </SvgPanel>
    );
  },
};

export const S02PathMorph: Story = {
  name: "S02 Path morph",
  render: ({ reducedMotion }) => {
    const ref = useRef<SVGPathElement | null>(null);
    const morph = useRef<PathMorphControl | null>(null);
    const [i, setI] = useState(0);
    useEffect(() => {
      if (!ref.current) return;
      const control = createPathMorph(ref.current, {
        shapes: ["M10 50 C 30 10, 70 10, 90 50", "M10 50 C 30 90, 70 90, 90 50"],
        reducedMotion,
      });
      morph.current = control;
      return () => control.destroy();
    }, [reducedMotion]);
    return (
      <SvgPanel
        onPlay={() => {
          const next = 1 - i;
          setI(next);
          morph.current?.to(next);
        }}
      >
        <svg viewBox="0 0 100 100" width={200} aria-hidden="true">
          <path ref={ref} d="M10 50 C 30 10, 70 10, 90 50" style={stroke} />
        </svg>
      </SvgPanel>
    );
  },
};

export const S03MotionPath: Story = {
  name: "S03 Motion along a path",
  render: ({ reducedMotion }) => {
    const ref = useRef<HTMLDivElement | null>(null);
    const motion = useMotionPath(ref, {
      path: "M0 0 C 80 -60, 160 60, 240 0",
      trigger: "manual",
      reducedMotion,
    });
    return (
      <SvgPanel
        onPlay={() => {
          motion.current?.seek(0);
          motion.current?.play();
        }}
      >
        <div style={{ position: "relative", height: 90 }}>
          <div
            ref={ref}
            style={{
              position: "absolute",
              top: 45,
              left: 8,
              width: 16,
              height: 16,
              borderRadius: "50%",
              background: "#ec4899",
            }}
          />
        </div>
      </SvgPanel>
    );
  },
};

export const S04IconMorph: Story = {
  name: "S04 Icon morph (menu ↔ close)",
  render: ({ reducedMotion }) => {
    const [open, setOpen] = useState(false);
    void reducedMotion;
    return (
      <div style={panel}>
        <button
          type="button"
          aria-label="Menu"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          style={{ width: 44, height: 44, display: "grid", placeItems: "center" }}
        >
          <MorphIcon shapes={menuCloseShapes} state={open ? "close" : "menu"} />
        </button>
        <small>The button owns its name and aria-expanded; the icon is decorative.</small>
      </div>
    );
  },
};

export const S05GradientStops: Story = {
  name: "S05 Animated gradient stops",
  render: ({ reducedMotion }) => {
    const ref = useRef<SVGLinearGradientElement | null>(null);
    const stops = useGradientStops(ref, {
      stops: [{ color: ["#6366f1", "#ec4899"] }, { color: ["#14b8a6", "#f59e0b"] }],
      repeat: 1,
      reducedMotion,
    });
    return (
      <SvgPanel
        onPlay={() => {
          stops.current?.stop();
          stops.current?.play();
        }}
      >
        <svg viewBox="0 0 100 30" width={260} aria-hidden="true">
          <defs>
            <linearGradient id="sb-s05" ref={ref}>
              <stop offset="0" stopColor="#6366f1" />
              <stop offset="1" stopColor="#14b8a6" />
            </linearGradient>
          </defs>
          <rect width="100" height="30" rx="6" fill="url(#sb-s05)" />
        </svg>
      </SvgPanel>
    );
  },
};

export const S06ChartDraw: Story = {
  name: "S06 Line-chart draw-in",
  render: ({ reducedMotion }) => {
    const ref = useRef<SVGSVGElement | null>(null);
    const chart = useChartDraw(ref, {
      lines: "path",
      points: "circle",
      trigger: "mount",
      reducedMotion,
    });
    return (
      <SvgPanel
        onPlay={() => {
          chart.current?.seek(0);
          chart.current?.play();
        }}
      >
        <svg ref={ref} viewBox="0 0 100 60" width={260} aria-hidden="true">
          <path d="M5 50 L30 30 L55 38 L80 12 L95 18" style={stroke} />
          {[
            [5, 50],
            [30, 30],
            [55, 38],
            [80, 12],
            [95, 18],
          ].map(([x, y]) => (
            <circle key={x} cx={x} cy={y} r={2.5} fill="currentColor" />
          ))}
        </svg>
      </SvgPanel>
    );
  },
};

export const S07Turbulence: Story = {
  name: "S07 Turbulence wobble",
  render: ({ reducedMotion }) => {
    const ref = useRef<SVGGElement | null>(null);
    const wobble = useTurbulence(ref, { amplitude: 8, trigger: "manual", reducedMotion });
    return (
      <SvgPanel
        onPlay={() => {
          wobble.current?.stop();
          wobble.current?.play();
        }}
      >
        <svg viewBox="0 0 100 50" width={240} aria-hidden="true">
          <g ref={ref}>
            <rect x="20" y="10" width="60" height="30" rx="6" fill="#6366f1" />
          </g>
        </svg>
      </SvgPanel>
    );
  },
};

export const S08LogoReveal: Story = {
  name: "S08 Logo reveal mask",
  render: ({ reducedMotion }) => {
    const ref = useRef<SVGSVGElement | null>(null);
    const logo = useLogoReveal(ref, { pattern: "circle", trigger: "mount", reducedMotion });
    return (
      <SvgPanel
        onPlay={() => {
          logo.current?.seek(0);
          logo.current?.play();
        }}
      >
        <svg ref={ref} viewBox="0 0 90 50" width={200} role="img" aria-label="Logo">
          <path d="M10 40 L30 10 L50 40 Z M60 40 L60 10 L80 40 L80 10" style={stroke} />
        </svg>
      </SvgPanel>
    );
  },
};

export const S09DashFlow: Story = {
  name: "S09 Dash flow (marching ants)",
  render: ({ reducedMotion }) => {
    const ref = useRef<SVGRectElement | null>(null);
    const ants = useDashFlow(ref, { trigger: "manual", repeat: 2, reducedMotion });
    return (
      <div style={panel}>
        <svg viewBox="0 0 100 50" width={240} aria-hidden="true">
          <rect ref={ref} x="10" y="8" width="80" height="34" rx="4" style={stroke} />
        </svg>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={() => ants.current?.play()}>
            Flow
          </button>
          <button type="button" onClick={() => ants.current?.pause()}>
            Pause
          </button>
        </div>
      </div>
    );
  },
};

export const S10SuccessCheck: Story = {
  name: "S10 Success checkmark",
  render: ({ reducedMotion }) => (
    <Replay>
      {(k) => (
        <>
          <SuccessCheck
            key={k}
            trigger="mount"
            reducedMotion={reducedMotion}
            style={{ color: "#15803d" }}
          />
          <p role="status">{k > 0 ? "Saved." : ""}</p>
        </>
      )}
    </Replay>
  ),
};
