// Feature 017, PR #18 final review — R1 (pause and protection ownership per Toaster) and R2 (destroy() while a
// Toaster is mounted). Written before the fixes.
import assert from "node:assert/strict";
import test from "node:test";
import { act, StrictMode } from "react";
import { h, mount, ui } from "./helpers.mjs";

const { createToaster, Toaster } = ui;
const { toastCounters } = await import("../dist/toast-store.js");

async function frames(n = 2) {
  for (let i = 0; i < n; i++)
    await act(async () => {
      await new Promise((resolve) => requestAnimationFrame(() => resolve()));
    });
}

function setHidden(value) {
  Object.defineProperty(document, "hidden", { configurable: true, get: () => value });
  document.dispatchEvent(new window.Event("visibilitychange"));
}
const regionOf = (view) => view.container.querySelector("section.neshel-toaster");

/** React derives pointerenter/pointerleave from pointerover/pointerout with a relatedTarget. */
function pointer(region, type) {
  region.dispatchEvent(
    new window.PointerEvent(type, { bubbles: true, relatedTarget: document.body }),
  );
}
const hover = (region) => act(async () => pointer(region, "pointerover"));
const leave = (region) => act(async () => pointer(region, "pointerout"));

const views = new Set();
async function mountToaster(element) {
  const view = await mount(element);
  const unmount = view.unmount;
  view.unmount = async () => {
    if (views.delete(view)) await unmount();
  };
  views.add(view);
  return view;
}
test.afterEach(async () => {
  setHidden(false);
  for (const view of [...views]) await view.unmount();
});

for (const strict of [false, true]) {
  const wrap = (element) => (strict ? h(StrictMode, null, element) : element);
  const mode = strict ? "StrictMode" : "plain";

  test(`R1 (${mode}) · hidden page: unmounting one Toaster keeps the pause of the other`, async () => {
    const toaster = createToaster();
    const first = await mountToaster(wrap(h(Toaster, { toaster })));
    const second = await mountToaster(wrap(h(Toaster, { toaster })));
    await act(async () => setHidden(true));
    assert.equal(toaster.paused, true);
    await first.unmount();
    assert.equal(toaster.paused, true, "the mounted Toaster still pauses on the hidden page");
    await act(async () => setHidden(false));
    assert.equal(toaster.paused, false, "the last owner releases the pause");
    await act(async () => setHidden(true));
    await second.unmount();
    assert.equal(toaster.paused, false, "unmounting the last owner leaves nothing paused");
    toaster.destroy();
  });

  test(`R1 (${mode}) · hover: timers resume only when no Toaster is hovered`, async () => {
    const toaster = createToaster();
    const first = await mountToaster(wrap(h(Toaster, { toaster })));
    const second = await mountToaster(wrap(h(Toaster, { toaster })));
    await hover(regionOf(first));
    await hover(regionOf(second));
    await leave(regionOf(first));
    assert.equal(toaster.paused, true, "the second Toaster is still hovered");
    await leave(regionOf(second));
    assert.equal(toaster.paused, false);
    await hover(regionOf(first));
    await hover(regionOf(second));
    await second.unmount();
    assert.equal(toaster.paused, true, "unmounting one does not release the hover of the other");
    await first.unmount();
    assert.equal(toaster.paused, false);
    toaster.destroy();
  });

  test(`R2 (${mode}) · destroy() while mounted clears the UI and timers; later calls are inert`, async () => {
    const timers = toastCounters.timers;
    const toaster = createToaster();
    const view = await mountToaster(wrap(h(Toaster, { toaster })));
    const region = regionOf(view);
    await act(async () => {
      toaster.show({ title: "One" });
      toaster.show({ title: "Two", tone: "error" });
    });
    await frames();
    assert.equal(region.querySelectorAll(".neshel-toast").length, 2);
    await act(async () => toaster.destroy());
    assert.equal(
      region.querySelectorAll('.neshel-toast[data-state="open"]').length,
      0,
      "leaves at once, without another render cause",
    );
    await frames(3);
    assert.equal(region.querySelectorAll(".neshel-toast").length, 0, "no stale toast in the DOM");
    assert.equal(toastCounters.timers, timers, "no timer survives");
    await act(async () => {
      toaster.destroy();
      assert.equal(toaster.show({ title: "late" }), "");
      setHidden(true);
    });
    await hover(region);
    assert.equal(toaster.paused, false, "a mounted Toaster cannot pause a destroyed store");
    assert.equal(region.querySelectorAll(".neshel-toast").length, 0);
  });
}

test("R1 · timers: the remaining time is honoured once the last hovered Toaster is left", async (t) => {
  const toaster = createToaster();
  const first = regionOf(await mountToaster(h(Toaster, { toaster })));
  const second = regionOf(await mountToaster(h(Toaster, { toaster })));
  t.mock.timers.enable({ apis: ["setTimeout", "Date"] });
  toaster.show({ title: "Timed", duration: 4000 });
  t.mock.timers.tick(1000);
  pointer(first, "pointerover");
  pointer(second, "pointerover");
  pointer(first, "pointerout");
  t.mock.timers.tick(20000);
  assert.equal(toaster.toasts.length, 1, "still paused by the second Toaster");
  pointer(second, "pointerout");
  t.mock.timers.tick(2999);
  assert.equal(toaster.toasts.length, 1);
  t.mock.timers.tick(1);
  assert.equal(toaster.toasts.length, 0, "remaining 3000 ms honoured");
  t.mock.timers.reset();
  toaster.destroy();
});

test("R1 · consumer reasons named like the internal ones stay independent", async () => {
  const toaster = createToaster();
  const view = await mountToaster(h(Toaster, { toaster }));
  for (const reason of ["hidden", "hover", "focus", undefined]) {
    toaster.pause(reason);
    await hover(regionOf(view));
    await leave(regionOf(view));
    await act(async () => setHidden(true));
    await act(async () => setHidden(false));
    assert.equal(toaster.paused, true, `the consumer's ${reason ?? "manual"} pause was released`);
    toaster.resume(reason);
    assert.equal(toaster.paused, false);
  }
  toaster.pause("hover");
  await view.unmount();
  assert.equal(toaster.paused, true, "unmount keeps a consumer pause");
  toaster.destroy();
});

test("R1 · unmounting another Toaster keeps the focused toast protected and its focus pause", async () => {
  const toaster = createToaster({ max: 2 });
  const first = await mountToaster(h(Toaster, { toaster }));
  const second = await mountToaster(h(Toaster, { toaster }));
  await act(async () => toaster.show({ id: "old", title: "Old" }));
  await frames();
  await act(async () => regionOf(second).querySelector(".neshel-toast").focus());
  assert.equal(toaster.paused, true);
  await first.unmount();
  assert.equal(toaster.paused, true, "the focus pause belongs to the second Toaster");
  await act(async () => {
    toaster.show({ id: "mid", title: "Mid" });
    toaster.show({ id: "new", title: "New" });
  });
  assert.deepEqual(
    toaster.toasts.map((x) => x.id),
    ["old", "new"],
    "the focused toast is still protected",
  );
  await second.unmount();
  assert.equal(toaster.paused, false);
  toaster.destroy();
});

test("R1 · changing the hotkey does not release an active hover pause", async () => {
  const toaster = createToaster();
  const view = await mountToaster(h(Toaster, { toaster, hotkey: "F8" }));
  await hover(regionOf(view));
  await view.rerender(h(Toaster, { toaster, hotkey: "F9" }));
  assert.equal(toaster.paused, true);
  await leave(regionOf(view));
  assert.equal(toaster.paused, false);
  toaster.destroy();
});

test("R2 · destroy() notifies subscribers once with the final empty snapshot, then never again", () => {
  const toaster = createToaster({ max: 1, overflow: "queue" });
  toaster.show({ title: "a" });
  toaster.show({ title: "b" });
  const seen = [];
  toaster.subscribe(() => {
    seen.push([toaster.toasts.length, toaster.queued.length, toaster.paused]);
    assert.equal(toaster.show({ title: "reentrant" }), "", "already inert while notifying");
    toaster.destroy();
  });
  toaster.pause();
  toaster.destroy();
  toaster.destroy();
  toaster.dismissAll();
  assert.deepEqual(seen, [[0, 0, false]]);
});
