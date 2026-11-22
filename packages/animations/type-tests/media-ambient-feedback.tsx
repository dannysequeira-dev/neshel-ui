// Type tests for Phase 015 (./media, ./ambient, ./feedback). Compiled by `pnpm typecheck` (never run).
import { createRef } from "react";
import {
  type AmbientControl,
  AmbientMotionToggle,
  Aurora,
  ambientMotion,
  createParticles,
  createStarfield,
  Particles,
} from "../src/ambient/index.js";
import { motionValue } from "../src/core/index.js";
import {
  createLoadingButton,
  createOptimisticPulse,
  createToaster,
  ProgressBar,
  ProgressRing,
  Spinner,
  SuccessMark,
  Toaster,
} from "../src/feedback/index.js";
import {
  BlurUpImage,
  CompareSlider,
  createCompareSlider,
  createKenBurns,
  createVideoScrub,
  KenBurns,
  Lightbox,
  type ProgressControl,
  watchImage,
} from "../src/media/index.js";

declare const img: HTMLImageElement;
declare const video: HTMLVideoElement;
declare const div: HTMLDivElement;

const camera: ProgressControl = createKenBurns(img, {
  from: { scale: 1.1 },
  repeat: Number.POSITIVE_INFINITY,
});
camera.track({ duration: 500 });
// @ts-expect-error — pose values are objects
createKenBurns(img, { from: 1.2 });
const stop: () => void = watchImage(img, (state) => {
  const s: "loading" | "loaded" | "error" = state;
  void s;
});
createVideoScrub(video, { progress: motionValue(0), precision: "fast" });
// @ts-expect-error — precision is "exact" | "fast"
createVideoScrub(video, { precision: "slow" });
createCompareSlider(div, { orientation: "vertical", onValueChange: (v: number) => v });

export const media = (
  <>
    <KenBurns trigger="manual" controlRef={createRef<ProgressControl>()}>
      <img alt="" src="a.jpg" />
    </KenBurns>
    <BlurUpImage
      src="a.jpg"
      alt="Lake"
      srcSet="a.jpg 1x"
      sizes="100vw"
      placeholder="data:image/png;base64,AA"
    />
    <CompareSlider label="Compare" before={<img alt="Before" />} after={<img alt="After" />} />
    {/* @ts-expect-error — the slider needs an accessible label */}
    <CompareSlider before={null} after={null} />
    <Lightbox label="Photo" thumbnail={<img alt="Thumb" />}>
      <img alt="Large" />
    </Lightbox>
  </>
);

const particles: AmbientControl = createParticles(div, {
  density: 10,
  links: true,
  lowPower: "auto",
});
createStarfield(div, { mode: "warp" });
// @ts-expect-error — mode is "drift" | "warp"
createStarfield(div, { mode: "spiral" });
ambientMotion.pause();
const paused: boolean = ambientMotion.paused;

export const ambient = (
  <>
    <AmbientMotionToggle />
    <Aurora blobs={4} duration={Number.POSITIVE_INFINITY}>
      <h1>Hero</h1>
    </Aurora>
    <Particles density={12} controlRef={createRef<AmbientControl>()} />
  </>
);

const toaster = createToaster({ max: 4 });
const id: string = toaster.show({ title: "Saved", tone: "success" });
// @ts-expect-error — tone is a closed set
toaster.show({ title: "x", tone: "warning" });
createLoadingButton(div, { loading: true }).set(false);
createOptimisticPulse(div).set("failed");
// @ts-expect-error — unknown optimistic status
createOptimisticPulse(div).set("done");

export const feedback = (
  <>
    <Spinner label="Loading results" />
    <ProgressBar label="Upload" value={30} />
    {/* @ts-expect-error — progress needs a label */}
    <ProgressBar value={30} />
    <ProgressRing label="Export" progress={motionValue(0)} />
    <SuccessMark show />
    <Toaster toaster={toaster} hotkey={null} />
  </>
);

void [stop, particles, paused, id];
