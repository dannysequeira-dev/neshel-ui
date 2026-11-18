// Phase 013 PT01–PT10 (router-independent parts) — page transitions engine and React bindings
// (FR-020–FR-026, FR-030; contracts/page-transitions.md, router-adapters.md §1). jsdom has no View
// Transitions: a stub records what the browser would capture (names, classes, types, <html> attributes) at
// capture time and lets tests finish, skip, abort or fail transitions. Real behaviour: browser lab.
import assert from "node:assert/strict";
import test from "node:test";
import { useState } from "react";
import { box, setupGestureDom, translation } from "./gesture-helpers.mjs";
import { frames, h, markup, mount } from "./helpers.mjs";

const { media } = await setupGestureDom();
const pt = await import("../dist/page-transitions/index.js");
const { act } = await import("react");
const settle = () => frames.settle(600, 16);
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

const el = (parent = document.body) => {
  const node = document.createElement("div");
  parent.appendChild(node);
  return node;
};
const names = () =>
  [...document.querySelectorAll("*")]
    .filter((node) => node.style?.getPropertyValue("view-transition-name"))
    .map(
      (node) =>
        `${node.id || node.tagName.toLowerCase()}=${node.style.getPropertyValue("view-transition-name")}`,
    );

/** A View Transition stub; `transitions` keeps each one with its capture records and controls. */
function installViewTransitions({ withTypes = true } = {}) {
  const transitions = [];
  globalThis.CSS = { supports: () => withTypes };
  document.startViewTransition = (arg) => {
    const update = typeof arg === "function" ? arg : arg.update;
    const deferred = () => {
      let resolve;
      let reject;
      const promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
      });
      promise.catch(() => {});
      return { promise, resolve, reject };
    };
    const ready = deferred();
    const finished = deferred();
    const callback = deferred();
    const record = {
      types: typeof arg === "function" ? undefined : arg.types,
      oldNames: names(),
      oldClass: document.documentElement.style.getPropertyValue("view-transition-class"),
      attributes: {
        effect: document.documentElement.getAttribute("data-neshel-pt-effect"),
        direction: document.documentElement.getAttribute("data-neshel-pt-direction"),
      },
      skipped: false,
      newNames: undefined,
      ready: ready.promise,
      finished: finished.promise,
      updateCallbackDone: callback.promise,
      skipTransition() {
        if (record.skipped) return;
        record.skipped = true;
        ready.reject(Object.assign(new Error("skipped"), { name: "AbortError" }));
        callback.promise.then(
          () => finished.resolve(),
          (error) => finished.reject(error),
        );
      },
      finish() {
        finished.resolve();
      },
    };
    const previous = transitions.at(-1);
    if (previous && !previous.done) previous.skipTransition();
    transitions.push(record);
    queueMicrotask(async () => {
      try {
        await update();
        record.newNames = names();
        callback.resolve();
        if (!record.skipped) ready.resolve();
      } catch (error) {
        callback.reject(error);
        ready.reject(error);
        finished.reject(error);
      }
    });
    finished.promise.then(
      () => (record.done = true),
      () => (record.done = true),
    );
    return record;
  };
  return {
    transitions,
    restore() {
      delete document.startViewTransition;
      delete globalThis.CSS;
    },
  };
}

test("support detection: all false without the API; behavioural checks with it", () => {
  assert.deepEqual(pt.getViewTransitionSupport(), {
    sameDocument: false,
    types: false,
    classes: false,
    crossDocument: false,
    navigationApi: false,
  });
  const vt = installViewTransitions();
  const support = pt.getViewTransitionSupport();
  assert.equal(support.sameDocument, true);
  assert.equal(support.types, true);
  assert.equal(support.classes, true);
  vt.restore();
});

test("fallback: without the API the update runs at once and the navigation is never blocked", async () => {
  let ran = false;
  const transition = pt.startPageTransition(() => {
    ran = true;
  });
  await transition.updated;
  assert.equal(ran, true);
  const result = await transition.finished;
  assert.deepEqual(result, { status: "skipped", native: false, direction: "unknown" });
});

test("native: classes, types and old names captured; names move to new elements; everything restored", async () => {
  const vt = installViewTransitions();
  const page = el();
  page.id = "page-a";
  const hero = el(page);
  hero.id = "hero-a";
  hero.setAttribute("style", "color: red");
  const unregisterA = pt.registerSharedElement(hero, "hero");
  const before = hero.style.cssText;
  const htmlBefore = document.documentElement.outerHTML.length;
  let unregisterB;
  const transition = pt.startPageTransition(
    () => {
      page.remove();
      unregisterA();
      const next = el();
      next.id = "hero-b";
      unregisterB = pt.registerSharedElement(next, "hero");
    },
    { effect: "slide", direction: "forward", types: ["custom"] },
  );
  const record = vt.transitions.at(-1);
  assert.deepEqual(record.types, ["neshel-slide", "neshel-forward", "custom"]);
  assert.deepEqual(record.oldNames, ["hero-a=neshel-hero"]);
  assert.equal(record.oldClass, "neshel-pt-slide");
  assert.deepEqual(record.attributes, { effect: "slide", direction: "forward" });
  await transition.updated;
  await tick();
  assert.deepEqual(record.newNames, ["hero-b=neshel-hero"], "old name cleared, new element named");
  assert.equal(transition.state, "animating");
  record.finish();
  const result = await transition.finished;
  assert.deepEqual(result, { status: "completed", native: true, direction: "forward" });
  assert.deepEqual(names(), [], "no name left after the transition");
  assert.equal(document.documentElement.style.getPropertyValue("view-transition-class"), "");
  assert.equal(document.documentElement.hasAttribute("data-neshel-pt-effect"), false);
  assert.equal(document.documentElement.hasAttribute("data-neshel-pt-direction"), false);
  assert.equal(hero.style.cssText, before);
  assert.ok(document.documentElement.outerHTML.length <= htmlBefore + 40);
  unregisterB();
  document.getElementById("hero-b").remove();
  vt.restore();
});

test("rapid navigation: a second transition interrupts the first; final DOM is the second update", async () => {
  const vt = installViewTransitions();
  const target = el();
  target.textContent = "start";
  const first = pt.startPageTransition(() => {
    target.textContent = "first";
  });
  const second = pt.startPageTransition(() => {
    target.textContent = "second";
  });
  assert.equal((await first.finished).status, "interrupted");
  await second.updated;
  await tick();
  vt.transitions.at(-1).finish();
  assert.equal((await second.finished).status, "completed");
  assert.equal(target.textContent, "second");
  assert.equal(document.documentElement.hasAttribute("data-neshel-pt-effect"), false);
  target.remove();
  vt.restore();
});

test("failed navigation: update throws → failed; names, classes and attributes restored", async () => {
  const vt = installViewTransitions();
  const shared = el();
  const off = pt.registerSharedElement(shared, "card");
  const transition = pt.startPageTransition(() => {
    throw new Error("route failed");
  });
  await assert.rejects(transition.updated, /route failed/);
  await assert.rejects(transition.finished, /route failed/);
  assert.equal(transition.state, "failed");
  assert.deepEqual(names(), []);
  assert.equal(document.documentElement.style.getPropertyValue("view-transition-class"), "");
  assert.equal(document.documentElement.hasAttribute("data-neshel-pt-effect"), false);
  off();
  shared.remove();
  vt.restore();
});

test("maxWait: a slow update unfreezes rendering (skipped) and still completes the navigation", async () => {
  const vt = installViewTransitions();
  let finish;
  const transition = pt.startPageTransition(() => new Promise((resolve) => (finish = resolve)), {
    maxWait: 10,
  });
  await new Promise((resolve) => setTimeout(resolve, 30));
  assert.equal(vt.transitions.at(-1).skipped, true);
  finish();
  await transition.updated;
  assert.equal((await transition.finished).status, "skipped");
  vt.restore();
});

test("reduced motion: instant effects skip the transition; slide/scale become a fade", async () => {
  const vt = installViewTransitions();
  media.set(true);
  const instant = pt.startPageTransition(() => {}, { effect: "wipe" });
  assert.equal(vt.transitions.length, 0, "no transition started");
  assert.equal((await instant.finished).native, false);
  const fade = pt.startPageTransition(() => {}, { effect: "slide" });
  assert.equal(vt.transitions.at(-1).oldClass, "neshel-pt-fade");
  await fade.updated;
  await tick();
  vt.transitions.at(-1).finish();
  await fade.finished;
  media.set(false);
  vt.restore();
});

test("duplicate names: only the first connected element is named (the transition never aborts)", async () => {
  const vt = installViewTransitions();
  const a = el();
  a.id = "dup-a";
  const b = el();
  b.id = "dup-b";
  const offA = pt.registerSharedElement(a, "dup");
  const offB = pt.registerSharedElement(b, "dup");
  const transition = pt.startPageTransition(() => {});
  assert.deepEqual(vt.transitions.at(-1).oldNames, ["dup-a=neshel-dup"]);
  await transition.updated;
  await tick();
  vt.transitions.at(-1).finish();
  await transition.finished;
  offA();
  offB();
  a.remove();
  b.remove();
  assert.throws(() => pt.registerSharedElement(a, "Bad Name"), /invalid name/);
  vt.restore();
});

test("presence: an exiting page kept in the DOM never duplicates a name (old cleared before new)", async () => {
  const vt = installViewTransitions();
  const old = el();
  old.id = "exiting";
  const offOld = pt.registerSharedElement(old, "photo");
  let offNew;
  const transition = pt.startPageTransition(() => {
    offOld(); // Presence keeps `old` mounted (exiting) but it no longer owns the name
    const next = el();
    next.id = "entering";
    offNew = pt.registerSharedElement(next, "photo");
  });
  await transition.updated;
  await tick();
  assert.deepEqual(vt.transitions.at(-1).newNames, ["entering=neshel-photo"]);
  vt.transitions.at(-1).finish();
  await transition.finished;
  offNew();
  old.remove();
  document.getElementById("entering").remove();
  vt.restore();
});

test("FLIP fallback: without the API, a shared element animates from its old box via the 012 animator", async () => {
  const a = el();
  box(a, { x: 0, y: 0, width: 100, height: 100 });
  const offA = pt.registerSharedElement(a, "thumb");
  let next;
  let offB;
  const transition = pt.startPageTransition(
    () => {
      offA();
      a.remove();
      next = el();
      box(next, { x: 300, y: 200, width: 200, height: 200 });
      offB = pt.registerSharedElement(next, "thumb");
    },
    { fallback: "flip" },
  );
  assert.equal((await transition.finished).status, "completed");
  frames.flush(1);
  const [x, y] = translation(next);
  assert.ok(x < 0 && y < 0, `starts at the old box: ${next.style.transform}`);
  settle();
  assert.equal(next.style.transform, "", "identity at the end");
  offB();
  next.remove();
});

test("direction tracker: Navigation API indexes decide forward/back; URLs never compared; restored", () => {
  const navigation = new window.EventTarget();
  navigation.currentEntry = { index: 3 };
  window.navigation = navigation;
  const seen = [];
  const tracker = pt.trackNavigationDirection({ onChange: (d, t) => seen.push(`${t}:${d}`) });
  const fire = (navigationType, index) => {
    const event = new window.Event("navigate");
    event.navigationType = navigationType;
    event.destination = { index, url: "https://example.test/same" };
    navigation.dispatchEvent(event);
  };
  fire("push", -1);
  fire("traverse", 2);
  assert.equal(document.documentElement.getAttribute("data-neshel-pt-direction"), "back");
  fire("traverse", 5);
  fire("replace", 3);
  fire("reload", 3);
  fire("traverse", 3);
  assert.deepEqual(seen, [
    "push:forward",
    "traverse:back",
    "traverse:forward",
    "replace:replace",
    "reload:replace",
    "traverse:unknown",
  ]);
  tracker.set("back", "traverse");
  assert.equal(tracker.direction, "back");
  tracker.destroy();
  assert.equal(document.documentElement.hasAttribute("data-neshel-pt-direction"), false);
  fire("push", -1);
  assert.equal(seen.length, 7, "listener removed with the last tracker");
  delete window.navigation;
});

test("route progress: delayed, indeterminate, completes, fails, cancels and times out — never stuck", () => {
  const realTimeout = globalThis.setTimeout;
  const realClear = globalThis.clearTimeout;
  let now = 0;
  const timers = new Map();
  let id = 0;
  globalThis.setTimeout = (fn, ms) => {
    timers.set(++id, { fn, at: now + ms });
    return id;
  };
  globalThis.clearTimeout = (handle) => timers.delete(handle);
  const advance = (ms) => {
    now += ms;
    for (const [handle, timer] of [...timers].sort((a, b) => a[1].at - b[1].at)) {
      if (timer.at <= now && timers.has(handle)) {
        timers.delete(handle);
        timer.fn();
      }
    }
  };
  try {
    const node = el();
    const progress = pt.createRouteProgress(node, {
      delay: 100,
      minVisible: 200,
      timeout: 2000,
      announce: true,
    });
    assert.equal(node.getAttribute("role"), "progressbar");
    assert.equal(node.hasAttribute("aria-valuenow"), false, "indeterminate: no fake percentage");
    assert.equal(node.hidden, true);
    progress.start();
    advance(50);
    progress.done();
    assert.equal(node.hidden, true, "a fast navigation never flashes the bar");
    assert.equal(progress.state, "idle");
    progress.start();
    advance(150);
    assert.equal(node.hidden, false);
    assert.equal(node.getAttribute("aria-busy"), "true");
    progress.fail();
    assert.equal(node.getAttribute("data-state"), "failed");
    assert.equal(node.querySelector('[role="status"]').textContent, "Navigation failed");
    advance(250);
    assert.equal(progress.state, "idle");
    assert.equal(node.hidden, true);
    progress.start();
    advance(150);
    progress.cancel();
    assert.equal(node.hidden, true);
    progress.start();
    advance(2100);
    assert.equal(progress.state, "idle", "a navigation that never settles is cancelled");
    progress.destroy();
    assert.equal(timers.size, 0);
    node.remove();
  } finally {
    globalThis.setTimeout = realTimeout;
    globalThis.clearTimeout = realClear;
  }
});

test("MPA helper: a no-op where cross-document transitions are unsupported", () => {
  const dispose = pt.enableCrossDocumentTransitions({ effect: "slide" });
  dispose();
  assert.throws(() => pt.enableCrossDocumentTransitions({ effect: "zoom" }), /effect/);
});

test("React: boundaries render visible server markup; React's ViewTransition used when exported", () => {
  const html = markup(
    h(
      "div",
      null,
      h(pt.PageTransition, { effect: "slide" }, h("main", null, "Page")),
      h(pt.SharedElement, { name: "hero" }, h("img", { alt: "Hero" })),
      h(pt.PersistentElement, { name: "player", asChild: true }, h("aside", null, "Player")),
      h(pt.RouteProgress, { pending: false }),
    ),
  );
  assert.match(html, /<div class="neshel-page"><main>Page<\/main><\/div>/);
  assert.match(html, /<aside>Player<\/aside>/);
  assert.match(html, /class="neshel-route-progress" hidden=""/);
  assert.notEqual(pt.getReactViewTransition(), undefined, "React 19.3 exports ViewTransition");
});

test("React: usePageTransition commits the update; useRouteTransition focuses only after push commits", async () => {
  // React DOM reads the CSS namespace when view transitions are involved; jsdom has none.
  globalThis.CSS = { supports: () => false, escape: (value) => value };
  let start;
  // biome-ignore lint/correctness/noComponentHookFactories: the test captures start() from its component.
  function App() {
    const [page, setPage] = useState("a");
    const transition = pt.usePageTransition();
    start = (next) =>
      transition.start(() => setPage(next), { effect: "slide", direction: "forward" });
    pt.useRouteTransition({ location: page, type: page === "c" ? "traverse" : "push" });
    return h(
      pt.PageTransition,
      null,
      h("h1", { "data-neshel-route-focus": "", id: `title-${page}` }, `Page ${page}`),
    );
  }
  const view = await mount(h(App));
  assert.equal(document.activeElement, document.body, "no focus move on the first render");
  await act(async () => start("b"));
  await act(async () => {});
  assert.equal(view.container.querySelector("h1").textContent, "Page b");
  assert.equal(document.activeElement?.id, "title-b", "focus after the committed push");
  assert.equal(document.activeElement.getAttribute("tabindex"), "-1");
  document.body.focus();
  document.activeElement.blur?.();
  await act(async () => start("c"));
  await act(async () => {});
  assert.notEqual(document.activeElement?.id, "title-c", "no focus move on traverse");
  await view.unmount();
  delete globalThis.CSS;
});

test("React RouteProgress follows the router's pending state (start → done)", async () => {
  // biome-ignore lint/correctness/noComponentHookFactories: a local fixture component.
  function Bar({ pending, failed }) {
    return h(pt.RouteProgress, { pending, failed, delay: 0, minVisible: 0 });
  }
  const view = await mount(h(Bar, { pending: false }));
  const node = view.container.querySelector(".neshel-route-progress");
  await view.render(h(Bar, { pending: true }));
  await act(async () => tick());
  assert.equal(node.getAttribute("data-state"), "pending");
  await view.render(h(Bar, { pending: false }));
  await act(async () => tick());
  assert.equal(node.getAttribute("data-state"), "idle");
  await view.unmount();
});
