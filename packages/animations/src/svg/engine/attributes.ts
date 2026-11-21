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

import { describeElement, devWarnOnce, elementKey } from "../../core/dev.js";
import { getFrameScheduler } from "../../core/scheduler.js";
import { counters } from "./debug.js";

declare const process: { env: { NODE_ENV?: string } } | undefined;

export interface AttributeWriter {
  set(name: string, value: string): void;
  /** Write pending values now (tests and synchronous ends). */
  flush(): void;
  restore(): void;
}

interface Writer {
  readonly id: string;
  /** Last value per attribute (re-applied when a waiting claim is granted). */
  readonly values: Map<string, string>;
}

interface Slot {
  /** The consumer's value to restore (`null`: absent). */
  base: string | null;
  /** Value read back after the ledger's last write (external-change detection). */
  written: string | null | undefined;
  /** Claims in arrival order; the first one owns the attribute. */
  readonly claims: Writer[];
}

const ledgers = new WeakMap<Element, Map<string, Slot>>();

function adoptExternal(element: Element, name: string, slot: Slot): void {
  if (slot.written === undefined) return;
  const current = element.getAttribute(name);
  if (current === slot.written) return;
  slot.base = current;
  slot.written = undefined;
  if (typeof process !== "undefined" && process.env.NODE_ENV !== "production") {
    devWarnOnce(
      `attr-external:${elementKey(element)}:${name}`,
      `"${name}" on ${describeElement(element)} changed outside the engine; kept as the value to restore.`,
    );
  }
}

function write(element: Element, name: string, slot: Slot, value: string): void {
  adoptExternal(element, name, slot);
  if (element.getAttribute(name) !== value) {
    element.setAttribute(name, value);
    counters.attributeWrites++;
  }
  slot.written = element.getAttribute(name);
}

export function createAttributeWriter(element: Element, id = "svg"): AttributeWriter {
  let slots = ledgers.get(element);
  if (!slots) {
    slots = new Map();
    ledgers.set(element, slots);
  }
  const ledger = slots;
  const self: Writer = { id, values: new Map() };
  const pending = new Set<string>();
  let cancel: (() => void) | undefined;

  function flush(): void {
    cancel?.();
    cancel = undefined;
    for (const name of pending) {
      const slot = ledger.get(name);
      const value = self.values.get(name);
      if (slot && value !== undefined && slot.claims[0] === self) write(element, name, slot, value);
    }
    pending.clear();
  }

  return {
    set(name, value) {
      let slot = ledger.get(name);
      if (!slot) {
        slot = { base: element.getAttribute(name), written: undefined, claims: [] };
        ledger.set(name, slot);
      }
      self.values.set(name, value);
      if (!slot.claims.includes(self)) {
        slot.claims.push(self);
        const owner = slot.claims[0] as Writer;
        if (
          owner !== self &&
          typeof process !== "undefined" &&
          process.env.NODE_ENV !== "production"
        ) {
          devWarnOnce(
            `attr-conflict:${elementKey(element)}:${name}:${id}:${owner.id}`,
            `"${id}" is waiting: "${name}" on ${describeElement(element)} is written by "${owner.id}"; it resumes when that effect is destroyed.`,
          );
        }
      }
      if (slot.claims[0] !== self) return;
      pending.add(name);
      cancel ??= getFrameScheduler().schedule(() => {
        cancel = undefined;
        flush();
      }, "write");
    },
    flush,
    restore() {
      cancel?.();
      cancel = undefined;
      pending.clear();
      for (const name of self.values.keys()) {
        const slot = ledger.get(name);
        if (!slot) continue;
        const at = slot.claims.indexOf(self);
        if (at < 0) continue;
        slot.claims.splice(at, 1);
        if (at !== 0) continue; // a waiting writer changed nothing
        const next = slot.claims[0];
        const value = next?.values.get(name);
        if (next && value !== undefined) {
          write(element, name, slot, value);
          continue;
        }
        adoptExternal(element, name, slot);
        if (slot.base === null) element.removeAttribute(name);
        else element.setAttribute(name, slot.base);
        ledger.delete(name);
      }
      self.values.clear();
    },
  };
}
