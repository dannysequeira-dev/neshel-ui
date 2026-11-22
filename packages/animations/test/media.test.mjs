// Phase 015 — Images & Media (M01–M10) and media foundations (contracts/media-api.md). jsdom with controllable
// images/videos/canvas/dialog (media-helpers.mjs); real loading, decoding and dialogs run in the lab.
import assert from "node:assert/strict";
import test from "node:test";
import { StrictMode } from "react";
import { frames, h, layoutBox, mount, pointer, renderToString } from "./helpers.mjs";
import {
  escapeDialog,
  fakeImage,
  fakeVideo,
  microtasks,
  nativeAttributes,
  setupMediaDom,
  stubCanvas,
} from "./media-helpers.mjs";

const { media: reducedQuery } = await setupMediaDom();
const M = await import("../dist/media/index.js");
const { getFrameScheduler } = await import("../dist/core/index.js");

const settle = (limit = 2000) => frames.settle(limit, 16);
function attach(node) {
  document.body.appendChild(node);
  return node;
}
function frameWith(img) {
  const frame = attach(document.createElement("div"));
  frame.appendChild(img);
  return frame;
}

// --- Foundations ------------------------------------------------------------------------------------------

test("watchImage: already loaded is reported synchronously; no listener is missed", () => {
  const img = attach(fakeImage({ complete: true, naturalWidth: 400 }));
  const states = [];
  const stop = M.watchImage(img, (s) => states.push(s));
  assert.deepEqual(states, ["loaded"]);
  stop();
  assert.equal(M.getMediaDebugInfo().watchers, 0);
  img.remove();
});

test("watchImage: loading → load waits for decode(); decode rejection re-reads the state; error", async () => {
  const img = attach(fakeImage());
  const states = [];
  const stop = M.watchImage(img, (s) => states.push(s));
  assert.deepEqual(states, ["loading"]);
  img.load();
  assert.deepEqual(states, ["loading"], "not before decode resolves");
  await microtasks();
  assert.deepEqual(states, ["loading", "loaded"]);
  stop();
  const broken = attach(fakeImage({ decode: "reject" }));
  const s2 = [];
  const stop2 = M.watchImage(broken, (s) => s2.push(s));
  broken.fail();
  assert.deepEqual(s2, ["loading", "error"]);
  stop2();
  img.remove();
  broken.remove();
});

test("watchImage: a src change re-evaluates; a stale decode of the old source is ignored", async () => {
  const img = attach(fakeImage({ decode: "pending" }));
  const states = [];
  const stop = M.watchImage(img, (s) => states.push(s));
  img.load();
  img.reset();
  img.setAttribute("src", "b.jpg"); // new request before the old decode resolved
  await microtasks();
  img.resolveDecode(); // stale
  await microtasks();
  assert.deepEqual(states, ["loading"], "the old decode does not report loaded");
  img.state.decode = "resolve";
  img.load();
  await microtasks();
  assert.deepEqual(states, ["loading", "loaded"]);
  stop();
  img.remove();
});

// --- M01 Ken Burns -----------------------------------------------------------------------------------------

test("M01 · bounded camera: positions are fractions of the (scale − 1) × 50 % allowance", () => {
  assert.deepEqual(M.cameraValues(1.2, 1, -1), { scale: "1.2", translate: "-10% 10%" });
  assert.deepEqual(M.cameraValues(1, 1, 1), { scale: "1", translate: "0% 0%" }, "no zoom → no pan");
  assert.deepEqual(M.cameraValues(1.5, 5, 0).translate, "-25% 0%", "clamped to the allowance");
});

test("M01 · Ken Burns seeks render through host channels; reduced motion removes the camera; destroy restores", () => {
  const img = attach(fakeImage({ complete: true, naturalWidth: 400 }));
  img.style.setProperty("opacity", "0.9");
  const control = M.createKenBurns(img, {
    trigger: "manual",
    from: { scale: 1, x: 0, y: 0 },
    to: { scale: 1.2, x: 1, y: 0 },
  });
  control.seek(1);
  frames.flush(2);
  assert.equal(img.style.getPropertyValue("scale"), "1.2");
  assert.equal(img.style.getPropertyValue("translate"), "-10% 0%");
  reducedQuery.set(true);
  frames.flush(2);
  assert.equal(img.style.getPropertyValue("scale"), "", "static under reduced motion");
  reducedQuery.set(false);
  control.destroy();
  frames.flush(2);
  assert.equal(img.style.getPropertyValue("translate"), "");
  assert.equal(img.style.getPropertyValue("opacity"), "0.9", "consumer styles untouched");
  assert.deepEqual(
    nativeAttributes(img),
    nativeAttributes(fakeImage({ complete: true, naturalWidth: 400 })),
  );
  assert.equal(getFrameScheduler().size, 0);
  img.remove();
});

test("M01 · repeats pause on a hidden page and leave no task at rest", async () => {
  const img = attach(fakeImage({ complete: true, naturalWidth: 400 }));
  const control = M.createKenBurns(img, { trigger: "mount", duration: 200, repeat: 2 });
  frames.flush(3);
  assert.equal(control.state, "running");
  Object.defineProperty(document, "hidden", { value: true, configurable: true });
  document.dispatchEvent(new window.Event("visibilitychange"));
  assert.notEqual(control.state, "running", "paused while hidden");
  Object.defineProperty(document, "hidden", { value: false, configurable: true });
  document.dispatchEvent(new window.Event("visibilitychange"));
  // Each repeat starts when the previous run's promise settles (microtask).
  for (let i = 0; i < 4; i++) {
    settle();
    await microtasks();
  }
  assert.equal(control.state, "completed");
  control.destroy();
  frames.flush(1);
  assert.equal(getFrameScheduler().size, 0);
  img.remove();
});

// --- M02 / M03 ------------------------------------------------------------------------------------------

test("M02 · blur-up hides only a loading image, fades in after decode, removes the layer; attributes untouched", async () => {
  const img = fakeImage();
  const before = nativeAttributes(img);
  const frame = frameWith(img);
  const control = M.createBlurUp(frame, {
    placeholder: "data:image/png;base64,AAAA",
    duration: 100,
  });
  frames.flush(1);
  assert.equal(control.state, "loading");
  assert.equal(img.style.getPropertyValue("opacity"), "0");
  const layer = frame.querySelector(".neshel-blurup-layer");
  assert.ok(layer, "placeholder layer");
  assert.equal(layer.getAttribute("aria-hidden"), "true");
  assert.match(layer.getAttribute("style"), /url\("data:image\/png;base64,AAAA"\)/);
  assert.equal(M.getMediaDebugInfo().hidden, 1);
  img.load();
  await microtasks();
  settle();
  await microtasks();
  frames.flush(1);
  assert.equal(control.state, "shown");
  assert.equal(img.style.getPropertyValue("opacity"), "", "opacity restored");
  assert.equal(frame.querySelector(".neshel-blurup-layer"), null, "layer removed");
  assert.equal(M.getMediaDebugInfo().hidden, 0);
  assert.deepEqual(nativeAttributes(img), before);
  control.destroy();
  frame.remove();
});

test("M02 · an image already loaded (cache, SSR) is never hidden; replay opts in", async () => {
  const img = fakeImage({ complete: true, naturalWidth: 400 });
  const frame = frameWith(img);
  const control = M.createBlurUp(frame);
  frames.flush(1);
  assert.equal(control.state, "shown");
  assert.equal(img.style.getPropertyValue("opacity"), "");
  assert.equal(frame.querySelector(".neshel-blurup-layer"), null);
  control.destroy();
  const replay = M.createBlurUp(frame, { replay: true, duration: 50 });
  frames.flush(1);
  assert.equal(replay.state, "revealing");
  settle();
  await microtasks();
  assert.equal(replay.state, "shown");
  replay.destroy();
  frame.remove();
});

test("M02/M03 · error, timeout and destroy always reveal; a later src change never hides a shown image", async (t) => {
  const img = fakeImage();
  const frame = frameWith(img);
  const control = M.createBlurUp(frame);
  img.fail();
  frames.flush(1);
  assert.equal(control.state, "error");
  assert.equal(img.style.getPropertyValue("opacity"), "");
  control.destroy();

  t.mock.timers.enable({ apis: ["setTimeout"] });
  const slow = fakeImage();
  const reveal = M.createLoadReveal(attach(slow), { revealTimeout: 1000 });
  frames.flush(1);
  assert.match(slow.style.getPropertyValue("clip-path"), /inset\(100%/);
  t.mock.timers.tick(1000);
  frames.flush(1);
  assert.equal(reveal.state, "shown");
  assert.equal(slow.style.getPropertyValue("clip-path"), "", "revealed by the timeout");
  t.mock.timers.reset();
  slow.reset();
  slow.setAttribute("src", "other.jpg");
  await microtasks();
  frames.flush(1);
  assert.equal(slow.style.getPropertyValue("clip-path"), "", "not hidden again");
  reveal.destroy();

  const pending = fakeImage();
  const r2 = M.createLoadReveal(attach(pending));
  frames.flush(1);
  r2.destroy();
  frames.flush(1);
  assert.equal(pending.style.getPropertyValue("clip-path"), "", "destroy reveals");
  assert.equal(M.getMediaDebugInfo().hidden, 0);
  frame.remove();
  slow.remove();
  pending.remove();
});

test("M03 · reveal clip shapes and reduced motion (instant)", async () => {
  const img = attach(fakeImage());
  const control = M.createLoadReveal(img, { shape: "circle", duration: 100 });
  frames.flush(1);
  assert.equal(img.style.getPropertyValue("clip-path"), "circle(0% at 50% 50%)");
  reducedQuery.set(true);
  img.load();
  await microtasks();
  frames.flush(2);
  assert.equal(control.state, "shown", "instant under reduced motion");
  assert.equal(img.style.getPropertyValue("clip-path"), "");
  reducedQuery.set(false);
  control.destroy();
  img.remove();
});

// --- M04 comparison slider ------------------------------------------------------------------------------

function compareDom() {
  const root = attach(document.createElement("div"));
  root.innerHTML =
    '<div class="neshel-compare-before"></div><div data-neshel-compare-after></div><input type="range" aria-label="Compare">';
  layoutBox(root, { left: 0, top: 0, width: 200, height: 100 });
  root.setPointerCapture = () => {};
  root.hasPointerCapture = () => true;
  root.releasePointerCapture = () => {};
  return { root, input: root.querySelector("input") };
}

test("M04 · native range semantics, keyboard input, pointer press/drag, touch-action; exact restore", () => {
  const { root, input } = compareDom();
  const changes = [];
  const control = M.createCompareSlider(root, { onValueChange: (v) => changes.push(v) });
  frames.flush(1);
  assert.equal(root.style.getPropertyValue("--neshel-compare"), "50%");
  assert.equal(
    root.style.getPropertyValue("touch-action"),
    "pan-y",
    "vertical page scroll stays native",
  );
  assert.equal(input.min, "0");
  assert.equal(input.max, "100");
  assert.equal(input.getAttribute("aria-valuetext"), "50% before, 50% after");
  input.value = "30";
  input.dispatchEvent(new window.Event("input"));
  frames.flush(1);
  assert.equal(root.style.getPropertyValue("--neshel-compare"), "30%");
  assert.deepEqual(changes, [30]);
  root.dispatchEvent(
    new window.PointerEvent("pointerdown", {
      clientX: 150,
      clientY: 50,
      button: 0,
      pointerId: 1,
      bubbles: true,
    }),
  );
  root.dispatchEvent(
    new window.PointerEvent("pointermove", {
      clientX: 40,
      clientY: 50,
      pointerId: 1,
      bubbles: true,
    }),
  );
  root.dispatchEvent(
    new window.PointerEvent("pointerup", { clientX: 40, clientY: 50, pointerId: 1, bubbles: true }),
  );
  frames.flush(1);
  assert.deepEqual(changes, [30, 75, 20], "tap positions, drag follows");
  assert.equal(input.value, "20");
  assert.equal(document.activeElement, input, "pressing focuses the slider");
  control.destroy();
  frames.flush(1);
  assert.equal(root.style.getPropertyValue("--neshel-compare"), "");
  assert.equal(input.hasAttribute("min"), false);
  assert.equal(input.hasAttribute("aria-valuetext"), false);
  root.remove();
});

test("M04 · an unnamed slider is rejected; vertical orientation", () => {
  const root = attach(document.createElement("div"));
  root.innerHTML = '<div data-neshel-compare-after></div><input type="range">';
  assert.throws(() => M.createCompareSlider(root), /accessible name/);
  root.querySelector("input").setAttribute("aria-label", "Compare");
  const control = M.createCompareSlider(root, { orientation: "vertical", value: 10 });
  frames.flush(1);
  assert.equal(root.querySelector("input").getAttribute("aria-orientation"), "vertical");
  assert.equal(root.style.getPropertyValue("touch-action"), "pan-x");
  control.destroy();
  root.remove();
});

// --- M05 duotone ----------------------------------------------------------------------------------------

test("M05 · duotone writes the filter channel only (image untouched) and restores the consumer filter", () => {
  const img = attach(fakeImage({ complete: true, naturalWidth: 400 }));
  img.style.setProperty("filter", "contrast(1.1)");
  const control = M.createDuotone(img, {
    trigger: "manual",
    shadow: "#102030",
    highlight: "rgb(250 200 100)",
  });
  control.seek(1);
  frames.flush(2);
  const filter = img.style.getPropertyValue("filter");
  assert.ok(/url\(#neshel-duotone-\d+\)|grayscale\(1\)/.test(filter), filter);
  control.seek(0);
  frames.flush(2);
  assert.equal(img.style.getPropertyValue("filter"), "contrast(1.1)", "no duotone at 0");
  control.destroy();
  frames.flush(2);
  assert.equal(img.style.getPropertyValue("filter"), "contrast(1.1)");
  assert.equal(document.querySelectorAll(".neshel-svg-filter-host").length, 0);
  assert.throws(() => M.createDuotone(img, { shadow: "red" }), /hex or rgb/);
  img.remove();
});

// --- M06 video scrub -----------------------------------------------------------------------------------

function source(initial = 0) {
  const listeners = new Set();
  let value = initial;
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

test("M06 · a burst of progress issues one seek; the newest target wins on seeked; never plays", () => {
  const video = attach(fakeVideo({ duration: 10 }));
  const progress = source(0);
  const before = { ...M.getMediaDebugInfo() };
  const control = M.createVideoScrub(video, { progress });
  for (let i = 1; i <= 100; i++) progress.set(i / 100);
  assert.equal(video.state.seeks.length, 1, "one seek in flight");
  video.finishSeek();
  assert.equal(video.state.seeks.length, 2);
  assert.equal(video.state.seeks[1], 10, "latest target");
  video.finishSeek();
  progress.set(0.2); // reverse
  video.finishSeek();
  assert.equal(video.state.seeks.at(-1), 2);
  const info = M.getMediaDebugInfo();
  assert.ok(info.seeksCoalesced - before.seeksCoalesced >= 98);
  assert.equal(video.state.plays, 0, "never played");
  control.destroy();
  assert.equal(progress.listeners, 0);
  video.remove();
});

test("M06 · waits for metadata, clamps to seekable, waits for the presented frame when rVFC exists", () => {
  const video = attach(fakeVideo({ ready: false, seekable: [[0, 4]], frameCallback: true }));
  const progress = source(0.9);
  const control = M.createVideoScrub(video, { progress });
  assert.equal(control.state, "waiting");
  assert.equal(video.state.seeks.length, 0, "nothing before metadata");
  video.metadata(10);
  assert.deepEqual(video.state.seeks, [4], "9 s clamped into [0, 4]");
  progress.set(0.1);
  video.finishSeek();
  assert.equal(video.state.seeks.length, 1, "waits for the sought frame to be presented");
  video.presentFrame();
  assert.deepEqual(video.state.seeks, [4, 1]);
  control.destroy();
  video.remove();
});

test("M06 · reduced motion: the source is not followed; restTime is shown", () => {
  const video = attach(fakeVideo({ duration: 10 }));
  const progress = source(0.5);
  reducedQuery.set(true);
  const control = M.createVideoScrub(video, { progress, restTime: 1 });
  assert.equal(control.state, "reduced");
  assert.deepEqual(video.state.seeks, [1]);
  video.finishSeek();
  progress.set(0.8);
  assert.deepEqual(video.state.seeks, [1]);
  reducedQuery.set(false);
  control.destroy();
  video.remove();
});

// --- M07 lightbox ---------------------------------------------------------------------------------------

function lightboxDom() {
  const opener = attach(document.createElement("button"));
  const thumb = document.createElement("img");
  opener.appendChild(thumb);
  layoutBox(thumb, { left: 10, top: 10, width: 100, height: 75 });
  const dialog = attach(document.createElement("dialog"));
  dialog.innerHTML =
    '<button data-neshel-lightbox-close aria-label="Close"></button><img class="big">';
  const image = dialog.querySelector(".big");
  layoutBox(image, { left: 100, top: 50, width: 800, height: 600 });
  window.innerWidth = 1024;
  window.innerHeight = 768;
  return { opener, thumb, dialog, image };
}

test("M07 · lightbox: modal dialog, close focused, scroll locked, FLIP from the thumbnail; Escape closes and restores focus", () => {
  const { opener, thumb, dialog, image } = lightboxDom();
  const changes = [];
  const control = M.createLightboxZoom({
    dialog,
    image,
    getThumbnail: () => thumb,
    duration: 100,
    onOpenChange: (open) => changes.push(open),
  });
  opener.focus();
  control.open();
  frames.flush(1);
  assert.equal(dialog.open, true);
  assert.equal(dialog.__modal, true, "showModal (top layer, inert background)");
  assert.equal(document.activeElement, dialog.querySelector("[data-neshel-lightbox-close]"));
  assert.equal(document.documentElement.style.getPropertyValue("overflow"), "hidden");
  assert.match(image.style.getPropertyValue("transform"), /scale/, "zooms from the thumbnail box");
  escapeDialog(dialog);
  assert.equal(control.state, "closing");
  settle();
  assert.equal(control.state, "closed");
  assert.equal(dialog.open, false);
  assert.equal(document.activeElement, opener, "focus back to the opener");
  assert.equal(document.documentElement.style.getPropertyValue("overflow"), "");
  assert.equal(image.style.getPropertyValue("transform"), "");
  assert.deepEqual(changes, [true, false]);
  assert.equal(M.getMediaDebugInfo().scrollLocks, 0);
  control.destroy();
  for (const el of [opener, dialog]) el.remove();
});

test("M07 · reduced motion: no zoom; destroy while open closes and unlocks", () => {
  const { opener, thumb, dialog, image } = lightboxDom();
  reducedQuery.set(true);
  const control = M.createLightboxZoom({ dialog, image, getThumbnail: () => thumb });
  control.open();
  frames.flush(2);
  assert.equal(image.style.getPropertyValue("transform"), "");
  reducedQuery.set(false);
  control.destroy();
  frames.flush(1);
  assert.equal(dialog.open, false);
  assert.equal(document.documentElement.style.getPropertyValue("overflow"), "");
  assert.equal(dialog.classList.contains("neshel-lightbox"), false);
  for (const el of [opener, dialog]) el.remove();
});

test("M07 · re-open during the close continues from the current offset (no jump)", () => {
  const { opener, thumb, dialog, image } = lightboxDom();
  const control = M.createLightboxZoom({ dialog, image, getThumbnail: () => thumb, duration: 200 });
  control.open();
  settle();
  control.close();
  frames.flush(4);
  const mid = image.style.getPropertyValue("transform");
  assert.ok(mid, "closing moves toward the thumbnail");
  control.open();
  assert.equal(control.state, "open");
  assert.equal(dialog.open, true);
  settle();
  assert.equal(image.style.getPropertyValue("transform"), "", "back to identity");
  control.destroy();
  for (const el of [opener, dialog]) el.remove();
});

// --- M08 / M09 -----------------------------------------------------------------------------------------

function slidesDom(count = 3, loaded = true) {
  const root = attach(document.createElement("div"));
  for (let i = 0; i < count; i++)
    root.appendChild(
      fakeImage(
        loaded ? { complete: true, naturalWidth: 400, src: `s${i}.jpg` } : { src: `s${i}.jpg` },
      ),
    );
  Object.defineProperty(root, "clientWidth", { value: 320, configurable: true });
  Object.defineProperty(root, "clientHeight", { value: 200, configurable: true });
  return root;
}

test("M08 · only the active slide is exposed; rapid changes retarget from the current opacity; exact restore", () => {
  const root = slidesDom();
  const [a, b, c] = root.children;
  const control = M.createCrossfade(root, { duration: 200 });
  frames.flush(1);
  assert.equal(a.hasAttribute("inert"), false);
  assert.equal(b.getAttribute("aria-hidden"), "true");
  assert.equal(b.hasAttribute("inert"), true);
  control.show(1);
  frames.flush(5);
  const midB = Number(b.style.getPropertyValue("opacity"));
  assert.ok(midB > 0 && midB < 1, `mid fade ${midB}`);
  control.show(2); // interruption
  frames.flush(1);
  assert.ok(
    Number(b.style.getPropertyValue("opacity")) <= midB + 0.01,
    "continues from the current value",
  );
  settle();
  assert.equal(control.index, 2);
  assert.equal(Number(c.style.getPropertyValue("opacity") || 1), 1);
  assert.equal(b.style.getPropertyValue("opacity"), "0");
  assert.equal(c.hasAttribute("aria-hidden"), false);
  control.destroy();
  frames.flush(1);
  for (const slide of [a, b, c]) {
    assert.equal(slide.hasAttribute("inert"), false);
    assert.equal(slide.hasAttribute("aria-hidden"), false);
    assert.equal(slide.style.getPropertyValue("opacity"), "");
  }
  root.remove();
});

test("M08 · autoplay is explicit, pauses on hover/focus and stops with pause()", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const root = slidesDom();
  const control = M.createCrossfade(root, { interval: 3000, duration: 0 });
  t.mock.timers.tick(3000);
  assert.equal(control.index, 1);
  root.dispatchEvent(new window.Event("pointerenter"));
  t.mock.timers.tick(6000);
  assert.equal(control.index, 1, "paused while hovered");
  root.dispatchEvent(new window.Event("pointerleave"));
  control.pause();
  t.mock.timers.tick(6000);
  assert.equal(control.index, 1, "stopped");
  control.destroy();
  t.mock.timers.reset();
  root.remove();
});

test("M09 · real block dissolve on a decorative canvas, released at the end; fallbacks report fade", async () => {
  const canvas = stubCanvas();
  const root = slidesDom(2);
  const control = M.createPixelDissolve(root, { duration: 200, cell: 16 });
  control.show(1);
  assert.equal(control.mode, "dissolve");
  const node = root.querySelector("canvas");
  assert.ok(node, "canvas surface");
  assert.equal(node.getAttribute("aria-hidden"), "true");
  assert.match(node.getAttribute("style"), /pointer-events:none/);
  frames.flush(6);
  const ctx = canvas.contexts[0];
  const mid = ctx.calls.drawImage;
  assert.ok(mid > 0 && mid < 20 * 13, `cells painted progressively (${mid})`);
  settle();
  await microtasks();
  frames.flush(1);
  assert.equal(ctx.calls.drawImage, 20 * 13, "every cell of 320×200 at 16 px");
  assert.equal(root.querySelector("canvas"), null, "canvas released");
  assert.equal(M.getMediaDebugInfo().surfaces, 0);
  assert.equal(Number(root.children[1].style.getPropertyValue("opacity") || 1), 1);
  control.destroy();
  canvas.restore();

  const none = stubCanvas({ supported: false });
  const r2 = slidesDom(2);
  const c2 = M.createPixelDissolve(r2);
  c2.show(1);
  assert.equal(c2.mode, "fade", "no 2D context → fade");
  c2.destroy();
  none.restore();

  const s3 = stubCanvas();
  const r3 = slidesDom(2, false);
  const c3 = M.createPixelDissolve(r3);
  c3.show(1);
  assert.equal(c3.mode, "fade", "image not decodable yet → fade");
  c3.destroy();
  s3.restore();
  for (const r of [root, r2, r3]) r.remove();
});

// --- M10 hover pan --------------------------------------------------------------------------------------

test("M10 · the media follows the pointer within bounds and returns on leave (restored)", () => {
  const img = fakeImage({ complete: true, naturalWidth: 400 });
  const frame = frameWith(img);
  layoutBox(frame, { left: 0, top: 0, width: 200, height: 100 });
  const control = M.createHoverPan(frame, { scale: 1.4 });
  pointer(frame, "pointerenter", { x: 200, y: 50 });
  pointer(frame, "pointermove", { x: 200, y: 50 });
  settle();
  assert.equal(img.style.getPropertyValue("scale"), "1.4");
  assert.equal(img.style.getPropertyValue("translate"), "-20% 0%", "right edge → right part shown");
  pointer(window, "pointermove", { x: 400, y: 50 }); // leaves the box
  settle();
  assert.equal(img.style.getPropertyValue("scale"), "", "restored at rest");
  control.destroy();
  frame.remove();
});

test("M10 · keyboard alternative needs a name; arrows pan, Escape resets; reduced motion keeps it still", () => {
  const img = fakeImage({ complete: true, naturalWidth: 400 });
  const frame = frameWith(img);
  assert.throws(() => M.createHoverPan(frame, { keyboard: true }), /accessible name/);
  frame.setAttribute("aria-label", "Map detail");
  const control = M.createHoverPan(frame, { keyboard: true, step: 0.5 });
  assert.equal(frame.getAttribute("tabindex"), "0");
  frame.dispatchEvent(new window.KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
  settle();
  assert.equal(img.style.getPropertyValue("translate"), "-10% 0%");
  frame.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  settle();
  assert.equal(img.style.getPropertyValue("translate"), "");
  reducedQuery.set(true);
  frame.dispatchEvent(new window.KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
  settle();
  assert.equal(img.style.getPropertyValue("translate"), "");
  reducedQuery.set(false);
  control.destroy();
  assert.equal(frame.hasAttribute("tabindex"), false, "tabindex restored");
  frame.remove();
});

// --- React, SSR, StrictMode -----------------------------------------------------------------------------

test("media React: SSR markup keeps native media visible and semantic (no motion state)", () => {
  const html = renderToString(
    h("div", null, [
      h(M.BlurUpImage, {
        key: 1,
        src: "a.jpg",
        srcSet: "a.jpg 1x, b.jpg 2x",
        sizes: "100vw",
        alt: "Lake",
        loading: "lazy",
        width: 400,
        height: 300,
      }),
      h(M.CompareSlider, {
        key: 2,
        label: "Compare edits",
        before: h("img", { alt: "Before", src: "b.jpg" }),
        after: h("img", { alt: "After", src: "a.jpg" }),
      }),
      h(
        M.Lightbox,
        { key: 3, label: "Photo", thumbnail: h("img", { alt: "Thumb", src: "t.jpg" }) },
        h("img", { alt: "Large", src: "l.jpg" }),
      ),
    ]),
  );
  assert.match(
    html,
    /<img[^>]*alt="Lake"[^>]*srcSet="a.jpg 1x, b.jpg 2x"|<img[^>]*srcset="a.jpg 1x, b.jpg 2x"/i,
  );
  assert.doesNotMatch(html, /opacity|clip-path/, "nothing hidden on the server");
  assert.match(html, /<input type="range"[^>]*aria-label="Compare edits"/);
  assert.match(html, /<dialog class="neshel-lightbox" aria-label="Photo">/);
  assert.doesNotMatch(html, /<dialog[^>]*open/);
  assert.match(html, /aria-haspopup="dialog"/);
});

test("media React: StrictMode keeps one engine per component and cleans up on unmount", async () => {
  const before = M.getMediaDebugInfo().effects;
  const view = await mount(
    h(StrictMode, null, [
      h(M.KenBurns, { key: 1, trigger: "manual" }, h("img", { alt: "x", src: "k.jpg" })),
      h(M.HoverPan, { key: 2 }, h("img", { alt: "y", src: "p.jpg" })),
      h(M.Crossfade, { key: 3, index: 0 }, [
        h("div", { key: "a" }, "A"),
        h("div", { key: "b" }, "B"),
      ]),
    ]),
  );
  assert.equal(M.getMediaDebugInfo().effects - before, 3);
  await view.unmount();
  frames.flush(1);
  assert.equal(M.getMediaDebugInfo().effects, before);
  assert.equal(getFrameScheduler().size, 0);
});
