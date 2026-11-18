// Phase 013 gallery: the 20 Cinematic & Scenes and Page Transitions entries rendered with the real package
// exports (no local re-implementations). Every autoplaying piece has pause/stop controls; reduced motion
// follows the operating system live. The in-page suites (cinematic-suite.ts) run against this markup.
import {
  CameraStage,
  Chapter,
  CurtainReveal,
  DepthOfField,
  getCinematicDebugInfo,
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
import "@neshel-ui/animations/cinematic.css";
import { fadeLeft, fadeUp } from "@neshel-ui/animations/entrance";
import {
  type PageEffect,
  PageTransition,
  PersistentElement,
  RouteProgress,
  SharedElement,
  startPageTransition,
  useNavigationDirection,
  usePageTransition,
} from "@neshel-ui/animations/page-transitions";
import "@neshel-ui/animations/page-transitions.css";
import { ScrollScene, useScrollScene } from "@neshel-ui/animations/scroll";
import { Profiler, useEffect, useRef, useState } from "react";
import { cinematicReducedFacts, runCinematicSuite, runPageSuite } from "./cinematic-suite";
import { labState } from "./lab-state";

function ScrollChapters() {
  const scene = useScrollScene();
  return (
    <SceneChapters source={scene} id="c02-chapters" className="c-chapters">
      <Chapter id="c02-intro">
        <SceneSegment id="c02-seg-a" effect={fadeUp} options={{ distance: 48 }} span={[0, 0.8]}>
          <h4>Chapter 1 — Arrival</h4>
        </SceneSegment>
      </Chapter>
      <Chapter id="c02-middle" weight={2}>
        <SceneSegment id="c02-seg-b" from={{ x: -120, opacity: 0 }} span={[0, 0.5]}>
          <p>Chapter 2 — the journey (segment scrubbed by scroll)</p>
        </SceneSegment>
      </Chapter>
      <Chapter id="c02-end">
        <SceneSegment id="c02-seg-c" from={{ scale: 0.6, opacity: 0 }}>
          <p>Chapter 3 — home</p>
        </SceneSegment>
      </Chapter>
    </SceneChapters>
  );
}

const CARDS = ["North", "East", "South", "West", "Harbour", "Summit"];
const PAGES: Record<string, { title: string; body: string }> = {
  list: { title: "Gallery", body: "Choose a photo to open it." },
  detail: { title: "Photo detail", body: "The thumbnail morphed into this hero image." },
};

export function CinematicGallery() {
  const commits = useRef(0);
  // C01
  const boxes = useRef<Array<HTMLDivElement | null>>([]);
  const timeline = useTimeline((tl) => {
    const [a, b, c] = boxes.current;
    if (!a || !b || !c) return;
    tl.add({ id: "a", target: a, to: { x: 160 }, duration: 600, easing: "linear" });
    tl.label("second", "-=200");
    tl.add({ id: "b", target: b, to: { x: 160, rotate: 90 }, duration: 600 }, "second");
    tl.add({ id: "c", target: c, from: { opacity: 0.2 }, to: { x: 160 }, duration: 400 }, "<+=100");
  }, []);
  // C03
  const camera = useCamera();
  const cardRefs = useRef<Array<HTMLButtonElement | null>>([]);
  // C04/C05
  const [split, setSplit] = useState(false);
  const [curtain, setCurtain] = useState(false);
  const [shutter, setShutter] = useState(false);
  // C06
  const [titleRun, setTitleRun] = useState(0);
  // C07
  const [lit, setLit] = useState<number | null>(null);
  const litRefs = useRef<Array<HTMLLIElement | null>>([]);
  // C08
  const [depth, setDepth] = useState(-1);
  // C10
  const [boxed, setBoxed] = useState(false);
  // PT
  const [page, setPage] = useState<"list" | "detail">("list");
  const [effect, setEffect] = useState<PageEffect>("slide");
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const [vanilla, setVanilla] = useState(0);
  const transition = usePageTransition();
  const { direction } = useNavigationDirection();

  useEffect(() => {
    labState().cinematic = {
      runCinematicSuite,
      runPageSuite,
      reducedFacts: cinematicReducedFacts,
      debug: () => getCinematicDebugInfo(),
      commits: () => commits.current,
      timeline: () => timeline,
      camera: () => camera,
      setPage: (next) => setPage(next),
    };
  }, [timeline, camera]);

  const go = (next: "list" | "detail", dir: "forward" | "back") =>
    transition.start(() => setPage(next), { effect, direction: dir });

  return (
    <Profiler id="cinematic" onRender={() => commits.current++}>
      <section className="lab-section gallery" aria-labelledby="cinematic-title">
        <h2 id="cinematic-title">Cinematic, scenes &amp; page transitions (Phase 013)</h2>
        <p>
          The 20 Phase 013 entries on the real package. Autoplay is opt-in and pausable; reduced
          motion (operating system) shows end states or short fades.
        </p>

        <h3 id="c-cinematic">Cinematic &amp; scenes</h3>
        <div className="gallery-grid c-grid">
          <figure className="gallery-tile">
            <figcaption>C01 Timeline sequencer (labels, overlaps)</figcaption>
            <div className="c-track">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  id={`c01-box-${i}`}
                  className="c-box"
                  ref={(node) => {
                    boxes.current[i] = node;
                  }}
                />
              ))}
            </div>
            <div className="g-row-buttons">
              <button type="button" id="c01-play" onClick={() => timeline.play()}>
                Play
              </button>
              <button type="button" id="c01-pause" onClick={() => timeline.pause()}>
                Pause
              </button>
              <button type="button" id="c01-reverse" onClick={() => timeline.reverse()}>
                Reverse
              </button>
              <button type="button" id="c01-seek" onClick={() => timeline.seek(0.5)}>
                Seek 50%
              </button>
            </div>
          </figure>

          <figure className="gallery-tile">
            <figcaption>C03 Camera pan/zoom (Tab into the cards)</figcaption>
            <CameraStage
              id="c03-stage"
              label="City map"
              camera={camera}
              minZoom={0.25}
              className="c-stage"
            >
              <div className="c-canvas">
                {CARDS.map((name, i) => (
                  <button
                    type="button"
                    key={name}
                    id={`c03-card-${i}`}
                    className="c-card"
                    ref={(node) => {
                      cardRefs.current[i] = node;
                    }}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </CameraStage>
            <div className="g-row-buttons">
              <button
                type="button"
                id="c03-focus"
                onClick={() => {
                  const card = cardRefs.current[4];
                  if (card) void camera.to({ focus: card });
                }}
              >
                Focus Harbour
              </button>
              <button
                type="button"
                id="c03-overview"
                onClick={() => void camera.to({ x: 600, y: 360, zoom: 0.5 })}
              >
                Overview
              </button>
            </div>
          </figure>

          <figure className="gallery-tile">
            <figcaption>C04 Split-screen reveal</figcaption>
            <SplitReveal id="c04" open={split} className="c-panel">
              <p id="c04-content" style={{ color: "rebeccapurple" }}>
                Revealed content
              </p>
            </SplitReveal>
            <button type="button" id="c04-toggle" onClick={() => setSplit(!split)}>
              {split ? "Close" : "Open"}
            </button>
          </figure>

          <figure className="gallery-tile">
            <figcaption>C05 Curtain / shutter open</figcaption>
            <CurtainReveal id="c05-curtain" open={curtain} className="c-panel">
              <p>Curtain</p>
            </CurtainReveal>
            <CurtainReveal
              id="c05-shutter"
              open={shutter}
              pattern="shutter"
              slats={5}
              className="c-panel"
            >
              <p>Shutter</p>
            </CurtainReveal>
            <div className="g-row-buttons">
              <button type="button" id="c05-curtain-toggle" onClick={() => setCurtain(!curtain)}>
                Curtain
              </button>
              <button type="button" id="c05-shutter-toggle" onClick={() => setShutter(!shutter)}>
                Shutter
              </button>
            </div>
          </figure>

          <figure className="gallery-tile">
            <figcaption>C06 Title sequence</figcaption>
            <TitleSequence
              id="c06"
              effect={fadeLeft}
              options={{ distance: 24 }}
              interval={140}
              replay={titleRun}
              appear="manual"
              background={<div className="c-title-bg" />}
            >
              <h4>Rooted in faith</h4>
              <p>Built with hope</p>
              <p>Neshel-UI</p>
            </TitleSequence>
            <button type="button" id="c06-replay" onClick={() => setTitleRun((n) => n + 1)}>
              Play title
            </button>
          </figure>

          <figure className="gallery-tile">
            <figcaption>C07 Spotlight focus</figcaption>
            <Spotlight
              id="c07"
              target={lit === null ? null : litRefs.current[lit]}
              radius={60}
              className="c-panel"
            >
              <ul className="c-list">
                {["Plan", "Build", "Ship"].map((item, i) => (
                  <li
                    key={item}
                    id={`c07-item-${i}`}
                    ref={(node) => {
                      litRefs.current[i] = node;
                    }}
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </Spotlight>
            <div className="g-row-buttons">
              {[0, 1, 2].map((i) => (
                <button type="button" key={i} id={`c07-light-${i}`} onClick={() => setLit(i)}>
                  Light {i + 1}
                </button>
              ))}
              <button type="button" id="c07-clear" onClick={() => setLit(null)}>
                Clear
              </button>
            </div>
          </figure>

          <figure className="gallery-tile">
            <figcaption>C08 Depth-of-field blur</figcaption>
            <DepthOfField id="c08" focus={depth} className="c-depth">
              <div className="c-layer">Foreground</div>
              <div className="c-layer">Subject</div>
              <div className="c-layer">Background</div>
            </DepthOfField>
            <div className="g-row-buttons">
              {[0, 1, 2].map((i) => (
                <button type="button" key={i} id={`c08-focus-${i}`} onClick={() => setDepth(i)}>
                  Focus {i + 1}
                </button>
              ))}
              <button type="button" id="c08-sharp" onClick={() => setDepth(-1)}>
                All sharp
              </button>
            </div>
          </figure>

          <figure className="gallery-tile">
            <figcaption>C09 Autoplay storyboard (pause/stop)</figcaption>
            <Storyboard id="c09" label="Storyboard" autoplay interval={2000} transition="slide">
              <StoryboardFrame label="Sunrise">
                <p className="c-frame">1 — Sunrise</p>
              </StoryboardFrame>
              <StoryboardFrame label="Noon">
                <p className="c-frame">2 — Noon</p>
              </StoryboardFrame>
              <StoryboardFrame label="Dusk">
                <p className="c-frame">3 — Dusk</p>
              </StoryboardFrame>
            </Storyboard>
          </figure>

          <figure className="gallery-tile">
            <figcaption>C10 Letterbox transition</figcaption>
            <Letterbox id="c10" active={boxed} className="c-letterbox">
              <p id="c10-content">Wide shot</p>
            </Letterbox>
            <button type="button" id="c10-toggle" onClick={() => setBoxed(!boxed)}>
              {boxed ? "Remove bars" : "Cinema bars"}
            </button>
          </figure>
        </div>

        <h3 id="c02-title">C02 Scene chapters (scroll the pinned scene)</h3>
        <ScrollScene id="c02-scene" length={3} driver="js">
          <ScrollChapters />
        </ScrollScene>

        <h3 id="pt-title">Page transitions</h3>
        <p>
          Native View Transitions with fallbacks. Direction:{" "}
          <output id="pt-direction">{direction}</output>. Cross-document demo:{" "}
          <a href="./mpa-a.html">open the MPA pages</a>.
        </p>
        <div className="g-row-buttons">
          {(["fade", "slide", "scale", "wipe"] as const).map((name) => (
            <button
              type="button"
              key={name}
              id={`pt-effect-${name}`}
              aria-pressed={effect === name}
              onClick={() => setEffect(name)}
            >
              {name}
            </button>
          ))}
        </div>
        <div className="pt-app">
          <PersistentElement name="lab-player" asChild>
            <div id="pt-player" className="pt-player">
              ♪ Persistent player (PT08)
            </div>
          </PersistentElement>
          <PageTransition effect={effect} id="pt-page" className="pt-page">
            <h4 id="pt-heading">{PAGES[page]?.title}</h4>
            <p>{PAGES[page]?.body}</p>
            {page === "list" ? (
              <>
                <SharedElement name="lab-photo" asChild>
                  <div id="pt-thumb" className="pt-thumb" />
                </SharedElement>
                <button type="button" id="pt-open" onClick={() => go("detail", "forward")}>
                  Open photo
                </button>
              </>
            ) : (
              <>
                <SharedElement name="lab-photo" asChild>
                  <div id="pt-hero" className="pt-hero" />
                </SharedElement>
                <button type="button" id="pt-back" onClick={() => go("list", "back")}>
                  Back to gallery
                </button>
              </>
            )}
          </PageTransition>
        </div>
        <div className="g-row-buttons">
          <button
            type="button"
            id="pt-slow"
            onClick={() => {
              setFailed(false);
              setPending(true);
              window.setTimeout(() => setPending(false), 900);
            }}
          >
            Slow navigation (PT07)
          </button>
          <button
            type="button"
            id="pt-fail"
            onClick={() => {
              setFailed(true);
              setPending(true);
              window.setTimeout(() => setPending(false), 400);
            }}
          >
            Failing navigation
          </button>
          <button
            type="button"
            id="pt-vanilla"
            onClick={() => {
              startPageTransition(
                () => {
                  const target = document.getElementById("pt-vanilla-output");
                  if (target) target.textContent = `Framework-free update ${vanilla + 1}`;
                  setVanilla((n) => n + 1);
                },
                {
                  effect: "scale",
                  scope: document.getElementById("pt-vanilla-output") ?? undefined,
                },
              );
            }}
          >
            Framework-free transition
          </button>
        </div>
        <p id="pt-vanilla-output" className="pt-vanilla">
          Framework-free update 0
        </p>
        <RouteProgress
          id="pt-progress"
          pending={pending}
          failed={failed}
          delay={0}
          announce
          className="pt-progress"
        />
      </section>
    </Profiler>
  );
}
