// Phase 012 gesture effects G01–G11, H11, P11 (FR-020, FR-021; contracts/api-012.md §1, §3,
// accessibility-012.md §2–§4). jsdom with a manual clock and frames; layout through stubbed offset chains.
import assert from "node:assert/strict";
import test from "node:test";
import {
  box,
  clock,
  countReads,
  dragPath,
  key,
  ptr,
  rotationOf,
  run,
  scaleOf,
  settle,
  setupGestureDom,
  translation,
} from "./gesture-helpers.mjs";
import { stubAnimate, trackListeners } from "./helpers.mjs";

const { media } = await setupGestureDom();
const g = await import("../dist/gestures/index.js");
const core = await import("../dist/core/index.js");
const hover = await import("../dist/hover/index.js");
const press = await import("../dist/press/index.js");
const { attachEffect, getFrameScheduler, motionValue } = core;
const { NeshelAnimationsError } = await import("../dist/index.js");

function stage({ width = 400, height = 300, itemWidth = 100, itemHeight = 100 } = {}) {
  const parent = document.createElement("div");
  const element = document.createElement("div");
  parent.append(element);
  document.body.append(parent);
  box(parent, { x: 0, y: 0, width, height });
  box(element, { x: 0, y: 0, width: itemWidth, height: itemHeight, parent });
  return { parent, element };
}

const quiet = (fn) => {
  const warn = console.warn;
  console.warn = () => {};
  try {
    return fn();
  } finally {
    console.warn = warn;
  }
};

test("gestures subpath: runtime exports and catalogue order (G01–G11)", () => {
  assert.deepEqual(
    g.gestureEffects.map((d) => d.id),
    [
      "physics/drag",
      "physics/drag-snap",
      "physics/swipe-dismiss",
      "physics/pull-to-refresh",
      "physics/spring-follow",
      "physics/elastic-edge",
      "physics/fling",
      "physics/pinch-zoom",
      "physics/rotate",
      "physics/reorder",
      "physics/squash-stretch",
    ],
  );
  for (const definition of g.gestureEffects) assert.ok(Object.isFrozen(definition));
});

test("validation: identical errors for invalid options", () => {
  assert.throws(() => g.drag.resolve({ axis: "z" }), NeshelAnimationsError);
  assert.throws(() => g.drag.resolve({ pointerTypes: ["finger"] }), /pointerTypes/);
  assert.throws(() => g.dragSnap.resolve({ snap: [{ x: "1" }] }), /snap/);
  assert.throws(() => g.drag.resolve({ controls: {} }), /controls/);
  assert.throws(() => g.springFollow.resolve({ x: 3 }), /motion value/);
  assert.throws(() => hover.cursorFollower.resolve({ pointerTypes: ["touch"] }), /touch/);
  assert.throws(() => press.longPress.resolve({ duration: 50 }), /duration/);
});

test("G01 drag: follows the pointer, inertia continues after release, grabbing mid-flight does not jump", () => {
  const { element } = stage();
  const handle = attachEffect(element, g.drag, {});
  dragPath(element, { from: [10, 10], to: [110, 10], steps: 5 });
  assert.deepEqual(translation(element).map(Math.round), [0, 0], "written in the next write phase");
  run(1);
  const atRelease = translation(element)[0];
  assert.ok(atRelease >= 100, `at release ${atRelease}`);
  run(5);
  const coasting = translation(element)[0];
  assert.ok(coasting > atRelease, "inertia");
  // Grab mid-inertia: the element stops where it is shown.
  ptr(element, "pointerdown", { x: 300, y: 10 });
  run(2);
  ptr(window, "pointermove", { x: 304, y: 10 });
  ptr(window, "pointermove", { x: 306, y: 10 });
  run(1);
  const grabbed = translation(element)[0];
  assert.ok(Math.abs(grabbed - (coasting + 6)) < 30, `no jump: ${grabbed} vs ${coasting}`);
  ptr(window, "pointerup", { x: 306, y: 10 });
  settle();
  handle.destroy();
  settle();
  assert.equal(element.getAttribute("style") ?? "", "", "inline styles restored exactly");
});

test("G01 drag: zero layout reads per pointermove (constraints measured once on start)", () => {
  const { element, parent } = stage();
  const handle = attachEffect(element, g.drag, { constraints: "parent" });
  ptr(element, "pointerdown", { x: 0, y: 0 });
  ptr(window, "pointermove", { x: 10, y: 0 }); // starts: measures here
  const reads = countReads([element, parent], () => {
    for (let i = 2; i < 30; i++) ptr(window, "pointermove", { x: i * 5, y: 0 });
  });
  assert.equal(reads, 0);
  ptr(window, "pointerup", { x: 150, y: 0 });
  handle.destroy();
  settle();
});

test("G01 drag: constraints rubber-band while dragging and spring back into bounds", () => {
  const { element } = stage({ width: 300 });
  const handle = attachEffect(element, g.drag, { constraints: "parent", inertia: false });
  ptr(element, "pointerdown", { x: 0, y: 0 });
  for (let i = 1; i <= 10; i++) {
    clock.advance(16);
    ptr(window, "pointermove", { x: i * 40, y: 0 });
  }
  run(1);
  const stretched = translation(element)[0];
  assert.ok(stretched > 200 && stretched < 400, `rubber band past 200: ${stretched}`);
  clock.advance(100);
  ptr(window, "pointerup", { x: 400, y: 0 });
  settle();
  assert.ok(
    Math.abs(translation(element)[0] - 200) < 0.5,
    `back to the bound ${translation(element)[0]}`,
  );
  handle.destroy();
  settle();
});

test("G01 drag: dynamic constraints bring a resting element into the new bounds", () => {
  const { element } = stage();
  const controls = g.createGestureControls();
  const handle = attachEffect(element, g.drag, { constraints: { left: 0, right: 300 }, controls });
  controls.moveTo(250, 0);
  settle();
  assert.ok(Math.abs(translation(element)[0] - 250) < 0.5);
  handle.update({ constraints: { left: 0, right: 100 }, controls });
  settle();
  assert.ok(Math.abs(translation(element)[0] - 100) < 0.5, `${translation(element)[0]}`);
  handle.destroy();
  settle();
});

test("G01 drag: keyboard arrows (Shift ×5) and Home on a focusable element; controls; reduced = instant", () => {
  const { element } = stage();
  element.tabIndex = 0;
  const ends = [];
  const handle = attachEffect(element, g.drag, { keyboardStep: 10, onEnd: (p) => ends.push(p) });
  const event = key(element, "keydown", "ArrowRight");
  assert.ok(event.defaultPrevented);
  settle();
  assert.ok(Math.abs(translation(element)[0] - 10) < 0.5);
  key(element, "keydown", "ArrowDown", { shiftKey: true });
  settle();
  assert.ok(Math.abs(translation(element)[1] - 50) < 0.5);
  assert.equal(ends.length, 2);
  media.set(true);
  key(element, "keydown", "Home");
  run(1);
  assert.deepEqual(translation(element), [0, 0], "reduced: instant");
  media.set(false);
  handle.destroy();
  settle();
});

test("G02 dragSnap: release picks the snap point nearest the projected rest position", () => {
  const { element } = stage({ width: 600 });
  const snaps = [];
  const handle = attachEffect(element, g.dragSnap, {
    axis: "x",
    snap: [{ x: 0 }, { x: 200 }, { x: 400 }],
    onSnap: (point, index) => snaps.push([point.x, index]),
  });
  // 60 px at ~375 px/s projects to ~157 px: the nearest point is 200 (projection, not the release point).
  dragPath(element, { from: [0, 0], to: [60, 0], steps: 4, ms: 40 });
  settle();
  assert.ok(Math.abs(translation(element)[0] - 200) < 0.5, `${translation(element)[0]}`);
  assert.deepEqual(snaps, [[200, 1]]);
  element.tabIndex = 0;
  key(element, "keydown", "ArrowRight");
  settle();
  assert.ok(Math.abs(translation(element)[0] - 400) < 0.5, "arrow goes to the next snap point");
  handle.destroy();
  settle();
});

test("G07 fling: bounces off the container walls with restitution and rests inside", () => {
  const { element } = stage({ width: 300, height: 300 });
  const rests = [];
  const handle = attachEffect(element, g.fling, { bounce: 0.6, onRest: (p) => rests.push(p) });
  dragPath(element, { from: [0, 0], to: [90, 0], steps: 3, ms: 10 });
  let max = 0;
  for (let i = 0; i < 300 && getFrameScheduler().size > 0; i++) {
    run(1);
    max = Math.max(max, translation(element)[0]);
  }
  assert.ok(max <= 200.001, `never beyond the wall: ${max}`);
  const [x] = translation(element);
  assert.ok(x >= 0 && x <= 200);
  assert.equal(rests.length, 1);
  handle.destroy();
  settle();
});

test("G03 swipeDismiss: below threshold springs back; beyond flies out, fades and calls onDismiss once", () => {
  const { element } = stage({ itemWidth: 200 });
  const dismissed = [];
  const handle = attachEffect(element, g.swipeDismiss, { onDismiss: (d) => dismissed.push(d) });
  dragPath(element, { from: [0, 0], to: [40, 0], steps: 4, ms: 40 });
  clock.advance(60);
  settle();
  assert.deepEqual(translation(element), [0, 0]);
  assert.equal(element.style.opacity, "");
  dragPath(element, { from: [0, 0], to: [150, 0], steps: 5, ms: 30 });
  settle();
  assert.deepEqual(dismissed, ["right"]);
  assert.ok(translation(element)[0] >= 200);
  assert.ok(Number(element.style.opacity) < 0.5);
  handle.destroy();
  settle();
  assert.equal(element.getAttribute("style") ?? "", "");
});

test("G03 swipeDismiss: Delete key and controls.dismiss() (the accessible alternative)", () => {
  const { element } = stage();
  element.tabIndex = 0;
  const controls = g.createGestureControls();
  const dismissed = [];
  const handle = attachEffect(element, g.swipeDismiss, {
    controls,
    direction: "left",
    onDismiss: (d) => dismissed.push(d),
  });
  key(element, "keydown", "Delete");
  settle();
  assert.deepEqual(dismissed, ["left"]);
  controls.reset();
  settle();
  media.set(true);
  controls.dismiss();
  run(1);
  assert.deepEqual(dismissed, ["left", "left"], "reduced: instant dismissal");
  media.set(false);
  handle.destroy();
  settle();
});

test("G05 springFollow: chases motion values with a spring, no task at rest; reduced jumps", () => {
  const element = document.createElement("div");
  document.body.append(element);
  const x = motionValue(0);
  const handle = attachEffect(element, g.springFollow, { x });
  x.set(100);
  run(3);
  const mid = translation(element)[0];
  assert.ok(mid > 0 && mid < 100, `${mid}`);
  settle();
  assert.ok(Math.abs(translation(element)[0] - 100) < 0.5);
  assert.equal(getFrameScheduler().size, 0);
  media.set(true);
  x.set(20);
  run(1);
  assert.ok(Math.abs(translation(element)[0] - 20) < 0.01);
  media.set(false);
  handle.destroy();
  settle();
});

test("G11 squashStretch: stretches along the drag velocity, recovers at rest; off when reduced", () => {
  const { element } = stage();
  const a = attachEffect(element, g.drag, { inertia: false });
  const b = attachEffect(element, g.squashStretch, { intensity: 1 });
  ptr(element, "pointerdown", { x: 0, y: 0 });
  for (let i = 1; i <= 6; i++) {
    clock.advance(10);
    ptr(window, "pointermove", { x: i * 20, y: 0 });
  }
  run(3);
  const [sx, sy] = scaleOf(element);
  assert.ok(sx > 1 && sy < 1, `stretch ${sx} ${sy}`);
  ptr(window, "pointerup", { x: 120, y: 0 });
  settle();
  assert.deepEqual(scaleOf(element), [1, 1]);
  a.destroy();
  b.destroy();
  settle();
});

test("G08 pinchZoom: two-finger pinch scales about the centroid; touch-action pan-x pan-y ↔ none", () => {
  const { parent: frame, element } = stage({
    width: 200,
    height: 200,
    itemWidth: 200,
    itemHeight: 200,
  });
  const zooms = [];
  const handle = attachEffect(element, g.pinchZoom, { onZoomChange: (s) => zooms.push(s) });
  settle();
  assert.equal(frame.style.getPropertyValue("touch-action"), "pan-x pan-y");
  ptr(element, "pointerdown", { id: 1, x: 50, y: 100, pointerType: "touch" });
  ptr(element, "pointerdown", { id: 2, x: 150, y: 100, pointerType: "touch" });
  ptr(window, "pointermove", { id: 1, x: 0, y: 100, pointerType: "touch" });
  ptr(window, "pointermove", { id: 2, x: 200, y: 100, pointerType: "touch" });
  run(1);
  assert.ok(Math.abs(scaleOf(element)[0] - 2) < 0.01, `scale ${scaleOf(element)}`);
  ptr(window, "pointerup", { id: 2, x: 200, y: 100, pointerType: "touch" });
  ptr(window, "pointerup", { id: 1, x: 0, y: 100, pointerType: "touch" });
  settle();
  assert.equal(zooms.length, 1);
  assert.ok(Math.abs(zooms[0] - 2) < 0.01);
  assert.equal(
    frame.style.getPropertyValue("touch-action"),
    "none",
    "zoomed: one finger pans the media",
  );
  handle.destroy();
  settle();
  assert.equal(frame.getAttribute("style") ?? "", "");
  assert.equal(element.getAttribute("style") ?? "", "");
});

test("G08 pinchZoom: keys (+, -, 0), controls, double tap; pan bounded while zoomed", () => {
  const { parent: frame, element } = stage({
    width: 200,
    height: 200,
    itemWidth: 200,
    itemHeight: 200,
  });
  frame.tabIndex = 0;
  const controls = g.createGestureControls();
  const handle = attachEffect(element, g.pinchZoom, { controls, step: 2 });
  key(frame, "keydown", "+");
  settle();
  assert.ok(Math.abs(scaleOf(element)[0] - 2) < 0.01);
  key(frame, "keydown", "ArrowLeft");
  settle();
  const [tx] = translation(element);
  assert.ok(tx > 0 && tx <= 100, `pan bounded: ${tx}`);
  key(frame, "keydown", "0");
  settle();
  assert.deepEqual(scaleOf(element), [1, 1]);
  controls.zoomTo(3);
  settle();
  assert.ok(Math.abs(scaleOf(element)[0] - 3) < 0.01);
  controls.reset();
  settle();
  ptr(element, "pointerdown", { x: 100, y: 100 });
  ptr(window, "pointerup", { x: 100, y: 100 });
  clock.advance(120);
  ptr(element, "pointerdown", { x: 100, y: 100 });
  ptr(window, "pointerup", { x: 100, y: 100 });
  settle();
  assert.ok(Math.abs(scaleOf(element)[0] - 2) < 0.01, "double tap zooms in");
  handle.destroy();
  settle();
});

test("G09 rotateGesture: two-pointer rotation, step snapping, [ ] keys and controls", () => {
  const { element } = stage();
  element.tabIndex = 0;
  const ends = [];
  const controls = g.createGestureControls();
  const handle = attachEffect(element, g.rotateGesture, {
    step: 45,
    controls,
    onRotateEnd: (d) => ends.push(d),
  });
  ptr(element, "pointerdown", { id: 1, x: 0, y: 0, pointerType: "touch" });
  ptr(element, "pointerdown", { id: 2, x: 100, y: 0, pointerType: "touch" });
  ptr(window, "pointermove", { id: 2, x: 70.7, y: 70.7, pointerType: "touch" });
  run(1);
  assert.ok(Math.abs(rotationOf(element) - 45) < 0.5, `${rotationOf(element)}`);
  ptr(window, "pointermove", { id: 2, x: 85, y: 52, pointerType: "touch" });
  ptr(window, "pointerup", { id: 2, x: 85, y: 52, pointerType: "touch" });
  ptr(window, "pointerup", { id: 1, x: 0, y: 0, pointerType: "touch" });
  settle();
  assert.equal(ends.at(-1), 45, "snapped to 45°");
  key(element, "keydown", "]");
  settle();
  assert.equal(ends.at(-1), 45 + 45, "with step snapping, keys rotate by one step");
  controls.reset();
  settle();
  assert.equal(rotationOf(element), 0);
  handle.destroy();
  settle();
});

test("G04 pullToRefresh: mouse pull at the top beyond the threshold calls onRefresh once; busy until it settles", async () => {
  const scroller = document.createElement("div");
  document.body.append(scroller);
  box(scroller, { width: 300, height: 300 });
  let resolve;
  let calls = 0;
  const statuses = [];
  const controls = g.createGestureControls();
  const handle = attachEffect(scroller, g.pullToRefresh, {
    threshold: 40,
    controls,
    onRefresh: () => {
      calls++;
      return new Promise((r) => (resolve = r));
    },
    onStatus: (s) => statuses.push(s),
  });
  const indicator = scroller.querySelector(".neshel-pull-indicator");
  assert.ok(indicator && indicator.getAttribute("aria-hidden") === "true");
  dragPath(scroller, { from: [100, 0], to: [100, 200], steps: 8 });
  assert.equal(calls, 1);
  assert.equal(scroller.getAttribute("aria-busy"), "true");
  controls.refresh();
  assert.equal(calls, 1, "no second refresh while busy");
  resolve();
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(scroller.getAttribute("aria-busy"), null);
  assert.deepEqual(statuses, ["refreshing", "done"]);
  // Not at the top: no pull.
  Object.defineProperty(scroller, "scrollTop", { value: 50, configurable: true });
  dragPath(scroller, { from: [100, 0], to: [100, 200], steps: 8 });
  assert.equal(calls, 1);
  handle.destroy();
  settle();
  assert.equal(scroller.querySelector(".neshel-pull-indicator"), null);
});

test("G06 elasticEdge: wheel past the top stretches the content, then springs back; off when reduced", () => {
  const scroller = document.createElement("div");
  const content = document.createElement("div");
  scroller.append(content);
  document.body.append(scroller);
  box(scroller, { width: 200, height: 200 });
  Object.defineProperty(scroller, "scrollHeight", { value: 600, configurable: true });
  const handle = attachEffect(content, g.elasticEdge, {});
  scroller.dispatchEvent(new window.WheelEvent("wheel", { deltaY: -120, bubbles: true }));
  run(1);
  assert.ok(translation(content)[1] > 0, `${translation(content)}`);
  settle();
  assert.deepEqual(translation(content), [0, 0]);
  media.set(true);
  scroller.dispatchEvent(new window.WheelEvent("wheel", { deltaY: -120, bubbles: true }));
  run(1);
  assert.deepEqual(translation(content), [0, 0]);
  media.set(false);
  handle.destroy();
  settle();
});

function reorderList(count = 4) {
  const list = document.createElement("ul");
  document.body.append(list);
  box(list, { width: 200, height: count * 50 });
  const items = [];
  for (let i = 0; i < count; i++) {
    const li = document.createElement("li");
    li.setAttribute("data-neshel-reorder-item", "");
    li.setAttribute("data-neshel-reorder-label", `Item ${i}`);
    const handle = document.createElement("button");
    handle.setAttribute("data-neshel-reorder-handle", "");
    li.append(handle);
    list.append(li);
    box(li, { x: 0, y: i * 50, width: 200, height: 40, parent: list });
    items.push(li);
  }
  /** The consumer's reorder: move the node and update every stubbed box. */
  const apply = (from, to) => {
    const order = [...list.children];
    const [moved] = order.splice(from, 1);
    order.splice(to, 0, moved);
    order.forEach((li, i) => {
      list.append(li);
      box(li, { x: 0, y: i * 50, width: 200, height: 40, parent: list });
    });
  };
  return { list, items, apply };
}

test("G10 reorder: dragging a handle shifts siblings and asks the consumer; items settle (FLIP)", () => {
  const { list, items, apply } = reorderList();
  const moves = [];
  const messages = [];
  const handle = attachEffect(list, g.reorder, {
    onReorder: (from, to) => {
      moves.push([from, to]);
      apply(from, to);
    },
    announce: (m) => messages.push(m),
  });
  const grip = items[0].querySelector("button");
  ptr(grip, "pointerdown", { x: 10, y: 20 });
  for (let i = 1; i <= 6; i++) ptr(window, "pointermove", { x: 10, y: 20 + i * 18 });
  run(4);
  assert.ok(translation(items[0])[1] > 90, "dragged item follows");
  assert.ok(translation(items[1])[1] < 0, "sibling shifted up");
  ptr(window, "pointerup", { x: 10, y: 128 });
  assert.deepEqual(moves, [[0, 2]]);
  assert.equal(messages.length, 1);
  assert.match(messages[0], /Item 0 at position 3 of 4/);
  settle();
  for (const item of items) assert.deepEqual(translation(item), [0, 0]);
  assert.equal(list.children[2], items[0], "the consumer's order");
  handle.destroy();
  settle();
});

test("G10 reorder: touch never starts on the item body, only on the handle", () => {
  const { list, items } = reorderList();
  const moves = [];
  const handle = attachEffect(list, g.reorder, { onReorder: (f, t) => moves.push([f, t]) });
  ptr(items[0], "pointerdown", { x: 10, y: 20, pointerType: "touch" });
  for (let i = 1; i <= 6; i++)
    ptr(window, "pointermove", { x: 10, y: 20 + i * 20, pointerType: "touch" });
  ptr(window, "pointerup", { x: 10, y: 140, pointerType: "touch" });
  assert.deepEqual(moves, []);
  handle.destroy();
});

test("G10 reorder: keyboard grab, move, drop and cancel with one announcement each; focus stays", () => {
  const { list, items, apply } = reorderList();
  const moves = [];
  const messages = [];
  const handle = attachEffect(list, g.reorder, {
    onReorder: (from, to) => {
      moves.push([from, to]);
      apply(from, to);
    },
    announce: (m) => messages.push(m),
  });
  const grip = items[1].querySelector("button");
  grip.focus();
  key(grip, "keydown", " ");
  assert.equal(grip.getAttribute("aria-pressed"), "true");
  key(grip, "keydown", "ArrowDown");
  key(grip, "keydown", "ArrowDown");
  key(grip, "keydown", " ");
  assert.deepEqual(moves, [
    [1, 2],
    [2, 3],
  ]);
  assert.equal(grip.getAttribute("aria-pressed"), "false");
  assert.equal(document.activeElement, grip);
  assert.equal(messages.length, 4); // grab, 2 moves, drop
  key(grip, "keydown", "Enter");
  key(grip, "keydown", "ArrowUp");
  key(grip, "keydown", "Escape");
  assert.deepEqual(
    moves.slice(2),
    [
      [3, 2],
      [2, 3],
    ],
    "escape restores the original position",
  );
  assert.match(messages.at(-1), /cancelled/);
  g.reorderMove(list, items[1], -1);
  assert.deepEqual(moves.at(-1), [3, 2], "move helper (buttons)");
  settle();
  handle.destroy();
  settle();
});

test("H11 cursorFollower: package layer follows mouse only, is aria-hidden and non-interactive; removed on destroy", () => {
  const area = document.createElement("div");
  document.body.append(area);
  box(area, { width: 300, height: 200 });
  const handle = attachEffect(area, hover.cursorFollower, {});
  const dot = area.querySelector(".neshel-cursor-follower");
  assert.equal(dot.getAttribute("aria-hidden"), "true");
  area.dispatchEvent(
    new window.PointerEvent("pointerenter", { clientX: 50, clientY: 50, pointerType: "mouse" }),
  );
  ptr(window, "pointermove", { x: 60, y: 60 });
  settle();
  assert.match(dot.style.transform, /translate3d\(60(\.0)?px, 60(\.0)?px/);
  assert.equal(Number(dot.style.opacity), 1);
  media.set(true);
  run(1);
  ptr(window, "pointermove", { x: 100, y: 60 });
  settle();
  assert.equal(dot.style.opacity, "", "reduced: hidden");
  media.set(false);
  handle.destroy();
  assert.equal(area.querySelector(".neshel-cursor-follower"), null);
  assert.equal(area.getAttribute("data-neshel-fx"), null);
});

test("P11 longPress: completes once after the duration; the following click is swallowed", () => {
  const animate = stubAnimate();
  const button = document.createElement("button");
  document.body.append(button);
  let clicks = 0;
  button.addEventListener("click", () => clicks++);
  const fired = [];
  const handle = attachEffect(button, press.longPress, {
    duration: 300,
    onLongPress: (s) => fired.push(s),
  });
  assert.ok(button.querySelector(".neshel-long-press"));
  ptr(button, "pointerdown", { x: 5, y: 5 });
  assert.equal(animate.calls.length, 1, "progress layer animated with WAAPI");
  run(10);
  assert.deepEqual(fired, []);
  run(10);
  assert.deepEqual(fired, ["pointer"]);
  ptr(window, "pointerup", { x: 5, y: 5 });
  button.click();
  assert.equal(clicks, 0, "the click of the completed long press is swallowed");
  button.click();
  assert.equal(clicks, 1, "only that one click");
  handle.destroy();
  animate.restore();
});

test("P11 longPress: early release, excessive movement and pointercancel cancel", () => {
  const animate = stubAnimate();
  const button = document.createElement("button");
  document.body.append(button);
  const fired = [];
  let cancels = 0;
  const handle = attachEffect(button, press.longPress, {
    duration: 200,
    moveTolerance: 10,
    onLongPress: () => fired.push(1),
    onCancel: () => cancels++,
  });
  ptr(button, "pointerdown", { x: 0, y: 0 });
  run(3);
  ptr(window, "pointerup", { x: 0, y: 0 });
  ptr(button, "pointerdown", { x: 0, y: 0 });
  ptr(window, "pointermove", { x: 30, y: 0 });
  ptr(window, "pointerup", { x: 30, y: 0 });
  ptr(button, "pointerdown", { x: 0, y: 0 });
  ptr(window, "pointercancel", { x: 0, y: 0 });
  run(30);
  assert.deepEqual(fired, []);
  assert.equal(cancels, 3);
  assert.equal(getFrameScheduler().size, 0, "no pending timer task");
  handle.destroy();
  animate.restore();
});

test("P11 longPress: keyboard hold (Space) and single press mode; Enter short press keeps activation", () => {
  const animate = stubAnimate();
  const button = document.createElement("button");
  document.body.append(button);
  let clicks = 0;
  button.addEventListener("click", () => clicks++);
  const fired = [];
  const handle = attachEffect(button, press.longPress, {
    duration: 200,
    onLongPress: (s) => fired.push(s),
  });
  key(button, "keydown", " ");
  run(15);
  assert.deepEqual(fired, ["keyboard"]);
  key(button, "keyup", " ");
  const enter = key(button, "keydown", "Enter");
  assert.ok(enter.defaultPrevented, "no click on Enter keydown (double action)");
  key(button, "keyup", "Enter");
  assert.equal(clicks, 1, "short Enter press still activates the button");
  handle.update({ duration: 200, keyboard: "press", onLongPress: (s) => fired.push(s) });
  key(button, "keydown", "Enter");
  assert.deepEqual(fired, ["keyboard", "keyboard"]);
  handle.destroy();
  animate.restore();
});

test("cleanup: after destroying every gesture effect no session, claim, listener or task remains", () => {
  const { element } = stage();
  const listeners = trackListeners(element);
  const handles = [g.drag, g.squashStretch, g.rotateGesture].map((d) =>
    attachEffect(element, d, {}),
  );
  for (const handle of handles) handle.destroy();
  settle();
  assert.deepEqual(listeners.active, []);
  assert.deepEqual(g.getGestureDebugInfo(), { sessions: 0, claims: 0 });
  assert.equal(getFrameScheduler().size, 0);
  listeners.restore();
  quiet(() => {});
});
