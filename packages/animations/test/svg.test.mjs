// Phase 014 — SVG & Paths (FR-020–FR-031; contracts/svg-geometry.md, svg-api.md). jsdom (no SVG geometry, no
// CSS.supports): the JS geometry is exercised directly; native geometry and support are verified in the lab.
import assert from "node:assert/strict";
import test from "node:test";
import { StrictMode } from "react";
import { frames, h, markup, mount, setupDom } from "./helpers.mjs";

const { media } = await setupDom();
const svg = await import("../dist/svg/index.js");
const cinematic = await import("../dist/cinematic/index.js");
const { getFrameScheduler } = await import("../dist/core/index.js");

const NS = "http://www.w3.org/2000/svg";
const settle = (limit = 2000) => frames.settle(limit, 16);
function svgEl(inner) {
  const root = document.createElementNS(NS, "svg");
  root.innerHTML = inner;
  document.body.appendChild(root);
  return root;
}
const close = (a, b, tolerance, message) =>
  assert.ok(Math.abs(a - b) <= tolerance, `${message}: ${a} vs ${b} (±${tolerance})`);
function withCss(fn) {
  globalThis.CSS = { supports: () => true };
  try {
    return fn();
  } finally {
    delete globalThis.CSS;
  }
}

// --- Path data (FR-020) ---------------------------------------------------------------------------------------

test("FR-020 parse: relative = absolute; H/V/S/T normalised exactly; compact numbers and packed arc flags", () => {
  const abs = svg.serializePathData(svg.parsePathData("M10 10 L20 10 L20 20 Z"));
  const rel = svg.serializePathData(svg.parsePathData("m10 10 h10 v10 z"));
  assert.equal(rel, abs);
  assert.equal(
    svg.serializePathData(svg.parsePathData("M0 0 C 0 10 10 10 10 0 S 20 -10 20 0")),
    "M0 0C0 10 10 10 10 0C10 -10 20 -10 20 0",
  );
  assert.equal(
    svg.serializePathData(svg.parsePathData("M0 0Q5 10 10 0T20 0")),
    "M0 0Q5 10 10 0Q15 -10 20 0",
  );
  assert.equal(svg.serializePathData(svg.parsePathData("M.5.5-1-2 1e1 0")), "M0.5 0.5L-1 -2L10 0");
  const arc = svg.parsePathData("M0 0a5 5 0 1010 0");
  assert.deepEqual(arc[1], {
    type: "A",
    rx: 5,
    ry: 5,
    angle: 0,
    large: true,
    sweep: false,
    x: 10,
    y: 0,
  });
  assert.equal(
    svg.parsePathData("M1 1 2 2 3 3").filter((c) => c.type === "L").length,
    2,
    "implicit lines after M",
  );
  assert.equal(svg.serializePathData(svg.parsePathData("M0.123456 0"), 2), "M0.12 0");
});

test("FR-020 invalid data fails with a controlled error naming the offset", () => {
  for (const bad of [
    "L0 0",
    "M0",
    "M0 0 X1 1",
    "M0 0 A1 1 0 2 0 1 1",
    "M0 0 L1e400 0",
    "M0 0 Z 1 2",
    "M NaN 0",
  ]) {
    assert.throws(
      () => svg.parsePathData(bad),
      (error) =>
        error.name === "NeshelAnimationsError" &&
        /offset|number|move|flag|command/.test(error.message),
      bad,
    );
  }
  assert.deepEqual(svg.parsePathData(""), []);
});

// --- Geometry (FR-021) ------------------------------------------------------------------------------------------

test("FR-021 geometry: lines, rect, circle arcs, cubic curves, disconnected subpaths, zero length", () => {
  assert.equal(svg.getPathGeometry("M0 0L30 40").length, 50);
  const rect = svg.getPathGeometry("M0 0H10V20H0Z");
  assert.equal(rect.length, 60);
  assert.equal(rect.subpaths[0].closed, true);
  const circle = svg.getPathGeometry("M10 0A10 10 0 0 1 -10 0A10 10 0 0 1 10 0Z");
  close(circle.length, 2 * Math.PI * 10, 0.1, "circle");
  // Quarter circle as a cubic (k = 0.5523): length ≈ π/2·r.
  const k = 0.5523 * 100;
  close(
    svg.getPathGeometry(`M100 0C100 ${k} ${k} 100 0 100`).length,
    (Math.PI / 2) * 100,
    0.1,
    "cubic quarter circle",
  );
  const two = svg.getPathGeometry("M0 0L10 0M100 100L100 110");
  assert.equal(two.length, 20, "jump between subpaths not counted");
  assert.deepEqual(two.pointAt(15), { x: 100, y: 105, angle: 90 });
  const zero = svg.getPathGeometry("M5 5");
  assert.equal(zero.length, 0);
  assert.deepEqual(zero.pointAt(3), { x: 5, y: 5, angle: 0 });
  assert.deepEqual(svg.getPathGeometry("M0 0L10 0").pointAt(-5), { x: 0, y: 0, angle: 0 });
  // Arc with too-small radii is scaled up (SVG F.6.6): a half circle through the end points.
  close(svg.getPathGeometry("M0 0A1 1 0 0 1 20 0").length, Math.PI * 10, 0.1, "scaled arc");
  // Zero radius → line.
  assert.equal(svg.getPathGeometry("M0 0A0 5 0 0 1 10 0").length, 10);
});

test("FR-021 measurePath: native when available, JS geometry fallback for path and basic shapes", () => {
  const root = svgEl(
    '<path d="M0 0L3 4"/><circle cx="0" cy="0" r="10"/><rect width="10" height="5"/><line x1="0" y1="0" x2="0" y2="7"/><polyline points="0,0 3,4 3,10"/>',
  );
  const [path, circle, rect, line, poly] = root.children;
  assert.equal(svg.measurePath(path), 5);
  close(svg.measurePath(circle), 2 * Math.PI * 10, 0.1, "circle");
  assert.equal(svg.measurePath(rect), 30);
  assert.equal(svg.measurePath(line), 7);
  assert.equal(svg.measurePath(poly), 11);
  path.getTotalLength = () => 42;
  assert.equal(svg.measurePath(path), 42, "native wins");
  path.getTotalLength = () => Number.NaN;
  assert.equal(svg.measurePath(path), 5, "non-finite native falls back");
  root.remove();
});

// --- Morph (FR-022) ---------------------------------------------------------------------------------------------

test("FR-022 morph policy: exact command equality, cubic promotion, arc flags, endpoints exact, no blind strings", () => {
  assert.deepEqual(svg.getPathMorphCompatibility("M0 0L10 0", "m5 5l10 0"), { compatible: true });
  const bad = svg.getPathMorphCompatibility("M0 0L10 0", "M0 0C1 1 2 2 10 0");
  assert.equal(bad.compatible, false);
  assert.equal(bad.index, 1);
  assert.deepEqual(
    svg.getPathMorphCompatibility("M0 0L10 0", "M0 0C1 1 2 2 10 0", { normalize: "cubic" }),
    { compatible: true },
  );
  assert.equal(
    svg.getPathMorphCompatibility("M0 0A5 5 0 0 1 10 0", "M0 0A5 5 0 1 1 10 0").compatible,
    false,
  );
  assert.equal(svg.getPathMorphCompatibility("M0 0L1 1Z", "M0 0L1 1L2 2").compatible, false);
  const f = svg.interpolatePath("M0 0L10 0", "M0 10L20 10");
  assert.equal(f(0), "M0 0L10 0");
  assert.equal(f(1), "M0 10L20 10");
  assert.equal(f(0.5), "M0 5L15 5");
  assert.equal(f(Number.NaN), "M0 0L10 0");
  // Promotion preserves geometry: the cubic of a line has the same length.
  const promoted = svg.interpolatePath("M0 0L30 40", "M0 0C0 0 30 40 30 40", {
    normalize: "cubic",
  })(0);
  close(svg.getPathGeometry(promoted).length, 50, 0.01, "promoted line");
  assert.throws(() => svg.interpolatePath("M0 0L1 1", "M0 0Q1 1 2 2"), /incompatible/);
  assert.throws(() => svg.interpolatePath("M0 0L1 1", "M0 0L1 1", { precision: 9 }), /precision/);
});

// --- Effects (FR-030–FR-031) -----------------------------------------------------------------------------------

test("S01 path draw: dash channels inline, nothing at 0, consumer dash styles restored on release", async () => {
  const root = svgEl('<path d="M0 0L100 0" style="stroke-dasharray: 4 2"/>');
  const path = root.firstElementChild;
  const control = svg.createPathDraw(path, { duration: 160 });
  frames.flush(1);
  assert.equal(path.style.getPropertyValue("stroke-dasharray"), "100 101");
  assert.equal(path.style.getPropertyValue("stroke-dashoffset"), "100.5");
  settle();
  await control.finished;
  frames.flush(1);
  assert.equal(path.style.getPropertyValue("stroke-dasharray"), "4 2", "released at completion");
  assert.equal(path.style.getPropertyValue("stroke-dashoffset"), "");
  control.seek(0.5);
  frames.flush(1);
  assert.equal(path.style.getPropertyValue("stroke-dasharray"), "100 101");
  control.destroy();
  frames.flush(1);
  assert.equal(path.getAttribute("style"), "stroke-dasharray: 4 2;");
  assert.equal(getFrameScheduler().size, 0);
  root.remove();
});

test("S01 pathLength honoured; zero-length paths untouched; reduced motion instant; d change re-measures", async () => {
  const root = svgEl('<path d="M0 0L100 0" pathLength="1"/><path d="M5 5"/>');
  const [a, z] = root.children;
  const control = svg.createPathDraw([a, z], { trigger: "manual", release: false });
  control.seek(0);
  frames.flush(1);
  assert.equal(a.style.getPropertyValue("stroke-dasharray"), "1 2");
  assert.equal(z.getAttribute("style"), null);
  control.destroy();
  media.set(true);
  const b = svgEl('<path d="M0 0L10 0"/>').firstElementChild;
  const reduced = svg.createPathDraw(b);
  frames.flush(1);
  assert.ok(
    ["", "0"].includes(b.style.getPropertyValue("stroke-dashoffset")),
    "never hidden under reduced motion",
  );
  reduced.destroy();
  media.set(false);
  const c = svgEl('<path d="M0 0L10 0"/>').firstElementChild;
  const m = svg.createPathDraw(c, { trigger: "manual", release: false });
  m.seek(1);
  frames.flush(1);
  c.setAttribute("d", "M0 0L50 0");
  await new Promise((r) => setTimeout(r, 0));
  frames.flush(1);
  assert.equal(c.style.getPropertyValue("stroke-dasharray"), "50 51");
  m.destroy();
});

test("S01 + C01 timeline: dash offset follows seek/reverse; S10 checkmark sequences circle then check", () => {
  const p = svgEl('<path d="M0 0L100 0"/>').firstElementChild;
  const draw = svg.createPathDraw(p, { trigger: "manual", release: false, easing: "linear" });
  const tl = cinematic.createTimeline();
  tl.add(draw.track({ duration: 1000, easing: "linear" }));
  tl.seek(0.5);
  frames.flush(1);
  assert.equal(p.style.getPropertyValue("stroke-dashoffset"), "50.25");
  tl.destroy();
  draw.destroy();
  const check = svgEl('<circle cx="26" cy="26" r="23"/><path d="M15 27l7 7 15-16"/>');
  const [circle, mark] = check.children;
  const c = svg.createCheckmark(check, { trigger: "manual", easing: "linear" });
  c.seek(0.3);
  frames.flush(1);
  const markLen = Number(mark.style.getPropertyValue("stroke-dasharray").split(" ")[0]);
  assert.ok(
    Number(circle.style.getPropertyValue("stroke-dashoffset")) <
      Number(circle.style.getPropertyValue("stroke-dasharray").split(" ")[0]),
    "circle drawing",
  );
  close(
    Number(mark.style.getPropertyValue("stroke-dashoffset")),
    markLen + Math.max(1, markLen * 0.01) / 2,
    0.01,
    "check not started",
  );
  assert.equal(check.getAttribute("role"), null);
  c.destroy();
});

test("S02 path morph: d written through the ledger, interruption continues, incompatible error/swap, exact restore", () => {
  const root = svgEl('<path d="m0 0 h10"/>');
  const path = root.firstElementChild;
  const morph = svg.createPathMorph(path, {
    shapes: ["M0 0L10 0", "M0 10L20 10", "M0 20L40 20"],
    duration: 160,
    easing: "linear",
  });
  assert.equal(path.getAttribute("d"), "m0 0 h10", "untouched until a morph starts");
  morph.to(1);
  frames.flush(6);
  const mid = path.getAttribute("d");
  assert.notEqual(mid, "m0 0 h10");
  morph.to(2); // interrupt: continues from the rendered shape
  frames.flush(1);
  assert.equal(path.getAttribute("d"), mid, "starts from the current shape");
  settle();
  assert.equal(path.getAttribute("d"), "M0 20L40 20");
  assert.equal(morph.index, 2);
  morph.destroy();
  assert.equal(path.getAttribute("d"), "m0 0 h10");
  assert.throws(
    () => svg.createPathMorph(path, { shapes: ["M0 0L1 1", "M0 0Q1 1 2 2"] }),
    /incompatible/,
  );
  const swap = svg.createPathMorph(path, {
    shapes: ["M0 0L1 1", "M0 0Q1 1 2 2"],
    incompatible: "swap",
    easing: "linear",
  });
  swap.to(1);
  swap.seek(0.4);
  frames.flush(1);
  assert.equal(path.getAttribute("d"), "M0 0L1 1");
  swap.seek(0.6);
  frames.flush(1);
  assert.equal(path.getAttribute("d"), "M0 0Q1 1 2 2");
  swap.destroy();
  assert.equal(path.getAttribute("d"), "m0 0 h10");
  root.remove();
});

test("S04 icon morph + MorphIcon: named states; decorative by default; the button keeps its name/state", async () => {
  const p = svgEl(`<path d="${svg.menuCloseShapes.menu}"/>`).firstElementChild;
  const icon = svg.createIconMorph(p, { shapes: svg.menuCloseShapes, duration: 50 });
  assert.equal(icon.name, "menu");
  icon.set("close");
  settle();
  assert.equal(
    p.getAttribute("d"),
    svg.parsePathData(svg.menuCloseShapes.close) &&
      svg.serializePathData(svg.parsePathData(svg.menuCloseShapes.close)),
  );
  assert.throws(() => icon.set("nope"), /unknown state/);
  icon.destroy();
  const html = markup(
    h(
      "button",
      { "aria-label": "Menu", "aria-expanded": "false" },
      h(svg.MorphIcon, { shapes: svg.menuCloseShapes, state: "menu" }),
    ),
  );
  assert.match(html, /aria-hidden="true"/);
  assert.match(html, /aria-label="Menu"/);
  const view = await mount(
    h(
      StrictMode,
      null,
      h(
        "button",
        { "aria-expanded": "false" },
        h(svg.MorphIcon, { shapes: svg.menuCloseShapes, state: "menu", duration: 30 }),
      ),
    ),
  );
  await view.render(
    h(
      StrictMode,
      null,
      h(
        "button",
        { "aria-expanded": "true" },
        h(svg.MorphIcon, { shapes: svg.menuCloseShapes, state: "close", duration: 30 }),
      ),
    ),
  );
  settle();
  assert.equal(
    view.container.querySelector("path").getAttribute("d"),
    svg.serializePathData(svg.parsePathData(svg.menuCloseShapes.close)),
  );
  assert.equal(view.container.querySelector("button").getAttribute("aria-expanded"), "true");
  await view.unmount();
});

test("S03 motion path: JS fallback composes a host layer with the consumer's transform; native mode channels", () => {
  const box = document.createElement("div");
  box.style.transform = "scale(2)";
  Object.defineProperty(box, "offsetWidth", { value: 20, configurable: true });
  Object.defineProperty(box, "offsetHeight", { value: 10, configurable: true });
  document.body.appendChild(box);
  const js = svg.createMotionPath(box, { path: "M0 0L100 0", trigger: "manual", easing: "linear" });
  assert.equal(js.mode, "js");
  js.seek(0.5);
  frames.flush(1);
  assert.match(box.style.transform, /^scale\(2\) translate3d\(40px, -5px, 0px\)/);
  js.destroy();
  frames.flush(1);
  assert.equal(box.style.transform, "scale(2)");
  withCss(() => {
    const native = svg.createMotionPath(box, { path: "M0 0L100 0", trigger: "manual", rotate: 30 });
    assert.equal(native.mode, "native");
    native.seek(1);
    frames.flush(1);
    assert.equal(box.style.getPropertyValue("offset-distance"), "100%");
    assert.equal(box.style.getPropertyValue("offset-rotate"), "30deg");
    native.destroy();
    frames.flush(1);
    assert.equal(box.style.getPropertyValue("offset-path"), "");
  });
  assert.throws(() => svg.createMotionPath(box, { path: "L1 1" }), /move/);
  box.remove();
});

test("S05 gradient stops: color-mix stop colours, offsets via the ledger, static under forced colours; restored", () => {
  withCss(() => {
    const root = svgEl(
      '<linearGradient id="g"><stop offset="0" stop-color="red"/><stop offset="1" stop-color="blue"/></linearGradient>',
    );
    const gradient = root.firstElementChild;
    const [s0, s1] = gradient.children;
    const control = svg.createGradientStops(gradient, {
      stops: [{ color: ["red", "gold"] }, { offset: [1, 0.5] }],
      duration: 400,
      trigger: "manual",
    });
    control.seek(0.125); // yoyo: a quarter of the way, smoothstep 0.15625
    frames.flush(1);
    assert.match(
      s0.style.getPropertyValue("stop-color"),
      /color-mix\(in oklab, gold 15\.6\d*%, red\)/,
    );
    assert.equal(s1.getAttribute("offset"), "0.9219");
    control.destroy();
    frames.flush(1);
    assert.equal(s0.getAttribute("style") ?? "", "");
    assert.equal(s1.getAttribute("offset"), "1");
  });
  const original = window.matchMedia;
  window.matchMedia = (q) =>
    q.includes("forced-colors")
      ? { matches: true, addEventListener() {}, removeEventListener() {} }
      : media;
  globalThis.matchMedia = window.matchMedia;
  try {
    const root = svgEl('<linearGradient><stop offset="0"/></linearGradient>');
    const control = svg.createGradientStops(root.firstElementChild, {
      stops: [{ offset: [0, 1] }],
    });
    frames.flush(5);
    assert.equal(getFrameScheduler().size, 0, "static: no task");
    control.destroy();
  } finally {
    window.matchMedia = original;
    globalThis.matchMedia = original;
  }
});

test("S06 chart draw: lines staggered, points revealed when the line passes them; restored", () => {
  const root = svgEl(
    '<path class="line" d="M0 50L100 0"/><circle class="pt" cx="0" cy="50" r="2"/><circle class="pt" cx="100" cy="0" r="2"/>',
  );
  const control = svg.createChartDraw(root, {
    lines: ".line",
    points: ".pt",
    trigger: "manual",
    easing: "linear",
  });
  const [p0, p1] = root.querySelectorAll(".pt");
  control.seek(0.5);
  frames.flush(1);
  assert.equal(p0.style.opacity, "", "first point visible");
  assert.equal(p1.style.opacity, "0", "last point hidden");
  control.seek(1);
  frames.flush(1);
  assert.equal(p1.style.opacity, "");
  control.destroy();
  frames.flush(1);
  assert.equal(root.querySelector(".line").getAttribute("style") ?? "", "");
});

test("S07 turbulence: bounded options, package filter only while running, removed under reduced motion/destroy", () => {
  const target = svgEl('<rect width="10" height="10"/>');
  assert.throws(() => svg.createTurbulence(target, { amplitude: 100 }), /amplitude/);
  assert.throws(() => svg.createTurbulence(target, { frequency: 1 }), /frequency/);
  const filters = [];
  const setProperty = target.style.setProperty.bind(target.style);
  target.style.setProperty = (name, value, priority) => {
    if (name === "filter") filters.push(value);
    return setProperty(name, value, priority);
  };
  const control = svg.createTurbulence(target, { duration: 400 });
  frames.flush(3);
  assert.equal(svg.getSvgDebugInfo().filters, 1);
  assert.ok(filters.at(-1).startsWith("url(#neshel-turbulence-"), filters.at(-1));
  const filter = document.querySelector(".neshel-svg-filter-host");
  assert.equal(filter.getAttribute("aria-hidden"), "true");
  media.set(true);
  frames.flush(2);
  assert.equal(svg.getSvgDebugInfo().filters, 0, "off under reduced motion");
  media.set(false);
  frames.flush(3);
  assert.equal(svg.getSvgDebugInfo().filters, 1, "resumes");
  control.destroy();
  frames.flush(1);
  assert.equal(svg.getSvgDebugInfo().filters, 0);
  assert.equal(target.getAttribute("style") ?? "", "");
  assert.equal(getFrameScheduler().size, 0);
});

test("S08 logo reveal: mask only with support, visible without; outline drawn first; restored", () => {
  const logo = svgEl('<path class="o" d="M0 0L10 0"/>');
  const noSupport = svg.createLogoReveal(logo, { trigger: "manual" });
  noSupport.seek(0.2);
  frames.flush(1);
  assert.equal(logo.style.getPropertyValue("mask"), "", "never hidden without mask support");
  noSupport.destroy();
  withCss(() => {
    const control = svg.createLogoReveal(logo, {
      pattern: "circle",
      outline: logo.querySelector(".o"),
      trigger: "manual",
    });
    control.seek(0.6);
    frames.flush(1);
    assert.match(logo.style.getPropertyValue("mask"), /radial-gradient/);
    control.destroy();
    frames.flush(1);
    assert.equal(logo.getAttribute("style") ?? "", "");
  });
});

test("S09 dash flow: offset advances while running, static dashes under reduced motion, no task when done", () => {
  const path = svgEl('<path d="M0 0L100 0"/>').firstElementChild;
  const control = svg.createDashFlow(path, { dash: 6, gap: 4, speed: 100, duration: 200 });
  frames.flush(5);
  assert.equal(path.style.getPropertyValue("stroke-dasharray"), "6 4");
  assert.notEqual(path.style.getPropertyValue("stroke-dashoffset"), "0");
  control.pause();
  assert.equal(getFrameScheduler().size, 0, "paused: no task");
  media.set(true);
  control.play();
  frames.flush(2);
  assert.equal(path.style.getPropertyValue("stroke-dashoffset"), "0");
  assert.equal(getFrameScheduler().size, 0);
  media.set(false);
  control.destroy();
  frames.flush(1);
  assert.equal(path.getAttribute("style") ?? "", "");
});

test("SuccessCheck and PathDraw React: server markup decorative by default; mounted engines restore on unmount", async () => {
  assert.match(markup(h(svg.SuccessCheck)), /aria-hidden="true"/);
  assert.match(markup(h(svg.SuccessCheck, { title: "Saved" })), /role="img" aria-label="Saved"/);
  const view = await mount(
    h(
      StrictMode,
      null,
      h("svg", null, h(svg.PathDraw, { trigger: "manual" }, h("path", { d: "M0 0L10 0" }))),
    ),
  );
  const path = view.container.querySelector("path");
  assert.equal(path.getAttribute("style"), null);
  await view.unmount();
  assert.equal(svg.getSvgDebugInfo().effects, 0);
});
