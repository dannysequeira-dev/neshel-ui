// Phase 013 C02–C10 — cinematic effects (FR-010–FR-012; contracts/cinematic-api.md). jsdom, manual frames,
// offset-chain boxes stubbed, fake ResizeObserver. Real layout and paint are verified in the browser lab.
import assert from "node:assert/strict";
import test from "node:test";
import { Profiler, StrictMode, useState } from "react";
import { box, scaleOf, setupGestureDom, translation } from "./gesture-helpers.mjs";
import { frames, h, markup, mount } from "./helpers.mjs";

const { media } = await setupGestureDom();
const cinematic = await import("../dist/cinematic/index.js");
const entrance = await import("../dist/entrance/index.js");
const core = await import("../dist/core/index.js");
const { getFrameScheduler, motionValue } = core;
const { act } = await import("react");

const settle = (limit = 900) => frames.settle(limit, 16);
const el = (parent = document.body, tag = "div") => {
  const node = document.createElement(tag);
  parent.appendChild(node);
  return node;
};
const opacityOf = (node) => (node.style.opacity === "" ? 1 : Number(node.style.opacity));
const size = (node, width, height) => {
  Object.defineProperty(node, "offsetWidth", { value: width, configurable: true });
  Object.defineProperty(node, "offsetHeight", { value: height, configurable: true });
  Object.defineProperty(node, "clientWidth", { value: width, configurable: true });
  Object.defineProperty(node, "clientHeight", { value: height, configurable: true });
};

/** A controllable progress source shaped like the 011 ScrollProgress. */
function source(initial = 0) {
  const listeners = new Set();
  let value = initial;
  return {
    get: () => value,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    set(next) {
      value = next;
      for (const listener of listeners) listener(value);
    },
    get listeners() {
      return listeners.size;
    },
  };
}

test("C02 scene chapters: laid out by weight, scrubbed by a progress source, active chapter marked", () => {
  const intro = el();
  const story = el();
  const a = el(intro);
  const b = el(story);
  const changes = [];
  const scene = cinematic.createSceneChapters({
    chapters: [
      { id: "intro", element: intro },
      { id: "story", weight: 3, element: story },
    ],
    onChapterChange: (id) => changes.push(id),
  });
  assert.deepEqual(
    scene.chapters.map((c) => [c.id, c.start, c.end]),
    [
      ["intro", 0, 0.25],
      ["story", 0.25, 1],
    ],
  );
  scene.segment("intro", { target: a, from: { opacity: 0 }, to: {}, easing: "linear" }, [0, 1]);
  scene.segment("story", { target: b, from: { x: 100 }, to: {}, easing: "linear" }, [0, 0.5]);
  const scroll = source(0);
  const stop = scene.drive(scroll);
  settle();
  assert.equal(opacityOf(a), 0);
  assert.equal(intro.hasAttribute("data-active"), true);
  scroll.set(0.125);
  settle();
  assert.ok(Math.abs(opacityOf(a) - 0.5) < 0.01, "half of the intro chapter");
  scroll.set(0.25 + 0.75 * 0.25);
  settle();
  assert.equal(translation(b)[0], 50, "segment spans half of the story chapter");
  assert.equal(story.hasAttribute("data-active"), true);
  assert.equal(intro.hasAttribute("data-active"), false);
  assert.deepEqual(changes, ["intro", "story"]);
  assert.equal(scene.chapterAt(0.9).id, "story");
  assert.equal(getFrameScheduler().size, 0, "scrubbing schedules no clock");
  stop();
  assert.equal(scroll.listeners, 0);
  scene.destroy();
  settle();
  assert.equal(a.style.cssText + b.style.cssText, "");
  assert.equal(story.hasAttribute("data-active"), false);
  assert.throws(() => cinematic.createSceneChapters({ chapters: [] }), /non-empty/);
  assert.throws(
    () => cinematic.createSceneChapters({ chapters: [{ id: "a" }, { id: "a" }] }),
    /duplicate chapter/,
  );
});

test("C02 scene chapters: reduced motion shows end states and does not scrub; clock mode without a source", () => {
  const a = el();
  media.set(true);
  const scene = cinematic.createSceneChapters({ chapters: [{ id: "one" }] });
  scene.segment("one", { target: a, from: { x: 80 }, to: {} });
  const scroll = source(0);
  scene.drive(scroll);
  settle();
  assert.equal(a.style.transform, "", "static: end state");
  scroll.set(0.3);
  settle();
  assert.equal(a.style.transform, "");
  media.set(false);
  settle();
  assert.equal(translation(a)[0] > 0, true, "live off: follows the source again");
  scene.destroy();
  const clock = cinematic.createSceneChapters({ chapters: [{ id: "x" }, { id: "y" }], unit: 200 });
  const seen = [];
  const watcher = cinematic.createSceneChapters({
    chapters: [{ id: "p" }, { id: "q" }],
    unit: 200,
    onChapterChange: (id) => seen.push(id),
  });
  watcher.play();
  settle();
  assert.deepEqual(seen, ["p", "q"], "clock mode marks chapters through timeline calls");
  assert.equal(watcher.timeline.state, "completed");
  watcher.destroy();
  clock.destroy();
  settle();
  a.remove();
});

test("C03 camera: pose → one canvas layer; clamped bounds; focus pans to an element; restored", async () => {
  const stage = el();
  const canvas = el(stage);
  const target = el(canvas);
  canvas.style.transform = "rotate(1deg)";
  size(stage, 400, 300);
  size(canvas, 2000, 1200);
  box(stage, { x: 0, y: 0, width: 400, height: 300 });
  box(canvas, { x: 0, y: 0, width: 2000, height: 1200 });
  box(target, { x: 1500, y: 800, width: 200, height: 100 });
  const camera = cinematic.createCamera(stage, canvas, { initial: { x: 200, y: 150, zoom: 1 } });
  settle();
  assert.equal(stage.hasAttribute("data-neshel-camera"), true);
  assert.equal(canvas.style.transform, "rotate(1deg)", "pose at the top-left corner: identity");
  camera.jump({ x: 0, y: 0 });
  settle();
  assert.deepEqual(camera.pose, { x: 200, y: 150, zoom: 1 }, "clamped inside the canvas");
  await act(async () => {
    const done = camera.to({ focus: target }, { duration: 200 });
    settle();
    await done;
  });
  assert.equal(camera.pose.x, 1600);
  assert.equal(camera.pose.y, 850);
  assert.ok(camera.pose.zoom > 1.5, `zoomed to fit the target: ${camera.pose.zoom}`);
  assert.match(canvas.style.transform, /^rotate\(1deg\) translate3d\(.+\) scale\(/);
  const track = camera.track({ x: 1000, y: 600, zoom: 1 }, { duration: 100 });
  assert.equal(track.fill, "both");
  camera.destroy();
  settle();
  assert.equal(canvas.style.transform, "rotate(1deg)");
  assert.equal(stage.hasAttribute("data-neshel-camera"), false);
  stage.remove();
});

test("C04/C05 covers: panels move by their own layers; content untouched; hidden when open; reduced instant", async () => {
  const container = el();
  const content = el(container);
  content.setAttribute("style", "color: red");
  size(container, 600, 400);
  const split = cinematic.createCover(container, { pattern: "split-x" });
  settle();
  const layer = container.querySelector(".neshel-cover-layers");
  assert.equal(layer.hasAttribute("hidden"), false);
  assert.equal(layer.getAttribute("aria-hidden"), "true");
  assert.equal(layer.hasAttribute("inert"), true);
  const [left, right] = layer.children;
  const opening = split.open({ duration: 160, easing: "linear" });
  frames.flush(6);
  assert.ok(translation(left)[0] < 0 && translation(right)[0] > 0, "halves part");
  settle();
  await opening;
  assert.equal(layer.hasAttribute("hidden"), true, "open → hidden layer");
  assert.equal(left.style.cssText, "");
  assert.equal(content.getAttribute("style"), "color: red", "content never written");
  split.destroy();
  assert.equal(container.querySelector(".neshel-cover-layers"), null, "created layer removed");

  const curtain = cinematic.createCover(container, { pattern: "curtain" });
  curtain.open({ duration: 160, easing: "linear" });
  frames.flush(6);
  const drapes = container.querySelector(".neshel-cover-layers").children;
  assert.ok(scaleOf(drapes[0])[0] < 1);
  curtain.destroy();
  const shutter = cinematic.createCover(container, { pattern: "shutter", slats: 4 });
  assert.equal(container.querySelector(".neshel-cover-layers").children.length, 4);
  shutter.destroy();
  media.set(true);
  const reduced = cinematic.createCover(container, { pattern: "split-y" });
  assert.equal(reduced.progress, 1, "reduced motion never covers content");
  await reduced.close();
  assert.equal(reduced.progress, 1);
  reduced.destroy();
  media.set(false);
  settle();
  container.remove();
});

test("C06 title sequence: lines scrubbed in sequence (Entrance progress); background; reduced → fade only", () => {
  const root = el();
  const background = el(root);
  const lines = [el(root, "h2"), el(root, "p"), el(root, "p")];
  const tl = core.getFrameScheduler && cinematic.createTimeline();
  cinematic.titleSequence(tl, {
    lines,
    effect: entrance.fadeUp,
    options: { duration: 200, easing: "linear" },
    interval: 100,
    background,
  });
  assert.equal(tl.getTrack("title:line-2").start, 200);
  tl.seekTo(0);
  settle();
  assert.ok(
    lines.every((line) => opacityOf(line) === 0),
    "every line held at its start pose",
  );
  tl.seekTo(150);
  settle();
  assert.ok(Math.abs(opacityOf(lines[0]) - 0.75) < 0.01, `line 1 at 3/4: ${opacityOf(lines[0])}`);
  assert.ok(Math.abs(opacityOf(lines[1]) - 0.25) < 0.01, `line 2 at 1/4: ${opacityOf(lines[1])}`);
  assert.equal(opacityOf(lines[2]), 0, "line 3 not started");
  assert.ok(scaleOf(background)[0] > 1, "background scale settling (scrubbed pose track)");
  tl.seekTo(50);
  settle();
  assert.ok(Math.abs(opacityOf(lines[0]) - 0.25) < 0.01, "seeking back rewinds the lines");
  tl.seekTo(tl.duration);
  settle();
  assert.equal(lines.map((line) => line.style.cssText).join(""), "", "identity at the end");
  tl.destroy();
  media.set(true);
  const reduced = cinematic.createTimeline({ reducedMotion: "never" });
  cinematic.titleSequence(reduced, { lines, effect: entrance.fadeUp, background });
  reduced.seekTo(100);
  settle();
  assert.equal(translation(lines[0])[1], 0, "no travel under reduced motion");
  assert.equal(scaleOf(background)[0], 1, "background without scale");
  assert.ok(opacityOf(background) < 1, "background fades");
  reduced.seekTo(0);
  reduced.play();
  frames.flush(3);
  assert.equal(
    translation(lines[1])[1],
    0,
    "lines fade (declared reduced behaviour), never travel",
  );
  reduced.destroy();
  media.set(false);
  settle();
  root.remove();
});

test("C07 spotlight: lens moved by one layer from a single measurement; clear hides it; reduced static", async () => {
  const stage = el();
  const target = el(stage);
  box(stage, { x: 0, y: 0, width: 800, height: 600 });
  box(target, { x: 300, y: 200, width: 100, height: 50 });
  const before = cinematic.getCinematicDebugInfo().reads;
  const spotlight = cinematic.createSpotlight(stage, { radius: 100 });
  const lens = stage.querySelector(".neshel-spotlight-layer > .neshel-spotlight");
  assert.equal(stage.querySelector(".neshel-spotlight-layer").getAttribute("aria-hidden"), "true");
  assert.equal(lens.hasAttribute("hidden"), true);
  const done = spotlight.focus(target, { duration: 160 });
  frames.flush(3);
  assert.equal(
    cinematic.getCinematicDebugInfo().reads,
    before + 1,
    "one read per focus, none per frame",
  );
  settle();
  await done;
  assert.equal(lens.hasAttribute("hidden"), false);
  const [x, y] = translation(lens);
  assert.equal(x, 350 - 2000);
  assert.equal(y, 225 - 2000);
  assert.equal(scaleOf(lens)[0], 0.5, "radius 100 / lens hole 200");
  await act(async () => {
    const clearing = spotlight.clear({ duration: 100 });
    settle();
    await clearing;
  });
  assert.equal(lens.hasAttribute("hidden"), true);
  media.set(true);
  spotlight.focus({ x: 10, y: 10 });
  assert.equal(lens.hasAttribute("hidden"), false, "reduced: placed without motion");
  media.set(false);
  spotlight.destroy();
  assert.equal(stage.querySelector(".neshel-spotlight-layer"), null);
  settle();
  stage.remove();
});

test("C08 depth of field: blur by distance through filter claims; capped; reduced removes blur; restored", async () => {
  const container = el();
  const layers = [el(container), el(container), el(container)];
  layers[2].style.filter = "saturate(2)";
  const depth = cinematic.createDepthOfField(container, { falloff: 6, maxBlur: 10 });
  await act(async () => {
    const done = depth.focus(0, { duration: 100 });
    settle();
    await done;
  });
  assert.equal(layers[0].style.filter, "");
  assert.equal(layers[1].style.filter, "blur(6px)");
  assert.equal(layers[2].style.filter, "blur(10px)", "capped at maxBlur");
  assert.ok(scaleOf(layers[2])[0] < 1);
  media.set(true);
  settle();
  assert.equal(layers[1].style.filter, "", "reduced: no blur");
  media.set(false);
  settle();
  assert.equal(layers[1].style.filter, "blur(6px)");
  depth.destroy();
  settle();
  assert.equal(layers[2].style.filter, "saturate(2)", "baseline restored exactly");
  for (let i = 0; i < 4; i++) el(container);
  assert.throws(() => cinematic.createDepthOfField(container), /at most 6 layers/);
  container.remove();
});

test("C09 storyboard: opt-in autoplay pauses on hover/focus/hidden/reduced; user pause sticky; restores", async () => {
  const root = el();
  const frameEls = [el(root), el(root), el(root)];
  const changes = [];
  const realTimeout = globalThis.setTimeout;
  const timers = [];
  globalThis.setTimeout = (fn, ms) => {
    timers.push({ fn, ms });
    return timers.length;
  };
  const realClear = globalThis.clearTimeout;
  globalThis.clearTimeout = (id) => {
    if (timers[id - 1]) timers[id - 1].cleared = true;
  };
  const fire = () => {
    const next = timers.findLast((t) => !t.cleared && !t.fired);
    if (next) {
      next.fired = true;
      next.fn();
    }
  };
  try {
    const story = cinematic.createStoryboard(root, frameEls, {
      autoplay: true,
      interval: 3000,
      onChange: (i, cause) => changes.push([i, cause]),
    });
    assert.equal(frameEls[1].getAttribute("aria-hidden"), "true");
    assert.equal(frameEls[1].hasAttribute("inert"), true);
    assert.equal(story.rotating, true);
    fire();
    assert.deepEqual(changes, [[1, "autoplay"]]);
    root.dispatchEvent(new window.Event("pointerenter"));
    assert.equal(story.rotating, false, "hover pauses");
    root.dispatchEvent(new window.Event("pointerleave"));
    assert.equal(story.rotating, true);
    root.dispatchEvent(new window.FocusEvent("focusin"));
    assert.equal(story.rotating, false, "focus within pauses");
    root.dispatchEvent(new window.FocusEvent("focusout"));
    story.pause();
    assert.equal(story.playing, false);
    assert.equal(story.rotating, false);
    story.next();
    assert.deepEqual(changes.at(-1), [2, "user"]);
    assert.equal(story.rotating, false, "user pause is sticky after manual navigation");
    story.play();
    assert.equal(story.rotating, true);
    media.set(true);
    assert.equal(story.playing, false, "reduced motion stops autoplay");
    story.play();
    assert.equal(story.playing, false, "and refuses to start it");
    story.next();
    assert.equal(story.index, 0, "loops; instant change under reduced motion");
    settle();
    assert.equal(getFrameScheduler().size, 0, "no transition timeline under reduced motion");
    media.set(false);
    story.goTo(2);
    settle();
    story.stop();
    settle();
    assert.equal(story.index, 0);
    story.destroy();
    assert.equal(root.hasAttribute("data-neshel-storyboard"), false);
    assert.ok(frameEls.every((f) => !f.hasAttribute("inert") && !f.hasAttribute("aria-hidden")));
    assert.ok(frameEls.every((f) => f.style.cssText === ""));
    media.set(true);
    const never = cinematic.createStoryboard(root, frameEls, { autoplay: true });
    assert.equal(never.playing, false, "no autoplay when reduced motion is on at start");
    never.destroy();
    media.set(false);
  } finally {
    globalThis.setTimeout = realTimeout;
    globalThis.clearTimeout = realClear;
  }
  root.remove();
});

test("C10 letterbox: bars scale in by their own layers; frame and content byte-identical afterwards", async () => {
  const frame = el();
  frame.setAttribute("style", "position: relative; transform: scale(1.1)");
  frame.setAttribute("data-x", "1");
  const content = el(frame);
  const beforeFrame = frame.outerHTML;
  const letterbox = cinematic.createLetterbox(frame);
  const bars = frame.querySelector(".neshel-letterbox-bars");
  assert.equal(bars.hasAttribute("hidden"), true);
  await act(async () => {
    const shown = letterbox.show({ duration: 120 });
    frames.flush(4);
    assert.ok(scaleOf(bars.children[0])[1] < 1 && scaleOf(bars.children[0])[1] > 0);
    settle();
    await shown;
  });
  assert.equal(bars.hasAttribute("hidden"), false);
  await act(async () => {
    const hidden = letterbox.hide({ duration: 120 });
    settle();
    await hidden;
  });
  letterbox.destroy();
  settle();
  assert.equal(frame.outerHTML, beforeFrame, "frame (and content) byte-identical");
  assert.equal(content.getAttribute("style"), null);
  frame.remove();
});

test("React: server markup is the visible content; components mount, run and restore (StrictMode)", async () => {
  const html = markup(
    h(
      "div",
      null,
      h(cinematic.SplitReveal, null, h("p", null, "Revealed")),
      h(cinematic.Letterbox, null, h("p", null, "Framed")),
      h(
        cinematic.Storyboard,
        { label: "Story" },
        h(cinematic.StoryboardFrame, null, "One"),
        h(cinematic.StoryboardFrame, null, "Two"),
      ),
      h(cinematic.CameraStage, { label: "Map" }, h("p", null, "Canvas")),
      h(cinematic.Spotlight, null, h("p", null, "Lit")),
      h(cinematic.TitleSequence, { effect: entrance.fadeUp }, h("h1", null, "Title")),
    ),
  );
  assert.match(
    html,
    /<p>Revealed<\/p><div class="neshel-cover-layers" aria-hidden="true" hidden=""/,
  );
  assert.match(html, /neshel-letterbox-bars" aria-hidden="true" hidden=""/);
  assert.match(html, /aria-roledescription="carousel"/);
  assert.match(html, /<section aria-label="Map" tabindex="0" class="neshel-camera-stage">/);
  assert.match(html, /<h1>Title<\/h1>/);
  assert.doesNotMatch(html, /opacity|transform/, "no hidden or moved content on the server");

  let commits = 0;
  // biome-ignore lint/correctness/noComponentHookFactories: the test counts commits of its own component.
  function App() {
    const [active, setActive] = useState(false);
    return h(
      Profiler,
      { id: "c", onRender: () => commits++ },
      h("button", { id: "lb", onClick: () => setActive(!active) }, "toggle"),
      h(cinematic.Letterbox, { active, duration: 160 }, h("p", null, "Frame")),
      h(
        cinematic.DepthOfField,
        { focus: active ? 1 : -1, duration: 160 },
        h("div", null, "a"),
        h("div", null, "b"),
        h("div", null, "c"),
      ),
    );
  }
  const view = await mount(h(StrictMode, null, h(App)));
  const button = view.container.querySelector("#lb");
  await act(async () => button.click());
  const after = commits;
  settle();
  assert.equal(commits, after, "zero commits while effects animate");
  const bars = view.container.querySelector(".neshel-letterbox-bars");
  assert.equal(bars.hasAttribute("hidden"), false);
  const layers = view.container.querySelector(".neshel-depth").children;
  assert.match(layers[0].style.filter, /blur/);
  await view.unmount();
  settle();
  assert.equal(layers[0].style.cssText, "");
  assert.equal(getFrameScheduler().size, 0);
});

test("React SceneChapters: segments register into chapters and follow the source", async () => {
  const scroll = source(0);
  const view = await mount(
    h(
      cinematic.SceneChapters,
      { source: scroll },
      h(
        cinematic.Chapter,
        { id: "c1" },
        h(cinematic.SceneSegment, { id: "s1", from: { x: 60 } }, "one"),
      ),
      h(
        cinematic.Chapter,
        { id: "c2" },
        h(cinematic.SceneSegment, { id: "s2", effect: entrance.fadeIn }, "two"),
      ),
    ),
  );
  const s1 = view.container.querySelector("#s1");
  const s2 = view.container.querySelector("#s2");
  settle();
  assert.equal(translation(s1)[0], 60);
  assert.equal(opacityOf(s2), 0);
  await act(async () => scroll.set(1));
  settle();
  assert.equal(s1.style.transform, "");
  assert.equal(s2.style.opacity, "");
  assert.equal(view.container.querySelector("#c2").hasAttribute("data-active"), true);
  await view.unmount();
  assert.equal(scroll.listeners, 0, "source released on unmount");
  void motionValue;
});
