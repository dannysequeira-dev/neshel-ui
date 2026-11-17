/**
 * Layout boxes from the offset chain (Phase 011 geometry, shared since Phase 012; ADR 0026 §3, ADR 0027 §4).
 * Positions are layout positions that ignore transforms: an element moved by its own (or any other) motion
 * layer is measured where layout put it, so effects never feed on their own output. Internal: shared by
 * `./scroll` and `./layout`; not exported by `./core`.
 */

type HTML = HTMLElement & { offsetTop: number; offsetLeft: number };

export const isHtml = (element: Element): element is HTML =>
  typeof (element as HTML).offsetTop === "number";

/**
 * Layout offset of an element's border box from the document origin, ignoring transforms (offset chain).
 * Non-HTML elements (SVG) fall back to the bounding box plus the root scroll offset.
 */
export function layoutOffset(element: Element, axis: "block" | "inline"): number {
  if (!isHtml(element)) {
    const rect = element.getBoundingClientRect();
    return axis === "block" ? rect.top + (window.scrollY || 0) : rect.left + (window.scrollX || 0);
  }
  let total = 0;
  let node: HTML | null = element;
  while (node) {
    total += axis === "block" ? node.offsetTop : node.offsetLeft;
    const parent = node.offsetParent as HTML | null;
    // offsetTop relative to <body> (or a null parent) is already relative to the document.
    if (!parent || parent === document.body) break;
    total += axis === "block" ? parent.clientTop : parent.clientLeft;
    node = parent;
  }
  return total;
}

/** A layout box in document coordinates (transforms ignored). */
export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Layout box of an element (offset chain + `offsetWidth/Height`), or the bounding box plus scroll for
 * non-HTML elements (their transforms are then included — documented).
 */
export function measureBox(element: Element): Box {
  if (!isHtml(element)) {
    const rect = element.getBoundingClientRect();
    return {
      x: rect.left + (window.scrollX || 0),
      y: rect.top + (window.scrollY || 0),
      width: rect.width,
      height: rect.height,
    };
  }
  return {
    x: layoutOffset(element, "inline"),
    y: layoutOffset(element, "block"),
    width: element.offsetWidth,
    height: element.offsetHeight,
  };
}
