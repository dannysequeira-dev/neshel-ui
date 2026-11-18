// Press & Microinteractions (Phase 010 FR-022, FR-060; contracts/effects-010.md §3, accessibility-010.md §3).
import assert from "node:assert/strict";
import test, { mock } from "node:test";
import { Profiler, StrictMode } from "react";
import {
  frames,
  h,
  layoutBox,
  markup,
  mount,
  renderToString,
  setupDom,
  stubAnimate,
} from "./helpers.mjs";

const press = await import("../dist/press/index.js");
const core = await import("../dist/core/index.js");
const { NeshelAnimationsError } = await import("../dist/index.js");
const { tilt3D } = await import("../dist/hover/index.js");
const {
  Press,
  ToggleMorph,
  CheckboxDraw,
  NumberTick,
  ContentSwap,
  pressScale,
  ripple,
  tapBounce,
  burst,
  shake,
  nudge,
} = press;
const { attachEffect } = core;

test("press subpath runtime exports and catalogue order (P01–P11)", () => {
  assert.deepEqual(Object.keys(press).sort(), [
    "CheckboxDraw",
    "ContentSwap",
    "LongPress",
    "NumberTick",
    "Press",
    "ToggleMorph",
    "burst",
    "checkboxDraw",
    "contentSwap",
    "longPress",
    "nudge",
    "numberTick",
    "pressEffects",
    "pressScale",
    "ripple",
    "shake",
    "tapBounce",
    "toggleMorph",
  ]);
  assert.deepEqual(
    press.pressEffects.map((definition) => definition.id),
    [
      "press/scale",
      "press/ripple",
      "press/tap-bounce",
      "press/toggle-morph",
      "press/checkbox-draw",
      "press/burst",
      "press/shake",
      "press/nudge",
      "press/number-tick",
      "press/content-swap",
      "press/long-press",
    ],
  );
});

test("SSR: decorative components render their static state; no motion state (accessibility-010 §3)", () => {
  assert.equal(typeof globalThis.window, "undefined");
  assert.equal(
    markup(h(Press, { preset: pressScale, asChild: true }, h("button", { type: "button" }, "Go"))),
    '<button type="button" class="neshel-press">Go</button>',
  );
  assert.equal(
    markup(h(ToggleMorph, { checked: true })),
    '<span aria-hidden="true" data-state="on" class="neshel-toggle"><span class="neshel-toggle-thumb"></span></span>',
  );
  const box = markup(h(CheckboxDraw, { checked: false }));
  assert.match(
    box,
    /^<svg[^>]*aria-hidden="true"[^>]*focusable="false"[^>]*data-state="unchecked"/,
  );
  assert.doesNotMatch(box, /neshel-checkbox-mark/, "no mark while unchecked (correct without CSS)");
  assert.match(
    markup(h(CheckboxDraw, { checked: true })),
    /data-state="checked"[\s\S]*neshel-checkbox-mark/,
  );
  assert.match(
    markup(h(CheckboxDraw, { checked: false, indeterminate: true })),
    /data-state="indeterminate"[\s\S]*d="M7.5 12h9"/,
  );
  assert.equal(
    markup(h(NumberTick, { value: 1234.5, live: "polite" })),
    '<span class="neshel-number"><span aria-hidden="true">1,234.5</span><span style="position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0" aria-live="polite">1,234.5</span></span>',
  );
  assert.equal(
    markup(h(ContentSwap, { active: false, confirm: "Copied" }, "Copy")),
    '<span data-state="idle" class="neshel-swap"><span data-slot="idle">Copy</span><span data-slot="confirm" hidden="">Copied</span></span>',
  );
});

test("invalid press usage throws NeshelAnimationsError on the server", () => {
  const cases = [
    [() => markup(h(Press, { preset: pressScale, options: { scale: 2 } })), /"scale"/],
    [() => markup(h(Press, { preset: burst, options: { count: 100 } })), /"count"/],
    [() => markup(h(Press, { preset: shake, options: { trigger: {} } })), /"trigger"/],
    [() => markup(h(Press, { preset: nudge, options: { repeat: 9 } })), /"repeat"/],
    [() => markup(h(Press, { preset: tilt3D })), /belongs to the "hover" family/],
    [() => markup(h(NumberTick, { value: Number.NaN })), /"value"/],
    [() => markup(h(ToggleMorph, { checked: true, stretch: 2 })), /"stretch"/],
  ];
  for (const [run, message] of cases) {
    assert.throws(
      run,
      (error) => error instanceof NeshelAnimationsError && message.test(error.message),
    );
  }
});

// ------------------------------------------------------------------------------------------------
let media;
test("jsdom environment", async () => {
  ({ media } = await setupDom());
});

function host(tag = "button") {
  const node = document.createElement(tag);
  document.body.appendChild(node);
  layoutBox(node, { left: 0, top: 0, width: 120, height: 40 });
  return node;
}
const scaleOf = (node) => Number(/scale\(([\d.]+)\)/.exec(node.style.transform)?.[1] ?? 1);
const release = () => window.dispatchEvent(new window.PointerEvent("pointerup", { button: 0 }));
const down = (node, x = 10, y = 10) =>
  node.dispatchEvent(
    new window.PointerEvent("pointerdown", {
      button: 0,
      isPrimary: true,
      clientX: x,
      clientY: y,
      bubbles: true,
    }),
  );
const key = (node, type, name) =>
  node.dispatchEvent(new window.KeyboardEvent(type, { key: name, bubbles: true }));

test("press scale: pointer and Space/Enter press; release anywhere; disabled never presses", () => {
  const node = host();
  const handle = attachEffect(node, pressScale);
  down(node);
  frames.settle();
  assert.equal(scaleOf(node), 0.96);
  release();
  frames.settle();
  assert.equal(node.style.cssText, "");
  node.focus();
  key(node, "keydown", " ");
  frames.settle();
  assert.equal(scaleOf(node), 0.96, "Space presses");
  key(node, "keyup", " ");
  frames.settle();
  assert.equal(node.style.cssText, "");
  key(node, "keydown", "a");
  frames.flush(2);
  assert.equal(node.style.cssText, "", "other keys do nothing");
  node.disabled = true;
  down(node);
  frames.flush(3);
  assert.equal(node.style.cssText, "", ":disabled never presses");
  node.disabled = false;
  node.setAttribute("aria-disabled", "true");
  down(node);
  frames.flush(3);
  assert.equal(node.style.cssText, "", "aria-disabled never presses");
  handle.destroy();
  node.remove();
});

test("press scale under reduced motion: half amplitude, applied without spring", () => {
  media.set(true);
  try {
    const node = host();
    const handle = attachEffect(node, pressScale, { scale: 0.9 });
    down(node);
    frames.flush(1);
    assert.equal(scaleOf(node), 0.95);
    release();
    frames.flush(1);
    assert.equal(node.style.cssText, "");
    handle.destroy();
    node.remove();
  } finally {
    media.set(false);
  }
});

test("tap bounce: click (pointer or keyboard) squashes then overshoots, then rests; off when reduced", () => {
  const node = host();
  const handle = attachEffect(node, tapBounce);
  node.click();
  const scales = [];
  while (frames.pending > 0) {
    frames.flush(1);
    scales.push(scaleOf(node));
  }
  assert.ok(Math.min(...scales) < 0.97, `squash ${Math.min(...scales)}`);
  assert.ok(Math.max(...scales) > 1.005, `overshoot ${Math.max(...scales)}`);
  assert.equal(node.style.cssText, "");
  media.set(true);
  try {
    node.click();
    frames.flush(3);
    assert.equal(node.style.cssText, "");
  } finally {
    media.set(false);
  }
  handle.destroy();
  node.remove();
});

test("ripple: owned aria-hidden inert layer, circle from the press point, removed after release", () => {
  const waapi = stubAnimate();
  try {
    const node = host();
    const handle = attachEffect(node, ripple, { color: "red" });
    assert.equal(node.getAttribute("data-neshel-fx"), "ripple");
    down(node, 20, 10);
    const layer = node.querySelector(".neshel-ripple-layer");
    assert.ok(layer, "layer created on press");
    assert.equal(layer.getAttribute("aria-hidden"), "true");
    assert.ok(layer.hasAttribute("inert"));
    assert.equal(layer.style.pointerEvents, "none");
    const circle = layer.querySelector(".neshel-ripple");
    const radius = Math.hypot(100, 30); // farthest corner from (20, 10) in a 120×40 box
    assert.equal(circle.style.width, `${radius * 2}px`);
    assert.equal(circle.style.left, `${20 - radius}px`);
    assert.deepEqual(
      waapi.calls[0].keyframes.map((frame) => frame.transform),
      ["scale(0)", "scale(1)"],
    );
    release();
    assert.deepEqual(
      waapi.calls[1].keyframes.map((frame) => frame.opacity),
      ["0.22", "0"],
    );
    waapi.finishAll();
    assert.equal(node.querySelector(".neshel-ripple-layer"), null, "removed when idle");
    node.focus();
    key(node, "keydown", "Enter");
    const centred = node.querySelector(".neshel-ripple");
    assert.equal(centred.style.left, `${60 - Math.hypot(60, 20)}px`, "keyboard ripple is centred");
    key(node, "keyup", "Enter");
    handle.destroy();
    assert.equal(node.children.length, 0, "destroy removes the layer");
    assert.equal(node.getAttribute("data-neshel-fx"), null);
    node.remove();
  } finally {
    waapi.restore();
  }
});

test("ripple: opacity only under reduced motion; nothing without WAAPI; void elements warn", () => {
  const node = host();
  const plain = attachEffect(node, ripple);
  down(node);
  release();
  assert.equal(node.children.length, 0, "no WAAPI: no layer");
  plain.destroy();
  const waapi = stubAnimate();
  media.set(true);
  try {
    const handle = attachEffect(node, ripple);
    down(node);
    assert.deepEqual(Object.keys(waapi.calls[0].keyframes[0]), ["opacity"]);
    release();
    handle.destroy();
  } finally {
    media.set(false);
    waapi.restore();
  }
  const input = host("input");
  const warnings = [];
  const original = console.warn;
  console.warn = (message) => warnings.push(String(message));
  try {
    attachEffect(input, ripple).destroy();
  } finally {
    console.warn = original;
  }
  assert.ok(warnings.some((w) => w.includes("ripple needs an element that can contain children")));
  input.remove();
  node.remove();
});

test("burst: plays on trigger changes only; particles removed when done; none when reduced", () => {
  const waapi = stubAnimate();
  try {
    const node = host();
    const handle = attachEffect(node, burst, { trigger: 0, count: 6 });
    assert.equal(node.querySelector(".neshel-burst-layer"), null, "initial trigger never plays");
    handle.update({ trigger: 1, count: 6 });
    const layer = node.querySelector(".neshel-burst-layer");
    assert.equal(layer.querySelectorAll(".neshel-burst-particle").length, 6);
    assert.equal(layer.getAttribute("aria-hidden"), "true");
    handle.update({ trigger: 1, count: 6 });
    assert.equal(waapi.calls.length, 6, "same trigger: no replay");
    waapi.finishAll();
    assert.equal(node.querySelector(".neshel-burst-layer"), null);
    media.set(true);
    handle.update({ trigger: 2, count: 6 });
    assert.equal(node.querySelector(".neshel-burst-layer"), null, "static under reduced motion");
    media.set(false);
    handle.destroy();
    node.remove();
  } finally {
    media.set(false);
    waapi.restore();
  }
});

test("shake: damped horizontal shake on trigger; warns without error semantics; reduced amplitude", () => {
  const node = host("div");
  const warnings = [];
  const original = console.warn;
  console.warn = (message) => warnings.push(String(message));
  let handle;
  try {
    handle = attachEffect(node, shake, { trigger: 0, distance: 9 });
    frames.flush(2);
    assert.equal(node.style.cssText, "", "initial trigger never plays");
    handle.update({ trigger: 1, distance: 9 });
  } finally {
    console.warn = original;
  }
  assert.ok(warnings.some((w) => w.includes("never the only error signal")));
  const xs = [];
  while (frames.pending > 0) {
    frames.flush(1);
    xs.push(Number(/translate3d\((-?[\d.]+)px/.exec(node.style.transform)?.[1] ?? 0));
  }
  assert.ok(
    Math.max(...xs) > 3 && Math.min(...xs) < -3,
    `oscillates ${Math.min(...xs)}…${Math.max(...xs)}`,
  );
  assert.ok(Math.max(...xs.map(Math.abs)) <= 9);
  assert.equal(node.style.cssText, "");
  node.setAttribute("aria-invalid", "true");
  media.set(true);
  try {
    handle.update({ trigger: 2, distance: 9 });
    const reduced = [];
    while (frames.pending > 0) {
      frames.flush(1);
      reduced.push(
        Math.abs(Number(/translate3d\((-?[\d.]+)px/.exec(node.style.transform)?.[1] ?? 0)),
      );
    }
    assert.ok(Math.max(...reduced) <= 3, `reduced amplitude ${Math.max(...reduced)}`);
  } finally {
    media.set(false);
  }
  handle.destroy();
  node.remove();
});

test("nudge: rotation wiggle with bounded repeats; stops when the page hides; off when reduced", async () => {
  mock.timers.enable({ apis: ["setTimeout"] });
  try {
    const node = host("div");
    const handle = attachEffect(node, nudge, { trigger: 0, repeat: 2, interval: 1000 });
    handle.update({ trigger: 1, repeat: 2, interval: 1000 });
    frames.flush(4);
    assert.match(node.style.transform, /rotateZ\(/);
    frames.settle();
    await Promise.resolve();
    assert.equal(node.style.cssText, "");
    mock.timers.tick(1000);
    frames.flush(4);
    assert.match(node.style.transform, /rotateZ\(/, "first repeat");
    frames.settle();
    await Promise.resolve();
    document.dispatchEvent(new window.Event("visibilitychange")); // visible: no effect
    Object.defineProperty(document, "hidden", { value: true, configurable: true });
    document.dispatchEvent(new window.Event("visibilitychange"));
    mock.timers.tick(5000);
    frames.flush(4);
    assert.equal(node.style.cssText, "", "hidden page stops the repeats");
    delete document.hidden;
    media.set(true);
    handle.update({ trigger: 2, repeat: 0, interval: 1000 });
    frames.flush(3);
    assert.equal(node.style.cssText, "", "off under reduced motion");
    media.set(false);
    handle.destroy();
    node.remove();
  } finally {
    delete document.hidden;
    media.set(false);
    mock.timers.reset();
  }
});

test("<ToggleMorph>: animates the owned thumb on change only; stretch mid-travel; instant when reduced", async () => {
  const app = await mount(h(ToggleMorph, { checked: false, id: "t" }));
  const track = app.container.querySelector("#t");
  const thumb = track.firstChild;
  frames.flush(2);
  assert.equal(thumb.style.cssText, "", "no motion on mount");
  await app.render(h(ToggleMorph, { checked: true, id: "t" }));
  assert.equal(track.getAttribute("data-state"), "on");
  const samples = [];
  while (frames.pending > 0) {
    frames.flush(1);
    samples.push({
      p: Number(thumb.style.getPropertyValue("--neshel-toggle-p") || 1),
      s: Number(thumb.style.getPropertyValue("--neshel-toggle-stretch") || 0),
    });
  }
  assert.ok(
    samples.some(({ p }) => p > 0.2 && p < 0.8),
    "travels",
  );
  assert.ok(Math.max(...samples.map(({ s }) => s)) > 0.15, "stretches mid-travel");
  assert.equal(thumb.style.cssText, "", "CSS state takes over at rest");
  media.set(true);
  try {
    await app.render(h(ToggleMorph, { checked: false, id: "t" }));
    frames.flush(1);
    assert.equal(thumb.style.cssText, "", "instant under reduced motion");
  } finally {
    media.set(false);
  }
  await app.unmount();
});

test("<CheckboxDraw>: draws the mark on check; unchecking is instant", async () => {
  const app = await mount(h(CheckboxDraw, { checked: false, id: "c" }));
  const svg = app.container.querySelector("#c");
  await app.render(h(CheckboxDraw, { checked: true, id: "c" }));
  assert.ok(svg.querySelector(".neshel-checkbox-mark"));
  frames.flush(1);
  assert.equal(svg.style.getPropertyValue("--neshel-check-progress"), "0");
  frames.flush(6);
  const mid = Number(svg.style.getPropertyValue("--neshel-check-progress"));
  assert.ok(mid > 0 && mid < 1, `drawing ${mid}`);
  frames.settle();
  assert.equal(svg.style.cssText, "");
  await app.render(h(CheckboxDraw, { checked: false, id: "c" }));
  frames.flush(1);
  assert.equal(svg.querySelector(".neshel-checkbox-mark"), null);
  assert.equal(svg.style.cssText, "");
  await app.unmount();
});

test("<NumberTick>: counts in the aria-hidden copy without React renders; the accessible copy is final", async () => {
  let commits = 0;
  const tree = (value) =>
    h(
      Profiler,
      { id: "n", onRender: () => commits++ },
      h(NumberTick, { value, id: "n", duration: 300 }),
    );
  const app = await mount(tree(0));
  const [visual, accessible] = app.container.querySelector("#n").children;
  await app.render(tree(1000));
  const before = commits;
  assert.equal(accessible.textContent, "1,000", "accessible copy updated once, immediately");
  frames.flush(6);
  const mid = Number(visual.textContent.replace(/,/g, ""));
  assert.ok(mid > 0 && mid < 1000, `counting ${visual.textContent}`);
  frames.settle();
  assert.equal(visual.textContent, "1,000");
  assert.equal(commits, before, "no React commit while counting");
  await app.unmount();
});

test("<ContentSwap>: hidden inactive slot, CSS token while attached, reduced token live", async () => {
  const tree = (active) =>
    h(ContentSwap, { active, confirm: "Copied", id: "s", live: "polite" }, "Copy");
  const app = await mount(tree(false));
  const swap = app.container.querySelector("#s");
  assert.equal(swap.getAttribute("data-neshel-fx"), "content-swap");
  assert.equal(swap.getAttribute("aria-live"), "polite");
  const [idle, confirm] = swap.children;
  assert.equal(confirm.hidden, true);
  await app.render(tree(true));
  assert.equal(idle.hidden, true);
  assert.equal(confirm.hidden, false);
  media.set(true);
  assert.equal(swap.getAttribute("data-neshel-fx-reduced"), "content-swap");
  media.set(false);
  await app.unmount();
  assert.equal(swap.getAttribute("data-neshel-fx"), null);
});

// Issue #9: the swap must stay consistent through StrictMode's double setup and rapid state changes
// (the browser lab checks the CSS transitions themselves).
test("<ContentSwap>: StrictMode setup keeps the token; rapid toggles keep exactly one visible slot", async () => {
  const tree = (active) =>
    h(StrictMode, null, h(ContentSwap, { active, confirm: "Copied", id: "s2" }, "Copy"));
  const app = await mount(tree(false));
  const swap = app.container.querySelector("#s2");
  assert.equal(swap.getAttribute("data-neshel-fx"), "content-swap", "token after StrictMode setup");
  const [idle, confirm] = swap.children;
  for (const active of [true, false, true, true, false, true]) {
    await app.render(tree(active));
    assert.equal(swap.getAttribute("data-state"), active ? "active" : "idle");
    assert.equal(idle.hidden, active);
    assert.equal(confirm.hidden, !active);
    assert.equal(swap.getAttribute("data-neshel-fx"), "content-swap");
  }
  media.set(true);
  await app.render(tree(false));
  assert.equal(swap.getAttribute("data-neshel-fx-reduced"), "content-swap");
  assert.equal(idle.hidden, false);
  media.set(false);
  assert.equal(swap.getAttribute("data-neshel-fx-reduced"), null, "reduced token removed live");
  await app.unmount();
  assert.equal(swap.getAttribute("data-neshel-fx"), null);
});

test("hydration of decorative components matches server markup (no recoverable errors)", async () => {
  const { act } = await import("react");
  const { hydrateRoot } = await import("react-dom/client");
  const tree = h(
    "div",
    null,
    h(ToggleMorph, { checked: true }),
    h(CheckboxDraw, { checked: true }),
    h(NumberTick, { value: 42 }),
    h(ContentSwap, { active: true, confirm: "Done" }, "Do"),
    h(Press, { preset: [pressScale, ripple] }, "Press"),
  );
  const container = document.createElement("div");
  container.innerHTML = renderToString(tree);
  document.body.appendChild(container);
  const errors = [];
  let root;
  await act(async () => {
    root = hydrateRoot(container, tree, { onRecoverableError: (error) => errors.push(error) });
  });
  assert.deepEqual(errors, []);
  await act(async () => root.unmount());
  container.remove();
});

test("<Press preset={[pressScale, ripple]}> + Tilt3D compose on one element", async () => {
  const waapi = stubAnimate();
  try {
    const app = await mount(
      h(Press, { preset: [pressScale, ripple], asChild: true }, h("button", { id: "b" }, "Buy")),
    );
    const button = app.container.querySelector("#b");
    layoutBox(button, { width: 120, height: 40 });
    const tilt = attachEffect(button, tilt3D, { scale: 1.1, focusTilt: true });
    down(button, 60, 20);
    assert.ok(button.querySelector(".neshel-ripple"));
    frames.settle();
    assert.match(button.style.transform, /scale\(0\.96\)/);
    release();
    waapi.finishAll();
    frames.settle();
    tilt.destroy();
    await app.unmount();
    frames.flush(1);
    assert.equal(button.style.cssText, "");
    assert.equal(button.children.length, 0);
  } finally {
    waapi.restore();
  }
});
