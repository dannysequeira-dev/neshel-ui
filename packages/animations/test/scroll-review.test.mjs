// Phase 011 owner review regressions (PR #8): SP04 layout policies under live reduced motion, SP04
// ownership of `--neshel-hscroll-distance`, SP08 `themeTarget`/`themes` changes. Written before the fixes
// (they failed against 8af81d5); see specs/011-scroll-parallax/evidence.md §12.
import assert from "node:assert/strict";
import test from "node:test";
import { frames, h, mount } from "./helpers.mjs";
import { place, scrollAndSettle, scrollTo, setupScrollDom, viewport } from "./scroll-helpers.mjs";

const scroll = await import("../dist/scroll/index.js");
const core = await import("../dist/core/index.js");
const { attachEffect } = core;
const { getScrollDebugInfo, scrollColorShift } = scroll;
const { act } = await import("react");

const { media } = await setupScrollDom();

function fresh() {
  document.body.innerHTML = "";
  viewport();
  scrollTo(0);
  frames.settle();
  media.set(false);
}

const DISTANCE = "--neshel-hscroll-distance";
const transform = (element) => element.style.getPropertyValue("transform");

/** Mount SP04 with four 600 px cards in an 800 px stage (distance 1600 px; contain 1000 → 2600). */
async function mountHorizontal(props = {}) {
  const cards = [0, 1, 2, 3].map((index) =>
    h("button", { key: index, id: `card-${index}` }, `Card ${index}`),
  );
  const view = await mount(
    h(scroll.HorizontalScroll, { label: "Cards", id: "hs", ...props }, cards),
  );
  const section = document.getElementById("hs");
  const stage = section.firstElementChild;
  const track = stage.firstElementChild;
  Object.defineProperty(track, "scrollWidth", { value: 2400, configurable: true });
  Object.defineProperty(stage, "clientWidth", { value: 800, configurable: true });
  // jsdom ignores scrollLeft writes: a plain own property makes the stage reset observable.
  Object.defineProperty(stage, "scrollLeft", { value: 0, configurable: true, writable: true });
  place(section, { top: 1000, height: 2200 });
  cards.forEach((_, index) => {
    const card = document.getElementById(`card-${index}`);
    Object.defineProperty(card, "offsetLeft", { value: index * 700, configurable: true });
    Object.defineProperty(card, "offsetWidth", { value: 600, configurable: true });
  });
  await refresh();
  return { view, section, stage, track };
}

async function refresh() {
  await act(async () => {
    scroll.refreshScroll();
    frames.settle();
  });
}

async function setReduced(value) {
  await act(async () => media.set(value));
  await act(async () => frames.settle());
}

/** Whether the pinned stage still resets a scroll of the clipped stage (its scroll listener). */
function stageResets(stage) {
  stage.scrollLeft = 300;
  stage.dispatchEvent(new window.Event("scroll"));
  const reset = stage.scrollLeft === 0;
  stage.scrollLeft = 0;
  return reset;
}

// --- 1 · SP04 layout policies under live reduced motion --------------------------------------------

test("SP04 layout policies: reduced motion stacks pinned travel (auto and explicit pinned), live", async () => {
  const expected = {
    auto: ["pinned", "stacked"],
    pinned: ["pinned", "stacked"],
    stacked: ["stacked", "stacked"],
    scroll: ["scroll", "scroll"], // user-driven native scroller: no scroll-linked motion to reduce
  };
  for (const [layout, [normal, reduced]] of Object.entries(expected)) {
    fresh();
    const { view, section } = await mountHorizontal({ layout });
    assert.equal(section.getAttribute("data-neshel-hscroll"), normal, `${layout}: normal`);
    await setReduced(true);
    assert.equal(section.getAttribute("data-neshel-hscroll"), reduced, `${layout}: reduced`);
    await setReduced(false);
    assert.equal(section.getAttribute("data-neshel-hscroll"), normal, `${layout}: recovered`);
    await view.unmount();
  }
});

test('SP04 layout="pinned": reduced motion mid-scene stacks, stops the track, recovers, cleans up', async () => {
  fresh();
  const scrolls = [];
  const originalScrollTo = window.scrollTo;
  window.scrollTo = (options) => scrolls.push(options);
  const base = getScrollDebugInfo();
  try {
    const { view, section, stage, track } = await mountHorizontal({ layout: "pinned" });
    assert.equal(section.getAttribute("data-neshel-hscroll"), "pinned");
    assert.equal(getScrollDebugInfo().timelines, base.timelines + 1, "pinned timeline");
    scrollAndSettle(1800); // half way through the pinned span
    assert.equal(transform(track), "translate3d(-800px, 0px, 0px)");
    assert.equal(stageResets(stage), true, "pinned: clipped stage reset");

    // Reduced motion switched on while the scene runs.
    await setReduced(true);
    assert.equal(section.getAttribute("data-neshel-hscroll"), "stacked", "vertical layout");
    assert.equal(transform(track), "", "track transform released");
    assert.equal(getScrollDebugInfo().timelines, base.timelines, "timeline destroyed");
    assert.equal(stageResets(stage), false, "stage scroll listener removed");
    for (const card of track.children) {
      assert.equal(card.closest("[aria-hidden],[inert],[hidden]"), null, "cards stay accessible");
    }
    scrollAndSettle(2000);
    assert.equal(transform(track), "", "no scroll-linked motion while reduced");
    await act(async () => document.getElementById("card-3").focus());
    assert.equal(scrolls.length, 0, "no focus-driven document scroll in the stacked layout");

    // Reduced motion switched off: pinned again from the current scroll position.
    scrollAndSettle(1800);
    await setReduced(false);
    await refresh();
    assert.equal(section.getAttribute("data-neshel-hscroll"), "pinned", "recovered");
    assert.equal(getScrollDebugInfo().timelines, base.timelines + 1);
    assert.equal(transform(track), "translate3d(-800px, 0px, 0px)", "track follows again");
    assert.equal(stageResets(stage), true, "stage reset again");

    await view.unmount();
    frames.settle();
    const after = getScrollDebugInfo();
    assert.equal(after.timelines, base.timelines, "no timeline left");
    assert.equal(after.activeTimelines, base.activeTimelines);
    assert.equal(transform(track), "", "no transform left");
    assert.equal(stageResets(stage), false, "no stage listener left");
  } finally {
    window.scrollTo = originalScrollTo;
    media.set(false);
  }
});

// --- 3 · SP04 `--neshel-hscroll-distance` ownership ------------------------------------------------

test("SP04 distance variable: the consumer's inline value is restored on unmount", async () => {
  fresh();
  const { view, section } = await mountHorizontal({ style: { [DISTANCE]: "123px" } });
  assert.equal(section.style.getPropertyValue(DISTANCE), "1600px", "measured while mounted");
  await view.unmount();
  frames.settle();
  assert.equal(section.style.getPropertyValue(DISTANCE), "123px", "consumer value restored");
});

test("SP04 distance variable: external edits while mounted become the value restored on unmount", async () => {
  fresh();
  const { view, section } = await mountHorizontal();
  assert.equal(section.style.getPropertyValue(DISTANCE), "1600px");
  section.style.setProperty(DISTANCE, "999px"); // consumer edit while the effect is active
  await refresh(); // a later measurement keeps the engine's value (needed by the pinned height)
  assert.equal(section.style.getPropertyValue(DISTANCE), "1600px", "engine value while mounted");
  await view.unmount();
  frames.settle();
  assert.equal(
    section.style.getPropertyValue(DISTANCE),
    "999px",
    "external edit kept, not deleted",
  );

  fresh();
  const second = await mountHorizontal();
  second.section.style.setProperty(DISTANCE, "777px", "important");
  await second.view.unmount(); // released before any later measurement
  frames.settle();
  assert.equal(second.section.style.getPropertyValue(DISTANCE), "777px");
  assert.equal(second.section.style.getPropertyPriority(DISTANCE), "important");

  fresh();
  const third = await mountHorizontal(); // no consumer value: nothing left behind
  await third.view.unmount();
  frames.settle();
  assert.equal(third.section.style.getPropertyValue(DISTANCE), "");
});

// --- 2 · SP08 `themeTarget` / `themes` changes ------------------------------------------------------

function box(top, height = 200) {
  const element = document.createElement("div");
  document.body.appendChild(element);
  place(element, { top, height });
  return element;
}

test("SP08: changing themeTarget restores the previous target and themes the new one", () => {
  fresh();
  const element = box(1000, 200); // cover 400 → 1200
  const a = document.createElement("div");
  const b = document.createElement("div");
  const c = document.createElement("div");
  document.body.append(a, b, c);
  a.setAttribute("data-neshel-theme", "light");
  b.setAttribute("data-neshel-theme", "brand");
  const options = { stops: ["#fff", "#123"], themes: ["light", "dark"] };
  const handle = attachEffect(element, scrollColorShift, { ...options, themeTarget: a });
  scrollAndSettle(1100);
  assert.equal(a.getAttribute("data-neshel-theme"), "dark");

  handle.update({ ...options, themeTarget: b });
  assert.equal(a.getAttribute("data-neshel-theme"), "light", "previous target restored");
  assert.equal(b.getAttribute("data-neshel-theme"), "dark", "new target themed");

  handle.update({ ...options, themeTarget: c });
  assert.equal(b.getAttribute("data-neshel-theme"), "brand", "second target restored");
  assert.equal(c.getAttribute("data-neshel-theme"), "dark");

  handle.update({ ...options }); // default target: the element
  assert.equal(c.getAttribute("data-neshel-theme"), null, "attribute-less target restored");
  assert.equal(element.getAttribute("data-neshel-theme"), "dark");

  handle.update({ ...options, themeTarget: a });
  assert.equal(element.getAttribute("data-neshel-theme"), null);
  assert.equal(a.getAttribute("data-neshel-theme"), "dark", "target reused after restoring");
  scrollAndSettle(500); // progress 0.125 → first theme
  assert.equal(a.getAttribute("data-neshel-theme"), "light");

  handle.destroy();
  frames.settle();
  assert.equal(a.getAttribute("data-neshel-theme"), "light", "original values after destroy");
  assert.equal(b.getAttribute("data-neshel-theme"), "brand");
  assert.equal(c.getAttribute("data-neshel-theme"), null);
  assert.equal(element.getAttribute("data-neshel-theme"), null);
});

test("SP08: removing themes restores the original attribute immediately; adding them back works", () => {
  fresh();
  const element = box(1000, 200);
  const target = document.createElement("div");
  document.body.appendChild(target);
  target.setAttribute("data-neshel-theme", "light");
  const handle = attachEffect(element, scrollColorShift, {
    stops: ["#fff", "#123"],
    themes: ["light", "dark"],
    themeTarget: target,
  });
  scrollAndSettle(1100);
  assert.equal(target.getAttribute("data-neshel-theme"), "dark");

  handle.update({ stops: ["#fff", "#123"], themeTarget: target });
  assert.equal(target.getAttribute("data-neshel-theme"), "light", "restored on removal");
  scrollAndSettle(1150);
  assert.equal(target.getAttribute("data-neshel-theme"), "light", "no theme writes without themes");
  assert.match(element.style.getPropertyValue("--neshel-scroll-color"), /#123|color-mix/);

  target.setAttribute("data-neshel-theme", "sepia"); // consumer change while themes are off
  handle.update({ stops: ["#fff", "#123"], themes: ["day", "night"], themeTarget: target });
  assert.equal(target.getAttribute("data-neshel-theme"), "night", "themes added back");
  handle.destroy();
  frames.settle();
  assert.equal(target.getAttribute("data-neshel-theme"), "sepia", "latest consumer value restored");
});
