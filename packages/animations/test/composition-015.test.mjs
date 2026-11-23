// Phase 015 composition matrix (FR-061; contracts/composition-matrix-015.md). jsdom, manual frames. "Clean" =
// no scheduler task, no package node, inline styles restored, counters back to zero.
import assert from "node:assert/strict";
import test from "node:test";
import { act } from "react";
import { frames, h, layoutBox, mount, pointer } from "./helpers.mjs";
import {
  escapeDialog,
  fakeImage,
  fakeVideo,
  microtasks,
  setupMediaDom,
  stubCanvas,
} from "./media-helpers.mjs";
import { installFakeIO, place, scrollTo, setupScrollDom, viewport } from "./scroll-helpers.mjs";

const { media: reducedQuery } = await setupMediaDom();
await setupScrollDom();
const M = await import("../dist/media/index.js");
const A = await import("../dist/ambient/index.js");
const F = await import("../dist/feedback/index.js");
const text = await import("../dist/text/index.js");
const svg = await import("../dist/svg/index.js");
const cinematic = await import("../dist/cinematic/index.js");
const scroll = await import("../dist/scroll/index.js");
const pt = await import("../dist/page-transitions/index.js");
const hover = await import("../dist/hover/index.js");
const press = await import("../dist/press/index.js");
const { attachEffect, getFrameScheduler, motionValue } = await import("../dist/core/index.js");

const settle = () => frames.settle(3000, 16);
const NS = "http://www.w3.org/2000/svg";
const attach = (node) => {
  document.body.appendChild(node);
  return node;
};
function box(width = 400, height = 300) {
  const el = attach(document.createElement("div"));
  Object.defineProperty(el, "clientWidth", { value: width, configurable: true });
  Object.defineProperty(el, "clientHeight", { value: height, configurable: true });
  return el;
}
function clean(message) {
  frames.flush(2);
  assert.equal(getFrameScheduler().size, 0, `${message}: no scheduler task`);
}

test("#1 Ken Burns + Timeline: the timeline clock renders the exact bounded pose", () => {
  const img = attach(fakeImage({ complete: true, naturalWidth: 400 }));
  const camera = M.createKenBurns(img, {
    trigger: "manual",
    from: { scale: 1, x: 0, y: 0 },
    to: { scale: 1.2, x: -1, y: 1 },
  });
  const tl = cinematic.createTimeline();
  tl.add(camera.track({ duration: 1000, easing: "linear" }));
  tl.seek(0.5);
  frames.flush(1);
  assert.equal(img.style.getPropertyValue("scale"), "1.1");
  assert.equal(img.style.getPropertyValue("translate"), "2.5% -2.5%");
  tl.destroy();
  camera.destroy();
  frames.flush(1);
  assert.equal(img.style.cssText, "");
  clean("#1");
  img.remove();
});

test("#2 Media reveal + ScrollScene: clip reveal and a scroll-driven camera share one image without conflict", async () => {
  viewport();
  scrollTo(0);
  const section = attach(document.createElement("section"));
  place(section, { top: 1000, height: 200 });
  const img = fakeImage();
  section.appendChild(img);
  const progress = scroll.createScrollProgress({
    subject: section,
    range: ["cover 0%", "cover 100%"],
  });
  const reveal = M.createLoadReveal(img, { duration: 50 });
  const camera = M.createKenBurns(img, { progress, to: { scale: 1.2, x: 1, y: 0 } });
  frames.flush(1);
  assert.match(img.style.getPropertyValue("clip-path"), /inset\(100%/);
  img.load();
  await microtasks();
  scrollTo(800);
  settle();
  await microtasks();
  settle();
  assert.equal(img.style.getPropertyValue("clip-path"), "", "revealed");
  assert.ok(Number(img.style.getPropertyValue("scale")) > 1, "camera follows the scroll progress");
  reveal.destroy();
  camera.destroy();
  progress.destroy?.();
  frames.flush(1);
  assert.equal(img.style.cssText, "");
  clean("#2");
  section.remove();
  scrollTo(0);
});

test("#3 Image loading + error/retry: error reveals; retry never hides the shown image; final state visible", async () => {
  const img = fakeImage();
  const frame = attach(document.createElement("div"));
  frame.appendChild(img);
  const control = M.createBlurUp(frame);
  frames.flush(1);
  img.fail();
  frames.flush(1);
  assert.equal(control.state, "error");
  img.reset();
  img.setAttribute("src", "retry.jpg");
  await microtasks();
  img.load();
  await microtasks();
  frames.flush(2);
  assert.equal(img.style.getPropertyValue("opacity"), "");
  assert.equal(frame.querySelector(".neshel-blurup-layer"), null);
  control.destroy();
  clean("#3");
  frame.remove();
});

test("#4 Comparison slider + keyboard/touch: both inputs drive one value; touch keeps vertical scroll", () => {
  const root = attach(document.createElement("div"));
  root.innerHTML = '<div data-neshel-compare-after></div><input type="range" aria-label="Compare">';
  layoutBox(root, { width: 100, height: 50 });
  root.setPointerCapture = () => {};
  const control = M.createCompareSlider(root);
  const input = root.querySelector("input");
  input.value = "10";
  input.dispatchEvent(new window.Event("input"));
  root.dispatchEvent(
    new window.PointerEvent("pointerdown", {
      clientX: 80,
      button: 0,
      pointerId: 7,
      pointerType: "touch",
      bubbles: true,
    }),
  );
  frames.flush(1);
  assert.equal(control.value, 80);
  assert.equal(input.value, "80");
  assert.equal(input.getAttribute("aria-valuetext"), "80% before, 20% after");
  assert.equal(root.style.getPropertyValue("touch-action"), "pan-y");
  control.destroy();
  clean("#4");
  root.remove();
});

test("#5 Video scrub + fast progress: 100 changes → ≤ 2 seeks; reverse works; last target wins", () => {
  const video = attach(fakeVideo({ duration: 8 }));
  const value = motionValue(0);
  const control = M.createVideoScrub(video, { progress: value });
  for (let i = 0; i <= 100; i++) value.set(i / 100);
  video.finishSeek();
  assert.ok(video.state.seeks.length <= 2, `${video.state.seeks.length} seeks`);
  assert.equal(video.state.seeks.at(-1), 8);
  video.finishSeek();
  for (let i = 100; i >= 25; i--) value.set(i / 100);
  video.finishSeek();
  video.finishSeek();
  assert.equal(video.state.seeks.at(-1), 2);
  control.destroy();
  video.remove();
});

test("#6 Lightbox + FLIP + Presence: open FLIPs, close reverses then closes; destroy mid-close is clean", () => {
  const opener = attach(document.createElement("button"));
  const thumb = opener.appendChild(document.createElement("img"));
  layoutBox(thumb, { left: 0, top: 0, width: 100, height: 100 });
  const dialog = attach(document.createElement("dialog"));
  dialog.innerHTML = '<button data-neshel-lightbox-close></button><img class="big">';
  const image = dialog.querySelector(".big");
  layoutBox(image, { left: 200, top: 100, width: 400, height: 400 });
  window.innerWidth = 1000;
  window.innerHeight = 800;
  const control = M.createLightboxZoom({ dialog, image, getThumbnail: () => thumb, duration: 120 });
  control.open();
  frames.flush(1);
  assert.match(image.style.getPropertyValue("transform"), /scale\(0\.\d+/);
  settle();
  escapeDialog(dialog);
  frames.flush(3);
  assert.equal(control.state, "closing", "exit still rendering (kept present)");
  control.destroy();
  frames.flush(1);
  assert.equal(dialog.open, false);
  assert.equal(image.style.getPropertyValue("transform"), "");
  assert.equal(document.documentElement.style.getPropertyValue("overflow"), "");
  clean("#6");
  opener.remove();
  dialog.remove();
});

test("#7 Gallery + Page Transitions: a cross-fade inside a view transition update ends on the right slide", async () => {
  document.startViewTransition = (update) => {
    const record = {};
    record.ready = Promise.resolve();
    record.updateCallbackDone = Promise.resolve().then(update);
    record.finished = record.updateCallbackDone;
    record.skipTransition = () => {};
    return record;
  };
  const root = attach(document.createElement("div"));
  for (let i = 0; i < 3; i++) root.appendChild(document.createElement("div"));
  const gallery = M.createCrossfade(root, { duration: 80 });
  const transition = pt.startPageTransition(() => gallery.show(2));
  await transition.finished;
  settle();
  assert.equal(gallery.index, 2);
  assert.equal(root.children[2].hasAttribute("inert"), false);
  assert.equal(root.children[0].getAttribute("aria-hidden"), "true");
  gallery.destroy();
  delete document.startViewTransition;
  clean("#7");
  root.remove();
});

test("#8 Pixel dissolve + fallback: canvas released after a dissolve; no context → fade with the final image", async () => {
  const canvas = stubCanvas();
  const root = box(64, 64);
  root.append(
    fakeImage({ complete: true, naturalWidth: 64 }),
    fakeImage({ complete: true, naturalWidth: 64 }),
  );
  const d = M.createPixelDissolve(root, { duration: 60, cell: 16 });
  d.show(1);
  assert.equal(d.mode, "dissolve");
  settle();
  await microtasks();
  frames.flush(1);
  assert.equal(root.querySelector("canvas"), null);
  canvas.restore();
  const none = stubCanvas({ supported: false });
  d.show(0);
  assert.equal(d.mode, "fade");
  settle();
  assert.equal(root.children[1].style.getPropertyValue("opacity"), "0");
  d.destroy();
  none.restore();
  clean("#8");
  root.remove();
});

test("#9 Ambient + reduced motion live: tasks and CSS play state stop at once and come back", () => {
  const canvas = stubCanvas();
  const a = box();
  const b = box();
  const particles = A.createParticles(a, { lowPower: false });
  const aurora = A.createAurora(b);
  frames.flush(2);
  assert.equal(A.getAmbientDebugInfo().ticking, 1);
  reducedQuery.set(true);
  assert.equal(A.getAmbientDebugInfo().ticking, 0);
  assert.equal(b.firstElementChild.getAttribute("data-neshel-ambient"), "static");
  reducedQuery.set(false);
  frames.flush(1);
  assert.equal(A.getAmbientDebugInfo().ticking, 1);
  assert.equal(b.firstElementChild.getAttribute("data-neshel-ambient"), "running");
  particles.destroy();
  aurora.destroy();
  canvas.restore();
  clean("#9");
  a.remove();
  b.remove();
});

test("#10 Particles + context loss: no draws while lost, one full redraw on restore, released on destroy", () => {
  const canvas = stubCanvas();
  const el = box();
  const p = A.createParticles(el, { lowPower: false });
  frames.flush(2);
  const node = el.querySelector("canvas");
  const ctx = canvas.contexts[0];
  node.dispatchEvent(new window.Event("contextlost", { cancelable: true }));
  const fills = ctx.calls.fill;
  frames.flush(4);
  assert.equal(ctx.calls.fill, fills);
  node.dispatchEvent(new window.Event("contextrestored"));
  assert.equal(ctx.calls.fill, fills + 1);
  p.destroy();
  assert.equal(A.getAmbientDebugInfo().surfaces, 0);
  canvas.restore();
  clean("#10");
  el.remove();
});

test("#11 Pointer glow + Hover: B09 on the container and a 010 lift on a child stay independent; both clean", () => {
  const el = box();
  layoutBox(el, { width: 400, height: 300 });
  const card = el.appendChild(document.createElement("div"));
  layoutBox(card, { width: 100, height: 100 });
  const glow = A.createPointerGlow(el, { smoothing: 0 });
  const lift = attachEffect(card, hover.lift, { distance: 6 });
  pointer(el, "pointerenter", { x: 50, y: 50 });
  pointer(el, "pointermove", { x: 60, y: 50 });
  pointer(card, "pointerenter", { x: 50, y: 50 });
  settle();
  assert.equal(
    el.querySelector(".neshel-pointer-glow").style.getPropertyValue("--neshel-glow-x"),
    "60px",
  );
  glow.destroy();
  lift.destroy();
  frames.flush(2);
  assert.equal(card.style.cssText, "");
  assert.equal(el.querySelector(".neshel-pointer-glow"), null);
  clean("#11");
  el.remove();
});

test("#12/#15 Progress ring + timeline / external progress: visual follows; integer aria steps; reduced shows the value", async () => {
  const value = motionValue(0);
  const view = await mount(h(F.ProgressRing, { label: "Render", progress: value }));
  const ring = view.container.querySelector(".neshel-ring");
  const tl = cinematic.createTimeline();
  tl.add({ value, from: 0, to: 1, duration: 1000, easing: "linear" });
  tl.seek(0.25);
  frames.flush(2);
  assert.equal(ring.getAttribute("aria-valuenow"), "25");
  assert.equal(ring.style.getPropertyValue("--neshel-ring-offset"), "75");
  reducedQuery.set(true);
  tl.seek(0.5);
  frames.flush(2);
  assert.equal(ring.getAttribute("aria-valuenow"), "50", "reduced motion still shows the value");
  reducedQuery.set(false);
  tl.destroy();
  await view.unmount();
  clean("#12");
});

test("#14 Button loading + Press: press visuals allowed, activation blocked while loading", () => {
  const button = attach(document.createElement("button"));
  Object.defineProperty(button, "offsetWidth", { value: 80, configurable: true });
  let clicks = 0;
  button.addEventListener("click", () => clicks++);
  const pressFx = attachEffect(button, press.pressScale, { scale: 0.95 });
  const loading = F.createLoadingButton(button, { loading: true });
  pointer(button, "pointerdown", { x: 1, y: 1 });
  frames.flush(3);
  button.click();
  assert.equal(clicks, 0);
  pointer(button, "pointerup", { x: 1, y: 1 });
  loading.set(false);
  button.click();
  assert.equal(clicks, 1);
  loading.destroy();
  pressFx.destroy();
  settle();
  assert.equal(button.style.cssText, "");
  clean("#14");
  button.remove();
});

test("#16 Multiple ambient + shared scheduler: one observer, one visibility listener, ≤ 1 task per JS effect", () => {
  const io = installFakeIO();
  const canvas = stubCanvas();
  const els = Array.from({ length: 5 }, () => box());
  const controls = [
    A.createParticles(els[0], { lowPower: false }),
    A.createStarfield(els[1], { lowPower: false }),
    A.createFloatingShapes(els[2]),
    A.createGradientShift(els[3]),
    A.createWaves(els[4]),
  ];
  frames.flush(2);
  const info = A.getAmbientDebugInfo();
  assert.equal(io.live().length, 1);
  assert.equal(info.visibilityListeners, 1);
  assert.equal(info.ticking, 3, "particles, starfield, floating: one task each");
  for (const c of controls) c.destroy();
  assert.equal(A.getAmbientDebugInfo().effects, 0);
  canvas.restore();
  io.restore();
  clean("#16");
  for (const el of els) el.remove();
});

test("#17 Mixed Text/SVG/Media under one timeline; independent cleanup", () => {
  const p = attach(document.createElement("p"));
  p.textContent = "Mixed";
  const host = attach(document.createElementNS(NS, "svg"));
  host.innerHTML = '<path d="M0 0L100 0"/>';
  const path = host.firstElementChild;
  const img = attach(fakeImage({ complete: true, naturalWidth: 400 }));
  const reveal = text.createTextReveal(p, { trigger: "manual" });
  const draw = svg.createPathDraw(path, { trigger: "manual" });
  const camera = M.createKenBurns(img, { trigger: "manual" });
  const tl = cinematic.createTimeline();
  tl.add(reveal.track({ duration: 200 }))
    .add(draw.track({ duration: 200 }), "<")
    .add(camera.track({ duration: 200 }), "<");
  tl.seek(1);
  frames.flush(2);
  assert.ok(img.style.getPropertyValue("scale"));
  camera.destroy();
  frames.flush(1);
  assert.equal(img.style.cssText, "", "media cleaned alone");
  assert.ok(p.querySelector(".neshel-split"), "text still split");
  tl.destroy();
  reveal.destroy();
  draw.destroy();
  assert.equal(p.textContent, "Mixed");
  clean("#17");
  for (const el of [p, host, img]) el.remove();
});

test("#18 Destroy during playback or load: every 015 engine cleans up; images visible; no late writes", async () => {
  const canvas = stubCanvas();
  const loading = fakeImage();
  const frame = attach(document.createElement("div"));
  frame.appendChild(loading);
  const blur = M.createBlurUp(frame);
  const reveal = M.createLoadReveal(attach(fakeImage()));
  const img = attach(fakeImage({ complete: true, naturalWidth: 400 }));
  const kb = M.createKenBurns(img, { trigger: "mount" });
  const duo = M.createDuotone(img, { trigger: "mount" });
  const amb = box();
  const particles = A.createParticles(amb, { lowPower: false });
  const grain = A.createGrain(amb, { jitter: true });
  frames.flush(3);
  for (const c of [blur, reveal, kb, duo, particles, grain]) c.destroy();
  loading.load();
  await microtasks();
  frames.flush(3);
  assert.equal(loading.style.cssText, "", "loading image visible after destroy");
  assert.equal(img.style.cssText, "");
  assert.equal(frame.children.length, 1, "placeholder removed");
  assert.equal(amb.children.length, 0, "ambient nodes removed");
  assert.equal(M.getMediaDebugInfo().hidden, 0);
  assert.equal(M.getMediaDebugInfo().watchers, 0);
  assert.equal(A.getAmbientDebugInfo().surfaces, 0);
  canvas.restore();
  clean("#18");
  for (const el of [frame, img, amb]) el.remove();
});

test("#19/#20 Page switch and hidden page: every ambient effect pauses; only wanted ones resume", () => {
  const canvas = stubCanvas();
  const a = box();
  const b = box();
  const p = A.createParticles(a, { lowPower: false });
  const s = A.createStarfield(b, { lowPower: false });
  s.pause();
  frames.flush(1);
  A.ambientMotion.pause();
  frames.flush(1);
  assert.equal(A.getAmbientDebugInfo().ticking, 0);
  A.ambientMotion.resume();
  frames.flush(1);
  assert.equal(A.getAmbientDebugInfo().ticking, 1, "only the wanted effect resumes");
  Object.defineProperty(document, "hidden", { value: true, configurable: true });
  document.dispatchEvent(new window.Event("visibilitychange"));
  assert.equal(A.getAmbientDebugInfo().ticking, 0);
  Object.defineProperty(document, "hidden", { value: false, configurable: true });
  document.dispatchEvent(new window.Event("visibilitychange"));
  assert.equal(A.getAmbientDebugInfo().ticking, 1);
  p.destroy();
  s.destroy();
  canvas.restore();
  clean("#19");
  a.remove();
  b.remove();
});
