// Phase 014 gallery: the 21 Typography & Text and SVG & Paths entries rendered with the real package exports
// (no local re-implementations). Continuous effects are finite by default and pausable; reduced motion follows
// the operating system live. The in-page suite (text-svg-suite.ts) runs against this markup.
import "@fontsource-variable/inter/opsz.css";
import { createScrollProgress } from "@neshel-ui/animations/scroll";
import {
  getSvgDebugInfo,
  MorphIcon,
  menuCloseShapes,
  SuccessCheck,
  useChartDraw,
  useDashFlow,
  useGradientStops,
  useLogoReveal,
  useMotionPath,
  usePathDraw,
  usePathMorph,
  useTurbulence,
} from "@neshel-ui/animations/svg";
import "@neshel-ui/animations/svg.css";
import {
  FontAxes,
  GradientText,
  getTextDebugInfo,
  Highlight,
  LineReveal,
  NumberRoll,
  type ProgressSource,
  RotatingWords,
  type RotatingWordsControl,
  ScrambleText,
  TextMask,
  TextReveal,
  Typewriter,
  WaveText,
} from "@neshel-ui/animations/text";
import "@neshel-ui/animations/text.css";
import { Heading } from "@neshel-ui/typography";
import { Profiler, useEffect, useRef, useState } from "react";
import { labState } from "./lab-state";
import { benchTextLoad, runTextSvgSuite, textSvgReducedFacts } from "./text-svg-suite";

const LOGO = "M10 40 L30 10 L50 40 Z M60 40 L60 10 L80 40 L80 10";

function SvgDemos() {
  const drawRef = useRef<SVGPathElement | null>(null);
  const dashedRef = useRef<SVGPathElement | null>(null);
  const morphRef = useRef<SVGPathElement | null>(null);
  const travellerRef = useRef<HTMLDivElement | null>(null);
  const gradientRef = useRef<SVGLinearGradientElement | null>(null);
  const chartRef = useRef<SVGSVGElement | null>(null);
  const wobbleRef = useRef<SVGGElement | null>(null);
  const logoRef = useRef<SVGSVGElement | null>(null);
  const antsRef = useRef<SVGRectElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [checkRun, setCheckRun] = useState(0);
  const draw = usePathDraw(drawRef, { duration: 900, trigger: "manual" });
  const dashed = usePathDraw(dashedRef, { duration: 600, trigger: "manual" });
  const morph = usePathMorph(morphRef, {
    shapes: [
      "M10 50 C 30 10, 70 10, 90 50",
      "M10 50 C 30 90, 70 90, 90 50",
      "M10 20 C 30 20, 70 80, 90 80",
    ],
    duration: 500,
  });
  const motion = useMotionPath(travellerRef, {
    path: "M0 0 C 80 -60, 160 60, 240 0",
    duration: 1200,
    trigger: "manual",
  });
  const stops = useGradientStops(gradientRef, {
    stops: [{ color: ["#6366f1", "#ec4899"] }, { color: ["#14b8a6", "#f59e0b"], offset: [1, 0.7] }],
    duration: 2000,
    trigger: "manual",
  });
  const chart = useChartDraw(chartRef, {
    lines: ".s06-line",
    points: ".s06-point",
    trigger: "manual",
    duration: 900,
  });
  const wobble = useTurbulence(wobbleRef, { amplitude: 8, duration: 3000, trigger: "manual" });
  const logo = useLogoReveal(logoRef, {
    pattern: "wipe-right",
    outline: undefined,
    trigger: "manual",
    duration: 800,
  });
  const ants = useDashFlow(antsRef, {
    dash: 6,
    gap: 4,
    speed: 30,
    duration: 3000,
    trigger: "manual",
  });

  useEffect(() => {
    const lab = labState();
    lab.textSvg = {
      ...(lab.textSvg ?? ({} as never)),
      svg: { draw, dashed, morph, motion, stops, chart, wobble, logo, ants },
    };
  });

  return (
    <>
      <h3 id="s-svg">SVG &amp; paths</h3>
      <div className="gallery-grid ts-grid">
        <figure className="gallery-tile">
          <figcaption>S01 Path draw (stroke-dashoffset)</figcaption>
          <svg viewBox="0 0 100 60" className="ts-svg" aria-hidden="true">
            <path
              id="s01-path"
              ref={drawRef}
              d="M5 50 Q 25 0, 50 30 T 95 10"
              className="ts-stroke"
            />
            <path
              id="s01-dashed"
              ref={dashedRef}
              d="M5 56 L95 56"
              className="ts-stroke"
              style={{ strokeDasharray: "4 3" }}
            />
          </svg>
          <button
            type="button"
            id="s01-play"
            onClick={() => {
              draw.current?.seek(0);
              draw.current?.play();
              dashed.current?.seek(0);
              dashed.current?.play();
            }}
          >
            Draw
          </button>
        </figure>
        <figure className="gallery-tile">
          <figcaption>S02 Path morph (compatible commands)</figcaption>
          <svg viewBox="0 0 100 100" className="ts-svg" aria-hidden="true">
            <path
              id="s02-path"
              ref={morphRef}
              d="M10 50 C 30 10, 70 10, 90 50"
              className="ts-stroke"
            />
          </svg>
          <div className="g-row-buttons">
            {[0, 1, 2].map((i) => (
              <button key={i} type="button" id={`s02-to-${i}`} onClick={() => morph.current?.to(i)}>
                Shape {i + 1}
              </button>
            ))}
          </div>
        </figure>
        <figure className="gallery-tile">
          <figcaption>S03 Motion along a path</figcaption>
          <div className="ts-motion-stage">
            <div id="s03-traveller" ref={travellerRef} className="ts-traveller" />
          </div>
          <button
            type="button"
            id="s03-play"
            onClick={() => {
              motion.current?.seek(0);
              motion.current?.play();
            }}
          >
            Travel
          </button>
        </figure>
        <figure className="gallery-tile">
          <figcaption>S04 Icon morph (menu ↔ close)</figcaption>
          <button
            type="button"
            id="s04-button"
            className="ts-icon-button"
            aria-label="Menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <MorphIcon shapes={menuCloseShapes} state={menuOpen ? "close" : "menu"} />
          </button>
        </figure>
        <figure className="gallery-tile">
          <figcaption>S05 Animated gradient stops</figcaption>
          <svg viewBox="0 0 100 40" className="ts-svg" aria-hidden="true">
            <defs>
              <linearGradient id="s05-gradient" ref={gradientRef}>
                <stop id="s05-stop-0" offset="0" stopColor="#6366f1" />
                <stop id="s05-stop-1" offset="1" stopColor="#14b8a6" />
              </linearGradient>
            </defs>
            <rect width="100" height="40" rx="6" fill="url(#s05-gradient)" />
          </svg>
          <button type="button" id="s05-play" onClick={() => stops.current?.play()}>
            Shift
          </button>
        </figure>
        <figure className="gallery-tile">
          <figcaption>S06 Line-chart draw-in (your paths)</figcaption>
          <svg
            id="s06-chart"
            ref={chartRef}
            viewBox="0 0 100 60"
            className="ts-svg"
            aria-hidden="true"
          >
            <path className="s06-line ts-stroke" d="M5 50 L30 30 L55 38 L80 12 L95 18" />
            {[
              [5, 50],
              [30, 30],
              [55, 38],
              [80, 12],
              [95, 18],
            ].map(([x, y]) => (
              <circle key={x} className="s06-point" cx={x} cy={y} r="2.5" />
            ))}
          </svg>
          <button
            type="button"
            id="s06-play"
            onClick={() => {
              chart.current?.seek(0);
              chart.current?.play();
            }}
          >
            Draw chart
          </button>
        </figure>
        <figure className="gallery-tile">
          <figcaption>S07 Turbulence wobble (SVG filter)</figcaption>
          <svg viewBox="0 0 100 50" className="ts-svg" aria-hidden="true">
            <g id="s07-target" ref={wobbleRef}>
              <rect x="20" y="10" width="60" height="30" rx="6" className="ts-fill" />
            </g>
          </svg>
          <div className="g-row-buttons">
            <button type="button" id="s07-play" onClick={() => wobble.current?.play()}>
              Wobble
            </button>
            <button type="button" id="s07-stop" onClick={() => wobble.current?.stop()}>
              Stop
            </button>
          </div>
        </figure>
        <figure className="gallery-tile">
          <figcaption>S08 Logo reveal mask</figcaption>
          <svg
            id="s08-logo"
            ref={logoRef}
            viewBox="0 0 90 50"
            className="ts-svg"
            role="img"
            aria-label="Neshel logo"
          >
            <path d={LOGO} className="ts-stroke" />
          </svg>
          <button
            type="button"
            id="s08-play"
            onClick={() => {
              logo.current?.seek(0);
              logo.current?.play();
            }}
          >
            Reveal
          </button>
        </figure>
        <figure className="gallery-tile">
          <figcaption>S09 Dash flow (marching ants)</figcaption>
          <svg viewBox="0 0 100 50" className="ts-svg" aria-hidden="true">
            <rect
              id="s09-rect"
              ref={antsRef}
              x="10"
              y="8"
              width="80"
              height="34"
              rx="4"
              className="ts-stroke"
            />
          </svg>
          <div className="g-row-buttons">
            <button type="button" id="s09-play" onClick={() => ants.current?.play()}>
              Flow
            </button>
            <button type="button" id="s09-pause" onClick={() => ants.current?.pause()}>
              Pause
            </button>
          </div>
        </figure>
        <figure className="gallery-tile">
          <figcaption>S10 Success checkmark draw</figcaption>
          <SuccessCheck key={checkRun} id="s10-check" trigger="mount" className="ts-check" />
          <p id="s10-status" role="status">
            {checkRun > 0 ? "Saved." : ""}
          </p>
          <button type="button" id="s10-play" onClick={() => setCheckRun((n) => n + 1)}>
            Save
          </button>
        </figure>
      </div>
      <svg className="ts-corpus" aria-hidden="true" width="0" height="0" id="s-corpus">
        <path d="M10 10 L90 10" />
        <path d="M10 10 C 30 80, 70 -60, 90 10" />
        <path d="M10 50 a40 40 0 1 1 80 0 a40 40 0 1 1 -80 0" />
        <path d="m10 10 h50 v30 h-50 z m60 0 l20 20" />
        <path d="M10 10 Q 50 90 90 10 T 170 10" transform="scale(2) rotate(10)" />
        <path d="M0 0 S 40 40 80 0 S 120 -40 160 0" />
      </svg>
    </>
  );
}

export function TextSvgGallery() {
  const commits = useRef(0);
  const [replay, setReplay] = useState(0);
  const [value, setValue] = useState(-1234.56);
  const [bold, setBold] = useState(false);
  const rotator = useRef<RotatingWordsControl | null>(null);
  const lineSubject = useRef<HTMLDivElement | null>(null);
  const [lineSource, setLineSource] = useState<ProgressSource | undefined>(undefined);
  useEffect(() => {
    const subject = lineSubject.current;
    if (!subject) return;
    const progress = createScrollProgress({ subject, range: ["entry 0%", "cover 60%"] });
    setLineSource(progress);
    return () => progress.destroy();
  }, []);
  useEffect(() => {
    const lab = labState();
    lab.textSvg = {
      ...(lab.textSvg ?? ({} as never)),
      runTextSvgSuite,
      reducedFacts: textSvgReducedFacts,
      benchTextLoad,
      debug: () => ({ text: getTextDebugInfo(), svg: getSvgDebugInfo() }),
      commits: () => commits.current,
      replay: () => setReplay((n) => n + 1),
      setValue: (next: number) => setValue(next),
      setBold: (next: boolean) => setBold(next),
      stopRotate: () => rotator.current?.stop(),
      rotate: () => {
        rotator.current?.stop();
        rotator.current?.play();
      },
    };
  });

  return (
    <Profiler id="text-svg" onRender={() => commits.current++}>
      <section className="lab-section gallery" aria-labelledby="text-svg-title">
        <h2 id="text-svg-title">Typography &amp; text, SVG &amp; paths (Phase 014)</h2>
        <p>
          The 21 Phase 014 entries on the real package. Split text keeps one accessible copy;
          continuous effects are finite and pausable; reduced motion shows end states.
        </p>

        <h3 id="t-text">Typography &amp; text</h3>
        <div className="gallery-grid ts-grid">
          <figure className="gallery-tile ts-wide">
            <figcaption>T01 Split reveal — chars, words, lines</figcaption>
            <TextReveal
              key={`a${replay}`}
              as="h4"
              id="t01-chars"
              split="chars"
              trigger="mount"
              duration={900}
            >
              Rooted in faith 👨‍👩‍👧‍👦
            </TextReveal>
            <TextReveal key={`b${replay}`} as="p" id="t01-words" variant="blur" trigger="mount">
              Built with hope, word by word.
            </TextReveal>
            <TextReveal
              key={`c${replay}`}
              as="p"
              id="t01-lines"
              split="lines"
              variant="fade-up"
              trigger="mount"
              className="ts-measure"
            >
              Lines are measured once and regrouped only when the width or the fonts change, never
              per frame.
            </TextReveal>
            <p id="t01-rtl" dir="ltr" lang="en">
              <TextReveal key={`r${replay}`} as="span" id="t01-mixed" split="chars" trigger="mount">
                Hello שלום עולם 123 مرحبا
              </TextReveal>
            </p>
            <div className="ts-capsize">
              <Heading size="xl" id="t01-trim-plain">
                Capsize heading
              </Heading>
              {/* The same Capsize-trimmed Heading, split: its box height must not change (suite). */}
              <TextReveal
                key={`t${replay}`}
                as={Heading as never}
                {...({ size: "xl" } as object)}
                id="t01-trim-split"
                trigger="mount"
              >
                Capsize heading
              </TextReveal>
            </div>
            <button type="button" id="t01-replay" onClick={() => setReplay((n) => n + 1)}>
              Replay text
            </button>
          </figure>
          <figure className="gallery-tile">
            <figcaption>T02 Typewriter</figcaption>
            <Typewriter key={replay} id="t02" speed={35} trigger="mount" caret="always">
              Accessible from the very first frame.
            </Typewriter>
          </figure>
          <figure className="gallery-tile">
            <figcaption>T03 Scramble / decode</figcaption>
            <ScrambleText key={replay} id="t03" trigger="mount" seed={7}>
              DECODED MESSAGE
            </ScrambleText>
          </figure>
          <figure className="gallery-tile">
            <figcaption>T04 Gradient sweep text</figcaption>
            <p className="ts-large">
              <GradientText key={replay} id="t04" trigger="mount">
                Gradient sweep
              </GradientText>
            </p>
          </figure>
          <figure className="gallery-tile">
            <figcaption>T05 Number roll (localised)</figcaption>
            <p className="ts-large">
              <NumberRoll
                id="t05"
                value={value}
                locale="de-DE"
                format={{ style: "currency", currency: "EUR" }}
              />
            </p>
            <p className="ts-large">
              <NumberRoll id="t05-ar" value={Math.round(Math.abs(value))} locale="ar-EG" />
            </p>
            <button
              type="button"
              id="t05-change"
              onClick={() => setValue((v) => Math.round((v + 987.65) * 100) / 100)}
            >
              Change value
            </button>
          </figure>
          <figure className="gallery-tile">
            <figcaption>T06 Rotating words</figcaption>
            <p>
              We build{" "}
              <RotatingWords
                id="t06"
                controlRef={rotator}
                words={["fast", "accessible", "precise"]}
                interval={1200}
                repeat={1}
              />{" "}
              interfaces.
            </p>
          </figure>
          <figure className="gallery-tile">
            <figcaption>T07 Kinetic wave</figcaption>
            <WaveText key={replay} id="t07" className="ts-large">
              Gentle wave
            </WaveText>
          </figure>
          <figure className="gallery-tile">
            <figcaption>T08 Highlighter draw</figcaption>
            <p>
              The band sits{" "}
              <Highlight key={replay} id="t08" trigger="mount">
                behind the glyphs, never over them
              </Highlight>
              .
            </p>
          </figure>
          <figure className="gallery-tile">
            <figcaption>T09 Text mask reveal</figcaption>
            <TextMask key={replay} as="p" id="t09" trigger="mount" className="ts-measure">
              Each line rises inside its own clipped line box.
            </TextMask>
          </figure>
          <figure className="gallery-tile">
            <figcaption>T10 Variable-font axes (Inter Variable)</figcaption>
            <p className="ts-variable">
              <FontAxes
                id="t10"
                from={{ wght: 300, opsz: 14 }}
                to={{ wght: 800, opsz: 32 }}
                active={bold}
              >
                Variable axes
              </FontAxes>
            </p>
            <button
              type="button"
              id="t10-toggle"
              aria-pressed={bold}
              onClick={() => setBold((b) => !b)}
            >
              Toggle weight
            </button>
          </figure>
          <figure className="gallery-tile ts-wide">
            <figcaption>T11 Line-by-line reveal on scroll</figcaption>
            <div ref={lineSubject} id="t11-subject">
              {lineSource ? (
                <LineReveal id="t11" source={lineSource} className="ts-measure">
                  Scroll drives these lines through the Scroll Engine progress contract, received as
                  a value: the text family never imports the scroll family.
                </LineReveal>
              ) : (
                <p className="ts-measure">Scroll drives these lines.</p>
              )}
            </div>
          </figure>
        </div>
        <SvgDemos />
      </section>
    </Profiler>
  );
}
