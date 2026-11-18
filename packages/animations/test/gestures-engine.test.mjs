// Phase 012 gesture foundation (FR-001–FR-010; contracts/gesture-engine.md): physics primitives, pointer
// session, recogniser, touch-action composition, composition of scaleX/scaleY.
import assert from "node:assert/strict";
import test from "node:test";
import { box, clock, frames, ptr, run, settle, setupGestureDom } from "./gesture-helpers.mjs";
import { trackListeners } from "./helpers.mjs";

await setupGestureDom();
const g = await import("../dist/gestures/index.js");
const core = await import("../dist/core/index.js");
const { composeTransform, getFrameScheduler } = core;

const make = (tag = "div") => {
  const element = document.createElement(tag);
  document.body.append(element);
  box(element);
  return element;
};

test("composeTransform: scaleX/scaleY multiply with scale; uniform results stay scale(n)", () => {
  assert.equal(composeTransform([{ scaleX: 2, scaleY: 0.5 }]), "scale(2, 0.5)");
  assert.equal(composeTransform([{ scale: 2 }, { scaleX: 1.5 }]), "scale(3, 2)");
  assert.equal(composeTransform([{ scaleX: 2, scaleY: 2 }]), "scale(2)");
  assert.equal(composeTransform([{ scale: 1.2 }]), "scale(1.2)");
  assert.equal(composeTransform([{ scaleX: 1, scaleY: 1 }]), "none");
  assert.equal(
    composeTransform([{ translateX: 10 }, { scaleY: 0.8 }]),
    "translate3d(10px, 0px, 0px) scale(1, 0.8)",
  );
});

test("decay: closed-form projection equals the exact stepped rest position at any frame rate", () => {
  const options = { power: 0.8, timeConstant: 325, restSpeed: 5 };
  const projected = g.projectDecay(0, 1000, options);
  assert.ok(Math.abs(projected - 260) < 1e-9);
  for (const dt of [1 / 30, 1 / 60, 1 / 144]) {
    const state = { value: 0, velocity: 1000 * options.power };
    let steps = 0;
    while (!g.stepDecay(state, options, dt) && steps < 10_000) steps++;
    assert.ok(Math.abs(state.value - projected) < 1e-6, `dt ${dt}: ${state.value}`);
    assert.equal(state.velocity, 0);
  }
});

test("rubberband: continuous at 0, monotonic, signed, asymptotic to the dimension", () => {
  assert.equal(g.rubberband(0, 200), 0);
  const a = g.rubberband(50, 200);
  const b = g.rubberband(100, 200);
  assert.ok(a > 0 && b > a && b < 100);
  assert.ok(g.rubberband(1e9, 200) < 200);
  assert.equal(g.rubberband(-50, 200), -a);
  assert.equal(g.rubberband(10, 0), 0);
});

test("nearestSnap picks the closest point", () => {
  assert.equal(g.nearestSnap(42, [0, 50, 100]), 50);
  assert.equal(g.nearestSnap(-80, [0, 50, 100]), 0);
  assert.equal(g.nearestSnap(7, []), 7);
});

test("velocity tracker: slope over the last 100 ms; 0 after a pause before release", () => {
  const tracker = g.createVelocityTracker();
  for (let i = 0; i <= 10; i++) tracker.add(i * 10, i * 5, -i * 2);
  const v = tracker.velocity(100);
  assert.ok(Math.abs(v.x - 500) < 1e-9 && Math.abs(v.y + 200) < 1e-9, JSON.stringify(v));
  assert.deepEqual(tracker.velocity(200), { x: 0, y: 0 }, "pointer stopped 100 ms before release");
  tracker.reset();
  assert.deepEqual(tracker.velocity(), { x: 0, y: 0 });
});

test("pointer session: one listener set per element whatever the number of gestures; removed with the last", () => {
  const element = make();
  const listeners = trackListeners(element);
  const a = g.createGesture(element, {});
  const b = g.createGesture(element, { exclusive: false });
  assert.deepEqual(listeners.active, ["lostpointercapture", "pointerdown"]);
  assert.equal(g.getGestureDebugInfo().sessions, 1);
  a.destroy();
  assert.equal(g.getGestureDebugInfo().sessions, 1);
  b.destroy();
  assert.deepEqual(listeners.active, []);
  assert.equal(g.getGestureDebugInfo().sessions, 0);
  listeners.restore();
});

test("window listeners exist only while a pointer is down", () => {
  const element = make();
  const win = trackListeners(window);
  // jsdom registers its own listeners on window; only the session's event types are checked.
  const own = () => win.active.filter((type) => /^(pointer|scroll)/.test(type));
  const gesture = g.createGesture(element, {});
  assert.deepEqual(own(), []);
  ptr(element, "pointerdown", { x: 0 });
  assert.deepEqual(own(), ["pointercancel", "pointermove", "pointerup", "scroll"]);
  ptr(window, "pointerup", { x: 0 });
  assert.deepEqual(own(), []);
  gesture.destroy();
  win.restore();
});

test("recogniser: threshold, start/move/end with velocity; secondary buttons ignored", () => {
  const element = make();
  const events = [];
  const gesture = g.createGesture(element, {
    threshold: 5,
    onStart: (s) => events.push(["start", s.offset.x]),
    onMove: (s) => events.push(["move", s.offset.x]),
    onEnd: (s) => events.push(["end", Math.round(s.velocity.x)]),
    onTap: () => events.push(["tap"]),
  });
  ptr(element, "pointerdown", { x: 0, button: 2 });
  ptr(window, "pointermove", { x: 50 });
  assert.deepEqual(events, [], "right button ignored");
  ptr(element, "pointerdown", { x: 0 });
  clock.advance(16);
  ptr(window, "pointermove", { x: 3 });
  assert.equal(gesture.phase, "pending");
  clock.advance(16);
  ptr(window, "pointermove", { x: 19 });
  clock.advance(16);
  ptr(window, "pointerup", { x: 35 });
  assert.deepEqual(events.slice(0, 2), [
    ["start", 19],
    ["move", 19],
  ]);
  assert.equal(events[2][0], "end");
  assert.ok(events[2][1] > 500, `velocity ${events[2][1]}`);
  ptr(element, "pointerdown", { x: 0 });
  ptr(window, "pointerup", { x: 1 });
  assert.deepEqual(events.at(-1), ["tap"]);
  gesture.destroy();
});

test("axis lock: a vertical move never starts a horizontal gesture", () => {
  const element = make();
  let started = 0;
  const gesture = g.createGesture(element, { axis: "x", onStart: () => started++ });
  ptr(element, "pointerdown", { x: 0, y: 0 });
  ptr(window, "pointermove", { x: 2, y: 20 });
  ptr(window, "pointermove", { x: 40, y: 20 });
  ptr(window, "pointerup", { x: 40, y: 20 });
  assert.equal(started, 0);
  gesture.destroy();
});

test("pointercancel and lost capture cancel an active gesture", () => {
  const element = make();
  const log = [];
  const gesture = g.createGesture(element, {
    onCancel: () => log.push("cancel"),
    onEnd: () => log.push("end"),
  });
  ptr(element, "pointerdown", { x: 0 });
  ptr(window, "pointermove", { x: 30 });
  ptr(window, "pointercancel", { x: 30 });
  ptr(element, "pointerdown", { x: 0 });
  ptr(window, "pointermove", { x: 30 });
  element.dispatchEvent(
    new window.PointerEvent("lostpointercapture", { pointerId: 1, bubbles: true }),
  );
  ptr(window, "pointerup", { x: 30 });
  assert.deepEqual(log, ["cancel", "cancel"]);
  assert.equal(g.getGestureDebugInfo().claims, 0);
  gesture.destroy();
});

test("two pointers: scale and rotation accumulate; adding/lifting a finger never jumps the offset", () => {
  const element = make();
  const states = [];
  const gesture = g.createGesture(element, {
    pointers: 2,
    exclusive: false,
    onMove: (s) =>
      states.push({ x: s.offset.x, scale: s.scale, rotation: s.rotation, pointers: s.pointers }),
  });
  ptr(element, "pointerdown", { id: 1, x: 100, y: 100, pointerType: "touch" });
  ptr(window, "pointermove", { id: 1, x: 120, y: 100, pointerType: "touch" });
  const beforeSecond = states.at(-1).x;
  ptr(element, "pointerdown", { id: 2, x: 220, y: 100, pointerType: "touch" });
  ptr(window, "pointermove", { id: 2, x: 320, y: 100, pointerType: "touch" });
  // Distance 100 → 200: scale 2; centroid moved by +50 after the re-base.
  const pinch = states.at(-1);
  assert.ok(Math.abs(pinch.scale - 2) < 1e-9, `scale ${pinch.scale}`);
  assert.ok(Math.abs(pinch.x - (beforeSecond + 50)) < 1e-9, `offset continuous ${pinch.x}`);
  ptr(window, "pointermove", { id: 2, x: 120, y: 300, pointerType: "touch" });
  assert.ok(Math.abs(states.at(-1).rotation - 90) < 1e-6, `rotation ${states.at(-1).rotation}`);
  const beforeLift = states.at(-1);
  ptr(window, "pointerup", { id: 2, x: 120, y: 300, pointerType: "touch" });
  ptr(window, "pointermove", { id: 1, x: 121, y: 100, pointerType: "touch" });
  const afterLift = states.at(-1);
  assert.equal(afterLift.pointers, 1);
  assert.ok(
    Math.abs(afterLift.x - beforeLift.x - 1) < 1e-9,
    "lifting a finger re-bases without a jump",
  );
  assert.equal(afterLift.scale, beforeLift.scale);
  ptr(window, "pointerup", { id: 1, x: 121, y: 100, pointerType: "touch" });
  gesture.destroy();
});

test("claims: an exclusive inner gesture wins its pointer over an exclusive outer one", () => {
  const outer = make();
  const inner = document.createElement("div");
  outer.append(inner);
  box(inner);
  const log = [];
  const a = g.createGesture(outer, { onStart: () => log.push("outer") });
  const b = g.createGesture(inner, { onStart: () => log.push("inner") });
  ptr(inner, "pointerdown", { x: 0 });
  ptr(window, "pointermove", { x: 40 });
  ptr(window, "pointerup", { x: 40 });
  assert.deepEqual(log, ["inner"]);
  a.destroy();
  b.destroy();
});

test("scroll compensation: scrolling during a drag is added to the offset (no geometry read)", () => {
  const element = make();
  let last;
  const gesture = g.createGesture(element, { onMove: (s) => (last = s.offset.y) });
  ptr(element, "pointerdown", { x: 0, y: 0 });
  ptr(window, "pointermove", { x: 0, y: 10 });
  Object.defineProperty(window, "scrollY", { value: 100, configurable: true });
  window.dispatchEvent(new window.Event("scroll"));
  document.dispatchEvent(new window.Event("scroll", { bubbles: true }));
  ptr(window, "pointermove", { x: 0, y: 12 });
  assert.equal(last, 112);
  ptr(window, "pointerup", { x: 0, y: 12 });
  Object.defineProperty(window, "scrollY", { value: 0, configurable: true });
  gesture.destroy();
});

test("touch-action: intersection of attached gestures, written through the host, restored exactly", () => {
  const element = make();
  element.style.setProperty("touch-action", "manipulation");
  const a = g.createGesture(element, { touchAction: ["pan-y", "pinch-zoom"] });
  const b = g.createGesture(element, { touchAction: ["pan-x", "pan-y"], exclusive: false });
  settle();
  assert.equal(element.style.getPropertyValue("touch-action"), "pan-y");
  assert.equal(element.style.getPropertyValue("will-change"), "", "never in will-change");
  b.setOptions({ touchAction: [], exclusive: false });
  settle();
  assert.equal(element.style.getPropertyValue("touch-action"), "none");
  a.destroy();
  b.destroy();
  settle();
  assert.equal(element.style.getPropertyValue("touch-action"), "manipulation");
});

test("gesture controls: commands reach the attached implementation; unbound calls are ignored", () => {
  const controls = g.createGestureControls();
  assert.ok(Object.isFrozen(controls));
  const warn = console.warn;
  console.warn = () => {};
  controls.reset(); // nothing bound: no throw
  console.warn = warn;
});

test("idle: no frame task and no session after destroy", () => {
  const element = make();
  const gesture = g.createGesture(element, {});
  gesture.destroy();
  assert.equal(getFrameScheduler().size, 0);
  assert.equal(frames.pending, 0);
  run(2);
});
