// Scroll test helpers (Phase 011): controlled geometry for jsdom (no layout engine), a fake
// IntersectionObserver driven by the test, and scroll dispatch. Real layout is verified in the browser lab.
import { frames, setupDom } from "./helpers.mjs";

export async function setupScrollDom() {
  const env = await setupDom();
  const { window } = env.dom;
  for (const key of ["getComputedStyle", "MutationObserver", "HTMLDivElement"]) {
    if (!(key in globalThis) || globalThis[key] === undefined) {
      Object.defineProperty(globalThis, key, {
        value: window[key].bind ? window[key].bind(window) : window[key],
        configurable: true,
        writable: true,
      });
    }
  }
  globalThis.MutationObserver = window.MutationObserver;
  return env;
}

const define = (target, key, value) =>
  Object.defineProperty(target, key, { value, configurable: true, writable: true });

/** Root scroller: viewport height and document height. */
export function viewport({ height = 600, width = 800, document: docHeight = 3000 } = {}) {
  const root = document.documentElement;
  define(root, "clientHeight", height);
  define(root, "clientWidth", width);
  define(root, "scrollHeight", docHeight);
  define(root, "scrollWidth", width);
  define(window, "innerHeight", height);
  define(window, "innerWidth", width);
}

/** Layout box of an element (offset chain + size + bounding box consistent with the root scroll). */
export function place(element, { top = 0, height = 100, left = 0, width = 200 } = {}) {
  define(element, "offsetTop", top);
  define(element, "offsetLeft", left);
  define(element, "offsetHeight", height);
  define(element, "offsetWidth", width);
  define(element, "offsetParent", null);
  element.getBoundingClientRect = () => {
    const scrollY = window.scrollY || 0;
    return {
      top: top - scrollY,
      bottom: top - scrollY + height,
      left,
      right: left + width,
      width,
      height,
      x: left,
      y: top - scrollY,
    };
  };
}

/** Set the root scroll position and dispatch `scroll` (no frame runs). */
export function scrollTo(y) {
  define(window, "scrollY", y);
  define(window, "pageYOffset", y);
  window.dispatchEvent(new window.Event("scroll"));
}

/** Scroll and run frames until idle (bounded). */
export function scrollAndSettle(y, limit = 600) {
  scrollTo(y);
  return frames.settle(limit);
}

/** A fake IntersectionObserver the test drives with `fakeIO.report(element, entry)`. */
export function installFakeIO() {
  const instances = [];
  class FakeIntersectionObserver {
    constructor(callback, options = {}) {
      this.callback = callback;
      this.options = options;
      this.targets = new Set();
      this.disconnected = false;
      instances.push(this);
    }
    observe(target) {
      this.targets.add(target);
    }
    unobserve(target) {
      this.targets.delete(target);
    }
    disconnect() {
      this.targets.clear();
      this.disconnected = true;
    }
  }
  const previous = globalThis.IntersectionObserver;
  globalThis.IntersectionObserver = FakeIntersectionObserver;
  return {
    instances,
    /** Report `element` to every live observer watching it. */
    report(element, { inView, top = 0, bottom = 100, ratio } = {}) {
      for (const io of instances) {
        if (!io.targets.has(element)) continue;
        io.callback([
          {
            target: element,
            isIntersecting: inView,
            intersectionRatio: ratio ?? (inView ? 1 : 0),
            boundingClientRect: { top, bottom, left: 0, right: 100 },
            rootBounds: { top: 0, bottom: window.innerHeight, left: 0, right: window.innerWidth },
          },
        ]);
      }
    },
    live() {
      return instances.filter((io) => !io.disconnected && io.targets.size > 0);
    },
    restore() {
      globalThis.IntersectionObserver = previous;
    },
  };
}

/** Install a fake ResizeObserver; `trigger()` calls every live callback. */
export function installFakeRO() {
  const instances = [];
  class FakeResizeObserver {
    constructor(callback) {
      this.callback = callback;
      this.targets = new Set();
      instances.push(this);
    }
    observe(target) {
      this.targets.add(target);
    }
    unobserve(target) {
      this.targets.delete(target);
    }
    disconnect() {
      this.targets.clear();
    }
  }
  const previous = globalThis.ResizeObserver;
  globalThis.ResizeObserver = FakeResizeObserver;
  return {
    instances,
    trigger() {
      for (const ro of instances) if (ro.targets.size > 0) ro.callback([]);
    },
    observed() {
      return instances.reduce((sum, ro) => sum + ro.targets.size, 0);
    },
    restore() {
      globalThis.ResizeObserver = previous;
    },
  };
}

/** Count `addEventListener` calls on a target (type + options). */
export function spyListeners(target) {
  const calls = [];
  const original = target.addEventListener;
  target.addEventListener = function (type, listener, options) {
    calls.push({ type, options });
    return original.call(this, type, listener, options);
  };
  return {
    calls,
    restore() {
      target.addEventListener = original;
    },
  };
}
