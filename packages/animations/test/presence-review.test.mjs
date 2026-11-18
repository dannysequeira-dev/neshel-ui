// Phase 012 owner review (PR #10): regression tests for <Presence> written BEFORE any fix.
// 1. Re-entry during an exit when `enter` is absent or differs from `exit` (continuity, final visible state).
// 2. Consumer-owned `aria-hidden` / `inert` restored on re-entry (exiting content still never focusable).
// 3. Interrupted (discarded) React renders must not leave ghost or lost exits.
import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { Suspense } from "react";
import { run, settle, setupGestureDom } from "./gesture-helpers.mjs";
import { h, mount as mountView } from "./helpers.mjs";

await setupGestureDom();
const layout = await import("../dist/layout/index.js");
const entrance = await import("../dist/entrance/index.js");
const core = await import("../dist/core/index.js");
const { definePreset, getFrameScheduler } = core;
const { act } = await import("react");

// Every mounted view is unmounted after its test, even when an assertion fails (no cross-test state).
const views = new Set();
async function mount(element) {
  const view = await mountView(element);
  const unmount = view.unmount;
  view.unmount = async () => {
    if (!views.delete(view)) return;
    await unmount();
  };
  views.add(view);
  return view;
}
afterEach(async () => {
  for (const view of [...views]) await view.unmount();
  await act(async () => settle());
});

const fadeUp = definePreset("review-fade-up", entrance.fadeSlide, {
  direction: "up",
  duration: 200,
});
const grow = definePreset("review-scale", entrance.scaleIn, { from: 0.8, duration: 200 });

function List({ items, enter, exit, attrs = {} }) {
  return h(
    "ul",
    null,
    h(
      layout.Presence,
      { enter, exit, duration: 200 },
      items.map((item) => h("li", { key: item, id: `item-${item}`, ...(attrs[item] ?? {}) }, item)),
    ),
  );
}

const visible = (node) => node.style.opacity === "" && node.style.transform === "";
const opacity = (node) => (node.style.opacity === "" ? 1 : Number(node.style.opacity));

async function reenter(props) {
  const view = await mount(h(List, { items: ["a", "b"], ...props }));
  const b = view.container.querySelector("#item-b");
  await view.render(h(List, { items: ["a"], ...props }));
  await act(async () => run(4)); // partial exit
  const midExit = opacity(b);
  await view.render(h(List, { items: ["a", "b"], ...props }));
  await act(async () => run(1));
  const afterReentry = opacity(b);
  await act(async () => settle());
  return { view, b, midExit, afterReentry };
}

test("re-entry with only an `exit` preset: the item ends visible (not held at the exit pose)", async () => {
  const { view, b, midExit, afterReentry } = await reenter({ exit: fadeUp });
  assert.ok(midExit < 1, `the exit was running (${midExit})`);
  assert.equal(view.container.querySelector("#item-b"), b, "same node");
  assert.ok(Math.abs(afterReentry - midExit) < 0.25, `continuous: ${midExit} → ${afterReentry}`);
  assert.ok(visible(b), `visible at rest, got "${b.style.cssText}"`);
  assert.equal(b.getAttribute("aria-hidden"), null);
  await view.unmount();
  run(1);
  assert.equal(getFrameScheduler().size, 0);
});

test("re-entry with different `enter` and `exit` effects: continuous, visible at rest, no errors", async () => {
  const errors = [];
  const original = console.error;
  console.error = (...args) => errors.push(args.join(" "));
  try {
    const { view, b, midExit, afterReentry } = await reenter({ enter: grow, exit: fadeUp });
    assert.ok(midExit < 1, `the exit was running (${midExit})`);
    assert.ok(Math.abs(afterReentry - midExit) < 0.25, `continuous: ${midExit} → ${afterReentry}`);
    assert.ok(visible(b), `visible at rest, got "${b.style.cssText}"`);
    // A later exit still works and removes the node.
    await view.render(h(List, { items: ["a"], enter: grow, exit: fadeUp }));
    await act(async () => settle());
    assert.equal(view.container.querySelector("#item-b"), null);
    await view.unmount();
  } finally {
    console.error = original;
  }
  assert.deepEqual(errors, []);
});

test("re-entry with the same `enter` and `exit` preset keeps working (control)", async () => {
  const { view, b } = await reenter({ enter: fadeUp, exit: fadeUp });
  assert.ok(visible(b));
  await view.unmount();
});

test("consumer `aria-hidden` (React prop) survives an exit and re-entry", async () => {
  const attrs = { b: { "aria-hidden": "true" } };
  const view = await mount(h(List, { items: ["a", "b"], attrs }));
  const b = view.container.querySelector("#item-b");
  await view.render(h(List, { items: ["a"], attrs }));
  assert.equal(b.getAttribute("aria-hidden"), "true");
  assert.equal(b.inert, true, "exiting content is inert");
  await view.render(h(List, { items: ["a", "b"], attrs }));
  assert.equal(b.getAttribute("aria-hidden"), "true", "consumer value restored");
  assert.equal(b.inert, false);
  await act(async () => settle());
  await view.unmount();
});

test("consumer `inert` / `aria-hidden` set on the DOM survive an exit and re-entry", async () => {
  const view = await mount(h(List, { items: ["a", "b"] }));
  const b = view.container.querySelector("#item-b");
  b.inert = true;
  b.setAttribute("aria-hidden", "false");
  await view.render(h(List, { items: ["a"] }));
  assert.equal(b.inert, true);
  assert.equal(b.getAttribute("aria-hidden"), "true");
  await view.render(h(List, { items: ["a", "b"] }));
  assert.equal(b.inert, true, "consumer inert restored");
  assert.equal(b.getAttribute("aria-hidden"), "false", "consumer aria-hidden restored");
  await act(async () => settle());
  await view.unmount();
});

test("re-entry of an item without consumer state removes only what Presence added", async () => {
  const { view, b } = await reenter({});
  assert.equal(b.getAttribute("aria-hidden"), null);
  assert.equal(b.inert, false);
  assert.equal(b.getAttribute("data-neshel-presence"), null);
  await view.unmount();
});

// Interrupted render: a sibling suspends, so React discards the render in which `b` was added.
let pending;
let resolvePending;
function Gate({ wait }) {
  if (wait) {
    pending ??= new Promise((resolve) => {
      resolvePending = resolve;
    });
    throw pending;
  }
  return null;
}
function Suspended({ items, wait }) {
  return h(
    Suspense,
    { fallback: h("p", { id: "fallback" }, "…") },
    h(List, { items }),
    h(Gate, { wait }),
  );
}

test("a discarded render that added a key leaves no ghost exit once the key is gone", async () => {
  const view = await mount(h(Suspended, { items: ["a"], wait: false }));
  // This render adds `b`, but the boundary suspends: it is never committed with `b`.
  await view.render(h(Suspended, { items: ["a", "b"], wait: true }));
  assert.equal(view.container.querySelector("#item-b"), null, "b was never committed");
  // The next committed render no longer contains `b`.
  await view.render(h(Suspended, { items: ["a"], wait: false }));
  await act(async () => resolvePending?.());
  assert.equal(
    view.container.querySelector("#item-b"),
    null,
    "no ghost: b must never appear (even exiting)",
  );
  await act(async () => settle());
  await view.unmount();
});

test("a discarded render that removed a key does not lose it", async () => {
  pending = undefined;
  const view = await mount(h(Suspended, { items: ["a", "b"], wait: false }));
  const b = view.container.querySelector("#item-b");
  await view.render(h(Suspended, { items: ["a"], wait: true }));
  await view.render(h(Suspended, { items: ["a", "b"], wait: false }));
  await act(async () => resolvePending?.());
  await act(async () => settle());
  const now = view.container.querySelector("#item-b");
  assert.ok(now, "b is still rendered");
  assert.equal(now, b, "same node (not remounted)");
  assert.ok(
    visible(now) && now.getAttribute("aria-hidden") === null,
    `present and visible: ${now.style.cssText}`,
  );
  await view.unmount();
});

// Final QA of PR #10: React prop changes between exit and re-entry. The latest React intent must win for
// attributes React controls (removed, null, undefined, false); the DOM fallback applies only to attributes
// that were never React props.
async function exitAndReenter(before, after) {
  const view = await mount(h(List, { items: ["a", "b"], attrs: { b: before } }));
  const b = view.container.querySelector("#item-b");
  await view.render(h(List, { items: ["a"], attrs: { b: before } }));
  assert.equal(b.inert, true, "inert while exiting");
  assert.equal(b.getAttribute("aria-hidden"), "true", "hidden while exiting");
  await view.render(h(List, { items: ["a", "b"], attrs: { b: after } }));
  return { view, b };
}

test("React props removed with null / false on re-entry: no restriction remains", async () => {
  const { b } = await exitAndReenter(
    { "aria-hidden": "true", inert: true },
    { "aria-hidden": null, inert: false },
  );
  assert.equal(b.getAttribute("aria-hidden"), null, "aria-hidden removed as React asked");
  assert.equal(b.inert, false, "inert={false} wins");
});

test("React props explicitly undefined on re-entry: no restriction remains", async () => {
  const { b } = await exitAndReenter(
    { "aria-hidden": "true", inert: true },
    { "aria-hidden": undefined, inert: undefined },
  );
  assert.equal(b.getAttribute("aria-hidden"), null);
  assert.equal(b.inert, false);
});

test("React props omitted on re-entry (present on the exiting child): the latest intent wins", async () => {
  const { b } = await exitAndReenter({ "aria-hidden": "true", inert: true }, {});
  assert.equal(b.getAttribute("aria-hidden"), null);
  assert.equal(b.inert, false);
});

test('aria-hidden={false} on re-entry renders aria-hidden="false" (React semantics)', async () => {
  const { b } = await exitAndReenter({ "aria-hidden": "true" }, { "aria-hidden": false });
  assert.equal(b.getAttribute("aria-hidden"), "false");
});

test("React props added on re-entry win over the pre-exit DOM state", async () => {
  const { b } = await exitAndReenter({}, { "aria-hidden": "true", inert: true });
  assert.equal(b.getAttribute("aria-hidden"), "true");
  assert.equal(b.inert, true);
});

test("attributes set imperatively (never React props) keep the pre-exit DOM fallback", async () => {
  const view = await mount(h(List, { items: ["a", "b"] }));
  const b = view.container.querySelector("#item-b");
  b.inert = true;
  b.setAttribute("aria-hidden", "true");
  await view.render(h(List, { items: ["a"] }));
  await view.render(h(List, { items: ["a", "b"] }));
  assert.equal(b.inert, true);
  assert.equal(b.getAttribute("aria-hidden"), "true");
});

function Buttons({ items }) {
  return h(
    "ul",
    null,
    h(
      layout.Presence,
      { duration: 200 },
      items.map((item) => h("li", { key: item, id: `btn-${item}` }, h("button", null, item))),
    ),
  );
}

test("no focus leak: rapid exit / re-entry never leaves focus inside exiting content", async () => {
  const view = await mount(h(Buttons, { items: ["a", "b", "c"] }));
  const b = view.container.querySelector("#btn-b");
  for (let round = 0; round < 3; round++) {
    b.querySelector("button").focus();
    await view.render(h(Buttons, { items: ["a", "c"] }));
    assert.equal(b.getAttribute("data-neshel-presence"), "exiting");
    assert.equal(b.inert, true);
    assert.ok(
      !b.contains(document.activeElement),
      `round ${round}: focus moved out of the exiting item`,
    );
    await act(async () => run(2));
    await view.render(h(Buttons, { items: ["a", "b", "c"] }));
    assert.equal(b.inert, false, `round ${round}: interactive again after re-entry`);
  }
  await act(async () => settle());
  assert.equal(view.container.querySelector("#btn-b"), b, "same node throughout");
});
