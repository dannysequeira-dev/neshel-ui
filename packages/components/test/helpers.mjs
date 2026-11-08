// Test helpers for @neshel-ui/components (run against the built dist; see pnpm test:packages).
import { createElement } from "react";
import { renderToStaticMarkup, renderToString } from "react-dom/server";

let dom;
export const h = createElement;
// Radix chooses useLayoutEffect vs a no-op when its modules load, so the DOM must exist first.
await setupDom();
export const ui = await import("../dist/index.js");
export { renderToStaticMarkup as markup, renderToString };

/** Parse the first element of SSR markup into { tag, attrs }. */
export function firstElement(html) {
  const match = /^<([a-z0-9]+)([^>]*)>/.exec(html);
  if (!match) throw new Error(`no element in ${html}`);
  const attrs = {};
  for (const [, name, value] of match[2].matchAll(/([\w:-]+)(?:="([^"]*)")?/g)) {
    attrs[name] = value ?? "";
  }
  return { tag: match[1], attrs };
}

/** Capture the error thrown while rendering on the server. */
export function renderError(element) {
  try {
    renderToStaticMarkup(element);
  } catch (error) {
    return error;
  }
  return undefined;
}

/** Install a jsdom window as globals (once) for react-dom/client tests. */
export async function setupDom() {
  if (dom) return dom;
  const { JSDOM } = await import("jsdom");
  dom = new JSDOM("<!doctype html><html><body></body></html>", {
    pretendToBeVisual: true,
    url: "http://localhost/",
  });
  const { window } = dom;
  const keys = [
    "window",
    "document",
    "navigator",
    "HTMLElement",
    "HTMLInputElement",
    "HTMLButtonElement",
    "Element",
    "Node",
    "Event",
    "MouseEvent",
    "KeyboardEvent",
    "FocusEvent",
    "CustomEvent",
    "FormData",
    "getComputedStyle",
    "requestAnimationFrame",
    "cancelAnimationFrame",
    "DocumentFragment",
    "ShadowRoot",
    "MutationObserver",
    "NodeFilter",
    "HTMLFormElement",
  ];
  for (const key of keys) {
    const value = key === "window" ? window : window[key];
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  }
  // jsdom lacks these; the headless primitives only need inert stand-ins.
  class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  window.ResizeObserver = ResizeObserver;
  globalThis.ResizeObserver = ResizeObserver;
  window.PointerEvent ??= class PointerEvent extends window.MouseEvent {};
  globalThis.PointerEvent = window.PointerEvent;
  window.matchMedia ??= () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
  });
  window.HTMLElement.prototype.scrollIntoView ??= () => {};
  window.HTMLElement.prototype.hasPointerCapture ??= () => false;
  window.HTMLElement.prototype.releasePointerCapture ??= () => {};
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  return dom;
}

/** Render into a fresh container with createRoot inside act(); returns helpers. */
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
    act,
    async rerender(next) {
      await act(async () => root.render(next));
    },
    async unmount() {
      await act(async () => root.unmount());
      container.remove();
    },
  };
}

/** Dispatch an event inside act(). */
export async function fire(target, event) {
  const { act } = await import("react");
  await act(async () => {
    target.dispatchEvent(event);
  });
}

export async function click(target) {
  await fire(target, new window.PointerEvent("pointerdown", { bubbles: true, button: 0 }));
  await fire(target, new window.MouseEvent("mousedown", { bubbles: true, button: 0 }));
  await fire(target, new window.PointerEvent("pointerup", { bubbles: true, button: 0 }));
  await fire(target, new window.MouseEvent("mouseup", { bubbles: true, button: 0 }));
  await fire(target, new window.MouseEvent("click", { bubbles: true, button: 0 }));
}

export async function key(target, keyName) {
  await fire(target, new window.KeyboardEvent("keydown", { key: keyName, bubbles: true }));
  await fire(target, new window.KeyboardEvent("keyup", { key: keyName, bubbles: true }));
}
