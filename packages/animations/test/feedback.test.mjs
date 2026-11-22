// Phase 015 — Loading & Feedback (F01–F10; contracts/feedback-api.md). Semantics first: roles, names, values,
// hidden decorations, single announcements, blocked activation, rollback.
import assert from "node:assert/strict";
import test from "node:test";
import { act, StrictMode } from "react";
import { frames, h, markup, mount } from "./helpers.mjs";
import { microtasks, setupMediaDom } from "./media-helpers.mjs";

await setupMediaDom();
const F = await import("../dist/feedback/index.js");
const { motionValue, getFrameScheduler } = await import("../dist/core/index.js");

test("F01/F04 · indeterminate indicators: progressbar with a name and no value; decorative hides them", () => {
  const html = markup(
    h("div", null, [
      h(F.Spinner, { key: 1 }),
      h(F.DotsPulse, { key: 2, label: "Saving" }),
      h(F.Spinner, { key: 3, decorative: true }),
    ]),
  );
  assert.match(html, /<span class="neshel-spinner" role="progressbar" aria-label="Loading">/);
  assert.match(html, /<span class="neshel-dots" role="progressbar" aria-label="Saving">/);
  assert.match(html, /<span class="neshel-spinner" aria-hidden="true">/);
  assert.doesNotMatch(html, /aria-valuenow/, "no invented value");
  assert.doesNotMatch(html, /aria-live|role="status"/, "indicators never announce");
});

test("F03 · progress bar: aria-valuenow only for a real value (clamped); indeterminate otherwise", () => {
  const known = markup(
    h(F.ProgressBar, { label: "Upload", value: 140, max: 200, valueText: "140 of 200 files" }),
  );
  assert.match(known, /role="progressbar"/);
  assert.match(known, /aria-valuenow="140"/);
  assert.match(known, /aria-valuemax="200"/);
  assert.match(known, /aria-valuetext="140 of 200 files"/);
  assert.match(known, /--neshel-progress:0.7/);
  const unknown = markup(h(F.ProgressBar, { label: "Upload" }));
  assert.doesNotMatch(unknown, /aria-valuenow/);
  assert.match(unknown, /data-indeterminate=""/);
  assert.match(markup(h(F.ProgressBar, { label: "x", value: -5 })), /aria-valuenow="0"/);
});

test("F09 · progress ring follows a source every frame; aria-valuenow changes only on integer steps", async () => {
  const value = motionValue(0);
  const view = await mount(h(F.ProgressRing, { label: "Export", progress: value }));
  const ring = view.container.querySelector(".neshel-ring");
  const changes = [];
  new window.MutationObserver((records) => {
    for (const r of records) changes.push(ring.getAttribute("aria-valuenow"));
  }).observe(ring, { attributes: true, attributeFilter: ["aria-valuenow"] });
  for (let i = 1; i <= 50; i++) {
    value.set(0.1 + i * 0.00008);
    frames.flush(1);
  }
  await microtasks();
  assert.equal(ring.getAttribute("aria-valuenow"), "10");
  assert.ok(changes.length <= 1, `few announcements (${changes.length})`);
  assert.equal(ring.style.getPropertyValue("--neshel-ring-offset"), "89.6");
  assert.equal(ring.hasAttribute("data-indeterminate"), false);
  await view.unmount();
  frames.flush(1);
  assert.equal(getFrameScheduler().size, 0);
  assert.match(markup(h(F.ProgressRing, { label: "x" })), /data-indeterminate=""/);
});

test("F02 · skeletons are hidden from AT; Shimmer adds and removes its token on any child", async () => {
  assert.match(markup(h(F.SkeletonShimmer, { width: "8rem" })), /aria-hidden="true"/);
  const view = await mount(
    h(F.Shimmer, null, h("span", { className: "neshel-skeleton", "aria-hidden": true })),
  );
  const child = view.container.firstElementChild;
  assert.equal(child.getAttribute("data-neshel-fx"), "shimmer");
  await view.unmount();
  assert.equal(child.hasAttribute("data-neshel-fx"), false);
});

test("F10 · pending text keeps one text node; F05 success mark never announces", () => {
  const pending = markup(h(F.PendingText, { pending: true }, "Saving draft"));
  assert.equal(pending, '<span class="neshel-pending-text" data-pending="">Saving draft</span>');
  const idle = markup(h(F.PendingText, { pending: false }, "Saved"));
  assert.doesNotMatch(idle, /data-pending/);
  const mark = markup(h(F.SuccessMark, { show: false }));
  assert.match(mark, /aria-hidden="true"/);
  assert.match(mark, /data-state="hidden"/);
  assert.match(mark, /pathLength="1"/);
  const labelled = markup(h(F.SuccessMark, { show: true, label: "Done" }));
  assert.match(labelled, /role="img"/);
  assert.match(labelled, /data-state="shown"/);
  assert.doesNotMatch(labelled, /aria-live|role="status"|role="alert"/);
});

test("F07 · loading keeps the same focused button and name, blocks activation and submission, locks width", () => {
  const form = document.createElement("form");
  const button = document.createElement("button");
  button.type = "submit";
  button.textContent = "Save";
  Object.defineProperty(button, "offsetWidth", { value: 96, configurable: true });
  form.appendChild(button);
  document.body.appendChild(form);
  let submits = 0;
  let clicks = 0;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    submits++;
  });
  button.addEventListener("click", () => clicks++);
  button.focus();
  const control = F.createLoadingButton(button);
  control.set(true);
  frames.flush(1);
  assert.equal(document.activeElement, button, "focus kept (never disabled)");
  assert.equal(button.hasAttribute("disabled"), false);
  assert.equal(button.getAttribute("aria-disabled"), "true");
  assert.equal(button.textContent, "Save", "accessible name unchanged");
  assert.equal(button.getAttribute("data-neshel-fx"), "loading");
  assert.equal(button.style.getPropertyValue("min-inline-size"), "96px");
  button.click(); // Enter/Space and implicit submission arrive as a click
  assert.equal(clicks, 0);
  assert.equal(submits, 0, "no double submit");
  control.set(false);
  frames.flush(1);
  assert.equal(button.hasAttribute("aria-disabled"), false);
  assert.equal(button.style.getPropertyValue("min-inline-size"), "");
  button.click();
  assert.equal(clicks, 1);
  assert.equal(submits, 1);
  control.destroy();
  form.remove();
});

test("F08 · optimistic pending is busy (not confirmed); failure is distinct and calls onRollback once", () => {
  const item = document.createElement("li");
  document.body.appendChild(item);
  let rollbacks = 0;
  const control = F.createOptimisticPulse(item, { onRollback: () => rollbacks++ });
  control.set("pending");
  assert.equal(item.getAttribute("aria-busy"), "true");
  assert.equal(item.getAttribute("data-neshel-optimistic"), "pending");
  control.set("failed");
  control.set("failed");
  assert.equal(rollbacks, 1);
  assert.equal(item.hasAttribute("aria-busy"), false);
  control.set("confirmed");
  assert.equal(item.getAttribute("data-neshel-optimistic"), "confirmed");
  assert.throws(() => control.set("done"), /invalid status/);
  control.destroy();
  frames.flush(1);
  assert.equal(item.hasAttribute("data-neshel-optimistic"), false);
  assert.equal(item.hasAttribute("data-neshel-fx"), false);
  item.remove();
});

test("F06 store · accessible timing, pause/resume with remaining time, overflow evicts the oldest unprotected", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"] });
  assert.equal(F.autoDuration({ title: "Saved" }), 6300);
  assert.equal(
    F.autoDuration({ title: "x", action: { label: "Undo", onAction() {} } }),
    Number.POSITIVE_INFINITY,
  );
  const toaster = F.createToaster({ max: 2 });
  const a = toaster.show({ title: "A", duration: 4000 });
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
  assert.throws(() => toaster.show({ title: "" }), /title/);
  toaster.destroy();
  assert.equal(F.getFeedbackDebugInfo().timers, 0);
  void a;
  t.mock.timers.reset();
});

test("F06 Toaster · regions exist before content; one announcement per toast; Escape closes after the exit", async () => {
  const toaster = F.createToaster();
  const view = await mount(h(StrictMode, null, h(F.Toaster, { toaster })));
  const region = view.container.querySelector("section.neshel-toaster");
  assert.equal(region.getAttribute("aria-label"), "Notifications");
  const polite = region.querySelector('[role="status"]');
  const alert = region.querySelector('[role="alert"]');
  assert.ok(polite && alert, "live regions are present before any toast");
  let id;
  await act(async () => {
    id = toaster.show({ title: "Saved", description: "Draft stored" });
  });
  frames.flush(2);
  await act(async () => {});
  const item = region.querySelector(".neshel-toast");
  assert.equal(item.getAttribute("data-state"), "open");
  assert.equal(polite.textContent, "Saved. Draft stored");
  await act(async () => {
    toaster.show({ title: "Failed", tone: "error" });
  });
  assert.equal(alert.textContent, "Failed", "errors go to the alert region");
  assert.equal(polite.querySelectorAll("p").length, 1, "no duplicate announcement on re-render");
  item.focus();
  await act(async () => {
    item.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  });
  assert.equal(
    toaster.toasts.some((x) => x.id === id),
    false,
  );
  const closing = region.querySelector(`[data-id="${id}"]`);
  assert.equal(closing.getAttribute("data-state"), "closing", "exit animates before removal");
  assert.equal(closing.hasAttribute("inert"), true);
  await act(async () => {
    closing.dispatchEvent(new window.Event("transitionend", { bubbles: true }));
  });
  assert.equal(region.querySelector(`[data-id="${id}"]`), null);
  await act(async () => {
    region.dispatchEvent(new window.PointerEvent("pointerover", { bubbles: true }));
  });
  await view.unmount();
  toaster.destroy();
  frames.flush(1);
  assert.equal(getFrameScheduler().size, 0);
});

test("F06 Toaster · hotkey moves focus to the toasts; hover pauses the timers", async () => {
  const toaster = F.createToaster();
  const view = await mount(h(F.Toaster, { toaster, hotkey: "F8" }));
  await act(async () => {
    toaster.show({ title: "One" });
  });
  frames.flush(2);
  await act(async () => {
    window.dispatchEvent(new window.KeyboardEvent("keydown", { key: "F8" }));
  });
  assert.ok(document.activeElement?.classList.contains("neshel-toast"));
  const region = view.container.querySelector("section");
  await act(async () => {
    region.dispatchEvent(new window.PointerEvent("pointerover", { bubbles: true }));
  });
  assert.equal(toaster.paused, true, "focus or hover pauses");
  await view.unmount();
  assert.equal(toaster.paused, false, "unmount resumes");
  toaster.destroy();
});

test("F07/F08 React: LoadingButton and OptimisticPulse wrap a single child and restore it", async () => {
  let rollbacks = 0;
  const view = await mount(
    h("div", null, [
      h(F.LoadingButton, { key: 1, loading: true }, h("button", { type: "button" }, "Pay")),
      h(
        F.OptimisticPulse,
        { key: 2, status: "pending", onRollback: () => rollbacks++ },
        h("span", null, "Liked"),
      ),
    ]),
  );
  const [button, span] = [
    view.container.querySelector("button"),
    view.container.querySelector("span"),
  ];
  assert.equal(button.getAttribute("aria-disabled"), "true");
  assert.equal(span.getAttribute("aria-busy"), "true");
  await view.render(
    h("div", null, [
      h(F.LoadingButton, { key: 1, loading: false }, h("button", { type: "button" }, "Pay")),
      h(
        F.OptimisticPulse,
        { key: 2, status: "failed", onRollback: () => rollbacks++ },
        h("span", null, "Liked"),
      ),
    ]),
  );
  assert.equal(button.hasAttribute("aria-disabled"), false);
  assert.equal(rollbacks, 1);
  await view.unmount();
  assert.equal(F.getFeedbackDebugInfo().loadingButtons, 0);
  assert.equal(F.getFeedbackDebugInfo().optimistic, 0);
});
