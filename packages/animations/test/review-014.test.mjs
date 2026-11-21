// Owner review of PR #15 (issuecomment-7056966484): regression tests written BEFORE the fixes.
// R1 — RotatingWords listeners (incl. a focusout microtask queued just before destroy, React StrictMode);
// R2 — two morph controllers on the same <path> (shared attribute ledger, alternating destroy order,
// consumer change of `d` meanwhile); R3 — `loopEffectControl.track()` subscriptions after destroy.
import assert from "node:assert/strict";
import test from "node:test";
import { StrictMode } from "react";
import { frames, h, mount, setupDom } from "./helpers.mjs";

const { media } = await setupDom();
const text = await import("../dist/text/index.js");
const svg = await import("../dist/svg/index.js");
const { loopEffectControl } = await import("../dist/core/loop.js");
const { getFrameScheduler, motionValue } = await import("../dist/core/index.js");
void media;

const settle = (limit = 2000) => frames.settle(limit, 16);
const NS = "http://www.w3.org/2000/svg";
const microtask = () => new Promise((resolve) => queueMicrotask(resolve));

const TRACKED = new Set(["pointerenter", "pointerleave", "focusin", "focusout"]);
/** Count the interaction listeners added/removed on any element (EventTarget prototype). */
function trackAll() {
  const proto = window.EventTarget.prototype;
  const add = proto.addEventListener;
  const remove = proto.removeEventListener;
  const active = [];
  proto.addEventListener = function (type, listener, options) {
    if (TRACKED.has(type) && this.querySelector?.(":scope > .neshel-rotator"))
      active.push({ target: this, type, listener });
    return add.call(this, type, listener, options);
  };
  proto.removeEventListener = function (type, listener, options) {
    const i = active.findIndex(
      (entry) => entry.target === this && entry.type === type && entry.listener === listener,
    );
    if (i >= 0) active.splice(i, 1);
    return remove.call(this, type, listener, options);
  };
  return {
    get active() {
      return active.map((entry) => entry.type).sort();
    },
    restore() {
      proto.addEventListener = add;
      proto.removeEventListener = remove;
    },
  };
}

function quietWarnings() {
  const original = console.warn;
  const messages = [];
  console.warn = (message) => messages.push(String(message));
  return {
    messages,
    restore() {
      console.warn = original;
    },
  };
}

// --- R1 ---------------------------------------------------------------------------------------------------------

test("R1 · RotatingWords removes every interaction listener it added (incl. focusout) on destroy", () => {
  const listeners = trackAll();
  try {
    const node = document.createElement("span");
    document.body.appendChild(node);
    const control = text.createRotatingWords(node, { words: ["a", "b"], interval: 1000 });
    assert.deepEqual(listeners.active, ["focusin", "focusout", "pointerenter", "pointerleave"]);
    control.destroy();
    assert.deepEqual(listeners.active, [], "no listener survives destroy");
    node.remove();
  } finally {
    listeners.restore();
  }
});

test("R1 · a focusout microtask queued just before destroy does not resume the destroyed effect", async () => {
  const node = document.createElement("span");
  node.innerHTML = "";
  document.body.appendChild(node);
  const button = document.createElement("button");
  const control = text.createRotatingWords(node, { words: ["a", "b"], interval: 1000 });
  node.appendChild(button);
  button.focus();
  node.dispatchEvent(new window.FocusEvent("focusin", { bubbles: true }));
  assert.equal(control.state, "paused", "held while focused");
  button.blur();
  node.dispatchEvent(new window.FocusEvent("focusout", { bubbles: true })); // queues resume
  control.destroy();
  await microtask();
  await microtask();
  assert.notEqual(control.state, "running");
  assert.equal(getFrameScheduler().size, 0, "no task scheduled by a stale resume");
  node.remove();
});

test("R1 · React StrictMode mount/remount/unmount leaves no RotatingWords listener behind", async () => {
  const listeners = trackAll();
  try {
    const view = await mount(
      h(StrictMode, null, h(text.RotatingWords, { words: ["fast", "accessible"], interval: 1000 })),
    );
    assert.deepEqual(
      listeners.active,
      ["focusin", "focusout", "pointerenter", "pointerleave"],
      "exactly one live set after the StrictMode double effect",
    );
    await view.render(
      h(StrictMode, null, h(text.RotatingWords, { words: ["one", "two"], interval: 1200 })),
    );
    assert.equal(listeners.active.length, 4, "options change: one set");
    await view.unmount();
    assert.deepEqual(listeners.active, []);
  } finally {
    listeners.restore();
  }
});

// --- R2 ---------------------------------------------------------------------------------------------------------

const ORIGINAL = "m0 0 h10";
const A = ["M0 0L10 0", "M0 10L20 10"];
const B = ["M0 0L10 0", "M0 50L90 50"];
function pathEl(d = ORIGINAL) {
  const root = document.createElementNS(NS, "svg");
  root.innerHTML = `<path d="${d}"/>`;
  document.body.appendChild(root);
  return root.firstElementChild;
}

test("R2 · a second morph on the same <path> does not overwrite the active one; it resumes when the first is destroyed", () => {
  const warnings = quietWarnings();
  try {
    const path = pathEl();
    const a = svg.createPathMorph(path, { shapes: A, duration: 160, easing: "linear" });
    const b = svg.createPathMorph(path, { shapes: B, duration: 160, easing: "linear" });
    a.to(1);
    a.pause();
    a.seek(0.5);
    frames.flush(1);
    const aMid = path.getAttribute("d");
    assert.equal(aMid, "M0 5L15 5");
    b.to(1);
    b.pause();
    b.seek(0.5);
    frames.flush(1);
    assert.equal(path.getAttribute("d"), aMid, "the active morph keeps the geometry");
    assert.ok(
      warnings.messages.some((m) => /createPathMorph/.test(m) && /"d"/.test(m)),
      "conflict reported in development",
    );
    a.seek(1);
    frames.flush(1);
    assert.equal(path.getAttribute("d"), "M0 10L20 10");
    a.destroy();
    assert.equal(path.getAttribute("d"), "M0 25L50 25", "the waiting morph resumes its last shape");
    b.seek(1);
    frames.flush(1);
    assert.equal(path.getAttribute("d"), "M0 50L90 50");
    b.destroy();
    assert.equal(path.getAttribute("d"), ORIGINAL, "the consumer's original is restored once");
    path.ownerSVGElement.remove();
  } finally {
    warnings.restore();
  }
});

test("R2 · destroying the waiting morph first never touches the surviving one's geometry", () => {
  const warnings = quietWarnings();
  try {
    const path = pathEl();
    const a = svg.createPathMorph(path, { shapes: A, duration: 160, easing: "linear" });
    const b = svg.createPathMorph(path, { shapes: B, duration: 160, easing: "linear" });
    a.to(1);
    a.pause();
    a.seek(0.5);
    frames.flush(1);
    b.to(1);
    b.pause();
    b.seek(0.25);
    frames.flush(1);
    a.seek(0.75); // the survivor moves on after the second writer appeared
    frames.flush(1);
    b.destroy();
    frames.flush(1);
    assert.equal(
      path.getAttribute("d"),
      "M0 7.5L17.5 7.5",
      "survivor untouched (no stale restore)",
    );
    a.seek(1);
    frames.flush(1);
    assert.equal(path.getAttribute("d"), "M0 10L20 10");
    a.destroy();
    assert.equal(path.getAttribute("d"), ORIGINAL);
    path.ownerSVGElement.remove();
  } finally {
    warnings.restore();
  }
});

test("R2 · IconMorph + PathMorph on one path, settled runs and a destroy in the middle of a frame", () => {
  const warnings = quietWarnings();
  try {
    const path = pathEl(svg.menuCloseShapes.menu);
    const icon = svg.createIconMorph(path, { shapes: svg.menuCloseShapes, duration: 50 });
    const other = svg.createPathMorph(path, {
      shapes: [svg.menuCloseShapes.menu, svg.menuCloseShapes.close],
      duration: 50,
    });
    icon.set("close");
    settle();
    const closed = path.getAttribute("d");
    other.to(0); // waits behind the icon
    settle();
    assert.equal(path.getAttribute("d"), closed);
    other.to(1);
    other.pause();
    other.seek(0.5);
    icon.destroy(); // pending write of the icon is dropped; the waiting writer takes over at once
    frames.flush(1);
    assert.notEqual(path.getAttribute("d"), svg.menuCloseShapes.menu);
    other.destroy();
    assert.equal(path.getAttribute("d"), svg.menuCloseShapes.menu);
    path.ownerSVGElement.remove();
  } finally {
    warnings.restore();
  }
});

test("R2 · a consumer (e.g. React) change of `d` during the morph becomes the value restored on destroy", () => {
  const warnings = quietWarnings();
  try {
    const path = pathEl();
    const a = svg.createPathMorph(path, { shapes: A, duration: 160, easing: "linear" });
    a.to(1);
    a.pause();
    a.seek(0.5);
    frames.flush(1);
    path.setAttribute("d", "M1 1L2 2"); // consumer re-render with a new prop
    a.seek(0.75);
    frames.flush(1);
    assert.equal(path.getAttribute("d"), "M0 7.5L17.5 7.5", "the active morph keeps writing");
    a.destroy();
    assert.equal(
      path.getAttribute("d"),
      "M1 1L2 2",
      "the consumer's newer value, not the stale one",
    );
    const b = svg.createPathMorph(path, { shapes: A, duration: 160, easing: "linear" });
    b.to(1);
    b.pause();
    b.seek(0.5);
    frames.flush(1);
    path.setAttribute("d", "M3 3L4 4"); // changed after the last write, nothing written since
    b.destroy();
    assert.equal(path.getAttribute("d"), "M3 3L4 4");
    path.ownerSVGElement.remove();
  } finally {
    warnings.restore();
  }
});

test("R2 · two gradient-stop loops sharing a <stop> offset: one writer at a time, exact restore", () => {
  const warnings = quietWarnings();
  globalThis.CSS = { supports: () => true };
  try {
    const root = document.createElementNS(NS, "svg");
    root.innerHTML = '<linearGradient><stop offset="0.3"/></linearGradient>';
    document.body.appendChild(root);
    const gradient = root.firstElementChild;
    const stop = gradient.firstElementChild;
    const one = svg.createGradientStops(gradient, {
      stops: [{ offset: [0, 1] }],
      trigger: "manual",
      duration: 400,
    });
    const two = svg.createGradientStops(gradient, {
      stops: [{ offset: [1, 0] }],
      trigger: "manual",
      duration: 400,
    });
    one.seek(0.25); // yoyo: half way, smoothstep 0.5
    frames.flush(1);
    assert.equal(stop.getAttribute("offset"), "0.5");
    two.seek(0.125);
    frames.flush(1);
    assert.equal(stop.getAttribute("offset"), "0.5", "the first owner keeps the offset");
    one.destroy();
    assert.equal(stop.getAttribute("offset"), "0.8438", "the second resumes its last value");
    two.destroy();
    assert.equal(stop.getAttribute("offset"), "0.3");
    root.remove();
  } finally {
    delete globalThis.CSS;
    warnings.restore();
  }
});

// --- R3 ---------------------------------------------------------------------------------------------------------

test("R3 · tracks created by loopEffectControl stop driving the loop once the effect is destroyed", () => {
  const seeks = [];
  const loop = {
    state: "idle",
    time: 0,
    play() {},
    pause() {},
    stop() {},
    seek: (time) => seeks.push(time),
    destroy() {},
  };
  let destroyed = 0;
  const control = loopEffectControl(loop, 100, 0, () => destroyed++);
  const first = control.track();
  const second = control.track({ duration: 50 });
  first.value.set(0.5);
  assert.deepEqual(seeks, [50]);
  control.destroy();
  assert.equal(destroyed, 1);
  first.value.set(0.75);
  second.value.set(1);
  assert.deepEqual(seeks, [50], "no subscription survives destroy");
  const late = control.track(); // after destroy: inert, nothing subscribed
  late.value.set(1);
  assert.deepEqual(seeks, [50]);
  assert.equal(typeof motionValue, "function");
});

test("R3 · a real continuous text effect: a retained timeline track is inert after destroy", () => {
  const node = document.createElement("p");
  node.textContent = "Wave";
  document.body.appendChild(node);
  const control = text.createTextWave(node, { duration: 400, repeat: 0 });
  const track = control.track();
  control.pause();
  track.value.set(0.5);
  const root = node.querySelector(".neshel-split");
  assert.ok(root, "split while alive");
  control.destroy();
  frames.flush(2);
  assert.equal(node.textContent, "Wave");
  const before = node.outerHTML;
  track.value.set(0.25);
  track.value.set(0.9);
  frames.flush(2);
  assert.equal(node.outerHTML, before, "no write after destroy");
  assert.equal(getFrameScheduler().size, 0);
  node.remove();
});
