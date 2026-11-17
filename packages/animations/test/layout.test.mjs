// Phase 012 layout animations L01–L10 and presence (FR-030–FR-034, FR-040; contracts/layout-engine.md,
// api-012.md §2). jsdom with a manual clock; boxes through stubbed offset chains; fake ResizeObserver.
import assert from "node:assert/strict";
import test from "node:test";
import { Profiler, StrictMode, useState } from "react";
import {
  box,
  resize,
  run,
  scaleOf,
  settle,
  setupGestureDom,
  translation,
} from "./gesture-helpers.mjs";
import { h, markup, mount, stubAnimate } from "./helpers.mjs";

const { media } = await setupGestureDom();
const layout = await import("../dist/layout/index.js");
const entrance = await import("../dist/entrance/index.js");
const core = await import("../dist/core/index.js");
const { attachEffect, getFrameScheduler, definePreset } = core;
const { act } = await import("react");

let renders = 0;
function App({ items }) {
  return h(
    Profiler,
    { id: "list", onRender: () => renders++ },
    h(
      layout.AnimatedList,
      null,
      items.map((i) => h("li", { key: i, id: `li-${i}` }, i)),
    ),
  );
}

function Accordion() {
  const [open, setOpen] = useState(false);
  return h(
    "div",
    null,
    h(
      "button",
      { "aria-expanded": open, "aria-controls": "panel", onClick: () => setOpen(!open) },
      "Toggle",
    ),
    h(layout.Collapse, { open, id: "panel", driver: "js" }, "Body"),
  );
}

test("layout subpath: catalogue order of definitions (L01–L07, L09, L10)", () => {
  assert.deepEqual(
    layout.layoutEffects.map((d) => d.id),
    [
      "layout/flip",
      "layout/auto-height",
      "layout/list-item",
      "layout/shared",
      "layout/grid-reflow",
      "layout/collapse",
      "layout/tab-indicator",
      "layout/cross-fade",
      "layout/masonry",
    ],
  );
  assert.throws(() => layout.sharedLayout.resolve({}), /layoutId/);
  assert.throws(() => layout.flipMove.resolve({ group: {} }), /group/);
  assert.throws(() => layout.flipMove.resolve({ layout: "all" }), /layout/);
});

test("measureBox uses the offset chain: transforms are ignored", () => {
  const parent = document.createElement("div");
  const child = document.createElement("div");
  parent.append(child);
  document.body.append(parent);
  box(parent, { x: 100, y: 50, width: 400, height: 400, border: 2 });
  box(child, { x: 10, y: 20, width: 50, height: 60, parent });
  child.style.transform = "translateX(999px)";
  assert.deepEqual(layout.measureBox(child), { x: 112, y: 72, width: 50, height: 60 });
});

function groupItems(count) {
  const container = document.createElement("div");
  document.body.append(container);
  box(container, { width: 400, height: 400 });
  const items = [];
  for (let i = 0; i < count; i++) {
    const item = document.createElement("div");
    container.append(item);
    box(item, { y: i * 50, width: 100, height: 40, parent: container });
    items.push(item);
  }
  return { container, items };
}

test("L01 layout group: snapshot → read-phase measure → inverted layer before paint → springs home", () => {
  const { items } = groupItems(3);
  const group = layout.createLayoutGroup();
  const handles = items.map((item) => attachEffect(item, layout.flipMove, { group }));
  group.snapshot();
  // Reorder: item 0 moves to the bottom.
  box(items[0], { y: 100, width: 100, height: 40 });
  box(items[1], { y: 0, width: 100, height: 40 });
  box(items[2], { y: 50, width: 100, height: 40 });
  group.play();
  run(1); // read + update + write in one frame
  assert.ok(translation(items[0])[1] < -90, `inverted: ${translation(items[0])}`);
  assert.ok(translation(items[1])[1] > 40);
  settle();
  for (const item of items) assert.deepEqual(translation(item), [0, 0]);
  assert.equal(getFrameScheduler().size, 0, "nothing at rest");
  for (const handle of handles) handle.destroy();
  group.destroy();
});

test("L01 interruption: a new change mid-animation continues from the shown position (no jump)", () => {
  const { items } = groupItems(1);
  const [item] = items;
  const group = layout.createLayoutGroup();
  const handle = attachEffect(item, layout.flipMove, { group });
  group.snapshot();
  box(item, { y: 200, width: 100, height: 40 });
  group.play();
  run(4);
  const shownY = 200 + translation(item)[1];
  group.snapshot();
  box(item, { y: 100, width: 100, height: 40 });
  group.play();
  run(1);
  const nowShown = 100 + translation(item)[1];
  // One frame of motion at most (a restart from the layout box would jump by ~50 px here).
  assert.ok(Math.abs(nowShown - shownY) < 30, `continuous: ${shownY} → ${nowShown}`);
  settle();
  handle.destroy();
  group.destroy();
});

test("L01 layout 'both' adds a non-uniform scale; reduced motion applies changes instantly", () => {
  const { items } = groupItems(1);
  const [item] = items;
  const group = layout.createLayoutGroup();
  const handle = attachEffect(item, layout.flipMove, { group, layout: "both" });
  group.snapshot();
  box(item, { y: 0, width: 200, height: 40 });
  group.play();
  run(1);
  const [sx, sy] = scaleOf(item);
  assert.ok(sx < 0.6 && Math.abs(sy - 1) < 0.01, `${sx} ${sy}`);
  settle();
  media.set(true);
  group.snapshot();
  box(item, { y: 300, width: 200, height: 40 });
  group.play();
  run(1);
  assert.deepEqual(translation(item), [0, 0]);
  media.set(false);
  handle.destroy();
  group.destroy();
});

test("L01: consumer inline transform stays the baseline and is restored exactly", () => {
  const { items } = groupItems(1);
  const [item] = items;
  item.style.transform = "rotate(3deg)";
  const group = layout.createLayoutGroup();
  const handle = attachEffect(item, layout.flipMove, { group });
  group.snapshot();
  box(item, { y: 100, width: 100, height: 40 });
  group.play();
  run(1);
  assert.match(item.style.transform, /^rotate\(3deg\) translate3d/);
  handle.destroy();
  settle();
  assert.equal(item.style.transform, "rotate(3deg)");
  group.destroy();
});

test("L04 shared layout: a new element with the same layoutId animates from the old box", () => {
  const { container, items } = groupItems(1);
  const [old] = items;
  const group = layout.createLayoutGroup();
  const a = attachEffect(old, layout.sharedLayout, { group, layoutId: "hero" });
  group.snapshot();
  a.destroy();
  old.remove();
  const next = document.createElement("div");
  container.append(next);
  box(next, { x: 200, y: 300, width: 100, height: 40, parent: container });
  const b = attachEffect(next, layout.sharedLayout, { group, layoutId: "hero" });
  group.play();
  run(1);
  const [tx, ty] = translation(next);
  assert.ok(tx < -180 && ty < -280, `from the old box: ${tx}, ${ty}`);
  settle();
  b.destroy();
  group.destroy();
});

test("L05 gridReflow: an observed reflow animates children inside the observer callback (no renders)", () => {
  const { container, items } = groupItems(3);
  const handle = attachEffect(container, layout.gridReflow, {});
  resize.notify(container, { height: 400 }); // initial: caches boxes
  // Column change: items move without any React render.
  box(items[1], { x: 120, y: 0, width: 100, height: 40, parent: container });
  box(items[2], { x: 240, y: 0, width: 100, height: 40, parent: container });
  resize.notify(container, { width: 700, height: 400 });
  assert.ok(
    translation(items[1])[0] < -100,
    "inverted synchronously (host flushed in the callback)",
  );
  settle();
  for (const item of items) assert.deepEqual(translation(item), [0, 0]);
  handle.destroy();
  assert.equal(resize.observed, 0, "observers released");
});

test("L10 masonry: row spans from observed heights (exclusive channel), template and cleanup", () => {
  const { container, items } = groupItems(2);
  const handle = attachEffect(container, layout.masonry, { columns: 2, gap: 10, unit: 5 });
  assert.equal(
    container.getAttribute("data-neshel-fx"),
    null,
    "plain grid until the spans are known",
  );
  assert.equal(
    container.style.getPropertyValue("--neshel-masonry-template"),
    "repeat(2, minmax(0, 1fr))",
  );
  resize.notify(items[0], { height: 92 });
  assert.equal(
    items[0].style.getPropertyValue("--neshel-masonry-span"),
    "",
    "not in the observer callback",
  );
  run(1); // write phase: spans and the masonry token in the same frame
  assert.equal(
    items[0].style.getPropertyValue("--neshel-masonry-span"),
    String(Math.ceil((92 + 10) / 5)),
  );
  assert.match(container.getAttribute("data-neshel-fx") ?? "", /masonry/);
  handle.destroy();
  settle();
  assert.equal(items[0].getAttribute("style") ?? "", "");
  assert.equal(container.getAttribute("style") ?? "", "");
});

test("L02 autoHeight: a DOM change animates the wrapper (MutationObserver, before layout); observer sizes only record", async () => {
  const animate = stubAnimate();
  const wrapper = document.createElement("div");
  const content = document.createElement("div");
  wrapper.append(content);
  document.body.append(wrapper);
  const handle = attachEffect(wrapper, layout.autoHeight, { duration: 200 });
  const mutate = async (height) => {
    Object.defineProperty(content, "offsetHeight", { value: height, configurable: true });
    content.append(document.createElement("p"));
    await Promise.resolve(); // MutationObserver microtask
  };
  resize.notify(content, { height: 100 });
  assert.equal(animate.calls.length, 0, "first observation only records");
  await mutate(180);
  assert.equal(animate.calls.length, 1);
  assert.deepEqual(animate.calls[0].keyframes, [{ height: "100px" }, { height: "180px" }]);
  assert.equal(
    animate.calls[0].options.fill,
    undefined,
    "no fill: the natural CSS height applies after",
  );
  assert.match(wrapper.getAttribute("data-neshel-fx-active") ?? "", /auto-height/);
  animate.finishAll();
  assert.equal(wrapper.getAttribute("data-neshel-fx-active"), null);
  resize.notify(content, { height: 220 });
  assert.equal(
    animate.calls.length,
    1,
    "a size change without a mutation (font, image) is not animated in the observer",
  );
  media.set(true);
  await mutate(300);
  assert.equal(animate.calls.length, 1, "reduced: instant");
  media.set(false);
  handle.destroy();
  animate.restore();
});

test("L06 collapse: js driver measures and animates; closed content stays in the DOM, inert", () => {
  const animate = stubAnimate();
  const panel = document.createElement("div");
  panel.innerHTML = "<div>Content</div>";
  document.body.append(panel);
  Object.defineProperty(panel, "scrollHeight", { value: 120, configurable: true });
  box(panel, { width: 200, height: 0 });
  const handle = attachEffect(panel, layout.collapse, { open: false, driver: "js" });
  const hiddenContent = () =>
    panel.inert === true || panel.getAttribute("hidden") === "until-found";
  assert.equal(panel.getAttribute("data-state"), "closed");
  assert.ok(hiddenContent(), "closed: inert or hidden until found");
  handle.update({ open: true, driver: "js" });
  assert.equal(panel.getAttribute("data-state"), "open");
  assert.equal(hiddenContent(), false);
  assert.deepEqual(animate.calls.at(-1).keyframes, [{ height: "0px" }, { height: "120px" }]);
  animate.finishAll();
  box(panel, { width: 200, height: 120 });
  handle.update({ open: false, driver: "js" });
  assert.deepEqual(animate.calls.at(-1).keyframes, [{ height: "120px" }, { height: "0px" }]);
  assert.equal(hiddenContent(), false, "still visible while closing");
  animate.finishAll();
  assert.ok(hiddenContent());
  assert.ok(panel.textContent.includes("Content"));
  handle.destroy();
  animate.restore();
});

test("L06 collapse: css driver sets the token and CSS variables only (no WAAPI)", () => {
  const animate = stubAnimate();
  const panel = document.createElement("div");
  document.body.append(panel);
  box(panel, { width: 200, height: 0 });
  const handle = attachEffect(panel, layout.collapse, {
    open: false,
    driver: "css",
    duration: 300,
  });
  settle();
  assert.match(panel.getAttribute("data-neshel-fx"), /collapse-css/);
  assert.equal(panel.style.getPropertyValue("--neshel-collapse-duration"), "300ms");
  handle.update({ open: true, driver: "css", duration: 300 });
  assert.equal(animate.calls.length, 0);
  assert.equal(panel.getAttribute("data-state"), "open");
  handle.destroy();
  settle();
  assert.equal(panel.getAttribute("style") ?? "", "");
  animate.restore();
});

test("L07 tabIndicator: measures the active tab in a read phase and positions the package layer", () => {
  const list = document.createElement("div");
  document.body.append(list);
  box(list, { width: 400, height: 40 });
  const tabs = [0, 1, 2].map((i) => {
    const tab = document.createElement("button");
    tab.setAttribute("role", "tab");
    list.append(tab);
    box(tab, { x: i * 100, y: 0, width: 80 + i * 10, height: 40, parent: list });
    return tab;
  });
  const handle = attachEffect(list, layout.tabIndicator, { active: 1 });
  const indicator = list.querySelector(".neshel-tab-indicator");
  assert.equal(indicator.getAttribute("aria-hidden"), "true");
  run(2);
  assert.equal(indicator.style.getPropertyValue("--neshel-indicator-offset"), "100.00px");
  assert.equal(indicator.style.getPropertyValue("--neshel-indicator-size"), "90.00");
  assert.ok(indicator.hasAttribute("data-ready"), "transitions only after the first placement");
  handle.update({ active: tabs[2] });
  run(1);
  assert.equal(indicator.style.getPropertyValue("--neshel-indicator-offset"), "200.00px");
  handle.destroy();
  assert.equal(list.querySelector(".neshel-tab-indicator"), null);
});

test("L09 crossFade layer and L03 listItem: fade/out with callbacks, continuous on re-entry", async () => {
  const flush = async () => {
    for (let i = 0; i < 4; i++) await Promise.resolve();
  };
  const layer = document.createElement("div");
  document.body.append(layer);
  let hidden = 0;
  const fade = attachEffect(layer, layout.crossFade, { visible: true, onHidden: () => hidden++ });
  assert.equal(layer.style.opacity, "", "visible content stays visible on attach");
  fade.update({ visible: false, onHidden: () => hidden++ });
  settle();
  await flush();
  assert.equal(hidden, 1);
  assert.equal(layer.style.opacity, "0");
  fade.destroy();
  const item = document.createElement("div");
  document.body.append(item);
  let exited = 0;
  const li = attachEffect(item, layout.listItem, { present: true, onExited: () => exited++ });
  run(4);
  li.update({ present: false, onExited: () => exited++ });
  run(4);
  const midExit = Number(item.style.opacity);
  li.update({ present: true, onExited: () => exited++ });
  run(1);
  assert.ok(
    Number(item.style.opacity || 1) >= midExit,
    "re-entry continues from the current opacity",
  );
  settle();
  await flush();
  assert.equal(exited, 0);
  assert.equal(item.style.opacity, "");
  li.destroy();
});

test("presence state machine: exiting keys stay in place, re-entry, removal by generation, idempotent", () => {
  const p = layout.createPresence();
  p.update([
    { key: "a", value: 1 },
    { key: "b", value: 2 },
    { key: "c", value: 3 },
  ]);
  assert.equal(
    p.update([
      { key: "a", value: 1 },
      { key: "c", value: 3 },
    ]),
    true,
  );
  assert.deepEqual(
    p.entries.map((e) => [e.key, e.status]),
    [
      ["a", "present"],
      ["b", "exiting"],
      ["c", "present"],
    ],
  );
  assert.equal(
    p.update([
      { key: "a", value: 1 },
      { key: "c", value: 3 },
    ]),
    false,
    "idempotent",
  );
  const exitGeneration = p.entries[1].generation;
  p.update([
    { key: "a", value: 1 },
    { key: "b", value: 2 },
    { key: "c", value: 3 },
  ]);
  assert.equal(p.entries[1].status, "present");
  assert.equal(p.remove("b", exitGeneration), false, "a stale exit never removes a re-entered key");
  p.update([{ key: "c", value: 3 }]);
  assert.deepEqual(
    p.entries.map((e) => e.key),
    ["a", "b", "c"],
  );
  p.remove("a", p.entries[0].generation);
  assert.deepEqual(
    p.entries.map((e) => e.key),
    ["b", "c"],
  );
  assert.equal(p.flush(), true);
  assert.deepEqual(
    p.entries.map((e) => e.key),
    ["c"],
  );
});

function List({ items, exit, focusFallback }) {
  return h(
    "ul",
    null,
    h(
      layout.Presence,
      { exit, duration: 100, focusFallback },
      items.map((item) => h("li", { key: item, id: `item-${item}` }, h("button", null, item))),
    ),
  );
}

test("React <Presence>: SSR renders the plain children; no wrapper element", () => {
  assert.equal(
    markup(h(List, { items: ["a", "b"] })),
    '<ul><li id="item-a"><button>a</button></li><li id="item-b"><button>b</button></li></ul>',
  );
});

test("React <Presence>: exit before unmount, inert while exiting, removed after the fade; focus moves", async () => {
  const view = await mount(h(List, { items: ["a", "b", "c"] }));
  const b = view.container.querySelector("#item-b");
  b.querySelector("button").focus();
  await view.render(h(List, { items: ["a", "c"] }));
  assert.ok(b.isConnected, "still mounted while exiting");
  assert.equal(b.getAttribute("aria-hidden"), "true");
  assert.equal(b.inert, true);
  assert.equal(
    document.activeElement,
    view.container.querySelector("#item-c button"),
    "focus moved",
  );
  await act(async () => settle());
  assert.equal(b.isConnected, false, "removed after its exit");
  await view.unmount();
});

test("React <Presence>: re-entry during exit keeps the same node; several removals; container unmount", async () => {
  const view = await mount(h(List, { items: ["a", "b", "c"] }));
  const b = view.container.querySelector("#item-b");
  await view.render(h(List, { items: ["a"] }));
  await act(async () => run(2));
  await view.render(h(List, { items: ["a", "b"] }));
  assert.equal(view.container.querySelector("#item-b"), b, "same element, state kept");
  assert.equal(b.getAttribute("aria-hidden"), null);
  await act(async () => settle());
  assert.deepEqual(
    [...view.container.querySelectorAll("li")].map((li) => li.id),
    ["item-a", "item-b"],
  );
  await view.render(h(List, { items: [] }));
  await view.unmount();
  run(1); // the hosts' restoring write
  assert.equal(getFrameScheduler().size, 0, "no task left after unmount");
});

test("React <Presence>: watchdog removes an exit whose animation never completes; hidden page completes at once", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const view = await mount(h(List, { items: ["a", "b"] }));
  await view.render(h(List, { items: ["a"] }));
  const b = view.container.querySelector("#item-b");
  assert.ok(b.isConnected);
  // No frames run (paused/throttled tab): the watchdog completes it.
  await act(async () => t.mock.timers.tick(1100));
  assert.equal(b.isConnected, false);
  assert.ok(layout.getLayoutDebugInfo().watchdog >= 1);
  await view.unmount();
  t.mock.timers.reset();
});

test("React <Presence>: reduced motion and Entrance exit presets complete immediately / via Entrance", async () => {
  media.set(true);
  const view = await mount(h(List, { items: ["a", "b"] }));
  await view.render(h(List, { items: ["a"] }));
  assert.equal(view.container.querySelector("#item-b"), null, "reduced: removed at once");
  await view.unmount();
  media.set(false);
  const fadeUp = definePreset("fade-up-test", entrance.fadeSlide, {
    direction: "up",
    duration: 100,
  });
  const view2 = await mount(h(List, { items: ["a", "b"], exit: fadeUp }));
  await view2.render(h(List, { items: ["a"], exit: fadeUp }));
  const b = view2.container.querySelector("#item-b");
  await act(async () => run(3));
  assert.ok(Number(b.style.opacity) < 1, "Entrance out run");
  await act(async () => settle());
  assert.equal(b.isConnected, false);
  await view2.unmount();
});

test("React <Presence> under StrictMode: double effects do not leak attachments or remove early", async () => {
  const view = await mount(h(StrictMode, null, h(List, { items: ["a", "b"] })));
  await view.render(h(StrictMode, null, h(List, { items: ["a"] })));
  const b = view.container.querySelector("#item-b");
  assert.ok(b?.isConnected, "exiting");
  await act(async () => settle());
  assert.equal(view.container.querySelector("#item-b"), null);
  await view.unmount();
  run(1); // the hosts' restoring write
  assert.equal(getFrameScheduler().size, 0);
});

test("Entrance `continuous`: an out run interrupting an in run starts from the current progress", () => {
  const element = document.createElement("div");
  document.body.append(element);
  const handle = attachEffect(element, entrance.fadeIn, { duration: 200, continuous: true });
  run(5); // part-way in
  const shown = Number(element.style.opacity);
  assert.ok(shown > 0 && shown < 1);
  handle.update({ duration: 200, continuous: true, playback: "out", replay: 1 });
  run(1);
  const after = Number(element.style.opacity);
  assert.ok(Math.abs(after - shown) < 0.2, `no flash: ${shown} → ${after}`);
  settle();
  handle.destroy();
  // Default (not continuous) keeps the 010/011 behaviour: a replay restarts from the start pose.
  const other = document.createElement("div");
  document.body.append(other);
  const plain = attachEffect(other, entrance.fadeIn, { duration: 200 });
  run(5);
  plain.update({ duration: 200, replay: 1 });
  run(1);
  assert.ok(Number(other.style.opacity) < 0.2, `restarted: ${other.style.opacity}`);
  settle();
  plain.destroy();
});

test("React: components render plain markup on the server (SSR-safe, no measurements)", () => {
  assert.equal(
    markup(h(layout.Collapse, { open: false, id: "p" }, "Hidden")),
    '<div id="p" class="neshel-collapse" data-state="closed" hidden=""><div class="neshel-collapse-content">Hidden</div></div>',
  );
  assert.equal(
    markup(h(layout.AutoHeight, null, "x")),
    '<div class="neshel-auto-height"><div class="neshel-auto-height-content">x</div></div>',
  );
  assert.match(markup(h(layout.CrossFade, { swapKey: 1 }, "One")), /neshel-crossfade-layer">One</);
  assert.equal(
    markup(h(layout.AnimatedList, null, [h("li", { key: "a" }, "A")])),
    '<ul class="neshel-animated-list"><li>A</li></ul>',
  );
});

test("React <AnimatedList>: removing an item exits it, then siblings FLIP; zero renders per frame", async () => {
  const view = await mount(h(App, { items: ["a", "b", "c"] }));
  const lis = [...view.container.querySelectorAll("li")];
  for (const [i, li] of lis.entries()) box(li, { y: i * 50, width: 100, height: 40 });
  await view.render(h(App, { items: ["a", "c"] }));
  const before = renders;
  await act(async () => run(5));
  assert.equal(renders, before, "no React render while the exit animates");
  await act(async () => settle());
  assert.equal(view.container.querySelector("#li-b"), null);
  await view.unmount();
});

test("React <Collapse>: toggling keeps the same panel element; effect owns the attributes after mount", async () => {
  const animate = stubAnimate();
  const view = await mount(h(Accordion));
  const panel = view.container.querySelector("#panel");
  await act(async () => view.container.querySelector("button").click());
  assert.equal(view.container.querySelector("#panel"), panel);
  assert.equal(panel.getAttribute("data-state"), "open");
  assert.equal(panel.hasAttribute("hidden"), false);
  await view.unmount();
  animate.restore();
});
