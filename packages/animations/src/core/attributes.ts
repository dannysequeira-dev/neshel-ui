/**
 * Attribute ledger for consumer elements (Phase 016, internal; FR-003). Accessibility attributes that effects must
 * change synchronously (`inert`, `aria-hidden`, `tabindex`, ARIA roles and labels) are not styles, so the Motion Host
 * does not own them. The ledger captures each attribute's original value on its first write and restores it exactly
 * (or removes it when it was absent) on `restore()`. Writes are immediate: hiding a face from assistive technology
 * must not wait for a frame. `inert` is mirrored to the property for engines that reflect it lazily.
 */

type Entry = { element: Element; name: string; base: string | null };

export interface AttributeLedger {
  /** Set (string) or remove (`null`) an attribute; the original value is captured first. */
  set(element: Element, name: string, value: string | null): void;
  /** Whether the ledger changed this attribute. */
  has(element: Element, name: string): boolean;
  /** The captured original value (`null`: absent; `undefined`: not captured). */
  original(element: Element, name: string): string | null | undefined;
  /** Restore one element's attributes. */
  restoreElement(element: Element): void;
  /** Restore everything (idempotent). */
  restore(): void;
  readonly size: number;
}

/** Live ledgers' entries (diagnostics). */
export const attributeCounters = { entries: 0 };

function apply(element: Element, name: string, value: string | null): void {
  if (value === null) element.removeAttribute(name);
  else element.setAttribute(name, value);
  if (name === "inert") (element as HTMLElement & { inert?: boolean }).inert = value !== null;
}

export function createAttributeLedger(): AttributeLedger {
  const entries = new Map<Element, Map<string, Entry>>();
  let size = 0;
  return {
    set(element, name, value) {
      let map = entries.get(element);
      if (!map) {
        map = new Map();
        entries.set(element, map);
      }
      if (!map.has(name)) {
        map.set(name, { element, name, base: element.getAttribute(name) });
        size++;
        attributeCounters.entries++;
      }
      if (element.getAttribute(name) !== value) apply(element, name, value);
    },
    has: (element, name) => entries.get(element)?.has(name) ?? false,
    original: (element, name) => entries.get(element)?.get(name)?.base,
    restoreElement(element) {
      const map = entries.get(element);
      if (!map) return;
      for (const entry of map.values()) {
        apply(entry.element, entry.name, entry.base);
        size--;
        attributeCounters.entries--;
      }
      entries.delete(element);
    },
    restore() {
      for (const element of [...entries.keys()]) this.restoreElement(element);
    },
    get size() {
      return size;
    },
  };
}

/** Hide (`true`) or reveal an element for assistive technology and focus: `inert` + `aria-hidden`. */
export function setHidden(ledger: AttributeLedger, element: Element, hidden: boolean): void {
  if (hidden) {
    ledger.set(element, "inert", "");
    ledger.set(element, "aria-hidden", "true");
  } else {
    // Back to the consumer's own values (an element the consumer made inert stays inert).
    ledger.set(element, "inert", ledger.original(element, "inert") ?? null);
    ledger.set(element, "aria-hidden", ledger.original(element, "aria-hidden") ?? null);
  }
}

const FOCUSABLE =
  'a[href], area[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), iframe, audio[controls], video[controls], [contenteditable]:not([contenteditable="false"]), [tabindex]:not([tabindex="-1"])';

/** First focusable descendant (document order) or `undefined`. */
export function firstFocusable(root: Element): HTMLElement | undefined {
  return (root.querySelector(FOCUSABLE) as HTMLElement | null) ?? undefined;
}

/**
 * Move focus out of `from` into `to` when focus is inside `from` (D01/D02/D03): the first focusable element of
 * `to`, else `to` itself with a temporary `tabindex="-1"` (recorded in the ledger, restored on destroy).
 */
export function moveFocusIfInside(ledger: AttributeLedger, from: Element, to: Element): boolean {
  const doc = from.ownerDocument;
  const active = doc?.activeElement;
  if (!active || active === doc.body || !from.contains(active)) return false;
  const target = firstFocusable(to) ?? (to as HTMLElement);
  if (target === to && !to.hasAttribute("tabindex")) ledger.set(to, "tabindex", "-1");
  (target as HTMLElement).focus?.({ preventScroll: true });
  return true;
}
