// Feature 017 — Toast/Toaster in @neshel-ui/components (contracts/toast-api.md). Migrated from the Phase 015
// Animations F06 tests (store timing, regions, single announcement, Escape, hotkey, hover, destroy) plus the
// Components additions: warning tone, queue overflow, several Toasters on one store, placement/motion, SSR.
import assert from "node:assert/strict";
import test from "node:test";
import { act, StrictMode } from "react";
import { h, markup, mount, renderToString, ui } from "./helpers.mjs";

const { createToaster, Toaster } = ui;
const internal = await import("../dist/toast-store.js");

/** jsdom (pretendToBeVisual) runs requestAnimationFrame on a ~16 ms timer. */
async function frames(n = 2) {
  for (let i = 0; i < n; i++)
    await act(async () => {
      await new Promise((resolve) => requestAnimationFrame(() => resolve()));
    });
}

test("store · accessible timing, pause/resume with remaining time, overflow evicts the oldest unprotected", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"] });
  assert.equal(internal.autoDuration({ title: "Saved" }), 6300);
  assert.equal(
    internal.autoDuration({ title: "x", action: { label: "Undo", onAction() {} } }),
    Number.POSITIVE_INFINITY,
  );
  const toaster = createToaster({ max: 2 });
  toaster.show({ title: "A", duration: 4000 });
  t.mock.timers.tick(3000);
  toaster.pause("hover");
  t.mock.timers.tick(10000);
  assert.equal(toaster.toasts.length, 1, "paused timers do not fire");
  toaster.resume("hover");
  t.mock.timers.tick(999);
  assert.equal(toaster.toasts.length, 1);
  t.mock.timers.tick(1);
  assert.equal(toaster.toasts.length, 0, "remaining time honoured");
  const b = toaster.show({ title: "B", duration: Number.POSITIVE_INFINITY });
  toaster.protect(b);
  toaster.show({ title: "C" });
  toaster.show({ title: "D" });
  assert.deepEqual(
    toaster.toasts.map((x) => x.title),
    ["B", "D"],
    "focused toast protected",
  );
  const again = toaster.show({ id: b, title: "B2" });
  assert.equal(again, b);
  assert.equal(toaster.toasts.find((x) => x.id === b).version, 1);
  assert.throws(() => toaster.show({ title: "" }), /\[@neshel-ui\/components\].*title/);
  assert.throws(() => toaster.show({ title: "x", tone: "info" }), /tone/);
  assert.throws(() => toaster.show({ title: "x", action: { label: " ", onAction() {} } }), /label/);
  assert.equal(
    toaster.show({ title: "W", tone: "warning", duration: 10 }),
    toaster.toasts.at(-1).id,
  );
  assert.equal(toaster.toasts.at(-1).duration, 1000, "duration clamped to 1000 ms");
  toaster.destroy();
  assert.equal(internal.toastCounters.timers, 0, "no timer left behind");
  t.mock.timers.reset();
});

test("store · overflow: queue waits for a free slot; queued toasts have no timer until shown", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"] });
  const toaster = createToaster({ max: 1, overflow: "queue" });
  let calls = 0;
  toaster.subscribe(() => calls++);
  const a = toaster.show({ title: "A", duration: 2000 });
  const b = toaster.show({ title: "B", duration: 2000 });
  toaster.show({ title: "C", duration: 2000 });
  assert.deepEqual(
    toaster.toasts.map((x) => x.title),
    ["A"],
  );
  assert.deepEqual(
    toaster.queued.map((x) => x.title),
    ["B", "C"],
  );
  assert.equal(internal.toastCounters.timers, 1, "only the visible toast runs a timer");
  toaster.show({ id: b, title: "B2", duration: 2000 });
  assert.equal(toaster.queued[0].title, "B2", "re-show of a queued id replaces it in place");
  t.mock.timers.tick(2000);
  assert.deepEqual(
    toaster.toasts.map((x) => x.title),
    ["B2"],
    "promoted after A expired",
  );
  toaster.dismiss(toaster.queued[0].id);
  assert.equal(toaster.queued.length, 0, "a queued toast can be dismissed");
  toaster.dismissAll();
  assert.equal(toaster.toasts.length + toaster.queued.length, 0);
  assert.ok(calls >= 5);
  toaster.destroy();
  assert.equal(internal.toastCounters.timers, 0);
  void a;
  t.mock.timers.reset();
});

test("store · destroyed store is inert; destroy is idempotent; invalid input still throws", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"] });
  const stores = internal.toastCounters.stores;
  const toaster = createToaster();
  assert.equal(internal.toastCounters.stores, stores + 1);
  let calls = 0;
  toaster.subscribe(() => calls++);
  toaster.show({ title: "kept", duration: 4000 });
  toaster.destroy();
  toaster.destroy();
  const before = calls;
  assert.equal(toaster.show({ title: "late", duration: 4000 }), "");
  assert.equal(toaster.toasts.length, 0);
  assert.throws(() => toaster.show({ title: "" }), /title/);
  const unsubscribe = toaster.subscribe(() => calls++);
  toaster.dismissAll();
  toaster.pause("hover");
  toaster.resume("hover");
  toaster.protect("x");
  toaster.dismiss("x");
  unsubscribe();
  assert.equal(toaster.paused, false);
  assert.equal(calls, before, "nobody is notified after destroy");
  assert.equal(internal.toastCounters.timers, 0);
  assert.equal(internal.toastCounters.stores, stores, "counted once and released once");
  t.mock.timers.reset();
});

test("Toaster · SSR renders the region and both live regions; no toast markup without toasts", () => {
  const toaster = createToaster();
  const html = markup(h(Toaster, { toaster }));
  assert.match(html, /^<section[^>]*class="neshel-toaster"/);
  assert.match(html, /aria-label="Notifications"/);
  assert.match(html, /data-placement="bottom-end"/);
  assert.match(html, /data-motion="css"/);
  assert.match(html, /role="status" aria-live="polite"/);
  assert.match(html, /role="alert"/);
  assert.doesNotMatch(html, /neshel-toast"/);
  toaster.destroy();
});

test("Toaster · hydration of server markup produces no warnings", async () => {
  const toaster = createToaster();
  toaster.show({ id: "s", title: "Server", duration: Number.POSITIVE_INFINITY });
  const html = renderToString(h(Toaster, { toaster, placement: "top-start" }));
  const container = document.createElement("div");
  container.innerHTML = html;
  document.body.appendChild(container);
  const errors = [];
  const original = console.error;
  console.error = (...args) => {
    const message = String(args[0]);
    // Node runtime notices (e.g. Node 22's MockTimers ExperimentalWarning) are not React output.
    if (!/^(node:d+)|ExperimentalWarning/.test(message)) errors.push(message);
  };
  const { hydrateRoot } = await import("react-dom/client");
  let root;
  await act(async () => {
    root = hydrateRoot(container, h(Toaster, { toaster, placement: "top-start" }));
  });
  console.error = original;
  await act(async () => root.unmount());
  container.remove();
  toaster.destroy();
  assert.deepEqual(errors, [], "hydration mismatch");
});

test("Toaster · regions exist before content; one announcement per toast; Escape closes after the exit", async () => {
  const toaster = createToaster();
  const view = await mount(h(StrictMode, null, h(Toaster, { toaster })));
  const region = view.container.querySelector("section.neshel-toaster");
  const polite = region.querySelector('[role="status"]');
  const alert = region.querySelector('[role="alert"]');
  assert.ok(polite && alert, "live regions are present before any toast");
  let id;
  await act(async () => {
    id = toaster.show({ title: "Saved", description: "Draft stored" });
  });
  await frames();
  const item = region.querySelector(".neshel-toast");
  assert.equal(item.getAttribute("data-state"), "open");
  assert.equal(item.getAttribute("data-tone"), "neutral");
  assert.equal(polite.textContent, "Saved. Draft stored");
  assert.ok(item.querySelector('button[aria-label="Close"]'), "close button labelled");
  await act(async () => {
    toaster.show({ title: "Failed", tone: "error" });
  });
  assert.equal(alert.textContent, "Failed", "errors go to the alert region");
  assert.equal(polite.querySelectorAll("p").length, 1, "no duplicate announcement on re-render");
  // jsdom has no Web Animations: stand in for the exit transition the closing state starts.
  let endExit;
  const exitAnimation = { finished: new Promise((resolve) => (endExit = resolve)) };
  item.getAnimations = () => [exitAnimation];
  item.focus();
  await act(async () => {
    item.dispatchEvent(
      new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }),
    );
  });
  assert.equal(
    toaster.toasts.some((x) => x.id === id),
    false,
  );
  const closing = region.querySelector(`[data-id="${id}"]`);
  assert.equal(closing.getAttribute("data-state"), "closing", "exit state before removal");
  assert.equal(closing.hasAttribute("inert"), true);
  await frames();
  assert.ok(region.querySelector(`[data-id="${id}"]`), "kept while its exit animation runs");
  await act(async () => endExit());
  assert.equal(region.querySelector(`[data-id="${id}"]`), null, "removed once the exit finished");
  await view.unmount();
  toaster.destroy();
});

test("Toaster · re-show during exit re-enters; dismiss during enter; overflow — one announcement each", async () => {
  const toaster = createToaster({ max: 2 });
  const view = await mount(h(Toaster, { toaster }));
  const region = view.container.querySelector("section");
  const polite = region.querySelector('[role="status"]');
  await act(async () => {
    const id = toaster.show({ id: "t1", title: "First" });
    toaster.dismiss(id);
  });
  await act(async () => {
    toaster.show({ id: "t1", title: "First again" });
  });
  await frames();
  assert.equal(region.querySelector('[data-id="t1"]').getAttribute("data-state"), "open");
  await act(async () => {
    toaster.show({ title: "Second" });
    toaster.show({ title: "Third" });
  });
  assert.equal(toaster.toasts.length, 2);
  assert.deepEqual(
    [...polite.querySelectorAll("p")].map((p) => p.textContent),
    ["First again", "Second", "Third"],
  );
  await view.unmount();
  toaster.destroy();
});

test("Toaster · two Toasters on one store announce each toast once; the next takes over on unmount", async () => {
  const toaster = createToaster();
  const first = await mount(h(Toaster, { toaster, label: "A" }));
  const second = await mount(h(Toaster, { toaster, label: "B" }));
  const lines = () =>
    [first.container, second.container].reduce(
      (n, c) => n + c.querySelectorAll('.neshel-toaster [role="status"] p').length,
      0,
    );
  await act(async () => {
    toaster.show({ title: "Once" });
  });
  assert.equal(lines(), 1, "announced once across both regions");
  await first.unmount();
  await act(async () => {
    toaster.show({ title: "Twice" });
  });
  assert.equal(
    second.container.querySelector('[role="status"]').textContent,
    "Twice",
    "the remaining Toaster announces",
  );
  await second.unmount();
  toaster.destroy();
});

test("Toaster · hotkey moves focus to the toasts; hover/focus pause; action runs and closes; unmount resumes", async () => {
  const toaster = createToaster();
  const outside = document.createElement("button");
  document.body.appendChild(outside);
  outside.focus();
  let acted = 0;
  const view = await mount(h(Toaster, { toaster, hotkey: "F8", motion: "none" }));
  assert.equal(view.container.querySelector("section").getAttribute("data-motion"), "none");
  await act(async () => {
    toaster.show({ title: "One", action: { label: "Undo", onAction: () => acted++ } });
  });
  await frames();
  assert.equal(toaster.toasts[0].duration, Number.POSITIVE_INFINITY, "action → persistent");
  await act(async () => {
    window.dispatchEvent(new window.KeyboardEvent("keydown", { key: "F8", cancelable: true }));
  });
  assert.ok(document.activeElement?.classList.contains("neshel-toast"));
  assert.equal(toaster.paused, true, "focus pauses");
  const region = view.container.querySelector("section");
  await act(async () => {
    region.querySelector(".neshel-toast-action").click();
  });
  assert.equal(acted, 1);
  assert.equal(toaster.toasts.length, 0, "the action closes its toast");
  assert.equal(document.activeElement, outside, "focus returns where it came from");
  await view.unmount();
  assert.equal(toaster.paused, false, "unmount resumes every reason");
  outside.remove();
  toaster.destroy();
});

test("Toaster · invalid placement/motion are reported like other Components props", () => {
  const toaster = createToaster();
  assert.throws(() => markup(h(Toaster, { toaster, placement: "middle" })), /<Toaster>.*placement/);
  assert.throws(() => markup(h(Toaster, { toaster, motion: "fast" })), /<Toaster>.*motion/);
  toaster.destroy();
});
