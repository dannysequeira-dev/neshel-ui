// Owner review of PR #13 (issuecomment-6994532003): regression tests written BEFORE the fixes.
// A — awaited call, then reverse/seek while running; B — triggered Entrance at t = 0 while the shared
// scheduler is already active; C — restoration of a pre-existing data-neshel-pt-direction; D — a route
// progress that stays pending without a commit (watchdog, then a second navigation).
import assert from "node:assert/strict";
import test from "node:test";
import { setupGestureDom, translation } from "./gesture-helpers.mjs";
import { frames, h, mount } from "./helpers.mjs";

const { media } = await setupGestureDom();
const cinematic = await import("../dist/cinematic/index.js");
const entrance = await import("../dist/entrance/index.js");
const pt = await import("../dist/page-transitions/index.js");
const core = await import("../dist/core/index.js");
const { createTimeline } = cinematic;
const { getFrameScheduler, motionValue, animateValue } = core;
const { act } = await import("react");

const settle = () => frames.settle(900, 16);
const el = () => {
  const node = document.createElement("div");
  document.body.appendChild(node);
  return node;
};
const opacityOf = (node) => (node.style.opacity === "" ? 1 : Number(node.style.opacity));
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
void media;

test("A1 · reverse while an awaited call is pending resumes backwards and settles; the stale promise is ignored", async () => {
  const node = el();
  let resolveWait;
  const tl = createTimeline();
  tl.add({ target: node, to: { x: 100 }, duration: 400, easing: "linear" });
  tl.call(() => new Promise((resolve) => (resolveWait = resolve)), 100, { wait: true });
  tl.play();
  frames.flush(12);
  assert.equal(tl.time, 100, "waiting at the call");
  tl.reverse();
  frames.settle(200, 16);
  assert.equal(
    tl.state,
    "completed",
    `reverse resumed and settled (state ${tl.state}, time ${tl.time})`,
  );
  assert.equal(tl.direction, "reverse");
  assert.equal(node.style.transform, "", "back at the start");
  resolveWait();
  await tick();
  frames.settle(50, 16);
  assert.equal(tl.state, "completed", "the stale resolution changes nothing");
  assert.equal((await tl.finished).status, "completed");
  tl.destroy();
  node.remove();
});

test("A2 · seek while an awaited call is pending keeps running from the new time; a stale rejection is ignored", async () => {
  const node = el();
  let rejectWait;
  const tl = createTimeline();
  tl.add({ target: node, to: { x: 100 }, duration: 400, easing: "linear" });
  tl.call(() => new Promise((_, reject) => (rejectWait = reject)), 100, { wait: true });
  tl.play();
  frames.flush(12);
  assert.equal(tl.time, 100);
  tl.seekTo(300);
  frames.settle(200, 16);
  assert.equal(
    tl.state,
    "completed",
    `seek resumed the clock (state ${tl.state}, time ${tl.time})`,
  );
  rejectWait(new Error("stale"));
  await tick();
  assert.equal(tl.state, "completed", "the stale rejection does not fail the timeline");
  assert.equal((await tl.finished).status, "completed");
  tl.destroy();
  node.remove();
});

test("B · a triggered Entrance at t = 0 plays even when the shared scheduler is already running", () => {
  const busy = motionValue(0);
  const background = animateValue(busy, 1, { type: "tween", duration: 5000 });
  frames.flush(3); // the shared scheduler is active: the timeline's first frame has a non-zero delta
  const node = el();
  const tl = createTimeline();
  tl.add(
    {
      target: node,
      effect: entrance.fadeUp,
      options: { duration: 300, easing: "linear" },
      mode: "trigger",
    },
    0,
  );
  tl.play();
  frames.flush(1);
  frames.flush(5);
  const mid = opacityOf(node);
  assert.ok(
    mid > 0 && mid < 1,
    `the entrance animates (opacity ${mid}, transform ${node.style.transform})`,
  );
  frames.flush(40);
  assert.equal(node.style.cssText, "", "ends visible with styles restored");
  tl.destroy();
  background.cancel();
  settle();
  node.remove();
});

function installStubVT() {
  globalThis.CSS = { supports: () => true };
  const records = [];
  document.startViewTransition = (arg) => {
    const update = typeof arg === "function" ? arg : arg.update;
    let finish;
    const record = {
      finished: new Promise((resolve) => (finish = resolve)),
      ready: Promise.resolve(),
      skipTransition: () => finish(),
      finish: () => finish(),
    };
    record.updateCallbackDone = Promise.resolve().then(update);
    records.push(record);
    return record;
  };
  return {
    records,
    restore() {
      delete document.startViewTransition;
      delete globalThis.CSS;
    },
  };
}

test("C1 · a pre-existing data-neshel-pt-direction is restored exactly after a native transition", async () => {
  const vt = installStubVT();
  const root = document.documentElement;
  root.setAttribute("data-neshel-pt-direction", "back");
  const transition = pt.startPageTransition(() => {}, { direction: "forward" });
  assert.equal(
    root.getAttribute("data-neshel-pt-direction"),
    "forward",
    "published during the transition",
  );
  await transition.updated;
  await tick();
  vt.records.at(-1).finish();
  await transition.finished;
  assert.equal(root.getAttribute("data-neshel-pt-direction"), "back", "original value restored");
  root.removeAttribute("data-neshel-pt-direction");
  vt.restore();
});

test("C2 · a live direction tracker that changes the attribute during the transition keeps its value", async () => {
  const vt = installStubVT();
  const root = document.documentElement;
  const tracker = pt.trackNavigationDirection();
  tracker.set("forward", "push");
  const transition = pt.startPageTransition(() => {}, { direction: "forward" });
  tracker.set("back", "traverse"); // a traverse happens while the transition runs
  await transition.updated;
  await tick();
  vt.records.at(-1).finish();
  await transition.finished;
  assert.equal(
    root.getAttribute("data-neshel-pt-direction"),
    "back",
    "the tracker's latest value wins",
  );
  tracker.destroy();
  vt.restore();
});

test("D · RouteProgress: a navigation that never commits times out, reports it, and a later one restarts", async () => {
  const realTimeout = globalThis.setTimeout;
  const realClear = globalThis.clearTimeout;
  let now = 0;
  const timers = new Map();
  let id = 0;
  globalThis.setTimeout = (fn, ms) => {
    timers.set(++id, { fn, at: now + (ms ?? 0) });
    return id;
  };
  globalThis.clearTimeout = (handle) => timers.delete(handle);
  const advance = (ms) => {
    now += ms;
    for (const [handle, timer] of [...timers].sort((a, b) => a[1].at - b[1].at)) {
      if (timer.at <= now && timers.has(handle)) {
        timers.delete(handle);
        timer.fn();
      }
    }
  };
  try {
    let timedOut = 0;
    // biome-ignore lint/correctness/noComponentHookFactories: a local fixture that counts timeouts.
    function Bar({ pending, navigation }) {
      return h(pt.RouteProgress, {
        pending,
        navigation,
        delay: 0,
        timeout: 1000,
        onTimeout: () => timedOut++,
      });
    }
    const view = await mount(h(Bar, { pending: true, navigation: 1 }));
    const node = view.container.querySelector(".neshel-route-progress");
    advance(10);
    assert.equal(node.getAttribute("data-state"), "pending");
    await act(async () => advance(1100)); // the first navigation never commits
    assert.equal(node.getAttribute("data-state"), "idle", "the watchdog ended it");
    assert.equal(timedOut, 1, "the owner of the pending state is told (so it can clear it)");
    await view.render(h(Bar, { pending: true, navigation: 2 })); // a second navigation while still pending
    advance(10);
    assert.equal(
      node.getAttribute("data-state"),
      "pending",
      "the second navigation restarts the indicator",
    );
    await view.render(h(Bar, { pending: false, navigation: 2 }));
    advance(400);
    assert.equal(node.getAttribute("data-state"), "idle");
    await view.unmount();
  } finally {
    globalThis.setTimeout = realTimeout;
    globalThis.clearTimeout = realClear;
  }
});

void translation;
void getFrameScheduler;
