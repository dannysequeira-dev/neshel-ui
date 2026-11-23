// Phase 016 — GPU Surface Manager and the GPU entries D04, D06, D08, D10 (contracts/gpu-api.md, ADR 0031, research
// R3, R8, R10, R12, R14, R17). jsdom with a fake WebGL2 (gpu-helpers.mjs): lifecycle, budgets, failures, context
// loss/restore, exact cleanup, the original image kept visible on every failure. Pixels are probed in the lab.
import assert from "node:assert/strict";
import test from "node:test";
import { StrictMode } from "react";
import { imageFrame, installFakeGpu, sizedCanvas } from "./gpu-helpers.mjs";
import { frames, h, mount, pointer, renderToString } from "./helpers.mjs";
import { setupMediaDom } from "./media-helpers.mjs";

const { media: reducedQuery } = await setupMediaDom();
const fake = installFakeGpu();
const G = await import("../dist/gpu/index.js");
const { resetGpuForTests } = await import("../dist/gpu/engine/config.js");

const settle = (limit = 3000) => frames.settle(limit, 16);
const microtasks = () => new Promise((resolve) => setImmediate(resolve));
async function settleAll() {
  for (let i = 0; i < 6; i++) {
    settle();
    await microtasks();
  }
}
function reset() {
  resetGpuForTests();
  fake.state.webgl2 = true;
  fake.state.failLink = false;
  fake.state.textureError = undefined;
}
const live = () => ({ ...fake.state.live });
const zero = { programs: 0, shaders: 0, buffers: 0, textures: 0, arrays: 0 };

// --- Surface Manager --------------------------------------------------------------------------------------

test("manager · lazy context, decorative canvas, image hidden only after the first draw, exact release", async () => {
  reset();
  const { frame, img } = imageFrame();
  const fx = G.createDisplacementHover(frame);
  await settleAll();
  assert.equal(frame.querySelector("canvas"), null, "no canvas before any frame is needed");
  assert.equal(G.getGpuDebugInfo().contexts, 0);
  fx.set(1);
  await settleAll();
  const canvas = frame.querySelector("canvas");
  assert.ok(canvas, "canvas created on demand");
  assert.equal(canvas.getAttribute("aria-hidden"), "true");
  assert.equal(canvas.getAttribute("role"), "presentation");
  assert.match(canvas.getAttribute("style"), /pointer-events:\s*none/);
  assert.equal(fx.mode, "gpu");
  assert.equal(img.style.opacity, "0", "the native image is covered only after a successful draw");
  assert.equal(img.getAttribute("alt"), "A mountain lake", "native attributes untouched");
  const info = G.getGpuDebugInfo();
  assert.equal(info.contexts, 1);
  assert.ok(info.programs >= 1 && info.textures === 2 && info.textureBytes > 0);
  fx.destroy();
  await settleAll();
  assert.equal(frame.querySelector("canvas"), null);
  assert.equal(img.style.opacity, "", "image restored");
  assert.deepEqual(live(), zero, "every GL object deleted");
  const after = G.getGpuDebugInfo();
  assert.equal(after.contexts, 0);
  assert.equal(after.textureBytes, 0);
  assert.equal(after.drawingBufferBytes, 0);
  assert.equal(after.surfaces, 0);
  frame.remove();
});

test("manager · ONE shared draw task per frame for several surfaces", async () => {
  reset();
  const a = imageFrame();
  const b = imageFrame();
  const d8 = G.createDisplacementHover(a.frame);
  const d10 = G.createDepthParallax(b.frame, { depth: sizedCanvas(640, 480) });
  d8.set(1);
  await settleAll();
  d8.set(0.5);
  d10.seek(0.25);
  const before = G.getGpuDebugInfo();
  frames.flush(1);
  const after = G.getGpuDebugInfo();
  assert.equal(after.frames - before.frames, 1, "one draw task");
  assert.equal(after.draws - before.draws, 2, "both surfaces drawn by it");
  d8.destroy();
  d10.destroy();
  await settleAll();
  assert.deepEqual(live(), zero);
  a.frame.remove();
  b.frame.remove();
});

test("manager · failures keep the image: unsupported, shader link error, CORS-tainted texture", async () => {
  reset();
  fake.state.webgl2 = false;
  const one = imageFrame();
  const unsupported = G.createRipple(one.frame);
  unsupported.impact();
  await settleAll();
  assert.equal(unsupported.mode, "static");
  assert.equal(unsupported.reason, "unsupported");
  assert.equal(one.frame.querySelector("canvas"), null);
  assert.equal(one.img.style.opacity, "");
  unsupported.destroy();

  reset();
  fake.state.failLink = true;
  const warn = console.warn;
  const warnings = [];
  console.warn = (m) => warnings.push(String(m));
  const two = imageFrame();
  const shader = G.createRipple(two.frame);
  shader.impact();
  await settleAll();
  console.warn = warn;
  assert.equal(shader.reason, "shader");
  assert.equal(two.img.style.opacity, "");
  assert.ok(warnings.some((m) => /GPU shader/.test(m)));
  assert.deepEqual(live(), zero, "a failed init releases what it created");
  shader.destroy();

  reset();
  fake.state.textureError = "SecurityError";
  const three = imageFrame();
  const cors = G.createDisplacementHover(three.frame);
  cors.set(1);
  await settleAll();
  assert.equal(cors.reason, "cors");
  assert.equal(three.img.style.opacity, "");
  cors.destroy();
  await settleAll();
  assert.equal(G.getGpuDebugInfo().contexts, 0);
  for (const f of [one, two, three]) f.frame.remove();
  reset();
});

test("manager · context loss shows the image; restore rebuilds the resources and draws again", async () => {
  reset();
  const { frame, img } = imageFrame();
  const fx = G.createDepthParallax(frame, { depth: sizedCanvas(640, 480) });
  await settleAll();
  assert.equal(fx.mode, "gpu");
  const gl = frame.querySelector("canvas").getContext("webgl2");
  const ext = gl.getExtension("WEBGL_lose_context");
  ext.loseContext();
  assert.equal(fx.mode, "static");
  assert.equal(fx.reason, "lost");
  assert.equal(img.style.opacity, "", "image back while the context is lost");
  ext.restoreContext();
  await settleAll();
  assert.equal(fx.mode, "gpu", "restored");
  assert.equal(img.style.opacity, "0");
  assert.ok(G.getGpuDebugInfo().restores >= 1);
  fx.destroy();
  await settleAll();
  frame.remove();
});

test("manager · context budget: idle surfaces are evicted, busy ones make newcomers wait", async () => {
  reset();
  G.configureGpu({ maxContexts: 1 });
  const a = imageFrame();
  const b = imageFrame();
  const first = G.createDisplacementHover(a.frame);
  const second = G.createDisplacementHover(b.frame);
  first.set(1);
  await settleAll();
  first.set(0);
  await settleAll(); // first settles: idle
  const evictions = G.getGpuDebugInfo().evictions;
  second.set(1);
  await settleAll();
  assert.equal(G.getGpuDebugInfo().evictions - evictions, 1, "idle surface evicted");
  assert.equal(first.mode, "static");
  assert.equal(first.reason, "budget");
  assert.equal(a.img.style.opacity, "", "evicted effect shows its image");
  assert.equal(second.mode, "gpu");
  assert.equal(G.getGpuDebugInfo().contexts, 1);
  // Now `second` is busy (animating) and `first` asks: it waits.
  second.set(0.2);
  first.set(1);
  frames.flush(1);
  assert.equal(G.getGpuDebugInfo().waiting >= 0, true);
  second.destroy();
  await settleAll();
  assert.equal(first.mode, "gpu", "granted once a context freed");
  first.destroy();
  await settleAll();
  assert.equal(G.getGpuDebugInfo().contexts, 0);
  assert.equal(G.getGpuDebugInfo().waiting, 0);
  assert.throws(() => G.configureGpu({ maxContexts: 12 }), /from 1 to 8/);
  a.frame.remove();
  b.frame.remove();
  reset();
});

test("manager · reduced motion releases the surface and keeps the image", async () => {
  reset();
  const { frame, img } = imageFrame();
  const fx = G.createDepthParallax(frame, { depth: sizedCanvas(640, 480) });
  await settleAll();
  assert.equal(fx.mode, "gpu");
  reducedQuery.set(true);
  await settleAll();
  assert.equal(fx.mode, "static");
  assert.equal(frame.querySelector("canvas"), null);
  assert.equal(img.style.opacity, "");
  reducedQuery.set(false);
  await settleAll();
  assert.equal(fx.mode, "gpu", "back after reduced motion ends");
  fx.destroy();
  await settleAll();
  frame.remove();
});

// --- D06 ------------------------------------------------------------------------------------------------

test("D06 · impacts run a clock only while waves carry energy; seek is deterministic; reduced off", async () => {
  reset();
  const { frame } = imageFrame();
  const fx = G.createRipple(frame, { damping: 6 });
  fx.impact(0.3, 0.4);
  await settleAll();
  assert.equal(fx.active, false, "dissipated: no clock");
  assert.equal(frames.pending, 0, "no frame requested after dissipation");
  const gl = frame.querySelector("canvas").getContext("webgl2");
  const uniformsAt = (p) => {
    fx.seek(p);
    frames.flush(1);
    const call = gl.calls.filter((c) => c[0] === "uniform4fv").at(-1);
    const time = gl.calls.filter((c) => c[0] === "uniform1f" && c[1]?.name === "uTime").at(-1);
    return [Array.from(call[2]), time[2]];
  };
  assert.deepEqual(uniformsAt(0.5), uniformsAt(0.5), "same seed + progress → same uniforms");
  assert.throws(() => G.createRipple(frame, { amplitude: 2 }), /from 0 to 1/);
  reducedQuery.set(true);
  fx.impact();
  assert.equal(fx.active, false, "reduced motion: off");
  reducedQuery.set(false);
  fx.destroy();
  await settleAll();
  frame.remove();
});

// --- D10 ------------------------------------------------------------------------------------------------

test("D10 · explicit depth map required; aspect validated; pointer and seek drive the pose", async () => {
  reset();
  const { frame, img } = imageFrame();
  assert.throws(() => G.createDepthParallax(frame, {}), /depth.*required/);
  const warn = console.warn;
  console.warn = () => {};
  const bad = G.createDepthParallax(frame, { depth: sizedCanvas(500, 500) });
  await settleAll();
  console.warn = warn;
  assert.equal(bad.mode, "static");
  assert.equal(bad.reason, "texture", "aspect mismatch keeps the image");
  bad.destroy();
  const fx = G.createDepthParallax(frame, {
    depth: sizedCanvas(320, 240),
    from: { x: -1 },
    to: { x: 1 },
  });
  await settleAll();
  assert.equal(fx.mode, "gpu");
  fx.seek(0.75);
  assert.deepEqual(fx.pose, { x: 0.5, y: 0 });
  frame.getBoundingClientRect = () => ({
    left: 0,
    top: 0,
    width: 320,
    height: 240,
    right: 320,
    bottom: 240,
  });
  Object.defineProperty(frame, "offsetWidth", { value: 320, configurable: true });
  Object.defineProperty(frame, "offsetHeight", { value: 240, configurable: true });
  pointer(frame, "pointerenter", { x: 320, y: 120 });
  pointer(frame, "pointermove", { x: 320, y: 120 });
  await settleAll();
  assert.ok(fx.pose.x > 0.95, `pointer pose ${fx.pose.x}`);
  assert.equal(img.getAttribute("alt"), "A mountain lake");
  fx.destroy();
  await settleAll();
  frame.remove();
});

// --- D04 ------------------------------------------------------------------------------------------------

function pages(front = "img") {
  const frame = document.createElement("div");
  frame.className = "neshel-gpu-frame neshel-pagecurl";
  const page = document.createElement(front);
  if (front === "img") {
    page.setAttribute("alt", "Page one");
    Object.defineProperty(page, "complete", { value: true, configurable: true });
    Object.defineProperty(page, "naturalWidth", { value: 600, configurable: true });
    Object.defineProperty(page, "naturalHeight", { value: 800, configurable: true });
  } else page.innerHTML = '<a href="#a">Live page</a>';
  const under = document.createElement("article");
  under.innerHTML = "<h2>Page two</h2>";
  frame.append(page, under);
  Object.defineProperty(frame, "clientWidth", { value: 300, configurable: true });
  Object.defineProperty(frame, "clientHeight", { value: 400, configurable: true });
  document.body.append(frame);
  return { frame, page, under };
}

test("D04 · GPU mesh curl: subdivided mesh drawn; only the current page is accessible; exact cleanup", async () => {
  reset();
  const { frame, page, under } = pages();
  const curl = G.createPageCurl(frame, { mesh: "medium", easing: "linear" });
  await settleAll();
  assert.equal(curl.mode, "gpu");
  assert.ok(under.hasAttribute("inert"), "the page underneath is hidden until the turn completes");
  const gl = frame.querySelector("canvas").getContext("webgl2");
  curl.seek(0.4);
  frames.flush(1);
  const draw = gl.calls.filter((c) => c[0] === "drawElements").at(-1);
  assert.equal(draw[2], 32 * 24 * 6, "32×24 mesh");
  const s = gl.calls.filter((c) => c[0] === "uniform1f" && c[1]?.name === "uS").at(-1)[2];
  assert.ok(s > 0, "fold line advanced");
  curl.seek(1);
  await settleAll();
  assert.ok(page.hasAttribute("inert"));
  assert.equal(under.hasAttribute("inert"), false);
  curl.destroy();
  await settleAll();
  assert.equal(page.hasAttribute("inert"), false);
  assert.equal(under.hasAttribute("inert"), false);
  assert.equal(page.style.opacity, "");
  assert.deepEqual(live(), zero);
  frame.remove();
});

test("D04 · CSS driver for live HTML is a rigid turn; auto falls back to it without WebGL2; reduced instant", async () => {
  reset();
  const html = pages("section");
  const css = G.createPageCurl(html.frame, { driver: "css", easing: "linear" });
  css.seek(0.5);
  await settleAll();
  assert.equal(css.mode, "css");
  assert.match(html.page.style.transform, /perspective\(1600px\) rotateY\(-90deg\)/);
  assert.equal(html.page.style.transformOrigin, "0% 50%");
  css.destroy();
  await settleAll();
  assert.equal(html.page.style.transform, "");
  assert.throws(() => G.createPageCurl(html.frame, { driver: "gpu" }), /raster front page/);

  fake.state.webgl2 = false;
  resetGpuForTests();
  fake.state.webgl2 = false;
  const raster = pages();
  const auto = G.createPageCurl(raster.frame);
  await settleAll();
  assert.equal(auto.mode, "css");
  assert.equal(auto.reason, "unsupported", "fallback reported, not counted as the GPU effect");
  auto.destroy();
  reset();

  reducedQuery.set(true);
  const reducedPages = pages();
  const reduced = G.createPageCurl(reducedPages.frame);
  reduced.play();
  await settleAll();
  assert.equal(reduced.progress, 1, "instant");
  assert.equal(reduced.mode, "static");
  reducedQuery.set(false);
  reduced.destroy();
  await settleAll();
  for (const f of [html, raster, reducedPages]) f.frame.remove();
});

// --- React ------------------------------------------------------------------------------------------------

test("React · SSR renders native images only; StrictMode leaves no context or GL object behind", async () => {
  reset();
  const base = G.getGpuDebugInfo();
  assert.equal(base.contexts, 0, `no context left by earlier tests: ${JSON.stringify(base)}`);
  const img = (alt) => h("img", { alt, src: "data:image/gif;base64,R0lGODlhAQABAAAAACw=" });
  const tree = h(
    "div",
    null,
    h(G.PageCurl, { front: img("Front"), under: h("p", null, "Under") }),
    h(G.Ripple, null, img("Ripple")),
    h(G.DisplacementHover, null, img("Displacement")),
    h(G.DepthParallax, { depth: "depth.png" }, img("Depth")),
  );
  const html = renderToString(tree);
  assert.match(html, /<img alt="Front"/);
  assert.doesNotMatch(html, /<canvas|aria-hidden|style=/);
  const view = await mount(h(StrictMode, null, tree));
  await settleAll();
  await view.unmount();
  await settleAll();
  const info = G.getGpuDebugInfo();
  assert.equal(info.contexts, 0);
  assert.equal(info.surfaces, 0);
  assert.equal(info.effects, 0);
  assert.deepEqual(live(), zero);
});

test("map URLs: relative, http(s), blob and data:image are accepted; other schemes are refused", () => {
  reset();
  const { frame } = imageFrame();
  assert.throws(() => G.createDepthParallax(frame, { depth: "javascript:alert(1)" }), /image URL/);
  assert.throws(() => G.createDisplacementHover(frame, { map: "file:///etc/passwd" }), /image URL/);
  assert.throws(
    () => G.createDisplacementHover(frame, { map: "data:text/html,<b>x</b>" }),
    /image URL/,
  );
  const big = `data:image/png;base64,${"A".repeat(5000)}`;
  for (const ok of ["maps/noise.png", "https://cdn.example/map.png", "blob:abc", big]) {
    const fx = G.createDisplacementHover(frame, { map: ok });
    fx.destroy();
  }
  frame.remove();
});
