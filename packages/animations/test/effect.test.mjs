// Effect definitions, registries, attachment lifecycle and React bindings (ADR 0021; 009 FR-001–FR-003,
// FR-020–FR-022 through effects, FR-050). contracts/effect-definition.md, contracts/react-bindings.md.
import assert from "node:assert/strict";
import test from "node:test";
import { useRef } from "react";
import { frames, h, markup, mount, renderToString, setupDom } from "./helpers.mjs";

const core = await import("../dist/core/index.js");
const root = await import("../dist/index.js");
const { attachEffect, createEffectRegistry, defineEffect, getMotionDebugInfo } = core;
const { NeshelAnimationsError, useMotionEffect, useMotionValue, useMotionValueEvent } = root;

/** A lab-style effect that owns `filter` and logs its lifecycle. */
function filterEffect(id, priority = 0, log = []) {
  return defineEffect({
    id,
    family: "media",
    channels: [{ channel: "filter", mode: "exclusive" }],
    priority,
    reducedMotion: "static",
    resolve: (options = {}) => {
      if (options.amount !== undefined && typeof options.amount !== "number") {
        throw new NeshelAnimationsError(`[@neshel-ui/animations] ${id}: amount must be a number`);
      }
      return { amount: options.amount ?? 1 };
    },
    setup(context) {
      log.push(`setup:${id}`);
      const filter = context.channels.exclusive("filter");
      filter.set(`grayscale(${context.options.amount})`);
      return {
        update: (options) => {
          log.push(`update:${id}`);
          filter.set(`grayscale(${options.amount})`);
        },
        pause: () => log.push(`pause:${id}`),
        resume: () => log.push(`resume:${id}`),
        destroy: () => log.push(`destroy:${id}`),
      };
    },
  });
}

const reactDefinition = filterEffect("media/react");
/** Consumer component attaching an effect with the generic hook. */
function Card({ amount }) {
  const ref = useRef(null);
  useMotionEffect(ref, reactDefinition, { amount }, { conflicts: "silent" });
  return h("img", { ref, alt: "" });
}
/** Probe recording the motion value it owns and every change it observes. */
let value;
const seen = [];
function Probe() {
  value = useMotionValue(1);
  useMotionValueEvent(value, (current) => seen.push(current));
  return null;
}

test("root runtime exports are exactly the React engine bindings (009 FR-050/FR-051)", () => {
  assert.deepEqual(Object.keys(root).sort(), [
    "NeshelAnimationsError",
    "useMotionEffect",
    "useMotionValue",
    "useMotionValueEvent",
  ]);
});

test("defineEffect validates and freezes definitions; nothing is registered (FR-001, FR-003)", () => {
  const definition = filterEffect("media/ok");
  assert.ok(Object.isFrozen(definition));
  assert.ok(Object.isFrozen(definition.channels));
  const base = {
    family: "media",
    channels: [],
    reducedMotion: "off",
    resolve: () => ({}),
    setup: () => ({ update() {}, destroy() {} }),
  };
  const invalid = [
    [{ ...base, id: "Media/X" }, /invalid id/],
    [{ ...base, id: "hover/x" }, /must start with its family/],
    [{ ...base, id: "media/x", family: "magic" }, /unknown family/],
    [{ ...base, id: "media/x", priority: Number.NaN }, /priority/],
    [{ ...base, id: "media/x", reducedMotion: "never" }, /reducedMotion/],
    [
      { ...base, id: "media/x", channels: [{ channel: "color", mode: "exclusive" }] },
      /invalid channel claim/,
    ],
    [
      { ...base, id: "media/x", channels: [{ channel: "transform", mode: "exclusive" }] },
      /invalid channel claim/,
    ],
    [
      {
        ...base,
        id: "media/x",
        channels: [
          { channel: "filter", mode: "exclusive" },
          { channel: "filter", mode: "exclusive" },
        ],
      },
      /claimed twice/,
    ],
    [{ ...base, id: "media/x", setup: undefined }, /must be functions/],
  ];
  for (const [definition, pattern] of invalid) {
    assert.throws(
      () => defineEffect(definition),
      (error) => error instanceof NeshelAnimationsError && pattern.test(error.message),
      JSON.stringify(definition.id),
    );
  }
  assert.doesNotThrow(() =>
    defineEffect({
      ...base,
      id: "media/custom",
      channels: [{ channel: "--neshel-glow", mode: "exclusive" }],
    }),
  );
});

test("explicit registries look up by id and family; duplicates throw (FR-002)", () => {
  const a = filterEffect("media/a");
  const b = filterEffect("media/b");
  const registry = createEffectRegistry([a, b]);
  assert.equal(registry.get("media/a"), a);
  assert.equal(registry.has("media/c"), false);
  assert.deepEqual(registry.list("media"), [a, b]);
  assert.deepEqual(registry.list("hover"), []);
  assert.throws(() => createEffectRegistry([a, a]), /duplicate effect id "media\/a"/);
  // Two registries are independent values: no hidden global state.
  assert.equal(createEffectRegistry([b]).has("media/a"), false);
});

test("attachEffect: setup, update, pause/resume, destroy restores styles (US1)", async () => {
  await setupDom();
  const log = [];
  const element = document.createElement("div");
  element.style.filter = "blur(1px)";
  const handle = attachEffect(
    element,
    filterEffect("media/life", 0, log),
    { amount: 0.5 },
    { conflicts: "silent" },
  );
  assert.equal(handle.state, "active");
  frames.flush();
  assert.equal(element.style.filter, "grayscale(0.5)");
  handle.update({ amount: 1 });
  frames.flush();
  assert.equal(element.style.filter, "grayscale(1)");
  handle.pause();
  assert.equal(handle.state, "paused");
  handle.resume();
  assert.throws(() => handle.update({ amount: "lots" }), NeshelAnimationsError);
  handle.destroy();
  handle.destroy();
  assert.equal(handle.state, "destroyed");
  frames.flush();
  assert.equal(element.style.filter, "blur(1px)", "original inline value restored");
  assert.deepEqual(log, [
    "setup:media/life",
    "update:media/life",
    "pause:media/life",
    "resume:media/life",
    "destroy:media/life",
  ]);
  assert.equal(getMotionDebugInfo(element), undefined);
});

test("conflicting effects: deterministic winner, suspended loser applies nothing and resumes (US2)", async () => {
  await setupDom();
  const log = [];
  const element = document.createElement("div");
  const first = attachEffect(
    element,
    filterEffect("media/first", 0, log),
    { amount: 0.2 },
    { conflicts: "silent" },
  );
  const second = attachEffect(
    element,
    filterEffect("media/second", 0, log),
    { amount: 0.9 },
    { conflicts: "silent" },
  );
  assert.equal(first.state, "active");
  assert.equal(second.state, "suspended");
  frames.flush();
  assert.equal(element.style.filter, "grayscale(0.2)");
  second.update({ amount: 0.7 }); // stored, not applied while suspended
  const urgent = attachEffect(
    element,
    filterEffect("media/urgent", 9, log),
    { amount: 0 },
    { conflicts: "silent" },
  );
  assert.equal(first.state, "suspended", "preempted by higher priority");
  frames.flush();
  assert.equal(element.style.filter, "grayscale(0)");
  urgent.destroy();
  assert.equal(first.state, "active", "earliest equal-priority claim resumes first");
  assert.equal(second.state, "suspended");
  first.destroy();
  assert.equal(second.state, "active");
  frames.flush();
  assert.equal(element.style.filter, "grayscale(0.7)", "resumes with its latest options");
  second.destroy();
  frames.flush();
  assert.equal(element.style.filter, "");
  assert.deepEqual(log, [
    "setup:media/first",
    "destroy:media/first", // the preempted owner is torn down before the winner writes
    "setup:media/urgent",
    "destroy:media/urgent",
    "setup:media/first",
    "destroy:media/first",
    "setup:media/second",
    "destroy:media/second",
  ]);
});

test("strict mode throws at attach without side effects; undeclared channel writes throw", async () => {
  await setupDom();
  const element = document.createElement("div");
  const owner = attachEffect(element, filterEffect("media/owner"), {}, { conflicts: "silent" });
  assert.throws(
    () => attachEffect(element, filterEffect("media/strict"), {}, { conflicts: "error" }),
    /"media\/strict" is suspended/,
  );
  owner.destroy();
  const rogue = defineEffect({
    id: "media/rogue",
    family: "media",
    channels: [{ channel: "transform", mode: "compose" }],
    reducedMotion: "off",
    resolve: () => ({}),
    setup(context) {
      context.channels.opacity.set(0.5);
      return { update() {}, destroy() {} };
    },
  });
  const { media } = await setupDom();
  const listeners = media.listenerCount;
  assert.throws(() => attachEffect(element, rogue), /did not declare/);
  assert.equal(media.listenerCount, listeners, "a throwing setup leaves no subscription");
  assert.deepEqual(getMotionDebugInfo(element)?.channels ?? [], [], "nor host state");
});

test("reduced motion reaches effects live through the context (009 accessibility)", async () => {
  const { media } = await setupDom();
  const seen = [];
  const watcher = defineEffect({
    id: "ambient/watch",
    family: "ambient",
    channels: [],
    reducedMotion: "static",
    resolve: () => ({}),
    setup(context) {
      seen.push(`initial:${context.reduced}`);
      const off = context.onReducedChange((reduced) => seen.push(`change:${reduced}`));
      return { update() {}, destroy: off };
    },
  });
  const handle = attachEffect(document.createElement("div"), watcher);
  media.set(true);
  assert.equal(handle.state, "reduced");
  media.set(false);
  handle.destroy();
  assert.equal(media.listenerCount, 0, "unsubscribed on destroy");
  assert.deepEqual(seen, ["initial:false", "change:true", "change:false"]);
  const always = attachEffect(
    document.createElement("div"),
    watcher,
    {},
    { reducedMotion: "always" },
  );
  assert.equal(always.state, "reduced");
  always.destroy();
});

test("useMotionEffect: SSR validates without effects; hydration clean; unmount restores (FR-050)", async () => {
  assert.equal(markup(h(Card, { amount: 0.3 })), '<img alt=""/>');
  assert.throws(() => markup(h(Card, { amount: "x" })), NeshelAnimationsError);
  const html = renderToString(h(Card, { amount: 0.3 }));
  await setupDom();
  const { act } = await import("react");
  const { hydrateRoot } = await import("react-dom/client");
  const container = document.createElement("div");
  container.innerHTML = html;
  document.body.appendChild(container);
  const errors = [];
  let rootHandle;
  await act(async () => {
    rootHandle = hydrateRoot(container, h(Card, { amount: 0.3 }), {
      onRecoverableError: (e) => errors.push(e),
    });
  });
  frames.flush();
  const img = container.querySelector("img");
  assert.deepEqual(errors, []);
  assert.equal(img.style.filter, "grayscale(0.3)");
  await act(async () => rootHandle.render(h(Card, { amount: 0.6 })));
  frames.flush();
  assert.equal(img.style.filter, "grayscale(0.6)", "option change updates without re-attach");
  await act(async () => rootHandle.unmount());
  frames.flush();
  assert.equal(img.style.filter, "");
  container.remove();
});

test("useMotionValue is stable and useMotionValueEvent subscribes without re-rendering", async () => {
  await setupDom();
  const { Profiler } = await import("react");
  let commits = 0;
  const mounted = await mount(h(Profiler, { id: "p", onRender: () => commits++ }, h(Probe)));
  const first = value;
  const before = commits;
  value.set(2);
  value.set(3);
  assert.deepEqual(seen, [2, 3]);
  assert.equal(commits, before, "no re-render");
  await mounted.render(h(Profiler, { id: "p", onRender: () => commits++ }, h(Probe)));
  assert.equal(value, first, "stable across renders");
  await mounted.unmount();
  value.set(4);
  assert.deepEqual(seen, [2, 3], "unsubscribed on unmount");
});
