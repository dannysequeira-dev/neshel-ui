// Scroll Triggers and Scroll & Parallax effects (Phase 011 FR-020–FR-031, FR-040–FR-042;
// contracts/api-011.md, composition-matrix-011.md, accessibility-011.md).
import assert from "node:assert/strict";
import test from "node:test";
import { frames, h, markup, mount, renderToString } from "./helpers.mjs";
import {
  installFakeIO,
  place,
  scrollAndSettle,
  scrollTo,
  setupScrollDom,
  viewport,
} from "./scroll-helpers.mjs";

const scroll = await import("../dist/scroll/index.js");
const core = await import("../dist/core/index.js");
const entrance = await import("../dist/entrance/index.js");
const hover = await import("../dist/hover/index.js");
const press = await import("../dist/press/index.js");
const {
  depthParallax,
  directionHeader,
  imageParallax,
  inViewProgress,
  lazyEffect,
  revealOnEnter,
  scrollColorShift,
  scrollProgress,
  scrubTransform,
  staggerOnEnter,
  stickyStack,
  stuckState,
  velocitySkew,
  zoomOnScroll,
  colorAt,
  coveredScale,
} = scroll;
const { attachEffect, defineEffect, definePreset } = core;
const { fadeUp, stagger } = entrance;

// --- SSR first (no DOM yet) ---------------------------------------------------------------------

test("SSR: scroll components render plain, visible markup (FR-008, accessibility-011 §2)", () => {
  const html = markup(
    h(
      "main",
      null,
      h(
        scroll.ScrollScene,
        { length: 4, id: "scene" },
        h(scroll.ScrollLayer, { depth: 2 }, "layer"),
      ),
      h(scroll.RevealOnScroll, { preset: fadeUp }, "revealed"),
      h(
        scroll.StaggerOnScroll,
        { preset: stagger, options: { preset: fadeUp } },
        h("p", null, "a"),
      ),
      h(scroll.HorizontalScroll, { label: "Gallery" }, h("article", null, "card")),
      h(scroll.StickyStack, null, h("article", null, "one"), h("article", null, "two")),
      h(scroll.ScrollProgressBar),
      h(scroll.ParallaxImage, null, h("img", { alt: "", src: "x.jpg" })),
    ),
  );
  assert.match(html, /<section id="scene" class="neshel-scene" style="--neshel-scene-length:4">/);
  assert.match(
    html,
    /<div class="neshel-scene-stage"><div class="neshel-scroll-effect neshel-scroll-layer">layer<\/div>/,
  );
  assert.doesNotMatch(html, /opacity|transform:/, "nothing hidden or moved in server markup");
  assert.match(
    html,
    /data-neshel-hscroll="scroll"/,
    "horizontal section is a native scroller without JS",
  );
  assert.match(html, /role="region" aria-label="Gallery"/);
  assert.match(
    html,
    /class="neshel-stack-item" style="--neshel-stack-index:1"/,
    "stack index in markup",
  );
  assert.match(
    html,
    /<div aria-hidden="true" data-position="top" class="neshel-scroll-progress"><\/div>/,
  );
  assert.match(html, /class="neshel-parallax-frame"><img/);
  assert.throws(() => markup(h(scroll.ScrollScene, { length: 0 })), /invalid length/);
  assert.throws(
    () => markup(h(scroll.ScrollEffect, { preset: fadeUp })),
    /belongs to the "entrance" family; ScrollEffect accepts scroll, scroll-trigger effects/,
  );
  assert.throws(() => markup(h(scroll.RevealOnScroll, { preset: stagger })), /use staggerOnEnter/);
  assert.equal(typeof renderToString, "function");
});

const { media } = await setupScrollDom();

function fresh() {
  document.body.innerHTML = "";
  viewport();
  scrollTo(0);
  frames.settle();
  media.set(false);
}

function box(top, height = 200, parent = document.body) {
  const element = document.createElement("div");
  parent.appendChild(element);
  place(element, { top, height });
  return element;
}

let probeRenders = 0;
const probeRef = { current: null };
function Probe() {
  const inView = scroll.useInView(probeRef);
  probeRenders++;
  return h(
    "p",
    {
      ref: (node) => {
        probeRef.current = node;
      },
      "data-in": String(inView),
    },
    "probe",
  );
}

let spyActive;
function Spy() {
  spyActive = scroll.useSectionSpy(["a", "b"]);
  return null;
}

const transform = (element) => element.style.getPropertyValue("transform");

// --- SP01 / SP02 / SP07 / SP11 — transform layers -------------------------------------------------

test("SP01 depth parallax: translate from progress and depth; static under reduced motion (live)", () => {
  fresh();
  const element = box(1000, 200); // cover range 400 → 1200
  const handle = attachEffect(element, depthParallax, { depth: 2, distance: 100 });
  frames.settle();
  assert.equal(transform(element), "translate3d(0px, 100px, 0px)", "p = 0 → (0.5 − 0) · 100 · 2");
  scrollAndSettle(800);
  assert.equal(transform(element), "", "p = 0.5 → identity");
  scrollAndSettle(1200);
  assert.equal(transform(element), "translate3d(0px, -100px, 0px)");
  media.set(true);
  frames.settle();
  assert.equal(transform(element), "", "reduced: decorative layer removed");
  media.set(false);
  frames.settle();
  assert.equal(
    transform(element),
    "translate3d(0px, -100px, 0px)",
    "restored from the current position",
  );
  handle.destroy();
  frames.settle();
  assert.equal(transform(element), "");
  assert.throws(() => attachEffect(element, depthParallax, { depth: 9 }), /depth/);
});

test("SP02 scrub transform: poses, easing and opacity multiplied with the consumer's", () => {
  fresh();
  const element = box(1000, 200);
  element.style.opacity = "0.5";
  const handle = attachEffect(element, scrubTransform, {
    from: { translateX: -100, opacity: 0 },
    to: { translateX: 0, rotateZ: 10, opacity: 1 },
  });
  scrollAndSettle(800);
  assert.equal(transform(element), "translate3d(-50px, 0px, 0px) rotateZ(5deg)");
  assert.equal(element.style.opacity, "0.25", "0.5 (consumer) × 0.5 (scrub)");
  handle.destroy();
  frames.settle();
  assert.equal(element.style.opacity, "0.5", "consumer opacity restored");
  assert.throws(
    () => attachEffect(element, scrubTransform, { from: { skew: 1 } }),
    /not a scrub property/,
  );
});

test("SP07 zoom and SP11 velocity skew compose with Press and parallax layers (composition matrix)", () => {
  fresh();
  const element = box(1000, 200);
  const zoom = attachEffect(element, zoomOnScroll, { from: 1, to: 1.5 });
  const parallax = attachEffect(element, depthParallax, { distance: 100 });
  scrollAndSettle(800);
  assert.equal(transform(element), "scale(1.25)", "zoom at 0.5; parallax identity at 0.5");
  const skew = attachEffect(element, velocitySkew, { factor: 0.01, max: 6 });
  scrollTo(1000);
  frames.flush();
  scrollTo(1400);
  frames.flush();
  frames.flush();
  assert.match(
    transform(element),
    /translate3d\(0px, -\d+(\.\d+)?px, 0px\) skew\(0deg, -\d+(\.\d+)?deg\) scale\(1\.\d+\)/,
  );
  frames.settle();
  assert.doesNotMatch(transform(element), /skew/, "skew springs back to 0 when scrolling stops");
  media.set(true);
  scrollTo(1000);
  frames.flush();
  frames.flush();
  assert.doesNotMatch(transform(element), /skew/, "reduced: off");
  media.set(false);
  for (const handle of [skew, parallax, zoom]) handle.destroy();
  frames.settle();
  assert.equal(transform(element), "");
  assert.equal(coveredScale(0, 3, 0.5, 0.1), 0.9);
  assert.equal(coveredScale(2, 3, 1, 0.1), 1, "the last card is never covered");
});

test("scroll layers compose with Tilt3D/Hover/Press on one element and never erase them (FR-042)", () => {
  fresh();
  const element = box(1000, 200);
  element.style.transform = "rotate(1deg)";
  const tiltLike = defineEffect({
    id: "hover/test-tilt",
    family: "hover",
    channels: [{ channel: "transform", mode: "compose" }],
    reducedMotion: "off",
    resolve: () => ({}),
    setup(context) {
      context.channels.transform.set({ rotateY: 8, perspective: 800 });
      return { update() {}, destroy: () => context.channels.transform.clear() };
    },
  });
  const tilt = attachEffect(element, tiltLike, {});
  const press1 = attachEffect(element, press.pressScale, {});
  const parallax = attachEffect(element, depthParallax, { distance: 100 });
  frames.settle();
  assert.equal(
    transform(element),
    "rotate(1deg) perspective(800px) translate3d(0px, 50px, 0px) rotateY(8deg)",
  );
  parallax.destroy();
  frames.settle();
  assert.equal(transform(element), "rotate(1deg) perspective(800px) rotateY(8deg)", "tilt kept");
  press1.destroy();
  tilt.destroy();
  frames.settle();
  assert.equal(transform(element), "rotate(1deg)", "consumer transform restored exactly");
  assert.ok(hover.lift, "hover family available for gallery compositions");
});

// --- SP03 / SP05 / ST05 — custom properties (JS driver in jsdom) ------------------------------------

test("SP03 scroll progress, SP05 pinned scene and ST05 in-view progress write their variables", () => {
  fresh();
  const bar = box(0, 3);
  const section = box(600, 1800); // contain span 600 → 1800
  const card = box(1500, 300); // cover 900 → 1800
  const handles = [
    attachEffect(bar, scrollProgress, {}),
    attachEffect(section, scroll.pinnedScene, {}),
    attachEffect(card, inViewProgress, {}),
  ];
  scrollAndSettle(1200);
  assert.equal(bar.style.getPropertyValue("--neshel-scroll-progress"), "0.5");
  assert.equal(section.style.getPropertyValue("--neshel-scene-progress"), "0.5");
  assert.equal(card.style.getPropertyValue("--neshel-view-progress"), "0.3333");
  media.set(true);
  frames.settle();
  assert.equal(
    card.style.getPropertyValue("--neshel-view-progress"),
    "1",
    "ST05 static: end value",
  );
  assert.equal(bar.style.getPropertyValue("--neshel-scroll-progress"), "0.5", "SP03 reduced: kept");
  assert.equal(section.getAttribute("data-neshel-fx-reduced"), "scene", "SP05 token for decor");
  media.set(false);
  frames.settle();
  assert.equal(section.getAttribute("data-neshel-fx-reduced"), null);
  for (const handle of handles) handle.destroy();
  frames.settle();
  assert.equal(card.style.getPropertyValue("--neshel-view-progress"), "");
});

test("ST05: a second writer of the same variable is suspended and resumes (arbitration)", () => {
  fresh();
  const card = box(1500, 300);
  const first = attachEffect(card, inViewProgress, {}, { conflicts: "silent" });
  const second = attachEffect(
    card,
    inViewProgress,
    { range: ["entry 0%", "entry 100%"] },
    { conflicts: "silent" },
  );
  assert.equal(second.state, "suspended");
  first.destroy();
  assert.equal(second.state, "active");
  second.destroy();
});

// --- SP06 / SP08 / SP09 -------------------------------------------------------------------------

test("SP06 image parallax moves the media inside its frame and keeps it covered", () => {
  fresh();
  const frame = box(1000, 400);
  const image = document.createElement("img");
  frame.appendChild(image);
  place(image, { top: 1000, height: 400 });
  const handle = attachEffect(image, imageParallax, { amount: 40 });
  frames.settle(); // frame cover range 400 → 1400, p = 0
  assert.equal(transform(image), "translate3d(0px, 40px, 0px) scale(1.2)");
  scrollAndSettle(1400);
  assert.equal(transform(image), "translate3d(0px, -40px, 0px) scale(1.2)");
  handle.destroy();
  frames.settle();
  assert.equal(transform(image), "");
});

test("SP08 colour shift: color-mix between stops, stepped under reduced motion, themes restored", () => {
  fresh();
  assert.equal(
    colorAt(["red", "blue"], "oklab", 0.25, false),
    "color-mix(in oklab, red, blue 25%)",
  );
  assert.equal(
    colorAt(["red", "lime", "blue"], "oklab", 0.75, false),
    "color-mix(in oklab, lime, blue 50%)",
  );
  assert.equal(colorAt(["red", "lime", "blue"], "oklab", 0.8, true), "blue");
  const element = box(1000, 200); // cover 400 → 1200
  element.setAttribute("data-neshel-theme", "light");
  const handle = attachEffect(element, scrollColorShift, {
    stops: ["#fff", "#123"],
    themes: ["light", "dark"],
  });
  scrollAndSettle(600);
  assert.equal(
    element.style.getPropertyValue("--neshel-scroll-color"),
    "color-mix(in oklab, #fff, #123 25%)",
  );
  assert.equal(element.getAttribute("data-neshel-theme"), "light");
  scrollAndSettle(1100);
  assert.equal(element.getAttribute("data-neshel-theme"), "dark");
  media.set(true);
  frames.settle();
  assert.equal(element.style.getPropertyValue("--neshel-scroll-color"), "#123", "instant: stepped");
  media.set(false);
  handle.destroy();
  frames.settle();
  assert.equal(element.getAttribute("data-neshel-theme"), "light", "original theme restored");
  assert.throws(
    () => attachEffect(element, scrollColorShift, { stops: ["red"] }),
    /2–8 CSS colours/,
  );
  assert.throws(
    () => attachEffect(element, scrollColorShift, { stops: ["red", "x;y"] }),
    /CSS value/,
  );
});

test("SP09 sticky stack: index per card and covered-card scale; CSS-only with scale 0", () => {
  fresh();
  const container = box(1000, 1800); // contain 1000 → 2200
  const cards = [0, 1, 2].map((index) => box(1000 + index * 600, 600, container));
  const handle = attachEffect(container, stickyStack, { scale: 0.1 });
  frames.settle();
  assert.deepEqual(
    cards.map((card) => card.style.getPropertyValue("--neshel-stack-index")),
    ["0", "1", "2"],
  );
  scrollAndSettle(1600); // p = 0.5 → card 0 fully covered, card 1 not yet
  assert.equal(transform(cards[0]), "scale(0.9)");
  assert.equal(transform(cards[1]), "");
  media.set(true);
  frames.settle();
  assert.equal(transform(cards[0]), "", "reduced: no scale, stacking stays");
  media.set(false);
  handle.destroy();
  frames.settle();
  assert.equal(cards[0].style.getPropertyValue("--neshel-stack-index"), "");
});

// --- ST01–ST04 reveal on enter --------------------------------------------------------------------

test("ST01 reveal on enter: holds the start pose before paint, plays on enter, restores (once)", () => {
  fresh();
  const io = installFakeIO();
  try {
    const element = box(2000, 200);
    const log = [];
    const handle = attachEffect(element, revealOnEnter, {
      preset: fadeUp,
      onEnter: () => log.push("enter"),
    });
    frames.flush();
    assert.equal(element.style.opacity, "0", "held (client-only mount)");
    io.report(element, { inView: false, top: 900, bottom: 1100 });
    io.report(element, { inView: true });
    frames.settle();
    assert.equal(element.style.opacity, "", "revealed and restored");
    assert.equal(transform(element), "");
    assert.deepEqual(log, ["enter"]);
    assert.equal(io.live().length, 0, "once: observer released");
    handle.destroy();
  } finally {
    io.restore();
  }
});

test("ST03 modes: repeat re-arms on leave, reverse plays out on leave-back", () => {
  fresh();
  const io = installFakeIO();
  try {
    const repeat = box(2000, 200);
    const r = attachEffect(repeat, revealOnEnter, { preset: fadeUp, mode: "repeat" });
    io.report(repeat, { inView: true });
    frames.settle();
    assert.equal(repeat.style.opacity, "");
    io.report(repeat, { inView: false, top: -400, bottom: -200 });
    frames.flush();
    assert.equal(repeat.style.opacity, "0", "re-armed off-screen");
    io.report(repeat, { inView: true });
    frames.settle();
    assert.equal(repeat.style.opacity, "", "replayed");
    r.destroy();

    const reverse = box(2000, 200);
    const v = attachEffect(reverse, revealOnEnter, { preset: fadeUp, mode: "reverse" });
    io.report(reverse, { inView: true });
    frames.settle();
    io.report(reverse, { inView: false, top: -400, bottom: -200 });
    frames.settle();
    assert.equal(reverse.style.opacity, "", "leave (scrolled past): stays visible");
    io.report(reverse, { inView: true });
    frames.settle();
    io.report(reverse, { inView: false, top: 900, bottom: 1100 });
    frames.flush(3);
    const mid = Number(reverse.style.opacity);
    assert.ok(mid > 0 && mid < 1, "leave-back: animates out");
    frames.settle();
    assert.equal(reverse.style.opacity, "0", "then holds the start pose");
    v.destroy();
    frames.settle();
    assert.equal(reverse.style.opacity, "", "destroy restores");
  } finally {
    io.restore();
  }
});

test("ST01 safety: reduced motion never hides; hydrated content in view stays; beforeprint reveals", () => {
  fresh();
  const io = installFakeIO();
  try {
    media.set(true);
    const reduced = box(2000, 200);
    const a = attachEffect(reduced, revealOnEnter, { preset: fadeUp });
    frames.settle();
    assert.equal(reduced.style.opacity, "", "reduced: never held");
    io.report(reduced, { inView: false, top: 900, bottom: 1100 });
    frames.settle();
    assert.equal(reduced.style.opacity, "");
    a.destroy();
    media.set(false);

    const hydrated = box(100, 200);
    const b = attachEffect(hydrated, revealOnEnter, { preset: fadeUp, initial: "visible" });
    frames.settle();
    io.report(hydrated, { inView: true });
    frames.flush();
    assert.equal(hydrated.style.opacity, "", "hydrated + already in view: not re-hidden");
    b.destroy();

    const below = box(3000, 200);
    const c = attachEffect(below, revealOnEnter, {
      preset: fadeUp,
      initial: "visible",
      mode: "repeat",
    });
    io.report(below, { inView: false, top: 1500, bottom: 1700 });
    frames.flush();
    assert.equal(below.style.opacity, "0", "hydrated below the fold: held off-screen");
    window.dispatchEvent(new window.Event("beforeprint"));
    frames.settle();
    assert.equal(below.style.opacity, "", "printing reveals held content");
    c.destroy();

    media.set(false);
    const live = box(3000, 200);
    const d = attachEffect(live, revealOnEnter, { preset: fadeUp });
    frames.flush();
    assert.equal(live.style.opacity, "0");
    media.set(true);
    frames.settle();
    assert.equal(live.style.opacity, "", "reduced switched on while held: shown");
    media.set(false);
    d.destroy();
  } finally {
    io.restore();
  }
});

test("ST02 stagger on enter: every child held, then revealed through the E10 stagger", () => {
  fresh();
  const io = installFakeIO();
  try {
    const list = box(2000, 300);
    const items = [0, 1, 2].map(() => {
      const item = document.createElement("li");
      list.appendChild(item);
      return item;
    });
    const handle = attachEffect(list, staggerOnEnter, {
      preset: definePreset("cards", stagger, { preset: fadeUp, interval: 50 }),
    });
    frames.flush();
    assert.deepEqual(
      items.map((item) => item.style.opacity),
      ["0", "0", "0"],
    );
    io.report(list, { inView: true });
    frames.flush(6);
    const opacities = items.map((item) => Number(item.style.opacity || 1));
    assert.ok(opacities[0] > opacities[2], "staggered order");
    frames.settle();
    assert.deepEqual(
      items.map((item) => item.style.opacity),
      ["", "", ""],
    );
    handle.destroy();
    assert.throws(() => attachEffect(list, staggerOnEnter, { preset: fadeUp }), /stagger/);
  } finally {
    io.restore();
  }
});

test("ST01 + Hover on one element: reveal clears only its own layer (composition matrix)", () => {
  fresh();
  const io = installFakeIO();
  try {
    const element = box(2000, 200);
    const layer = defineEffect({
      id: "hover/test-lift",
      family: "hover",
      channels: [{ channel: "transform", mode: "compose" }],
      reducedMotion: "off",
      resolve: () => ({}),
      setup(context) {
        context.channels.transform.set({ translateY: -4 });
        return { update() {}, destroy: () => context.channels.transform.clear() };
      },
    });
    const lift = attachEffect(element, layer, {});
    const reveal = attachEffect(element, revealOnEnter, { preset: fadeUp });
    frames.flush();
    assert.match(transform(element), /translate3d\(0px, \d+(\.\d+)?px, 0px\)/, "start pose + lift");
    io.report(element, { inView: true });
    frames.settle();
    assert.equal(transform(element), "translate3d(0px, -4px, 0px)", "lift kept after the reveal");
    reveal.destroy();
    lift.destroy();
  } finally {
    io.restore();
  }
});

// --- ST06 / ST07 / ST09 ---------------------------------------------------------------------------

test("ST06 direction-aware header: hides forward past the offset, shows backward and on focus", () => {
  fresh();
  const header = box(0, 64);
  const link = document.createElement("a");
  link.href = "#x";
  header.appendChild(link);
  const changes = [];
  const handle = attachEffect(header, directionHeader, {
    offset: 100,
    onChange: (hidden) => changes.push(hidden),
  });
  frames.settle();
  scrollTo(50);
  frames.flush();
  scrollTo(80);
  frames.settle();
  assert.equal(header.getAttribute("data-neshel-header"), null, "never hidden above the offset");
  scrollTo(300);
  frames.flush();
  scrollTo(400);
  frames.settle();
  assert.equal(header.getAttribute("data-neshel-header"), "hidden");
  assert.equal(transform(header), "translate3d(0px, -64px, 0px)");
  scrollTo(380);
  frames.flush();
  scrollTo(360);
  frames.settle();
  assert.equal(header.getAttribute("data-neshel-header"), null, "backward scroll shows it");
  scrollTo(700);
  frames.flush();
  scrollTo(800);
  frames.settle();
  link.dispatchEvent(new window.FocusEvent("focusin", { bubbles: true }));
  frames.settle();
  assert.equal(header.getAttribute("data-neshel-header"), null, "keyboard focus shows it");
  assert.equal(transform(header), "");
  assert.deepEqual(changes, [true, false, true, false]);
  handle.destroy();
});

test("ST07 stuck state from the pinned edge and the release point (no sentinel)", async () => {
  fresh();
  const io = installFakeIO();
  try {
    const parent = box(500, 1500);
    Object.defineProperty(parent, "clientHeight", { value: 1500, configurable: true });
    Object.defineProperty(parent, "clientTop", { value: 0, configurable: true });
    const bar = box(500, 60, parent);
    bar.style.position = "sticky";
    bar.style.top = "0px";
    const changes = [];
    const handle = attachEffect(bar, stuckState, { onChange: (stuck) => changes.push(stuck) });
    frames.settle();
    await Promise.resolve(); // the observer is (re)created in a microtask after the measurement
    assert.equal(io.instances.at(-1).options.rootMargin, "-1px 0px 0px 0px");
    scrollAndSettle(800);
    io.report(bar, { inView: true, ratio: 0.98, top: 0, bottom: 60 });
    assert.equal(bar.getAttribute("data-neshel-stuck"), "");
    scrollAndSettle(1950); // release = 500 + 1500 − 60 − 0 = 1940
    assert.equal(bar.getAttribute("data-neshel-stuck"), null, "released at the end of its parent");
    scrollAndSettle(600); // back inside the parent: pinned again
    io.report(bar, { inView: true, top: 0, bottom: 60 }); // scrolled above its natural position
    assert.deepEqual(changes, [true, false, true, false]);
    handle.destroy();
  } finally {
    io.restore();
  }
});

test("ST09 lazy effect: attaches near the viewport, destroys when far (keepAlive keeps it)", () => {
  fresh();
  const io = installFakeIO();
  try {
    let setups = 0;
    let destroys = 0;
    const heavy = defineEffect({
      id: "3d/test-heavy",
      family: "3d",
      channels: [],
      reducedMotion: "off",
      resolve: (o) => o ?? {},
      setup() {
        setups++;
        return { update() {}, destroy: () => destroys++ };
      },
    });
    const element = box(5000, 200);
    const handle = attachEffect(element, lazyEffect, { preset: heavy });
    assert.equal(io.instances.at(-1).options.rootMargin, "200% 0px 200% 0px");
    assert.equal(setups, 0, "not attached before it is near");
    io.report(element, { inView: true });
    io.report(element, { inView: false, top: 9000, bottom: 9200 });
    assert.deepEqual([setups, destroys], [1, 1]);
    handle.destroy();
    const kept = attachEffect(element, lazyEffect, { preset: heavy, keepAlive: true });
    io.report(element, { inView: true });
    io.report(element, { inView: false, top: 9000, bottom: 9200 });
    assert.deepEqual([setups, destroys], [2, 1]);
    kept.destroy();
    assert.equal(destroys, 2);
    assert.throws(
      () => attachEffect(element, lazyEffect, { preset: lazyEffect }),
      /cannot be lazyEffect/,
    );
  } finally {
    io.restore();
  }
});

// --- React -------------------------------------------------------------------------------------

test("React: ScrollScene shares its timeline with ScrollLayer; unmount cleans everything", async () => {
  fresh();
  const { getScrollDebugInfo } = scroll;
  const before = getScrollDebugInfo();
  const view = await mount(
    h(
      scroll.ScrollScene,
      { length: 3, driver: "js", id: "scene" },
      h(scroll.ScrollLayer, { depth: 1, distance: 100, id: "layer" }, "L"),
    ),
  );
  const section = document.getElementById("scene");
  const layer = document.getElementById("layer");
  place(section, { top: 0, height: 1800 }); // contain 0 → 1200
  scroll.refreshScroll();
  scrollAndSettle(600);
  assert.equal(section.style.getPropertyValue("--neshel-scene-progress"), "0.5");
  assert.equal(layer.style.getPropertyValue("transform"), "", "p = 0.5 → identity");
  scrollAndSettle(1200);
  assert.equal(layer.style.getPropertyValue("transform"), "translate3d(0px, -50px, 0px)");
  await view.unmount();
  frames.settle();
  const after = getScrollDebugInfo();
  assert.equal(after.timelines, before.timelines);
  assert.equal(after.sources, before.sources);
  assert.equal(frames.pending, 0);
});

test("React: RevealOnScroll does not hide hydrated content; useInView changes only on transitions", async () => {
  fresh();
  const io = installFakeIO();
  try {
    probeRenders = 0;
    const view = await mount(
      h("div", null, h(scroll.RevealOnScroll, { preset: fadeUp, id: "r" }, "x"), h(Probe)),
    );
    const revealed = document.getElementById("r");
    frames.flush(); // the start pose is written in the first frame's write phase (before paint)
    assert.equal(revealed.style.opacity, "0", "client-only mount: held before paint");
    const probe = view.container.querySelector("p");
    const { act } = await import("react");
    const start = probeRenders;
    await act(async () => io.report(probe, { inView: true }));
    await act(async () => io.report(probe, { inView: true }));
    assert.equal(probe.getAttribute("data-in"), "true");
    assert.equal(probeRenders - start, 1, "one render per transition");
    await view.unmount();
  } finally {
    io.restore();
  }
});

test("React: HorizontalScroll pins with overflow, stacks under reduced motion, manages focus", async () => {
  fresh();
  const scrolls = [];
  const originalScrollTo = window.scrollTo;
  window.scrollTo = (options) => scrolls.push(options);
  try {
    const cards = [0, 1, 2, 3].map((index) =>
      h("button", { key: index, id: `card-${index}` }, `Card ${index}`),
    );
    const view = await mount(h(scroll.HorizontalScroll, { label: "Cards", id: "hs" }, cards));
    const section = document.getElementById("hs");
    const stage = section.firstElementChild;
    const track = stage.firstElementChild;
    Object.defineProperty(track, "scrollWidth", { value: 2400, configurable: true });
    Object.defineProperty(stage, "clientWidth", { value: 800, configurable: true });
    place(section, { top: 1000, height: 2200 });
    cards.forEach((_, index) => {
      const card = document.getElementById(`card-${index}`);
      Object.defineProperty(card, "offsetLeft", { value: index * 700, configurable: true });
      Object.defineProperty(card, "offsetWidth", { value: 600, configurable: true });
    });
    const { act } = await import("react");
    await act(async () => {
      scroll.refreshScroll();
      frames.settle();
    });
    assert.equal(section.getAttribute("data-neshel-hscroll"), "pinned");
    assert.equal(section.style.getPropertyValue("--neshel-hscroll-distance"), "1600px");
    place(section, { top: 1000, height: 2200 }); // contain 1000 → 2600
    await act(async () => {
      scroll.refreshScroll();
      frames.settle();
    });
    scrollAndSettle(1800);
    assert.equal(track.style.getPropertyValue("transform"), "translate3d(-800px, 0px, 0px)");
    stage.scrollLeft = 300;
    await act(async () => document.getElementById("card-3").focus());
    assert.equal(stage.scrollLeft, 0, "clipped stage reset");
    assert.equal(scrolls.length, 1, "document scrolled to show the focused card");
    // card 3 starts at 2100 px > distance 1600 → progress 1 → the end of the pinned span (2600).
    assert.equal(scrolls[0].top, 2600);
    await act(async () => media.set(true));
    frames.settle();
    assert.equal(
      section.getAttribute("data-neshel-hscroll"),
      "stacked",
      "reduced: vertical layout",
    );
    assert.equal(track.style.getPropertyValue("transform"), "");
    await act(async () => media.set(false));
    await view.unmount();
  } finally {
    window.scrollTo = originalScrollTo;
    media.set(false);
  }
});

test("React: useSectionSpy reports the active id", async () => {
  fresh();
  const view = await mount(
    h("div", null, h("section", { id: "a" }), h("section", { id: "b" }), h(Spy)),
  );
  place(document.getElementById("a"), { top: 0, height: 1000 });
  place(document.getElementById("b"), { top: 1000, height: 2000 });
  const { act } = await import("react");
  await act(async () => {
    scroll.refreshScroll();
    frames.settle();
  });
  assert.equal(spyActive, "a");
  await act(async () => scrollAndSettle(1500));
  assert.equal(spyActive, "b");
  await view.unmount();
});

// Issue #11: a live reduced-motion round trip released the held start pose and never restored it, so
// content waiting below the trigger area was visible and its entrance later replayed from the hidden
// start pose (a visible element flashed to opacity 0 and slid in again).
test("ST01 live reduced motion round trip: below the area the hold returns; visible content is never hidden again", () => {
  fresh();
  const io = installFakeIO();
  try {
    // Below the area (reported "before"): reduced on shows it, reduced off holds it again off-screen.
    const below = box(3000, 200);
    const log = [];
    const a = attachEffect(below, revealOnEnter, {
      preset: fadeUp,
      onEnter: () => log.push("enter"),
    });
    io.report(below, { inView: false, top: 1500, bottom: 1700 });
    frames.flush();
    assert.equal(below.style.opacity, "0", "held below the area");
    media.set(true);
    frames.settle();
    assert.equal(below.style.opacity, "", "reduced on: shown");
    media.set(false);
    frames.flush();
    assert.equal(below.style.opacity, "0", "reduced off: held again while still below the area");
    io.report(below, { inView: true });
    frames.flush(3);
    const mid = Number(below.style.opacity);
    assert.ok(
      mid > 0 && mid < 1,
      `entering plays the entrance from the held pose (opacity ${mid})`,
    );
    frames.settle();
    assert.equal(below.style.opacity, "", "revealed and restored");
    assert.equal(transform(below), "");
    assert.deepEqual(log, ["enter"]);
    a.destroy();

    // Released while no report has arrived yet: the first "before" report holds it again.
    const early = box(3200, 200);
    const b = attachEffect(early, revealOnEnter, { preset: fadeUp });
    frames.flush();
    media.set(true);
    frames.settle();
    media.set(false);
    frames.flush();
    io.report(early, { inView: false, top: 1600, bottom: 1800 });
    frames.flush();
    assert.equal(early.style.opacity, "0", "first report below the area: held");
    b.destroy();

    // Inside the area when motion is allowed again (still not played: reduced on before the first
    // enter): it stays visible and entering never replays it from the hidden pose.
    const inside = box(3400, 200);
    const c = attachEffect(inside, revealOnEnter, { preset: fadeUp });
    io.report(inside, { inView: false, top: 1500, bottom: 1700 });
    frames.flush();
    media.set(true);
    frames.settle();
    io.report(inside, { inView: true });
    frames.settle();
    media.set(false);
    frames.flush();
    assert.equal(inside.style.opacity, "", "inside the area: not hidden again");
    for (let index = 0; index < 4; index++) {
      frames.flush();
      assert.equal(inside.style.opacity, "", "no replay from the hidden pose");
      assert.equal(transform(inside), "");
    }
    c.destroy();

    // Visible because reduced motion released it, then it enters after motion is allowed again while
    // the report still says "before" is impossible; but a release followed by an enter with motion
    // allowed must not flash it either (it was shown the whole time).
    const shown = box(3600, 200);
    const d = attachEffect(shown, revealOnEnter, { preset: fadeUp, mode: "repeat" });
    io.report(shown, { inView: true });
    frames.settle();
    io.report(shown, { inView: false, top: -400, bottom: -200 });
    frames.flush();
    assert.equal(shown.style.opacity, "0", "repeat: re-armed after leaving forward");
    media.set(true);
    frames.settle();
    assert.equal(shown.style.opacity, "", "reduced on: shown");
    media.set(false);
    frames.flush();
    assert.equal(shown.style.opacity, "0", "repeat, outside the area: held again");
    io.report(shown, { inView: true });
    frames.settle();
    assert.equal(shown.style.opacity, "", "replayed and restored");
    d.destroy();
  } finally {
    media.set(false);
    io.restore();
  }
});
