// Composition across families on ONE element (Phase 010 FR-030–FR-032; contracts/composition-matrix.md).
// Every combination required by the brief, the consumer's own inline styles, and restoration when any
// single effect is destroyed while the others stay active.
import assert from "node:assert/strict";
import test from "node:test";
import { frames, h, layoutBox, mount, pointer, setupDom, stubAnimate } from "./helpers.mjs";

await setupDom();
const core = await import("../dist/core/index.js");
const { fadeUp, scaleIn, blurIn, clipReveal, Reveal } = await import("../dist/entrance/index.js");
const { lift, glow, spotlight, borderSweep, tilt3D, Hover } = await import(
  "../dist/hover/index.js"
);
const { pressScale, ripple, shake, Press } = await import("../dist/press/index.js");
const { Tilt3D } = await import("../dist/hover/index.js");
const { attachEffect, attachPreset, getMotionDebugInfo, defineEffect } = core;

function card(style) {
  const node = document.createElement("button");
  if (style) node.setAttribute("style", style);
  document.body.appendChild(node);
  layoutBox(node, { left: 0, top: 0, width: 200, height: 100 });
  return node;
}
const hoverAt = (node, x, y) => {
  pointer(node, "pointerenter", { x, y });
  window.dispatchEvent(
    new window.PointerEvent("pointermove", { clientX: x, clientY: y, pointerType: "mouse" }),
  );
};
const leave = () =>
  window.dispatchEvent(
    new window.PointerEvent("pointermove", { clientX: 999, clientY: 999, pointerType: "mouse" }),
  );
const pressDown = (node) =>
  node.dispatchEvent(
    new window.PointerEvent("pointerdown", {
      button: 0,
      isPrimary: true,
      clientX: 100,
      clientY: 50,
      bubbles: true,
    }),
  );
const pressUp = () => window.dispatchEvent(new window.PointerEvent("pointerup", { button: 0 }));
const parts = (node) => {
  const t = node.style.transform;
  return {
    ty: Number(/translate3d\([^,]+, (-?[\d.]+)px/.exec(t)?.[1] ?? 0),
    scale: Number(/scale\(([\d.]+)\)/.exec(t)?.[1] ?? 1),
    rx: Number(/rotateX\((-?[\d.]+)deg\)/.exec(t)?.[1] ?? 0),
    perspective: /perspective\(/.test(t),
  };
};

test("Entrance + Hover: fade-up translate and lift translate add in one composed transform", () => {
  const node = card();
  attachPreset(node, fadeUp, { distance: 20, duration: 2000, easing: "linear" });
  const hovered = attachEffect(node, lift, { distance: 6 });
  frames.flush(1);
  hoverAt(node, 100, 50);
  frames.flush(40); // lift settled (spring) while the entrance is still running
  const during = parts(node);
  assert.ok(during.ty < 14 && during.ty > -6, `sum of both layers ${node.style.transform}`);
  assert.ok(Number(node.style.opacity) < 1, "entrance opacity still running");
  frames.settle();
  assert.equal(parts(node).ty, -6, "entrance finished, lift remains exactly");
  assert.equal(node.style.opacity, "");
  leave();
  frames.settle();
  hovered.destroy();
  frames.flush(1);
  assert.equal(node.style.cssText, "");
  node.remove();
});

test("Entrance + Press: entrance scale and press scale multiply", () => {
  const node = card();
  const pressed = attachEffect(node, pressScale, { scale: 0.9 });
  pressDown(node);
  frames.settle();
  assert.equal(parts(node).scale, 0.9);
  attachEffect(node, scaleIn, { from: 0.5, duration: 1000, easing: "linear" });
  frames.flush(1);
  assert.equal(parts(node).scale, 0.45, "start: entrance 0.5 × press 0.9");
  frames.flush(30);
  const mid = parts(node).scale;
  assert.ok(mid > 0.45 && mid < 0.9, `product while entering ${mid}`);
  frames.settle();
  assert.equal(parts(node).scale, 0.9, "entrance done: press alone");
  pressUp();
  frames.settle();
  assert.equal(node.style.cssText, "");
  pressed.destroy();
  node.remove();
});

test("Hover + Press: lift translate and press scale in one transform; ripple layer + decor coexist", () => {
  const waapi = stubAnimate();
  try {
    const node = card();
    const handles = [
      attachEffect(node, lift),
      attachEffect(node, glow),
      attachEffect(node, pressScale),
      attachEffect(node, ripple),
    ];
    assert.deepEqual(node.getAttribute("data-neshel-fx").split(" ").sort(), [
      "decor",
      "glow",
      "lift",
      "press-scale",
      "ripple",
    ]);
    hoverAt(node, 100, 50);
    pressDown(node);
    frames.settle();
    assert.deepEqual(parts(node), { ty: -4, scale: 0.96, rx: 0, perspective: false });
    assert.equal(node.style.getPropertyValue("--neshel-glow-progress"), "1");
    assert.ok(node.querySelector(".neshel-ripple"));
    pressUp();
    waapi.finishAll();
    leave();
    frames.settle();
    for (const handle of handles) handle.destroy();
    frames.flush(1);
    assert.equal(node.style.cssText, "");
    assert.equal(node.getAttribute("data-neshel-fx"), null);
    assert.equal(node.children.length, 0);
    node.remove();
  } finally {
    waapi.restore();
  }
});

test("Tilt3D + Hover: tilt rotations, lift translate and spotlight decor together", () => {
  const node = card();
  const handles = [
    attachEffect(node, tilt3D, { maxTilt: 8 }),
    attachEffect(node, lift),
    attachEffect(node, spotlight),
  ];
  hoverAt(node, 200, 0);
  frames.settle();
  assert.deepEqual(parts(node), { ty: -4, scale: 1, rx: 8, perspective: true });
  assert.equal(node.style.getPropertyValue("--neshel-spotlight-x"), "200px");
  leave();
  frames.settle();
  for (const handle of handles) handle.destroy();
  frames.flush(1);
  assert.equal(node.style.cssText, "");
  node.remove();
});

test("Tilt3D + Press: tilt scale × press scale", () => {
  const node = card();
  const tilt = attachEffect(node, tilt3D, { scale: 1.1, maxTilt: 0 });
  const pressed = attachEffect(node, pressScale, { scale: 0.9 });
  hoverAt(node, 100, 50);
  pressDown(node);
  frames.settle();
  assert.equal(parts(node).scale, 0.99);
  pressUp();
  leave();
  frames.settle();
  tilt.destroy();
  pressed.destroy();
  frames.flush(1);
  assert.equal(node.style.cssText, "");
  node.remove();
});

test("Entrance + Tilt3D + Press: destroying any one leaves the other two exact; full restore", () => {
  for (const victim of [0, 1, 2]) {
    const node = card("transform: rotate(1deg); opacity: 0.9");
    const handles = [
      attachPreset(node, fadeUp, { duration: 2000 }),
      attachEffect(node, tilt3D, { maxTilt: 6, scale: 1.05 }),
      attachEffect(node, pressScale, { scale: 0.9 }),
    ];
    frames.flush(1);
    hoverAt(node, 200, 0);
    pressDown(node);
    frames.flush(60);
    const before = node.style.transform;
    assert.match(before, /^rotate\(1deg\) perspective\(1000px\) translate3d/);
    handles[victim].destroy();
    frames.flush(1);
    const after = node.style.transform;
    if (victim === 0) {
      assert.doesNotMatch(after, /translate3d/, "entrance layer gone");
      assert.match(after, /rotateX\(6deg\)/);
      assert.equal(node.style.opacity, "0.9", "entrance opacity contribution removed, base kept");
    }
    if (victim === 1) assert.doesNotMatch(after, /perspective|rotateX/, "tilt layer gone");
    if (victim === 2) assert.ok(!/scale\(0\.9/.test(after), "press layer gone");
    assert.ok(after.startsWith("rotate(1deg)"), "consumer inline transform kept as prefix");
    for (const [index, handle] of handles.entries()) if (index !== victim) handle.destroy();
    pressUp();
    leave();
    frames.settle();
    assert.equal(node.style.transform, "rotate(1deg)");
    assert.equal(node.style.opacity, "0.9");
    assert.equal(getMotionDebugInfo(node), undefined);
    node.remove();
  }
});

test("genuine conflicts: blur entrance vs a filter owner; two glows; sweep vs another ::after user", () => {
  const node = card();
  const tint = defineEffect({
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
  const owner = attachEffect(node, tint, undefined, { conflicts: "silent" });
  const blur = attachEffect(node, blurIn, undefined, { conflicts: "silent" });
  assert.equal(blur.state, "suspended");
  assert.throws(
    () => attachEffect(node, blurIn, undefined, { conflicts: "error" }),
    /"entrance\/blur" is suspended: "filter" .* owned by "media\/tint"/,
  );
  owner.destroy();
  assert.equal(blur.state, "active", "resumes when the filter is released");
  frames.flush(1);
  assert.match(node.style.filter, /blur/);
  blur.destroy();
  const first = attachEffect(node, glow, { color: "red" });
  const second = attachEffect(node, glow, { color: "blue" }, { conflicts: "silent" });
  assert.equal(second.state, "suspended");
  frames.flush(1);
  assert.equal(node.style.getPropertyValue("--neshel-glow-color"), "red");
  first.destroy();
  frames.flush(1);
  assert.equal(node.style.getPropertyValue("--neshel-glow-color"), "blue", "second resumes");
  second.destroy();
  const sweep = attachEffect(node, borderSweep);
  const clip = attachEffect(node, clipReveal, undefined, { conflicts: "silent" });
  assert.equal(clip.state, "active", "clip-path and ::after do not conflict");
  sweep.destroy();
  clip.destroy();
  frames.settle();
  assert.equal(node.style.cssText, "");
  node.remove();
});

test("shake composes with lift and press (all transform layers)", () => {
  const node = card();
  node.setAttribute("aria-invalid", "true");
  const handles = [
    attachEffect(node, lift),
    attachEffect(node, pressScale),
    attachEffect(node, shake, { trigger: 0 }),
  ];
  hoverAt(node, 100, 50);
  frames.settle();
  handles[2].update({ trigger: 1 });
  frames.flush(5);
  const t = node.style.transform;
  assert.match(t, /translate3d\(-?[\d.]+px, -4px, 0px\)/, `shake x + lift y: ${t}`);
  frames.settle();
  assert.equal(parts(node).ty, -4);
  leave();
  frames.settle();
  for (const handle of handles) handle.destroy();
  frames.flush(1);
  assert.equal(node.style.cssText, "");
  node.remove();
});

test("React: nested asChild primitives attach every family to the same element", async () => {
  const waapi = stubAnimate();
  try {
    const app = await mount(
      h(
        Reveal,
        { preset: fadeUp, asChild: true },
        h(
          Hover,
          { preset: [lift, glow], asChild: true },
          h(
            Press,
            { preset: [pressScale, ripple], asChild: true },
            h(
              Tilt3D,
              { asChild: true },
              h("a", { href: "/plan", id: "plan", className: "card" }, "Plan"),
            ),
          ),
        ),
      ),
    );
    const link = app.container.querySelector("#plan");
    assert.deepEqual(link.className.split(" ").sort(), [
      "card",
      "neshel-hover",
      "neshel-press",
      "neshel-reveal",
      "neshel-tilt",
    ]);
    assert.deepEqual(link.getAttribute("data-neshel-fx").split(" ").sort(), [
      "decor",
      "glow",
      "lift",
      "press-scale",
      "ripple",
    ]);
    assert.equal(link.getAttribute("data-neshel-tilt"), "rest");
    frames.flush(1);
    assert.equal(link.style.opacity, "0", "entrance running");
    frames.settle();
    assert.equal(link.style.cssText, "");
    await app.unmount();
    assert.equal(link.getAttribute("data-neshel-fx"), null);
    assert.equal(link.getAttribute("data-neshel-tilt"), null);
  } finally {
    waapi.restore();
  }
});
