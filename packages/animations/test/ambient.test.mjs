// Phase 015 — Background & Ambient (B01–B10), the shared ambient lifecycle and the Canvas 2D surface
// (contracts/ambient-api.md). Fake IntersectionObserver/ResizeObserver and a recording 2D context in jsdom.
import assert from "node:assert/strict";
import test from "node:test";
import { frames, h, layoutBox, mount, pointer, renderToString } from "./helpers.mjs";
import { setupMediaDom, stubCanvas } from "./media-helpers.mjs";
import { installFakeIO, installFakeRO } from "./scroll-helpers.mjs";

const { media: reducedQuery } = await setupMediaDom();
const A = await import("../dist/ambient/index.js");
const { getFrameScheduler } = await import("../dist/core/index.js");

function box(width = 400, height = 300) {
  const el = document.createElement("div");
  Object.defineProperty(el, "clientWidth", { value: width, configurable: true });
  Object.defineProperty(el, "clientHeight", { value: height, configurable: true });
  document.body.appendChild(el);
  return el;
}
const info = () => A.getAmbientDebugInfo();
function hidePage(hidden) {
  Object.defineProperty(document, "hidden", { value: hidden, configurable: true });
  document.dispatchEvent(new window.Event("visibilitychange"));
}
function quietWarnings() {
  const original = console.warn;
  const messages = [];
  console.warn = (...args) => messages.push(args.join(" "));
  return {
    messages,
    restore() {
      console.warn = original;
    },
  };
}

test("lifecycle: a decorative CSS layer, paused by default, running only while allowed; finite by default", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"] });
  const io = installFakeIO();
  const el = box();
  const content = document.createElement("button");
  el.appendChild(content);
  const control = A.createAurora(el, { duration: 5000 });
  const layer = el.firstElementChild;
  assert.ok(layer.classList.contains("neshel-aurora"));
  assert.equal(layer.getAttribute("aria-hidden"), "true");
  assert.match(layer.getAttribute("style"), /pointer-events: ?none/);
  assert.match(layer.getAttribute("style"), /z-index: ?-1/);
  assert.equal(el.lastElementChild, content, "content stays after (above) the layer");
  assert.equal(layer.getAttribute("data-neshel-ambient"), "running");
  assert.equal(layer.querySelectorAll(".neshel-aurora-blob").length, 3);
  io.report(el, { inView: false });
  assert.equal(layer.getAttribute("data-neshel-ambient"), "paused");
  assert.deepEqual(control.blocked, ["offscreen"]);
  io.report(el, { inView: true });
  hidePage(true);
  assert.equal(layer.getAttribute("data-neshel-ambient"), "paused");
  hidePage(false);
  A.ambientMotion.pause();
  assert.deepEqual(control.blocked, ["toggle"]);
  A.ambientMotion.resume();
  reducedQuery.set(true);
  assert.equal(layer.getAttribute("data-neshel-ambient"), "static");
  reducedQuery.set(false);
  assert.equal(layer.getAttribute("data-neshel-ambient"), "running");
  t.mock.timers.tick(5000);
  assert.equal(control.state, "completed", "5 s of motion, then rest (WCAG 2.2.2)");
  assert.equal(layer.getAttribute("data-neshel-ambient"), "paused");
  assert.equal(info().cssRunning, 0);
  control.destroy();
  assert.equal(el.querySelector(".neshel-ambient-layer"), null, "layer removed");
  assert.equal(info().observers, 0);
  assert.equal(info().visibilityListeners, 0);
  io.restore();
  t.mock.timers.reset();
  el.remove();
});

test("shared registry: 5 ambient effects use ONE IntersectionObserver and ONE visibility listener", () => {
  const io = installFakeIO();
  const els = Array.from({ length: 5 }, () => box());
  const controls = [
    A.createGradientShift(els[0]),
    A.createAurora(els[1]),
    A.createGrain(els[2]),
    A.createGridPattern(els[3]),
    A.createWaves(els[4]),
  ];
  assert.equal(io.instances.length, 1);
  assert.equal(io.live()[0].targets.size, 5);
  assert.equal(info().observers, 1);
  assert.equal(info().visibilityListeners, 1);
  assert.equal(info().ticking, 0, "CSS effects hold no scheduler task");
  for (const c of controls) c.destroy();
  assert.equal(io.live().length, 0);
  assert.equal(info().effects, 0);
  io.restore();
  for (const el of els) el.remove();
});

test("Infinity is explicit and warns once without a page toggle (WCAG 2.2.2)", () => {
  const warn = quietWarnings();
  try {
    const el = box();
    const c1 = A.createMeshGradient(el, { duration: Number.POSITIVE_INFINITY });
    assert.ok(warn.messages.some((m) => /AmbientMotionToggle/.test(m)));
    c1.destroy();
    assert.throws(() => A.createMeshGradient(el, { duration: 50 }), /duration/);
    el.remove();
  } finally {
    warn.restore();
  }
});

test("B01/B02/B03/B06/B07/B10 · bounded options reach CSS as custom properties on package layers", () => {
  const el = box();
  const g = A.createGradientShift(el, { colors: ["red", "blue"], angle: 45, speed: 8000 });
  const plane = el.querySelector(".neshel-gradient-shift-plane");
  assert.equal(
    plane.style.getPropertyValue("--neshel-ambient-gradient"),
    "linear-gradient(45deg, red, blue, red)",
  );
  assert.equal(plane.style.getPropertyValue("--neshel-ambient-period"), "8000ms");
  g.destroy();
  assert.throws(() => A.createAurora(el, { blobs: 6 }), /blobs/);
  assert.equal(el.children.length, 0, "a failed construction leaves nothing");
  const grain = A.createGrain(el, { opacity: 0.1, jitter: true });
  assert.ok(el.querySelector(".neshel-grain-jitter"));
  assert.throws(() => A.createGrain(el, { opacity: 0.5 }), /opacity/);
  grain.destroy();
  const grid = A.createGridPattern(el, { pattern: "dots", cell: 20, direction: "up", speed: 0.5 });
  const gp = el.querySelector(".neshel-grid-pattern-plane");
  assert.equal(gp.style.getPropertyValue("--neshel-pattern-y"), "-20px");
  assert.equal(gp.style.getPropertyValue("--neshel-ambient-period"), "2000ms");
  grid.destroy();
  const mesh = A.createMeshGradient(el, { colors: ["#000", "#f00", "#0f0", "#00f"] });
  assert.equal(el.querySelectorAll(".neshel-mesh-point").length, 3);
  mesh.destroy();
  const waves = A.createWaves(el, { layers: 2 });
  const wave = el.querySelector(".neshel-wave");
  assert.match(wave.style.getPropertyValue("--neshel-wave-image"), /^url\("data:image\/svg\+xml,/);
  assert.equal(el.querySelectorAll(".neshel-wave").length, 2);
  waves.destroy();
  assert.equal(el.children.length, 0);
  el.remove();
});

test("B10 · the wave tile is one seamless wavelength (starts and ends at the mid line)", () => {
  const tile = decodeURIComponent(A.waveTile(400, 20, 80, "#123"));
  const d = /d="([^"]+)"/.exec(tile)[1];
  assert.match(d, /^M0 20C/);
  assert.match(d, / 400 20V80H0Z$/);
});

test("B04 · particles: decorative canvas, one task only while moving, capped density, context loss, exact release", () => {
  const canvas = stubCanvas();
  const io = installFakeIO();
  const el = box(2000, 1500);
  const control = A.createParticles(el, {
    density: 40,
    max: 400,
    duration: 10000,
    lowPower: false,
  });
  const node = el.querySelector("canvas");
  assert.ok(node);
  assert.equal(node.getAttribute("aria-hidden"), "true");
  assert.match(node.getAttribute("style"), /pointer-events: ?none/);
  frames.flush(3);
  const ctx = canvas.contexts[0];
  assert.equal(info().ticking, 1);
  const arcsPerFrame = ctx.calls.arc / ctx.calls.fill;
  assert.ok(arcsPerFrame <= 400, `capped at 400 (${arcsPerFrame})`);
  io.report(el, { inView: false });
  frames.flush(2);
  assert.equal(info().ticking, 0, "off-screen: no task");
  assert.equal(getFrameScheduler().size, 0);
  io.report(el, { inView: true });
  node.dispatchEvent(new window.Event("contextlost", { cancelable: true }));
  const before = ctx.calls.fill;
  frames.flush(3);
  assert.equal(ctx.calls.fill, before, "no drawing while the context is lost");
  node.dispatchEvent(new window.Event("contextrestored"));
  assert.ok(ctx.calls.fill > before, "full redraw on restore");
  control.destroy();
  assert.equal(el.querySelector("canvas"), null);
  assert.equal(node.width, 0, "bitmap released");
  assert.equal(info().surfaces, 0);
  assert.equal(info().contexts, 0);
  canvas.restore();
  io.restore();
  el.remove();
});

test("B04/B05 · reduced motion draws one still frame and holds no task; deterministic fields per seed", () => {
  const canvas = stubCanvas();
  const el = box();
  reducedQuery.set(true);
  const stars = A.createStarfield(el, { seed: 3, lowPower: false });
  assert.equal(info().ticking, 0);
  const ctx = canvas.contexts[0];
  assert.ok(ctx.calls.fill > 0, "a static frame is drawn");
  assert.equal(stars.blocked.includes("reduced"), true);
  reducedQuery.set(false);
  frames.flush(2);
  assert.equal(info().ticking, 1);
  stars.destroy();
  const a = box();
  const b = box();
  const pa = A.createParticles(a, { seed: 9, trigger: "manual", lowPower: false });
  const pb = A.createParticles(b, { seed: 9, trigger: "manual", lowPower: false });
  assert.equal(canvas.contexts[1].calls.arc, canvas.contexts[2].calls.arc);
  pa.destroy();
  pb.destroy();
  assert.throws(() => A.createStarfield(el, { twinkle: 2 }), /twinkle/);
  canvas.restore();
  for (const x of [el, a, b]) x.remove();
});

test("surface: ResizeObserver sizes are applied in the write phase, DPR capped", () => {
  const ro = installFakeRO();
  const canvas = stubCanvas();
  globalThis.devicePixelRatio = 3;
  const el = box(100, 50);
  const control = A.createParticles(el, { maxDpr: 2, trigger: "manual", lowPower: false });
  const node = el.querySelector("canvas");
  assert.equal(node.width, 200, "100 px × dpr 2 (capped from 3)");
  ro.instances[0].callback([{ contentRect: { width: 300, height: 120 } }]);
  assert.equal(node.width, 200, "not resized inside the observer callback");
  frames.flush(1);
  assert.equal(node.width, 600);
  assert.equal(node.height, 240);
  control.destroy();
  assert.equal(ro.observed(), 0);
  globalThis.devicePixelRatio = 1;
  canvas.restore();
  ro.restore();
  el.remove();
});

test("B08 · floating shapes move the children through their Motion Hosts; restored at rest and on destroy", () => {
  const el = box();
  const shapes = [0, 1, 2].map(() => el.appendChild(document.createElement("span")));
  shapes[0].style.setProperty("transform", "rotate(3deg)");
  const control = A.createFloatingShapes(el, { amplitude: 10, duration: 2000 });
  frames.flush(10);
  assert.match(shapes[1].style.getPropertyValue("transform"), /translate/);
  assert.match(
    shapes[0].style.getPropertyValue("transform"),
    /^rotate\(3deg\) /,
    "consumer transform kept as prefix",
  );
  control.stop();
  frames.flush(1);
  assert.equal(shapes[1].style.getPropertyValue("transform"), "");
  control.destroy();
  frames.flush(1);
  assert.equal(shapes[0].style.getPropertyValue("transform"), "rotate(3deg)");
  assert.equal(info().ticking, 0);
  el.remove();
});

test("B09 · pointer glow: one property pair per frame on its layer; hidden at rest and under reduced motion", () => {
  const el = box();
  layoutBox(el, { left: 0, top: 0, width: 400, height: 300 });
  const control = A.createPointerGlow(el, { smoothing: 0 });
  const layer = el.querySelector(".neshel-pointer-glow");
  pointer(el, "pointerenter", { x: 100, y: 80 });
  pointer(el, "pointermove", { x: 120, y: 90 });
  frames.flush(2);
  assert.equal(layer.style.getPropertyValue("--neshel-glow-x"), "120px");
  assert.equal(layer.hasAttribute("data-active"), true);
  reducedQuery.set(true);
  pointer(window, "pointermove", { x: 130, y: 90 });
  assert.equal(layer.hasAttribute("data-active"), false);
  reducedQuery.set(false);
  control.destroy();
  assert.equal(el.querySelector(".neshel-pointer-glow"), null);
  assert.equal(getFrameScheduler().size, 0);
  el.remove();
});

test("React: SSR markup is a plain positioned container (no layer, nothing moving); toggle is a native pressed button", async () => {
  const html = renderToString(
    h("div", null, [
      h(A.Aurora, { key: 1 }, h("h2", null, "Hero")),
      h(A.AmbientMotionToggle, { key: 2 }),
    ]),
  );
  assert.match(html, /<div class="neshel-ambient"><h2>Hero<\/h2><\/div>/);
  assert.match(
    html,
    /<button type="button" class="neshel-ambient-toggle" aria-pressed="false">Pause background motion<\/button>/,
  );
  const view = await mount(
    h("div", null, [
      h(A.AmbientMotionToggle, { key: 1 }),
      h(A.Particles, { key: 2, trigger: "manual" }),
    ]),
  );
  assert.equal(info().toggles, 1);
  const button = view.container.querySelector("button");
  const { act } = await import("react");
  await act(async () => button.click());
  assert.equal(A.ambientMotion.paused, true);
  assert.equal(button.getAttribute("aria-pressed"), "true");
  await act(async () => button.click());
  assert.equal(A.ambientMotion.paused, false);
  await view.unmount();
  assert.equal(info().toggles, 0);
  assert.equal(info().effects, 0);
});
