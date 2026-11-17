// Helpers for the Phase 012 suites: a controllable clock shared by pointer events and frames, pointer
// events with ids, layout boxes through the offset chain, and fake ResizeObserver/MutationObserver.
import { frames, setupDom } from "./helpers.mjs";

export { frames, setupDom };

let now = 1000;
/** The clock read by the engine (`performance.now`). */
export const clock = {
  get now() {
    return now;
  },
  advance(ms) {
    now += ms;
  },
};
globalThis.performance.now = () => now;

/** Run `count` frames of `ms` each, advancing the clock with them. */
export function run(count = 1, ms = 16) {
  for (let i = 0; i < count; i++) {
    now += ms;
    frames.flush(1, ms);
  }
}

/** Run frames until nothing is scheduled (bounded); returns the frame count. */
export function settle(limit = 600) {
  let count = 0;
  while (frames.pending > 0 && count < limit) {
    run(1);
    count++;
  }
  return count;
}

/** Dispatch a pointer event (bubbles, with id and button) on `target`. */
export function ptr(
  target,
  type,
  { id = 1, x = 0, y = 0, pointerType = "mouse", button = 0 } = {},
) {
  const event = new window.PointerEvent(type, {
    pointerId: id,
    clientX: x,
    clientY: y,
    pointerType,
    button,
    isPrimary: id === 1,
    bubbles: true,
    cancelable: true,
  });
  target.dispatchEvent(event);
  return event;
}

/** A drag from `from` to `to` in `steps` moves of `ms` each (clock advanced), then release. */
export function dragPath(
  target,
  {
    id = 1,
    from = [0, 0],
    to = [100, 0],
    steps = 5,
    ms = 16,
    pointerType = "mouse",
    release = true,
  } = {},
) {
  ptr(target, "pointerdown", { id, x: from[0], y: from[1], pointerType });
  for (let i = 1; i <= steps; i++) {
    clock.advance(ms);
    const x = from[0] + ((to[0] - from[0]) * i) / steps;
    const y = from[1] + ((to[1] - from[1]) * i) / steps;
    ptr(window, "pointermove", { id, x, y, pointerType });
  }
  if (release) ptr(window, "pointerup", { id, x: to[0], y: to[1], pointerType });
}

/** Give `element` a layout box (offset chain relative to `parent`, which may be null = document). */
export function box(
  element,
  { x = 0, y = 0, width = 100, height = 100, parent = null, border = 0 } = {},
) {
  const define = (key, value) => Object.defineProperty(element, key, { value, configurable: true });
  define("offsetLeft", x);
  define("offsetTop", y);
  define("offsetWidth", width);
  define("offsetHeight", height);
  define("offsetParent", parent);
  define("clientLeft", border);
  define("clientTop", border);
  define("clientWidth", width - 2 * border);
  define("clientHeight", height - 2 * border);
  element.getBoundingClientRect = () => ({
    left: x,
    top: y,
    width,
    height,
    right: x + width,
    bottom: y + height,
    x,
    y,
  });
}

/** Count layout reads (offset*, client*, getBoundingClientRect) on elements while `fn` runs. */
export function countReads(elements, fn) {
  let reads = 0;
  const restore = [];
  for (const element of elements) {
    for (const key of [
      "offsetLeft",
      "offsetTop",
      "offsetWidth",
      "offsetHeight",
      "clientWidth",
      "clientHeight",
    ]) {
      const descriptor = Object.getOwnPropertyDescriptor(element, key);
      if (!descriptor) continue;
      Object.defineProperty(element, key, {
        configurable: true,
        get() {
          reads++;
          return descriptor.value;
        },
      });
      restore.push(() => Object.defineProperty(element, key, descriptor));
    }
    const rect = element.getBoundingClientRect;
    element.getBoundingClientRect = () => {
      reads++;
      return rect.call(element);
    };
    restore.push(() => {
      element.getBoundingClientRect = rect;
    });
  }
  try {
    fn();
  } finally {
    for (const undo of restore) undo();
  }
  return reads;
}

/** Fake ResizeObserver: tests deliver entries with `resize.notify(target, { height })`. */
export const resize = {
  observers: new Set(),
  notify(target, { height = 100, width = 100 } = {}) {
    for (const observer of this.observers) {
      if (!observer.targets.has(target)) continue;
      observer.callback([
        {
          target,
          contentRect: { width, height },
          borderBoxSize: [{ inlineSize: width, blockSize: height }],
        },
      ]);
    }
  },
  get observed() {
    let count = 0;
    for (const observer of this.observers) count += observer.targets.size;
    return count;
  },
};

export async function setupGestureDom() {
  const env = await setupDom();
  class FakeResizeObserver {
    constructor(callback) {
      this.callback = callback;
      this.targets = new Set();
      resize.observers.add(this);
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
  globalThis.ResizeObserver = FakeResizeObserver;
  window.ResizeObserver = FakeResizeObserver;
  globalThis.MutationObserver = window.MutationObserver;
  globalThis.KeyboardEvent = window.KeyboardEvent;
  globalThis.WheelEvent = window.WheelEvent;
  globalThis.getComputedStyle = window.getComputedStyle.bind(window);
  return env;
}

export function key(target, type, keyName, init = {}) {
  const event = new window.KeyboardEvent(type, {
    key: keyName,
    bubbles: true,
    cancelable: true,
    ...init,
  });
  target.dispatchEvent(event);
  return event;
}

/** Translation of the composed inline transform (`translate3d(x, y, z)`), or [0, 0]. */
export function translation(element) {
  const match = /translate3d\(([-\d.]+)px, ([-\d.]+)px/.exec(element.style.transform);
  return match ? [Number(match[1]), Number(match[2])] : [0, 0];
}

export function scaleOf(element) {
  const match = /scale\(([-\d.]+)(?:, ([-\d.]+))?\)/.exec(element.style.transform);
  if (!match) return [1, 1];
  return [Number(match[1]), Number(match[2] ?? match[1])];
}

export function rotationOf(element) {
  const match = /rotateZ\(([-\d.]+)deg\)/.exec(element.style.transform);
  return match ? Number(match[1]) : 0;
}
