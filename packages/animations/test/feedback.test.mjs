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
