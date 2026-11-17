// Entrance & Reveal (Phase 010 FR-020, FR-060; contracts/effects-010.md §1, accessibility-010.md §1).
// SSR first (no DOM), then jsdom with a manual requestAnimationFrame.
import assert from "node:assert/strict";
import test from "node:test";
import { frames, h, markup, mount, renderToString, setupDom } from "./helpers.mjs";

const entrance = await import("../dist/entrance/index.js");
const core = await import("../dist/core/index.js");
const { NeshelAnimationsError } = await import("../dist/index.js");
const { tilt3D } = await import("../dist/hover/index.js");
const { Reveal, Stagger, fadeUp, stagger } = entrance;
const { attachEffect, getMotionDebugInfo } = core;

test("entrance subpath runtime exports (010 FR-020, entry-points-010)", () => {
  assert.deepEqual(Object.keys(entrance).sort(), [
    "Reveal",
    "Stagger",
    "blurIn",
    "clipCircle",
    "clipReveal",
    "entranceEffects",
    "fadeDown",
    "fadeIn",
    "fadeLeft",
    "fadeRight",
    "fadeSlide",
    "fadeUp",
    "flipIn",
    "flipX",
    "flipY",
    "maskWipe",
    "rotateIn",
    "scaleIn",
    "springIn",
    "stagger",
    "zoomIn",
  ]);
  assert.deepEqual(
    entrance.entranceEffects.map((definition) => definition.id),
    [
      "entrance/fade",
      "entrance/fade-slide",
      "entrance/scale",
      "entrance/zoom",
      "entrance/blur",
      "entrance/clip",
      "entrance/mask-wipe",
      "entrance/rotate",
      "entrance/flip",
      "entrance/stagger",
      "entrance/spring",
    ],
  );
  for (const definition of entrance.entranceEffects) {
    assert.ok(Object.isFrozen(definition), definition.id);
    assert.equal(definition.family, "entrance");
  }
  assert.ok(core.createEffectRegistry(entrance.entranceEffects).has("entrance/mask-wipe"));
});

test("SSR: Reveal and Stagger render visible markup with a class only (accessibility-010 §1)", () => {
  assert.equal(typeof globalThis.window, "undefined", "runs without a DOM");
  assert.equal(
    markup(h(Reveal, { preset: fadeUp, id: "hero", className: "card" }, "Hello")),
    '<div id="hero" class="neshel-reveal card">Hello</div>',
  );
  assert.equal(
    markup(h(Reveal, { preset: entrance.fadeIn, asChild: true }, h("section", null, "Hi"))),
    '<section class="neshel-reveal">Hi</section>',
  );
  assert.equal(
    markup(h(Stagger, { preset: fadeUp }, h("p", null, "a"), h("p", null, "b"))),
    '<div class="neshel-stagger"><p>a</p><p>b</p></div>',
  );
});

test("invalid entrance usage throws NeshelAnimationsError on the server (FR-060)", () => {
  const cases = [
    [() => markup(h(Reveal, { preset: entrance.fadeSlide, options: { direction: "diagonal" } })), /"direction"/],
    [() => markup(h(Reveal, { preset: entrance.fadeSlide, options: { distance: 999 } })), /"distance"/],
    [() => markup(h(Reveal, { preset: entrance.blurIn, options: { amount: -1 } })), /"amount"/],
    [() => markup(h(Reveal, { preset: entrance.fadeIn, options: { delay: 9000 } })), /"delay"/],
    [() => markup(h(Reveal, { preset: entrance.fadeIn, options: { easing: "wobbly" } })), /easing/],
    [() => markup(h(Reveal, { preset: tilt3D })), /"hover\/tilt-3d" belongs to the "hover" family/],
    [() => markup(h(Reveal, { preset: fadeUp, asChild: true }, "text")), /asChild expects exactly one/],
    [() => markup(h(Stagger, { preset: stagger })), /other than stagger/],
    [() => core.definePreset("Bad Name", entrance.fadeIn, {}), /invalid preset name/],
    [() => core.definePreset("ok", entrance.scaleIn, { from: 3 }), /"from"/],
  ];
  for (const [run, message] of cases) {
    assert.throws(run, (error) => error instanceof NeshelAnimationsError && message.test(error.message));
  }
});

// ------------------------------------------------------------------------------------------------
let media;
test("jsdom environment", async () => {
  ({ media } = await setupDom());
});

function element(style = "") {
  const node = document.createElement("div");
  if (style) node.setAttribute("style", style);
  document.body.appendChild(node);
  return node;
}

/** Inline value of `property` on every frame until nothing is pending. */
function trace(node, property, limit = 400) {
  const values = [];
  let count = 0;
  while (frames.pending > 0 && count < limit) {
    frames.flush(1, 16);
    values.push(node.style.getPropertyValue(property));
    count++;
  }
  return values;
}

const translateY = (transform) => Number(/translate3d\([^,]+, (-?[\d.]+)px/.exec(transform)?.[1] ?? 0);
const translateX = (transform) => Number(/translate3d\((-?[\d.]+)px/.exec(transform)?.[1] ?? 0);

const START_POSES = [
  ["fadeIn", {}, { opacity: "0", transform: "" }],
  ["fadeSlide", {}, { opacity: "0", transform: "translate3d(0px, 16px, 0px)" }],
  ["fadeSlide", { direction: "left", distance: 40 }, { transform: "translate3d(40px, 0px, 0px)" }],
  ["fadeSlide", { direction: "down", distance: 10 }, { transform: "translate3d(0px, -10px, 0px)" }],
  ["fadeSlide", { direction: "right", distance: 10 }, { transform: "translate3d(-10px, 0px, 0px)" }],
  ["scaleIn", {}, { opacity: "0", transform: "scale(0.92)" }],
  ["zoomIn", { from: 1.5 }, { opacity: "0", transform: "scale(1.5)" }],
  ["blurIn", {}, { opacity: "0", filter: "blur(12px)" }],
  ["clipReveal", {}, { "clip-path": "inset(100% 0 0 0)", opacity: "" }],
  ["clipReveal", { direction: "right" }, { "clip-path": "inset(0 100% 0 0)" }],
  ["clipReveal", { shape: "circle" }, { "clip-path": "circle(0% at 50% 50%)" }],
  ["maskWipe", {}, { mask: "linear-gradient(90deg, rgb(0, 0, 0) -25%, transparent 0%)" }],
  ["rotateIn", {}, { opacity: "0", transform: "rotateZ(-6deg) scale(0.98)" }],
  ["flipIn", {}, { opacity: "0", transform: "perspective(800px) rotateX(70deg)" }],
  ["flipIn", { axis: "y", angle: -40 }, { transform: "perspective(800px) rotateY(-40deg)" }],
  ["springIn", {}, { opacity: "0", transform: "translate3d(0px, 24px, 0px) scale(0.9)" }],
];

for (const [name, options, expected] of START_POSES) {
  test(`${name} ${JSON.stringify(options)}: start pose through the host, cleared at the end (FR-020)`, () => {
    const node = element();
    let finished = 0;
    const handle = attachEffect(node, entrance[name], {
      ...options,
      onFinish: (status) => {
        assert.equal(status, "completed");
        finished++;
      },
    });
    assert.equal(node.getAttribute("style"), null, "nothing written synchronously");
    frames.flush(1);
    for (const [property, value] of Object.entries(expected)) {
      assert.equal(node.style.getPropertyValue(property), value, property);
    }
    frames.settle();
    assert.equal(finished, 1, "onFinish once");
    assert.equal(node.style.cssText, "", "every contribution cleared");
    const info = getMotionDebugInfo(node);
    // Exclusive claims belong to the attachment until destroy; nothing is written at rest.
    for (const channel of info?.channels ?? []) assert.equal(channel.contributions, 0, channel.channel);
    handle.destroy();
    frames.flush(1);
    assert.equal(getMotionDebugInfo(node), undefined, "host released after destroy");
    node.remove();
  });
}

test("fade-slide progresses monotonically to rest; opacity rises (tween)", () => {
  const node = element();
  attachEffect(node, entrance.fadeSlide, { distance: 20 });
  frames.flush(1);
  const ys = trace(node, "transform").map(translateY);
  const nonZero = ys.filter((value) => value > 0);
  assert.ok(nonZero.length >= 8, `animated over ${nonZero.length} frames`);
  for (let index = 1; index < nonZero.length; index++) assert.ok(nonZero[index] <= nonZero[index - 1]);
  assert.equal(node.style.cssText, "");
  node.remove();
});

test("spring entrance overshoots past rest before settling (E11)", () => {
  const node = element();
  attachEffect(node, entrance.springIn, { distance: 40 });
  frames.flush(1);
  const ys = trace(node, "transform").map(translateY);
  assert.ok(Math.min(...ys) < -0.5, `overshoot ${Math.min(...ys)}`);
  assert.equal(node.style.cssText, "");
  node.remove();
});

test("consumer inline transform/opacity (with !important) are kept during and restored after", () => {
  const node = element();
  node.style.setProperty("transform", "rotate(2deg)");
  node.style.setProperty("opacity", "0.8", "important");
  attachEffect(node, entrance.fadeSlide);
  frames.flush(1);
  assert.equal(node.style.transform, "rotate(2deg) translate3d(0px, 16px, 0px)");
  assert.equal(node.style.getPropertyValue("opacity"), "0");
  assert.equal(node.style.getPropertyPriority("opacity"), "important");
  frames.flush(10);
  const mid = Number(node.style.opacity);
  assert.ok(mid > 0 && mid < 0.8, `multiplied ${mid}`);
  frames.settle();
  assert.equal(node.style.transform, "rotate(2deg)");
  assert.equal(node.style.getPropertyValue("opacity"), "0.8");
  assert.equal(node.style.getPropertyPriority("opacity"), "important");
  node.remove();
});

test("reduced motion: fade entrances animate opacity only; instant entrances write nothing", () => {
  media.set(true);
  try {
    const slide = element();
    attachEffect(slide, entrance.fadeSlide, { distance: 50 });
    frames.flush(1);
    assert.equal(slide.style.transform, "", "no transform under reduced motion");
    assert.equal(slide.style.opacity, "0");
    const opacities = trace(slide, "opacity");
    assert.ok(opacities.some((value) => Number(value) > 0 && Number(value) < 1), "fades");
    slide.remove();

    for (const name of ["fadeIn", "clipReveal", "maskWipe"]) {
      const node = element();
      let status;
      attachEffect(node, entrance[name], { onFinish: (value) => (status = value) });
      assert.equal(status, "completed", `${name} completes immediately`);
      frames.flush(1);
      assert.equal(node.style.cssText, "", `${name} writes nothing`);
      node.remove();
    }
  } finally {
    media.set(false);
  }
});

test("reducedMotion: 'always' forces the reduced behaviour; 'never' animates despite the preference", () => {
  const forced = element();
  attachEffect(forced, entrance.scaleIn, { reducedMotion: "always" });
  frames.flush(1);
  assert.equal(forced.style.transform, "");
  frames.settle();
  forced.remove();
  media.set(true);
  try {
    const never = element();
    attachEffect(never, entrance.scaleIn, { reducedMotion: "never" });
    frames.flush(1);
    assert.equal(never.style.transform, "scale(0.92)");
    frames.settle();
    never.remove();
  } finally {
    media.set(false);
  }
});

test("reduced motion switched on mid-run jumps to the final state (live)", () => {
  const node = element();
  let status;
  attachEffect(node, entrance.fadeSlide, { onFinish: (value) => (status = value) });
  frames.flush(5);
  assert.notEqual(node.style.transform, "");
  media.set(true);
  try {
    assert.equal(status, "completed");
    frames.flush(1);
    assert.equal(node.style.cssText, "");
  } finally {
    media.set(false);
  }
  node.remove();
});

test("a hidden page never starts an entrance and finishes a running one (accessibility-010 §1)", () => {
  const proto = window.Document.prototype;
  const descriptor = Object.getOwnPropertyDescriptor(proto, "hidden");
  const setHidden = (value) =>
    Object.defineProperty(document, "hidden", { value, configurable: true });
  try {
    setHidden(true);
    const hiddenStart = element();
    let status;
    attachEffect(hiddenStart, entrance.blurIn, { onFinish: (value) => (status = value) });
    assert.equal(status, "completed");
    frames.flush(1);
    assert.equal(hiddenStart.style.cssText, "");
    hiddenStart.remove();

    setHidden(false);
    const running = element();
    attachEffect(running, entrance.blurIn);
    frames.flush(3);
    assert.match(running.style.filter, /blur/);
    setHidden(true);
    document.dispatchEvent(new window.Event("visibilitychange"));
    frames.flush(1);
    assert.equal(running.style.cssText, "");
    running.remove();
  } finally {
    delete document.hidden;
    if (descriptor) Object.defineProperty(proto, "hidden", descriptor);
  }
});

test("appear: false writes nothing; a replay key change replays; delay holds the start pose", () => {
  const node = element();
  const handle = attachEffect(node, entrance.fadeIn, { appear: false });
  frames.flush(2);
  assert.equal(node.style.cssText, "");
  handle.update({ appear: false, replay: 1, delay: 100 });
  frames.flush(1);
  assert.equal(node.style.opacity, "0");
  frames.flush(4); // 64 ms < 100 ms delay
  assert.equal(node.style.opacity, "0", "held during the delay");
  frames.flush(10);
  assert.ok(Number(node.style.opacity) > 0);
  handle.update({ appear: false, replay: 1, delay: 100 }); // same key: no replay
  frames.settle();
  assert.equal(node.style.cssText, "");
  handle.destroy();
  node.remove();
});

test("destroy mid-run clears every contribution and the exclusive channel", () => {
  const node = element("clip-path: circle(40%)");
  const handle = attachEffect(node, entrance.clipReveal);
  frames.flush(3);
  assert.match(node.style.clipPath, /inset/);
  handle.destroy();
  frames.flush(1);
  assert.equal(node.style.clipPath, "circle(40%)");
  assert.equal(frames.pending, 0, "no frame task left");
  node.remove();
});

test("a suspended blur entrance never hides content (exclusive filter owned by another effect)", () => {
  const node = element();
  const owner = core.defineEffect({
    id: "media/tint",
    family: "media",
    channels: [{ channel: "filter", mode: "exclusive" }],
    reducedMotion: "static",
    resolve: () => ({}),
    setup(context) {
      context.channels.exclusive("filter").set("sepia(1)");
      return { update() {}, destroy() {} };
    },
  });
  const tint = attachEffect(node, owner, undefined, { conflicts: "silent" });
  const blur = attachEffect(node, entrance.blurIn, undefined, { conflicts: "silent" });
  assert.equal(blur.state, "suspended");
  frames.flush(2);
  assert.equal(node.style.filter, "sepia(1)");
  assert.equal(node.style.opacity, "", "no start pose written while suspended");
  blur.destroy();
  tint.destroy();
  frames.settle();
  assert.equal(node.style.cssText, "");
  node.remove();
});

test("stagger: increasing delays per child, capped total, order, onFinish once", () => {
  const container = element();
  for (let index = 0; index < 4; index++) container.appendChild(document.createElement("p"));
  let finished = 0;
  attachEffect(container, stagger, {
    preset: fadeUp,
    interval: 100,
    maxStagger: 150,
    onFinish: () => finished++,
  });
  frames.flush(1);
  const children = [...container.children];
  for (const child of children) assert.equal(child.style.opacity, "0", "every child starts hidden");
  frames.flush(4); // 64 ms: only the first child (delay 0) has started
  const started = () => children.map((child) => child.style.opacity !== "0");
  assert.deepEqual(started(), [true, false, false, false]);
  frames.flush(4); // child 3 (100 ms) started; child 4 (150 ms) still waiting
  assert.deepEqual(started(), [true, true, true, false]);
  frames.settle();
  assert.equal(finished, 1);
  for (const child of children) assert.equal(child.style.cssText, "");
  container.remove();
});

test("stagger order 'end' starts with the last child; empty stagger completes", () => {
  const container = element();
  for (let index = 0; index < 3; index++) container.appendChild(document.createElement("p"));
  attachEffect(container, stagger, { preset: entrance.fadeIn, interval: 200, order: "end" });
  frames.flush(5);
  const children = [...container.children];
  assert.equal(children[2].style.opacity !== "0", true);
  assert.equal(children[0].style.opacity, "0");
  frames.settle();
  container.remove();
  const empty = element();
  let status;
  attachEffect(empty, stagger, { preset: fadeUp, onFinish: (value) => (status = value) });
  assert.equal(status, "completed");
  empty.remove();
});

test("<Reveal> on a client mount writes the start pose before the next paint and cleans up", async () => {
  const app = await mount(h(Reveal, { preset: fadeUp, id: "reveal" }, "Hi"));
  const node = app.container.querySelector("#reveal");
  frames.flush(1);
  assert.equal(node.style.transform, "translate3d(0px, 16px, 0px)");
  assert.equal(node.style.opacity, "0");
  frames.settle();
  assert.equal(node.style.cssText, "");
  await app.render(h(Reveal, { preset: fadeUp, id: "reveal", replayKey: 1 }, "Hi"));
  frames.flush(1);
  assert.equal(node.style.opacity, "0", "replayKey replays");
  await app.unmount();
  frames.flush(1);
  assert.equal(node.style.cssText, "", "unmount restores");
  assert.equal(frames.pending, 0);
});

test("<Reveal> does not replay when hydrating server markup (appear='client'); 'always' does", async () => {
  const { act } = await import("react");
  const { hydrateRoot } = await import("react-dom/client");
  for (const [appear, expectHidden] of [
    ["client", false],
    ["always", true],
  ]) {
    const tree = h(Reveal, { preset: fadeUp, id: `h-${appear}`, appear }, "Server");
    const container = document.createElement("div");
    container.innerHTML = renderToString(tree);
    document.body.appendChild(container);
    const errors = [];
    let root;
    await act(async () => {
      root = hydrateRoot(container, tree, { onRecoverableError: (error) => errors.push(error) });
    });
    frames.flush(1);
    const node = container.querySelector(`#h-${appear}`);
    assert.deepEqual(errors, []);
    assert.equal(node.style.opacity === "0", expectHidden, `appear=${appear}`);
    frames.settle();
    assert.equal(node.style.cssText, "");
    await act(async () => root.unmount());
    container.remove();
  }
});

test("<Stagger> animates its children on a client mount", async () => {
  const app = await mount(
    h(Stagger, { preset: entrance.scaleIn, interval: 30, id: "list" }, h("p", null, "a"), h("p", null, "b")),
  );
  frames.flush(1);
  const items = [...app.container.querySelectorAll("#list > p")];
  assert.deepEqual(
    items.map((item) => item.style.transform),
    ["scale(0.92)", "scale(0.92)"],
  );
  frames.settle();
  assert.deepEqual(
    items.map((item) => item.style.cssText),
    ["", ""],
  );
  await app.unmount();
});
