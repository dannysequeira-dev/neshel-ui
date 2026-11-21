// Phase 014 composition matrix (FR-041; contracts/composition-matrix-014.md). jsdom, manual frames. "Restored"
// = style attribute (cssText), attribute set and child nodes (identity, order) equal to the snapshot.
import assert from "node:assert/strict";
import test from "node:test";
import { frames, h, mount, setupDom } from "./helpers.mjs";

const { media } = await setupDom();
const text = await import("../dist/text/index.js");
const svg = await import("../dist/svg/index.js");
const entrance = await import("../dist/entrance/index.js");
const cinematic = await import("../dist/cinematic/index.js");
const { attachPreset, getFrameScheduler, motionValue } = await import("../dist/core/index.js");

const NS = "http://www.w3.org/2000/svg";
const settle = () => frames.settle(3000, 16);
function snapshot(node) {
  return {
    style: node.style?.cssText ?? "",
    // The style attribute is compared through cssText (CSSOM serialisation may leave `style=""`).
    attributes: [...node.attributes]
      .filter((a) => a.name !== "style")
      .map((a) => `${a.name}=${a.value}`)
      .sort()
      .join("|"),
    children: [...node.childNodes],
    html: node.innerHTML,
  };
}
function assertRestored(node, before, message) {
  const after = snapshot(node);
  assert.equal(after.style, before.style, `${message}: style`);
  assert.equal(after.attributes, before.attributes, `${message}: attributes`);
  assert.deepEqual(after.children, before.children, `${message}: child identity`);
  assert.equal(after.html, before.html, `${message}: markup`);
}
const p = (html, attrs = {}) => {
  const node = document.createElement("p");
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  node.innerHTML = html;
  document.body.appendChild(node);
  return node;
};
const svgPath = (d = "M0 0L100 0", attrs = "") => {
  const root = document.createElementNS(NS, "svg");
  root.innerHTML = `<path d="${d}" ${attrs}/>`;
  document.body.appendChild(root);
  return root.firstElementChild;
};

test("#1 split text + Entrance: element layer and piece reveal both end visible; restored", () => {
  const node = p("Entrance and reveal");
  const before = snapshot(node);
  const handle = attachPreset(node, entrance.fadeUp, { duration: 100 });
  const reveal = text.createTextReveal(node, { duration: 100 });
  settle();
  assert.equal(
    node.querySelector(".neshel-split").style.getPropertyValue("--neshel-reveal-progress"),
    "1",
  );
  reveal.destroy();
  handle.destroy();
  frames.flush(2);
  assertRestored(node, before, "#1");
});

test("#2 split text + Capsize trim: the trimmed element's classes/attributes untouched; pieces are children only", () => {
  const node = p("Trimmed heading", { class: "neshel-text-trim neshel-text-family-display" });
  const before = snapshot(node);
  const reveal = text.createTextReveal(node, { split: "chars", duration: 50 });
  assert.equal(node.className, "neshel-text-trim neshel-text-family-display");
  assert.equal(
    node.firstElementChild.className,
    "neshel-text-a11y",
    "trim pseudo-elements stay on the element",
  );
  settle();
  reveal.destroy();
  assertRestored(node, before, "#2");
});

test("#3 split text + Timeline: seek/reverse render the same values as seek(); destroy restores", () => {
  const node = p("Timeline text");
  const before = snapshot(node);
  const reveal = text.createTextReveal(node, { trigger: "manual" });
  const tl = cinematic.createTimeline();
  tl.add(reveal.track({ duration: 400, easing: "linear" }));
  const root = node.querySelector(".neshel-split");
  tl.seek(0.4);
  frames.flush(1);
  const viaTimeline = root.style.getPropertyValue("--neshel-reveal-progress");
  tl.reverse();
  tl.seek(0.4);
  frames.flush(1);
  assert.equal(root.style.getPropertyValue("--neshel-reveal-progress"), viaTimeline);
  tl.destroy();
  reveal.destroy();
  assertRestored(node, before, "#3");
});

test("#4 typewriter + reduced motion: on mid-run → finished; off → nothing replays", () => {
  const node = p("Typewriter reduced");
  const tw = text.createTypewriter(node, { speed: 20 });
  frames.flush(5);
  media.set(true);
  frames.flush(2);
  const root = node.querySelector(".neshel-split");
  assert.equal(root.style.getPropertyValue("--neshel-type-progress"), "1");
  media.set(false);
  frames.flush(5);
  assert.equal(root.style.getPropertyValue("--neshel-type-progress"), "1");
  tw.destroy();
});

test("#5 scramble + content change (React): re-split, one accessible copy, no stale glyphs", async () => {
  const view = await mount(h(text.ScrambleText, { trigger: "manual" }, "First"));
  const span = view.container.querySelector("span");
  await view.render(h(text.ScrambleText, { trigger: "manual" }, "Second value"));
  assert.equal(span.querySelectorAll(".neshel-text-a11y").length, 1);
  assert.equal(span.querySelector(".neshel-text-a11y").textContent, "Second value");
  assert.equal(span.querySelectorAll("[data-glyph]").length, 0, "manual, never started: no glyphs");
  await view.unmount();
});

test("#6 rotating words + resize: one grid cell (box = largest word); hidden words keep their size", () => {
  const node = document.createElement("span");
  document.body.appendChild(node);
  const rot = text.createRotatingWords(node, { words: ["a", "longest word", "mid"] });
  const stack = node.querySelector(".neshel-rotator");
  assert.equal(stack.style.display, "inline-grid");
  for (const word of stack.children) assert.equal(word.style.gridArea, "1 / 1");
  assert.equal(stack.children[1].style.visibility, "hidden", "occupies space without showing");
  rot.destroy();
});

test("#7 line reveal + ScrollScene progress: follows; reduced motion shows all and ignores the source", () => {
  const node = p("Scroll scene lines");
  const progress = motionValue(0.2);
  const lr = text.createLineReveal(node, { source: progress });
  const root = node.querySelector(".neshel-split");
  frames.flush(1);
  assert.equal(root.style.getPropertyValue("--neshel-reveal-progress"), "0.2");
  media.set(true);
  progress.set(0.4);
  frames.flush(1);
  assert.equal(root.style.getPropertyValue("--neshel-reveal-progress"), "1");
  media.set(false);
  lr.destroy();
});

test("#8 path draw + Timeline: offset follows seek; release restores the consumer's dashes", () => {
  const path = svgPath("M0 0L100 0", 'style="stroke-dasharray: 3 3"');
  const before = snapshot(path);
  const draw = svg.createPathDraw(path, { trigger: "manual", release: false });
  const tl = cinematic.createTimeline();
  tl.add(draw.track({ duration: 1000, easing: "linear" }));
  tl.seek(1);
  frames.flush(1);
  assert.equal(path.style.getPropertyValue("stroke-dashoffset"), "0");
  tl.destroy();
  draw.destroy();
  frames.flush(1);
  assertRestored(path, before, "#8");
});

test("#9 path morph + interruption: continues from the rendered shape; d restored", () => {
  const path = svgPath("M0 0L10 0");
  const before = snapshot(path);
  const morph = svg.createPathMorph(path, {
    shapes: ["M0 0L10 0", "M0 10L10 10", "M0 20L10 20"],
    easing: "linear",
    duration: 160,
  });
  morph.to(1);
  frames.flush(6);
  const rendered = path.getAttribute("d");
  morph.to(2);
  frames.flush(1);
  assert.equal(path.getAttribute("d"), rendered);
  settle();
  morph.destroy();
  assertRestored(path, before, "#9");
});

test("#10 motion path (fallback) + consumer transform and another layer compose; restored", () => {
  const box = document.createElement("div");
  box.style.transform = "rotate(5deg)";
  document.body.appendChild(box);
  const before = snapshot(box);
  const mp = svg.createMotionPath(box, {
    path: "M0 0L50 0",
    trigger: "manual",
    easing: "linear",
    rotate: 0,
  });
  const lift = attachPreset(box, entrance.fadeUp, { duration: 50 });
  mp.seek(1);
  frames.flush(1);
  assert.match(box.style.transform, /^rotate\(5deg\)/);
  settle();
  lift.destroy();
  mp.destroy();
  frames.flush(2);
  assertRestored(box, before, "#10");
});

test("#11 icon morph + keyboard: the consumer button keeps focus and its aria-expanded", () => {
  const button = document.createElement("button");
  button.setAttribute("aria-expanded", "false");
  button.innerHTML = `<svg aria-hidden="true"><path d="${svg.menuCloseShapes.menu}"/></svg>`;
  document.body.appendChild(button);
  const icon = svg.createIconMorph(button.querySelector("path"), { shapes: svg.menuCloseShapes });
  button.addEventListener("click", () => {
    const open = button.getAttribute("aria-expanded") !== "true";
    button.setAttribute("aria-expanded", String(open));
    icon.set(open ? "close" : "menu");
  });
  button.focus();
  button.click();
  settle();
  assert.equal(document.activeElement, button);
  assert.equal(button.getAttribute("aria-expanded"), "true");
  assert.equal(icon.name, "close");
  icon.destroy();
});

test("#12 gradient stops + forced colours: static, stops untouched", () => {
  const original = window.matchMedia;
  window.matchMedia = globalThis.matchMedia = (q) =>
    q.includes("forced")
      ? { matches: true, addEventListener() {}, removeEventListener() {} }
      : media;
  try {
    const root = document.createElementNS(NS, "svg");
    root.innerHTML = '<linearGradient><stop offset="0" stop-color="red"/></linearGradient>';
    document.body.appendChild(root);
    const stop = root.querySelector("stop");
    const before = snapshot(stop);
    const control = svg.createGradientStops(root.firstElementChild, {
      stops: [{ color: ["red", "blue"] }],
    });
    frames.flush(5);
    assertRestored(stop, before, "#12");
    control.destroy();
  } finally {
    window.matchMedia = globalThis.matchMedia = original;
  }
});

test("#13 logo reveal + reduced motion: instant, no mask written", () => {
  globalThis.CSS = { supports: () => true };
  media.set(true);
  try {
    const logo = svgPath();
    const control = svg.createLogoReveal(logo);
    frames.flush(2);
    assert.equal(logo.style.getPropertyValue("mask"), "");
    control.destroy();
  } finally {
    media.set(false);
    delete globalThis.CSS;
  }
});

test("#14 turbulence + hidden page: no task while hidden; resumes; destroy removes filter and claim", () => {
  const target = svgPath();
  const control = svg.createTurbulence(target, { duration: 5000 });
  frames.flush(2);
  assert.ok(control.state === "running");
  Object.defineProperty(document, "hidden", { value: true, configurable: true });
  document.dispatchEvent(new window.Event("visibilitychange"));
  frames.flush(2);
  assert.equal(getFrameScheduler().size, 0, "no task while hidden");
  Object.defineProperty(document, "hidden", { value: false, configurable: true });
  document.dispatchEvent(new window.Event("visibilitychange"));
  frames.flush(2);
  assert.ok(getFrameScheduler().size > 0, "resumed");
  control.destroy();
  frames.flush(1);
  assert.equal(svg.getSvgDebugInfo().filters, 0);
  assert.equal(target.getAttribute("style") ?? "", "");
});

test("#15 text and SVG in one timeline: one clock task; both restored", () => {
  const node = p("Together");
  const path = svgPath();
  const nb = snapshot(node);
  const pb = snapshot(path);
  const reveal = text.createTextReveal(node, { trigger: "manual" });
  const draw = svg.createPathDraw(path, { trigger: "manual", release: false });
  const tl = cinematic.createTimeline();
  tl.add(reveal.track({ duration: 200 })).add(draw.track({ duration: 200 }), "<");
  tl.play();
  frames.flush(1);
  assert.equal(cinematic.getCinematicDebugInfo().clocks, 1);
  settle();
  tl.destroy();
  reveal.destroy();
  draw.destroy();
  frames.flush(1);
  assertRestored(node, nb, "#15 text");
  assertRestored(path, pb, "#15 svg");
});

test("#16 highlighter + gradient sweep on one element: two tokens, independent release", () => {
  const mark = document.createElement("mark");
  mark.textContent = "both";
  document.body.appendChild(mark);
  const before = snapshot(mark);
  const hl = text.createHighlighter(mark, { duration: 50 });
  const sw = text.createGradientSweep(mark, { duration: 200 });
  assert.match(mark.getAttribute("data-neshel-fx"), /highlight/);
  assert.match(mark.getAttribute("data-neshel-fx"), /text-sweep/);
  hl.destroy();
  frames.flush(1);
  assert.doesNotMatch(mark.getAttribute("data-neshel-fx"), /highlight/);
  assert.match(mark.getAttribute("data-neshel-fx"), /text-sweep/);
  sw.destroy();
  frames.flush(1);
  assertRestored(mark, before, "#16");
});

test("#17 path draw + dash flow on one path: the later claim waits and resumes when the first releases", () => {
  const path = svgPath();
  const draw = svg.createPathDraw(path, { trigger: "manual", release: false });
  draw.seek(0.5);
  frames.flush(1);
  const drawn = path.style.getPropertyValue("stroke-dasharray");
  const flow = svg.createDashFlow(path, { dash: 5, gap: 5, trigger: "manual" });
  flow.seek(0.1);
  frames.flush(1);
  assert.equal(
    path.style.getPropertyValue("stroke-dasharray"),
    drawn,
    "draw still owns the channel",
  );
  draw.destroy();
  flow.seek(0.2);
  frames.flush(1);
  assert.equal(path.style.getPropertyValue("stroke-dasharray"), "5 5", "flow resumed");
  flow.destroy();
  frames.flush(1);
  assert.equal(path.getAttribute("style") ?? "", "");
});

test("#18 font axes + consumer font-variation-settings: consumer axes kept; exact restoration", () => {
  globalThis.CSS = { supports: () => true };
  try {
    const node = p("Axes", { style: 'font-weight: 400; font-variation-settings: "opsz" 20' });
    const before = snapshot(node);
    const written = [];
    const setProperty = node.style.setProperty.bind(node.style);
    node.style.setProperty = (name, value, priority) => {
      if (name === "font-variation-settings") written.push(value);
      return setProperty(name, value, priority);
    };
    const axes = text.createFontAxes(node, {
      from: { wght: 400, GRAD: 0 },
      to: { wght: 700, GRAD: 50 },
      duration: 50,
    });
    axes.play();
    settle();
    assert.match(written.at(-1), /"opsz" 20/);
    assert.match(written.at(-1), /"GRAD" 50/);
    axes.destroy();
    frames.flush(1);
    delete node.style.setProperty;
    assert.equal(node.style.cssText, before.style);
  } finally {
    delete globalThis.CSS;
  }
});
