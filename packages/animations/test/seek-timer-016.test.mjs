// Phase 016 §17 — the 250 ms fallback timer of the Phase 015 seek coalescer (src/media/engine/seek.ts). When
// `requestVideoFrameCallback` exists the coalescer waits for the sought frame to be presented and arms a fallback
// timer for hidden videos whose frame callback never fires. These tests pin (1) the fallback behaviour itself,
// (2) that destroy cancels the pending timer (no closure retained after destroy) and (3) that a timer armed by an
// earlier `seeked` cycle never settles a later cycle early (one seek in flight is preserved).
import assert from "node:assert/strict";
import test from "node:test";
import { fakeVideo, setupMediaDom } from "./media-helpers.mjs";

await setupMediaDom();
const M = await import("../dist/media/index.js");

/** Controllable setTimeout/clearTimeout (virtual clock) installed for one test. */
function virtualTimers() {
  const realSet = globalThis.setTimeout;
  const realClear = globalThis.clearTimeout;
  let now = 0;
  let nextId = 1;
  const pending = new Map();
  globalThis.setTimeout = (fn, ms = 0, ...args) => {
    const id = nextId++;
    pending.set(id, { at: now + Math.max(0, ms), fn: () => fn(...args) });
    return id;
  };
  globalThis.clearTimeout = (id) => {
    pending.delete(id);
  };
  return {
    get pending() {
      return pending.size;
    },
    advance(ms) {
      const end = now + ms;
      for (;;) {
        let first;
        for (const [id, timer] of pending) {
          if (timer.at <= end && (!first || timer.at < first[1].at)) first = [id, timer];
        }
        if (!first) break;
        pending.delete(first[0]);
        now = first[1].at;
        first[1].fn();
      }
      now = end;
    },
    restore() {
      globalThis.setTimeout = realSet;
      globalThis.clearTimeout = realClear;
    },
  };
}

function source(initial) {
  let value = initial;
  const listeners = new Set();
  return {
    get: () => value,
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    set(next) {
      value = next;
      for (const fn of [...listeners]) fn(next);
    },
  };
}

function setup() {
  const video = fakeVideo({ duration: 10, frameCallback: true });
  document.body.appendChild(video);
  const progress = source(0.5);
  const control = M.createVideoScrub(video, { progress });
  return { video, progress, control };
}

test("seek fallback: a frame callback that never fires is unblocked after 250 ms (hidden video)", () => {
  const timers = virtualTimers();
  try {
    const { video, progress, control } = setup();
    assert.deepEqual(video.state.seeks, [5]);
    progress.set(0.2);
    video.finishSeek(); // no presented frame (hidden video)
    assert.deepEqual(video.state.seeks, [5], "still waiting for the presented frame");
    timers.advance(249);
    assert.deepEqual(video.state.seeks, [5]);
    timers.advance(1);
    assert.deepEqual(
      video.state.seeks,
      [5, 2],
      "the fallback settled the cycle and issued the newest target",
    );
    control.destroy();
    video.remove();
  } finally {
    timers.restore();
  }
});

test("seek fallback: destroy during the 250 ms window cancels the timer (nothing retained)", () => {
  const timers = virtualTimers();
  try {
    const { video, control } = setup();
    video.finishSeek();
    assert.equal(timers.pending, 1, "the fallback timer is armed");
    control.destroy();
    assert.equal(timers.pending, 0, "destroy cleared the fallback timer");
    timers.advance(1000);
    assert.deepEqual(video.state.seeks, [5], "nothing issued after destroy");
    video.remove();
  } finally {
    timers.restore();
  }
});

test("seek fallback: a presented frame cancels the timer; a stale timer never settles a later cycle", () => {
  const timers = virtualTimers();
  try {
    const { video, progress, control } = setup();
    progress.set(0.1);
    video.finishSeek(); // cycle 1: waiting for the frame, timer armed at t=250
    timers.advance(100);
    video.presentFrame(); // cycle 1 settles at t=100 → issues 1 s
    assert.deepEqual(video.state.seeks, [5, 1]);
    assert.equal(timers.pending, 0, "the presented frame cleared cycle 1's fallback");
    progress.set(0.8);
    timers.advance(50);
    video.finishSeek(); // cycle 2 at t=150: waiting for its frame, fallback at t=400
    timers.advance(150); // t=300 — past cycle 1's original deadline
    assert.deepEqual(video.state.seeks, [5, 1], "one seek in flight: cycle 2 is still waiting");
    timers.advance(100); // t=400 — cycle 2's own fallback
    assert.deepEqual(video.state.seeks, [5, 1, 8]);
    control.destroy();
    assert.equal(timers.pending, 0);
    video.remove();
  } finally {
    timers.restore();
  }
});
