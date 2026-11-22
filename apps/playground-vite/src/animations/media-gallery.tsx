// Phase 015 gallery: the 30 Images & Media, Background & Ambient and Loading & Feedback entries rendered with the
// real package exports (no local re-implementations). Images are generated locally (canvas data URLs); the scrub
// clip is an ffmpeg `testsrc2` pattern encoded with short GOPs (no third-party content). Ambient effects are finite
// (5 s) and pausable by the page toggle; reduced motion follows the operating system live. The in-page suite
// (media-suite.ts) runs against this markup.
import {
  type AmbientControl,
  AmbientMotionToggle,
  Aurora,
  FloatingShapes,
  GradientShift,
  Grain,
  GridPattern,
  getAmbientDebugInfo,
  MeshGradient,
  Particles,
  PointerGlow,
  Starfield,
  Waves,
} from "@neshel-ui/animations/ambient";
import "@neshel-ui/animations/ambient.css";
import { motionValue } from "@neshel-ui/animations/core";
import {
  createToaster,
  DotsPulse,
  getFeedbackDebugInfo,
  LoadingButton,
  OptimisticPulse,
  type OptimisticStatus,
  PendingText,
  ProgressBar,
  ProgressRing,
  Shimmer,
  SkeletonShimmer,
  Spinner,
  SuccessMark,
  Toaster,
} from "@neshel-ui/animations/feedback";
import "@neshel-ui/animations/feedback.css";
import {
  BlurUpImage,
  CompareSlider,
  Crossfade,
  Duotone,
  getMediaDebugInfo,
  HoverPan,
  KenBurns,
  Lightbox,
  LoadReveal,
  PixelDissolve,
  type ProgressControl,
  useVideoScrub,
} from "@neshel-ui/animations/media";
import "@neshel-ui/animations/media.css";
import { Profiler, useEffect, useMemo, useRef, useState } from "react";
import { labState } from "./lab-state";
import scrubMp4 from "./media/scrub.mp4";
import scrubWebm from "./media/scrub.webm";
import { mediaReducedFacts, runMediaSuite } from "./media-suite";

/** A deterministic generated picture (data URL): gradient, grid and a label — CORS-clean for canvas probes. */
function picture(label: string, hueA: number, hueB: number, w = 640, h = 400): string {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, `hsl(${hueA} 70% 45%)`);
  g.addColorStop(1, `hsl(${hueB} 70% 35%)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "rgb(255 255 255 / 0.25)";
  for (let x = 0; x <= w; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y <= h; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  ctx.fillStyle = "#fff";
  ctx.font = "bold 44px system-ui, sans-serif";
  ctx.fillText(label, 32, h - 40);
  return canvas.toDataURL("image/png");
}

const BROKEN = "data:image/png;base64,bm90LWFuLWltYWdl";
/** Media never wider than their gallery cell (no horizontal page overflow at narrow viewports). */
const FLUID = { maxWidth: "100%", height: "auto" } as const;

function MediaDemos() {
  const pics = useMemo(
    () => ({
      a: picture("Before", 210, 260),
      b: picture("After", 20, 330),
      c: picture("Third", 120, 180),
      tiny: picture("", 210, 260, 16, 10),
    }),
    [],
  );
  const kenBurns = useRef<ProgressControl | null>(null);
  const duotone = useRef<ProgressControl | null>(null);
  const [deferred, setDeferred] = useState<string | undefined>(undefined);
  const [deferredKey, setDeferredKey] = useState(0);
  const [slide, setSlide] = useState(0);
  const [dissolve, setDissolve] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scrub = useMemo(() => motionValue(0), []);
  useVideoScrub(videoRef, { progress: scrub });
  useEffect(() => {
    const lab = labState();
    lab.media = {
      ...(lab.media ?? ({} as never)),
      kenBurns: () => kenBurns.current,
      duotone: () => duotone.current,
      loadDeferred: () => setDeferred(pics.b),
      resetDeferred: () => setDeferred(undefined),
      remountDeferred: () => {
        setDeferred(undefined);
        setDeferredKey((k) => k + 1);
      },
      scrub: (p: number) => scrub.set(p),
      pictures: pics,
    };
  });
  return (
    <div className="gallery-grid">
      <figure className="gallery-item" id="m01">
        <figcaption>M01 Ken Burns</figcaption>
        <KenBurns trigger="manual" controlRef={kenBurns} style={{ height: 160 }}>
          <img src={pics.a} alt="Generated gradient picture" width={640} height={400} />
        </KenBurns>
        <button type="button" id="m01-play" onClick={() => kenBurns.current?.play()}>
          Play camera
        </button>
      </figure>
      <figure className="gallery-item" id="m02">
        <figcaption>M02 Blur-up (deferred, cached, broken)</figcaption>
        <BlurUpImage
          key={`m02-${deferredKey}`}
          id="m02-deferred"
          src={deferred}
          alt="Deferred picture"
          width={320}
          height={200}
          placeholder={pics.tiny}
        />
        <button type="button" id="m02-load" onClick={() => setDeferred(pics.b)}>
          Load image
        </button>
        <BlurUpImage id="m02-cached" src={pics.a} alt="Cached picture" width={160} height={100} />
        <BlurUpImage
          id="m02-broken"
          src={BROKEN}
          alt="Broken picture (alt text stays visible)"
          width={160}
          height={100}
        />
      </figure>
      <figure className="gallery-item" id="m03">
        <figcaption>M03 Reveal mask on load</figcaption>
        <LoadReveal key={`m03-${deferredKey}`} shape="inset" direction="up">
          <img
            id="m03-img"
            src={deferred}
            alt="Revealed picture"
            width={320}
            height={200}
            style={FLUID}
          />
        </LoadReveal>
      </figure>
      <figure className="gallery-item" id="m04">
        <figcaption>M04 Before/after</figcaption>
        <CompareSlider
          id="m04-frame"
          label="Compare before and after"
          before={<img src={pics.a} alt="Before: blue gradient" />}
          after={<img src={pics.b} alt="After: warm gradient" />}
          jumps={{ before: "Show before", after: "Show after" }}
          style={{ height: 180 }}
        />
      </figure>
      <figure className="gallery-item" id="m05">
        <figcaption>M05 Duotone</figcaption>
        <Duotone trigger="manual" controlRef={duotone} shadow="#1b1f3a" highlight="#f2c14e">
          <img
            id="m05-img"
            src={pics.c}
            alt="Duotone picture"
            width={320}
            height={200}
            style={FLUID}
          />
        </Duotone>
        <button type="button" id="m05-play" onClick={() => duotone.current?.play()}>
          Duotone
        </button>
      </figure>
      <figure className="gallery-item" id="m06">
        <figcaption>M06 Video scrub</figcaption>
        <video
          id="m06-video"
          ref={videoRef}
          muted
          playsInline
          preload="auto"
          width={240}
          height={136}
          style={FLUID}
        >
          <source src={scrubWebm} type="video/webm" />
          <source src={scrubMp4} type="video/mp4" />
        </video>
        <label>
          Scrub position
          <input
            type="range"
            id="m06-range"
            min={0}
            max={100}
            defaultValue={0}
            onInput={(e) => scrub.set(Number((e.target as HTMLInputElement).value) / 100)}
          />
        </label>
      </figure>
      <figure className="gallery-item" id="m07">
        <figcaption>M07 Lightbox</figcaption>
        <Lightbox
          label="Enlarged picture"
          thumbnail={
            <img
              id="m07-thumb"
              src={pics.c}
              alt="Open the third picture"
              width={160}
              height={100}
            />
          }
        >
          <img id="m07-large" src={pics.c} alt="Third picture, enlarged" width={640} height={400} />
        </Lightbox>
      </figure>
      <figure className="gallery-item" id="m08">
        <figcaption>M08 Gallery cross-fade</figcaption>
        <Crossfade id="m08-stack" index={slide} style={{ height: 140 }}>
          <img src={pics.a} alt="Slide one" />
          <img src={pics.b} alt="Slide two" />
          <img src={pics.c} alt="Slide three" />
        </Crossfade>
        <button type="button" id="m08-next" onClick={() => setSlide((i) => (i + 1) % 3)}>
          Next slide
        </button>
      </figure>
      <figure className="gallery-item" id="m09">
        <figcaption>M09 Pixel dissolve</figcaption>
        <PixelDissolve
          id="m09-stack"
          index={dissolve}
          cell={12}
          duration={900}
          style={{ height: 140 }}
        >
          <img src={pics.a} alt="Dissolve one" />
          <img src={pics.b} alt="Dissolve two" />
        </PixelDissolve>
        <button type="button" id="m09-toggle" onClick={() => setDissolve((i) => 1 - i)}>
          Dissolve
        </button>
      </figure>
      <figure className="gallery-item" id="m10">
        <figcaption>M10 Hover pan (keyboard: arrows)</figcaption>
        <HoverPan id="m10-frame" keyboard label="Pan the picture detail" style={{ height: 140 }}>
          <img src={pics.b} alt="Pannable picture" />
        </HoverPan>
      </figure>
    </div>
  );
}

function AmbientDemos() {
  const refs = {
    b01: useRef<AmbientControl | null>(null),
    b02: useRef<AmbientControl | null>(null),
    b03: useRef<AmbientControl | null>(null),
    b04: useRef<AmbientControl | null>(null),
    b05: useRef<AmbientControl | null>(null),
    b06: useRef<AmbientControl | null>(null),
    b07: useRef<AmbientControl | null>(null),
    b08: useRef<AmbientControl | null>(null),
    b09: useRef<AmbientControl | null>(null),
    b10: useRef<AmbientControl | null>(null),
  };
  useEffect(() => {
    const lab = labState();
    lab.media = {
      ...(lab.media ?? ({} as never)),
      ambient: () => Object.fromEntries(Object.entries(refs).map(([k, r]) => [k, r.current])),
      replayAmbient: () => {
        for (const r of Object.values(refs)) {
          r.current?.stop();
          r.current?.play();
        }
      },
    };
  });
  const panel = { height: 120, borderRadius: 12, overflow: "hidden", padding: 12 } as const;
  return (
    <>
      <p>
        <AmbientMotionToggle id="b-toggle" />
      </p>
      <div className="gallery-grid">
        <GradientShift id="b01" controlRef={refs.b01} style={panel}>
          <strong>B01 Gradient shift</strong>
        </GradientShift>
        <Aurora
          id="b02"
          controlRef={refs.b02}
          style={{ ...panel, background: "#0b1020", color: "#fff" }}
        >
          <strong>B02 Aurora</strong>
        </Aurora>
        <Grain id="b03" controlRef={refs.b03} jitter style={{ ...panel, background: "#e8e1d6" }}>
          <strong>B03 Grain</strong>
        </Grain>
        <Particles
          id="b04"
          controlRef={refs.b04}
          links
          density={18}
          style={{ ...panel, background: "#0b1020", color: "#cbd5ff" }}
        >
          <strong>B04 Particles</strong>
        </Particles>
        <Starfield
          id="b05"
          controlRef={refs.b05}
          style={{ ...panel, background: "#020617", color: "#fff" }}
        >
          <strong>B05 Starfield</strong>
        </Starfield>
        <GridPattern id="b06" controlRef={refs.b06} style={panel}>
          <strong>B06 Grid</strong>
        </GridPattern>
        <MeshGradient id="b07" controlRef={refs.b07} style={{ ...panel, color: "#fff" }}>
          <strong>B07 Mesh gradient</strong>
        </MeshGradient>
        <FloatingShapes
          id="b08"
          controlRef={refs.b08}
          style={{ ...panel, display: "flex", gap: 16, alignItems: "center" }}
        >
          <span aria-hidden="true" className="lab-shape">
            ●
          </span>
          <span aria-hidden="true" className="lab-shape">
            ▲
          </span>
          <span aria-hidden="true" className="lab-shape">
            ■
          </span>
        </FloatingShapes>
        <PointerGlow
          id="b09"
          controlRef={refs.b09}
          style={{ ...panel, background: "#111827", color: "#fff" }}
        >
          <strong>B09 Pointer glow</strong>
        </PointerGlow>
        <Waves id="b10" controlRef={refs.b10} style={{ ...panel, color: "#2563eb" }}>
          <strong>B10 Waves</strong>
        </Waves>
      </div>
    </>
  );
}

function FeedbackDemos() {
  const toaster = useMemo(() => createToaster({ max: 3 }), []);
  const [loading, setLoading] = useState(false);
  const [paid, setPaid] = useState(0);
  const [status, setStatus] = useState<OptimisticStatus>("idle");
  const [rollbacks, setRollbacks] = useState(0);
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(true);
  const [value, setValue] = useState(40);
  const ring = useMemo(() => motionValue(0.25), []);
  useEffect(() => () => toaster.destroy(), [toaster]);
  useEffect(() => {
    const lab = labState();
    lab.media = {
      ...(lab.media ?? ({} as never)),
      toaster: () => toaster,
      paid: () => paid,
      rollbacks: () => rollbacks,
      setStatus,
      setLoading,
      ring: (p: number) => ring.set(p),
    };
  });
  return (
    <div className="gallery-grid">
      <div className="gallery-item" id="f01">
        <span>F01</span> <Spinner id="f01-spinner" label="Loading results" />
      </div>
      <div className="gallery-item" id="f02" aria-busy="true">
        <span>F02</span>
        <SkeletonShimmer id="f02-skeleton" width="10rem" />
        <Shimmer>
          <span
            id="f02-token"
            style={{
              display: "block",
              height: 12,
              width: "8rem",
              background: "#ddd",
              borderRadius: 4,
            }}
          />
        </Shimmer>
      </div>
      <div className="gallery-item" id="f03">
        <span>F03</span>
        <ProgressBar id="f03-indeterminate" label="Preparing export" />
        <ProgressBar id="f03-known" label="Uploading files" value={value} />
        <button type="button" id="f03-more" onClick={() => setValue((v) => Math.min(100, v + 20))}>
          More progress
        </button>
      </div>
      <div className="gallery-item" id="f04">
        <span>F04</span> <DotsPulse id="f04-dots" label="Connecting" />
      </div>
      <div className="gallery-item" id="f05">
        <span>F05</span> <SuccessMark id="f05-mark" show={success} />
        <button type="button" id="f05-show" onClick={() => setSuccess((s) => !s)}>
          Toggle success
        </button>
        <span role="status">{success ? "Saved" : ""}</span>
      </div>
      <div className="gallery-item" id="f06">
        <span>F06</span>
        <button
          type="button"
          id="f06-show"
          onClick={() => toaster.show({ title: "Draft saved", description: "Version 3 stored" })}
        >
          Show toast
        </button>
        <button
          type="button"
          id="f06-error"
          onClick={() => toaster.show({ title: "Upload failed", tone: "error" })}
        >
          Show error
        </button>
        <Toaster toaster={toaster} />
      </div>
      <div className="gallery-item" id="f07">
        <span>F07</span>
        <LoadingButton loading={loading}>
          <button
            type="button"
            id="f07-button"
            onClick={() => {
              setPaid((n) => n + 1);
              setLoading(true);
              setTimeout(() => setLoading(false), 1500);
            }}
          >
            Pay now
          </button>
        </LoadingButton>
      </div>
      <div className="gallery-item" id="f08">
        <span>F08</span>
        <OptimisticPulse status={status} onRollback={() => setRollbacks((n) => n + 1)}>
          <button
            type="button"
            id="f08-like"
            style={{ borderRadius: 8 }}
            onClick={() => setStatus("pending")}
          >
            Like
          </button>
        </OptimisticPulse>
        <button type="button" id="f08-confirm" onClick={() => setStatus("confirmed")}>
          Server confirms
        </button>
        <button type="button" id="f08-fail" onClick={() => setStatus("failed")}>
          Server fails
        </button>
      </div>
      <div className="gallery-item" id="f09">
        <span>F09</span> <ProgressRing id="f09-ring" label="Rendering" progress={ring} />
        <ProgressRing id="f09-indeterminate" label="Waiting" />
      </div>
      <div className="gallery-item" id="f10">
        <span>F10</span>{" "}
        <PendingText id="f10-text" pending={pending}>
          Saving your changes
        </PendingText>
        <button type="button" id="f10-toggle" onClick={() => setPending((p) => !p)}>
          Toggle pending
        </button>
      </div>
    </div>
  );
}

export function MediaGallery() {
  const commits = useRef(0);
  useEffect(() => {
    const lab = labState();
    lab.media = {
      ...(lab.media ?? ({} as never)),
      runMediaSuite,
      reducedFacts: mediaReducedFacts,
      commits: () => commits.current,
      debug: () => ({
        media: getMediaDebugInfo(),
        ambient: getAmbientDebugInfo(),
        feedback: getFeedbackDebugInfo(),
      }),
    };
  });
  return (
    <Profiler id="media" onRender={() => commits.current++}>
      <section className="lab-section gallery" aria-labelledby="media-title">
        <h2 id="media-title">Images &amp; media, ambient, loading &amp; feedback (Phase 015)</h2>
        <p>
          The 30 Phase 015 entries on the real package. Media keep native semantics; ambient effects
          are decorative, finite and pausable; indicators state what they mean before they move.
        </p>
        <h3>Images &amp; media</h3>
        <MediaDemos />
        <h3>Background &amp; ambient</h3>
        <AmbientDemos />
        <h3>Loading &amp; feedback</h3>
        <FeedbackDemos />
      </section>
    </Profiler>
  );
}
