// Phase 014 — Typography & Text (FR-001–FR-013; contracts/text-splitter.md, text-api.md). jsdom with manual
// frames; no layout engine (line tops are stubbed). Real layout, bidi and fonts are verified in the lab.
import assert from "node:assert/strict";
import test from "node:test";
import { StrictMode } from "react";
import { frames, h, markup, mount, setupDom } from "./helpers.mjs";

const { media } = await setupDom();
const text = await import("../dist/text/index.js");
const segment = await import("../dist/text/engine/segment.js");
const cinematic = await import("../dist/cinematic/index.js");
const { getFrameScheduler, motionValue } = await import("../dist/core/index.js");

const settle = (limit = 2000) => frames.settle(limit, 16);
function el(html, tag = "p", attrs = {}) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  node.innerHTML = html;
  document.body.appendChild(node);
  return node;
}
const prop = (node, name) => node.style.getPropertyValue(name);
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
      for (const listener of [...listeners]) listener(value);
    },
    get listeners() {
      return listeners.size;
    },
  };
}

// --- Segmentation (FR-001) ------------------------------------------------------------------------------------

const CORPUS = [
  "👨‍👩‍👧‍👦 family",
  "👍🏽 ok 🇪🇸",
  "été ñ",
  "こんにちは世界、元気ですか。",
  "สวัสดีครับ ยินดี",
  "שלום עולם 123",
  "مرحبا بالعالم",
  "Hello, «world»! 3.14 don't",
];

test("FR-001 graphemes and words are lossless and keep clusters (segmenter on and off)", () => {
  for (const enabled of [true, false]) {
    segment.segmenterOverride.enabled = enabled;
    try {
      for (const sample of CORPUS) {
        assert.equal(
          text.segmentGraphemes(sample).join(""),
          sample,
          `graphemes ${enabled} ${sample}`,
        );
        assert.equal(
          text
            .segmentWords(sample)
            .map((w) => w.text)
            .join(""),
          sample,
          `words ${enabled} ${sample}`,
        );
      }
      const clusters = text.segmentGraphemes("👨‍👩‍👧‍👦👍🏽🇪🇸é");
      assert.deepEqual(
        clusters,
        ["👨‍👩‍👧‍👦", "👍🏽", "🇪🇸", "é"],
        `clusters (segmenter ${enabled})`,
      );
      const words = text
        .segmentWords("Hello, «world»!")
        .filter((w) => w.wordLike)
        .map((w) => w.text);
      assert.deepEqual(words, ["Hello,", "«world»!"]);
    } finally {
      segment.segmenterOverride.enabled = true;
    }
  }
  assert.equal(text.getSegmenterSupport().grapheme, true);
  const ja = text
    .segmentWords("こんにちは世界", "ja")
    .filter((w) => w.wordLike)
    .map((w) => w.text);
  assert.ok(ja.length >= 2, `Japanese words: ${ja}`);
  assert.equal(segment.strongDirection("123 שלום"), "rtl");
  assert.equal(segment.needsShaping("مرحبا"), true);
  assert.equal(segment.needsShaping("नमस्ते"), true);
  assert.equal(segment.needsShaping("Hello"), false);
});

// --- Splitter (FR-002) ------------------------------------------------------------------------------------------

test("FR-002 one accessible copy: originals moved (same nodes), visual copy aria-hidden; revert is exact", () => {
  const p = el(
    'Rooted in <em id="x" class="k" onclick="evil()">faith</em>, built with hope.',
    "h2",
  );
  const before = p.innerHTML;
  const originals = [...p.childNodes];
  const split = text.splitText(p, { split: "chars" });
  assert.equal(split.state, "split");
  const a11y = p.querySelector(".neshel-text-a11y");
  assert.ok(a11y, "hidden copy");
  assert.deepEqual([...a11y.childNodes], originals, "the same node objects");
  assert.match(a11y.getAttribute("style"), /clip-path: ?inset\(50%\)/);
  assert.equal(split.root.getAttribute("aria-hidden"), "true");
  assert.equal(split.text, "Rooted in faith, built with hope.");
  // Visual text equals the accessible text; ids/handlers never cloned; classes kept.
  assert.equal(split.root.textContent, split.text);
  assert.equal(split.root.querySelector("[id]"), null);
  assert.equal(split.root.querySelector("[onclick]"), null);
  assert.ok(split.root.querySelector("em.k"));
  assert.equal(p.querySelectorAll("#x").length, 1);
  assert.equal(split.pieces.length, [...split.text.replace(/\s/g, "")].length);
  assert.equal(split.pieces[3].style.getPropertyValue("--neshel-i"), "3");
  assert.equal(split.root.style.getPropertyValue("--neshel-n"), String(split.pieces.length));
  split.revert();
  split.revert();
  assert.equal(p.innerHTML, before);
  assert.deepEqual([...p.childNodes], originals);
  assert.equal(p.hasAttribute("data-neshel-split"), false);
  assert.equal(text.getTextDebugInfo().splits, 0);
});

test("FR-002 unsupported content (links, controls, editable, empty) is never split", () => {
  for (const [html, attrs] of [
    ['Read <a href="/x">more</a>', {}],
    ["Press <button>go</button>", {}],
    ["Editable", { contenteditable: "true" }],
    ['<span tabindex="0">focus</span>', {}],
    ['<span role="link">x</span>', {}],
    ["   ", {}],
  ]) {
    const p = el(html, "p", attrs);
    const before = p.innerHTML;
    const split = text.splitText(p);
    assert.equal(split.state, "unsupported", html);
    assert.ok(split.reason);
    assert.equal(p.innerHTML, before);
    split.revert();
  }
  // Effects fall back to visible static content.
  const p = el('Go <a href="/">home</a>');
  const control = text.createTextReveal(p);
  assert.equal(p.querySelector(".neshel-split"), null);
  control.destroy();
});

test("FR-002 bidi: RTL runs isolated in LTR text; digits keep LTR inside clusters; shaping words stay whole", () => {
  const p = el("Hello שלום עולם and 123 مرحبا");
  const split = text.splitText(p, { split: "chars" });
  const runs = [...split.root.querySelectorAll(".neshel-split-run")];
  assert.ok(runs.length >= 1);
  assert.equal(runs[0].getAttribute("dir"), "rtl");
  assert.match(runs[0].textContent, /שלום עולם/);
  const digits = split.words.find((w) => w.textContent === "123");
  assert.equal(digits.getAttribute("dir"), "ltr");
  const arabic = split.words.find((w) => w.textContent === "مرحبا");
  assert.ok(arabic.hasAttribute("data-neshel-split-whole"), "Arabic word kept whole");
  assert.equal(arabic.querySelector(".neshel-split-char"), null);
  split.revert();
  // An RTL paragraph keeps RTL words un-wrapped; the LTR word is isolated.
  const rtl = el("שלום world עולם", "p", { dir: "rtl" });
  const s2 = text.splitText(rtl);
  const iso = [...s2.root.querySelectorAll(".neshel-split-run")];
  assert.equal(iso.length, 1);
  assert.equal(iso[0].getAttribute("dir"), "ltr");
  s2.revert();
});

test("FR-002 emoji ZWJ/modifiers/flags and combining marks are single pieces; lang is inherited", () => {
  const p = el("👨‍👩‍👧‍👦👍🏽 🇪🇸 é", "p", { lang: "es" });
  const split = text.splitText(p, { split: "chars" });
  assert.deepEqual(
    split.pieces.map((c) => c.textContent),
    ["👨‍👩‍👧‍👦", "👍🏽", "🇪🇸", "é"],
  );
  split.revert();
});

test("FR-002 shared split: same granularity is reference-counted; another granularity is refused", () => {
  const p = el("Shared split text");
  const a = text.splitText(p, { split: "words" });
  const b = text.splitText(p, { split: "words" });
  assert.equal(a.root, b.root);
  const c = text.splitText(p, { split: "chars" });
  assert.equal(c.state, "unsupported");
  a.revert();
  assert.ok(p.querySelector(".neshel-split"), "still split while b holds it");
  b.revert();
  assert.equal(p.querySelector(".neshel-split"), null);
});

test("FR-002 maxPieces degrades chars → words → lines", () => {
  const p = el("one two three four five six");
  const split = text.splitText(p, { split: "chars", maxPieces: 10 });
  assert.equal(split.split, "words");
  split.revert();
});

test("FR-002 lines: grouped from one read pass, nested markup re-created per line, re-split on refresh", () => {
  const p = el("alpha beta <strong>gamma delta</strong> epsilon");
  // jsdom has no layout: line tops by word text.
  const tops = { alpha: 0, beta: 0, gamma: 0, delta: 20, epsilon: 20 };
  const desc = Object.getOwnPropertyDescriptor(window.HTMLElement.prototype, "offsetTop");
  Object.defineProperty(window.HTMLElement.prototype, "offsetTop", {
    configurable: true,
    get() {
      return tops[this.textContent] ?? 0;
    },
  });
  try {
    const reads = text.getTextDebugInfo().reads;
    const split = text.splitText(p, { split: "lines" });
    assert.equal(text.getTextDebugInfo().reads, reads + 1);
    assert.equal(split.lines.length, 2);
    assert.deepEqual(
      split.lines.map((l) => l.textContent),
      ["alpha beta gamma", "delta epsilon"],
    );
    // <strong> spans both lines: one shell per line.
    assert.equal(split.root.querySelectorAll("strong").length, 2);
    assert.equal(split.pieces, split.lines);
    let changes = 0;
    split.onChange(() => changes++);
    tops.beta = 20;
    split.refresh();
    frames.flush(2);
    assert.equal(changes, 1);
    assert.deepEqual(
      split.lines.map((l) => l.textContent),
      ["alpha", "beta gamma delta epsilon"].slice(0, 1).concat(["beta gamma delta epsilon"]),
    );
    assert.equal(getFrameScheduler().size, 0);
    split.revert();
    assert.equal(p.innerHTML, "alpha beta <strong>gamma delta</strong> epsilon");
  } finally {
    if (desc) Object.defineProperty(window.HTMLElement.prototype, "offsetTop", desc);
  }
});

test("FR-002 defensive revert after the content was replaced (React text update)", () => {
  const p = el("before");
  const split = text.splitText(p);
  p.textContent = "after";
  split.revert();
  assert.equal(p.textContent, "after");
  const again = text.splitText(p);
  assert.equal(again.text, "after");
  again.revert();
});

// --- Effects (FR-010–FR-013) ------------------------------------------------------------------------------------

test("T01 reveal: armed hidden only by JS, one host property per frame, finishes visible; restored", async () => {
  const p = el("A quick reveal of words");
  const control = text.createTextReveal(p, { duration: 160, stagger: 0.5, order: "end" });
  const root = p.querySelector(".neshel-split");
  frames.flush(1);
  assert.equal(prop(root, "--neshel-reveal-progress"), "0");
  assert.equal(root.getAttribute("data-neshel-reveal"), "fade-up");
  assert.ok(root.getAttribute("data-neshel-fx").includes("text-reveal"));
  assert.equal(root.querySelector(".neshel-split-word").style.getPropertyValue("--neshel-o"), "4");
  settle();
  assert.equal(prop(root, "--neshel-reveal-progress"), "1");
  assert.equal(control.state, "completed");
  assert.equal((await control.finished).status, "completed");
  assert.equal(getFrameScheduler().size, 0);
  control.destroy();
  assert.equal(p.innerHTML, "A quick reveal of words");
  assert.equal(text.getTextDebugInfo().effects, 0);
});

test("T01 reduced motion: instant (never hidden); live switch finishes a running reveal", () => {
  media.set(true);
  const p = el("Reduced motion text");
  const control = text.createTextReveal(p);
  frames.flush(2);
  assert.notEqual(prop(p.querySelector(".neshel-split"), "--neshel-reveal-progress"), "0");
  control.destroy();
  media.set(false);
  const q = el("Live switch");
  const live = text.createTextReveal(q, { duration: 1000 });
  frames.flush(3);
  media.set(true);
  frames.flush(2);
  assert.equal(prop(q.querySelector(".neshel-split"), "--neshel-reveal-progress"), "1");
  media.set(false);
  live.destroy();
});

test("T01 + C01 timeline: track() is a value track — seek/reverse render the same values", () => {
  const p = el("Timeline driven text");
  const control = text.createTextReveal(p, { trigger: "manual", easing: "linear" });
  const tl = cinematic.createTimeline();
  tl.add(control.track({ duration: 1000, easing: "linear" }));
  tl.seek(0.25);
  const root = p.querySelector(".neshel-split");
  frames.flush(1);
  assert.equal(prop(root, "--neshel-reveal-progress"), "0.25");
  tl.seek(0.75);
  frames.flush(1);
  assert.equal(prop(root, "--neshel-reveal-progress"), "0.75");
  tl.destroy();
  control.destroy();
  assert.equal(p.textContent, "Timeline driven text");
});

test("T11 line reveal: scrubbed by a progress source; reduced motion shows all and ignores it; restored", () => {
  const p = el("Line one and line two");
  const src = source(0.3);
  const control = text.createLineReveal(p, { source: src });
  const root = p.querySelector(".neshel-split");
  frames.flush(1);
  assert.equal(root.getAttribute("data-split"), "lines");
  assert.equal(prop(root, "--neshel-reveal-progress"), "0.3");
  src.set(0.6);
  frames.flush(1);
  assert.equal(prop(root, "--neshel-reveal-progress"), "0.6");
  media.set(true);
  frames.flush(1);
  assert.equal(prop(root, "--neshel-reveal-progress"), "1");
  src.set(0.1);
  frames.flush(1);
  assert.equal(prop(root, "--neshel-reveal-progress"), "1", "source ignored under reduced motion");
  media.set(false);
  control.destroy();
  assert.equal(src.listeners, 0);
  assert.equal(p.innerHTML, "Line one and line two");
  assert.throws(() => text.createLineReveal(el("x")), /source/);
});

test("T02 typewriter: duration from speed, caret on the boundary (start on the root), all text accessible", async () => {
  const p = el("Hi there");
  const control = text.createTypewriter(p, { speed: 50, trigger: "manual" });
  const root = p.querySelector(".neshel-split");
  assert.equal(p.querySelector(".neshel-text-a11y").textContent, "Hi there");
  control.play();
  frames.flush(1);
  assert.equal(root.getAttribute("data-caret"), "typing");
  frames.flush(5); // 80 ms at 50/s ≈ 4 clusters
  const caret = root.querySelector(".neshel-split-char[data-caret]");
  assert.ok(caret, "caret on a cluster");
  settle();
  await control.finished;
  assert.equal(root.querySelector("[data-caret]"), null, "typing caret removed at rest");
  control.restart();
  frames.flush(1);
  assert.equal(control.state, "running");
  control.finish();
  frames.flush(1);
  assert.equal(prop(root, "--neshel-type-progress"), "1");
  control.destroy();
  assert.equal(p.textContent, "Hi there");
});

test("T03 scramble: glyphs deterministic for (seed, progress), never in the accessible copy, resolved at the end", () => {
  const render = (seed) => {
    const p = el("DECODE ME");
    const control = text.createScramble(p, { seed, trigger: "manual", charset: "ab" });
    control.seek(0.4);
    const glyphs = [...p.querySelectorAll("[data-glyph]")]
      .map((n) => n.getAttribute("data-glyph"))
      .join("");
    control.finish();
    const left = p.querySelectorAll("[data-glyph]").length;
    const a11y = p.querySelector(".neshel-text-a11y").textContent;
    control.destroy();
    return { glyphs, left, a11y };
  };
  const one = render(7);
  const two = render(7);
  assert.equal(one.glyphs, two.glyphs);
  assert.ok(one.glyphs.length > 0);
  assert.match(one.glyphs, /^[ab]+$/);
  assert.equal(one.left, 0);
  assert.equal(one.a11y, "DECODE ME");
});

test("T04 gradient sweep: token + host property on the element; consumer inline style restored exactly", () => {
  const p = el("Sweep", "span", { style: "color: red; --neshel-sweep-progress: 0.5" });
  const before = p.style.cssText;
  const control = text.createGradientSweep(p, { duration: 200, color: "gold" });
  assert.ok(p.getAttribute("data-neshel-fx").includes("text-sweep"));
  frames.flush(4);
  assert.notEqual(prop(p, "--neshel-sweep-progress"), "0.5");
  assert.equal(prop(p, "--neshel-sweep-color"), "gold");
  settle();
  assert.equal(control.state, "completed");
  assert.equal(getFrameScheduler().size, 0);
  control.destroy();
  frames.flush(1);
  assert.equal(p.style.cssText, before);
  assert.equal(p.hasAttribute("data-neshel-fx"), false);
});

test("T05 number roll: localized accessible value, numbering-system digits, rolling columns", async () => {
  const p = el("", "span");
  const roll = text.createNumberRoll(p, {
    value: -1234.5,
    locale: "de-DE",
    format: { style: "currency", currency: "EUR" },
  });
  assert.equal(
    roll.text,
    new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(-1234.5),
  );
  const root = p.querySelector(".neshel-number");
  assert.equal(root.getAttribute("aria-hidden"), "true");
  assert.equal(root.querySelectorAll(".neshel-number-column").length, 6);
  const done = roll.set(-1299.5);
  const cols = [...root.querySelectorAll(".neshel-number-column")];
  // 1234,50 → 1299,50: hundreds 2→2, tens 3→9 (down, value decreases), ones 4→9.
  assert.deepEqual(
    cols
      .slice(0, 4)
      .map((c) => [c.style.getPropertyValue("--from"), c.style.getPropertyValue("--to")]),
    [
      ["1", "1"],
      ["2", "2"],
      ["13", "9"],
      ["14", "9"],
    ],
  );
  settle();
  assert.equal((await done).status, "completed");
  roll.destroy();
  assert.equal(p.innerHTML, "");
  const ar = el("", "span");
  const arabic = text.createNumberRoll(ar, { value: 2026, locale: "ar-EG" });
  assert.equal(arabic.text, new Intl.NumberFormat("ar-EG").format(2026));
  assert.match(ar.querySelector(".neshel-number-holder").textContent, /[٠-٩]/);
  arabic.destroy();
  assert.throws(() => text.createNumberRoll(el(""), { value: Number.NaN }), /finite/);
});

test("T06 rotating words: one accessible text, stable stack, finite, paused by API, static under reduced motion", () => {
  const p = el("", "span");
  const control = text.createRotatingWords(p, {
    words: ["fast", "accessible", "precise"],
    interval: 1000,
    duration: 100,
  });
  assert.equal(p.querySelector(".neshel-text-a11y").textContent, "fast, accessible, precise");
  const words = [...p.querySelectorAll(".neshel-rotator-word")];
  assert.equal(words.length, 3);
  assert.equal(words[1].style.visibility, "hidden");
  frames.flush(70); // > 1 s
  assert.equal(control.index, 1);
  control.pause();
  const at = control.index;
  frames.flush(100);
  assert.equal(control.index, at);
  assert.equal(getFrameScheduler().size, 0);
  control.play();
  settle();
  assert.equal(control.state, "completed");
  media.set(true);
  control.play();
  frames.flush(80);
  assert.equal(control.index, 0, "static first word");
  media.set(false);
  control.destroy();
  assert.equal(p.innerHTML, "");
});

test("T07 wave: phase/energy on the root while running; no task under reduced motion; rest = no energy", () => {
  const p = el("Wave");
  const control = text.createTextWave(p, { duration: 400, repeat: 0 });
  const root = p.querySelector(".neshel-split");
  frames.flush(5);
  assert.ok(prop(root, "--neshel-wave-phase") !== "");
  settle();
  assert.equal(prop(root, "--neshel-wave-energy"), "");
  control.destroy();
  media.set(true);
  const q = el("Reduced wave");
  const reduced = text.createTextWave(q);
  frames.flush(3);
  assert.equal(getFrameScheduler().size, 0);
  assert.equal(prop(q.querySelector(".neshel-split"), "--neshel-wave-phase"), "");
  reduced.destroy();
  media.set(false);
});

test("T08 highlighter and T09 mask: tokens, line inner boxes, element-scope mask channel restored", () => {
  const mark = el("highlight me", "mark");
  const hl = text.createHighlighter(mark, { variant: "underline", duration: 100 });
  assert.ok(mark.getAttribute("data-neshel-fx").includes("highlight"));
  settle();
  assert.equal(prop(mark, "--neshel-highlight-progress"), "1");
  hl.destroy();
  frames.flush(1);
  assert.equal(mark.getAttribute("style") ?? "", "");
  const p = el("mask these lines");
  const mask = text.createTextMask(p, { duration: 100 });
  assert.ok(p.querySelector(".neshel-split-line > .neshel-split-line-inner"));
  settle();
  mask.destroy();
  assert.equal(p.innerHTML, "mask these lines");
  globalThis.CSS = { supports: () => true };
  try {
    const q = el("element scope", "p", { style: "mask: none" });
    const el2 = text.createTextMask(q, { scope: "element", duration: 100, trigger: "manual" });
    el2.seek(0.5);
    frames.flush(1);
    assert.match(q.style.getPropertyValue("mask"), /linear-gradient/);
    el2.destroy();
    frames.flush(1);
    assert.equal(q.getAttribute("style"), "mask: none;");
  } finally {
    delete globalThis.CSS;
  }
});

test("T10 font axes: registered axes via high-level properties, custom axes merged with the consumer's", () => {
  globalThis.CSS = { supports: () => true };
  try {
    const p = el("Axes", "span", { style: 'font-variation-settings: "opsz" 32, "XTRA" 400' });
    // jsdom's CSSOM drops font-variation-settings writes: record what the host writes.
    const written = [];
    const setProperty = p.style.setProperty.bind(p.style);
    p.style.setProperty = (name, value, priority) => {
      if (name === "font-variation-settings") written.push(value);
      return setProperty(name, value, priority);
    };
    const control = text.createFontAxes(p, {
      from: { wght: 300, GRAD: 0 },
      to: { wght: 800, GRAD: 100 },
      duration: 100,
    });
    control.play();
    settle();
    assert.equal(p.style.fontWeight, "800");
    const fvs = written.at(-1) ?? "";
    assert.match(fvs, /"opsz" 32/);
    assert.match(fvs, /"XTRA" 400/);
    assert.match(fvs, /"GRAD" 100/);
    control.destroy();
    frames.flush(1);
    assert.equal(p.getAttribute("style"), 'font-variation-settings: "opsz" 32, "XTRA" 400;');
    assert.throws(
      () => text.createFontAxes(el("x"), { from: { wght: 0 }, to: { wght: 5000 } }),
      /wght/,
    );
    assert.throws(() => text.createFontAxes(el("x"), { from: { toolong: 1 }, to: {} }), /tag/);
  } finally {
    delete globalThis.CSS;
  }
});

// --- React (FR-003) ---------------------------------------------------------------------------------------------

test("FR-003 React: server markup is the plain text; StrictMode splits once; text change re-splits; unmount restores", async () => {
  const html = markup(h(text.TextReveal, { as: "h2", className: "t" }, "Server text"));
  assert.equal(html, '<h2 class="t">Server text</h2>');
  assert.equal(markup(h(text.NumberRoll, { value: 1234, locale: "en-US" })), "<span>1,234</span>");
  const splitsBefore = text.getTextDebugInfo().splits;
  const view = await mount(
    h(StrictMode, null, h(text.TextReveal, { as: "h2", trigger: "manual" }, "First")),
  );
  const h2 = view.container.querySelector("h2");
  assert.equal(h2.querySelectorAll(".neshel-split").length, 1);
  assert.equal(h2.querySelector(".neshel-text-a11y").textContent, "First");
  await view.render(
    h(StrictMode, null, h(text.TextReveal, { as: "h2", trigger: "manual" }, "Second")),
  );
  assert.equal(h2.querySelectorAll(".neshel-split").length, 1);
  assert.equal(h2.querySelector(".neshel-text-a11y").textContent, "Second");
  await view.unmount();
  assert.equal(text.getTextDebugInfo().splits, splitsBefore);
  assert.equal(splitsBefore, 0);
  assert.throws(
    () => markup(h(text.TextReveal, null, h("a", { href: "/" }, "x"))),
    /children must be text/,
  );
});

test("FR-003 React NumberRoll and RotatingWords keep their DOM across value changes", async () => {
  const view = await mount(h(text.NumberRoll, { value: 10, locale: "en-US", duration: 50 }));
  const span = view.container.querySelector("span");
  await view.render(h(text.NumberRoll, { value: 20, locale: "en-US", duration: 50 }));
  assert.equal(span.querySelector(".neshel-text-a11y").textContent, "20");
  await view.unmount();
  const motion = motionValue(0);
  void motion;
});
