// Test helpers for @neshel-ui/animations (run against the built dist; see pnpm test:packages).
import { createElement } from "react";
import { renderToStaticMarkup, renderToString } from "react-dom/server";

export const h = createElement;
export { renderToStaticMarkup as markup, renderToString };

let dom;
let media;

/** Controllable `prefers-reduced-motion` media query list. */
function createMediaQueryList() {
  const listeners = new Set();
  return {
    matches: false,
    media: "(prefers-reduced-motion: reduce)",
    addEventListener: (_type, listener) => listeners.add(listener),
    removeEventListener: (_type, listener) => listeners.delete(listener),
    get listenerCount() {
      return listeners.size;
    },
    set(value) {
      this.matches = value;
      for (const listener of [...listeners]) listener({ matches: value });
    },
  };
}

/** Manual requestAnimationFrame: frames run only when the test calls `frames.flush()`. */
export const frames = {
  queue: new Map(),
  next: 1,
  time: 0,
  /** Run `count` frames of `ms` milliseconds each. */
  flush(count = 1, ms = 16) {
    for (let index = 0; index < count; index++) {
      this.time += ms;
      const callbacks = [...this.queue.values()];
      this.queue.clear();
      for (const callback of callbacks) callback(this.time);
    }
  },
  /** Run frames until no callback is pending (bounded). Returns the number of frames run. */
  settle(limit = 600, ms = 16) {
    let count = 0;
    while (this.queue.size > 0 && count < limit) {
      this.flush(1, ms);
      count++;
    }
    return count;
  },
  get pending() {
    return this.queue.size;
  },
};

/** Install jsdom globals (once), a manual rAF and a fake matchMedia. */
export async function setupDom() {
  if (dom) return { dom, media };
  const { JSDOM } = await import("jsdom");
  dom = new JSDOM("<!doctype html><html><body></body></html>", { pretendToBeVisual: true });
  const { window } = dom;
  media = createMediaQueryList();
  window.matchMedia = () => media;
  window.requestAnimationFrame = (callback) => {
    const id = frames.next++;
    frames.queue.set(id, callback);
    return id;
  };
  window.cancelAnimationFrame = (id) => frames.queue.delete(id);
  for (const key of [
    "window",
    "document",
    "navigator",
    "HTMLElement",
    "Element",
    "Node",
    "Event",
    "MouseEvent",
    "PointerEvent",
    "FocusEvent",
    "matchMedia",
    "requestAnimationFrame",
    "cancelAnimationFrame",
  ]) {
    Object.defineProperty(globalThis, key, {
      value: key === "window" ? window : window[key],
      configurable: true,
      writable: true,
    });
  }
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  return { dom, media };
}

/** Give an element a layout box (jsdom has no layout engine). */
export function layoutBox(element, { left = 0, top = 0, width = 200, height = 100 } = {}) {
  element.getBoundingClientRect = () => ({
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    x: left,
    y: top,
  });
  Object.defineProperty(element, "offsetWidth", { value: width, configurable: true });
  Object.defineProperty(element, "offsetHeight", { value: height, configurable: true });
}

export function pointer(element, type, { x = 0, y = 0, pointerType = "mouse" } = {}) {
  element.dispatchEvent(
    new window.PointerEvent(type, {
      clientX: x,
      clientY: y,
      pointerType,
      bubbles: type !== "pointerenter" && type !== "pointerleave",
    }),
  );
}

/** Count add/remove listener calls on a target (cleanup tests). */
export function trackListeners(target) {
  const active = new Map();
  const add = target.addEventListener;
  const remove = target.removeEventListener;
  target.addEventListener = function (type, listener, options) {
    active.set(`${type}:${listener.name || "anon"}:${active.size}`, { type, listener });
    return add.call(this, type, listener, options);
  };
  target.removeEventListener = function (type, listener, options) {
    for (const [key, entry] of active) {
      if (entry.type === type && entry.listener === listener) active.delete(key);
    }
    return remove.call(this, type, listener, options);
  };
  return {
    get active() {
      return [...active.values()].map((entry) => entry.type).sort();
    },
    restore() {
      target.addEventListener = add;
      target.removeEventListener = remove;
    },
  };
}

/** Render into a fresh container with createRoot inside act(); returns { container, root, unmount }. */
export async function mount(element) {
  await setupDom();
  const { act } = await import("react");
  const { createRoot } = await import("react-dom/client");
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => root.render(element));
  return {
    container,
    async render(next) {
      await act(async () => root.render(next));
    },
    async unmount() {
      await act(async () => root.unmount());
      container.remove();
    },
  };
}
