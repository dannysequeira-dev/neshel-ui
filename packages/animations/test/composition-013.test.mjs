// Phase 013 composition matrix (FR-041; contracts/composition-matrix-013.md). Every row checks that no
// contribution destroys another one and that cleanup restores the element's inline style and attributes.
import assert from "node:assert/strict";
import test from "node:test";
import { box, ptr } from "./gesture-helpers.mjs";
import { frames } from "./helpers.mjs";
import { place, scrollTo, setupScrollDom, viewport } from "./scroll-helpers.mjs";

const { media } = await setupScrollDom();
class FakeResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= FakeResizeObserver;
window.ResizeObserver ??= FakeResizeObserver;
const cinematic = await import("../dist/cinematic/index.js");
const pt = await import("../dist/page-transitions/index.js");
const entrance = await import("../dist/entrance/index.js");
const hover = await import("../dist/hover/index.js");
const scroll = await import("../dist/scroll/index.js");
const layout = await import("../dist/layout/index.js");
const core = await import("../dist/core/index.js");
const { attachEffect, getFrameScheduler } = core;
const { createTimeline } = cinematic;

const settle = () => frames.settle(900, 16);
const translate = (element) => {
  const match = /translate3d\(([-\d.]+)px, ([-\d.]+)px/.exec(element.style.transform);
  return match ? [Number(match[1]), Number(match[2])] : [0, 0];
};
function element(style = "", parent = document.body) {
  const node = document.createElement("div");
  if (style) node.setAttribute("style", style);
  node.setAttribute("data-consumer", "yes");
  parent.appendChild(node);
  return node;
}
const snapshot = (node) => ({
  style: node.style.cssText,
  attributes: [...node.attributes]
    .filter((a) => a.name !== "style")
    .map((a) => `${a.name}=${a.value}`)
    .sort()
    .join("|"),
});

test("1 · timeline + Entrance: the triggered entrance follows the timeline (seek/reverse) and is restored", () => {
  const node = element("opacity: 0.9");
  const before = snapshot(node);
  const tl = createTimeline();
  tl.add(
    {
      target: node,
      effect: entrance.fadeUp,
      options: { distance: 30, duration: 300 },
      mode: "trigger",
    },
    50,
  );
  tl.seekTo(0);
  settle();
  assert.equal(translate(node)[1], 30, "start pose before the start");
  tl.seekTo(200);
  settle();
  assert.deepEqual(snapshot(node), before, "end state after the start");
  tl.seekTo(0);
  settle();
  assert.equal(translate(node)[1], 30);
  tl.destroy();
  settle();
  assert.deepEqual(snapshot(node), before);
  node.remove();
});

test("2 · timeline + Hover lift: pose layer and lift layer add; each releases independently", () => {
  const node = element();
  const before = snapshot(node);
  box(node, { width: 100, height: 100 });
  const lift = attachEffect(node, hover.lift, { distance: 6 });
  node.dispatchEvent(
    new window.PointerEvent("pointerenter", { clientX: 50, clientY: 50, pointerType: "mouse" }),
  );
  ptr(window, "pointermove", { x: 50, y: 50 });
  const tl = createTimeline();
  tl.add({ target: node, to: { x: 30 }, duration: 100 });
  tl.seekTo(100);
  settle();
  const [x, y] = translate(node);
  assert.equal(x, 30, "pose translateX");
  assert.ok(y < 0 && y >= -6, `lift translateY composes: ${y}`);
  tl.destroy();
  settle();
  assert.equal(translate(node)[0], 0, "pose released, lift kept");
  assert.ok(translate(node)[1] < 0);
  lift.destroy();
  settle();
  assert.deepEqual(snapshot(node), before);
  node.remove();
});

test("3 · timeline + ScrollScene and 7 · scene chapters + parallax: one element, two layers, no scroll writes", () => {
  document.body.innerHTML = "";
  viewport();
  scrollTo(0);
  settle();
  const section = element();
  place(section, { top: 1000, height: 200 });
  const segment = element("", section);
  place(segment, { top: 1000, height: 200 });
  const progress = scroll.createScrollProgress({
    subject: section,
    range: ["cover 0%", "cover 100%"],
  });
  const scene = cinematic.createSceneChapters({ chapters: [{ id: "only" }] });
  scene.segment("only", { target: segment, from: { x: 100 }, to: {}, easing: "linear" });
  const stop = scene.drive(progress);
  const parallax = attachEffect(segment, scroll.depthParallax, { depth: 2, distance: 100 });
  const writes = [];
  const original = window.scrollTo;
  window.scrollTo = (...args) => writes.push(args);
  scrollTo(800);
  settle();
  const [x, y] = translate(segment);
  assert.ok(x > 0 && x < 100, `timeline layer follows the scroll progress: ${x}`);
  assert.equal(y, 0, "parallax at p = 0.5 is identity");
  scrollTo(400);
  settle();
  const [x2, y2] = translate(segment);
  assert.equal(x2, 100, "timeline at the start");
  assert.equal(y2, 100, "parallax layer composes on the same element");
  assert.equal(writes.length, 0, "no scroll writes");
  window.scrollTo = original;
  stop();
  scene.destroy();
  parallax.destroy();
  progress.destroy();
  settle();
  assert.equal(segment.style.cssText, "");
});

test("4 · timeline + FLIP: the inversion layer and a pose track compose during a layout change", () => {
  const parent = element();
  const node = element("", parent);
  place(node, { top: 0, left: 0, height: 50, width: 50 });
  const group = layout.createLayoutGroup();
  const flip = attachEffect(node, layout.flipMove, { group });
  group.snapshot();
  place(node, { top: 100, left: 0, height: 50, width: 50 });
  group.play();
  const tl = createTimeline();
  tl.add({ target: node, to: { x: 25 }, duration: 100 });
  tl.seekTo(100);
  frames.flush(2);
  const [x, y] = translate(node);
  assert.equal(x, 25, "pose layer kept");
  assert.ok(y < 0, `FLIP inversion still applied: ${y}`);
  settle();
  assert.deepEqual(translate(node), [25, 0], "FLIP done; pose remains");
  tl.destroy();
  flip.destroy();
  group.destroy();
  settle();
  assert.equal(node.style.cssText, "");
  parent.remove();
});

test("5 · timeline + Presence: a track whose element leaves detaches; others continue", () => {
  const a = element();
  const b = element();
  const tl = createTimeline();
  tl.add({ id: "a", target: a, to: { x: 50 }, duration: 320, easing: "linear" });
  tl.add({ id: "b", target: b, to: { x: 50 }, duration: 320, easing: "linear" }, "<");
  tl.play();
  frames.flush(6);
  a.remove(); // what <Presence> does after an exit
  settle();
  assert.equal(tl.getTrack("a").detached, true);
  assert.equal(a.style.cssText, "");
  assert.equal(translate(b)[0], 50);
  tl.destroy();
  b.remove();
});

test("6 · timeline + live reduced motion: finishes with calls once; switching off replays nothing", () => {
  const node = element();
  let calls = 0;
  const tl = createTimeline();
  tl.add({ target: node, to: { x: 10 }, duration: 400 });
  tl.call(() => calls++, 200);
  tl.play();
  frames.flush(3);
  media.set(true);
  assert.equal(tl.state, "completed");
  media.set(false);
  frames.flush(10);
  assert.equal(calls, 1);
  tl.destroy();
  node.remove();
});

test("8 · camera + existing transforms: the consumer's transform stays as the prefix", () => {
  const stage = element();
  const canvas = element("transform: rotate(2deg)", stage);
  const child = element("transform: scale(1.1)", canvas);
  for (const [node, w, h] of [
    [stage, 300, 200],
    [canvas, 1200, 800],
  ]) {
    Object.defineProperty(node, "clientWidth", { value: w, configurable: true });
    Object.defineProperty(node, "clientHeight", { value: h, configurable: true });
    Object.defineProperty(node, "offsetWidth", { value: w, configurable: true });
    Object.defineProperty(node, "offsetHeight", { value: h, configurable: true });
  }
  const camera = cinematic.createCamera(stage, canvas, { initial: { x: 600, y: 400, zoom: 2 } });
  settle();
  assert.match(canvas.style.transform, /^rotate\(2deg\) translate3d\(.+\) scale\(2\)$/);
  assert.equal(child.style.transform, "scale(1.1)", "children untouched");
  camera.destroy();
  settle();
  assert.equal(canvas.style.transform, "rotate(2deg)");
  stage.remove();
});

test("9/11/12/13 · page transitions: presence-kept page, rapid navigation, competing owners, failure cleanup", async () => {
  const transitions = [];
  document.startViewTransition = (update) => {
    const record = { done: false };
    let finish;
    record.finished = new Promise((resolve) => (finish = resolve));
    record.ready = Promise.resolve();
    record.updateCallbackDone = Promise.resolve()
      .then(update)
      .then(() => {
        record.names = [...document.querySelectorAll("*")]
          .map((node) => node.style?.getPropertyValue("view-transition-name"))
          .filter(Boolean);
        queueMicrotask(finish);
      });
    record.skipTransition = () => finish();
    transitions.push(record);
    return record;
  };
  // 9: the exiting page stays in the DOM (Presence) — the name moves, never duplicates.
  const old = element();
  const offOld = pt.registerSharedElement(old, "card");
  let offNew;
  const moved = pt.startPageTransition(() => {
    offOld();
    offNew = pt.registerSharedElement(element(), "card");
  });
  await moved.finished;
  assert.deepEqual(transitions.at(-1).names, ["neshel-card"]);
  // 11: rapid navigation — the second interrupts the first.
  const first = pt.startPageTransition(() => {});
  const second = pt.startPageTransition(() => {});
  assert.equal((await first.finished).status, "interrupted");
  await second.finished;
  // 12: two transitions competing for one element — the later owns the name, nothing stale restored.
  const target = element("color: blue");
  const offTarget = pt.registerSharedElement(target, "hero");
  const a = pt.startPageTransition(() => {});
  const b = pt.startPageTransition(() => {});
  await Promise.all([a.finished, b.finished]);
  assert.equal(target.style.cssText, "color: blue;");
  // 13: a failed navigation cleans everything.
  const failing = pt.startPageTransition(() => {
    throw new Error("boom");
  });
  await assert.rejects(failing.finished, /boom/);
  assert.equal(target.style.cssText, "color: blue;");
  assert.equal(document.documentElement.hasAttribute("data-neshel-pt-effect"), false);
  offNew();
  offTarget();
  old.remove();
  delete document.startViewTransition;
});

test("10 · shared-element FLIP fallback + layout item on the same element: both layers compose", async () => {
  const a = element();
  place(a, { top: 0, left: 0, width: 40, height: 40 });
  const offA = pt.registerSharedElement(a, "tile");
  let b;
  const group = layout.createLayoutGroup();
  let offB = () => {};
  const transition = pt.startPageTransition(
    () => {
      offA();
      a.remove();
      b = element();
      place(b, { top: 300, left: 0, width: 40, height: 40 });
      offB = pt.registerSharedElement(b, "tile");
    },
    { fallback: "flip" },
  );
  await transition.finished;
  const tl = createTimeline();
  tl.add({ target: b, to: { x: 12 }, duration: 100 });
  tl.seekTo(100);
  frames.flush(1);
  const [x, y] = translate(b);
  assert.equal(x, 12, "pose layer");
  assert.ok(y < 0, `FLIP layer from the old box: ${y}`);
  settle();
  assert.deepEqual(translate(b), [12, 0]);
  tl.destroy();
  offB();
  group.destroy();
  settle();
  assert.equal(b.style.cssText, "");
  b.remove();
});

test("14 · two timelines on one element: compose; cancelling one keeps the other; destroy both restores", () => {
  const node = element("transform: skewX(1deg)");
  const before = snapshot(node);
  const one = createTimeline();
  const two = createTimeline();
  one.add({ target: node, to: { x: 10 }, duration: 100 });
  two.add({ target: node, to: { x: 5, opacity: 0.5 }, duration: 100 });
  one.seekTo(100);
  two.seekTo(100);
  settle();
  assert.equal(translate(node)[0], 15);
  assert.equal(node.style.opacity, "0.5");
  one.cancel();
  settle();
  assert.equal(translate(node)[0], 15, "cancel keeps the rendered contribution");
  one.destroy();
  settle();
  assert.equal(translate(node)[0], 5, "the other timeline's contribution kept");
  two.destroy();
  settle();
  assert.deepEqual(snapshot(node), before);
  node.remove();
});

test("15 · depth-of-field blur + Entrance blurIn: filter arbitration by priority, resumed, restored", () => {
  const container = element();
  const layers = [element("", container), element("filter: contrast(1.2)", container)];
  const before = snapshot(layers[1]);
  const entranceBlur = attachEffect(
    layers[1],
    entrance.blurIn,
    { amount: 6, duration: 5000 },
    {
      priority: 5,
      conflicts: "silent",
    },
  );
  settle();
  const depth = cinematic.createDepthOfField(container, { falloff: 4, focus: 0 });
  settle();
  assert.equal(
    layers[1].style.filter.includes("blur(4px)"),
    false,
    "lower-priority depth claim waits",
  );
  entranceBlur.destroy();
  settle();
  assert.equal(layers[1].style.filter, "blur(4px)", "depth resumes when the entrance releases");
  depth.destroy();
  settle();
  assert.deepEqual(snapshot(layers[1]), before);
  assert.equal(getFrameScheduler().size, 0);
  container.remove();
});
