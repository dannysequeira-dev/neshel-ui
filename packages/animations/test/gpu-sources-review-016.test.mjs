// PR #17 owner review R1 — texture-source loading must be cancelled on destroy (src/gpu/engine/sources.ts,
// image-effect.ts). Written before the fix: pending caller-owned map images, already-failed maps, pending URL maps,
// late resolution after destroy and StrictMode remounts. Checks listeners, detached requests, GL resources and late
// writes (the native image's inline opacity).
import assert from "node:assert/strict";
import test from "node:test";
import { StrictMode } from "react";
import { imageFrame, installFakeGpu } from "./gpu-helpers.mjs";
import { frames, h, mount, trackListeners } from "./helpers.mjs";
import { fakeImage, setupMediaDom } from "./media-helpers.mjs";

await setupMediaDom();
const fake = installFakeGpu();
const G = await import("../dist/gpu/index.js");
const { resetGpuForTests } = await import("../dist/gpu/engine/config.js");

const microtasks = () => new Promise((resolve) => setImmediate(resolve));
async function settleAll() {
  for (let i = 0; i < 6; i++) {
    frames.settle(2000, 16);
    await microtasks();
  }
}
const loadListeners = (tracker) => tracker.active.filter((t) => t === "load" || t === "error");

test("R1 · destroy while a caller-owned map <img> is still loading removes its load/error listeners", async () => {
  resetGpuForTests();
  const { frame } = imageFrame();
  const map = fakeImage({ complete: false });
  const tracker = trackListeners(map);
  const fx = G.createDisplacementHover(frame, { map });
  await settleAll();
  assert.ok(loadListeners(tracker).length > 0, "waiting for the map");
  fx.destroy();
  await settleAll();
  assert.deepEqual(loadListeners(tracker), [], "no listener left on the caller's image");
  tracker.restore();
  frame.remove();
});

test("R1 · a map <img> that already failed (complete, naturalWidth 0) fails promptly to the static image", async () => {
  resetGpuForTests();
  const { frame, img } = imageFrame();
  const map = fakeImage({ complete: true, naturalWidth: 0 });
  const tracker = trackListeners(map);
  const fx = G.createDisplacementHover(frame, { map });
  await settleAll();
  assert.equal(fx.mode, "static");
  assert.equal(fx.reason, "texture", "reported, not left pending");
  assert.deepEqual(
    loadListeners(tracker),
    [],
    "no handler waits for an event that will never come",
  );
  fx.set(1);
  await settleAll();
  assert.equal(frame.querySelector("canvas"), null, "no surface for an invalid map");
  assert.equal(img.style.opacity, "");
  fx.destroy();
  tracker.restore();
  frame.remove();
});

test("R1 · a pending URL map is aborted on destroy (handlers cleared, request source removed)", async () => {
  resetGpuForTests();
  const { frame } = imageFrame();
  const created = [];
  const original = document.createElement.bind(document);
  document.createElement = (tag, ...rest) => {
    const node = original(tag, ...rest);
    if (String(tag).toLowerCase() === "img") created.push(node);
    return node;
  };
  let fx;
  try {
    fx = G.createDepthParallax(frame, { depth: "https://maps.example/depth.png" });
  } finally {
    document.createElement = original;
  }
  const detached = created.find(
    (node) => node.getAttribute("src") === "https://maps.example/depth.png",
  );
  assert.ok(detached, "a detached request was started");
  fx.destroy();
  await settleAll();
  assert.equal(detached.onload, null, "no load handler retained");
  assert.equal(detached.onerror, null, "no error handler retained");
  assert.equal(detached.hasAttribute("src"), false, "the pending request was released");
  frame.remove();
});

test("R1 · a map that resolves after destroy never creates a surface or writes to the native image", async () => {
  resetGpuForTests();
  const { frame, img } = imageFrame();
  const map = fakeImage({ complete: false });
  const fx = G.createDisplacementHover(frame, { map });
  fx.set(1); // a frame was wanted before the map arrived
  await settleAll();
  fx.destroy();
  map.load(256);
  await settleAll();
  assert.equal(frame.querySelector("canvas"), null);
  assert.equal(G.getGpuDebugInfo().contexts, 0);
  assert.equal(img.style.opacity, "", "no late write");
  frame.remove();
});

test("R1 · StrictMode mount/unmount with a pending caller-owned map leaves no listener or resource", async () => {
  resetGpuForTests();
  const map = fakeImage({ complete: false });
  const tracker = trackListeners(map);
  const src = "data:image/gif;base64,R0lGODlhAQABAAAAACw=";
  for (let round = 0; round < 3; round++) {
    const view = await mount(
      h(StrictMode, null, h(G.DisplacementHover, { map }, h("img", { alt: "Poster", src }))),
    );
    await settleAll();
    await view.unmount();
    await settleAll();
  }
  assert.deepEqual(loadListeners(tracker), [], "listeners released after every remount");
  assert.equal(G.getGpuDebugInfo().contexts, 0);
  assert.equal(G.getGpuDebugInfo().effects, 0);
  assert.equal(fake.state.live.textures, 0);
  tracker.restore();
});
