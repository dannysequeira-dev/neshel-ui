/**
 * SVG attribute ledger (Phase 014, internal; contracts/svg-api.md §1, ADR 0029 §4). Attributes are not
 * styles, so the Motion Host does not own them; this ledger gives them the same guarantees: the consumer's
 * original value is captured on the first write, writes are coalesced to the scheduler's write phase (one per
 * attribute per frame, only on change) and `restore()` puts back the exact original (or removes the attribute
 * if it was absent).
 */
import { getFrameScheduler } from "../../core/scheduler.js";
import { counters } from "./debug.js";

export interface AttributeWriter {
  set(name: string, value: string): void;
  /** Write pending values now (tests and synchronous ends). */
  flush(): void;
  restore(): void;
}

export function createAttributeWriter(element: Element): AttributeWriter {
  const originals = new Map<string, string | null>();
  const pending = new Map<string, string>();
  let cancel: (() => void) | undefined;
  let restored = false;

  function flush(): void {
    cancel?.();
    cancel = undefined;
    for (const [name, value] of pending) {
      if (element.getAttribute(name) !== value) {
        element.setAttribute(name, value);
        counters.attributeWrites++;
      }
    }
    pending.clear();
  }

  return {
    set(name, value) {
      restored = false;
      if (!originals.has(name)) originals.set(name, element.getAttribute(name));
      pending.set(name, value);
      cancel ??= getFrameScheduler().schedule(() => {
        cancel = undefined;
        flush();
      }, "write");
    },
    flush,
    restore() {
      if (restored) return;
      restored = true;
      cancel?.();
      cancel = undefined;
      pending.clear();
      for (const [name, value] of originals) {
        if (value === null) element.removeAttribute(name);
        else element.setAttribute(name, value);
      }
      originals.clear();
    },
  };
}
