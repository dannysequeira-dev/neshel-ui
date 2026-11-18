// Phase 013 C01 — timeline engine (FR-001–FR-006; contracts/timeline-engine.md, research R5 edge cases).
// jsdom with a manual clock: frames run only on `frames.flush()`; the first frame has delta 0.
import assert from "node:assert/strict";
import test from "node:test";
import { Profiler, StrictMode } from "react";
import { setupGestureDom, translation } from "./gesture-helpers.mjs";
import { frames, h, markup, mount } from "./helpers.mjs";

const { media } = await setupGestureDom();
const cinematic = await import("../dist/cinematic/index.js");
const entrance = await import("../dist/entrance/index.js");
const hover = await import("../dist/hover/index.js");
const core = await import("../dist/core/index.js");
const { createTimeline, getCinematicDebugInfo, useTimeline } = cinematic;
const { getFrameScheduler, attachEffect, motionValue } = core;
const { act } = await import("react");

const settle = (limit = 600) => frames.settle(limit, 16);
const el = (style = "") => {
  const node = document.createElement("div");
  if (style) node.setAttribute("style", style);
  document.body.appendChild(node);
  return node;
};
const tx = (node) => translation(node)[0];
const opacityOf = (node) => (node.style.opacity === "" ? 1 : Number(node.style.opacity));
const idle = () => {
  settle();
  assert.equal(getFrameScheduler().size, 0, "scheduler idle");
};
function hidden(value) {
  Object.defineProperty(document, "hidden", { value, configurable: true });
  document.dispatchEvent(new window.Event("visibilitychange"));
}

test("positions: labels, <, >, +=, -=, numbers; duration is the max end", () => {
  const a = el();
  const tl = createTimeline();
  tl.add({ id: "one", target: a, to: { x: 10 }, duration: 300 });
  tl.label("mid");
  tl.add({ id: "two", target: a, to: { y: 10 }, duration: 200 }, "-=100");
  tl.add({ id: "three", target: a, to: { scale: 2 }, duration: 100 }, "<");
  tl.add({ id: "four", target: a, to: { rotate: 5 }, duration: 100 }, "mid+=50");
  tl.add({ id: "five", target: a, to: { opacity: 0 }, duration: 100 }, "+=100");
  tl.add({ id: "six", target: a, to: { x: 1 }, duration: 100 }, 20);
  assert.equal(tl.getTrack("one").start, 0);
  assert.equal(tl.labels.get("mid"), 300);
  assert.equal(tl.getTrack("two").start, 200);
  assert.equal(tl.getTrack("three").start, 200);
  assert.equal(tl.getTrack("four").start, 350);
  assert.equal(tl.getTrack("five").start, 550);
  assert.equal(tl.getTrack("six").start, 20);
  assert.equal(tl.duration, 650);
  assert.throws(() => tl.add({ target: a, to: { x: 1 } }, "nope+=10"), /unknown label "nope"/);
  assert.throws(() => tl.add({ target: a, to: { x: 1 } }, "??"), /invalid position/);
  assert.throws(() => tl.add({ target: a, to: { x: "1" } }), /must be a finite number/);
  assert.throws(() => createTimeline({ repeat: 1.5 }), /integer/);
  assert.throws(() => createTimeline({ timeScale: 0 }), /timeScale/);
  tl.destroy();
  a.remove();
});

test("play: pose tracks render through the host, settle once, scheduler idle afterwards", async () => {
  const a = el("transform: rotate(3deg); opacity: 0.5");
  const before = a.style.cssText;
  let completes = 0;
  const updates = [];
  const tl = createTimeline({
    onComplete: (result) => {
      completes++;
      assert.equal(result.status, "completed");
    },
    onUpdate: (time) => updates.push(time),
  });
  tl.add({
    target: a,
    from: { x: 0, opacity: 0 },
    to: { x: 100, opacity: 1 },
    duration: 160,
    easing: "linear",
  });
  tl.play();
  frames.flush(1); // delta 0: renders the start
  assert.equal(a.style.transform, "rotate(3deg)", "start pose x 0 is identity: only the baseline");
  frames.flush(5); // 80 ms
  assert.ok(Math.abs(tx(a) - 50) < 0.6, `half way: ${a.style.transform}`);
  assert.match(
    a.style.transform,
    /^rotate\(3deg\) translate3d/,
    "baseline transform kept as prefix",
  );
  assert.ok(Math.abs(opacityOf(a) - 0.25) < 0.01, "opacity multiplies with the baseline 0.5");
  settle();
  const result = await tl.finished;
  assert.deepEqual(result, { status: "completed", direction: "forward", value: 1 });
  assert.equal(completes, 1);
  assert.equal(tx(a), 100);
  assert.equal(getFrameScheduler().size, 0);
  assert.equal(getCinematicDebugInfo().clocks, 0);
  assert.ok(updates.length > 5 && updates.at(-1) === 160);
  tl.destroy();
  settle();
  assert.equal(a.style.cssText, before, "destroy restores the inline style exactly");
  tl.destroy(); // idempotent
  a.remove();
});

test("edge: two tracks starting at the same instant compose on one element", () => {
  const a = el();
  const tl = createTimeline();
  tl.add({ target: a, to: { x: 40 }, duration: 100, easing: "linear" });
  tl.add({ target: a, to: { x: 60 }, duration: 100, easing: "linear" }, "<");
  tl.seekTo(100);
  settle();
  assert.equal(tx(a), 100, "translations add");
  tl.destroy();
  settle();
  assert.equal(a.style.transform, "");
  a.remove();
});

test("edge: a timeline advances while another is cancelled; cancel keeps its state until destroy", async () => {
  const a = el();
  const b = el();
  const one = createTimeline();
  const two = createTimeline();
  one.add({ target: a, to: { x: 100 }, duration: 320, easing: "linear" });
  two.add({ target: b, to: { x: 100 }, duration: 320, easing: "linear" });
  one.play();
  two.play();
  frames.flush(6);
  two.cancel();
  const cancelled = await two.finished;
  assert.equal(cancelled.status, "cancelled");
  frames.flush(1);
  const frozen = tx(b);
  settle();
  assert.equal(tx(a), 100, "the other timeline completed");
  assert.equal(tx(b), frozen, "cancelled timeline keeps its rendered state");
  assert.equal(getFrameScheduler().size, 0);
  two.destroy();
  one.destroy();
  settle();
  assert.equal(b.style.transform, "");
  a.remove();
  b.remove();
});

test("edge: reverse mid-way runs backwards; calls fire in descending order with reverse handlers", async () => {
  const a = el();
  const log = [];
  const tl = createTimeline();
  tl.add({ target: a, to: { x: 100 }, duration: 400, easing: "linear" });
  tl.call((d) => log.push(`a:${d}`), 50, { reverse: (d) => log.push(`a:${d}`) });
  tl.call((d) => log.push(`b:${d}`), 100, { reverse: (d) => log.push(`b:${d}`) });
  tl.call((d) => log.push(`c:${d}`), 300, { reverse: (d) => log.push(`c:${d}`) });
  tl.play();
  frames.flush(1);
  frames.flush(10); // 160 ms
  assert.deepEqual(log, ["a:forward", "b:forward"]);
  tl.reverse();
  settle();
  const result = await tl.finished;
  assert.equal(result.status, "completed");
  assert.equal(result.direction, "reverse");
  assert.deepEqual(log, ["a:forward", "b:forward", "b:reverse", "a:reverse"]);
  assert.equal(a.style.transform, "", "back at x 0 (identity)");
  tl.destroy();
  a.remove();
});

test("edge: seek while running continues from the new time; calls fire only with { fire: true }", () => {
  const a = el();
  const log = [];
  const tl = createTimeline();
  tl.add({ target: a, to: { x: 100 }, duration: 400, easing: "linear" });
  tl.call(() => log.push("150"), 150);
  tl.call(() => log.push("250"), 250);
  tl.play();
  frames.flush(3);
  tl.seekTo(200);
  assert.equal(tl.state, "running");
  assert.deepEqual(log, [], "jumped over 150 without firing");
  frames.flush(5);
  assert.deepEqual(log, ["250"]);
  tl.pause();
  tl.seekTo(0);
  tl.seekTo(300, { fire: true });
  assert.deepEqual(log, ["250", "150", "250"]);
  assert.equal(tl.state, "paused");
  tl.destroy();
  idle();
  a.remove();
});

test("edge: a removed target detaches its track (styles released) while others continue", () => {
  const a = el();
  const b = el();
  const tl = createTimeline();
  tl.add({ id: "a", target: a, to: { x: 100 }, duration: 320, easing: "linear" });
  tl.add({ id: "b", target: b, to: { x: 100 }, duration: 320, easing: "linear" }, "<");
  tl.play();
  frames.flush(5);
  assert.ok(tx(a) > 0);
  a.remove();
  frames.flush(2);
  assert.equal(tl.getTrack("a").detached, true);
  settle();
  assert.equal(a.style.transform, "", "detached element restored");
  assert.equal(tx(b), 100);
  assert.equal(tl.state, "completed");
  tl.destroy();
  b.remove();
});

test("edge: callbacks that pause, seek, cancel or destroy win; completion never fires twice", async () => {
  const a = el();
  const pausing = createTimeline();
  pausing.add({ target: a, to: { x: 100 }, duration: 400, easing: "linear" });
  pausing.call(() => pausing.pause(), 200);
  pausing.play();
  settle();
  assert.equal(pausing.state, "paused");
  assert.equal(pausing.time, 200, "frame stopped at the call");
  assert.equal(tx(a), 50);
  pausing.play();
  settle();
  assert.equal(pausing.state, "completed");
  pausing.destroy();
  settle();

  let completes = 0;
  const seeking = createTimeline({ onComplete: () => completes++ });
  seeking.add({ target: a, to: { x: 100 }, duration: 400, easing: "linear" });
  let jumped = false;
  seeking.call(() => {
    if (!jumped) {
      jumped = true;
      seeking.seekTo(390);
    }
  }, 100);
  seeking.play();
  frames.flush(10);
  assert.equal(seeking.state, "completed");
  assert.equal(completes, 1);
  seeking.finish();
  seeking.cancel();
  assert.equal(completes, 1, "settled once");
  seeking.destroy();

  const destroying = createTimeline({ onComplete: () => completes++ });
  destroying.add({ target: a, to: { x: 100 }, duration: 400 });
  destroying.call(() => destroying.destroy(), 100);
  destroying.play();
  settle();
  assert.equal((await destroying.finished).status, "cancelled");
  assert.equal(completes, 1);
  assert.equal(a.style.transform, "");

  const cancelling = createTimeline({ onComplete: () => completes++ });
  cancelling.add({ target: a, to: { x: 100 }, duration: 400 });
  cancelling.call(() => cancelling.cancel(), 100);
  cancelling.play();
  settle();
  assert.equal((await cancelling.finished).status, "cancelled");
  assert.equal(completes, 1);
  cancelling.destroy();
  idle();
  a.remove();
});

test("edge: awaited actions freeze the clock; a rejection fails the timeline; stale results are ignored", async () => {
  const a = el();
  let resolveWait;
  const tl = createTimeline();
  tl.add({ target: a, to: { x: 100 }, duration: 400, easing: "linear" });
  tl.call(() => new Promise((resolve) => (resolveWait = resolve)), 100, { wait: true });
  tl.play();
  frames.flush(20);
  assert.equal(tl.time, 100, "frozen at the awaited call");
  assert.equal(getFrameScheduler().size, 0, "no clock while waiting");
  resolveWait();
  await Promise.resolve();
  settle();
  assert.equal(tl.state, "completed");
  tl.destroy();

  const failing = createTimeline();
  failing.add({ target: a, to: { x: 100 }, duration: 400 });
  failing.call(() => Promise.reject(new Error("load failed")), 100, { wait: true });
  failing.play();
  settle();
  await assert.rejects(failing.finished, /load failed/);
  assert.equal(failing.state, "failed");
  assert.equal(getFrameScheduler().size, 0);
  failing.destroy();

  let late;
  const stale = createTimeline();
  stale.add({ target: a, to: { x: 100 }, duration: 400 });
  stale.call(() => new Promise((_, reject) => (late = reject)), 100, { wait: true });
  stale.play();
  settle();
  stale.cancel();
  late(new Error("too late"));
  await Promise.resolve();
  assert.equal((await stale.finished).status, "cancelled", "a rejection after cancel is ignored");
  stale.destroy();
  idle();
  a.remove();
});

test("edge: a hidden page stops the clock (pause) or finishes (finish); listeners released", async () => {
  const a = el();
  const tl = createTimeline();
  tl.add({ target: a, to: { x: 100 }, duration: 400, easing: "linear" });
  tl.play();
  frames.flush(6);
  assert.equal(getCinematicDebugInfo().listeners, 1);
  hidden(true);
  const at = tl.time;
  frames.flush(10);
  assert.equal(tl.time, at, "paused while hidden");
  assert.equal(tl.state, "running");
  hidden(false);
  settle();
  assert.equal(tl.state, "completed");
  assert.equal(getCinematicDebugInfo().listeners, 0, "visibility listener removed at settle");
  tl.destroy();

  const finishing = createTimeline({ whenHidden: "finish" });
  finishing.add({ target: a, to: { x: 100 }, duration: 400 });
  finishing.play();
  frames.flush(3);
  hidden(true);
  assert.equal(finishing.state, "completed");
  hidden(false);
  finishing.destroy();
  idle();
  a.remove();
});

test("edge: reduced motion — play finishes at once (calls once, in order); live switch finishes", async () => {
  const a = el();
  const log = [];
  media.set(true);
  const tl = createTimeline();
  tl.add({ target: a, to: { x: 100 }, duration: 400 });
  tl.call(() => log.push(1), 100);
  tl.call(() => log.push(2), 300);
  tl.play();
  assert.equal(tl.state, "completed");
  assert.deepEqual(log, [1, 2]);
  settle();
  assert.equal(tx(a), 100, "final state");
  media.set(false);
  tl.destroy();

  const live = createTimeline();
  live.add({ target: a, to: { x: 100 }, duration: 400 });
  live.call(() => log.push(3), 350);
  live.play();
  frames.flush(4);
  media.set(true);
  assert.equal(live.state, "completed");
  assert.deepEqual(log, [1, 2, 3]);
  media.set(false);
  assert.equal(live.state, "completed", "turning it off replays nothing");
  const never = createTimeline({ reducedMotion: "never" });
  never.add({ target: a, to: { x: 1 }, duration: 100 });
  media.set(true);
  never.play();
  assert.equal(never.state, "running", "policy never ignores the preference");
  media.set(false);
  never.destroy();
  live.destroy();
  idle();
  a.remove();
});

test("repeat and yoyo: iterations, onRepeat, alternating direction; Infinity only explicitly", async () => {
  const a = el();
  const repeats = [];
  const tl = createTimeline({ repeat: 2, yoyo: true, onRepeat: (i) => repeats.push(i) });
  tl.add({ target: a, to: { x: 100 }, duration: 160, easing: "linear" });
  tl.play();
  frames.flush(1);
  frames.flush(15); // 240 ms: second iteration (reversed), half way back
  assert.deepEqual(repeats, [1]);
  assert.ok(Math.abs(tx(a) - 50) < 1, `yoyo half way back: ${tx(a)}`);
  settle();
  assert.deepEqual(repeats, [1, 2]);
  assert.equal(tx(a), 100, "third iteration ends forward");
  tl.destroy();
  const forever = createTimeline({ repeat: Number.POSITIVE_INFINITY });
  forever.add({ target: a, to: { x: 10 }, duration: 100 });
  forever.play();
  frames.flush(40);
  assert.equal(forever.state, "running");
  assert.ok(forever.iteration >= 5);
  forever.finish();
  assert.equal(forever.state, "completed");
  forever.destroy();
  idle();
  a.remove();
});

test("retarget: continuous from the current value; seeking before the anchor shows the original curve", () => {
  const a = el();
  const tl = createTimeline();
  tl.add({ id: "move", target: a, to: { x: 100 }, duration: 400, easing: "linear" });
  tl.seekTo(200);
  settle();
  assert.equal(tx(a), 50);
  tl.retarget("move", { x: 250 });
  settle();
  assert.equal(tx(a), 50, "no jump at the anchor");
  tl.seekTo(400);
  settle();
  assert.equal(tx(a), 250);
  tl.seekTo(300);
  settle();
  assert.equal(tx(a), 150, "remaining span interpolates 50 → 250");
  tl.seekTo(100);
  settle();
  assert.equal(tx(a), 25, "original curve before the anchor");
  const value = motionValue(0);
  tl.add({ id: "v", value, from: 0, to: 10, duration: 100, easing: "linear" }, 0);
  assert.throws(() => tl.retarget("v", { x: 1 }), /finite number/);
  assert.throws(() => tl.retarget("nope", 1), /unknown track/);
  tl.destroy();
  settle();
  a.remove();
});

test("effect tracks drive Entrance definitions (no own clock); non-drivable definitions are rejected", async () => {
  const a = el("opacity: 0.8");
  const before = a.style.cssText;
  const tl = createTimeline();
  tl.add({
    id: "in",
    target: a,
    effect: entrance.fadeUp,
    options: { distance: 40, duration: 200, easing: "linear" },
  });
  assert.equal(tl.duration, 200, "duration from the definition's span");
  tl.seekTo(0);
  settle();
  assert.equal(translation(a)[1], 40, "start pose");
  assert.equal(opacityOf(a), 0);
  tl.seekTo(100);
  settle();
  assert.equal(translation(a)[1], 20);
  assert.ok(Math.abs(opacityOf(a) - 0.4) < 0.01, "0.5 × baseline 0.8");
  frames.flush(30);
  assert.equal(translation(a)[1], 20, "the entrance runs no clock of its own");
  tl.seekTo(200);
  settle();
  assert.equal(a.style.cssText, before, "identity at the end: baseline restored");
  tl.destroy();
  settle();
  assert.equal(a.style.cssText, before);
  assert.throws(
    () => createTimeline().add({ target: a, effect: hover.lift }),
    /not drivable by a timeline/,
  );
  // E11 spring: span from the spring curve.
  const spring = createTimeline().add({ target: a, effect: entrance.springIn });
  assert.ok(spring.duration > 200 && spring.duration < 4000, `spring span ${spring.duration}`);
  spring.destroy();
  idle();
  a.remove();
});

test("entrance progress option: reduced motion uses the declared behaviour; invalid values rejected", () => {
  const a = el();
  const progress = motionValue(0.5);
  media.set(true);
  const handle = attachEffect(a, entrance.fadeSlide, { progress, distance: 40 });
  settle();
  assert.equal(translation(a)[1], 0, "fade behaviour: no travel");
  assert.ok(opacityOf(a) > 0 && opacityOf(a) < 1);
  handle.destroy();
  const instant = attachEffect(a, entrance.fadeIn, { progress });
  settle();
  assert.equal(a.style.opacity, "", "instant behaviour: no contribution");
  media.set(false);
  progress.set(0.25);
  settle();
  assert.ok(opacityOf(a) < 0.5, "live off: renders the external progress again");
  instant.destroy();
  settle();
  assert.equal(a.style.cssText, "");
  assert.throws(() => attachEffect(a, entrance.fadeIn, { progress: 3 }), /expected a motion value/);
  a.remove();
});

test("nested timelines render at the parent's local time; their own play is refused", () => {
  const a = el();
  const child = createTimeline();
  child.add({ target: a, to: { x: 100 }, duration: 200, easing: "linear" });
  const log = [];
  child.call(() => log.push("child"), 100);
  const parent = createTimeline();
  parent.add({ target: a, to: { y: 10 }, duration: 100 });
  parent.add({ timeline: child }, ">");
  assert.equal(parent.duration, 300);
  const errors = [];
  const original = globalThis.reportError;
  globalThis.reportError = (e) => errors.push(e);
  child.play();
  globalThis.reportError = original;
  assert.equal(errors.length, 1);
  parent.play();
  settle();
  assert.deepEqual(log, ["child"]);
  assert.equal(tx(a), 100);
  assert.throws(() => createTimeline().add({ timeline: child }), /already nested/);
  parent.destroy();
  settle();
  assert.equal(a.style.transform, "", "destroying the parent releases the child's tracks");
  a.remove();
});

test("server: play schedules nothing without requestAnimationFrame", () => {
  const raf = globalThis.requestAnimationFrame;
  delete globalThis.requestAnimationFrame;
  const tl = createTimeline();
  tl.call(() => {}, 0);
  tl.play();
  assert.equal(tl.state, "idle");
  globalThis.requestAnimationFrame = raf;
  tl.destroy();
});

test("stress: 4 overlapping timelines × 24 tracks — one task each while running, none at rest", () => {
  const baseline = getCinematicDebugInfo().clocks;
  const nodes = Array.from({ length: 24 }, () => el());
  const timelines = Array.from({ length: 4 }, (_, t) => {
    const tl = createTimeline();
    for (const [i, node] of nodes.entries()) {
      tl.add({ target: node, to: { x: 10 + t, opacity: 0.5 }, duration: 300 }, i * 20);
    }
    return tl;
  });
  for (const tl of timelines) tl.play();
  frames.flush(2);
  assert.equal(
    getFrameScheduler().size,
    4,
    "one clock per running timeline (host writes ran in the frame)",
  );
  settle();
  assert.equal(getFrameScheduler().size, 0);
  assert.ok(
    nodes.every((node) => tx(node) === 4 * 10 + 6),
    "four timelines compose per element",
  );
  for (const tl of timelines) tl.destroy();
  settle();
  assert.ok(nodes.every((node) => node.style.cssText === ""));
  for (const node of nodes) node.remove();
  assert.equal(getCinematicDebugInfo().clocks, baseline);
});

test("useTimeline: StrictMode safe, stable handle, zero commits during playback, restored on unmount", async () => {
  let commits = 0;
  let handle;
  const timelinesBefore = getCinematicDebugInfo().timelines;
  // biome-ignore lint/correctness/noComponentHookFactories: the test captures the handle from its component.
  function Scene() {
    const ref = { current: null };
    handle = useTimeline((tl) => {
      tl.add({ target: document.getElementById("tl-box"), to: { x: 80 }, duration: 160 });
    }, []);
    return h(Profiler, { id: "scene", onRender: () => commits++ }, h("div", { id: "tl-box", ref }));
  }
  const view = await mount(h(StrictMode, null, h(Scene)));
  const first = handle;
  const before = commits;
  await act(async () => handle.play());
  settle();
  assert.equal(commits, before, "no React commit while the timeline plays");
  assert.equal(tx(document.getElementById("tl-box")), 80);
  assert.equal(handle, first, "stable handle");
  assert.equal((await handle.finished()).status, "completed");
  const box = document.getElementById("tl-box");
  await view.unmount();
  settle();
  assert.equal(box.style.transform, "");
  assert.equal(
    getCinematicDebugInfo().timelines,
    timelinesBefore,
    "StrictMode double mount left no timeline behind",
  );
  assert.equal(markup(h(Scene)), '<div id="tl-box"></div>', "server markup is the plain content");
});
