/**
 * Inert, ID-free copies of live content (Phase 016, internal; research R9, R11). Used by the D05 flap and the D07
 * channel layers: the copy is decoration only — `aria-hidden` and `inert` on its container, every attribute that
 * identifies or references an element stripped (`id`, `name`, `for`, `form`, `headers`, `list`, `aria-*` id
 * references, `autofocus`, `tabindex`, `accesskey`), form-control values copied (cloneNode copies attributes, not
 * the typed value), and the subtree never focusable. Video, canvas, iframe, object and embed are replaced by empty
 * placeholders of the same box (their pixels cannot be duplicated safely).
 */

const STRIP = [
  "id",
  "name",
  "for",
  "form",
  "headers",
  "list",
  "autofocus",
  "tabindex",
  "accesskey",
  "aria-labelledby",
  "aria-describedby",
  "aria-controls",
  "aria-owns",
  "aria-activedescendant",
  "aria-details",
  "aria-errormessage",
  "aria-flowto",
  "popovertarget",
  "commandfor",
  "anchor",
];

const OPAQUE = "video, canvas, iframe, object, embed";

/** Copy `source` (deep) into a decorative clone. */
export function decorativeClone(source: Element): Element {
  const copy = source.cloneNode(true) as Element;
  const all = [copy, ...copy.querySelectorAll("*")];
  for (const node of all) {
    for (const name of STRIP) if (node.hasAttribute(name)) node.removeAttribute(name);
  }
  // Typed values of form controls (attributes hold only the initial value).
  const from = [source, ...source.querySelectorAll("input, textarea, select")];
  const to = [copy, ...copy.querySelectorAll("input, textarea, select")];
  from.forEach((field, index) => {
    const target = to[index] as HTMLInputElement | undefined;
    const original = field as HTMLInputElement;
    if (!target || target.tagName !== original.tagName || !("value" in original)) return;
    try {
      if (original.type === "checkbox" || original.type === "radio")
        target.checked = original.checked;
      else if (original.type !== "file") target.value = original.value;
    } catch {}
  });
  for (const node of copy.querySelectorAll(OPAQUE)) {
    const placeholder = node.ownerDocument.createElement("span");
    placeholder.setAttribute(
      "style",
      "display:inline-block;width:100%;height:100%;background:currentColor;opacity:.08",
    );
    node.replaceWith(placeholder);
  }
  return copy;
}

/** Make a container decorative: hidden from assistive technology, not focusable, no events, no selection. */
export function makeDecorative(container: HTMLElement): void {
  container.setAttribute("aria-hidden", "true");
  container.setAttribute("inert", "");
  (container as HTMLElement & { inert?: boolean }).inert = true;
}
