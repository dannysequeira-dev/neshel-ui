// Test helpers for @neshel-ui/layout (run against the built dist; see pnpm test:packages).
import { createElement } from "react";
import { renderToStaticMarkup, renderToString } from "react-dom/server";

export const h = createElement;
export const layout = await import("../dist/index.js");
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

/** Class list of the root element rendered by a layout primitive. */
export function classesOf(Component, props = {}, ...children) {
  const { attrs } = firstElement(renderToStaticMarkup(h(Component, props, ...children)));
  return (attrs.class ?? "").split(/\s+/).filter(Boolean);
}

/** Capture the error thrown while rendering. */
export function renderError(element) {
  try {
    renderToStaticMarkup(element);
  } catch (error) {
    return error;
  }
  return undefined;
}

let dom;
/** Install a jsdom window as globals (once) for react-dom/client tests. */
export async function setupDom() {
  if (dom) return dom;
  const { JSDOM } = await import("jsdom");
  dom = new JSDOM("<!doctype html><html><body></body></html>", { pretendToBeVisual: true });
  const { window } = dom;
  for (const key of [
    "window",
    "document",
    "navigator",
    "HTMLElement",
    "Node",
    "Event",
    "MouseEvent",
  ]) {
    Object.defineProperty(globalThis, key, {
      value: key === "window" ? window : window[key],
      configurable: true,
      writable: true,
    });
  }
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  return dom;
}

/** Render into a fresh container with createRoot inside act(); returns { container, unmount }. */
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
    async unmount() {
      await act(async () => root.unmount());
      container.remove();
    },
  };
}
