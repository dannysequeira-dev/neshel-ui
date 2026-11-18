// Motion host lifecycle (issue #11; ADR 0022 "one host per element", contracts/style-ownership.md).
// A host whose ledger became idle (every contribution cleared, e.g. while motion is reduced) must stay the
// element's ONLY host: attachments keep the host they were attached with, so a second host for the same
// element would write the same inline properties from another ledger and each would adopt the other's
// writes as the "external" baseline — restoring stale values (the macOS/CDP composition failure).
import assert from "node:assert/strict";
import test from "node:test";
import { frames, layoutBox, pointer, setupDom } from "./helpers.mjs";

const { media } = await setupDom();
const core = await import("../dist/core/index.js");
const { getMotionHost } = await import("../dist/core/host.js");
const { lift } = await import("../dist/hover/index.js");
const { pressScale } = await import("../dist/press/index.js");
const { attachEffect, defineEffect, getMotionDebugInfo } = core;

/** A scroll-parallax-like contribution: a transform layer that clears while motion is reduced. */
const offsetLayer = defineEffect({
  id: "scroll/test-offset-layer",
  family: "scroll",
  channels: [{ channel: "transform", mode: "compose" }],
  reducedMotion: "static",
  resolve: (options) => ({ y: options?.y ?? 0 }),
  setup(context) {
    let y = context.options.y;
    const draw = () => {
      if (context.reduced || y === 0) context.channels.transform.clear();
      else context.channels.transform.set({ translateY: y });
    };
    draw();
    const stop = context.onReducedChange(draw);
    return {
      update(next) {
        y = next.y;
        draw();
      },
      destroy() {
        stop();
        context.channels.transform.clear();
      },
    };
  },
});

function card() {
  const node = document.createElement("button");
  document.body.appendChild(node);
  layoutBox(node, { left: 0, top: 0, width: 200, height: 100 });
  return node;
}
/** Sum of every translateY in the inline transform (the composed vertical offset). */
const offsetY = (node) =>
  [...node.style.transform.matchAll(/translate3d\([^,]+, (-?[\d.]+)px/g)].reduce(
    (sum, match) => sum + Number(match[1]),
    0,
  );
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

test("an idle host stays the element's only host while attachments are alive", () => {
  const node = card();
  const first = getMotionHost(node);
  const handle = attachEffect(node, offsetLayer, { y: 12 });
  frames.flush(1);
  handle.update({ y: 0 }); // every contribution cleared: the ledger is idle
  frames.flush(1);
  assert.equal(node.style.cssText, "", "inline styles restored while idle");
  assert.equal(getMotionDebugInfo(node), undefined, "an idle host reports nothing");
  assert.equal(getMotionHost(node), first, "the same host is returned after it went idle");
  handle.destroy();
  frames.flush(1);
  node.remove();
});

test("reduced motion on/off empties the host; hover and press still compose with the live layer (issue #11)", () => {
  const node = card();
  const parallax = attachEffect(node, offsetLayer, { y: 24 });
  const hover = attachEffect(node, lift); // default 4 px
  const press = attachEffect(node, pressScale);
  frames.settle();
  assert.equal(offsetY(node), 24);

  // Live reduced motion: the layer is static (cleared); nothing else contributes -> idle ledger.
  media.set(true);
  frames.settle();
  assert.equal(node.style.transform, "", "no transform while reduced");
  media.set(false);
  frames.settle();
  assert.equal(offsetY(node), 24, "layer back after reduced motion");

  // Hover lifts on top of the live layer.
  hoverAt(node, 100, 50);
  frames.settle();
  assert.equal(offsetY(node), 20, "lift added to the layer");
  // The layer moves (scroll) while hovered, then the pointer leaves.
  parallax.update({ y: 10 });
  frames.settle();
  assert.equal(offsetY(node), 6, "lift composed with the moved layer");
  leave();
  frames.settle();
  assert.equal(offsetY(node), 10, "the live layer is kept after hover (no stale value restored)");
  parallax.update({ y: 30 });
  frames.settle();
  assert.equal(offsetY(node), 30, "later layer changes still reach the element");

  for (const handle of [press, hover, parallax]) handle.destroy();
  frames.settle();
  assert.equal(node.style.cssText, "", "every contribution restored");
  assert.equal(getMotionDebugInfo(node), undefined);
  node.remove();
});

test("an attachment made after the host went idle shares the host of the earlier attachments", () => {
  const node = card();
  const a = attachEffect(node, offsetLayer, { y: 8 });
  frames.flush(1);
  a.update({ y: 0 });
  frames.flush(1); // idle
  const b = attachEffect(node, offsetLayer, { y: 5 });
  a.update({ y: 3 });
  frames.flush(1);
  assert.equal(offsetY(node), 8, "both layers composed by one ledger (3 + 5)");
  b.destroy();
  frames.flush(1);
  assert.equal(offsetY(node), 3);
  a.destroy();
  frames.flush(1);
  assert.equal(node.style.cssText, "");
  node.remove();
});

test("hover and press attached after the host went idle compose with the earlier layer (issue #11)", () => {
  const node = card();
  const parallax = attachEffect(node, offsetLayer, { y: 24 });
  frames.settle();
  media.set(true);
  frames.settle();
  media.set(false);
  frames.settle();
  const hover = attachEffect(node, lift);
  const press = attachEffect(node, pressScale);
  hoverAt(node, 100, 50);
  frames.settle();
  assert.equal(offsetY(node), 20, "lift added to the layer");
  parallax.update({ y: 10 });
  frames.settle();
  assert.equal(offsetY(node), 6, "lift composed with the moved layer");
  leave();
  frames.settle();
  assert.equal(offsetY(node), 10, "the live layer is kept after hover");
  for (const handle of [press, hover, parallax]) handle.destroy();
  frames.settle();
  assert.equal(node.style.cssText, "");
  node.remove();
});
