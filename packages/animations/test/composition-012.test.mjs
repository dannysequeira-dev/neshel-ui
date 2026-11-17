// Phase 012 composition matrix (FR-052; contracts/composition-matrix-012.md) and React/SSR of the gestures
// components. Every row checks that no contribution is overwritten and that cleanup restores the element.
import assert from "node:assert/strict";
import test from "node:test";
import { Profiler, useState } from "react";
import {
  box,
  clock,
  dragPath,
  ptr,
  rotationOf,
  run,
  scaleOf,
  settle,
  setupGestureDom,
  translation,
} from "./gesture-helpers.mjs";
import { h, markup, mount } from "./helpers.mjs";

await setupGestureDom();
const g = await import("../dist/gestures/index.js");
const layout = await import("../dist/layout/index.js");
const hover = await import("../dist/hover/index.js");
const press = await import("../dist/press/index.js");
const scroll = await import("../dist/scroll/index.js");
const core = await import("../dist/core/index.js");
const { attachEffect, getFrameScheduler } = core;
const { act } = await import("react");

function stage() {
  const parent = document.createElement("div");
  const element = document.createElement("div");
  parent.append(element);
  document.body.append(parent);
  box(parent, { width: 600, height: 400 });
  box(element, { width: 100, height: 100, parent });
  return { parent, element };
}
const clean = (element) => {
  settle();
  assert.equal(element.getAttribute("style") ?? "", "", "style restored");
  assert.equal(getFrameScheduler().size, 0, "no task");
  assert.deepEqual(g.getGestureDebugInfo(), { sessions: 0, claims: 0 });
};

let renders = 0;
function Fruits() {
  const [items, setItems] = useState(["Apple", "Banana", "Cherry"]);
  return h(
    Profiler,
    { id: "r", onRender: () => renders++ },
    h(
      g.Reorder,
      {
        onReorder: (from, to) =>
          setItems((current) => {
            const next = [...current];
            const [moved] = next.splice(from, 1);
            next.splice(to, 0, moved);
            return next;
          }),
      },
      items.map((item, index) =>
        h(g.ReorderItem, { key: item, label: item, index }, h(g.ReorderHandle), item),
      ),
    ),
  );
}

function Zoom() {
  return h(g.PinchZoom, { step: 2 }, h("img", { alt: "Map" }));
}

test("drag + Tilt3D: translate (drag) and rotation (tilt) compose; each clears independently", () => {
  const { element } = stage();
  const drag = attachEffect(element, g.drag, { inertia: false });
  const tilt = attachEffect(element, hover.tilt3D, {});
  dragPath(element, { from: [0, 0], to: [50, 0], steps: 3, release: false });
  element.dispatchEvent(
    new window.PointerEvent("pointerenter", { clientX: 90, clientY: 10, pointerType: "mouse" }),
  );
  ptr(window, "pointermove", { x: 95, y: 5 });
  run(6);
  assert.ok(translation(element)[0] !== 0, "drag layer");
  assert.match(element.style.transform, /rotate[XY]/, "tilt layer");
  ptr(window, "pointerup", { x: 50, y: 0 });
  tilt.destroy();
  settle();
  assert.doesNotMatch(element.style.transform, /rotate/);
  assert.ok(translation(element)[0] !== 0, "drag kept");
  drag.destroy();
  clean(element);
});

test("drag + hover lift + press scale: translations add, scale multiplies", () => {
  const { element } = stage();
  const drag = attachEffect(element, g.drag, { inertia: false });
  const lift = attachEffect(element, hover.lift, { distance: 6 });
  const scale = attachEffect(element, press.pressScale, { scale: 0.9 });
  element.dispatchEvent(
    new window.PointerEvent("pointerenter", { clientX: 50, clientY: 50, pointerType: "mouse" }),
  );
  ptr(window, "pointermove", { x: 50, y: 50 });
  // Stay inside the hover box (measured on enter) so the lift stays active.
  dragPath(element, { from: [50, 50], to: [50, 90], steps: 4, release: false });
  settle();
  const [, ty] = translation(element);
  ptr(window, "pointerup", { x: 50, y: 90 });
  assert.ok(Math.abs(ty - (40 - 6)) < 1, `drag 40 + lift -6 = ${ty}`);
  assert.ok(Math.abs(scaleOf(element)[0] - 0.9) < 0.01);
  for (const handle of [drag, lift, scale]) handle.destroy();
  clean(element);
});

test("drag + parallax (scrub transform): scroll and drag layers add", () => {
  const { element } = stage();
  const drag = attachEffect(element, g.drag, { inertia: false });
  const scrub = attachEffect(element, scroll.scrubTransform, {
    from: { translateY: 0 },
    to: { translateY: 80 },
  });
  dragPath(element, { from: [0, 0], to: [40, 0], steps: 2 });
  settle();
  assert.ok(translation(element)[0] >= 39);
  drag.destroy();
  scrub.destroy();
  clean(element);
});

test("pinch + rotate: shared pointers; scale × and rotateZ in one transform", () => {
  const { element } = stage();
  box(element, { width: 600, height: 400, parent: element.parentElement });
  const pinch = attachEffect(element, g.pinchZoom, { maxScale: 4 });
  const rotate = attachEffect(element, g.rotateGesture, {});
  ptr(element, "pointerdown", { id: 1, x: 250, y: 200, pointerType: "touch" });
  ptr(element, "pointerdown", { id: 2, x: 350, y: 200, pointerType: "touch" });
  ptr(window, "pointermove", { id: 2, x: 300, y: 300, pointerType: "touch" });
  run(1);
  assert.ok(scaleOf(element)[0] > 1, "pinch scale");
  assert.ok(Math.abs(rotationOf(element)) > 30, "rotation");
  ptr(window, "pointerup", { id: 2, x: 300, y: 300, pointerType: "touch" });
  ptr(window, "pointerup", { id: 1, x: 250, y: 200, pointerType: "touch" });
  pinch.destroy();
  rotate.destroy();
  settle();
  clean(element);
});

test("FLIP + hover + press: FLIP translate composes; pressing mid-FLIP does not restart it", () => {
  const { element } = stage();
  const group = layout.createLayoutGroup();
  const flip = attachEffect(element, layout.flipMove, { group });
  const lift = attachEffect(element, hover.lift, { distance: 4 });
  const scale = attachEffect(element, press.pressScale, {});
  element.dispatchEvent(
    new window.PointerEvent("pointerenter", { clientX: 10, clientY: 10, pointerType: "mouse" }),
  );
  ptr(window, "pointermove", { x: 10, y: 10 });
  settle();
  group.snapshot();
  box(element, { y: 200, width: 100, height: 100, parent: element.parentElement });
  group.play();
  run(1);
  const [, flipY] = translation(element);
  assert.ok(flipY < -180, `flip (+ lift): ${flipY}`);
  ptr(element, "pointerdown", { x: 10, y: 10 });
  run(1);
  assert.ok(translation(element)[1] > flipY, "keeps moving home, not restarted");
  ptr(window, "pointerup", { x: 10, y: 10 });
  for (const handle of [flip, lift, scale]) handle.destroy();
  group.destroy();
  clean(element);
});

test("reorder + FLIP: siblings shift during the drag; after the consumer's update everything settles", () => {
  const list = document.createElement("ul");
  document.body.append(list);
  box(list, { width: 200, height: 150 });
  const items = [0, 1, 2].map((i) => {
    const li = document.createElement("li");
    li.setAttribute("data-neshel-reorder-item", "");
    list.append(li);
    box(li, { y: i * 50, width: 200, height: 40, parent: list });
    return li;
  });
  const handle = attachEffect(list, g.reorder, {
    onReorder(from, to) {
      const order = [...list.children];
      const [moved] = order.splice(from, 1);
      order.splice(to, 0, moved);
      order.forEach((li, i) => {
        list.append(li);
        box(li, { y: i * 50, width: 200, height: 40, parent: list });
      });
    },
    announce: () => {},
  });
  dragPath(items[2], { from: [10, 120], to: [10, 10], steps: 6 });
  settle();
  assert.equal(list.firstElementChild, items[2]);
  for (const li of items) assert.deepEqual(translation(li), [0, 0]);
  handle.destroy();
  settle();
  for (const li of items) assert.equal(li.getAttribute("style") ?? "", "");
});

test("gestures + consumer touch-action and transform: composed while attached, restored exactly", () => {
  const { element } = stage();
  element.style.cssText = "touch-action: pan-y; transform: scale(1.1)";
  const drag = attachEffect(element, g.drag, { axis: "x", inertia: false });
  dragPath(element, { from: [0, 0], to: [30, 0], steps: 3 });
  settle();
  assert.equal(element.style.getPropertyValue("touch-action"), "pan-y pinch-zoom");
  assert.match(element.style.transform, /^scale\(1\.1\) translate3d\(30px/);
  drag.destroy();
  settle();
  assert.equal(element.style.getPropertyValue("touch-action"), "pan-y");
  assert.equal(element.style.transform, "scale(1.1)");
});

test("SSR: gesture components render plain markup with accessible controls", () => {
  assert.equal(typeof g.Gesture, "function");
  const swipe = markup(h(g.SwipeDismiss, { onDismiss: () => {} }, "Note"));
  assert.match(
    swipe,
    /^<div class="neshel-swipe">Note<button type="button" class="neshel-gesture-button neshel-swipe-dismiss" aria-label="Dismiss">/,
  );
  const pull = markup(h(g.PullToRefresh, { onRefresh: () => {} }, "Feed"));
  assert.match(
    pull,
    /<button type="button" class="neshel-gesture-button neshel-pull-button">Refresh<\/button>/,
  );
  assert.match(pull, /role="status" aria-live="polite"/);
  const zoom = markup(h(g.PinchZoom, {}, h("img", { alt: "Map", src: "m.png" })));
  assert.match(zoom, /role="group" aria-label="Zoomable media" tabindex="0"/);
  assert.match(zoom, /<img alt="Map" src="m.png" class="neshel-zoom-media"\/>/);
  assert.match(zoom, />Zoom in<\/button>/);
  const list = markup(
    h(g.Reorder, { onReorder: () => {} }, [
      h(g.ReorderItem, { key: "a", label: "Apple", index: 0 }, h(g.ReorderHandle), "Apple"),
    ]),
  );
  assert.match(
    list,
    /<ul class="neshel-reorder" data-axis="y"><li class="neshel-reorder-item" data-neshel-reorder-item="" data-neshel-reorder-label="Apple">/,
  );
  assert.match(list, /aria-label="Reorder Apple"/);
  assert.match(list, /style="touch-action:none"/);
  assert.equal(
    markup(h(press.LongPress, { asChild: true, onLongPress: () => {} }, h("button", null, "Hold"))),
    '<button class="neshel-press">Hold</button>',
  );
  assert.equal(
    markup(h(hover.CursorFollower, null, "Area")),
    '<div class="neshel-hover">Area</div>',
  );
});

test("React <Reorder>: keyboard reorder through consumer state keeps focus; announcements without renders per frame", async () => {
  const view = await mount(h(Fruits));
  const handle = view.container.querySelector('[aria-label="Reorder Apple"]');
  handle.focus();
  await act(async () => {
    handle.dispatchEvent(new window.KeyboardEvent("keydown", { key: " ", bubbles: true }));
  });
  await act(async () => {
    handle.dispatchEvent(new window.KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
  });
  await act(async () => run(2));
  assert.deepEqual(
    [...view.container.querySelectorAll("li")].map((li) =>
      li.getAttribute("data-neshel-reorder-label"),
    ),
    ["Banana", "Apple", "Cherry"],
  );
  assert.equal(document.activeElement, handle, "focus kept on the moved handle");
  const live = view.container.querySelector('[role="status"]');
  assert.match(live.textContent, /Moved Apple to position 2 of 3/);
  const before = renders;
  await act(async () => settle());
  assert.equal(renders, before, "no render while items settle");
  await view.unmount();
  settle();
});

test("React <PinchZoom>: zoom buttons work and announce the level; StrictMode-safe attach", async () => {
  const view = await mount(h(Zoom));
  const img = view.container.querySelector("img");
  box(img.parentElement, { width: 200, height: 200 });
  box(img, { width: 200, height: 200, parent: img.parentElement });
  const zoomIn = [...view.container.querySelectorAll("button")].find(
    (b) => b.textContent === "Zoom in",
  );
  await act(async () => zoomIn.click());
  await act(async () => settle());
  assert.ok(Math.abs(scaleOf(img)[0] - 2) < 0.01);
  assert.match(view.container.querySelector('[role="status"]').textContent, /200%/);
  await view.unmount();
  settle();
  clock.advance(0);
});
