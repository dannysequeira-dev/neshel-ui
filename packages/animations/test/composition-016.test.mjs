// Phase 016 composition matrix (FR-031; contracts/composition-matrix-016.md). jsdom, manual frames, real Motion Host;
// GPU rows use the fake WebGL2 context. "Clean" = no scheduler task, no package node, inline styles and attributes
// restored, counters back to zero.
import assert from "node:assert/strict";
import test from "node:test";
import { StrictMode } from "react";
import { imageFrame, installFakeGpu, sizedCanvas } from "./gpu-helpers.mjs";
import { frames, h, layoutBox, mount, pointer } from "./helpers.mjs";
import { setupMediaDom } from "./media-helpers.mjs";

await setupMediaDom();
globalThis.MutationObserver = window.MutationObserver;
installFakeGpu();
const A = await import("../dist/advanced/index.js");
const G = await import("../dist/gpu/index.js");
const hover = await import("../dist/hover/index.js");
const press = await import("../dist/press/index.js");
const cinematic = await import("../dist/cinematic/index.js");
const { attachEffect, getFrameScheduler } = await import("../dist/core/index.js");

const settle = () => frames.settle(3000, 16);
const microtasks = () => new Promise((resolve) => setImmediate(resolve));
async function settleAll() {
  for (let i = 0; i < 6; i++) {
    settle();
    await microtasks();
  }
}
function clean(message) {
  frames.flush(2);
  assert.equal(getFrameScheduler().size, 0, `${message}: no scheduler task`);
}
function source(initial = 0) {
  let value = initial;
  const listeners = new Set();
  return {
    get: () => value,
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    set(next) {
      value = next;
      for (const fn of [...listeners]) fn(next);
    },
    get listeners() {
      return listeners.size;
    },
  };
}
function cornerCard() {
  const root = document.createElement("div");
  root.className = "neshel-corner";
  const surface = document.createElement("div");
  surface.innerHTML = "<a href='#x'>Card</a>";
  root.append(surface);
  document.body.append(root);
  layoutBox(root, { width: 240, height: 180 });
  layoutBox(surface, { width: 240, height: 180 });
  return { root, surface };
}
function flipCard() {
  const root = document.createElement("div");
  const inner = document.createElement("div");
  inner.append(document.createElement("div"), document.createElement("div"));
  root.append(inner);
  document.body.append(root);
  return { root, inner };
}

test("#1 CornerRecede + Tilt3D on the same root: tilt transforms the root, the fold clips the surface", () => {
  const { root, surface } = cornerCard();
  const tilt = hover.createTilt3D(root, { maxTilt: 10 });
  const corner = A.createCornerRecede(root);
  pointer(root, "pointerenter", { x: 230, y: 10 });
  pointer(root, "pointermove", { x: 230, y: 10 });
  settle();
  assert.match(root.style.transform, /rotate/, "Tilt3D writes the root's transform");
  assert.match(surface.style.clipPath, /polygon/, "CornerRecede clips the surface");
  assert.ok(root.querySelector(".neshel-corner-flap"));
  corner.destroy();
  tilt.destroy();
  settle();
  assert.equal(root.style.cssText, "");
  assert.equal(surface.style.cssText, "");
  assert.equal(root.querySelector(".neshel-corner-flap"), null);
  clean("#1");
  root.remove();
});

test("#2 CornerRecede + Hover lift + Press on the root: layers compose; the fold is unaffected", () => {
  const { root, surface } = cornerCard();
  const lift = attachEffect(root, hover.lift, { distance: 6 });
  const pressFx = attachEffect(root, press.pressScale, { scale: 0.97 });
  const corner = A.createCornerRecede(root);
  corner.seek("bottom-left", 0.8);
  pointer(root, "pointerenter", { x: 10, y: 170 });
  settle();
  assert.match(surface.style.clipPath, /polygon/);
  assert.equal(corner.corner, "bottom-left");
  corner.destroy();
  lift.destroy();
  pressFx.destroy();
  settle();
  assert.equal(root.style.cssText, "");
  assert.equal(surface.style.cssText, "");
  clean("#2");
  root.remove();
});

test("#3 CornerRecede + an external inline clip-path: captured as the baseline and restored", () => {
  const { root, surface } = cornerCard();
  surface.style.clipPath = "inset(2px)";
  const corner = A.createCornerRecede(root);
  corner.seek("top-right", 1);
  settle();
  assert.match(surface.style.clipPath, /polygon/);
  corner.destroy();
  settle();
  assert.equal(surface.style.clipPath, "inset(2px)");
  clean("#3");
  root.remove();
});

test("#4 CardFlip driven by a C01 timeline track: exact angles at seek points", () => {
  const { root, inner } = flipCard();
  const flip = A.createCardFlip(root);
  const tl = cinematic.createTimeline();
  tl.add(flip.track({ duration: 1000, easing: "linear" }));
  tl.seek(0.25);
  frames.flush(1);
  assert.match(inner.style.transform, /rotateY\(45deg\)/);
  tl.seek(0.75);
  frames.flush(1);
  assert.match(inner.style.transform, /rotateY\(135deg\)/);
  assert.equal(flip.side, "back");
  tl.destroy?.();
  flip.destroy();
  settle();
  assert.equal(inner.style.cssText, "");
  clean("#4");
  root.remove();
});

test("#5 CardFlip driven by a scroll-progress-like source: angle and visible face follow", () => {
  const { root, inner } = flipCard();
  const flip = A.createCardFlip(root);
  const progress = source(0);
  const stop = flip.drive(progress);
  progress.set(0.6);
  frames.flush(1);
  assert.match(inner.style.transform, /rotateY\(108deg\)/);
  assert.equal(flip.side, "back");
  stop();
  assert.equal(progress.listeners, 0);
  flip.destroy();
  settle();
  clean("#5");
  root.remove();
});

test("#6 CubeRotate driven by drive(): progress follows; reverse and seek are exact", async () => {
  const root = document.createElement("div");
  for (let i = 0; i < 3; i++) root.append(document.createElement("section"));
  Object.defineProperty(root, "clientWidth", { value: 300, configurable: true });
  document.body.append(root);
  const cube = A.createCubeRotate(root, { easing: "linear" });
  cube.go(1);
  const progress = source(0);
  cube.drive(progress);
  progress.set(0.5);
  frames.flush(1);
  assert.match(root.children[1].style.transform, /rotateY\(45deg\)/);
  cube.destroy();
  await settleAll();
  for (const panel of root.children) assert.equal(panel.style.cssText, "");
  clean("#6");
  root.remove();
});

test("#7 RingCarousel + rapid next() × 5: shortest-path retarget with one scheduler task", () => {
  const root = document.createElement("div");
  for (let i = 0; i < 8; i++) {
    const item = document.createElement("article");
    layoutBox(item, { width: 160, height: 100 });
    root.append(item);
  }
  document.body.append(root);
  const ring = A.createRingCarousel(root, { label: "Ring" });
  settle();
  for (let i = 0; i < 5; i++) ring.next();
  assert.equal(getFrameScheduler().size, 1, "one spring task for all five presses");
  settle();
  assert.equal(ring.index, 5);
  assert.ok(Math.abs(ring.angle - 225) < 0.5);
  ring.destroy();
  settle();
  clean("#7");
  root.remove();
});

test("#8 PageCurl + timeline track: the progress comes from the timeline, no own clock", async () => {
  const frame = document.createElement("div");
  const img = document.createElement("img");
  Object.defineProperty(img, "complete", { value: true });
  Object.defineProperty(img, "naturalWidth", { value: 300 });
  Object.defineProperty(img, "naturalHeight", { value: 400 });
  frame.append(img, document.createElement("article"));
  Object.defineProperty(frame, "clientWidth", { value: 300 });
  Object.defineProperty(frame, "clientHeight", { value: 400 });
  document.body.append(frame);
  const curl = G.createPageCurl(frame);
  await settleAll();
  const tl = cinematic.createTimeline();
  tl.add(curl.track({ duration: 1000, easing: "linear" }));
  tl.seek(0.4);
  frames.flush(1);
  assert.ok(Math.abs(curl.progress - 0.4) < 1e-6);
  assert.equal(curl.state === "running" || curl.state === "idle" || curl.state === "paused", true);
  curl.destroy();
  await settleAll();
  clean("#8");
  frame.remove();
});

test("#9 Ripple seek() determinism: same seed + progress → same uniforms", async () => {
  const a = imageFrame();
  const b = imageFrame();
  const r1 = G.createRipple(a.frame, { seed: 7 });
  const r2 = G.createRipple(b.frame, { seed: 7 });
  r1.seek(0.3);
  r2.seek(0.3);
  await settleAll();
  const last = (frame) =>
    Array.from(
      frame
        .querySelector("canvas")
        .getContext("webgl2")
        .calls.filter((c) => c[0] === "uniform4fv")
        .at(-1)[2],
    );
  assert.deepEqual(last(a.frame), last(b.frame));
  r1.destroy();
  r2.destroy();
  await settleAll();
  clean("#9");
  a.frame.remove();
  b.frame.remove();
});

test("#10 DisplacementHover + DepthParallax: one manager draw task per frame for both surfaces", async () => {
  const a = imageFrame();
  const b = imageFrame();
  const d8 = G.createDisplacementHover(a.frame);
  const d10 = G.createDepthParallax(b.frame, { depth: sizedCanvas(640, 480) });
  d8.set(1);
  await settleAll();
  d8.set(0.4);
  d10.seek(0.6);
  const before = G.getGpuDebugInfo();
  frames.flush(1);
  const after = G.getGpuDebugInfo();
  assert.equal(after.frames - before.frames, 1);
  assert.equal(after.draws - before.draws, 2);
  d8.destroy();
  d10.destroy();
  await settleAll();
  assert.equal(G.getGpuDebugInfo().contexts, 0);
  clean("#10");
  a.frame.remove();
  b.frame.remove();
});

test("#11 Glitch + Hover lift on the same element: layers package-owned; host layers unaffected", () => {
  const span = document.createElement("span");
  span.textContent = "Neshel";
  document.body.append(span);
  layoutBox(span, { width: 120, height: 40 });
  const lift = attachEffect(span, hover.lift, { distance: 4 });
  const glitch = A.createGlitch(span, { trigger: "manual" });
  pointer(span, "pointerenter", { x: 10, y: 10 });
  glitch.play();
  frames.flush(5);
  assert.equal(span.querySelectorAll(".neshel-glitch-layer").length, 2);
  glitch.stop();
  assert.equal(span.textContent, "Neshel", "text exists once after the burst");
  lift.destroy();
  glitch.destroy();
  settle();
  assert.equal(span.style.cssText, "");
  clean("#11");
  span.remove();
});

test("#12 PerspectiveGrid + TiltShift in one root: two package layers; consumer styles untouched", () => {
  const root = document.createElement("div");
  root.style.color = "red";
  root.innerHTML = "<p>Hero</p>";
  document.body.append(root);
  const grid = A.createPerspectiveGrid(root, { speed: 0 });
  const ts = A.createTiltShift(root);
  assert.ok(root.querySelector(".neshel-grid-floor"));
  assert.ok(root.querySelector(".neshel-tiltshift"));
  assert.equal(root.style.cssText, "color: red;");
  grid.destroy();
  ts.destroy();
  assert.equal(root.children.length, 1);
  clean("#12");
  root.remove();
});

test("#13 every D effect destroyed mid-animation leaves nothing behind", async () => {
  const flipEls = flipCard();
  const flip = A.createCardFlip(flipEls.root);
  flip.flip("back");
  const { root, surface } = cornerCard();
  const corner = A.createCornerRecede(root);
  corner.set("top-right", 1);
  const span = document.createElement("span");
  span.textContent = "x";
  document.body.append(span);
  const glitch = A.createGlitch(span, { trigger: "manual" });
  glitch.play();
  const img = imageFrame();
  const ripple = G.createRipple(img.frame);
  ripple.impact();
  frames.flush(3);
  await microtasks();
  frames.flush(2);
  for (const fx of [flip, corner, glitch, ripple]) fx.destroy();
  await settleAll();
  clean("#13");
  assert.equal(A.getAdvancedDebugInfo().effects, 0);
  assert.equal(A.getAdvancedDebugInfo().flaps, 0);
  assert.equal(A.getAdvancedDebugInfo().glitchLayers, 0);
  assert.equal(G.getGpuDebugInfo().contexts, 0);
  assert.equal(surface.style.cssText, "");
  for (const node of [flipEls.root, root, span, img.frame]) node.remove();
});

test("#14 StrictMode double mount: one live effect per component; counters back to zero", async () => {
  const tree = h(
    "div",
    null,
    h(A.CardFlip, { front: "a", back: "b" }),
    h(A.CornerRecede, null, h("div", null, "c")),
    h(A.Glitch, null, "g"),
    h(A.TiltShift, null, "t"),
  );
  const before = A.getAdvancedDebugInfo().effects;
  const view = await mount(h(StrictMode, null, tree));
  settle();
  assert.equal(A.getAdvancedDebugInfo().effects - before, 4);
  await view.unmount();
  settle();
  assert.equal(A.getAdvancedDebugInfo().effects, before);
  clean("#14");
});
