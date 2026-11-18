// Owner-approved scrubbable Entrance (review of PR #13, decision 3): the additive Entrance `progress` contract
// driven by the C01 timeline clock — no second clock. Seek both ways, scrub, reverse, interruption, live
// reduced motion, composition with Scroll/Hover/Press and exact cleanup.
import assert from "node:assert/strict";
import test from "node:test";
import { box, ptr, setupGestureDom, translation } from "./gesture-helpers.mjs";
import { frames } from "./helpers.mjs";
import { place, scrollTo, viewport } from "./scroll-helpers.mjs";

const { media } = await setupGestureDom();
const cinematic = await import("../dist/cinematic/index.js");
const entrance = await import("../dist/entrance/index.js");
const hover = await import("../dist/hover/index.js");
const press = await import("../dist/press/index.js");
const scroll = await import("../dist/scroll/index.js");
const core = await import("../dist/core/index.js");
const { createTimeline } = cinematic;
const { attachEffect, getFrameScheduler, motionValue, animateValue } = core;

const settle = () => frames.settle(900, 16);
const el = (style = "") => {
  const node = document.createElement("div");
  if (style) node.setAttribute("style", style);
  document.body.appendChild(node);
  return node;
};
const opacityOf = (node) => (node.style.opacity === "" ? 1 : Number(node.style.opacity));
const ty = (node) => translation(node)[1];

test("scrub: progress 0 / intermediate / 1, seek both ways; the entrance runs no clock of its own", () => {
  const node = el("opacity: 0.8");
  const before = node.style.cssText;
  const tl = createTimeline();
  tl.add({
    id: "in",
    target: node,
    effect: entrance.fadeUp,
    options: { distance: 40, duration: 200, easing: "linear" },
  });
  assert.equal(tl.duration, 200);
  tl.seekTo(0);
  settle();
  assert.equal(ty(node), 40);
  assert.equal(opacityOf(node), 0);
  tl.seekTo(100);
  settle();
  assert.equal(ty(node), 20);
  assert.ok(Math.abs(opacityOf(node) - 0.4) < 0.01, "0.5 × baseline 0.8");
  frames.flush(30);
  assert.equal(ty(node), 20, "no own clock: nothing moves while the timeline is still");
  tl.seekTo(200);
  settle();
  assert.equal(node.style.cssText, before, "identity at 1: baseline restored");
  tl.seekTo(50);
  settle();
  assert.equal(ty(node), 30, "seeking back renders the earlier pose");
  tl.destroy();
  settle();
  assert.equal(node.style.cssText, before, "exact cleanup");
  node.remove();
});

test("scrub: play, pause, reverse mid-way and seek while running follow the timeline clock", () => {
  const node = el();
  const tl = createTimeline();
  tl.add({
    target: node,
    effect: entrance.fadeUp,
    options: { distance: 40, duration: 320, easing: "linear" },
  });
  tl.play();
  frames.flush(1);
  frames.flush(10); // 160 ms
  assert.equal(ty(node), 20);
  tl.pause();
  frames.flush(10);
  assert.equal(ty(node), 20, "paused with the timeline");
  const expected = () => 40 * (1 - tl.time / 320);
  tl.play();
  frames.flush(5);
  const turned = tl.time;
  assert.ok(Math.abs(ty(node) - expected()) < 0.6);
  tl.reverse();
  frames.flush(4);
  assert.ok(tl.time < turned, "running backwards");
  assert.ok(
    Math.abs(ty(node) - expected()) < 0.6,
    `reverse retraces the pose: ${ty(node)} vs ${expected()}`,
  );
  tl.seekTo(80);
  frames.flush(1);
  assert.ok(
    tl.time < 80 && Math.abs(ty(node) - expected()) < 0.6,
    `seek while running keeps reversing: ${ty(node)}`,
  );
  settle();
  assert.equal(tl.state, "completed");
  assert.equal(ty(node), 40, "reverse run ends at the start pose");
  tl.destroy();
  settle();
  assert.equal(node.style.cssText, "");
  node.remove();
});

test("scrub at t = 0 while the shared scheduler is already active animates through the timeline", () => {
  const busy = animateValue(motionValue(0), 1, { type: "tween", duration: 5000 });
  frames.flush(3);
  const node = el();
  const tl = createTimeline();
  tl.add(
    { target: node, effect: entrance.fadeIn, options: { duration: 300, easing: "linear" } },
    0,
  );
  tl.play();
  frames.flush(1);
  frames.flush(5);
  const mid = opacityOf(node);
  assert.ok(mid > 0 && mid < 1, `follows the timeline: ${mid}`);
  settle();
  assert.equal(node.style.cssText, "");
  tl.destroy();
  busy.cancel();
  settle();
  node.remove();
});

test("scrub: live reduced motion uses the declared behaviour (fade / instant) and switching back restores the pose", () => {
  const a = el();
  const b = el();
  const tl = createTimeline({ reducedMotion: "never" });
  tl.add({
    target: a,
    effect: entrance.fadeUp,
    options: { distance: 40, duration: 200, easing: "linear" },
  });
  tl.add({ target: b, effect: entrance.fadeIn, options: { duration: 200, easing: "linear" } }, 0);
  tl.seekTo(100);
  settle();
  media.set(true);
  settle();
  assert.equal(ty(a), 0, "fade: no travel");
  assert.ok(opacityOf(a) > 0 && opacityOf(a) < 1, "fade kept");
  assert.equal(b.style.cssText, "", "instant: no contribution, content visible");
  media.set(false);
  settle();
  assert.equal(ty(a), 20, "back to the scrubbed pose");
  tl.destroy();
  settle();
  a.remove();
  b.remove();
});

test("scrub composes with Hover, Press and Scroll layers on the same element and restores exactly", () => {
  document.body.innerHTML = "";
  viewport();
  scrollTo(0);
  settle();
  const node = el("transform: skewX(1deg)");
  place(node, { top: 1000, height: 200 });
  box(node, { x: 0, y: 1000, width: 100, height: 100 });
  const before = node.style.cssText;
  const lift = attachEffect(node, hover.lift, { distance: 6 });
  const scale = attachEffect(node, press.pressScale, { scale: 0.9 });
  const parallax = attachEffect(node, scroll.depthParallax, { depth: 1, distance: 100 });
  node.dispatchEvent(
    new window.PointerEvent("pointerenter", { clientX: 50, clientY: 1050, pointerType: "mouse" }),
  );
  ptr(window, "pointermove", { x: 50, y: 1050 });
  const tl = createTimeline();
  tl.add({
    target: node,
    effect: entrance.fadeUp,
    options: { distance: 40, duration: 200, easing: "linear" },
  });
  tl.seekTo(100);
  settle();
  const composed = ty(node);
  assert.ok(composed !== 20, `entrance 20 composes with lift/parallax: ${composed}`);
  assert.match(node.style.transform, /^skewX\(1deg\) /, "consumer transform kept as prefix");
  tl.destroy();
  settle();
  assert.ok(
    Math.abs(ty(node) - (composed - 20)) < 0.01,
    "the entrance contribution alone was released",
  );
  for (const handle of [lift, scale, parallax]) handle.destroy();
  settle();
  assert.equal(node.style.cssText, before);
  assert.equal(getFrameScheduler().size, 0);
  node.remove();
});

test("modes: E11 spring scrubs over its settle time; trigger stays available; invalid inputs rejected", () => {
  const node = el();
  const spring = createTimeline();
  spring.add({ target: node, effect: entrance.springIn });
  assert.ok(spring.duration > 200 && spring.duration < 4000);
  spring.seekTo(spring.duration);
  settle();
  assert.equal(node.style.cssText, "");
  spring.destroy();
  const trigger = createTimeline();
  trigger.add({ target: node, effect: entrance.fadeUp, mode: "trigger" }, 100);
  trigger.seekTo(0);
  settle();
  assert.equal(opacityOf(node), 0, "trigger mode holds the start pose");
  trigger.destroy();
  settle();
  assert.throws(
    () => createTimeline().add({ target: node, effect: hover.lift }),
    /cannot be scrubbed|cannot be triggered/,
  );
  assert.throws(
    () => createTimeline().add({ target: node, effect: entrance.fadeUp, mode: "warp" }),
    /mode/,
  );
  assert.throws(
    () => attachEffect(node, entrance.fadeIn, { progress: 3 }),
    /expected a motion value/,
  );
  node.remove();
});
