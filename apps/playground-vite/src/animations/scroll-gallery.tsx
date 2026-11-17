// Phase 011 scroll gallery: the 21 Scroll Triggers (ST01–ST10) and Scroll & Parallax (SP01–SP11) effects
// rendered with the real package exports (no local re-implementations), plus compositions with Entrance,
// Hover and Press, simultaneous scenes and dynamic geometry. `scroll-suite.ts` checks it in real engines.
import { definePreset } from "@neshel-ui/animations/core";
import { fadeUp, stagger } from "@neshel-ui/animations/entrance";
import { Hover, lift, tilt3D } from "@neshel-ui/animations/hover";
import { Press, pressScale } from "@neshel-ui/animations/press";
import {
  depthParallax,
  directionHeader,
  getScrollDebugInfo,
  HorizontalScroll,
  inViewProgress,
  lazyEffect,
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
  useScrollTrigger,
  useSectionSpy,
  velocitySkew,
  zoomOnScroll,
} from "@neshel-ui/animations/scroll";
import { type CSSProperties, useEffect, useRef, useState } from "react";
import { labState } from "./lab-state";
import { runScrollSuite, scrollReducedFacts } from "./scroll-suite";

const SECTIONS = [
  { id: "g-triggers", label: "Triggers" },
  { id: "g-parallax", label: "Parallax" },
  { id: "g-scenes", label: "Scenes" },
  { id: "g-compose", label: "Composition" },
];

const cardsPreset = definePreset("gallery-cards", stagger, { preset: fadeUp, interval: 70 });

function SpyNav() {
  const active = useSectionSpy(SECTIONS.map((section) => section.id));
  return (
    <nav aria-label="Gallery sections" className="gallery-nav">
      {SECTIONS.map((section) => (
        <a
          key={section.id}
          href={`#${section.id}`}
          aria-current={active === section.id ? "location" : undefined}
          data-spy={section.id}
        >
          {section.label}
        </a>
      ))}
    </nav>
  );
}

function TriggerLog() {
  const ref = useRef<HTMLDivElement>(null);
  const [log, setLog] = useState<string[]>([]);
  const push = (entry: string) => setLog((items) => [...items.slice(-5), entry]);
  const state = useScrollTrigger(ref, {
    onEnter: () => push("enter"),
    onLeave: () => push("leave"),
    onEnterBack: () => push("enterBack"),
    onLeaveBack: () => push("leaveBack"),
  });
  return (
    <div ref={ref} id="st04-log" className="gallery-tile" data-state={state}>
      <strong>ST04 callbacks</strong>
      <span>state: {state}</span>
      <code>{log.join(" → ") || "—"}</code>
    </div>
  );
}

function CenterProbe() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, "center");
  return (
    <div ref={ref} id="st10-center" className="gallery-tile" data-in-view={inView}>
      <strong>ST10 preset "center"</strong>
      <span>{inView ? "crossing the centre band" : "outside the band"}</span>
    </div>
  );
}

export function ScrollGallery() {
  const [extra, setExtra] = useState(false);
  useEffect(() => {
    labState().scroll = {
      runScrollSuite,
      reducedFacts: scrollReducedFacts,
      debug: getScrollDebugInfo,
    };
  }, []);
  return (
    <section className="lab-section gallery" aria-labelledby="scroll-title">
      <ScrollProgressBar id="sp03-bar" />
      <header className="gallery-header" id="st06-header">
        <ScrollEffect asChild preset={directionHeader} options={{ offset: 200 }}>
          <div className="gallery-header-inner">
            <h2 id="scroll-title">F · Phase 011 scroll gallery</h2>
            <SpyNav />
          </div>
        </ScrollEffect>
      </header>
      <p>
        Every effect below comes from <code>@neshel-ui/animations/scroll</code>. No scroll
        hijacking: the page scrolls natively, the engine follows. Toggle reduced motion in your OS
        to see the static alternatives (the horizontal section becomes vertical).
      </p>
      <button
        type="button"
        id="dyn-toggle"
        className="gallery-button"
        onClick={() => setExtra((value) => !value)}
      >
        {extra ? "Remove" : "Insert"} content above the scenes (dynamic geometry)
      </button>

      <h3 id="g-triggers">Scroll Triggers</h3>
      <div className="gallery-grid">
        <RevealOnScroll preset={fadeUp} id="st01-card" className="gallery-tile">
          <strong>ST01 reveal on enter</strong>
          <span>Entrance preset fadeUp, played once</span>
        </RevealOnScroll>
        <RevealOnScroll preset={fadeUp} mode="repeat" id="st03-repeat" className="gallery-tile">
          <strong>ST03 repeat</strong>
          <span>re-arms on every leave</span>
        </RevealOnScroll>
        <RevealOnScroll preset={fadeUp} mode="reverse" id="st03-reverse" className="gallery-tile">
          <strong>ST03 reverse</strong>
          <span>plays out when leaving downwards</span>
        </RevealOnScroll>
        <TriggerLog />
        <ScrollEffect preset={inViewProgress} id="st05-card" className="gallery-tile st05">
          <strong>ST05 in-view progress</strong>
          <span className="st05-meter" aria-hidden="true" />
        </ScrollEffect>
        <CenterProbe />
        <ScrollEffect
          preset={lazyEffect}
          options={{ preset: tilt3D, options: { max: 12 } }}
          id="st09-lazy"
          className="gallery-tile"
        >
          <strong>ST09 lazy activation</strong>
          <span>Tilt3D attaches only near the viewport</span>
        </ScrollEffect>
      </div>
      <StaggerOnScroll preset={cardsPreset} id="st02-list" className="gallery-list">
        {["One", "Two", "Three", "Four"].map((label) => (
          <div key={label} className="gallery-chip">
            ST02 · {label}
          </div>
        ))}
      </StaggerOnScroll>
      <div className="st07-wrap">
        <ScrollEffect preset={stuckState} id="st07-bar" className="st07-bar">
          ST07 — sticky toolbar (gets <code>data-neshel-stuck</code> while pinned)
        </ScrollEffect>
        <p>Scroll: the toolbar sticks to the top of this block, then releases at its end.</p>
      </div>

      <h3 id="g-parallax">Scroll &amp; Parallax</h3>
      <div className="gallery-row">
        {[-0.6, 0.4, 1.2, 2].map((depth) => (
          <ScrollEffect
            key={depth}
            preset={depthParallax}
            options={{ depth, distance: 120 }}
            id={`sp01-${String(depth).replace(".", "_").replace("-", "m")}`}
            className="gallery-dot"
          >
            SP01 {depth}
          </ScrollEffect>
        ))}
      </div>
      <ScrollEffect
        preset={scrubTransform}
        options={{
          from: { translateX: -160, rotateZ: -8, opacity: 0.7 },
          to: { translateX: 160, rotateZ: 8, opacity: 1 },
          easing: "standard",
        }}
        id="sp02-box"
        className="gallery-tile sp02"
      >
        SP02 scrubbed transform
      </ScrollEffect>
      <HorizontalScroll id="sp04" label="SP04 horizontal cards" className="sp04">
        {Array.from({ length: 6 }, (_, index) => (
          <a key={index} href={`#sp04-${index}`} id={`sp04-${index}`} className="sp04-card">
            SP04 card {index + 1}
          </a>
        ))}
      </HorizontalScroll>
      <ParallaxImage id="sp06-frame" className="sp06-frame" amount={40}>
        <div className="sp06-media" role="img" aria-label="Gradient landscape" />
      </ParallaxImage>
      <ScrollEffect
        preset={zoomOnScroll}
        options={{ from: 0.85, to: 1.15 }}
        id="sp07"
        className="gallery-tile"
      >
        SP07 zoom on scroll
      </ScrollEffect>
      <ScrollEffect
        preset={scrollColorShift}
        options={{ stops: ["#0ea5e9", "#a855f7", "#f97316"] }}
        id="sp08"
        className="gallery-tile sp08"
      >
        SP08 colour shift
      </ScrollEffect>
      <StickyStack id="sp09" className="sp09" top="5rem" scale={0.06}>
        {["SP09 one", "SP09 two", "SP09 three", "SP09 four"].map((label) => (
          <article key={label} className="sp09-card">
            {label}
          </article>
        ))}
      </StickyStack>
      <ScrollEffect preset={velocitySkew} id="sp11" className="sp11">
        SP11 scroll-velocity skew — scroll fast
      </ScrollEffect>

      <h3 id="g-scenes">Scenes (SP05 + SP01 + SP10)</h3>
      {extra ? <div id="dyn-extra" className="dyn-extra" /> : null}
      <ScrollScene
        id="scene-2"
        length={2.5}
        smooth
        className="scene-2"
        stageClassName="scene-2-stage"
      >
        <ScrollLayer depth={0.3} distance={260} className="scene-2-layer far">
          far
        </ScrollLayer>
        <ScrollLayer depth={1} distance={260} className="scene-2-layer mid">
          mid
        </ScrollLayer>
        <ScrollLayer depth={2.2} distance={260} className="scene-2-layer near">
          near
        </ScrollLayer>
        <p className="scene-2-caption">Second scene · smooth scrub (SP10)</p>
      </ScrollScene>

      <h3 id="g-compose">Composition</h3>
      <RevealOnScroll asChild preset={fadeUp}>
        <Hover asChild preset={lift}>
          <Press asChild preset={pressScale}>
            <ScrollEffect asChild preset={depthParallax} options={{ depth: 0.6, distance: 80 }}>
              <button type="button" id="combo-scroll" className="gallery-tile combo">
                Entrance + Hover + Press + Parallax on one element
              </button>
            </ScrollEffect>
          </Press>
        </Hover>
      </RevealOnScroll>
      <div id="gallery-anchor" className="gallery-end" style={{ "--h": "40vh" } as CSSProperties}>
        End of the gallery (anchor target)
      </div>
    </section>
  );
}
