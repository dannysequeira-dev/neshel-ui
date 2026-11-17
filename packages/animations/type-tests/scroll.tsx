// Type fixtures for Phase 011 (pnpm typecheck): valid usage compiles; each `@ts-expect-error` must be
// needed.
import { attachEffect } from "../src/core/index.js";
import { fadeUp, stagger } from "../src/entrance/index.js";
import {
  createScrollProgress,
  createScrollTrigger,
  depthParallax,
  HorizontalScroll,
  type inViewPresets,
  RevealOnScroll,
  ScrollEffect,
  ScrollLayer,
  type ScrollProgress,
  ScrollScene,
  StaggerOnScroll,
  StickyStack,
  scrollColorShift,
  useScrollScene,
} from "../src/scroll/index.js";

declare const element: HTMLElement;

const timeline: ScrollProgress = createScrollProgress({
  subject: element,
  range: ["entry 0%", "cover 50%"],
  smooth: { stiffness: 120 },
});
const page = createScrollProgress({ range: [0, "50%"] });
const value: number = timeline.get() + page.getRaw();
void value;
attachEffect(element, depthParallax, { depth: 2, timeline });
attachEffect(element, scrollColorShift, { stops: ["red", "blue"], space: "oklch" });
createScrollTrigger(element, { mode: "once", trigger: "center", onEnter: () => {} });
const preset: keyof typeof inViewPresets = "lazy";
void preset;

// @ts-expect-error range names are a closed list
createScrollProgress({ subject: element, range: ["sideways 0%", "cover 100%"] });
// @ts-expect-error axis is block or inline
createScrollProgress({ axis: "x" });
// @ts-expect-error depthParallax has no colour option
attachEffect(element, depthParallax, { color: "red" });
// @ts-expect-error mode is a closed list
createScrollTrigger(element, { mode: "twice" });

function SceneConsumer() {
  const scene: ScrollProgress | undefined = useScrollScene();
  return <span>{scene ? "in a scene" : "outside"}</span>;
}

export function Valid() {
  return (
    <>
      <ScrollScene length={3} smooth driver="auto">
        <ScrollLayer depth={1.5} axis="y" />
        <SceneConsumer />
      </ScrollScene>
      <RevealOnScroll preset={fadeUp} mode="reverse" trigger="eager" />
      <StaggerOnScroll preset={stagger} options={{ preset: fadeUp }} />
      <ScrollEffect asChild preset={[depthParallax]}>
        <img alt="" src="x.jpg" />
      </ScrollEffect>
      <HorizontalScroll label="Cards" layout="auto" />
      <StickyStack top="2rem" offset="1rem" scale={0.04} />
      {/* @ts-expect-error length is a number */}
      <ScrollScene length="tall" />
      {/* @ts-expect-error mode is a closed list */}
      <RevealOnScroll preset={fadeUp} mode="sometimes" />
      {/* @ts-expect-error layout is a closed list */}
      <HorizontalScroll layout="diagonal" />
    </>
  );
}
