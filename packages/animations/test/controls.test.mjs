// Motion controllers (owner requirement 3.2; ADR 0023; contracts/controllers.md) and easing/defaults
// (contracts/motion-defaults.md). 009 FR-030–FR-033, FR-040–FR-042.
import assert from "node:assert/strict";
import test from "node:test";
import { frames, setupDom } from "./helpers.mjs";

const { media } = await setupDom();
const core = await import("../dist/core/index.js");
const {
  animateElement,
  animateValue,
  attachEffect,
  bindChannel,
  clamp,
  cubicBezier,
  defineEffect,
  easings,
  linear,
  mapRange,
  mix,
  motionDefaults,
  motionValue,
  progress,
  springEasing,
  steps,
  toCssEasing,
} = core;

const unhandled = [];
process.on("unhandledRejection", (reason) => unhandled.push(reason));
const tick = () => new Promise((resolve) => setImmediate(resolve));
const linearTween = (duration = 160) => ({ type: "tween", duration, easing: linear });

test("spring: runs on frames, completes at rest, resolves a typed completed result", async () => {
  const value = motionValue(0);
  const control = animateValue(value, 1);
  assert.equal(control.state, "running");
  assert.equal("seek" in control, false, "springs have no seek");
  frames.settle();
  assert.equal(control.state, "completed");
  assert.deepEqual(await control.finished, { status: "completed", direction: "forward", value: 1 });
  assert.equal(value.get(), 1);
  assert.equal(frames.pending, 0);
});

test("tween: progress follows time; pause holds; play resumes; seek sets progress", async () => {
  const value = motionValue(0);
  const control = animateValue(value, 100, linearTween(160));
  frames.flush(1); // first frame: delta 0
  frames.flush(5, 16); // 80 ms
  assert.ok(Math.abs(value.get() - 50) < 1e-9, String(value.get()));
  control.pause();
  assert.equal(control.state, "paused");
  frames.flush(5, 16);
  assert.ok(Math.abs(value.get() - 50) < 1e-9, "paused value holds");
  control.seek(0.25);
  assert.equal(value.get(), 25);
  control.play();
  frames.flush(20, 16);
  assert.deepEqual(await control.finished, {
    status: "completed",
    direction: "forward",
    value: 100,
  });
});

test("reverse mid-run turns around and completes at the origin with direction reverse", async () => {
  const value = motionValue(0);
  const control = animateValue(value, 10, linearTween(160));
  frames.flush(1);
  frames.flush(4, 16); // 0.4
  control.reverse();
  assert.equal(control.state, "running");
  frames.flush(20, 16);
  const result = await control.finished;
  assert.deepEqual(result, { status: "completed", direction: "reverse", value: 0 });
  // reverse() from a settled state starts a new run in the flipped direction.
  const previous = control.finished;
  control.reverse();
  assert.notEqual(control.finished, previous, "new run, new promise");
  frames.flush(20, 16);
  assert.deepEqual(await control.finished, {
    status: "completed",
    direction: "forward",
    value: 10,
  });
});

test("cancel resolves cancelled where it stopped; later calls are no-ops; nothing rejects", async () => {
  const value = motionValue(0);
  const control = animateValue(value, 10, linearTween(160));
  frames.flush(1);
  frames.flush(2, 16);
  const at = value.get();
  control.cancel();
  control.cancel();
  control.pause();
  control.finish();
  assert.equal(control.state, "cancelled");
  assert.deepEqual(await control.finished, {
    status: "cancelled",
    direction: "forward",
    value: at,
  });
  assert.equal(frames.pending, 0);
  await tick();
  assert.deepEqual(unhandled, []);
});

test("a new animation on the same value interrupts the previous one; springs keep velocity", async () => {
  const value = motionValue(0);
  const first = animateValue(value, 100);
  frames.flush(1);
  frames.flush(3, 16);
  const velocity = value.getVelocity();
  assert.ok(velocity > 0);
  const second = animateValue(value, 0);
  assert.equal(first.state, "interrupted");
  assert.deepEqual((await first.finished).status, "interrupted");
  frames.flush(1);
  assert.ok(value.get() > 0, "starts from the current value, not from the origin");
  frames.settle();
  assert.deepEqual(await second.finished, { status: "completed", direction: "forward", value: 0 });
});

test("finish jumps to the end; play after completion starts a new run", async () => {
  const value = motionValue(0);
  const control = animateValue(value, 5, linearTween(1000));
  control.finish();
  assert.deepEqual(await control.finished, { status: "completed", direction: "forward", value: 5 });
  const previous = control.finished;
  control.play();
  assert.equal(control.state, "running");
  assert.equal(value.get(), 0, "restarted from the start of the direction");
  assert.notEqual(control.finished, previous);
  control.finish();
  assert.equal((await control.finished).status, "completed");
});

test("seek from a settled state starts a paused run", async () => {
  const value = motionValue(0);
  const control = animateValue(value, 10, linearTween(100));
  control.cancel();
  control.seek(0.5);
  assert.equal(control.state, "paused");
  assert.equal(value.get(), 5);
  control.play();
  frames.flush(1);
  frames.flush(10, 16);
  assert.equal((await control.finished).status, "completed");
});

test("real errors reject finished (state failed) and never hide; other animations continue", async () => {
  const broken = motionValue(0);
  broken.subscribe((current) => {
    if (current > 0.5) throw new Error("subscriber exploded");
  });
  const healthy = motionValue(0);
  const failing = animateValue(broken, 1, linearTween(64));
  const ok = animateValue(healthy, 1, linearTween(64));
  frames.flush(1);
  frames.flush(10, 16);
  await assert.rejects(failing.finished, /subscriber exploded/);
  assert.equal(failing.state, "failed");
  failing.play();
  assert.equal(failing.state, "failed", "failed is terminal");
  assert.equal((await ok.finished).status, "completed");
});

test("reduced motion: completes immediately at the end; a live change finishes a running animation", async () => {
  media.set(true);
  const value = motionValue(0);
  const control = animateValue(value, 3, linearTween(500));
  assert.equal(frames.pending, 0, "no frames under reduced motion");
  assert.deepEqual(await control.finished, { status: "completed", direction: "forward", value: 3 });
  const forced = animateValue(motionValue(0), 1, linearTween(500), { reducedMotion: "never" });
  assert.equal(forced.state, "running");
  forced.cancel();
  media.set(false);
  const live = animateValue(motionValue(0), 9, linearTween(500));
  frames.flush(2);
  media.set(true);
  assert.deepEqual(await live.finished, { status: "completed", direction: "forward", value: 9 });
  media.set(false);
});

test("bindChannel writes through the host and its release restores the inline value", () => {
  const element = document.createElement("div");
  element.style.opacity = "0.8";
  element.style.setProperty("--neshel-glow", "2px");
  const opacity = motionValue(0.5);
  const glow = motionValue(4);
  const releaseOpacity = bindChannel(
    opacity,
    element,
    { channel: "opacity" },
    { effectId: "ambient/fade" },
  );
  const releaseGlow = bindChannel(
    glow,
    element,
    { channel: "--neshel-glow", format: (v) => `${v}px` },
    { effectId: "ambient/glow", conflicts: "silent" },
  );
  frames.flush();
  assert.equal(element.style.opacity, "0.4");
  assert.equal(element.style.getPropertyValue("--neshel-glow"), "4px");
  opacity.set(0.25);
  glow.set(8);
  frames.flush();
  assert.equal(element.style.opacity, "0.2");
  assert.equal(element.style.getPropertyValue("--neshel-glow"), "8px");
  releaseOpacity();
  releaseGlow();
  releaseGlow();
  frames.flush();
  assert.equal(element.style.opacity, "0.8");
  assert.equal(element.style.getPropertyValue("--neshel-glow"), "2px");
});

/** Minimal WAAPI stand-in for jsdom (real behaviour is asserted in browsers). */
function withAnimate(element) {
  const animations = [];
  element.animate = (keyframes, options) => {
    const animation = {
      keyframes,
      options,
      currentTime: 0,
      playbackRate: 1,
      playState: "running",
      onfinish: null,
      play() {
        this.playState = "running";
      },
      pause() {
        this.playState = "paused";
      },
      reverse() {
        this.playbackRate *= -1;
      },
      cancel() {
        this.playState = "idle";
      },
      complete() {
        this.playState = "finished";
        this.onfinish?.();
      },
    };
    animations.push(animation);
    return animation;
  };
  return animations;
}

test("WAAPI: claims the channel, commits the final keyframe on completion, no fill-forever", async () => {
  const element = document.createElement("div");
  element.style.filter = "blur(1px)";
  const animations = withAnimate(element);
  const control = animateElement(
    element,
    "filter",
    ["blur(0px)", "blur(6px)"],
    { type: "tween", duration: "fast", easing: "decelerate" },
    { effectId: "media/blur" },
  );
  assert.equal(animations.length, 1);
  assert.deepEqual(animations[0].keyframes, [{ filter: "blur(0px)" }, { filter: "blur(6px)" }]);
  assert.equal(animations[0].options.duration, motionDefaults.duration.fast);
  assert.equal(animations[0].options.easing, "cubic-bezier(0, 0, 0, 1)");
  animations[0].complete();
  assert.deepEqual(await control.finished, { status: "completed", direction: "forward", value: 1 });
  assert.equal(animations[0].playState, "idle", "browser animation cancelled after commit");
  frames.flush();
  assert.equal(element.style.filter, "blur(6px)", "end state kept as the new baseline");
});

test("WAAPI: cancel restores the captured inline value; springs use linear() easing", async () => {
  const element = document.createElement("div");
  element.style.clipPath = "inset(1px)";
  const animations = withAnimate(element);
  const control = animateElement(
    element,
    "clip-path",
    ["inset(0%)", "inset(20%)"],
    { type: "spring", spring: "snappy" },
    { effectId: "media/clip" },
  );
  assert.match(animations[0].options.easing, /^linear\(0, /);
  assert.deepEqual(Object.keys(animations[0].keyframes[0]), ["clipPath"]);
  control.pause();
  assert.equal(animations[0].playState, "paused");
  control.reverse();
  assert.equal(animations[0].playbackRate, -1);
  assert.equal(control.state, "paused");
  control.seek(0.5);
  assert.equal(animations[0].currentTime, animations[0].options.duration * 0.5);
  control.cancel();
  assert.equal((await control.finished).status, "cancelled");
  frames.flush();
  assert.equal(element.style.clipPath, "inset(1px)");
});

test("WAAPI: losing the channel to a higher-priority effect settles interrupted", async () => {
  const element = document.createElement("div");
  withAnimate(element);
  const control = animateElement(element, "filter", ["none", "invert(1)"], undefined, {
    effectId: "media/invert",
    conflicts: "silent",
  });
  const urgent = defineEffect({
    id: "feedback/alert",
    family: "feedback",
    channels: [{ channel: "filter", mode: "exclusive" }],
    priority: 10,
    reducedMotion: "instant",
    resolve: () => ({}),
    setup: () => ({ update() {}, destroy() {} }),
  });
  const handle = attachEffect(element, urgent, {}, { conflicts: "silent" });
  assert.equal((await control.finished).status, "interrupted");
  handle.destroy();
});

test("WAAPI: invalid input throws; a browser rejection fails the control; no WAAPI completes", async () => {
  const element = document.createElement("div");
  assert.throws(
    () =>
      animateElement(element, "transform", ["none", "scale(2)"], undefined, {
        effectId: "media/x",
      }),
    /not an exclusive channel/,
  );
  assert.throws(
    () => animateElement(element, "filter", ["none"], undefined, { effectId: "media/x" }),
    /two keyframes/,
  );
  element.animate = () => {
    throw new TypeError("invalid keyframe");
  };
  const failing = animateElement(element, "filter", ["none", "nonsense("], undefined, {
    effectId: "media/bad",
  });
  await assert.rejects(failing.finished, /invalid keyframe/);
  assert.equal(failing.state, "failed");
  const plain = document.createElement("div");
  const control = animateElement(plain, "filter", ["none", "sepia(1)"], undefined, {
    effectId: "media/plain",
  });
  assert.equal((await control.finished).status, "completed");
  assert.equal(plain.style.filter, "sepia(1)");
});

test("easing: cubic-bezier matches CSS reference values; steps; CSS strings", () => {
  const ease = cubicBezier(0.25, 0.1, 0.25, 1);
  assert.ok(Math.abs(ease(0.5) - 0.8024033877399112) < 1e-4, String(ease(0.5)));
  assert.ok(Math.abs(ease(0.25) - 0.4085) < 1e-3, String(ease(0.25)));
  assert.equal(ease(0), 0);
  assert.equal(ease(1), 1);
  assert.equal(linear(0.3), 0.3);
  assert.equal(steps(4)(0.3), 0.25);
  assert.equal(steps(4, "start")(0.3), 0.5);
  assert.equal(toCssEasing("standard"), "cubic-bezier(0.2, 0, 0, 1)");
  assert.equal(toCssEasing(steps(3)), "steps(3, jump-end)");
  assert.throws(() => cubicBezier(1.5, 0, 0, 1), RangeError);
  assert.throws(() => toCssEasing((t) => t), /no CSS form/);
  assert.ok(Object.isFrozen(easings));
});

test("springEasing samples a spring into linear() from 0 to 1 with its duration", () => {
  const { easing, duration } = springEasing(motionDefaults.spring.bouncy, { points: 30 });
  const values = easing.slice(7, -1).split(", ").map(Number);
  assert.equal(values.length, 30);
  assert.equal(values[0], 0);
  assert.equal(values.at(-1), 1);
  assert.ok(Math.max(...values) > 1, "bouncy spring overshoots");
  assert.ok(duration > 200 && duration < 5000, String(duration));
});

test("motion defaults are frozen; interpolation helpers", () => {
  assert.ok(Object.isFrozen(motionDefaults) && Object.isFrozen(motionDefaults.duration));
  assert.equal(motionDefaults.duration.normal, 200);
  assert.equal(clamp(5, 0, 1), 1);
  assert.equal(mix(10, 20, 0.5), 15);
  assert.equal(progress(10, 20, 15), 0.5);
  assert.equal(progress(3, 3, 9), 0);
  assert.equal(mapRange(150, 100, 200, 0, 1), 0.5);
  assert.equal(mapRange(300, 100, 200, 0, 1, { clamp: true }), 1);
});

test("no unhandled rejection was produced by normal outcomes in this file", async () => {
  await tick();
  assert.deepEqual(unhandled, []);
});
