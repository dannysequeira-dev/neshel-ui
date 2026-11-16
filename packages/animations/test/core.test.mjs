// Core engine contract (contracts/core-engine.md, contracts/composition.md; FR-020–FR-034).
import assert from "node:assert/strict";
import test from "node:test";
import { frames, setupDom } from "./helpers.mjs";

const core = await import("../dist/core/index.js");
const {
  composeTransform,
  createFrameScheduler,
  getTransformComposer,
  resolveSpring,
  shouldReduceMotion,
  stepSpring,
} = core;

test("core exports exactly the documented engine API (FR-020)", () => {
  assert.deepEqual(Object.keys(core).sort(), [
    "DEFAULT_SPRING",
    "composeTransform",
    "createFrameScheduler",
    "getFrameScheduler",
    "getTransformComposer",
    "prefersReducedMotion",
    "resolveSpring",
    "shouldReduceMotion",
    "stepSpring",
    "subscribeReducedMotion",
  ]);
});

test("importing core touches no DOM and scheduling on the server is a no-op (FR-024)", () => {
  // This file runs before setupDom(): no window, no requestAnimationFrame.
  assert.equal(typeof globalThis.requestAnimationFrame, "undefined");
  const scheduler = createFrameScheduler();
  const cancel = scheduler.schedule(() => true);
  assert.equal(typeof cancel, "function");
  cancel();
  assert.equal(scheduler.size, 0);
  assert.equal(core.prefersReducedMotion(), false);
});

test("spring converges to its target and rests exactly on it (FR-022)", () => {
  const options = resolveSpring();
  const state = { value: 0, velocity: 0 };
  let frameCount = 0;
  while (!stepSpring(state, 10, options, 1 / 60) && frameCount < 600) frameCount++;
  assert.ok(frameCount < 120, `rested after ${frameCount} frames`);
  assert.deepEqual(state, { value: 10, velocity: 0 });
});

test("critically damped spring never overshoots; integration is frame-rate independent", () => {
  const options = resolveSpring({ stiffness: 100, damping: 20, mass: 1 });
  const at = (fps) => {
    const state = { value: 0, velocity: 0 };
    let max = 0;
    for (let index = 0; index < fps / 2; index++) {
      stepSpring(state, 1, options, 1 / fps);
      max = Math.max(max, state.value);
    }
    return { value: state.value, max };
  };
  const slow = at(30);
  const fast = at(144);
  assert.ok(slow.max <= 1 + 1e-9 && fast.max <= 1 + 1e-9, "no overshoot");
  assert.ok(Math.abs(slow.value - fast.value) < 0.01, `${slow.value} vs ${fast.value}`);
});

test("resolveSpring rejects invalid values", () => {
  assert.throws(() => resolveSpring({ stiffness: 0 }), RangeError);
  assert.throws(() => resolveSpring({ mass: Number.NaN }), RangeError);
  assert.throws(() => resolveSpring({ damping: -1 }), RangeError);
  assert.equal(resolveSpring({ damping: 0 }).damping, 0);
});

test("composeTransform: identity, fixed order, additive and multiplicative rules (FR-030)", () => {
  assert.equal(composeTransform([]), "none");
  assert.equal(composeTransform([{ perspective: 800 }, { rotateX: 0, scale: 1 }]), "none");
  assert.equal(
    composeTransform([
      { scale: 1.5, rotateY: 5, perspective: 1000 },
      { translateY: -4, rotateY: 3, scale: 2, perspective: 600 },
    ]),
    "perspective(600px) translate3d(0px, -4px, 0px) rotateY(8deg) scale(3)",
  );
  const a = { rotateX: 4, translateX: 2 };
  const b = { rotateX: -1, translateZ: 10, rotateZ: 2 };
  assert.equal(composeTransform([a, b]), composeTransform([b, a]), "order-independent");
});

test("phases run read → update → write within one frame; later-phase tasks join the frame (FR-021)", async () => {
  await setupDom();
  const scheduler = createFrameScheduler();
  const log = [];
  scheduler.schedule(() => {
    log.push("write");
  }, "write");
  scheduler.schedule(() => {
    log.push("update");
    scheduler.schedule(() => {
      log.push("write-from-update");
    }, "write");
    scheduler.schedule(() => {
      log.push("read-next-frame");
    }, "read");
  }, "update");
  scheduler.schedule(() => {
    log.push("read");
  }, "read");
  assert.equal(frames.pending, 1, "one animation frame for all tasks");
  frames.flush();
  assert.deepEqual(log, ["read", "update", "write", "write-from-update"]);
  frames.flush();
  assert.deepEqual(log.at(-1), "read-next-frame");
  assert.equal(frames.pending, 0, "idle scheduler requests no frame");
});

test("tasks repeat while they return true; cancel is idempotent and stops the loop (FR-023)", async () => {
  await setupDom();
  const scheduler = createFrameScheduler();
  let runs = 0;
  const cancel = scheduler.schedule(() => {
    runs++;
    return true;
  });
  frames.flush(3);
  assert.equal(runs, 3);
  cancel();
  cancel();
  assert.equal(scheduler.size, 0);
  assert.equal(frames.pending, 0, "cancelling the last task cancels the requested frame");
  frames.flush(2);
  assert.equal(runs, 3);
});

test("a throwing task is reported and does not stop other tasks", async () => {
  await setupDom();
  const scheduler = createFrameScheduler();
  const reported = [];
  const original = globalThis.reportError;
  globalThis.reportError = (error) => reported.push(error.message);
  let ran = false;
  scheduler.schedule(() => {
    throw new Error("boom");
  });
  scheduler.schedule(() => {
    ran = true;
  });
  frames.flush();
  globalThis.reportError = original;
  assert.deepEqual(reported, ["boom"]);
  assert.equal(ran, true);
});

test("frame delta is clamped so a background tab does not jump", async () => {
  await setupDom();
  const scheduler = createFrameScheduler();
  const deltas = [];
  scheduler.schedule((frame) => {
    deltas.push(frame.delta);
    return deltas.length < 3;
  });
  frames.flush(1, 16);
  frames.flush(1, 16);
  frames.flush(1, 5000);
  assert.equal(deltas[0], 0);
  assert.ok(Math.abs(deltas[1] - 0.016) < 1e-9);
  assert.ok(Math.abs(deltas[2] - 1 / 15) < 1e-9);
});

test("composer: one write per frame, layers compose, removal restores the element (FR-031–FR-033)", async () => {
  await setupDom();
  const element = document.createElement("div");
  const scheduler = createFrameScheduler();
  const composer = getTransformComposer(element, scheduler);
  assert.equal(getTransformComposer(element, scheduler), composer, "one composer per element");
  const tilt = Symbol("tilt");
  const lift = Symbol("lift");
  composer.set(tilt, { perspective: 1000, rotateX: 5 });
  composer.set(lift, { translateY: -8 });
  assert.equal(element.style.transform, "", "nothing written before the write phase");
  frames.flush();
  assert.equal(
    element.style.transform,
    "perspective(1000px) translate3d(0px, -8px, 0px) rotateX(5deg)",
  );
  assert.equal(element.style.willChange, "transform");
  composer.delete(tilt);
  frames.flush();
  assert.equal(element.style.transform, "translate3d(0px, -8px, 0px)");
  composer.delete(lift);
  frames.flush();
  assert.equal(element.style.transform, "");
  assert.equal(element.style.willChange, "");
  assert.equal(frames.pending, 0);
});

test("composer warns once when it replaces an inline transform it does not own", async () => {
  await setupDom();
  const element = document.createElement("div");
  element.style.transform = "translateX(3px)";
  const warnings = [];
  const original = console.warn;
  console.warn = (message) => warnings.push(message);
  const composer = getTransformComposer(element, createFrameScheduler());
  composer.set(Symbol("a"), { rotateZ: 1 });
  frames.flush();
  console.warn = original;
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /inline `transform`/);
});

test("reduced-motion policy (FR-040)", () => {
  assert.equal(shouldReduceMotion("user", true), true);
  assert.equal(shouldReduceMotion("user", false), false);
  assert.equal(shouldReduceMotion("always", false), true);
  assert.equal(shouldReduceMotion("never", true), false);
});
