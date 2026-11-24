// Feature 017 — F06 after the Toast migration (contracts/f06-enter-exit.md): generic enter/exit motion for list
// items another component owns. No store, no roles, no timers: only data-state + the `neshel-exit` DOM contract,
// written through the Motion Host and restored exactly.
import assert from "node:assert/strict";
import test from "node:test";
import { act, StrictMode, useState } from "react";
import { frames, h, mount, setupDom } from "./helpers.mjs";
import { microtasks, setupMediaDom } from "./media-helpers.mjs";

const { media } = await setupDom();
await setupMediaDom();
for (const key of ["MutationObserver", "getComputedStyle"]) globalThis[key] ??= window[key];
const F = await import("../dist/feedback/index.js");

function list(states = []) {
  const container = document.createElement("ol");
  for (const [index, state] of states.entries()) {
    const item = document.createElement("li");
    item.dataset.state = state;
    item.textContent = `item ${index}`;
    container.append(item);
  }
  document.body.append(container);
  return container;
}

function addItem(container, state = "entering") {
  const item = document.createElement("li");
  item.dataset.state = state;
  container.append(item);
  return item;
}

function exit(item) {
  const promises = [];
  item.dispatchEvent(
    new window.CustomEvent("neshel-exit", {
      bubbles: true,
      detail: { waitUntil: (promise) => promises.push(promise) },
    }),
  );
  return promises;
}

/** [x, y] of the composed transform (the host writes translate3d). */
const translate = (item) => {
  const match = /translate3d\(([-\d.]+)px, ([-\d.]+)px/.exec(item.style.transform);
  return match ? [Number(match[1]), Number(match[2])] : [0, 0];
};
const translateY = (item) => translate(item)[1];

test("F06 · items present at creation are left alone; a new entering item slides/fades in and is restored", async () => {
  const container = list(["open"]);
  const existing = container.firstElementChild;
  existing.style.opacity = "0.9";
  const control = F.createEnterExit(container, { from: "bottom", distance: 20, duration: 200 });
  frames.flush(1);
  assert.equal(existing.style.opacity, "0.9", "an already open item is not animated");
  const item = addItem(container);
  item.style.color = "red";
  await microtasks();
  frames.flush(1);
  assert.ok(Number(item.style.opacity) < 0.2, `starts hidden (${item.style.opacity})`);
  assert.ok(translateY(item) > 15, `starts below (${item.style.transform})`);
  frames.flush(6);
  const mid = Number(item.style.opacity);
  assert.ok(mid > 0 && mid < 1, `fades in (${mid})`);
  frames.settle();
  assert.equal(item.style.opacity, "", "opacity contribution cleared at the end");
  assert.equal(item.style.transform, "", "transform layer cleared at the end");
  assert.equal(item.style.color, "red", "other inline styles untouched");
  assert.equal(control.size, 2);
  control.destroy();
  frames.flush(1);
  assert.equal(existing.style.opacity, "0.9", "original inline opacity restored");
  container.remove();
});

test("F06 · neshel-exit: the owner waits through waitUntil; the hidden pose holds until the owner removes the item", async () => {
  const container = list();
  const control = F.createEnterExit(container, { exitTo: "end", duration: 160 });
  const item = addItem(container, "open");
  await microtasks();
  frames.settle();
  let finished = false;
  const [promise] = exit(item);
  assert.ok(promise, "waitUntil received a promise");
  promise.then(() => {
    finished = true;
  });
  frames.flush(3);
  await microtasks();
  assert.equal(finished, false, "still exiting");
  assert.ok(translate(item)[0] > 0, `moves towards the inline end (${item.style.transform})`);
  frames.settle();
  await microtasks();
  assert.equal(finished, true, "resolved when the exit completed");
  assert.equal(item.style.opacity, "0", "hidden pose held while the owner removes it");
  item.remove();
  await microtasks();
  frames.flush(1); // the host restores in its next write phase
  assert.equal(control.size, 0, "a removed item is released");
  assert.equal(item.style.opacity, "", "and its styles restored");
  control.destroy();
  container.remove();
});

test("F06 · data-state=closing without the event also exits; returning to open re-enters from where it is", async () => {
  const container = list();
  const control = F.createEnterExit(container, { duration: 200 });
  const item = addItem(container, "open");
  await microtasks();
  frames.settle();
  item.dataset.state = "closing";
  await microtasks();
  frames.flush(4);
  const during = Number(item.style.opacity);
  assert.ok(during > 0 && during < 1, `exiting (${during})`);
  item.dataset.state = "open";
  await microtasks();
  frames.flush(1);
  assert.ok(Number(item.style.opacity || 1) >= during, "re-enters without jumping back to hidden");
  frames.settle();
  assert.equal(item.style.opacity, "");
  const [late] = exit(item);
  frames.settle();
  await microtasks();
  await late;
  item.dataset.state = "closing";
  await microtasks();
  const [already] = exit(item);
  await already; // resolves at once: the item already reached its exit pose
  control.destroy();
  container.remove();
});

test("F06 · reduced motion (live): opacity only, no transform", async () => {
  const container = list();
  const control = F.createEnterExit(container, { distance: 30 });
  media.set(true);
  const item = addItem(container);
  await microtasks();
  frames.flush(2);
  assert.ok(Number(item.style.opacity) < 1, "still fades");
  assert.equal(item.style.transform, "", "no movement when motion is reduced");
  frames.settle();
  media.set(false);
  control.destroy();
  container.remove();
});

test("F06 · destroy is idempotent: stops observing, releases waiters, restores styles, balances the counter", async () => {
  const base = F.getFeedbackDebugInfo().enterExit;
  const container = list();
  const control = F.createEnterExit(container);
  assert.equal(F.getFeedbackDebugInfo().enterExit, base + 1);
  const item = addItem(container, "open");
  await microtasks();
  frames.settle();
  const [pending] = exit(item);
  frames.flush(2);
  control.destroy();
  control.destroy();
  await pending; // released by destroy
  frames.flush(1); // the host restores in its next write phase
  assert.equal(item.style.opacity, "");
  assert.equal(item.style.transform, "");
  addItem(container);
  await microtasks();
  frames.settle();
  assert.equal(control.size, 0, "no tracking after destroy");
  assert.equal(F.getFeedbackDebugInfo().enterExit, base);
  assert.equal(frames.pending, 0, "no frame left scheduled");
  container.remove();
});

test("F06 · validation: closed option sets, bounded distance, element container", () => {
  const container = list();
  assert.throws(() => F.createEnterExit(container, { from: "left" }), /createEnterExit.*from/);
  assert.throws(() => F.createEnterExit(container, { distance: 500 }), /distance/);
  assert.throws(() => F.createEnterExit(container, { selector: "" }), /selector/);
  assert.throws(() => F.createEnterExit(null), /container/);
  container.remove();
});

function OwnedList({ items, ref }) {
  return h(
    "ol",
    { id: "owned", ref },
    items.map(([id, state]) => h("li", { key: id, "data-state": state, "data-id": id }, id)),
  );
}

function App() {
  const [items, setItems] = useState([["a", "open"]]);
  App.set = setItems;
  return h(F.EnterExit, { from: "top", duration: 120 }, h(OwnedList, { items }));
}

test("F06 · <EnterExit> wraps the owner's list (StrictMode): enter on add, exit on closing, cleanup on unmount", async () => {
  const view = await mount(h(StrictMode, null, h(App)));
  const listEl = view.container.querySelector("#owned");
  await act(async () =>
    App.set([
      ["a", "open"],
      ["b", "entering"],
    ]),
  );
  await microtasks();
  frames.flush(1);
  const b = listEl.querySelector('[data-id="b"]');
  assert.ok(Number(b.style.opacity) < 1, "new item enters");
  assert.ok(translateY(b) < 0, `from the top (${b.style.cssText})`);
  frames.settle();
  await act(async () =>
    App.set([
      ["a", "closing"],
      ["b", "open"],
    ]),
  );
  await microtasks();
  frames.flush(2);
  const a = listEl.querySelector('[data-id="a"]');
  assert.ok(Number(a.style.opacity) < 1, "closing item exits");
  await view.unmount();
  frames.flush(1);
  assert.equal(a.style.opacity, "", "unmount restores");
  assert.equal(frames.settle(), frames.settle(), "no frame loop left");
});
