// Tilt3D contract (contracts/tilt-3d.md; FR-050–FR-068). SSR first (no DOM), then jsdom.
import assert from "node:assert/strict";
import test from "node:test";
import { useRef } from "react";
import {
  frames,
  h,
  layoutBox,
  markup,
  mount,
  pointer,
  renderToString,
  setupDom,
  trackListeners,
} from "./helpers.mjs";

const animations = await import("../dist/index.js");
const { Tilt3D, createTilt3D, useTilt3D, NeshelAnimationsError } = animations;

/** A consumer component that renders its own element and attaches the hook. */
function HookedCard() {
  const ref = useRef(null);
  useTilt3D(ref, { maxTilt: 6 });
  return h("article", { ref }, "Card");
}

const rotation = (element, axis) => {
  const match = new RegExp(`rotate${axis}\\((-?[\\d.]+)deg\\)`).exec(element.style.transform);
  return match ? Number(match[1]) : 0;
};

test("root runtime exports are exactly the implemented API (FR-010)", () => {
  assert.deepEqual(Object.keys(animations).sort(), [
    "NeshelAnimationsError",
    "Tilt3D",
    "createTilt3D",
    "useTilt3D",
  ]);
});

test("SSR: one div with the neshel-tilt class, no inline style, no state attribute (FR-060)", () => {
  assert.equal(typeof globalThis.window, "undefined", "runs without a DOM");
  assert.equal(
    markup(h(Tilt3D, { id: "card", className: "card", "aria-label": "Plan" }, "Pro")),
    '<div id="card" aria-label="Plan" class="neshel-tilt card">Pro</div>',
  );
});

test("SSR: asChild renders the child element with merged classes (FR-061)", () => {
  assert.equal(
    markup(h(Tilt3D, { asChild: true }, h("a", { href: "/pro", className: "link" }, "Pro"))),
    '<a href="/pro" class="neshel-tilt link">Pro</a>',
  );
});

test("invalid usage throws NeshelAnimationsError on the server (FR-062)", () => {
  const cases = [
    [{ maxTilt: 90 }, /"maxTilt"/],
    [{ perspective: 10 }, /"perspective"/],
    [{ scale: "big" }, /"scale"/],
    [{ axis: "z" }, /"axis"/],
    [{ pointerTypes: ["finger"] }, /"pointerTypes"/],
    [{ reducedMotion: "sometimes" }, /"reducedMotion"/],
    [{ spring: { stiffness: -1 } }, /stiffness/],
    [{ asChild: true, children: ["a", "b"] }, /asChild/],
    [{ asChild: true, children: "text" }, /asChild/],
  ];
  for (const [props, message] of cases) {
    assert.throws(
      () => markup(h(Tilt3D, props)),
      (error) => error instanceof NeshelAnimationsError && message.test(error.message),
      JSON.stringify(props),
    );
  }
});

test("hydration produces no mismatch and starts the effect after mount (FR-063)", async () => {
  const html = renderToString(h(Tilt3D, { id: "hydrated" }, "Card"));
  await setupDom();
  const { act } = await import("react");
  const { hydrateRoot } = await import("react-dom/client");
  const container = document.createElement("div");
  container.innerHTML = html;
  document.body.appendChild(container);
  const errors = [];
  let root;
  await act(async () => {
    root = hydrateRoot(container, h(Tilt3D, { id: "hydrated" }, "Card"), {
      onRecoverableError: (error) => errors.push(error),
    });
  });
  assert.deepEqual(errors, []);
  assert.equal(container.firstChild.getAttribute("data-neshel-tilt"), "rest");
  await act(async () => root.unmount());
  container.remove();
});

test("pointer movement tilts toward the documented signs and springs back on leave (FR-050–FR-052)", async () => {
  await setupDom();
  const { container, unmount } = await mount(h(Tilt3D, { maxTilt: 10 }, "Card"));
  const element = container.firstChild;
  layoutBox(element, { left: 0, top: 0, width: 200, height: 100 });
  // Top-right corner: the region under the pointer recedes (rotateX > 0, rotateY > 0).
  pointer(element, "pointerenter", { x: 200, y: 0 });
  assert.equal(element.getAttribute("data-neshel-tilt"), "pointer");
  frames.flush(60);
  assert.ok(Math.abs(rotation(element, "X") - 10) < 0.5, element.style.transform);
  assert.ok(Math.abs(rotation(element, "Y") - 10) < 0.5, element.style.transform);
  assert.match(element.style.transform, /^perspective\(1000px\)/);
  pointer(element, "pointerleave", { x: 300, y: 0 });
  assert.equal(element.getAttribute("data-neshel-tilt"), "rest");
  const used = frames.settle();
  assert.ok(used > 5 && used < 300, `returned in ${used} frames (animated, not snapped)`);
  assert.equal(element.style.transform, "", "inline transform removed at rest");
  assert.equal(element.style.willChange, "");
  assert.equal(frames.pending, 0, "no frame requested while idle");
  await unmount();
});

test("reverse, axis and scale options (FR-053)", async () => {
  await setupDom();
  const { container, unmount, render } = await mount(
    h(Tilt3D, { maxTilt: 8, reverse: true, axis: "y", scale: 1.05 }, "Card"),
  );
  const element = container.firstChild;
  layoutBox(element);
  pointer(element, "pointerenter", { x: 200, y: 0 });
  frames.flush(80);
  assert.equal(rotation(element, "X"), 0, "axis y: no rotateX");
  assert.ok(Math.abs(rotation(element, "Y") + 8) < 0.5, element.style.transform);
  assert.match(element.style.transform, /scale\(1\.05\)/);
  await render(h(Tilt3D, { maxTilt: 4, reverse: true, axis: "y", scale: 1.05 }, "Card"));
  frames.flush(80);
  assert.ok(Math.abs(rotation(element, "Y") + 4) < 0.3, "option change applies without re-hover");
  await unmount();
});

test("pointer moves never re-render React (FR-054)", async () => {
  await setupDom();
  const { Profiler } = await import("react");
  let commits = 0;
  const { container, unmount } = await mount(
    h(Profiler, { id: "tilt", onRender: () => commits++ }, h(Tilt3D, null, "Card")),
  );
  const element = container.firstChild;
  layoutBox(element);
  const before = commits;
  pointer(element, "pointerenter", { x: 10, y: 10 });
  for (let index = 0; index < 50; index++) {
    pointer(element, "pointermove", { x: index * 4, y: index * 2 });
    frames.flush();
  }
  pointer(element, "pointerleave", { x: 400, y: 400 });
  frames.settle();
  assert.equal(commits, before, "zero React commits during interaction");
  await unmount();
});

test("touch is ignored by default and opt-in through pointerTypes (FR-055)", async () => {
  await setupDom();
  const first = await mount(h(Tilt3D, null, "Card"));
  const element = first.container.firstChild;
  layoutBox(element);
  pointer(element, "pointerenter", { x: 200, y: 0, pointerType: "touch" });
  frames.flush(10);
  assert.equal(element.style.transform, "");
  await first.unmount();

  const second = await mount(h(Tilt3D, { pointerTypes: ["touch"] }, "Card"));
  const touchable = second.container.firstChild;
  layoutBox(touchable);
  pointer(touchable, "pointerenter", { x: 200, y: 0, pointerType: "touch" });
  frames.flush(10);
  assert.notEqual(touchable.style.transform, "");
  await second.unmount();
  frames.settle();
});

test("keyboard focus shows the gentle focus pose; blur returns to rest (FR-056)", async () => {
  await setupDom();
  const { container, unmount } = await mount(
    h(Tilt3D, { maxTilt: 10 }, h("button", { type: "button" }, "Choose plan")),
  );
  const element = container.firstChild;
  const button = element.querySelector("button");
  button.focus();
  assert.equal(element.getAttribute("data-neshel-tilt"), "focus");
  frames.flush(80);
  assert.ok(Math.abs(rotation(element, "X") - 3.5) < 0.3, element.style.transform);
  assert.ok(Math.abs(rotation(element, "Y") + 3.5) < 0.3, element.style.transform);
  button.blur();
  assert.equal(element.getAttribute("data-neshel-tilt"), "rest");
  frames.settle();
  assert.equal(element.style.transform, "");
  await unmount();

  const off = await mount(
    h(Tilt3D, { focusTilt: false }, h("button", { type: "button" }, "Choose plan")),
  );
  off.container.querySelector("button").focus();
  frames.flush(10);
  assert.equal(off.container.firstChild.style.transform, "");
  await off.unmount();
});

test("reduced motion: no transform; a runtime preference change snaps to rest (FR-057)", async () => {
  const { media } = await setupDom();
  media.set(true);
  const first = await mount(h(Tilt3D, null, "Card"));
  const element = first.container.firstChild;
  layoutBox(element);
  assert.equal(element.getAttribute("data-neshel-tilt"), "reduced");
  pointer(element, "pointerenter", { x: 200, y: 0 });
  frames.flush(20);
  assert.equal(element.style.transform, "");
  assert.equal(frames.pending, 0);
  await first.unmount();

  media.set(false);
  const second = await mount(h(Tilt3D, null, "Card"));
  const live = second.container.firstChild;
  layoutBox(live);
  pointer(live, "pointerenter", { x: 200, y: 0 });
  frames.flush(20);
  assert.notEqual(live.style.transform, "");
  media.set(true);
  assert.equal(live.getAttribute("data-neshel-tilt"), "reduced");
  frames.flush();
  assert.equal(live.style.transform, "", "snapped without animation");
  assert.equal(frames.pending, 0);
  media.set(false);
  await second.unmount();

  const never = await mount(h(Tilt3D, { reducedMotion: "never" }, "Card"));
  media.set(true);
  const forced = never.container.firstChild;
  layoutBox(forced);
  pointer(forced, "pointerenter", { x: 200, y: 0 });
  frames.flush(5);
  assert.notEqual(forced.style.transform, "", '"never" ignores the preference');
  media.set(false);
  await never.unmount();
  frames.settle();

  const always = await mount(h(Tilt3D, { reducedMotion: "always" }, "Card"));
  assert.equal(always.container.firstChild.getAttribute("data-neshel-tilt"), "reduced");
  await always.unmount();
});

test("disabled returns to rest and ignores the pointer (FR-058)", async () => {
  await setupDom();
  const { container, render, unmount } = await mount(h(Tilt3D, null, "Card"));
  const element = container.firstChild;
  layoutBox(element);
  pointer(element, "pointerenter", { x: 200, y: 0 });
  frames.flush(10);
  await render(h(Tilt3D, { disabled: true }, "Card"));
  assert.equal(element.getAttribute("data-neshel-tilt"), "disabled");
  frames.flush();
  assert.equal(element.style.transform, "");
  pointer(element, "pointermove", { x: 0, y: 0 });
  frames.flush(5);
  assert.equal(element.style.transform, "");
  await unmount();
});

test("unmount removes every listener, cancels frames and restores styles (FR-059)", async () => {
  const { media } = await setupDom();
  const element = document.createElement("div");
  document.body.appendChild(element);
  layoutBox(element);
  const own = trackListeners(element);
  const win = trackListeners(window);
  const doc = trackListeners(document.documentElement);
  const controller = createTilt3D(element);
  assert.equal(media.listenerCount, 1, "subscribed to prefers-reduced-motion");
  assert.deepEqual(win.active, [], "no window listener before hover");
  pointer(element, "pointerenter", { x: 200, y: 0 });
  assert.deepEqual(
    win.active,
    ["pointermove", "resize", "scroll"],
    "window listeners only while hovered",
  );
  assert.deepEqual(doc.active, ["pointerleave"]);
  frames.flush(3);
  assert.notEqual(element.style.transform, "");
  controller.destroy();
  controller.destroy();
  frames.flush();
  assert.deepEqual(own.active, []);
  assert.deepEqual(win.active, []);
  assert.deepEqual(doc.active, []);
  assert.equal(media.listenerCount, 0);
  assert.equal(element.style.transform, "");
  assert.equal(element.hasAttribute("data-neshel-tilt"), false);
  assert.equal(frames.pending, 0);
  own.restore();
  win.restore();
  doc.restore();
  element.remove();
});

test("useTilt3D works on an element rendered by the consumer, with a callback ref merge (FR-064)", async () => {
  await setupDom();
  let seen;
  const hooked = await mount(h(HookedCard));
  const article = hooked.container.firstChild;
  assert.equal(article.getAttribute("data-neshel-tilt"), "rest");
  await hooked.unmount();
  assert.equal(article.hasAttribute("data-neshel-tilt"), false);

  const refs = await mount(
    h(Tilt3D, {
      ref: (node) => {
        seen = node;
      },
    }),
  );
  assert.equal(seen, refs.container.firstChild, "consumer ref receives the element");
  await refs.unmount();
  assert.equal(seen, null);
});

test("Tilt3D composes with another JavaScript layer on the same element (FR-033)", async () => {
  await setupDom();
  const { getTransformComposer } = await import("../dist/core/index.js");
  const { container, unmount } = await mount(h(Tilt3D, { maxTilt: 10 }, "Card"));
  const element = container.firstChild;
  layoutBox(element);
  const lift = Symbol("lift");
  getTransformComposer(element).set(lift, { translateY: -6 });
  pointer(element, "pointerenter", { x: 200, y: 50 });
  frames.flush(60);
  assert.match(element.style.transform, /translate3d\(0px, -6px, 0px\) rotateY\(/);
  pointer(element, "pointerleave", { x: 400, y: 400 });
  frames.settle();
  assert.equal(element.style.transform, "translate3d(0px, -6px, 0px)", "other layer survives");
  getTransformComposer(element).delete(lift);
  frames.flush();
  await unmount();
});

test("hit area is the untransformed box: a leave inside it is ignored, leaving the box ends the tilt (FR-065)", async () => {
  await setupDom();
  const element = document.createElement("div");
  document.body.appendChild(element);
  layoutBox(element, { left: 0, top: 0, width: 200, height: 100 });
  const controller = createTilt3D(element);
  pointer(element, "pointerenter", { x: 198, y: 2 });
  frames.flush(30);
  // The receding corner moved away from the pointer: the browser reports a leave at (198, 2).
  pointer(element, "pointerleave", { x: 198, y: 2 });
  assert.equal(controller.state, "pointer", "still tilting while inside the layout box");
  // Movement continues on window (the projected shape is no longer under the pointer).
  window.dispatchEvent(
    new window.PointerEvent("pointermove", { clientX: 150, clientY: 50, pointerType: "mouse" }),
  );
  frames.flush(60);
  assert.ok(rotation(element, "Y") > 4, element.style.transform);
  window.dispatchEvent(
    new window.PointerEvent("pointermove", { clientX: 260, clientY: 50, pointerType: "mouse" }),
  );
  assert.equal(controller.state, "rest", "leaving the layout box ends the tilt");
  frames.settle();
  assert.equal(element.style.transform, "");
  controller.destroy();
  element.remove();
});
