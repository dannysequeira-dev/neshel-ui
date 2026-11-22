// Phase 015 §6 (pending Phase 014 correction): `loopEffectControl.drive(source)` accepted a new subscription
// after the effect was destroyed. Written BEFORE the fix; the source's listener count proves it.
import assert from "node:assert/strict";
import test from "node:test";
import { frames, setupDom } from "./helpers.mjs";

await setupDom();
const { loopEffectControl } = await import("../dist/core/loop.js");
const { getFrameScheduler } = await import("../dist/core/index.js");
const svg = await import("../dist/svg/index.js");

/** A 0–1 source that counts its live subscriptions. */
function countingSource(initial = 0) {
  const listeners = new Set();
  let value = initial;
  return {
    get: () => value,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    set(next) {
      value = next;
      for (const listener of [...listeners]) listener(next);
    },
    get listeners() {
      return listeners.size;
    },
  };
}

function fakeLoop() {
  const calls = [];
  return {
    calls,
    state: "idle",
    time: 0,
    play: () => calls.push("play"),
    pause: () => calls.push("pause"),
    stop: () => calls.push("stop"),
    seek: (time) => calls.push(["seek", time]),
    destroy() {},
  };
}

test("015 §6 · drive() after destroy does not subscribe and does not touch the loop", () => {
  const loop = fakeLoop();
  const control = loopEffectControl(loop, 100, 0, () => {});
  control.destroy();
  const source = countingSource(0.5);
  const unsubscribe = control.drive(source);
  assert.equal(source.listeners, 0, "no subscription after destroy");
  assert.deepEqual(loop.calls, [], "no pause/seek after destroy");
  source.set(0.75);
  assert.deepEqual(loop.calls, []);
  assert.equal(typeof unsubscribe, "function");
  unsubscribe(); // idempotent no-op
});

test("015 §6 · track() and drive() stay inert after destroy; a live drive is released by destroy", () => {
  const loop = fakeLoop();
  const control = loopEffectControl(loop, 200, 0, () => {});
  const live = countingSource(0);
  control.drive(live);
  assert.equal(live.listeners, 1);
  control.destroy();
  assert.equal(live.listeners, 0, "destroy releases the driving source");
  const before = loop.calls.length;
  const track = control.track();
  track.value.set(1);
  control.drive(countingSource(1));
  assert.equal(loop.calls.length, before, "inert after destroy");
});

test("015 §6 · a real loop effect: drive after destroy leaves no scheduler task and no write", () => {
  const NS = "http://www.w3.org/2000/svg";
  const host = document.createElementNS(NS, "svg");
  const path = document.createElementNS(NS, "path");
  path.setAttribute("d", "M0 0L100 0");
  host.appendChild(path);
  document.body.appendChild(host);
  const control = svg.createDashFlow(path, { trigger: "manual" });
  control.destroy();
  frames.flush(2);
  const before = path.outerHTML;
  const source = countingSource(0.3);
  control.drive(source);
  source.set(0.9);
  frames.flush(3);
  assert.equal(source.listeners, 0);
  assert.equal(path.outerHTML, before, "no write after destroy");
  assert.equal(getFrameScheduler().size, 0, "no orphan task");
  host.remove();
});
