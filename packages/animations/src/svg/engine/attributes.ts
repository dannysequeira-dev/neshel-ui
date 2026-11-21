/**
 * SVG attribute ledger (Phase 014, internal; contracts/svg-api.md §1, ADR 0029 §4). Attributes are not
 * styles, so the Motion Host does not own them; this ledger gives them the same guarantees: ONE ledger per
 * element (shared by every writer), the consumer's original value captured on the first claim and restored
 * exactly (or removed if it was absent) when the last writer releases, writes coalesced to the scheduler's
 * write phase (one per attribute per frame, only on change).
 *
 * Ownership follows the exclusive-channel arbitration (ADR 0022; review R2): one writer owns an attribute at a
 * time; a later writer waits (reported once in development) and resumes with its last value when the owner
 * releases, earliest claim first. A writer that releases while waiting changes nothing. A change of the
 * attribute outside the ledger (e.g. a React re-render of `d`) becomes the value restored at the end.
 */
import { devWarnOnce } from "../../core/dev.js";
import { getFrameScheduler } from "../../core/scheduler.js";
import { counters } from "./debug.js";

declare const process: { env: { NODE_ENV?: string } } | undefined;

export interface AttributeWriter {
  set(name: string, value: string): void;
  /** Write pending values now (tests and synchronous ends). */
  flush(): void;
  restore(): void;
}

/** Per attribute: the consumer's value (`null`: absent), the value read back after our last write and the
 * writers' last values in claim order (the first owns the attribute). */
type Slot = { base: string | null; written?: string | null; claims: Map<object, string> };

const ledgers = new WeakMap<Element, Map<string, Slot>>();

export function createAttributeWriter(element: Element, id = "svg"): AttributeWriter {
  const slots = ledgers.get(element) ?? new Map<string, Slot>();
  ledgers.set(element, slots);
  const self = {};
  const names = new Set<string>();
  let cancel: (() => void) | undefined;

  const owner = (slot: Slot) => slot.claims.keys().next().value;
  // Adopt an external change since our last write as the value to restore.
  const adopt = (name: string, slot: Slot) => {
    const current = element.getAttribute(name);
    if (slot.written !== undefined && current !== slot.written) slot.base = current;
    slot.written = undefined;
  };
  const write = (name: string, slot: Slot, value: string) => {
    adopt(name, slot);
    if (element.getAttribute(name) !== value) {
      element.setAttribute(name, value);
      counters.attributeWrites++;
    }
    slot.written = value;
  };

  function flush(): void {
    cancel?.();
    cancel = undefined;
    for (const name of names) {
      const slot = slots.get(name);
      if (slot && owner(slot) === self) write(name, slot, slot.claims.get(self) as string);
    }
  }

  return {
    set(name, value) {
      const slot = slots.get(name) ?? { base: element.getAttribute(name), claims: new Map() };
      slots.set(name, slot);
      names.add(name);
      slot.claims.set(self, value);
      if (owner(slot) !== self) {
        if (typeof process !== "undefined" && process.env.NODE_ENV !== "production")
          devWarnOnce(`attr:${id}:${name}`, `${id} waits: another effect writes "${name}".`);
        return;
      }
      cancel ??= getFrameScheduler().schedule(() => {
        cancel = undefined;
        flush();
      }, "write");
    },
    flush,
    restore() {
      cancel?.();
      cancel = undefined;
      for (const name of names) {
        const slot = slots.get(name);
        if (!slot?.claims.has(self)) continue;
        const owned = owner(slot) === self;
        slot.claims.delete(self);
        if (!owned) continue; // a waiting writer changed nothing
        const next = owner(slot);
        if (next) write(name, slot, slot.claims.get(next) as string);
        else {
          adopt(name, slot);
          if (slot.base === null) element.removeAttribute(name);
          else element.setAttribute(name, slot.base);
          slots.delete(name);
        }
      }
      names.clear();
    },
  };
}
