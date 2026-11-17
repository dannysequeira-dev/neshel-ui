// Hover & Pointer family (Phase 010 FR-021, FR-060; contracts/effects-010.md §2, accessibility-010.md §2).
import assert from "node:assert/strict";
import test from "node:test";
import { frames, h, layoutBox, markup, mount, pointer, setupDom } from "./helpers.mjs";

const hover = await import("../dist/hover/index.js");
const core = await import("../dist/core/index.js");
const { NeshelAnimationsError } = await import("../dist/index.js");
const { fadeIn } = await import("../dist/entrance/index.js");
const { Hover, lift, glow, magnetic, spotlight, borderSweep, underline, mediaZoom, parallax, shine } =
  hover;
const { attachEffect, definePreset } = core;

test("hoverEffects lists H01–H10 in catalogue order; every definition is frozen", () => {
  assert.deepEqual(
    hover.hoverEffects.map((definition) => definition.id),
    [
      "hover/lift",
      "hover/glow",
      "hover/tilt-3d",
      "hover/magnetic",
      "hover/spotlight",
      "hover/border-sweep",
      "hover/underline",
      "hover/media-zoom",
      "hover/parallax",
      "hover/shine",
    ],
  );
  for (const definition of hover.hoverEffects) assert.ok(Object.isFrozen(definition));
});

test("SSR: <Hover> renders the element with its class only; lists and asChild", () => {
  assert.equal(typeof globalThis.window, "undefined");
  assert.equal(
    markup(h(Hover, { preset: lift, id: "card", className: "c" }, "Card")),
    '<div id="card" class="neshel-hover c">Card</div>',
  );
  assert.equal(
    markup(h(Hover, { preset: [lift, glow], asChild: true }, h("a", { href: "/x" }, "Link"))),
    '<a href="/x" class="neshel-hover">Link</a>',
  );
});

test("invalid hover usage throws NeshelAnimationsError on the server", () => {
  const cases = [
    [() => markup(h(Hover, { preset: lift, options: { distance: 100 } })), /"distance"/],
    [() => markup(h(Hover, { preset: glow, options: { color: "red; x: y" } })), /"color"/],
    [() => markup(h(Hover, { preset: underline, options: { origin: "top" } })), /"origin"/],
    [() => markup(h(Hover, { preset: borderSweep, options: { colors: ["red"] } })), /"colors"/],
    [() => markup(h(Hover, { preset: lift, options: { pointerTypes: ["finger"] } })), /"pointerTypes"/],
    [() => markup(h(Hover, { preset: [lift, glow], options: {} })), /single preset/],
    [() => markup(h(Hover, { preset: [] })), /must not be empty/],
    [() => markup(h(Hover, { preset: fadeIn })), /belongs to the "entrance" family/],
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

function host(tag = "div") {
  const node = document.createElement(tag);
  document.body.appendChild(node);
  layoutBox(node, { left: 0, top: 0, width: 200, height: 100 });
  return node;
}
const move = (x, y, pointerType = "mouse") =>
  window.dispatchEvent(new window.PointerEvent("pointermove", { clientX: x, clientY: y, pointerType }));
function enter(node, x = 100, y = 50, pointerType = "mouse") {
  pointer(node, "pointerenter", { x, y, pointerType });
}
const leave = () => move(900, 900);
const prop = (node, name) => node.style.getPropertyValue(name);
const fx = (node, attribute = "data-neshel-fx") => node.getAttribute(attribute);
const translate = (node) => {
  const match = /translate3d\((-?[\d.]+)px, (-?[\d.]+)px/.exec(node.style.transform);
  return match ? { x: Number(match[1]), y: Number(match[2]) } : { x: 0, y: 0 };
};

test("lift: pointer lifts (transform layer) and drives the shadow value; leave springs back; tokens", () => {
  const node = host();
  const handle = attachEffect(node, lift, { distance: 6 });
  assert.equal(fx(node), "lift decor");
  enter(node);
  frames.flush(3);
  assert.ok(translate(node).y < 0, node.style.transform);
  assert.ok(Number(prop(node, "--neshel-lift-progress")) > 0);
  frames.settle();
  assert.equal(translate(node).y, -6);
  assert.equal(prop(node, "--neshel-lift-progress"), "1");
  leave();
  frames.flush(2);
  assert.ok(translate(node).y < 0 && translate(node).y > -6, "animates back");
  frames.settle();
  assert.equal(node.style.cssText, "");
  handle.destroy();
  assert.equal(fx(node), null, "tokens removed");
  node.remove();
});

/** Simulate how the focus was obtained: `:focus-visible` matches only keyboard focus. */
function withFocusVisible(keyboard, run) {
  const original = window.Element.prototype.matches;
  window.Element.prototype.matches = function (selector) {
    if (selector === ":focus-visible") return keyboard && this === document.activeElement;
    return original.call(this, selector);
  };
  try {
    run();
  } finally {
    window.Element.prototype.matches = original;
  }
}

test("lift: keyboard focus-visible inside activates; mouse focus does not; blur deactivates (accessibility-010 §2)", () => {
  const node = host();
  const button = document.createElement("button");
  node.appendChild(button);
  const handle = attachEffect(node, lift);
  withFocusVisible(false, () => button.focus());
  frames.settle();
  assert.equal(node.style.cssText, "", "pointer-initiated focus is not focus-visible");
  button.blur();
  withFocusVisible(true, () => button.focus());
  frames.settle();
  assert.equal(translate(node).y, -4);
  button.blur();
  frames.settle();
  assert.equal(node.style.cssText, "");
  handle.destroy();
  node.remove();
});

test("touch is opt-in; disabled returns to rest", () => {
  const node = host();
  const handle = attachEffect(node, lift);
  enter(node, 100, 50, "touch");
  frames.settle();
  assert.equal(node.style.cssText, "", "touch ignored by default");
  handle.update({ pointerTypes: ["touch"] });
  handle.destroy();
  const touch = attachEffect(node, lift, { pointerTypes: ["touch"] });
  enter(node, 100, 50, "touch");
  frames.settle();
  assert.equal(translate(node).y, -4);
  touch.update({ pointerTypes: ["touch"], disabled: true });
  frames.settle();
  assert.equal(node.style.cssText, "");
  leave();
  touch.destroy();
  node.remove();
});

test("lift under reduced motion: no movement; the shadow value switches without animation (static)", () => {
  media.set(true);
  try {
    const node = host();
    const handle = attachEffect(node, lift);
    enter(node);
    frames.flush(1);
    assert.equal(node.style.transform, "");
    assert.equal(prop(node, "--neshel-lift-progress"), "1");
    leave();
    frames.flush(1);
    assert.equal(node.style.cssText, "");
    handle.destroy();
    node.remove();
  } finally {
    media.set(false);
  }
});

test("glow: parameters written only when they differ from the CSS defaults; restored on destroy", () => {
  const node = host();
  node.style.setProperty("--neshel-glow-color", "teal");
  const plain = attachEffect(node, glow);
  frames.flush(1);
  assert.equal(prop(node, "--neshel-glow-color"), "teal", "consumer value untouched by defaults");
  plain.destroy();
  const handle = attachEffect(node, glow, { color: "gold", size: 5 });
  frames.flush(1);
  assert.equal(prop(node, "--neshel-glow-color"), "gold");
  assert.equal(prop(node, "--neshel-glow-size"), "5px");
  assert.equal(prop(node, "--neshel-glow-blur"), "", "default blur not written");
  enter(node);
  frames.settle();
  assert.equal(prop(node, "--neshel-glow-progress"), "1");
  handle.destroy();
  frames.flush(1);
  assert.equal(node.style.cssText, "--neshel-glow-color: teal;");
  leave();
  node.remove();
});

test("magnetic: follows the pointer within max; pointer-only (focus ignored); off when reduced", () => {
  const node = host();
  const handle = attachEffect(node, magnetic, { strength: 0.5, max: 10 });
  enter(node, 100, 50);
  move(200, 50); // right edge: offset 100 px × 0.5 → clamped to 10
  frames.settle();
  assert.deepEqual(translate(node), { x: 10, y: 0 });
  leave();
  frames.settle();
  assert.equal(node.style.cssText, "");
  const button = document.createElement("button");
  node.appendChild(button);
  withFocusVisible(true, () => button.focus());
  frames.settle();
  assert.equal(node.style.cssText, "", "keyboard focus does not move the element");
  button.blur();
  media.set(true);
  try {
    enter(node, 100, 50);
    move(200, 50);
    frames.settle();
    assert.equal(node.style.cssText, "");
    leave();
  } finally {
    media.set(false);
  }
  handle.destroy();
  node.remove();
});

test("spotlight: pointer position in px, fade in/out, centred when reduced", () => {
  const node = host();
  const handle = attachEffect(node, spotlight, { intensity: 0.5 });
  assert.equal(fx(node), "spotlight decor");
  enter(node, 30, 20);
  frames.settle();
  assert.equal(prop(node, "--neshel-spotlight-x"), "30px");
  assert.equal(prop(node, "--neshel-spotlight-y"), "20px");
  assert.equal(prop(node, "--neshel-spotlight-progress"), "1");
  assert.equal(prop(node, "--neshel-spotlight-intensity"), "50%");
  leave();
  frames.flush(2);
  assert.equal(prop(node, "--neshel-spotlight-x"), "30px", "position kept while fading out");
  frames.settle();
  assert.equal(prop(node, "--neshel-spotlight-x"), "");
  media.set(true);
  try {
    enter(node, 30, 20);
    frames.flush(1);
    assert.equal(prop(node, "--neshel-spotlight-x"), "", "no follow under reduced motion");
    assert.equal(prop(node, "--neshel-spotlight-progress"), "1");
    leave();
  } finally {
    media.set(false);
  }
  handle.destroy();
  frames.flush(1);
  assert.equal(node.style.cssText, "");
  node.remove();
});

test("border sweep: owns ::after through the sentinel channel; active and reduced tokens (live)", () => {
  const node = host();
  const handle = attachEffect(node, borderSweep, { duration: 2000 });
  frames.flush(1);
  assert.equal(fx(node), "border-sweep");
  assert.equal(prop(node, "--neshel-sweep-duration"), "2000ms");
  assert.equal(fx(node, "data-neshel-fx-active"), null);
  enter(node);
  assert.equal(fx(node, "data-neshel-fx-active"), "border-sweep");
  frames.settle();
  assert.equal(prop(node, "--neshel-sweep-progress"), "1");
  media.set(true);
  assert.equal(fx(node, "data-neshel-fx-reduced"), "border-sweep");
  media.set(false);
  assert.equal(fx(node, "data-neshel-fx-reduced"), null);
  // Another ::after user conflicts visibly (009 arbitration through --neshel-layer-after).
  const other = core.defineEffect({
    id: "3d/fold",
    family: "3d",
    channels: [{ channel: "--neshel-layer-after", mode: "exclusive" }],
    reducedMotion: "instant",
    resolve: () => ({}),
    setup: () => ({ update() {}, destroy() {} }),
  });
  const warnings = [];
  const original = console.warn;
  console.warn = (message) => warnings.push(String(message));
  let folded;
  try {
    folded = attachEffect(node, other, undefined, { conflicts: "warn" });
  } finally {
    console.warn = original;
  }
  assert.equal(folded.state, "suspended");
  assert.ok(warnings.some((w) => w.includes('"3d/fold" is suspended') && w.includes("--neshel-layer-after")));
  handle.destroy();
  assert.equal(folded.state, "active", "resumes when the ring is released");
  folded.destroy();
  leave();
  frames.flush(1);
  assert.equal(node.style.cssText, "");
  assert.equal(fx(node), null);
  assert.equal(fx(node, "data-neshel-fx-active"), null);
  node.remove();
});

test("underline: origin and thickness parameters; instant under reduced motion", () => {
  const node = host("a");
  const handle = attachEffect(node, underline, { origin: "center", thickness: 3 });
  frames.flush(1);
  assert.equal(prop(node, "--neshel-underline-origin"), "50%");
  assert.equal(prop(node, "--neshel-underline-thickness"), "3px");
  media.set(true);
  try {
    enter(node);
    frames.flush(1);
    assert.equal(prop(node, "--neshel-underline-progress"), "1");
    leave();
    frames.flush(1);
    assert.equal(prop(node, "--neshel-underline-progress"), "");
  } finally {
    media.set(false);
  }
  handle.destroy();
  node.remove();
});

test("media zoom: scales the media child through ITS host; the frame keeps its own styles", () => {
  const frame = host();
  const img = document.createElement("img");
  img.style.transform = "translateX(1px)";
  frame.appendChild(img);
  const handle = attachEffect(frame, mediaZoom, { scale: 1.2 });
  assert.equal(fx(frame), "media-zoom");
  enter(frame);
  frames.settle();
  assert.equal(img.style.transform, "translateX(1px) scale(1.2)");
  assert.equal(frame.style.cssText, "");
  leave();
  frames.settle();
  assert.equal(img.style.transform, "translateX(1px)");
  enter(frame);
  frames.flush(3);
  handle.destroy();
  frames.flush(1);
  assert.equal(img.style.transform, "translateX(1px)", "destroy restores the child");
  leave();
  // An explicit [data-neshel-media] target wins over the first child.
  const caption = document.createElement("p");
  const target = document.createElement("img");
  target.setAttribute("data-neshel-media", "");
  frame.replaceChildren(caption, target);
  const second = attachEffect(frame, mediaZoom);
  enter(frame);
  frames.settle();
  assert.equal(caption.style.transform, "");
  assert.equal(target.style.transform, "scale(1.08)");
  second.destroy();
  leave();
  frame.remove();
});

test("parallax: depth layers move against the pointer, scaled by depth", () => {
  const group = host();
  const far = document.createElement("div");
  far.setAttribute("data-neshel-depth", "0.5");
  const near = document.createElement("div");
  near.setAttribute("data-neshel-depth", "1");
  group.append(far, near);
  const handle = attachEffect(group, parallax, { strength: 20 });
  enter(group, 100, 50);
  move(200, 100); // right/bottom edge: normalised (1, 1)
  frames.settle();
  assert.deepEqual(translate(near), { x: -20, y: -20 });
  assert.deepEqual(translate(far), { x: -10, y: -10 });
  leave();
  frames.settle();
  assert.equal(near.style.cssText + far.style.cssText, "");
  handle.destroy();
  group.remove();
});

test("shine: one sweep per activation (tween), cleared when done; nothing under reduced motion", () => {
  const node = host();
  const handle = attachEffect(node, shine, { duration: 200 });
  enter(node);
  frames.flush(4);
  const mid = Number(prop(node, "--neshel-shine-progress"));
  assert.ok(mid > 0 && mid < 1, `sweeping ${mid}`);
  frames.settle();
  assert.equal(prop(node, "--neshel-shine-progress"), "", "cleared after the sweep");
  leave();
  frames.settle();
  enter(node);
  frames.flush(3);
  assert.ok(Number(prop(node, "--neshel-shine-progress")) > 0, "replays on the next activation");
  leave();
  frames.settle();
  media.set(true);
  try {
    enter(node);
    frames.flush(3);
    assert.equal(prop(node, "--neshel-shine-progress"), "");
    leave();
  } finally {
    media.set(false);
  }
  handle.destroy();
  node.remove();
});

test("Tilt3D + lift + glow compose on one element; destroying one keeps the others exact", () => {
  const node = host();
  const tilt = attachEffect(node, hover.tilt3D, { maxTilt: 10 });
  const lifted = attachEffect(node, lift, { distance: 5 });
  const glowing = attachEffect(node, glow);
  enter(node, 100, 50);
  move(200, 0);
  frames.settle();
  assert.match(node.style.transform, /^perspective\(1000px\) translate3d\(0px, -5px, 0px\) rotateX\(10deg\) rotateY\(10deg\)$/);
  assert.equal(prop(node, "--neshel-glow-progress"), "1");
  lifted.destroy();
  frames.flush(1);
  assert.match(node.style.transform, /^perspective\(1000px\) rotateX\(10deg\) rotateY\(10deg\)$/);
  assert.equal(prop(node, "--neshel-glow-progress"), "1", "glow untouched");
  assert.deepEqual(fx(node).split(" ").sort(), ["decor", "glow"], "decor token kept by glow");
  glowing.destroy();
  tilt.destroy();
  leave();
  frames.flush(1);
  assert.equal(node.style.cssText, "");
  assert.equal(fx(node), null);
  node.remove();
});

test("<Hover preset={[lift, glow]}> attaches both on mount and cleans up on unmount", async () => {
  const strongGlow = definePreset("strong", glow, { size: 6 });
  const app = await mount(h(Hover, { preset: [lift, strongGlow], id: "h" }, "Card"));
  const node = app.container.querySelector("#h");
  layoutBox(node);
  assert.equal(fx(node), "lift decor glow");
  frames.flush(1);
  assert.equal(prop(node, "--neshel-glow-size"), "6px");
  await app.render(h(Hover, { preset: [lift, definePreset("strong", glow, { size: 7 })], id: "h" }, "Card"));
  frames.flush(1);
  assert.equal(prop(node, "--neshel-glow-size"), "7px", "option change updates without re-attach");
  await app.unmount();
  frames.flush(1);
  assert.equal(node.style.cssText, "");
  assert.equal(fx(node), null);
});
