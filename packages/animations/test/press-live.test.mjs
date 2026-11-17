// Owner review of PR #7 (2026-11-17): live reduced motion and visual continuity of the press effects.
// §1 — A run started with motion allowed must switch to its reduced/final behaviour as soon as the
//      preference turns on (controllers created with reducedMotion "never" are governed by the effect);
//      explicit "always"/"never" policies are honoured; listeners, WAAPI animations, frame tasks and
//      temporary DOM are released.
// §2 — The first visible frame after a state change continues from the previous state (no flash of
//      the final state): checked right after the React commit, before the first animation frame.
import assert from "node:assert/strict";
import test from "node:test";
import { frames, h, layoutBox, mount, setupDom, stubAnimate } from "./helpers.mjs";

const { media } = await setupDom();
const { ToggleMorph, CheckboxDraw, NumberTick, ripple, burst, shake } = await import(
  "../dist/press/index.js"
);
const { attachEffect } = await import("../dist/core/index.js");

const baseline = media.listenerCount;
const thumbOf = (app) => app.container.querySelector(".neshel-toggle-thumb");
const p = (node) => node.style.getPropertyValue("--neshel-toggle-p");
const progressOf = (svg) => svg.style.getPropertyValue("--neshel-check-progress");
const down = (node) =>
  node.dispatchEvent(
    new window.PointerEvent("pointerdown", {
      button: 0,
      isPrimary: true,
      clientX: 10,
      clientY: 10,
      bubbles: true,
    }),
  );
const up = () => window.dispatchEvent(new window.PointerEvent("pointerup", { button: 0 }));
function host(tag = "button") {
  const node = document.createElement(tag);
  document.body.appendChild(node);
  layoutBox(node, { width: 120, height: 40 });
  return node;
}
function afterReducedOn(run) {
  media.set(true);
  try {
    run();
  } finally {
    media.set(false);
  }
}

// §1 Live reduced motion -----------------------------------------------------------------------

test("ToggleMorph: reduced motion switched on mid-travel jumps to the end and stops", async () => {
  const app = await mount(h(ToggleMorph, { checked: false }));
  await app.render(h(ToggleMorph, { checked: true }));
  frames.flush(3);
  const mid = Number(p(thumbOf(app)));
  assert.ok(mid > 0 && mid < 1, `travelling ${mid}`);
  afterReducedOn(() => {
    frames.flush(1);
    assert.equal(thumbOf(app).style.cssText, "", "CSS end state, no inline motion values");
    assert.equal(frames.pending, 0, "no frame task left");
  });
  await app.unmount();
  assert.equal(media.listenerCount, baseline, "reduced-motion listeners released");
});

test("ToggleMorph: reducedMotion 'never' keeps animating when the preference turns on", async () => {
  const app = await mount(h(ToggleMorph, { checked: false, reducedMotion: "never" }));
  await app.render(h(ToggleMorph, { checked: true, reducedMotion: "never" }));
  frames.flush(3);
  afterReducedOn(() => {
    frames.flush(1);
    const value = Number(p(thumbOf(app)));
    assert.ok(value > 0 && value < 1, `still travelling ${value}`);
    frames.settle();
  });
  await app.unmount();
});

test("CheckboxDraw: reduced motion switched on mid-draw completes the mark at once", async () => {
  const app = await mount(h(CheckboxDraw, { checked: false }));
  const svg = app.container.querySelector("svg");
  await app.render(h(CheckboxDraw, { checked: true }));
  frames.flush(4);
  const mid = Number(progressOf(svg));
  assert.ok(mid > 0 && mid < 1, `drawing ${mid}`);
  afterReducedOn(() => {
    frames.flush(1);
    assert.equal(svg.style.cssText, "", "fully drawn by CSS, no inline progress");
    assert.equal(frames.pending, 0);
  });
  await app.unmount();
  assert.equal(media.listenerCount, baseline);
});

test("CheckboxDraw: 'never' keeps drawing; 'always' never animates", async () => {
  const never = await mount(h(CheckboxDraw, { checked: false, reducedMotion: "never" }));
  const svg = never.container.querySelector("svg");
  await never.render(h(CheckboxDraw, { checked: true, reducedMotion: "never" }));
  frames.flush(3);
  afterReducedOn(() => {
    frames.flush(1);
    const value = Number(progressOf(svg));
    assert.ok(value > 0 && value < 1, `still drawing ${value}`);
    frames.settle();
  });
  await never.unmount();
  const always = await mount(h(CheckboxDraw, { checked: false, reducedMotion: "always" }));
  await always.render(h(CheckboxDraw, { checked: true, reducedMotion: "always" }));
  frames.flush(1);
  assert.equal(always.container.querySelector("svg").style.cssText, "");
  await always.unmount();
});

test("NumberTick: reduced motion switched on mid-count shows the final value at once", async () => {
  const app = await mount(h(NumberTick, { value: 0, duration: 1000 }));
  const visual = app.container.querySelector("[aria-hidden]");
  await app.render(h(NumberTick, { value: 1000, duration: 1000 }));
  frames.flush(6);
  const mid = Number(visual.textContent.replace(/,/g, ""));
  assert.ok(mid > 0 && mid < 1000, `counting ${visual.textContent}`);
  afterReducedOn(() => {
    frames.flush(1);
    assert.equal(visual.textContent, "1,000");
    assert.equal(frames.pending, 0);
  });
  await app.unmount();
  assert.equal(media.listenerCount, baseline);
});

test("NumberTick: 'never' keeps counting when the preference turns on", async () => {
  const app = await mount(h(NumberTick, { value: 0, duration: 1000, reducedMotion: "never" }));
  const visual = app.container.querySelector("[aria-hidden]");
  await app.render(h(NumberTick, { value: 1000, duration: 1000, reducedMotion: "never" }));
  frames.flush(4);
  afterReducedOn(() => {
    frames.flush(2);
    const value = Number(visual.textContent.replace(/,/g, ""));
    assert.ok(value > 0 && value < 1000, `still counting ${visual.textContent}`);
    frames.settle();
  });
  await app.unmount();
});

test("ripple: reduced motion switched on mid-expansion stops the scale animation (fade only)", () => {
  const waapi = stubAnimate();
  try {
    const node = host();
    const before = media.listenerCount;
    const handle = attachEffect(node, ripple);
    down(node);
    const growing = () =>
      waapi.calls.filter((a) => a.playState === "running" && a.keyframes.some((k) => k.transform));
    assert.equal(growing().length, 1, "expanding");
    afterReducedOn(() => {
      assert.equal(growing().length, 0, "no scale animation keeps running");
      const circle = node.querySelector(".neshel-ripple");
      assert.ok(circle, "the ripple stays as a static highlight until release");
      up();
      waapi.finishAll();
      assert.equal(node.querySelector(".neshel-ripple-layer"), null, "removed when idle");
    });
    handle.destroy();
    assert.equal(media.listenerCount, before, "listener released");
    node.remove();
  } finally {
    waapi.restore();
  }
});

test("ripple: 'never' keeps expanding; 'always' never scales", () => {
  const waapi = stubAnimate();
  try {
    const node = host();
    const never = attachEffect(node, ripple, { reducedMotion: "never" });
    down(node);
    afterReducedOn(() => {
      assert.equal(waapi.calls[0].playState, "running", "still expanding");
    });
    up();
    waapi.finishAll();
    never.destroy();
    const always = attachEffect(node, ripple, { reducedMotion: "always" });
    down(node);
    assert.ok(
      waapi.calls.at(-1).keyframes.every((k) => !k.transform),
      "opacity only",
    );
    up();
    waapi.finishAll();
    always.destroy();
    node.remove();
  } finally {
    waapi.restore();
  }
});

test("burst: reduced motion switched on mid-burst removes the particles at once", () => {
  const waapi = stubAnimate();
  try {
    const node = host();
    const before = media.listenerCount;
    const handle = attachEffect(node, burst, { trigger: 0 });
    handle.update({ trigger: 1 });
    assert.ok(node.querySelector(".neshel-burst-particle"));
    afterReducedOn(() => {
      assert.equal(node.querySelector(".neshel-burst-layer"), null, "particles removed");
      assert.ok(
        waapi.calls.every((a) => a.playState !== "running"),
        "no animation left running",
      );
    });
    handle.destroy();
    assert.equal(media.listenerCount, before);
    // 'never' keeps the particles; 'always' never creates them.
    const never = attachEffect(node, burst, { trigger: 0, reducedMotion: "never" });
    never.update({ trigger: 1, reducedMotion: "never" });
    afterReducedOn(() => assert.ok(node.querySelector(".neshel-burst-particle")));
    waapi.finishAll();
    never.destroy();
    const always = attachEffect(node, burst, { trigger: 0, reducedMotion: "always" });
    always.update({ trigger: 1, reducedMotion: "always" });
    assert.equal(node.querySelector(".neshel-burst-layer"), null);
    always.destroy();
    node.remove();
  } finally {
    waapi.restore();
  }
});

test("shake: reduced motion switched on mid-shake drops to the reduced amplitude at once", () => {
  const node = host("div");
  node.setAttribute("aria-invalid", "true");
  const before = media.listenerCount;
  const handle = attachEffect(node, shake, { trigger: 0, distance: 12, duration: 1000 });
  handle.update({ trigger: 1, distance: 12, duration: 1000 });
  frames.flush(3);
  const x = () =>
    Math.abs(Number(/translate3d\((-?[\d.]+)px/.exec(node.style.transform)?.[1] ?? 0));
  afterReducedOn(() => {
    const samples = [];
    while (frames.pending > 0) {
      frames.flush(1);
      samples.push(x());
    }
    assert.ok(Math.max(...samples) <= 4.001, `reduced amplitude ${Math.max(...samples)}`);
    assert.equal(node.style.cssText, "");
  });
  handle.destroy();
  assert.equal(media.listenerCount, before);
  // 'never' keeps the full amplitude.
  const never = attachEffect(node, shake, {
    trigger: 0,
    distance: 12,
    duration: 1000,
    reducedMotion: "never",
  });
  never.update({ trigger: 1, distance: 12, duration: 1000, reducedMotion: "never" });
  frames.flush(2);
  afterReducedOn(() => {
    const samples = [];
    while (frames.pending > 0) {
      frames.flush(1);
      samples.push(x());
    }
    assert.ok(Math.max(...samples) > 4.5, `full amplitude ${Math.max(...samples)}`);
  });
  never.destroy();
  node.remove();
});

// §2 Visual continuity -------------------------------------------------------------------------
// The engine writes in the scheduler's write phase, which runs inside requestAnimationFrame and
// therefore before the browser paints the committed DOM. Each test checks the DOM right after the
// commit (layout effects done, no frame yet), after the first frame (= what the first paint shows),
// during the transition and at the end.

test("NumberTick continuity: the first painted frame still shows the previous value", async () => {
  const app = await mount(h(NumberTick, { value: 100, duration: 400 }));
  const [visual, accessible] = app.container.querySelector(".neshel-number").children;
  assert.equal(visual.textContent, "100", "before the update");
  await app.render(h(NumberTick, { value: 900, duration: 400 }));
  assert.equal(accessible.textContent, "900", "accessible copy is final at once");
  assert.equal(visual.textContent, "100", "right after the commit, before any frame");
  frames.flush(1);
  assert.equal(visual.textContent, "100", "first frame continues from the previous value");
  frames.flush(5);
  const mid = Number(visual.textContent);
  assert.ok(mid > 100 && mid < 900, `during ${mid}`);
  assert.ok(
    Number.isInteger(mid),
    `intermediate values keep the integer precision (${visual.textContent})`,
  );
  frames.settle();
  assert.equal(visual.textContent, "900", "at the end");
  await app.unmount();
});

test("ToggleMorph continuity: the thumb's first frame starts at the previous position", async () => {
  const app = await mount(h(ToggleMorph, { checked: false }));
  const thumb = thumbOf(app);
  assert.equal(thumb.style.cssText, "", "before: CSS state off");
  await app.render(h(ToggleMorph, { checked: true }));
  assert.equal(app.container.firstChild.getAttribute("data-state"), "on");
  assert.ok(frames.pending > 0, "a frame is requested: the start position is written before paint");
  frames.flush(1);
  assert.equal(p(thumb), "0", "first frame: previous position, overriding the new CSS state");
  frames.flush(3);
  const mid = Number(p(thumb));
  assert.ok(mid > 0 && mid < 1, `during ${mid}`);
  frames.settle();
  assert.equal(thumb.style.cssText, "", "end: CSS state on");
  await app.unmount();
});

test("CheckboxDraw continuity: the new mark starts undrawn on the first frame", async () => {
  const app = await mount(h(CheckboxDraw, { checked: false }));
  const svg = app.container.querySelector("svg");
  await app.render(h(CheckboxDraw, { checked: true }));
  assert.ok(svg.querySelector(".neshel-checkbox-mark"), "mark committed");
  assert.ok(frames.pending > 0, "a frame is requested: the undrawn state is written before paint");
  frames.flush(1);
  assert.equal(progressOf(svg), "0", "first frame: undrawn");
  frames.flush(5);
  const mid = Number(progressOf(svg));
  assert.ok(mid > 0 && mid < 1, `during ${mid}`);
  frames.settle();
  assert.equal(svg.style.cssText, "", "end: fully drawn by CSS");
  await app.unmount();
});

test("NumberTick keeps the precision of its values while counting (0.5 → 2.25)", async () => {
  const app = await mount(h(NumberTick, { value: 0.5, duration: 400 }));
  const visual = app.container.querySelector("[aria-hidden]");
  await app.render(h(NumberTick, { value: 2.25, duration: 400 }));
  const seen = [];
  while (frames.pending > 0) {
    frames.flush(1);
    seen.push(visual.textContent);
  }
  for (const text of seen) assert.ok(!/\.\d{3,}/.test(text), `at most 2 decimals: ${text}`);
  assert.equal(seen.at(-1), "2.25");
  await app.unmount();
});
