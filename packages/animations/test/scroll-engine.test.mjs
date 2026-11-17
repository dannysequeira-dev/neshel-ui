// Scroll engine (Phase 011 FR-001–FR-008; contracts/scroll-engine.md). jsdom with controlled geometry;
// the browser lab re-checks the same contracts against real layout in three engines.
import assert from "node:assert/strict";
import test from "node:test";
import { frames } from "./helpers.mjs";
import {
  installFakeIO,
  installFakeRO,
  place,
  scrollAndSettle,
  scrollTo,
  setupScrollDom,
  spyListeners,
  viewport,
} from "./scroll-helpers.mjs";

const scroll = await import("../dist/scroll/index.js");
const {
  createScrollProgress,
  createScrollTrigger,
  createSectionSpy,
  getScrollDebugInfo,
  inViewPresets,
  observeInView,
  refreshScroll,
  resolveInView,
} = scroll;

const { media } = await setupScrollDom();

function fresh() {
  document.body.innerHTML = "";
  viewport();
  scrollTo(0);
  frames.settle();
}

function subject(top, height) {
  const element = document.createElement("div");
  document.body.appendChild(element);
  place(element, { top, height });
  return element;
}

/** Subscribe, run the first measurement and return { timeline, values, stop }. */
function follow(options) {
  const timeline = createScrollProgress(options);
  const values = [];
  const stop = timeline.subscribe((value) => values.push(value));
  frames.settle();
  return { timeline, values, stop };
}

test("scroll subpath exports engine, effects and React API (entry-points-011)", () => {
  for (const name of [
    "createScrollProgress",
    "observeInView",
    "createScrollTrigger",
    "createSectionSpy",
    "inViewPresets",
    "resolveInView",
    "refreshScroll",
    "getScrollDebugInfo",
    "revealOnEnter",
    "staggerOnEnter",
    "inViewProgress",
    "directionHeader",
    "stuckState",
    "lazyEffect",
    "depthParallax",
    "scrubTransform",
    "scrollProgress",
    "pinnedScene",
    "imageParallax",
    "zoomOnScroll",
    "scrollColorShift",
    "stickyStack",
    "velocitySkew",
    "scrollTriggerEffects",
    "scrollEffects",
    "ScrollEffect",
    "RevealOnScroll",
    "StaggerOnScroll",
    "ScrollScene",
    "ScrollLayer",
    "ScrollProgressBar",
    "HorizontalScroll",
    "StickyStack",
    "ParallaxImage",
    "useScrollProgress",
    "useScrollScene",
    "useInView",
    "useScrollTrigger",
    "useSectionSpy",
  ]) {
    assert.ok(name in scroll, `${name} exported`);
  }
  assert.deepEqual(
    scroll.scrollTriggerEffects.map((effect) => effect.id),
    [
      "scroll-trigger/reveal-on-enter",
      "scroll-trigger/stagger-on-enter",
      "scroll-trigger/in-view-progress",
      "scroll-trigger/direction-header",
      "scroll-trigger/stuck-state",
      "scroll-trigger/lazy-effect",
    ],
  );
  assert.equal(scroll.scrollEffects.length, 9);
  for (const effect of [...scroll.scrollTriggerEffects, ...scroll.scrollEffects]) {
    assert.ok(Object.isFrozen(effect), `${effect.id} frozen`);
  }
});

test("view ranges match the CSS formulas and the three-engine probe (R1, R3)", () => {
  fresh();
  // Probe 2 geometry: subject at 1320, 200 px tall, viewport 600 → cover 720 → 1520.
  const element = subject(1320, 200);
  const { timeline, stop } = follow({ subject: element });
  assert.equal(timeline.geometry.start, 720);
  assert.equal(timeline.geometry.end, 1520);
  scrollAndSettle(820);
  assert.equal(timeline.get(), 0.125);
  scrollAndSettle(1120);
  assert.equal(timeline.get(), 0.5);
  stop();
  timeline.destroy();

  const ranges = {
    contain: [920, 1320],
    entry: [720, 920],
    exit: [1320, 1520],
    "entry-crossing": [720, 920],
    "exit-crossing": [1320, 1520],
  };
  for (const [name, [start, end]] of Object.entries(ranges)) {
    const t = follow({ subject: element, range: [`${name} 0%`, `${name} 100%`] });
    assert.deepEqual([t.timeline.geometry.start, t.timeline.geometry.end], [start, end], name);
    t.stop();
    t.timeline.destroy();
  }
  // Subject taller than the viewport: contain is the pinned span [S, S + H − V].
  const tall = subject(1000, 1800);
  const t = follow({ subject: tall, range: ["contain 0%", "contain 100%"] });
  assert.deepEqual([t.timeline.geometry.start, t.timeline.geometry.end], [1000, 2200]);
  t.stop();
  t.timeline.destroy();
  // Offsets inside a named range.
  const half = follow({ subject: element, range: ["cover 25%", "cover 75%"] });
  assert.deepEqual([half.timeline.geometry.start, half.timeline.geometry.end], [920, 1320]);
  half.stop();
  half.timeline.destroy();
});

test("whole-range timelines clamp at the start and the end of the page", () => {
  fresh();
  const { timeline, stop } = follow({});
  assert.equal(timeline.geometry.max, 2400);
  assert.equal(timeline.get(), 0);
  scrollAndSettle(1200);
  assert.equal(timeline.get(), 0.5);
  scrollAndSettle(2400);
  assert.equal(timeline.get(), 1);
  scrollAndSettle(9999); // overscroll / rubber band
  assert.equal(timeline.get(), 1);
  scrollAndSettle(-40);
  assert.equal(timeline.get(), 0);
  stop();
  timeline.destroy();
  const px = follow({ range: [600, "50%"] });
  assert.deepEqual([px.timeline.geometry.start, px.timeline.geometry.end], [600, 1200]);
  px.stop();
  px.timeline.destroy();
});

test("invalid options fail with clear messages", () => {
  fresh();
  const element = subject(100, 100);
  assert.throws(
    () => createScrollProgress({ range: ["cover 0%", "cover 100%"] }),
    /needs a subject/,
  );
  assert.throws(() => createScrollProgress({ subject: element, range: [0, 100] }), /numeric range/);
  assert.throws(
    () => createScrollProgress({ subject: element, range: ["sideways 0%", "cover"] }),
    /invalid range edge/,
  );
  assert.throws(() => createScrollProgress({ axis: "diagonal" }), /axis/);
  assert.throws(() => createScrollProgress({ subject: {} }), /subject/);
  assert.throws(() => resolveInView("nope"), /unknown trigger preset/);
  assert.throws(() => resolveInView({ rootMargin: "10" }), /rootMargin/);
  assert.throws(() => resolveInView({ threshold: 2 }), /threshold/);
});

test("timelines are lazy: no listener, observer or frame without subscribers (FR-005)", () => {
  fresh();
  const before = getScrollDebugInfo();
  const element = subject(1000, 200);
  const timeline = createScrollProgress({ subject: element });
  scrollTo(500);
  assert.equal(frames.pending, 0, "no frame requested by an unsubscribed timeline");
  assert.equal(getScrollDebugInfo().sources, before.sources);
  const stop = timeline.subscribe(() => {});
  assert.equal(getScrollDebugInfo().sources, before.sources + 1);
  assert.equal(getScrollDebugInfo().activeTimelines, before.activeTimelines + 1);
  frames.settle();
  stop();
  assert.equal(getScrollDebugInfo().sources, before.sources);
  assert.equal(getScrollDebugInfo().activeTimelines, before.activeTimelines);
  timeline.destroy();
  assert.equal(getScrollDebugInfo().timelines, before.timelines);
  assert.equal(frames.pending, 0);
});

test("scrolling reads only the scroll position: no measurement per scroll event (SC-002)", () => {
  fresh();
  const element = subject(1500, 300);
  const reads = { rect: 0, offset: 0 };
  const rect = element.getBoundingClientRect;
  element.getBoundingClientRect = () => {
    reads.rect++;
    return rect();
  };
  const { timeline, stop } = follow({ subject: element });
  const start = getScrollDebugInfo();
  for (let y = 0; y <= 2400; y += 37) {
    scrollTo(y);
    frames.flush();
  }
  for (let y = 2400; y >= 0; y -= 53) {
    scrollTo(y);
    frames.flush();
  }
  frames.settle();
  const end = getScrollDebugInfo();
  assert.equal(end.measurements, start.measurements, "no geometry measurement while scrolling");
  assert.equal(reads.rect, 0, "no getBoundingClientRect while scrolling");
  assert.ok(end.scrollReads - start.scrollReads >= 100, "one scroll read per scrolled frame");
  assert.equal(frames.pending, 0, "idle after the trailing frame");
  stop();
  timeline.destroy();
});

test("direction and velocity follow fast reversals and settle to 0 when scrolling stops (FR-004)", () => {
  fresh();
  const element = subject(1000, 400);
  const { timeline, stop } = follow({ subject: element });
  scrollTo(400);
  frames.flush();
  scrollTo(900);
  frames.flush();
  assert.equal(timeline.direction, 1);
  assert.ok(timeline.scrollVelocity > 0, "positive velocity going down");
  assert.ok(timeline.getVelocity() > 0, "progress velocity");
  const down = timeline.get();
  scrollTo(500); // fast reversal in the next frame
  frames.flush();
  assert.equal(timeline.direction, -1);
  assert.ok(timeline.get() < down, "progress follows the reversal immediately");
  frames.settle();
  assert.equal(timeline.direction, 0);
  assert.equal(timeline.scrollVelocity, 0);
  assert.equal(frames.pending, 0);
  stop();
  timeline.destroy();
});

test("inner scroll containers: subject coordinates relative to the container (FR-002)", () => {
  fresh();
  const container = subject(300, 400);
  const define = (key, value) =>
    Object.defineProperty(container, key, { value, configurable: true, writable: true });
  define("clientHeight", 400);
  define("clientWidth", 300);
  define("scrollHeight", 2000);
  define("scrollWidth", 300);
  define("clientTop", 0);
  define("scrollTop", 0);
  const inner = document.createElement("div");
  container.appendChild(inner);
  place(inner, { top: 300 + 800, height: 200 }); // 800 px into the container content
  const { timeline, stop } = follow({ source: container, subject: inner });
  assert.deepEqual([timeline.geometry.start, timeline.geometry.end], [400, 1000]);
  define("scrollTop", 700);
  container.dispatchEvent(new window.Event("scroll"));
  frames.settle();
  assert.equal(timeline.get(), 0.5);
  scrollAndSettle(500); // the page scrolling does not move a container timeline
  assert.equal(timeline.get(), 0.5);
  stop();
  timeline.destroy();
});

test("geometry invalidation: resize, insertion above, late content, compensated changes, refresh (FR-003)", async () => {
  fresh();
  const ro = installFakeRO();
  try {
    const above = document.createElement("p");
    document.body.appendChild(above);
    place(above, { top: 0, height: 400 });
    const element = subject(1000, 200);
    const { timeline, stop } = follow({ subject: element });
    assert.equal(timeline.geometry.subjectStart, 1000);
    assert.ok(ro.observed() >= 3, "subject, document element and preceding sibling observed");

    // Late image above grows by 250 px: the observer reports, one pass in the next read phase.
    place(element, { top: 1250, height: 200 });
    const measured = getScrollDebugInfo().measurements;
    ro.trigger();
    ro.trigger(); // several signals in one frame → one pass
    frames.settle();
    assert.equal(timeline.geometry.subjectStart, 1250);
    assert.equal(getScrollDebugInfo().measurements, measured + 1, "coalesced into one measurement");

    // Insertion above: MutationObserver on the ancestors re-collects targets and re-measures.
    const inserted = document.createElement("section");
    place(inserted, { top: 400, height: 300 });
    place(element, { top: 1550, height: 200 });
    document.body.insertBefore(inserted, element);
    await new Promise((resolve) => setTimeout(resolve, 0)); // MutationObserver callback
    frames.settle();
    assert.equal(timeline.geometry.subjectStart, 1550);

    // Compensated change (above grows, below shrinks; document height unchanged): the preceding
    // sibling is observed, so the subject moves even though the document size is the same.
    place(element, { top: 1600, height: 200 });
    ro.trigger();
    frames.settle();
    assert.equal(timeline.geometry.subjectStart, 1600);

    // A change no observer can see (margin on a preceding element): explicit refresh.
    place(element, { top: 1650, height: 200 });
    frames.settle();
    assert.equal(timeline.geometry.subjectStart, 1600, "undetectable without refresh");
    refreshScroll();
    frames.settle();
    assert.equal(timeline.geometry.subjectStart, 1650);
    assert.equal(timeline.diagnose().drift, 0);

    // Viewport resize.
    viewport({ height: 800 });
    window.dispatchEvent(new window.Event("resize"));
    frames.settle();
    assert.equal(timeline.geometry.viewport, 800);
    stop();
    timeline.destroy();
    assert.equal(getScrollDebugInfo().observedTargets, 0, "observers released");
  } finally {
    ro.restore();
  }
});

test("several timelines are measured in one pass and share one source (FR-001)", () => {
  fresh();
  const timelines = [0, 1, 2, 3, 4, 5].map((index) =>
    follow({ subject: subject(800 + index * 500, 300) }),
  );
  const info = getScrollDebugInfo();
  assert.equal(info.activeTimelines >= 6, true);
  const measured = info.measurements;
  refreshScroll();
  assert.equal(frames.flush(), undefined);
  assert.equal(getScrollDebugInfo().measurements, measured + 6, "all six in one frame");
  scrollAndSettle(1500);
  const values = timelines.map((t) => t.timeline.get());
  assert.ok(values[0] > values[5], "different subjects, different progress");
  const sources = getScrollDebugInfo().sources;
  assert.equal(sources, 1, "one shared root source");
  for (const t of timelines) {
    t.stop();
    t.timeline.destroy();
  }
  assert.equal(getScrollDebugInfo().sources, 0);
});

test("SP10 smooth scrub follows with a spring and honours reduced motion live", () => {
  fresh();
  const { timeline, stop } = follow({ smooth: true });
  assert.equal(timeline.get(), 0, "no spring from 0 on mount");
  scrollTo(1200);
  frames.flush();
  frames.flush();
  assert.equal(timeline.getRaw(), 0.5);
  assert.ok(timeline.get() > 0 && timeline.get() < 0.5, "smoothed value lags the raw value");
  frames.settle();
  assert.ok(Math.abs(timeline.get() - 0.5) < 0.001, "converges");
  media.set(true);
  scrollAndSettle(2400);
  assert.equal(timeline.get(), 1, "reduced motion: raw progress, no spring (off)");
  media.set(false);
  stop();
  timeline.destroy();
});

test("listeners are passive; nothing intercepts wheel, touch or keys (SC-006)", () => {
  fresh();
  const spy = spyListeners(window);
  const t = follow({ subject: subject(900, 200) });
  spy.restore();
  for (const call of spy.calls) {
    assert.ok(
      !["wheel", "mousewheel", "touchmove", "touchstart", "keydown"].includes(call.type),
      call.type,
    );
    if (call.type === "scroll" || call.type === "resize") assert.equal(call.options?.passive, true);
  }
  t.stop();
  t.timeline.destroy();
});

test("server: creating and destroying timelines is inert without a DOM (FR-008)", async () => {
  const { execFileSync } = await import("node:child_process");
  const code = `
    const s = await import(${JSON.stringify(new URL("../dist/scroll/index.js", import.meta.url).href)});
    const t = s.createScrollProgress({});
    const stop = t.subscribe(() => {});
    if (t.get() !== 0) throw new Error("not inert");
    stop(); t.destroy();
    console.log("ok");`;
  const output = execFileSync(process.execPath, ["--input-type=module", "-e", code], {
    encoding: "utf8",
  });
  assert.equal(output.trim(), "ok");
});

// --- IntersectionObserver pool and triggers ------------------------------------------------------

test("ST10 presets and the shared IntersectionObserver pool", () => {
  fresh();
  const io = installFakeIO();
  try {
    assert.deepEqual(Object.keys(inViewPresets), [
      "default",
      "eager",
      "lazy",
      "center",
      "half",
      "full",
      "top",
    ]);
    assert.deepEqual(resolveInView("center"), {
      root: null,
      rootMargin: "-45% 0px -45% 0px",
      threshold: [0],
    });
    assert.deepEqual(resolveInView({ threshold: [0.5, 0] }).threshold, [0, 0.5]);
    const a = subject(100, 100);
    const b = subject(300, 100);
    const reports = [];
    const stopA = observeInView(a, "default", (r) => reports.push(["a", r.inView, r.position]));
    const stopB = observeInView(b, "default", (r) => reports.push(["b", r.inView, r.position]));
    const stopC = observeInView(a, "half", () => {});
    assert.equal(io.live().length, 2, "one observer per (root, margin, threshold)");
    assert.equal(io.instances[0].options.rootMargin, "0px 0px -10% 0px");
    io.report(a, { inView: true });
    io.report(b, { inView: false, top: 900, bottom: 1000 });
    io.report(b, { inView: false, top: -300, bottom: -200 });
    assert.deepEqual(reports, [
      ["a", true, "inside"],
      ["b", false, "before"],
      ["b", false, "after"],
    ]);
    stopA();
    stopB();
    stopC();
    assert.equal(io.live().length, 0, "observers disconnected");
  } finally {
    io.restore();
  }
});

test("without IntersectionObserver content is reported in view (never left hidden)", async () => {
  fresh();
  const previous = globalThis.IntersectionObserver;
  delete globalThis.IntersectionObserver;
  try {
    const reports = [];
    observeInView(subject(5000, 100), undefined, (r) => reports.push(r.inView));
    await Promise.resolve();
    assert.deepEqual(reports, [true]);
  } finally {
    globalThis.IntersectionObserver = previous;
  }
});

test("ST03/ST04 trigger state machine: callbacks, fast skips and once", () => {
  fresh();
  const io = installFakeIO();
  try {
    const element = subject(1000, 100);
    const log = [];
    const trigger = createScrollTrigger(element, {
      onEnter: () => log.push("enter"),
      onLeave: () => log.push("leave"),
      onEnterBack: () => log.push("enterBack"),
      onLeaveBack: () => log.push("leaveBack"),
      onChange: (state) => log.push(`=${state}`),
    });
    assert.equal(trigger.state, "idle");
    io.report(element, { inView: false, top: 900, bottom: 1000 });
    io.report(element, { inView: true });
    io.report(element, { inView: false, top: -200, bottom: -100 });
    io.report(element, { inView: true });
    io.report(element, { inView: false, top: 900, bottom: 1000 });
    io.report(element, { inView: false, top: -200, bottom: -100 }); // skipped the area (fast scroll)
    assert.deepEqual(log, [
      "=before",
      "=active",
      "enter",
      "=after",
      "leave",
      "=active",
      "enterBack",
      "=before",
      "leaveBack",
      "=active",
      "enter",
      "=after",
      "leave",
    ]);
    trigger.destroy();
    assert.equal(io.live().length, 0);

    const once = [];
    const single = createScrollTrigger(element, {
      mode: "once",
      onEnter: () => once.push("enter"),
    });
    io.report(element, { inView: true });
    assert.equal(io.live().length, 0, "once disconnects after the first enter");
    single.destroy();
    assert.deepEqual(once, ["enter"]);
    assert.throws(() => createScrollTrigger(element, { mode: "twice" }), /invalid mode/);
  } finally {
    io.restore();
  }
});

test("ST08 section spy: activation line, gaps and the end of the page", () => {
  fresh();
  const sections = [0, 1000, 2000].map((top) => subject(top, 1000));
  const changes = [];
  const spy = createSectionSpy(sections, { onChange: (index) => changes.push(index) });
  frames.settle();
  assert.equal(spy.active, 0);
  scrollAndSettle(900); // 1000 ≤ 900 + 0.3 · 600
  assert.equal(spy.active, 1);
  scrollAndSettle(1700);
  assert.equal(spy.active, 1);
  scrollAndSettle(2400); // end of the page → last section
  assert.equal(spy.active, 2);
  scrollAndSettle(100);
  assert.equal(spy.active, 0);
  assert.deepEqual(changes, [0, 1, 2, 0]);
  spy.destroy();

  const late = createSectionSpy([subject(500, 200)], { line: 0.1 });
  frames.settle();
  assert.equal(late.active, -1, "before the first section");
  late.destroy();
  assert.throws(() => createSectionSpy([], { line: 2 }), /invalid line/);
});

test("native driver: verified native animation, fallback on mismatch (FR-006, R4)", async () => {
  fresh();
  const { pinnedScene } = scroll;
  const { attachEffect } = await import("../dist/core/index.js");
  let nativeProgress = 0;
  const animations = [];
  const registered = [];
  const host = globalThis;
  host.ScrollTimeline = class {
    constructor(options) {
      this.options = options;
    }
  };
  host.ViewTimeline = class {
    constructor(options) {
      this.options = options;
    }
  };
  host.CSS = { registerProperty: (definition) => registered.push(definition.name) };
  const proto = window.Element.prototype;
  const original = proto.animate;
  proto.animate = (keyframes, options) => {
    const animation = {
      keyframes,
      options,
      cancelled: false,
      effect: { getComputedTiming: () => ({ progress: nativeProgress }) },
      cancel() {
        this.cancelled = true;
      },
    };
    animations.push(animation);
    return animation;
  };
  try {
    assert.equal(scroll.nativeScrollAvailable(), true);
    const section = subject(1000, 1800);
    const handle = attachEffect(section, pinnedScene, {});
    frames.settle();
    assert.equal(animations.length, 1);
    assert.deepEqual(animations[0].options.rangeStart, "contain 0%");
    assert.deepEqual(animations[0].options.rangeEnd, "contain 100%");
    assert.ok(animations[0].options.timeline instanceof host.ViewTimeline);
    assert.deepEqual(registered, ["--neshel-scene-progress"]);
    assert.equal(
      animations[0].cancelled,
      false,
      "native progress 0 matches the JS model at scroll 0",
    );
    assert.equal(
      section.style.getPropertyValue("--neshel-scene-progress"),
      "",
      "browser drives it",
    );
    assert.equal(getScrollDebugInfo().nativeAnimations, 1);
    handle.destroy();
    assert.equal(animations[0].cancelled, true);
    assert.equal(getScrollDebugInfo().nativeAnimations, 0);

    // Mismatch (e.g. a different scroll container than the subject's nearest scroller): fallback.
    nativeProgress = 0.7;
    const fallbacks = getScrollDebugInfo().nativeFallbacks;
    const second = attachEffect(section, pinnedScene, {});
    frames.settle();
    assert.equal(animations[1].cancelled, true);
    assert.equal(getScrollDebugInfo().nativeFallbacks, fallbacks + 1);
    scrollAndSettle(1600);
    assert.equal(
      section.style.getPropertyValue("--neshel-scene-progress"),
      "0.5",
      "JS driver writes",
    );
    second.destroy();
    frames.settle();
    assert.equal(section.style.getPropertyValue("--neshel-scene-progress"), "", "restored");

    // Smoothing is not expressible natively: JS from the start.
    const smooth = attachEffect(section, pinnedScene, { smooth: true });
    frames.settle();
    assert.equal(animations.length, 2);
    smooth.destroy();
    // The page progress (SP03, default range [0, "100%"]) is expressible with a ScrollTimeline.
    nativeProgress = 0;
    scrollAndSettle(0);
    const bar = subject(0, 3);
    const progressBar = attachEffect(bar, scroll.scrollProgress, {});
    frames.settle();
    assert.equal(animations.length, 3);
    assert.ok(animations[2].options.timeline instanceof host.ScrollTimeline);
    assert.equal(animations[2].options.rangeStart, undefined);
    assert.equal(animations[2].cancelled, false);
    progressBar.destroy();
    // driver: "js" never creates a native animation.
    const js = attachEffect(section, pinnedScene, { driver: "js" });
    frames.settle();
    assert.equal(animations.length, 3);
    js.destroy();
  } finally {
    delete host.ScrollTimeline;
    delete host.ViewTimeline;
    delete host.CSS;
    proto.animate = original;
  }
});
