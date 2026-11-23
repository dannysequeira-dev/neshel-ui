// Phase 016 — Advanced 3D & Distortion, CSS entries (D01, D02, D03, D05, D07, D09, D11) and the shared 3D geometry
// (contracts/advanced-api.md, research R5–R15). jsdom with a manual rAF; real layout, depth sorting and pixels run
// in the lab (CDP and Playwright).
import assert from "node:assert/strict";
import test from "node:test";
import { StrictMode } from "react";
import { frames, h, layoutBox, mount, pointer, renderToString, setupDom } from "./helpers.mjs";

const { media: reducedQuery } = await setupDom();
globalThis.MutationObserver = window.MutationObserver;
const A = await import("../dist/advanced/index.js");
const G = await import("../dist/core/geometry-3d.js");

const settle = (limit = 2000) => frames.settle(limit, 16);
const el = (tag = "div", attrs = {}) => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
};
/** Inline styles (as serialised CSS text; an emptied `style=""` equals no style) and the other attributes. */
function snapshot(...nodes) {
  return nodes.map((node) => ({
    style: (node.getAttribute("style") ?? "").replace(/;s*$/, "").trim(),
    attrs: [...node.attributes]
      .filter((a) => a.name !== "style")
      .map((a) => `${a.name}=${a.value}`)
      .sort(),
  }));
}
const microtasks = () => new Promise((resolve) => setImmediate(resolve));
async function settleAll() {
  for (let i = 0; i < 6; i++) {
    settle();
    await microtasks();
  }
}
function flipFixture() {
  const root = el("div");
  const inner = el("div", { style: "color: red" });
  const front = el("div", { id: "front" });
  front.innerHTML = '<button id="front-btn" data-neshel-flip-toggle>Details</button>';
  const back = el("div", { id: "back", "aria-label": "Back" });
  back.innerHTML =
    '<a href="#x" id="back-link">Link</a><button data-neshel-flip-toggle>Back</button>';
  inner.append(front, back);
  root.append(inner);
  document.body.append(root);
  return { root, inner, front, back };
}

// --- Geometry ---------------------------------------------------------------------------------------------

test("geometry · orbitLayer equals translateZ(−d) rotate translateZ(d) for both axes", () => {
  for (const deg of [0, 30, -45, 90, 135]) {
    const d = 120;
    const r = (deg * Math.PI) / 180;
    const y = G.orbitLayer("y", deg, d);
    // The plane's centre (0,0,0) must land where translateZ(−d)·rotateY·translateZ(d) puts it.
    assert.ok(Math.abs((y.translateX ?? 0) - d * Math.sin(r)) < 1e-3);
    assert.ok(Math.abs((y.translateZ ?? 0) - d * (Math.cos(r) - 1)) < 1e-3);
    const x = G.orbitLayer("x", deg, d);
    assert.ok(Math.abs((x.translateY ?? 0) + d * Math.sin(r)) < 1e-3);
  }
});

test("geometry · ring radius, relative angles and shortest-path targets", () => {
  const r = G.ringRadius(200, 6, 20);
  assert.ok(Math.abs(r - 110 / Math.tan(Math.PI / 6)) < 1e-9);
  assert.equal(G.ringRelative(0, 6, 0), 0);
  assert.equal(G.ringRelative(1, 6, 0), 60);
  assert.equal(G.ringRelative(5, 6, 0), -60, "wraps to the shortest side");
  assert.equal(G.shortestRingTarget(350, 0, 6), 360, "index 0 from 350° is 360°, not 0°");
  assert.equal(G.shortestRingTarget(-10, 5, 6), -60);
});

test("geometry · hinged fold: base polygon per corner, crease overlap and recede depth sign", () => {
  const tr = G.foldGeometry("top-right", 200, 100, 30, 60, 1, true);
  assert.equal(tr.base, "polygon(0px 0px, 170px 0px, 200px 30px, 200px 100px, 0px 100px)");
  assert.equal(tr.flap, "polygon(169.25px 0px, 200px 0px, 200px 30.75px)", "0.75 px overlap");
  assert.equal(tr.origin, "170px 0px");
  const bl = G.foldGeometry("bottom-left", 200, 100, 30, 60, 1, true);
  assert.equal(bl.base, "polygon(0px 0px, 200px 0px, 200px 100px, 30px 100px, 0px 70px)");
  for (const corner of G.CORNERS) {
    assert.ok(G.foldCornerDepth(corner, 30, 60, 1, true) < 0, `${corner} recedes`);
    assert.ok(G.foldCornerDepth(corner, 30, 60, 1, false) > 0, `${corner} reverse lifts`);
  }
  assert.equal(G.cornerOf(0.8, -0.9), "top-right");
  assert.equal(G.cornerOf(-0.2, 0.4), "bottom-left");
});

test("geometry · cylinder curl is continuous at both seams and flips the far part on top", () => {
  const corner = { x: 400, y: 300 };
  const dir = G.curlDirection("bottom-right", 400, 300);
  const r = 30;
  const s = 200;
  // Points along the curl direction around both seams (t = 0 and t = πr).
  const at = (t) => {
    const u = s - t;
    return G.curlPoint(corner.x + dir.x * u, corner.y + dir.y * u, corner, dir, s, r);
  };
  const eps = 1e-4;
  for (const seam of [0, Math.PI * r]) {
    const a = at(seam - eps);
    const b = at(seam + eps);
    assert.ok(
      Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) < 1e-2,
      `continuous at t=${seam.toFixed(2)}`,
    );
  }
  assert.equal(at(-5).z, 0, "flat before the fold line");
  assert.equal(at(Math.PI * r + 50).z, 2 * r, "flipped flat on top after the half turn");
  assert.equal(at(Math.PI * r + 50).nz, -1, "back side faces the viewer");
});

// --- D01 card flip ----------------------------------------------------------------------------------------

test("D01 · structure through the host, hidden face inert, flip animates to the back, exact restore", () => {
  const { root, inner, front, back } = flipFixture();
  const before = snapshot(root, inner, front, back);
  const flip = A.createCardFlip(root);
  settle();
  assert.equal(root.style.perspective, "1200px");
  assert.equal(inner.style.transformStyle, "preserve-3d");
  assert.equal(front.style.backfaceVisibility, "hidden");
  assert.match(back.style.transform, /rotateY\(180deg\)/);
  assert.equal(back.getAttribute("aria-hidden"), "true");
  assert.ok(back.hasAttribute("inert"));
  assert.equal(front.hasAttribute("inert"), false);
  assert.equal(flip.side, "front");
  flip.flip();
  frames.flush(6);
  assert.ok(flip.progress > 0 && flip.progress < 1, "animating");
  settle();
  assert.equal(flip.side, "back");
  assert.match(inner.style.transform, /rotateY\(180deg\)/);
  assert.ok(front.hasAttribute("inert"));
  assert.equal(back.getAttribute("aria-hidden"), null, "the visible face is exposed");
  assert.equal(root.getAttribute("data-neshel-flip"), "back");
  flip.destroy();
  settle();
  assert.deepEqual(snapshot(root, inner, front, back), before);
  root.remove();
});

test("D01 · interruption keeps the angle; seek is exact; focus leaves the face that turns away", () => {
  const { root, inner, front } = flipFixture();
  const flip = A.createCardFlip(root);
  settle();
  front.querySelector("button").focus();
  flip.flip("back");
  frames.flush(5);
  const mid = flip.progress;
  flip.flip("front"); // interrupt
  frames.flush(1);
  assert.ok(Math.abs(flip.progress - mid) < 0.2, "no jump on interruption");
  settle();
  assert.equal(flip.side, "front");
  flip.seek(0.3);
  settle();
  assert.match(inner.style.transform, /rotateY\(54deg\)/);
  flip.seek(1);
  settle();
  assert.equal(document.activeElement?.id, "back-link", "focus moved to the visible face");
  flip.destroy();
  settle();
  root.remove();
});

test("D01 · in-face toggles, drive(), reduced motion fade without rotation", () => {
  const { root, inner, front, back } = flipFixture();
  const sides = [];
  const flip = A.createCardFlip(root, { onFlip: (s) => sides.push(s) });
  settle();
  front.querySelector("button").click();
  settle();
  assert.equal(flip.side, "back");
  assert.deepEqual(sides, ["back"]);
  let value = 0;
  const listeners = new Set();
  const stop = flip.drive({
    get: () => value,
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  });
  value = 0.75;
  for (const fn of listeners) fn(value);
  settle();
  assert.equal(flip.progress, 0.75);
  stop();
  reducedQuery.set(true);
  settle();
  assert.equal(flip.mode, "fade");
  assert.equal(inner.style.transform, "", "no rotation under reduced motion");
  assert.equal(Number(back.style.opacity), 0.75);
  assert.equal(Number(front.style.opacity), 0.25);
  reducedQuery.set(false);
  flip.destroy();
  settle();
  root.remove();
});

// --- D02 cube rotation ------------------------------------------------------------------------------------

function cubeFixture(n = 4) {
  const root = el("div", { class: "neshel-cube" });
  Object.defineProperty(root, "clientWidth", { value: 400, configurable: true });
  Object.defineProperty(root, "clientHeight", { value: 300, configurable: true });
  for (let i = 0; i < n; i++) {
    const panel = el("section", { "data-i": String(i) });
    panel.innerHTML = `<button>Panel ${i}</button>`;
    root.append(panel);
  }
  document.body.append(root);
  return { root, panels: [...root.children] };
}

test("D02 · cube faces orbit a cached half-depth; one interactive panel; exact restore", async () => {
  const { root, panels } = cubeFixture();
  const before = snapshot(root, ...panels);
  const cube = A.createCubeRotate(root, { easing: "linear" });
  settle();
  assert.equal(cube.index, 0);
  assert.equal(panels[1].style.visibility, "hidden");
  assert.ok(panels[1].hasAttribute("inert"));
  cube.go(1);
  cube.pause();
  cube.seek(0.5);
  settle();
  // Outgoing at −45°, incoming at +45° about d = 200 px.
  assert.match(panels[0].style.transform, /rotateY\(-45deg\)/);
  assert.match(panels[1].style.transform, /rotateY\(45deg\)/);
  // Scaled orbit: 1/(sin 45° + cos 45°) keeps the projection inside the panel box (no overflow).
  assert.match(
    panels[0].style.transform,
    /translate3d\(-100px, 0px, -41\.421px\) rotateY\(-45deg\) scale\(0\.707\)/,
  );
  assert.equal(panels[1].style.visibility, "");
  assert.equal(cube.index, 1, "the target is the logical active panel");
  assert.ok(panels[0].hasAttribute("inert"));
  assert.equal(panels[1].hasAttribute("inert"), false);
  cube.finish();
  await settleAll();
  assert.equal(panels[1].style.transform, "");
  assert.equal(panels[0].style.visibility, "hidden");
  cube.destroy();
  settle();
  assert.deepEqual(snapshot(root, ...panels), before);
  root.remove();
});

test("D02 · reverse to the origin, queued targets, focus kept, reduced fade", async () => {
  const { root, panels } = cubeFixture();
  const changes = [];
  const cube = A.createCubeRotate(root, { easing: "linear", onChange: (i) => changes.push(i) });
  settle();
  panels[0].querySelector("button").focus();
  cube.go(1);
  assert.equal(document.activeElement?.textContent, "Panel 1", "focus moved to the incoming panel");
  frames.flush(10);
  cube.go(0); // back to the origin: reverse
  await settleAll();
  assert.equal(cube.index, 0);
  cube.next();
  frames.flush(5);
  cube.next(); // queued (newest target wins)
  cube.next();
  await settleAll();
  assert.equal(cube.index, 3);
  assert.equal(changes.at(-1), 3);
  assert.equal(changes.includes(2), false, "the intermediate queued target was collapsed");
  reducedQuery.set(true);
  cube.go(0);
  cube.pause();
  cube.seek(0.5);
  settle();
  assert.equal(cube.mode, "fade");
  assert.equal(panels[0].style.transform, "");
  assert.equal(Number(panels[0].style.opacity), 0.5);
  reducedQuery.set(false);
  cube.destroy();
  settle();
  root.remove();
});

// --- D03 ring carousel ------------------------------------------------------------------------------------

function ringFixture(n = 6) {
  const root = el("div", { class: "neshel-ring" });
  for (let i = 0; i < n; i++) {
    const item = el("article");
    item.innerHTML = `<a href="#${i}">Item ${i}</a>`;
    layoutBox(item, { width: 200, height: 120 });
    root.append(item);
  }
  document.body.append(root);
  return { root, items: [...root.children] };
}

test("D03 · items on a ring; only the front item is interactive; carousel semantics; restore", () => {
  const { root, items } = ringFixture();
  const before = snapshot(root, ...items);
  const ring = A.createRingCarousel(root, { label: "Featured" });
  settle();
  assert.equal(root.getAttribute("aria-roledescription"), "carousel");
  assert.equal(root.getAttribute("aria-label"), "Featured");
  assert.equal(root.getAttribute("tabindex"), "0");
  assert.equal(items[0].getAttribute("aria-roledescription"), "slide");
  assert.equal(items[0].getAttribute("aria-label"), "1 of 6");
  assert.equal(items[0].hasAttribute("inert"), false);
  for (const item of items.slice(1)) assert.ok(item.hasAttribute("inert"));
  assert.match(items[1].style.transform, /rotateY\(60deg\)/);
  assert.equal(items[1].style.backfaceVisibility, "hidden");
  assert.ok(Number(items[0].style.zIndex) > Number(items[3].style.zIndex), "front above back");
  ring.next();
  settle();
  assert.equal(ring.index, 1);
  assert.equal(items[1].hasAttribute("inert"), false);
  assert.match(root.querySelector(".neshel-ring-live").textContent, /Slide 2 of 6/);
  ring.destroy();
  settle();
  assert.equal(root.querySelector(".neshel-ring-live"), null);
  assert.deepEqual(snapshot(root, ...items), before);
  root.remove();
});

test("D03 · rapid navigation retargets along the shortest path; keyboard; required name", () => {
  const { root } = ringFixture();
  const ring = A.createRingCarousel(root, { label: "Ring" });
  settle();
  for (let i = 0; i < 5; i++) {
    ring.previous();
    frames.flush(2);
  }
  settle();
  assert.equal(ring.index, 1);
  assert.ok(Math.abs(ring.angle - -300) < 0.5, `accumulated angle ${ring.angle}`);
  root.dispatchEvent(new window.KeyboardEvent("keydown", { key: "End", bubbles: true }));
  settle();
  assert.equal(ring.index, 5);
  ring.destroy();
  settle();
  const unnamed = ringFixture(3).root;
  assert.throws(() => A.createRingCarousel(unnamed), /accessible name/);
  root.remove();
  unnamed.remove();
});

// --- D05 CornerRecede -------------------------------------------------------------------------------------

function cornerFixture() {
  const root = el("div", { class: "neshel-corner" });
  const surface = el("div", { id: "card", style: "background: rgb(30, 58, 138)" });
  surface.innerHTML =
    '<h3 id="title">Card</h3><a href="#more" id="more" aria-describedby="title">More</a><input id="q" name="q" value="x">';
  root.append(surface);
  document.body.append(root);
  layoutBox(root, { left: 0, top: 0, width: 240, height: 180 });
  layoutBox(surface, { left: 0, top: 0, width: 240, height: 180 });
  return { root, surface };
}

test("D05 · the corner under the pointer recedes: clipped surface + inert ID-free flap; leave restores", () => {
  const { root, surface } = cornerFixture();
  const before = snapshot(root, surface);
  surface.querySelector("input").value = "typed";
  const corner = A.createCornerRecede(root);
  pointer(root, "pointerenter", { x: 230, y: 10 });
  pointer(root, "pointermove", { x: 230, y: 10 });
  settle();
  assert.equal(corner.corner, "top-right");
  assert.ok(corner.amount > 0.8, `amount ${corner.amount}`);
  assert.match(surface.style.clipPath, /^polygon\(0px 0px, /);
  const flap = root.querySelector(".neshel-corner-flap");
  assert.ok(flap, "flap rendered");
  assert.equal(flap.getAttribute("aria-hidden"), "true");
  assert.ok(flap.hasAttribute("inert"));
  assert.equal(flap.querySelectorAll("[id]").length, 0, "no duplicated ids");
  assert.equal(flap.querySelectorAll("[name],[aria-describedby]").length, 0);
  assert.equal(flap.querySelector("input").value, "typed", "typed value copied");
  assert.match(
    flap.style.transform,
    /rotate3d\(1, 1, 0, \d/,
    "recede: positive angle at top-right",
  );
  assert.equal(A.getAdvancedDebugInfo().flaps, 1);
  pointer(window, "pointermove", { x: 400, y: 400 }); // fast exit outside the box
  settle();
  assert.equal(corner.amount, 0);
  assert.equal(root.querySelector(".neshel-corner-flap"), null, "flap removed at rest");
  assert.equal(surface.style.clipPath, "");
  corner.destroy();
  settle();
  assert.deepEqual(snapshot(root, surface), before);
  assert.equal(A.getAdvancedDebugInfo().flaps, 0);
  root.remove();
});

test("D05 · centre is neutral; corner change returns through 0; reverse lifts; plain flap; reduced instant", () => {
  const { root, surface } = cornerFixture();
  const corner = A.createCornerRecede(root, { reverse: true, flap: "plain" });
  pointer(root, "pointerenter", { x: 120, y: 90 });
  pointer(root, "pointermove", { x: 120, y: 90 });
  settle();
  assert.equal(corner.amount, 0, "centre does not fold");
  pointer(window, "pointermove", { x: 235, y: 5 });
  settle();
  const flap = root.querySelector(".neshel-corner-flap");
  assert.match(
    flap.style.transform,
    /rotate3d\(1, 1, 0, -\d/,
    "reverse: negative angle at top-right",
  );
  assert.equal(flap.querySelector("h3"), null, "plain flap copies no content");
  const seen = [];
  pointer(window, "pointermove", { x: 5, y: 175 }); // bottom-left
  for (let i = 0; i < 200 && corner.corner !== "bottom-left"; i++) {
    frames.flush(1);
    seen.push(corner.amount);
  }
  assert.ok(Math.min(...seen) <= 0.02, "returned to flat before switching corners");
  settle();
  assert.equal(corner.corner, "bottom-left");
  reducedQuery.set(true);
  corner.seek("top-left", 0.5);
  assert.equal(corner.amount, 0.5);
  pointer(window, "pointermove", { x: 235, y: 175 });
  assert.ok(corner.corner === "bottom-right" || corner.amount === 0, "instant without frames");
  reducedQuery.set(false);
  corner.destroy();
  settle();
  assert.equal(surface.style.clipPath, "");
  root.remove();
});

// --- D07 glitch -------------------------------------------------------------------------------------------

test("D07 · decorative layers during a burst only; ≤ 3 slice changes per second; ids stripped", () => {
  const span = el("span", { class: "neshel-glitch" });
  span.innerHTML = 'Neshel <b id="b">UI</b>';
  document.body.append(span);
  const before = snapshot(span);
  const glitch = A.createGlitch(span, { trigger: "manual", duration: 2000 });
  const steps0 = A.getAdvancedDebugInfo().glitchSteps;
  glitch.play();
  const layers = span.querySelectorAll(".neshel-glitch-layer");
  assert.equal(layers.length, 2);
  for (const layer of layers) {
    assert.equal(layer.getAttribute("aria-hidden"), "true");
    assert.ok(layer.hasAttribute("inert"));
    assert.equal(layer.querySelector("[id]"), null);
  }
  frames.flush(130, 16); // ~2.08 s
  const steps = A.getAdvancedDebugInfo().glitchSteps - steps0;
  assert.ok(steps <= 7 && steps >= 5, `${steps} slice changes in 2 s (cap 3/s)`);
  assert.equal(glitch.active, false, "burst ended");
  assert.equal(span.querySelectorAll(".neshel-glitch-layer").length, 0);
  assert.throws(() => A.createGlitch(span, { rate: 4 }), /from 1 to 3/);
  reducedQuery.set(true);
  glitch.play();
  assert.equal(glitch.active, false, "reduced motion: off");
  reducedQuery.set(false);
  glitch.destroy();
  assert.deepEqual(snapshot(span), before);
  span.remove();
});

// --- D09 grid floor and D11 tilt-shift --------------------------------------------------------------------

test("D09 · decorative floor layer, finite by default, reduced static, removed on destroy", () => {
  const root = el("div", { class: "neshel-grid-host" });
  document.body.append(root);
  const grid = A.createPerspectiveGrid(root, { speed: 2 });
  const layer = root.querySelector(".neshel-grid-floor");
  assert.equal(layer.getAttribute("aria-hidden"), "true");
  assert.match(layer.getAttribute("style"), /pointer-events:\s*none/);
  assert.match(layer.getAttribute("style"), /overflow:\s*hidden/);
  assert.equal(grid.state, "running");
  assert.equal(layer.getAttribute("data-neshel-grid"), "running");
  grid.pause();
  assert.equal(grid.state, "paused");
  reducedQuery.set(true);
  grid.play();
  assert.equal(grid.state, "reduced");
  assert.equal(layer.hasAttribute("data-neshel-grid"), false);
  reducedQuery.set(false);
  assert.throws(() => A.createPerspectiveGrid(root, { angle: 90 }), /from 45 to 85/);
  grid.destroy();
  assert.equal(root.querySelector(".neshel-grid-floor"), null);
  assert.equal(A.getAdvancedDebugInfo().gateElements, 0);
  root.remove();
});

test("D11 · overlay bands with graded masks; tint fallback without backdrop-filter; focus spring", () => {
  const root = el("div", { class: "neshel-tiltshift-host" });
  root.innerHTML = "<p>Readable content</p>";
  document.body.append(root);
  const ts = A.createTiltShift(root, { bands: 2, focus: 0.5, size: 0.4 });
  const overlay = root.querySelector(".neshel-tiltshift");
  assert.equal(overlay.getAttribute("aria-hidden"), "true");
  assert.equal(ts.mode, "tint", "jsdom has no backdrop-filter");
  const bands = overlay.querySelectorAll(".neshel-tiltshift-band");
  assert.equal(bands.length, 4);
  assert.match(bands[0].style.maskImage || bands[0].style.webkitMaskImage || "", /transparent 30%/);
  ts.setFocus(0.2);
  settle();
  assert.ok(Math.abs(ts.focus - 0.2) < 0.01);
  assert.equal(root.querySelector("p").textContent, "Readable content");
  assert.throws(() => A.createTiltShift(root, { blur: 20 }), /from 0 to 12/);
  ts.destroy();
  assert.equal(root.querySelector(".neshel-tiltshift"), null);
  root.remove();
});

// --- React ------------------------------------------------------------------------------------------------

test("React · SSR markup is static content; StrictMode mounts one live effect each and cleans up", async () => {
  const tree = h(
    "div",
    null,
    h(A.CardFlip, { front: "Front", back: "Back" }),
    h(A.CubeRotate, null, h("section", null, "One"), h("section", null, "Two")),
    h(
      A.RingCarousel,
      { label: "Ring" },
      h("article", null, "A"),
      h("article", null, "B"),
      h("article", null, "C"),
    ),
    h(A.CornerRecede, null, h("div", null, "Card")),
    h(A.Glitch, null, "Glitch"),
    h(A.PerspectiveGrid, null, "Floor"),
    h(A.TiltShift, null, "Focus"),
  );
  const html = renderToString(tree);
  assert.match(html, /class="neshel-flip"/);
  assert.doesNotMatch(html, /inert|aria-hidden|style=/, "no engine output on the server");
  const before = A.getAdvancedDebugInfo().effects;
  const view = await mount(h(StrictMode, null, tree));
  settle();
  assert.equal(A.getAdvancedDebugInfo().effects - before, 7, "one live effect per component");
  await view.unmount();
  settle();
  const info = A.getAdvancedDebugInfo();
  assert.equal(info.effects, before);
  assert.equal(info.layers, 0);
  assert.equal(info.flaps, 0);
});

test("React · CardFlip controlled `flipped` flips the live engine without recreating it", async () => {
  const changes = [];
  const ref = { current: null };
  const view = await mount(
    h(A.CardFlip, {
      front: "F",
      back: "B",
      flipped: false,
      controlRef: ref,
      onFlippedChange: (v) => changes.push(v),
    }),
  );
  settle();
  const engine = ref.current;
  await view.render(
    h(A.CardFlip, {
      front: "F",
      back: "B",
      flipped: true,
      controlRef: ref,
      onFlippedChange: (v) => changes.push(v),
    }),
  );
  settle();
  assert.equal(ref.current, engine, "same engine");
  assert.equal(engine.side, "back");
  assert.deepEqual(changes, [], "a prop-driven flip reports nothing (the parent already knows)");
  await view.unmount();
  settle();
});

test("React · CardFlip controlled: toggles report the intent at once; a late render never undoes a newer toggle", async () => {
  // Regression (WebKit lab run): the visible-side crossing used to be reported; when React committed it after a
  // second toggle, the controlled prop flipped the card back against the user's latest action.
  let flipped = false;
  const changes = [];
  const ref = { current: null };
  const face = (label) =>
    h("button", { type: "button", "data-neshel-flip-toggle": "", id: `t-${label}` }, label);
  const tree = () =>
    h(A.CardFlip, {
      front: face("front"),
      back: face("back"),
      flipped,
      controlRef: ref,
      onFlippedChange: (value) => {
        changes.push(value);
        flipped = value;
      },
    });
  const view = await mount(tree());
  settle();
  document.getElementById("t-front").click();
  assert.deepEqual(changes, [true], "intent reported before any frame");
  for (let i = 0; i < 60 && ref.current.side !== "back"; i++) frames.flush(1); // just past the 90° crossing
  assert.equal(ref.current.side, "back");
  assert.ok(ref.current.progress < 0.95, "still moving");
  document.getElementById("t-back").click(); // the user changes their mind mid-flip
  assert.deepEqual(changes, [true, false]);
  await view.render(tree()); // the parent commits its (latest) state
  settle();
  assert.equal(ref.current.target, "front");
  assert.equal(ref.current.side, "front", "the newer toggle wins");
  await view.unmount();
  settle();
});
