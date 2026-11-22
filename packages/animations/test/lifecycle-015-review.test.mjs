// Phase 015 review (PR #16 comment 7085172024): lifecycle regressions written before the fixes.
// R1 — a destroyed toaster store must not resurrect toasts, timers or subscriptions.
// R2 — the comparison slider must release an active pointer capture when destroyed mid-drag.
import assert from "node:assert/strict";
import test from "node:test";
import { frames } from "./helpers.mjs";
import { setupMediaDom } from "./media-helpers.mjs";

await setupMediaDom();
const F = await import("../dist/feedback/index.js");
const M = await import("../dist/media/index.js");

test("R1 · show() after destroy() creates no toast, no timer and notifies nobody", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"] });
  const before = F.getFeedbackDebugInfo().timers;
  const toaster = F.createToaster();
  let calls = 0;
  toaster.subscribe(() => calls++);
  toaster.show({ title: "kept", duration: 4000 });
  assert.equal(F.getFeedbackDebugInfo().timers, before + 1);
  toaster.destroy();
  assert.equal(F.getFeedbackDebugInfo().timers, before, "destroy clears the timer");
  calls = 0;
  const id = toaster.show({ title: "late", duration: 4000 });
  assert.equal(id, "", "a destroyed store returns no toast id");
  assert.equal(toaster.toasts.length, 0, "no record is created");
  assert.equal(F.getFeedbackDebugInfo().timers, before, "no timer is scheduled");
  t.mock.timers.tick(60000);
  assert.equal(calls, 0, "no callback reaches the old listeners");
  assert.throws(() => toaster.show({ title: "" }), /title/, "invalid input still throws");
  t.mock.timers.reset();
});

test("R1 · subscribe() after destroy() registers nothing and returns an inert unsubscribe", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"] });
  const toaster = F.createToaster();
  toaster.destroy();
  let calls = 0;
  const unsubscribe = toaster.subscribe(() => calls++);
  assert.equal(typeof unsubscribe, "function");
  toaster.show({ title: "late" });
  toaster.dismissAll();
  toaster.pause("hover");
  toaster.resume("hover");
  toaster.protect("x");
  toaster.dismiss("x");
  assert.equal(calls, 0, "no notification after destroy");
  assert.equal(toaster.paused, false, "pause reasons are not collected after destroy");
  unsubscribe();
  t.mock.timers.reset();
});

test("R1 · destroy() is idempotent and keeps the live counters balanced", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"] });
  const base = F.getFeedbackDebugInfo();
  const toaster = F.createToaster();
  toaster.show({ title: "a", duration: 2000 });
  toaster.pause();
  toaster.show({ title: "b", duration: 2000 });
  toaster.resume();
  toaster.destroy();
  toaster.destroy();
  toaster.show({ title: "c" });
  toaster.destroy();
  const after = F.getFeedbackDebugInfo();
  assert.equal(after.toasters, base.toasters, "the store is counted once and released once");
  assert.equal(after.timers, base.timers, "no timer survives");
  t.mock.timers.tick(60000);
  assert.equal(F.getFeedbackDebugInfo().timers, base.timers, "no late timer callback");
  t.mock.timers.reset();
});

// --- R2: pointer capture --------------------------------------------------------------------------------

/** A root with a faithful pointer-capture model (one captured pointer set; release throws when absent). */
function captureDom() {
  const root = document.body.appendChild(document.createElement("div"));
  root.innerHTML = '<div data-neshel-compare-after></div><input type="range" aria-label="Compare">';
  root.getBoundingClientRect = () => ({
    left: 0,
    top: 0,
    width: 200,
    height: 100,
    right: 200,
    bottom: 100,
    x: 0,
    y: 0,
  });
  const captured = new Set();
  root.setPointerCapture = (id) => captured.add(id);
  root.hasPointerCapture = (id) => captured.has(id);
  root.releasePointerCapture = (id) => {
    if (!captured.delete(id)) throw new window.DOMException("not captured", "NotFoundError");
  };
  return { root, captured };
}
const pointer = (type, id, x = 50) =>
  new window.PointerEvent(type, {
    clientX: x,
    clientY: 50,
    button: 0,
    pointerId: id,
    bubbles: true,
  });

test("R2 · destroy() during a drag releases the captured pointer", () => {
  const { root, captured } = captureDom();
  const control = M.createCompareSlider(root);
  root.dispatchEvent(pointer("pointerdown", 7, 120));
  assert.equal(captured.has(7), true, "the drag captures the pointer");
  control.destroy();
  assert.equal(captured.has(7), false, "destroy releases the capture");
  assert.doesNotThrow(() => control.destroy(), "a second destroy is safe");
  frames.flush(1);
  root.remove();
});

test("R2 · destroy() after the browser already dropped the capture does not throw", () => {
  const { root, captured } = captureDom();
  const control = M.createCompareSlider(root);
  root.dispatchEvent(pointer("pointerdown", 3));
  captured.clear(); // lost capture (element moved, implicit release)
  assert.doesNotThrow(() => control.destroy());
  frames.flush(1);
  root.remove();
});

test("R2 · pointercancel ends the drag and releases the capture; later presses work", () => {
  const { root, captured } = captureDom();
  const values = [];
  const control = M.createCompareSlider(root, { onValueChange: (v) => values.push(v) });
  root.dispatchEvent(pointer("pointerdown", 4, 100));
  root.dispatchEvent(pointer("pointercancel", 4));
  assert.equal(captured.has(4), false);
  root.dispatchEvent(pointer("pointermove", 4, 20));
  assert.deepEqual(values, [], "no movement after cancel (50 → 50 is not a change)");
  root.dispatchEvent(pointer("pointerdown", 5, 40));
  assert.equal(captured.has(5), true, "a new press captures again");
  root.dispatchEvent(pointer("pointerup", 5, 40));
  assert.equal(captured.size, 0);
  assert.deepEqual(values, [20]);
  control.destroy();
  frames.flush(1);
  root.remove();
});
