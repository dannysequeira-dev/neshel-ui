// Phase 014 type fixtures (typechecked by `pnpm typecheck`): valid usage compiles, invalid usage is rejected.
import { createTimeline } from "../src/cinematic/index.js";
import { motionValue } from "../src/core/index.js";
import {
  createChartDraw,
  createIconMorph,
  createPathDraw,
  createPathMorph,
  interpolatePath,
  MorphIcon,
  menuCloseShapes,
  type PathCommand,
  parsePathData,
  SuccessCheck,
} from "../src/svg/index.js";
import {
  createFontAxes,
  createLineReveal,
  createNumberRoll,
  createTextReveal,
  NumberRoll,
  RotatingWords,
  type SplitText,
  splitText,
  TextReveal,
  Typewriter,
} from "../src/text/index.js";

declare const el: HTMLElement;
declare const path: SVGPathElement;

const split: SplitText = splitText(el, { split: "chars", locale: "es" });
split.revert();
const reveal = createTextReveal(el, { variant: "blur", stagger: 0.3, order: "random", seed: 4 });
const tl = createTimeline();
tl.add(reveal.track({ duration: 600 }));
createLineReveal(el, { source: motionValue(0) });
createNumberRoll(el, { value: 12n, locale: "ar-EG" }).set(13n);
createFontAxes(el, { from: { wght: 300 }, to: { wght: 800, GRAD: 50 } }).to({ wght: 500 });
const commands: PathCommand[] = parsePathData("M0 0L1 1");
void commands;
const f: (t: number) => string = interpolatePath("M0 0L1 1", "M0 0L2 2", { normalize: "cubic" });
void f;
tl.add(createPathDraw(path, { stagger: 100 }).track());
createPathMorph(path, { shapes: ["M0 0L1 1", "M1 1L2 2"] }).to(1);
createIconMorph(path, { shapes: menuCloseShapes, state: "menu" }).set("close");
createChartDraw(el, { lines: ".line", points: ".dot" });

export const elements = (
  <>
    <TextReveal as="h2" split="words">
      Rooted in faith
    </TextReveal>
    <Typewriter speed={40}>Built with hope</Typewriter>
    <NumberRoll value={1234.5} locale="de-DE" format={{ style: "currency", currency: "EUR" }} />
    <RotatingWords words={["fast", "accessible"]} interval={2000} paused={false} />
    <MorphIcon shapes={menuCloseShapes} state="close" />
    <SuccessCheck title="Saved" />
  </>
);

// @ts-expect-error — split granularity is a closed set.
splitText(el, { split: "letters" });
// @ts-expect-error — reveal variants are a closed set.
createTextReveal(el, { variant: "explode" });
// @ts-expect-error — number roll needs a value.
createNumberRoll(el, {});
// @ts-expect-error — morph normalisation is "exact" or "cubic".
interpolatePath("M0 0", "M0 0", { normalize: "resample" });
// @ts-expect-error — TextReveal children must be text.
export const invalid = <TextReveal>{{ not: "text" }}</TextReveal>;
